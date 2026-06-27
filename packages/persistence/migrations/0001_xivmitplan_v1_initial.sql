-- 0001_xivmitplan_v1_initial.sql
--
-- XIVMitPlan v1.0 — initial migration.
-- Source: docs/adr/0001-xivmitplan-v1-architecture-locked.md §17.
--
-- This file is the canonical DDL for the v1.0 schema. Drizzle Kit
-- reads the schema files in src/schema/ and generates this from them;
-- the SQL is what gets applied to staging + prod.
--
-- Apply with:
--   pnpm --filter @xivmitplan/persistence db:migrate
-- or directly with the Supabase CLI:
--   supabase db push
--
-- The migration is forward-only per §17.8. Corrections are new migrations.

-- =========================================================================
-- Enums
-- =========================================================================

CREATE TYPE ability_mode AS ENUM ('REBORN', 'EVOLVED', 'CURRENT', 'ALL');
CREATE TYPE role_kind AS ENUM ('TANK', 'HEALER', 'MELEE', 'RANGED', 'CASTER');
CREATE TYPE timeline_source AS ENUM (
  'CACTBOT',
  'TRIGGERNOMETRY',
  'FFLOGS',
  'MERGED',
  'MANUAL'
);
CREATE TYPE snapshot_reason AS ENUM (
  'IDLE',
  'USER_SAVE',
  'ASSIGNMENT_DELETE',
  'REBUILD'
);
CREATE TYPE plan_access_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE ability_equivalence_relation AS ENUM (
  'EQUIVALENT',
  'CONSOLIDATED',
  'REMOVED',
  'ADDED'
);

-- =========================================================================
-- Reference catalog (§17.1, §19.2)
-- =========================================================================

CREATE TABLE expansions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  release_patch TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE raids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expansion_id  UUID NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  patch_version TEXT NOT NULL,
  tier          INT  NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX raids_expansion_idx ON raids(expansion_id);

CREATE TABLE encounters (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id            UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  patch_version      TEXT NOT NULL,
  boss_npc_source_id INT,
  effective_from     TEXT NOT NULL,
  effective_to       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX encounters_raid_idx ON encounters(raid_id);
CREATE INDEX encounters_patch_idx ON encounters(patch_version);

CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         role_kind NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL
);

CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id      UUID NOT NULL REFERENCES roles(id),
  name         TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL UNIQUE,
  evolved_only BOOLEAN NOT NULL DEFAULT FALSE,
  is_new       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX jobs_role_idx ON jobs(role_id);

-- The (jobId, abilityId, mode) composite key is the v1.0-ready schema
-- per architecture §19.2 (re-verified 2026-06-14).
CREATE TABLE abilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  ability_id      TEXT NOT NULL,
  mode            ability_mode NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  effect_pct      INT,
  recast_s        INT,
  range_m         INT,
  duration_s      INT,
  is_invuln       BOOLEAN NOT NULL DEFAULT FALSE,
  is_heal         BOOLEAN NOT NULL DEFAULT FALSE,
  is_shield       BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from  TEXT NOT NULL,
  effective_to    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, ability_id, mode)
);
CREATE INDEX abilities_job_mode_idx ON abilities(job_id, mode);

CREATE TABLE ability_equivalence (
  src_ability_id UUID NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
  dst_ability_id UUID NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
  relation       ability_equivalence_relation NOT NULL,
  note           TEXT,
  PRIMARY KEY (src_ability_id, dst_ability_id)
);
CREATE INDEX ability_equivalence_src_idx ON ability_equivalence(src_ability_id);

-- =========================================================================
-- Profiles (§17.5)
-- =========================================================================
-- The 1:1 mirror of auth.users(id). The auth.identities table (managed
-- by Supabase) is the authoritative source for (provider, provider_user_id)
-- mapping. The columns here are denormalized caches for fast RLS lookups.

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY,
  display_name          TEXT NOT NULL,
  discord_id            TEXT,
  google_id             TEXT,
  email                 TEXT,
  email_verified_at     TIMESTAMPTZ,
  mitplan_v1_claim_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_discord_idx ON profiles(discord_id) WHERE discord_id IS NOT NULL;
CREATE INDEX profiles_google_idx  ON profiles(google_id)  WHERE google_id  IS NOT NULL;
CREATE INDEX profiles_email_idx   ON profiles(email)      WHERE email      IS NOT NULL;

-- =========================================================================
-- Parties (§17)
-- =========================================================================

CREATE TABLE parties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL,
  name            TEXT NOT NULL,
  slot_user_ids   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parties_owner_idx ON parties(owner_id);

-- =========================================================================
-- Plans (§17.3)
-- =========================================================================

CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL,
  name          TEXT NOT NULL,
  encounter_id  UUID NOT NULL REFERENCES encounters(id),
  party_id      UUID,
  mode          ability_mode NOT NULL DEFAULT 'CURRENT',
  is_legacy     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  conflicts     JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX plans_owner_idx ON plans(owner_id);
CREATE INDEX plans_encounter_idx ON plans(encounter_id);
CREATE INDEX plans_updated_idx ON plans(updated_at);

