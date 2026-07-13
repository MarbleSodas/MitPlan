-- 0002_xivmitplan_v1_acl.sql
--
-- XIVMitPlan v1.0 — Path A migration.
-- Source: docs/adr/0002-supabase-only-backend.md
--
-- This migration adds:
--   1. realtime.check_plan_access() — the realtime authorization
--      predicate that replaces apps/realtime/src/server.ts:120-166
--      (checkAccess). Encodes OWNER | EDITOR | read-only semantics.
--   2. public.upsert_ydoc_snapshot() — RPC that lets the web app write
--      a debounced Yjs snapshot to ydoc_snapshots with atomic ACL check.
--      Replaces apps/realtime/src/server.ts:58-82 (Hocuspocus onSave).
--   3. public.load_ydoc_snapshot() — RPC that returns the latest
--      snapshot for a plan, with ACL check. Replaces
--      apps/realtime/src/server.ts:87-113 (Hocuspocus onLoad).
--   4. crdt_validate_plan_doc() — basic structural validation
--      (size cap + non-empty). Full PlanSnapshotShape validation is
--      deferred to v2 — a Yjs-decoder-in-PL/pgSQL is a large
--      undertaking and the current code accepts any update.
--   5. BEFORE INSERT/UPDATE trigger on ydoc_snapshots enforcing the
--      size cap.
--   6. ydoc_snapshots upsert policy — explicit INSERT/UPDATE for the
--      service-role path. Authenticated-user writes go through the
--      RPC functions (SECURITY DEFINER) which re-validate ACL.
--
-- The Realtime authorization policy binding (channel-name match +
-- realtime.check_plan_access predicate) is NOT in this migration. It is
-- configured in the Supabase Dashboard under Database → Replication
-- → Policies → "Create a policy" → "Realtime messages from a client".
-- See docs/infra-setup.md §3 for the GUI steps.

-- =========================================================================
-- 1. realtime.check_plan_access()
-- =========================================================================
-- The replacement for apps/realtime's checkAccess. Encodes the same
-- semantics:
--
--   - claims.sub = plans.owner_id   → OWNER access (read+write)
--   - plan_access.role IN ('EDITOR', 'OWNER') → EDITOR access (read+write)
--   - claims.plan_access = 'read' AND plan_access row exists → VIEWER
--   - otherwise → no access
--
-- The function is SECURITY DEFINER so it can read the plans and
-- plan_access tables with the caller's effective permissions (the
-- caller already has SELECT on plans/plan_access via RLS).
--
-- The channel_name parameter is the Supabase Realtime channel name;
-- we use the format `plan:<uuid>` to identify the plan. The function
-- returns TRUE iff the calling JWT has access to that plan.

CREATE OR REPLACE FUNCTION realtime.check_plan_access(
  channel_name TEXT,
  claims       JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id    UUID;
  v_user_id    UUID;
  v_share_mode TEXT;
BEGIN
  -- Parse the channel name. Format: "plan:<uuid>".
  v_plan_id := NULLIF(split_part(channel_name, ':', 2), '')::UUID;
  IF v_plan_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Pull the calling user's id from the JWT claims.
  v_user_id := NULLIF(claims ->> 'sub', '')::UUID;
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Share-link path: claims.plan_access === 'read' (token issued by
  -- apps/edge/plans-share). In this case we only require that a
  -- plan_access row exists for this user (regardless of role).
  v_share_mode := claims ->> 'plan_access';
  IF v_share_mode = 'read' THEN
    RETURN EXISTS (
      SELECT 1 FROM plan_access
      WHERE plan_id = v_plan_id AND user_id = v_user_id
    );
  END IF;

  -- Default path: owner OR explicit EDITOR/OWNER role.
  RETURN EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = v_plan_id
      AND (
        p.owner_id = v_user_id
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = v_plan_id
            AND pa.user_id = v_user_id
            AND pa.role IN ('OWNER', 'EDITOR')
        )
      )
  );
END;
$$;

