-- 0004_xivmitplan_v1_seed.sql
--
-- XIVMitPlan v1.0 — Phase 1 reference catalog + FRU base timeline seed.
-- Source: README.md §"Phase 1 — Learn mode (read-only encounter browser)"
-- and the Phase 7 demo scope ("working demo with a base timeline of
-- FRU as an option").
--
-- This migration is **idempotent**: every INSERT uses `ON CONFLICT DO
-- NOTHING` so re-running the migration against an already-seeded DB
-- is a no-op. Use `TRUNCATE expansions, raids, encounters, roles,
-- jobs, abilities, ability_equivalence, timelines RESTART IDENTITY
-- CASCADE;` to wipe + re-seed in dev.
--
-- Stable UUIDs: all rows use deterministic UUIDs so the seed can be
-- re-applied and so the web app can hard-code references (e.g. the
-- FRU P1 encounter ID is `10000000-0000-0000-0000-000000000001`
-- which matches the `FRU_P1_ID` constant in
-- `apps/web/src/lib/sample-data.ts`).
--
-- Apply with:
--   pnpm --filter @xivmitplan/persistence db:migrate
-- or:
--   supabase db push
-- or:
--   psql "$DATABASE_URL" -f packages/persistence/migrations/0004_xivmitplan_v1_seed.sql

-- =========================================================================
-- Expansions
-- =========================================================================

INSERT INTO expansions (id, name, slug, release_patch, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Endwalker',         'endwalker',   '6.0',  now()),
  ('20000000-0000-0000-0000-000000000002', 'Dawntrail',         'dawntrail',   '7.0',  now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Raids
-- =========================================================================

INSERT INTO raids (id, expansion_id, name, slug, patch_version, tier, created_at) VALUES
  -- FRU (Futures Rewritten Ultimate) — Dawntrail 7.21
  ('30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002',
   'Futures Rewritten (Ultimate)', 'fru', '7.21', 1, now()),
  -- M1S / M2S — Dawntrail 7.05 / 7.08 (tier 1 of 7.x Savage)
  ('30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'Alexandrian (Savage) M1', 'm1s', '7.05', 1, now()),
  ('30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000002',
   'Alexandrian (Savage) M2', 'm2s', '7.08', 1, now()),
  -- P1S / P4S — Endwalker 6.05 / 6.18 (Pandaemonium Savage, kept for
  -- back-compat with v1 demo content + the legacy MitPlan import path).
  ('30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000001',
   'Pandaemonium (Savage) P1', 'p1s', '6.05', 1, now()),
  ('30000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000001',
   'Pandaemonium (Savage) P4', 'p4s', '6.18', 1, now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Encounters
-- =========================================================================
-- The FRU P1 / M1S / M2S UUIDs intentionally match the constants in
-- `apps/web/src/lib/sample-data.ts` so the Phase 0 demo continues to
-- work without changes when Supabase is connected.

INSERT INTO encounters (id, raid_id, name, slug, patch_version, boss_npc_source_id, effective_from, effective_to, created_at) VALUES
  -- FRU Phase 1: Light Rampant (the light/dark mechanic on the primals)
  ('10000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Light Rampant',
   'fru-p1-light-rampant',
   '7.21', 1, '7.21', NULL, now()),
  -- FRU Phase 2: Darklit Dragonsong (the dragon mechanic + tankbusters)
  ('10000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000001',
   'Darklit Dragonsong',
   'fru-p2-darklit-dragonsong',
   '7.21', 2, '7.21', NULL, now()),
  -- M1S / M2S — back-compat with sample-data.ts
  ('10000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002',
   'Sugar Riot',
   'm1s-sugar-riot',
   '7.05', 1, '7.05', NULL, now()),
  ('10000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000003',
   'Howling Blade',
   'm2s-howling-blade',
   '7.08', 1, '7.08', NULL, now()),
  -- P1S / P4S — kept for the legacy MitPlan v1 import path
  ('10000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000004',
   'Erichthonios',
   'p1s-erichthonios',
   '6.05', 1, '6.05', '7.0', now()),
  ('10000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000005',
   'Hephaistos',
   'p4s-hephaistos',
   '6.18', 1, '6.18', '7.0', now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Roles
-- =========================================================================

INSERT INTO roles (id, name, abbreviation) VALUES
  ('40000000-0000-0000-0000-000000000001', 'TANK',   'T'),
  ('40000000-0000-0000-0000-000000000002', 'HEALER', 'H'),
  ('40000000-0000-0000-0000-000000000003', 'MELEE',  'M'),
  ('40000000-0000-0000-0000-000000000004', 'RANGED', 'R'),
  ('40000000-0000-0000-0000-000000000005', 'CASTER', 'C')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Jobs
-- =========================================================================
-- The 8 jobs cover every ability in the demo ability picker
-- (see `apps/web/src/lib/sample-data.ts` SAMPLE_ABILITIES).

INSERT INTO jobs (id, role_id, name, abbreviation, evolved_only, is_new) VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Paladin',    'PLD', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Warrior',    'WAR', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Dark Knight','DRK', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'Gunbreaker', 'GNB', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', 'Scholar',    'SCH', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', 'Astrologian','AST', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000005', 'Black Mage', 'BLM', FALSE, FALSE),
  ('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000003', 'Monk',       'MNK', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Abilities
-- =========================================================================
-- One row per (job_id, ability_id, mode) tuple. mode='CURRENT' for
-- v1.0 demo (the 7.x version of each ability).
--
-- The IDs match `SAMPLE_ABILITIES` in apps/web/src/lib/sample-data.ts
-- by their `ability_id` field (textual), so the web app's
-- data-source wrapper can resolve a sample ability's display name
-- from the catalog row.

INSERT INTO abilities (
  id, job_id, ability_id, mode, name, description,
  effect_pct, recast_s, range_m, duration_s,
  is_invuln, is_heal, is_shield,
  effective_from, effective_to, created_at, updated_at
) VALUES
  -- ----- Tank CDs -----
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003',
   'the-blackest-night', 'CURRENT', 'The Blackest Night',
   'Single-target 25s shield absorbing 50% of damage taken.',
   50, 60, 30, 25, FALSE, FALSE, TRUE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000004',
   'heart-of-corundum', 'CURRENT', 'Heart of Corundum',
   'Single-target mit + catharsis dot on the target.',
   15, 60, 30, 20, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001',
   'rampart', 'CURRENT', 'Rampart',
   'Job-agnostic 20% mit on yourself, 90s recast.',
   20, 90, 0, 20, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002',
   'camouflage', 'CURRENT', 'Camouflage',
   '10% mit + stacks additional when hit repeatedly.',
   10, 90, 0, 20, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  -- ----- Tank invulns -----
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',
   'hallowed-ground', 'CURRENT', 'Hallowed Ground',
   '10s full invuln on self.',
   100, 420, 0, 10, TRUE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000003',
   'living-dead', 'CURRENT', 'Living Dead',
   '10s invuln with a walking-dead follow-up window.',
   100, 300, 0, 10, TRUE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000004',
   'superbolide', 'CURRENT', 'Superbolide',
   '10s full invuln, drops HP to 1.',
   100, 360, 0, 10, TRUE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000002',
   'holmgang', 'CURRENT', 'Holmgang',
   '4s invuln + lock HP for 6s (no healing in/out).',
   100, 240, 0, 4, TRUE, FALSE, FALSE, '7.0', NULL, now(), now()),
  -- ----- Healer CDs -----
  ('60000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000006',
   'divine-benison', 'CURRENT', 'Divine Benison',
   'Quick single-target shield on a party member.',
   NULL, 30, 30, 15, FALSE, FALSE, TRUE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000006',
   'celestial-intersection', 'CURRENT', 'Celestial Intersection',
   'Heals or shields self/target for a small amount.',
   NULL, 30, 30, 15, FALSE, TRUE, TRUE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000005',
   'excogitation', 'CURRENT', 'Excogitation',
   'Triggers when target HP drops below 50%.',
   NULL, 45, 30, 45, FALSE, TRUE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000005',
   'aquaveil', 'CURRENT', 'Aquaveil',
   '15% mit on a single target, 8s.',
   15, 60, 30, 8, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  -- ----- Party-wide mits -----
  ('60000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000001',
   'reprisal', 'CURRENT', 'Reprisal',
   'Party-wide 10% mit + slow for 5/15s.',
   10, 60, 0, 15, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000008',
   'feint', 'CURRENT', 'Feint',
   'Single-target 10% mit via debuff, melee.',
   10, 90, 30, 15, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000007',
   'addle', 'CURRENT', 'Addle',
   'Single-target 10% mit via debuff, magic.',
   10, 90, 30, 15, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000016', '50000000-0000-0000-0000-000000000002',
   'arms-length', 'CURRENT', 'Arms Length',
   'Knockback + slow immunity for 6s.',
   NULL, 120, 0, 6, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000017', '50000000-0000-0000-0000-000000000007',
   'surecast', 'CURRENT', 'Surecast',
   'Knockback + draw-in immunity for 6s.',
   NULL, 120, 0, 6, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000003',
   'dark-missionary', 'CURRENT', 'Dark Missionary',
   'Party magic 15% mit, 15s.',
   15, 90, 0, 15, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000019', '50000000-0000-0000-0000-000000000001',
   'passage-of-arms', 'CURRENT', 'Passage of Arms',
   'Cone-shaped physical 15% mit, 18s while channeling.',
   15, 120, 0, 18, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000006',
   'collective-unconscious', 'CURRENT', 'Collective Unconscious',
   'Bubble of 10% mit plus regen while channeling.',
   10, 60, 0, 20, FALSE, TRUE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000005',
   'sacred-soil', 'CURRENT', 'Sacred Soil',
   'AOE 10% mit + HP recovery on hit.',
   10, 30, 30, 15, FALSE, FALSE, FALSE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000006',
   'earthly-star', 'CURRENT', 'Earthly Star',
   'Detonates for a regen or shield depending on maturity.',
   NULL, 60, 30, 10, FALSE, TRUE, TRUE, '7.0', NULL, now(), now()),
  ('60000000-0000-0000-0000-000000000023', '50000000-0000-0000-0000-000000000005',
   'fey-illumination', 'CURRENT', 'Fey Illumination',
   'Party-wide 5% mit + 10% healing potency.',
   5, 120, 0, 20, FALSE, TRUE, FALSE, '7.0', NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Timelines — FRU Phase 1 (Light Rampant)
-- =========================================================================
-- ~18 events covering the major mechanics from pull through the
-- Light Rampant → Darklit Dragonsong → House of Light sequence.
-- Times are in milliseconds from pull. Event types:
--   MECHANIC   — non-mit-anchored mechanic marker
--   BUSTER     — tank buster (tank mit priority)
--   RAIDWIDE   — party-wide damage (party mit priority)
--   MECHANIC_START / MECHANIC_END — mechanic bookends (for future
--     TimelineGraph branch + join semantics)
--
-- The TimelineEvent schema (validation/src/timeline) requires
-- position, timestampMs, normalizedNames, targets, mechanicId,
-- patchVersion, confidence, mergedFromSources. The `events` JSONB
-- column on `timelines` is parsed through `TimelineGraph.parse` on
-- the web side.

INSERT INTO timelines (
  id, encounter_id, version, content_hash, source, mode,
  events, branches, joins,
  merged_from_sources, per_event_confidence, byte_size,
  created_at, updated_at
) VALUES
(
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '7.21',
  'fru-p1-seed-2026-06-30',
  'MANUAL', 'CURRENT',
  '[
    {"id":"80000000-0000-0000-0000-000000000001","position":0,"timestampMs":0,"type":"MECHANIC","name":"Pull","normalizedNames":["pull"],"durationMs":null,"hitTimesMs":[],"targets":{"kind":"ALL"},"mechanicId":null,"patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":false,"triggernometry":false,"fflogs":false}},
    {"id":"80000000-0000-0000-0000-000000000002","position":1,"timestampMs":28000,"type":"MECHANIC","name":"Hello World (party stack)","normalizedNames":["hello-world"],"durationMs":5000,"hitTimesMs":[30000],"targets":{"kind":"PARTY"},"mechanicId":"hello-world","patchVersion":"7.21","confidence":0.95,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000003","position":2,"timestampMs":55000,"type":"BUSTER","name":"Light Rampant (tank buster)","normalizedNames":["light-rampant"],"durationMs":null,"hitTimesMs":[56000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"light-rampant","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000004","position":3,"timestampMs":85000,"type":"MECHANIC","name":"Banish (gimme 3)","normalizedNames":["banish"],"durationMs":8000,"hitTimesMs":[90000,95000,100000],"targets":{"kind":"TARGETED"},"mechanicId":"banish","patchVersion":"7.21","confidence":0.9,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000005","position":4,"timestampMs":120000,"type":"RAIDWIDE","name":"Darklit Dragonsong (raidwide 1)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[121000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000006","position":5,"timestampMs":150000,"type":"MECHANIC","name":"Towers + AoE","normalizedNames":["tower-aoe"],"durationMs":15000,"hitTimesMs":[160000],"targets":{"kind":"PARTY"},"mechanicId":"tower-aoe","patchVersion":"7.21","confidence":0.85,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000007","position":6,"timestampMs":180000,"type":"RAIDWIDE","name":"Apocalyptic Lamp (raidwide)","normalizedNames":["apocalyptic-lamp"],"durationMs":null,"hitTimesMs":[181000],"targets":{"kind":"ALL"},"mechanicId":"apocalyptic-lamp","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000008","position":7,"timestampMs":215000,"type":"BUSTER","name":"Light Rampant 2 (tank buster)","normalizedNames":["light-rampant"],"durationMs":null,"hitTimesMs":[216000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"light-rampant","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000009","position":8,"timestampMs":245000,"type":"MECHANIC","name":"Banish 2 (gimme 3)","normalizedNames":["banish"],"durationMs":8000,"hitTimesMs":[250000,255000,260000],"targets":{"kind":"TARGETED"},"mechanicId":"banish","patchVersion":"7.21","confidence":0.9,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000010","position":9,"timestampMs":280000,"type":"RAIDWIDE","name":"Darklit Dragonsong 2 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[281000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000011","position":10,"timestampMs":315000,"type":"MECHANIC","name":"House of Light (towers + cleaves)","normalizedNames":["house-of-light"],"durationMs":20000,"hitTimesMs":[330000],"targets":{"kind":"PARTY"},"mechanicId":"house-of-light","patchVersion":"7.21","confidence":0.95,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000012","position":11,"timestampMs":360000,"type":"RAIDWIDE","name":"Apocalyptic Lamp 2 (raidwide)","normalizedNames":["apocalyptic-lamp"],"durationMs":null,"hitTimesMs":[361000],"targets":{"kind":"ALL"},"mechanicId":"apocalyptic-lamp","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000013","position":12,"timestampMs":395000,"type":"BUSTER","name":"Light Rampant 3 (tank buster)","normalizedNames":["light-rampant"],"durationMs":null,"hitTimesMs":[396000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"light-rampant","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000014","position":13,"timestampMs":430000,"type":"RAIDWIDE","name":"Darklit Dragonsong 3 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[431000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000015","position":14,"timestampMs":465000,"type":"MECHANIC","name":"Ultimate Relativity (phase transition)","normalizedNames":["ultimate-relativity"],"durationMs":30000,"hitTimesMs":[490000],"targets":{"kind":"ALL"},"mechanicId":"ultimate-relativity","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000016","position":15,"timestampMs":510000,"type":"RAIDWIDE","name":"Crystallize Time (raidwide burst)","normalizedNames":["crystallize-time"],"durationMs":null,"hitTimesMs":[511000],"targets":{"kind":"ALL"},"mechanicId":"crystallize-time","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000017","position":16,"timestampMs":540000,"type":"BUSTER","name":"Enrage buster (ultimate end)","normalizedNames":["enrage"],"durationMs":null,"hitTimesMs":[541000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"enrage","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"80000000-0000-0000-0000-000000000018","position":17,"timestampMs":545000,"type":"MECHANIC","name":"Phase 1 clear","normalizedNames":["phase-clear"],"durationMs":null,"hitTimesMs":[],"targets":{"kind":"ALL"},"mechanicId":null,"patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":false,"triggernometry":false,"fflogs":false}}
  ]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"cactbot":true,"triggernometry":true,"fflogs":true}'::jsonb,
  '{"80000000-0000-0000-0000-000000000003":1.0,"80000000-0000-0000-0000-000000000005":1.0,"80000000-0000-0000-0000-000000000007":1.0}'::jsonb,
  8192,
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Timelines — FRU Phase 2 (Darklit Dragonsong)
-- =========================================================================
-- ~20 events covering the dragon mechanic sequence + Memoricide tank
-- buster combo + final phase transition.

INSERT INTO timelines (
  id, encounter_id, version, content_hash, source, mode,
  events, branches, joins,
  merged_from_sources, per_event_confidence, byte_size,
  created_at, updated_at
) VALUES
(
  '70000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000004',
  '7.21',
  'fru-p2-seed-2026-06-30',
  'MANUAL', 'CURRENT',
  '[
    {"id":"81000000-0000-0000-0000-000000000001","position":0,"timestampMs":0,"type":"MECHANIC","name":"Phase 2 pull","normalizedNames":["phase-2-pull"],"durationMs":null,"hitTimesMs":[],"targets":{"kind":"ALL"},"mechanicId":null,"patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":false,"triggernometry":false,"fflogs":false}},
    {"id":"81000000-0000-0000-0000-000000000002","position":1,"timestampMs":25000,"type":"RAIDWIDE","name":"Darklit Dragonsong (P2 opener)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[26000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000003","position":2,"timestampMs":55000,"type":"BUSTER","name":"Memoricide (tank buster 1)","normalizedNames":["memoricide"],"durationMs":null,"hitTimesMs":[56000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"memoricide","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000004","position":3,"timestampMs":85000,"type":"MECHANIC","name":"Dragon heads (4 spread markers)","normalizedNames":["dragon-heads"],"durationMs":10000,"hitTimesMs":[90000],"targets":{"kind":"TARGETED"},"mechanicId":"dragon-heads","patchVersion":"7.21","confidence":0.9,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000005","position":4,"timestampMs":120000,"type":"RAIDWIDE","name":"Darklit Dragonsong 2 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[121000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000006","position":5,"timestampMs":150000,"type":"BUSTER","name":"Memoricide 2 (tank buster)","normalizedNames":["memoricide"],"durationMs":null,"hitTimesMs":[151000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"memoricide","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000007","position":6,"timestampMs":185000,"type":"MECHANIC","name":"Crystallize Time (mini)","normalizedNames":["crystallize-time"],"durationMs":8000,"hitTimesMs":[190000],"targets":{"kind":"ALL"},"mechanicId":"crystallize-time","patchVersion":"7.21","confidence":0.95,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000008","position":7,"timestampMs":220000,"type":"RAIDWIDE","name":"Darklit Dragonsong 3 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[221000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000009","position":8,"timestampMs":255000,"type":"BUSTER","name":"Memoricide 3 (tank buster)","normalizedNames":["memoricide"],"durationMs":null,"hitTimesMs":[256000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"memoricide","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000010","position":9,"timestampMs":290000,"type":"MECHANIC","name":"Dragon heads 2 (4 spread markers)","normalizedNames":["dragon-heads"],"durationMs":10000,"hitTimesMs":[295000],"targets":{"kind":"TARGETED"},"mechanicId":"dragon-heads","patchVersion":"7.21","confidence":0.9,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000011","position":10,"timestampMs":325000,"type":"RAIDWIDE","name":"Darklit Dragonsong 4 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[326000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000012","position":11,"timestampMs":360000,"type":"BUSTER","name":"Memoricide 4 (tank buster)","normalizedNames":["memoricide"],"durationMs":null,"hitTimesMs":[361000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"memoricide","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000013","position":12,"timestampMs":395000,"type":"MECHANIC","name":"Akh Morn (party buster)","normalizedNames":["akh-morn"],"durationMs":null,"hitTimesMs":[396000],"targets":{"kind":"PARTY"},"mechanicId":"akh-morn","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000014","position":13,"timestampMs":430000,"type":"RAIDWIDE","name":"Darklit Dragonsong 5 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[431000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000015","position":14,"timestampMs":465000,"type":"MECHANIC","name":"Crystallize Time 2 (party soak)","normalizedNames":["crystallize-time"],"durationMs":12000,"hitTimesMs":[475000],"targets":{"kind":"PARTY"},"mechanicId":"crystallize-time","patchVersion":"7.21","confidence":0.95,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000016","position":15,"timestampMs":500000,"type":"BUSTER","name":"Memoricide 5 (final tank buster)","normalizedNames":["memoricide"],"durationMs":null,"hitTimesMs":[501000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"memoricide","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000017","position":16,"timestampMs":535000,"type":"RAIDWIDE","name":"Darklit Dragonsong 6 (raidwide)","normalizedNames":["darklit-dragonsong"],"durationMs":null,"hitTimesMs":[536000],"targets":{"kind":"ALL"},"mechanicId":"darklit-dragonsong","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000018","position":17,"timestampMs":570000,"type":"MECHANIC","name":"Resolution (final mechanic)","normalizedNames":["resolution"],"durationMs":15000,"hitTimesMs":[580000],"targets":{"kind":"ALL"},"mechanicId":"resolution","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000019","position":18,"timestampMs":605000,"type":"BUSTER","name":"Enrage (ultimate end)","normalizedNames":["enrage"],"durationMs":null,"hitTimesMs":[606000],"targets":{"kind":"MAIN_TANK"},"mechanicId":"enrage","patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":true,"triggernometry":true,"fflogs":true}},
    {"id":"81000000-0000-0000-0000-000000000020","position":19,"timestampMs":610000,"type":"MECHANIC","name":"Phase 2 clear","normalizedNames":["phase-clear"],"durationMs":null,"hitTimesMs":[],"targets":{"kind":"ALL"},"mechanicId":null,"patchVersion":"7.21","confidence":1.0,"mergedFromSources":{"cactbot":false,"triggernometry":false,"fflogs":false}}
  ]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"cactbot":true,"triggernometry":true,"fflogs":true}'::jsonb,
  '{"81000000-0000-0000-0000-000000000002":1.0,"81000000-0000-0000-0000-000000000003":1.0,"81000000-0000-0000-0000-000000000005":1.0}'::jsonb,
  8192,
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- End of migration
-- =========================================================================
-- After this migration runs:
--   - The /learn route (Phase 1, future) can list all encounters
--     via `rpc('encounters_list')`.
--   - The /plan index can show the user's plans via `rpc('plans_list')`.
--   - The plan editor can load FRU P1's base timeline via
--     `rpc('timelines_by_encounter', { encounter_id: '10000000-...-001' })`
--     and the FRU P2 base timeline via the same call against
--     `10000000-...-004`.
--   - The ability picker can list all 23 demo abilities via
--     `rpc('abilities_list')`.
--
-- Re-seed (dev only):
--   TRUNCATE timelines, abilities, ability_equivalence, encounters,
--            raids, expansions, roles, jobs RESTART IDENTITY CASCADE;
--   psql "$DATABASE_URL" -f packages/persistence/migrations/0004_xivmitplan_v1_seed.sql