-- 0012_xivmitplan_v1_planner_catalog.sql
--
-- XIVMitPlan v1.0 — Planner catalog fix migration.
--
-- Three goals:
--   1. Add planner-relevant columns to abilities (damage_type, target,
--      charges) so the UI no longer hardcodes these.
--   2. Add display_name to raids so the encounter picker shows the
--      proper tier-qualified name instead of uppercasing the slug.
--   3. Add job_abbrev to the abilities_list RPC so the client can
--      derive job abbreviations from the DB instead of a hardcoded map.
--
-- Forward-only; idempotent via IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- =========================================================================
-- 1. Abilities: planner catalog columns
-- =========================================================================

ALTER TABLE abilities ADD COLUMN IF NOT EXISTS damage_type text;
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS target text;
ALTER TABLE abilities ADD COLUMN IF NOT EXISTS charges integer NOT NULL DEFAULT 1;

-- =========================================================================
-- 2. Raids: display_name
-- =========================================================================

ALTER TABLE raids ADD COLUMN IF NOT EXISTS display_name text;

UPDATE raids SET display_name = 'Futures Rewritten (Ultimate)'    WHERE slug = 'fru';
UPDATE raids SET display_name = 'Alexandrian (Savage) M1'        WHERE slug = 'm1s';
UPDATE raids SET display_name = 'Alexandrian (Savage) M2'        WHERE slug = 'm2s';
UPDATE raids SET display_name = 'Pandaemonium (Savage) P1'       WHERE slug = 'p1s';
UPDATE raids SET display_name = 'Pandaemonium (Savage) P4'       WHERE slug = 'p4s';

-- =========================================================================
-- 3. Seed ability catalog — damage_type / target / charges
-- =========================================================================

-- Tank CDs
UPDATE abilities SET damage_type = 'magical', target = 'self',   charges = 1 WHERE ability_id = 'the-blackest-night';
UPDATE abilities SET damage_type = 'physical',target = 'single', charges = 1 WHERE ability_id = 'heart-of-corundum';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'rampart';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'camouflage';
-- Tank invulns
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'hallowed-ground';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'living-dead';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'superbolide';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'holmgang';
-- Healer CDs
UPDATE abilities SET damage_type = 'magical', target = 'single', charges = 1 WHERE ability_id = 'divine-benison';
UPDATE abilities SET damage_type = 'magical', target = 'single', charges = 2 WHERE ability_id = 'celestial-intersection';
UPDATE abilities SET damage_type = 'magical', target = 'single', charges = 1 WHERE ability_id = 'excogitation';
UPDATE abilities SET damage_type = 'magical', target = 'single', charges = 1 WHERE ability_id = 'aquaveil';
-- Party mits
UPDATE abilities SET damage_type = 'both',    target = 'party',  charges = 1 WHERE ability_id = 'reprisal';
UPDATE abilities SET damage_type = 'physical',target = 'single', charges = 1 WHERE ability_id = 'feint';
UPDATE abilities SET damage_type = 'magical', target = 'single', charges = 1 WHERE ability_id = 'addle';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'arms-length';
UPDATE abilities SET damage_type = 'both',    target = 'self',   charges = 1 WHERE ability_id = 'surecast';
UPDATE abilities SET damage_type = 'magical', target = 'party',  charges = 1 WHERE ability_id = 'dark-missionary';
UPDATE abilities SET damage_type = 'physical',target = 'party',  charges = 1 WHERE ability_id = 'passage-of-arms';
UPDATE abilities SET damage_type = 'both',    target = 'party',  charges = 1 WHERE ability_id = 'collective-unconscious';
UPDATE abilities SET damage_type = 'both',    target = 'area',   charges = 1 WHERE ability_id = 'sacred-soil';
UPDATE abilities SET damage_type = 'magical', target = 'area',   charges = 1 WHERE ability_id = 'earthly-star';
UPDATE abilities SET damage_type = 'magical', target = 'party',  charges = 1 WHERE ability_id = 'fey-illumination';

-- =========================================================================
-- 4. Recreate abilities_list — add damage_type, target, charges, job_abbrev
-- =========================================================================

