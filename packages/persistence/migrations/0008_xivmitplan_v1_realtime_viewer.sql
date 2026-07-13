-- =========================================================================
-- 0008 — Allow VIEWER role in realtime.check_plan_access
-- =========================================================================
-- Phase A fix for the Caffeine redesign branch. The share-link flow now
-- uses an account-grant model (migration 0005): the recipient redeems
-- an opaque token via `plans-share-redeem` which upserts a `plan_access`
-- row with role=VIEWER (or EDITOR). No custom `plan_access: 'read'` JWT
-- claim is injected — the regular Supabase Auth session is used.
--
-- The default path of realtime.check_plan_access (0002:88-100) only
-- accepts OWNER/EDITOR, so VIEWERs cannot subscribe to the realtime
-- channel even though RLS permits them to read the plan row. They see
-- the plan in fallback mode but never get live updates + presence.
--
-- Extend the default path to also allow VIEWER. This is the read-only
-- equivalent of EDITOR: VIEWERs can read + subscribe to the channel
-- (so they get presence + live edits) but the editor UI disallows
-- mutations client-side, and `upsert_ydoc_snapshot` (0002:138-152)
-- still rejects VIEWERs at the write path.
--
-- The legacy share-link path (`claims.plan_access = 'read'`) is kept
-- for backwards compatibility with tokens issued before this migration.

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

  -- Legacy share-link path: claims.plan_access === 'read' (tokens
  -- issued by the pre-account-grant plans-share). Accept any role.
  v_share_mode := claims ->> 'plan_access';
  IF v_share_mode = 'read' THEN
    RETURN EXISTS (
      SELECT 1 FROM plan_access
      WHERE plan_id = v_plan_id AND user_id = v_user_id
    );
  END IF;

  -- Default path: OWNER/EDITOR/VIEWER. VIEWERs can subscribe to the
  -- realtime channel (presence + live broadcast) but are rejected by
  -- the write-side ACL in upsert_ydoc_snapshot.
  RETURN EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = v_plan_id
      AND (
        p.owner_id = v_user_id
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = v_plan_id
            AND pa.user_id = v_user_id
            AND pa.role IN ('OWNER', 'EDITOR', 'VIEWER')
        )
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION realtime.check_plan_access(TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION realtime.check_plan_access(TEXT, JSONB) IS
  'Realtime authorization predicate. Accepts OWNER/EDITOR/VIEWER (default path) or any role with the legacy plan_access=read JWT claim (share-link path). VIEWERs are read-only at the write path (upsert_ydoc_snapshot). Bound to plan:* channels via the Supabase Dashboard → Database → Replication → Policies UI. See docs/infra-setup.md §3.';