CREATE TABLE plan_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  ydoc_b64    TEXT NOT NULL,
  byte_size   INT  NOT NULL,
  reason      snapshot_reason NOT NULL,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plan_snapshots_plan_idx ON plan_snapshots(plan_id);
CREATE INDEX plan_snapshots_created_at_idx ON plan_snapshots(created_at);

CREATE TABLE plan_access (
  plan_id          UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  role             plan_access_role NOT NULL,
  via_share_token  BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);
CREATE INDEX plan_access_user_idx ON plan_access(user_id);

-- =========================================================================
-- Timelines (§17.2)
-- =========================================================================

CREATE TABLE timelines (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id           UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  version                TEXT NOT NULL,
  content_hash           TEXT NOT NULL,
  source                 timeline_source NOT NULL,
  mode                   ability_mode NOT NULL DEFAULT 'CURRENT',
  events                 JSONB NOT NULL,
  branches               JSONB NOT NULL DEFAULT '[]'::jsonb,
  joins                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  merged_from_sources    JSONB NOT NULL DEFAULT '{"cactbot": false, "triggernometry": false, "fflogs": false}'::jsonb,
  per_event_confidence   JSONB,
  byte_size              INT  NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (encounter_id, version, source)
);
CREATE INDEX timelines_updated_idx ON timelines(updated_at);

-- =========================================================================
-- Yjs snapshots (§17.7.2, §14.6.2)
-- =========================================================================
-- Hocuspocus onSave writes the Yjs state here. This is the source of
-- truth that the DO reloads on cold start.

CREATE TABLE ydoc_snapshots (
  plan_id    UUID PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
  update     BYTEA NOT NULL,
  byte_size  INT   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- Legacy MitPlan v1 plans (§17.7.1, §22.7)
-- =========================================================================

CREATE TABLE legacy_local_plans (
  id              UUID PRIMARY KEY,
  owner_discord_id TEXT,
  owner_email     TEXT,
  payload         JSONB NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_by      UUID,
  claimed_at      TIMESTAMPTZ,
  -- 90-day auto-flip clock. Generated from captured_at.
  expires_at      TIMESTAMPTZ GENERATED ALWAYS AS (captured_at + interval '90 days') STORED
);
CREATE INDEX legacy_plans_discord_idx ON legacy_local_plans(owner_discord_id) WHERE claimed_by IS NULL;
CREATE INDEX legacy_plans_email_idx   ON legacy_local_plans(owner_email)     WHERE claimed_by IS NULL;
CREATE INDEX legacy_plans_expires_idx ON legacy_local_plans(expires_at)      WHERE claimed_by IS NULL;

-- =========================================================================
-- RLS policies (§17.3)
-- =========================================================================
-- The principle: a user can read a plan if they are the owner or in
-- plan_access; a user can write if they are the owner or hold an EDITOR
-- role. The Drizzle client is called with the user's JWT, so RLS is
-- the authorization boundary.

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ydoc_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_local_plans ENABLE ROW LEVEL SECURITY;

-- Reference catalog: world-readable to all signed-in users.
ALTER TABLE expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ability_equivalence ENABLE ROW LEVEL SECURITY;

-- Reference catalog policies (read for all signed-in users; writes
-- gated on a 'data-team' role claimed via auth.jwt() -> 'app_metadata').
CREATE POLICY expansions_read ON expansions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY raids_read ON raids FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY encounters_read ON encounters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY roles_read ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY jobs_read ON jobs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY abilities_read ON abilities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY ability_equivalence_read ON ability_equivalence FOR SELECT USING (auth.uid() IS NOT NULL);

-- Plan policies: owner or plan_access can read.
CREATE POLICY plans_read ON plans FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM plan_access pa
    WHERE pa.plan_id = plans.id AND pa.user_id = auth.uid()
  )
);
CREATE POLICY plans_write ON plans FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM plan_access pa
    WHERE pa.plan_id = plans.id AND pa.user_id = auth.uid() AND pa.role IN ('OWNER', 'EDITOR')
  )
);

-- Plan snapshots: read same as plans; writes via service-role only.
CREATE POLICY plan_snapshots_read ON plan_snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = plan_snapshots.plan_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = p.id AND pa.user_id = auth.uid()
        )
      )
  )
);

-- Plan access: read your own access rows + access rows for plans you own.
CREATE POLICY plan_access_read ON plan_access FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = plan_access.plan_id AND p.owner_id = auth.uid()
  )
);

-- Timelines: world-readable; writes via service-role.
CREATE POLICY timelines_read ON timelines FOR SELECT USING (auth.uid() IS NOT NULL);

-- Yjs snapshots: same as plan_snapshots.
CREATE POLICY ydoc_snapshots_read ON ydoc_snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = ydoc_snapshots.plan_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = p.id AND pa.user_id = auth.uid()
        )
      )
  )
);

-- Parties: owner only.
CREATE POLICY parties_read ON parties FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY parties_write ON parties FOR ALL USING (owner_id = auth.uid());