CREATE OR REPLACE FUNCTION abilities_list(
  p_job_id       UUID DEFAULT NULL,
  p_mode         TEXT DEFAULT NULL,
  p_encounter_id UUID DEFAULT NULL
) RETURNS TABLE (
  id             UUID,
  job_id         UUID,
  ability_id     TEXT,
  mode           ability_mode,
  name           TEXT,
  description    TEXT,
  effect_pct     INT,
  recast_s       INT,
  range_m        INT,
  duration_s     INT,
  is_invuln      BOOLEAN,
  is_heal        BOOLEAN,
  is_shield      BOOLEAN,
  damage_type    TEXT,
  target         TEXT,
  charges        INT,
  job_abbrev     TEXT,
  effective_from TEXT,
  effective_to   TEXT,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      a.id,
      a.job_id,
      a.ability_id,
      a.mode,
      a.name,
      a.description,
      a.effect_pct,
      a.recast_s,
      a.range_m,
      a.duration_s,
      a.is_invuln,
      a.is_heal,
      a.is_shield,
      a.damage_type,
      a.target,
      a.charges,
      j.abbreviation  AS job_abbrev,
      a.effective_from,
      a.effective_to,
      a.created_at,
      a.updated_at
    FROM abilities a
    JOIN jobs j ON j.id = a.job_id
    WHERE (p_job_id IS NULL OR a.job_id = p_job_id)
      AND (
        p_mode IS NULL
        OR a.mode = p_mode::ability_mode
        OR a.mode = 'ALL'
      )
    ORDER BY a.job_id, a.ability_id, a.mode;
END;
$$;

GRANT EXECUTE ON FUNCTION abilities_list(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION abilities_list(UUID, TEXT, UUID) TO anon;

COMMENT ON FUNCTION abilities_list(UUID, TEXT, UUID) IS
  'List abilities, optionally filtered by job_id or mode. Returns planner catalog fields (damage_type, target, charges) and the joined job abbreviation.';

-- =========================================================================
-- 5. Recreate encounters_list — add raid_name, raid_tier
-- =========================================================================

CREATE OR REPLACE FUNCTION encounters_list(
  p_expansion_slug TEXT DEFAULT NULL,
  p_raid_slug      TEXT DEFAULT NULL
) RETURNS TABLE (
  id                 UUID,
  raid_id            UUID,
  name               TEXT,
  slug               TEXT,
  patch_version      TEXT,
  boss_npc_source_id INT,
  effective_from     TEXT,
  effective_to       TEXT,
  created_at         TIMESTAMPTZ,
  raid_slug          TEXT,
  expansion_slug     TEXT,
  raid_name          TEXT,
  raid_tier          INT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id,
      e.raid_id,
      e.name,
      e.slug,
      e.patch_version,
      e.boss_npc_source_id,
      e.effective_from,
      e.effective_to,
      e.created_at,
      r.slug        AS raid_slug,
      x.slug        AS expansion_slug,
      COALESCE(r.display_name, r.name) AS raid_name,
      r.tier        AS raid_tier
    FROM encounters e
    JOIN raids      r ON r.id = e.raid_id
    JOIN expansions x ON x.id = r.expansion_id
    WHERE (p_expansion_slug IS NULL OR x.slug = p_expansion_slug)
      AND (p_raid_slug      IS NULL OR r.slug = p_raid_slug)
    ORDER BY x.release_patch DESC, r.tier ASC, e.slug ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION encounters_list(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION encounters_list(TEXT, TEXT) TO anon;

COMMENT ON FUNCTION encounters_list(TEXT, TEXT) IS
  'List encounters, optionally filtered by expansion_slug or raid_slug. Returns raid display name and tier.';

-- =========================================================================
-- 6. Recreate encounters_by_id — add raid_name, raid_tier
-- =========================================================================

CREATE OR REPLACE FUNCTION encounters_by_id(
  p_id UUID
) RETURNS TABLE (
  id                 UUID,
  raid_id            UUID,
  name               TEXT,
  slug               TEXT,
  patch_version      TEXT,
  boss_npc_source_id INT,
  effective_from     TEXT,
  effective_to       TEXT,
  created_at         TIMESTAMPTZ,
  raid_slug          TEXT,
  expansion_slug     TEXT,
  raid_name          TEXT,
  raid_tier          INT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id,
      e.raid_id,
      e.name,
      e.slug,
      e.patch_version,
      e.boss_npc_source_id,
      e.effective_from,
      e.effective_to,
      e.created_at,
      r.slug        AS raid_slug,
      x.slug        AS expansion_slug,
      COALESCE(r.display_name, r.name) AS raid_name,
      r.tier        AS raid_tier
    FROM encounters e
    JOIN raids      r ON r.id = e.raid_id
    JOIN expansions x ON x.id = r.expansion_id
    WHERE e.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION encounters_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION encounters_by_id(UUID) TO anon;

COMMENT ON FUNCTION encounters_by_id(UUID) IS
  'Single encounter lookup by id. Returns raid display name and tier.';