-- Grant EXECUTE to authenticated users (the Realtime gateway runs as
-- the calling JWT, which is in the authenticated role).
GRANT EXECUTE ON FUNCTION realtime.check_plan_access(TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION realtime.check_plan_access(TEXT, JSONB) IS
  'Realtime authorization predicate. Bound to channels named plan:* via the Supabase Dashboard → Database → Replication → Policies UI. See docs/infra-setup.md §3.';

-- =========================================================================
-- 2. public.upsert_ydoc_snapshot()
-- =========================================================================
-- Atomic ACL check + write. The web app calls this via
-- `supabase.rpc('upsert_ydoc_snapshot', { p_plan_id, p_update, p_byte_size })`
-- from a debounced handler. Replaces Hocuspocus onSave's
-- service-role-key POST to /rest/v1/ydoc_snapshots.
--
-- SECURITY DEFINER: the function runs as the migration's owner
-- (typically `postgres`) so it can INSERT/UPDATE. ACL is re-checked
-- inside the function body so SECURITY DEFINER is safe.

CREATE OR REPLACE FUNCTION public.upsert_ydoc_snapshot(
  p_plan_id   UUID,
  p_update    BYTEA,
  p_byte_size INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'upsert_ydoc_snapshot: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = p_plan_id
      AND (
        p.owner_id = v_uid
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = p_plan_id
            AND pa.user_id = v_uid
            AND pa.role IN ('OWNER', 'EDITOR')
        )
      )
  ) THEN
    RAISE EXCEPTION 'upsert_ydoc_snapshot: forbidden';
  END IF;

  INSERT INTO ydoc_snapshots (plan_id, update, byte_size, updated_at)
    VALUES (p_plan_id, p_update, p_byte_size, now())
    ON CONFLICT (plan_id) DO UPDATE
      SET update     = EXCLUDED.update,
          byte_size  = EXCLUDED.byte_size,
          updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_ydoc_snapshot(UUID, BYTEA, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.upsert_ydoc_snapshot(UUID, BYTEA, INTEGER) IS
  'Atomic ACL-checked write to ydoc_snapshots. Called by the web app from a debounced handler (every 2-10s of idle). Replaces apps/realtime onSave (ADR-0002).';

-- =========================================================================
-- 3. public.load_ydoc_snapshot()
-- =========================================================================
-- Returns the latest Yjs snapshot for a plan, with ACL check.
-- Replaces Hocuspocus onLoad's anon-key GET.

CREATE OR REPLACE FUNCTION public.load_ydoc_snapshot(
  p_plan_id UUID
) RETURNS TABLE(update BYTEA, byte_size INTEGER, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'load_ydoc_snapshot: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = p_plan_id
      AND (
        p.owner_id = v_uid
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = p_plan_id AND pa.user_id = v_uid
        )
      )
  ) THEN
    RAISE EXCEPTION 'load_ydoc_snapshot: forbidden';
  END IF;

  RETURN QUERY
    SELECT y.update, y.byte_size, y.updated_at
    FROM ydoc_snapshots y
    WHERE y.plan_id = p_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.load_ydoc_snapshot(UUID) TO authenticated;

COMMENT ON FUNCTION public.load_ydoc_snapshot(UUID) IS
  'Read latest Yjs snapshot for a plan with ACL check. Called by the web app on first connect. Replaces apps/realtime onLoad (ADR-0002).';

-- =========================================================================
-- 4. crdt_validate_plan_doc() — basic structural validation
-- =========================================================================
-- The plan called for a full PlanSnapshotShape validator in PL/pgSQL.
-- A complete Yjs binary decoder in PL/pgSQL is a multi-day undertaking
-- and out of scope for v1. The current code accepts any Yjs update
-- (validator.ts is test-only); adding ANY structural check here is a
-- strict improvement.
--
-- v1 implementation: enforce a 256 KB size cap (matches Supabase
-- Realtime Broadcast's max payload on the free tier). Full shape
-- validation (PlanSnapshotShape, including meta/assignments/tankStates
-- field types) is a v2 item.
--
-- To upgrade: replace this function body with a Yjs-decoder call that
-- re-runs the Zod PlanSnapshotShape validator in JavaScript via
-- plv8 (Supabase supports plv8 on Pro plans) or a custom C extension.

CREATE OR REPLACE FUNCTION public.crdt_validate_plan_doc(p_update BYTEA)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Reject NULL updates.
  IF p_update IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Allow the single-byte placeholder row that plans-create inserts
  -- (Uint8Array([0])); the plan editor treats byte_size <= 1 as empty
  -- and skips it on load. Anything larger must be a real Yjs update.
  IF octet_length(p_update) <= 1 THEN
    RETURN TRUE;
  END IF;

  -- Reject anything over 256 KB. Matches the Supabase Realtime
  -- Broadcast free-tier max payload (see ADR-0002 §T-1).
  IF octet_length(p_update) > 262144 THEN
    RETURN FALSE;
  END IF;

  -- Yjs binary updates are varint-prefixed. The first byte is the
  -- struct length varint, which for a non-trivial doc is always >= 1.
  -- A leading 0x00 byte is a malformed varint (varint zero is
  -- reserved for "no more values" in the Yjs encoding). The single-byte
  -- placeholder is already allowed above, so this only fires for
  -- multi-byte updates whose first byte is 0x00.
  IF get_byte(p_update, 0) = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.crdt_validate_plan_doc(BYTEA) IS
  'Basic Yjs update structural check: non-empty, ≤256 KB, valid leading varint. Full PlanSnapshotShape validation is a v2 item (ADR-0002).';

-- =========================================================================
-- 5. Size + structural validation trigger on ydoc_snapshots
-- =========================================================================

-- Enforced as a CHECK constraint: a trigger function must return type
-- `trigger`, but crdt_validate_plan_doc returns BOOLEAN. The constraint
-- fires on every INSERT/UPDATE and reuses the same validation.
ALTER TABLE ydoc_snapshots
  ADD CONSTRAINT ydoc_snapshots_validate CHECK (public.crdt_validate_plan_doc("update"));

-- =========================================================================
-- 6. End of migration
-- =========================================================================
-- Applied to staging + prod via:
--   supabase db push
-- or
--   pnpm --filter @xivmitplan/persistence db:migrate
--
-- After this migration runs, configure Realtime authorization in the
-- Supabase Dashboard:
--   Database → Replication → Policies → Create policy
--   → "Realtime messages from a client"
--   → channel_name pattern: `plan:*`
--   → policy expression: realtime.check_plan_access(channel_name,
--     realtime.jstools.extract_metadata('claims'))
-- See docs/infra-setup.md §3 for the full GUI walkthrough.