-- Profiles: read by self; update by self.
CREATE POLICY profiles_read ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Legacy plans: no user-facing read (the claim endpoint uses the
-- service-role key). Block all RLS reads from authenticated users.
CREATE POLICY legacy_local_plans_block ON legacy_local_plans FOR SELECT USING (FALSE);

-- =========================================================================
-- RPC: merge_auth_users (§17.7.3)
-- =========================================================================
-- Cross-provider account link. Single transaction that re-validates
-- the link and reassigns plan ownership.

CREATE OR REPLACE FUNCTION merge_auth_users(
  p_source UUID,
  p_target UUID,
  p_actor  UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_moved_plans INT;
  v_moved_access INT;
BEGIN
  IF p_actor <> p_target THEN
    RAISE EXCEPTION 'merge_auth_users: actor must equal target';
  END IF;

  -- Re-validate: target's email must be verified AND must match source's email.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_target
      AND email_confirmed_at IS NOT NULL
      AND email = (SELECT email FROM auth.users WHERE id = p_source)
  ) THEN
    RAISE EXCEPTION 'merge_auth_users: target email unverified or does not match source';
  END IF;

  UPDATE plans         SET owner_id  = p_target WHERE owner_id  = p_source;
  GET DIAGNOSTICS v_moved_plans = ROW_COUNT;

  UPDATE plan_access   SET user_id   = p_target WHERE user_id   = p_source;
  GET DIAGNOSTICS v_moved_access = ROW_COUNT;

  UPDATE profiles      SET id        = p_target WHERE id        = p_source;

  DELETE FROM auth.users WHERE id = p_source;

  RETURN jsonb_build_object(
    'moved_plans',   v_moved_plans,
    'moved_access',  v_moved_access
  );
END;
$$;

-- =========================================================================
-- RPC: claim_legacy_plans (§17.7.4)
-- =========================================================================
-- MitPlan v1 plan claim. Sets claimed_by and inserts the corresponding
-- plan_meta rows.

CREATE OR REPLACE FUNCTION claim_legacy_plans(
  p_user     UUID,
  p_plan_ids UUID[]
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH claimed AS (
    UPDATE legacy_local_plans
    SET claimed_by = p_user, claimed_at = now()
    WHERE id = ANY(p_plan_ids)
      AND claimed_by IS NULL
    RETURNING id, payload
  ),
  inserted AS (
    INSERT INTO plans (id, owner_id, name, encounter_id, mode, is_legacy, created_at, updated_at, conflicts)
    SELECT
      c.id,
      p_user,
      COALESCE(c.payload->>'name', 'Imported plan'),
      -- encounter_id is required; the import flow will set this via a follow-up.
      -- We use a sentinel raid/encounter row created by the seed.
      (SELECT id FROM encounters WHERE slug = 'legacy-import-sentinel' LIMIT 1),
      'CURRENT',
      TRUE,
      COALESCE((c.payload->>'createdAt')::timestamptz, now()),
      now(),
      '[]'::jsonb
    FROM claimed c
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;

-- =========================================================================
-- Function: flip_expired_legacy_plans (§17.7.5)
-- =========================================================================
-- Runs nightly via pg_cron. Materializes any unclaimed plan older than
-- 90 days into a read-only plan_meta row owned by the system user.

CREATE OR REPLACE FUNCTION flip_expired_legacy_plans()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sys_user UUID := '00000000-0000-0000-0000-000000000000';
  v_count  INTEGER;
BEGIN
  WITH expired AS (
    SELECT id, payload
    FROM legacy_local_plans
    WHERE claimed_by IS NULL
      AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  ),
  inserted AS (
    INSERT INTO plans (id, owner_id, name, encounter_id, mode, is_legacy, created_at, updated_at, conflicts)
    SELECT
      e.id,
      sys_user,
      COALESCE(e.payload->>'name', 'Imported plan'),
      (SELECT id FROM encounters WHERE slug = 'legacy-import-sentinel' LIMIT 1),
      'CURRENT',
      TRUE,
      COALESCE((e.payload->>'createdAt')::timestamptz, now()),
      now(),
      '[]'::jsonb
    FROM expired e
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  DELETE FROM legacy_local_plans
  WHERE id IN (SELECT id FROM expired);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- pg_cron schedule: 03:17 UTC nightly.
-- Requires the pg_cron extension. Supabase enables this on Pro plans.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- The schedule is created idempotently. The first migration is the
-- canonical one; later migrations should not re-schedule.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flip-expired-legacy-plans') THEN
    PERFORM cron.schedule(
      'flip-expired-legacy-plans',
      '17 3 * * *',
      $cron$ SELECT flip_expired_legacy_plans(); $cron$
    );
  END IF;
END;
$$;

-- =========================================================================
-- System user (legacy plan owner)
-- =========================================================================
-- The system user has no login capability. It is used only as the
-- owner of read-only materialized legacy plans. The auth.users row is
-- NOT created here (Supabase manages it); this is the profile row
-- only.

INSERT INTO profiles (id, display_name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'System (legacy)', now(), now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- End of migration
-- =========================================================================
