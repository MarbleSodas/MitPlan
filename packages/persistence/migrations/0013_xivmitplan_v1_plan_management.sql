-- 0013_xivmitplan_v1_plan_management.sql
--
-- XIVMitPlan v1.0 — Plan management API.
--
-- Adds RPCs for plan metadata export/read that benefit from SECURITY
-- DEFINER access. Write paths that need service-role keys ship as Edge
-- Functions (apps/edge/functions/plans-{update,delete,duplicate}); this
-- migration only adds the read-side or BYTEA-safe helpers.
--
-- Forward-only; idempotent via CREATE OR REPLACE FUNCTION.

-- =========================================================================
-- 1. plan_export_snapshot
-- =========================================================================
-- Returns the current plan snapshot in a safe portable form (base64
-- encoded). The caller must be the plan owner or have any plan_access
-- row (VIEWER is sufficient for read-only export).
--
-- Prefers the latest versioned plan_snapshot row (created by explicit
-- "save version" calls) and falls back to ydoc_snapshots (the debounced
-- autosave) when no versioned snapshot exists.

CREATE OR REPLACE FUNCTION plan_export_snapshot(
  p_plan_id UUID
) RETURNS TABLE (
  snapshot_id UUID,
  ydoc_b64    TEXT,
  byte_size   INT,
  reason      TEXT,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'plan_export_snapshot: not authenticated';
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
    RAISE EXCEPTION 'plan_export_snapshot: forbidden';
  END IF;

  RETURN QUERY
    SELECT
      COALESCE(ps.id,       '00000000-0000-0000-0000-000000000000'::UUID) AS snapshot_id,
      COALESCE(ps.ydoc_b64, encode(ys.update, 'base64'), '')             AS ydoc_b64,
      COALESCE(ps.byte_size, ys.byte_size, 0)                             AS byte_size,
      COALESCE(ps.reason::TEXT, 'IDLE')                                    AS reason,
      COALESCE(ps.created_at, ys.updated_at, now())                        AS created_at
    FROM plans p
    LEFT JOIN LATERAL (
      SELECT ps2.id, ps2.ydoc_b64, ps2.byte_size, ps2.reason, ps2.created_at
      FROM plan_snapshots ps2
      WHERE ps2.plan_id = p.id
      ORDER BY ps2.created_at DESC
      LIMIT 1
    ) ps ON TRUE
    LEFT JOIN ydoc_snapshots ys ON ys.plan_id = p.id
    WHERE p.id = p_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION plan_export_snapshot(UUID) TO authenticated;

COMMENT ON FUNCTION plan_export_snapshot(UUID) IS
  'Export a plan snapshot in safe base64 form. Prefers the latest versioned plan_snapshot; falls back to the current ydoc_snapshot. Caller must be plan owner or have any plan_access role.';

-- =========================================================================
-- End of migration
-- =========================================================================
-- Applied via:
--   supabase db push
-- or
--   pnpm --filter @xivmitplan/persistence db:migrate
