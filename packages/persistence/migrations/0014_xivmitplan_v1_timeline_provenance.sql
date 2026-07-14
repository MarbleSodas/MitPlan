-- 0014_xivmitplan_v1_timeline_provenance.sql
--
-- XIVMitPlan v1.0 — Canonical timeline provenance on plans.
--
-- Adds nullable source_timeline_id / version / hash columns to the
-- `plans` table so the editor can detect canonical drift and pin a plan
-- to a specific canonical timeline row.
--
-- Also adds a `select_canonical_timeline_for_encounter` RPC that
-- deterministically picks the best canonical timeline for an encounter,
-- following the same priority as the client-side adapter:
--   1. Prefer CURRENT mode timelines.
--   2. Within same mode, prefer MANUAL source, then CACTBOT/FFLOGS/TRIGGERNOMETRY.
--   3. Pick the newest version within the preferred group.
--
-- Forward-only; idempotent for the RPC via CREATE OR REPLACE FUNCTION.
-- The column additions use IF NOT EXISTS for idempotency.

-- =========================================================================
-- 1. Add provenance columns to plans (idempotent)
-- =========================================================================

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS source_timeline_id UUID REFERENCES timelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_timeline_version TEXT,
  ADD COLUMN IF NOT EXISTS source_timeline_hash TEXT;

CREATE INDEX IF NOT EXISTS plans_source_timeline_idx ON plans(source_timeline_id);

COMMENT ON COLUMN plans.source_timeline_id IS
  'The canonical timeline row this plan is pinned to. NULL for legacy plans or plans not yet materialized.';
COMMENT ON COLUMN plans.source_timeline_version IS
  'The source timeline version string at the time the plan was created or last materialized.';
COMMENT ON COLUMN plans.source_timeline_hash IS
  'The source timeline content_hash at the time the plan was created or last materialized. Used for drift detection.';

-- =========================================================================
-- 2. select_canonical_timeline_for_encounter RPC
-- =========================================================================
-- Deterministic canonical timeline selection for an encounter/mode pair.
-- Returns the single best-matching timeline row, or NULL when no timeline
-- exists for the given encounter.
--
-- Selection priority:
--   1. Prefer CURRENT mode over other modes.
--   2. Within same mode, prefer MANUAL source, then CACTBOT, FFLOGS, TRIGGERNOMETRY.
--   3. Within the preferred group, pick the most recent version.

CREATE OR REPLACE FUNCTION select_canonical_timeline_for_encounter(
  p_encounter_id UUID,
  p_mode TEXT DEFAULT 'CURRENT'
) RETURNS TABLE (
  id UUID,
  encounter_id UUID,
  version TEXT,
  content_hash TEXT,
  source TEXT,
  mode TEXT,
  events JSONB,
  branches JSONB,
  joins JSONB,
  merged_from_sources JSONB,
  per_event_confidence JSONB,
  byte_size INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_source_priority INT[];
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT t.*
    FROM timelines t
    WHERE t.encounter_id = p_encounter_id
      AND (p_mode IS NULL OR t.mode = p_mode)
  ),
  ranked AS (
    SELECT *,
      CASE
        WHEN source = 'MANUAL' THEN 1
        WHEN source = 'CACTBOT' THEN 2
        WHEN source = 'FFLOGS' THEN 3
        WHEN source = 'TRIGGERNOMETRY' THEN 4
        ELSE 5
      END AS source_rank
    FROM candidates
  ),
  best AS (
    SELECT *
    FROM ranked
    ORDER BY
      -- Prefer CURRENT mode, then fall back to any mode
      CASE WHEN mode = 'CURRENT' THEN 0 ELSE 1 END,
      source_rank,
      -- Within the same source priority, newest version first
      version DESC
    LIMIT 1
  )
  SELECT
    best.id,
    best.encounter_id,
    best.version,
    best.content_hash,
    best.source::TEXT,
    best.mode::TEXT,
    best.events,
    best.branches,
    best.joins,
    best.merged_from_sources,
    best.per_event_confidence,
    best.byte_size,
    best.created_at,
    best.updated_at
  FROM best;
END;
$$;

GRANT EXECUTE ON FUNCTION select_canonical_timeline_for_encounter(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION select_canonical_timeline_for_encounter(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION select_canonical_timeline_for_encounter(UUID, TEXT) IS
  'Deterministically select the best canonical timeline for an encounter. Priority: CURRENT mode > MANUAL source > newest version.';

-- =========================================================================
-- 3. upsert_plan_provenance RPC
-- =========================================================================
-- Upserts the source timeline provenance columns on a plan. Used by the
-- plans-create edge function and the plan editor when it materializes
-- the canonical timeline into the Yjs doc for the first time.
--
-- The caller must be the plan owner or have an EDITOR role on the plan.

CREATE OR REPLACE FUNCTION upsert_plan_provenance(
  p_plan_id UUID,
  p_source_timeline_id UUID,
  p_source_version TEXT,
  p_source_hash TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'upsert_plan_provenance: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = p_plan_id
      AND (
        p.owner_id = v_uid
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = p_plan_id AND pa.user_id = v_uid AND pa.role IN ('OWNER', 'EDITOR')
        )
      )
  ) THEN
    RAISE EXCEPTION 'upsert_plan_provenance: forbidden';
  END IF;

  UPDATE plans
  SET
    source_timeline_id = p_source_timeline_id,
    source_timeline_version = p_source_version,
    source_timeline_hash = p_source_hash,
    updated_at = now()
  WHERE id = p_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_plan_provenance(UUID, UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION upsert_plan_provenance(UUID, UUID, TEXT, TEXT) IS
  'Set the source timeline provenance columns on a plan. Caller must be plan owner or editor.';

-- =========================================================================
-- End of migration
-- =========================================================================
