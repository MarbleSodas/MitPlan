-- 0015_xivmitplan_v1_mode_contracts.sql
-- Mode-aware catalog and provenance contracts for the 8.0 planner.

CREATE INDEX IF NOT EXISTS abilities_mode_effective_idx
  ON abilities(mode, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS timelines_encounter_mode_updated_idx
  ON timelines(encounter_id, mode, updated_at DESC);

CREATE OR REPLACE FUNCTION abilities_list(
  p_job_id UUID DEFAULT NULL,
  p_mode TEXT DEFAULT NULL,
  p_encounter_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID, job_id UUID, ability_id TEXT, mode ability_mode, name TEXT,
  description TEXT, effect_pct INT, recast_s INT, range_m INT,
  duration_s INT, is_invuln BOOLEAN, is_heal BOOLEAN, is_shield BOOLEAN,
  damage_type TEXT, target TEXT, charges INT, job_abbrev TEXT,
  effective_from TEXT, effective_to TEXT, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT a.id, a.job_id, a.ability_id, a.mode, a.name, a.description,
      a.effect_pct, a.recast_s, a.range_m, a.duration_s, a.is_invuln,
      a.is_heal, a.is_shield, a.damage_type, a.target, a.charges,
      j.abbreviation, a.effective_from, a.effective_to, a.created_at,
      a.updated_at
    FROM abilities a
    JOIN jobs j ON j.id = a.job_id
    WHERE (p_job_id IS NULL OR a.job_id = p_job_id)
      AND (p_mode IS NULL OR p_mode = 'ALL' OR a.mode = p_mode::ability_mode OR a.mode = 'ALL')
    ORDER BY a.job_id, a.ability_id, a.mode;
END;
$$;

GRANT EXECUTE ON FUNCTION abilities_list(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION abilities_list(UUID, TEXT, UUID) TO anon;

CREATE OR REPLACE FUNCTION ability_equivalence_list(p_mode TEXT DEFAULT NULL)
RETURNS TABLE (
  src_ability_id UUID, dst_ability_id UUID,
  relation ability_equivalence_relation, note TEXT,
  src_mode ability_mode, dst_mode ability_mode
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT e.src_ability_id, e.dst_ability_id, e.relation, e.note,
    src.mode, dst.mode
  FROM ability_equivalence e
  JOIN abilities src ON src.id = e.src_ability_id
  JOIN abilities dst ON dst.id = e.dst_ability_id
  WHERE p_mode IS NULL OR p_mode = 'ALL'
    OR src.mode = p_mode::ability_mode OR dst.mode = p_mode::ability_mode
  ORDER BY src.ability_id, dst.ability_id;
$$;

GRANT EXECUTE ON FUNCTION ability_equivalence_list(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ability_equivalence_list(TEXT) TO anon;

CREATE OR REPLACE FUNCTION timelines_by_encounter_mode(
  p_encounter_id UUID, p_mode TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID, encounter_id UUID, version TEXT, content_hash TEXT,
  source timeline_source, mode ability_mode, events JSONB, branches JSONB,
  joins JSONB, merged_from_sources JSONB, per_event_confidence JSONB,
  byte_size INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT t.id, t.encounter_id, t.version, t.content_hash, t.source, t.mode,
    t.events, t.branches, t.joins, t.merged_from_sources,
    t.per_event_confidence, t.byte_size, t.created_at, t.updated_at
  FROM timelines t
  WHERE t.encounter_id = p_encounter_id
    AND (p_mode IS NULL OR p_mode = 'ALL' OR t.mode::TEXT = p_mode)
  ORDER BY t.mode, t.version DESC, t.source ASC;
$$;

GRANT EXECUTE ON FUNCTION timelines_by_encounter_mode(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION timelines_by_encounter_mode(UUID, TEXT) TO anon;

DROP FUNCTION IF EXISTS plans_list(INT);
CREATE FUNCTION plans_list(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID, owner_id UUID, name TEXT, encounter_id UUID, party_id UUID,
  mode ability_mode, is_legacy BOOLEAN, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, conflicts JSONB, source_timeline_id UUID,
  source_timeline_version TEXT, source_timeline_hash TEXT,
  access_role plan_access_role
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT p.id, p.owner_id, p.name, p.encounter_id, p.party_id, p.mode,
    p.is_legacy, p.created_at, p.updated_at, p.conflicts,
    p.source_timeline_id, p.source_timeline_version, p.source_timeline_hash,
    CASE WHEN p.owner_id = auth.uid() THEN 'OWNER'::plan_access_role ELSE access.role END
  FROM plans p
  LEFT JOIN LATERAL (
    SELECT pa.role FROM plan_access pa
    WHERE pa.plan_id = p.id AND pa.user_id = auth.uid() LIMIT 1
  ) access ON TRUE
  WHERE p.owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM plan_access pa WHERE pa.plan_id = p.id AND pa.user_id = auth.uid())
  ORDER BY p.updated_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
$$;
GRANT EXECUTE ON FUNCTION plans_list(INT) TO authenticated;

DROP FUNCTION IF EXISTS plans_by_id(UUID);
CREATE FUNCTION plans_by_id(p_id UUID)
RETURNS TABLE (
  id UUID, owner_id UUID, name TEXT, encounter_id UUID, party_id UUID,
  mode ability_mode, is_legacy BOOLEAN, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, conflicts JSONB, source_timeline_id UUID,
  source_timeline_version TEXT, source_timeline_hash TEXT,
  access_role plan_access_role
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT p.id, p.owner_id, p.name, p.encounter_id, p.party_id, p.mode,
    p.is_legacy, p.created_at, p.updated_at, p.conflicts,
    p.source_timeline_id, p.source_timeline_version, p.source_timeline_hash,
    CASE WHEN p.owner_id = auth.uid() THEN 'OWNER'::plan_access_role ELSE access.role END
  FROM plans p
  LEFT JOIN LATERAL (
    SELECT pa.role FROM plan_access pa
    WHERE pa.plan_id = p.id AND pa.user_id = auth.uid() LIMIT 1
  ) access ON TRUE
  WHERE p.id = p_id;
$$;
GRANT EXECUTE ON FUNCTION plans_by_id(UUID) TO authenticated;
