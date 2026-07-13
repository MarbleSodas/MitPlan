-- 0006_xivmitplan_v1_legacy_sentinel.sql
--
-- XIVMitPlan v1.0 — sentinel catalog rows for legacy plan import.
--
-- `claim_legacy_plans` and `flip_expired_legacy_plans` (migration 0001)
-- INSERT into `plans` with `encounter_id = (SELECT id FROM encounters
-- WHERE slug = 'legacy-import-sentinel' LIMIT 1)`. Without these rows
-- the subquery returns NULL and the INSERT violates the NOT NULL
-- `encounter_id` constraint. This migration seeds the sentinel
-- expansion/raid/encounter the import path depends on.

INSERT INTO expansions (id, name, slug, release_patch)
VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Import', 'legacy-import', '0.0')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO raids (id, expansion_id, name, slug, patch_version, tier)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Legacy Import', 'legacy-import', '0.0', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO encounters (id, raid_id, name, slug, patch_version, boss_npc_source_id, effective_from, effective_to)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Legacy Import', 'legacy-import-sentinel', '0.0', 0, '0.0', NULL)
ON CONFLICT (slug) DO NOTHING;
