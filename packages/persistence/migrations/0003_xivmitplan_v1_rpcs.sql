-- 0003_xivmitplan_v1_rpcs.sql
--
-- XIVMitPlan v1.0 — Path A migration, Phase 4A.
-- Source: docs/adr/0002-supabase-only-backend.md, plan
-- /Users/eugene/.claude/plans/fizzy-growing-falcon.md §Phase 4A.
--
-- This migration adds the 8 PostgREST RPCs that replace the 13 tRPC
-- procedures + 13 REST routes previously hosted by apps/server (which
-- is being deleted in this phase). The web app calls these via
-- `supabase.rpc(name, args)` from the new Zod-typed wrapper at
-- apps/web/src/lib/supabase-rpc.ts.
--
-- Conventions:
--   - All 8 functions are SECURITY INVOKER so RLS applies. The web
--     app sends the user's JWT via the Authorization header; Postgres
--     enforces the same policies a direct SELECT would.
--   - All 8 functions are STABLE — they are read-only with respect to
--     the caller's permissions.
--   - No new tables are introduced. All reads come from the 14 tables
--     in 0001_xivmitplan_v1_initial.sql.
--   - Reference-catalog reads (encounters_list, encounters_by_id,
--     abilities_list, timelines_by_encounter) just SELECT from the
--     appropriate tables; the existing RLS policies from 0001
--     (`<table>_read` USING (auth.uid() IS NOT NULL)) gate them.
--   - auth_me joins profiles to auth.users via auth.uid().
--   - plans_list and plans_by_id rely on the existing plans_read RLS
--     policy from 0001 (owner OR plan_access member).
--   - plan_access_list_for_plan returns the collaborator list for a
--     plan (share-link path). The realtime ACL gate
--     realtime.check_plan_access() in 0002 reads the same table with
--     the same semantics; this RPC exposes the same view to the web
--     app for the share-link manager UI.
--
-- INSERT/UPDATE/DELETE RPCs are deliberately NOT in this migration.
-- Non-CRUD logic (timeline ingests, plan create/snapshot/share,
-- legacy claim) lives in Edge Functions under apps/edge/ (Phase 4B).
--
-- Apply with:
--   pnpm --filter @xivmitplan/persistence db:migrate
-- or directly:
--   supabase db push

-- =========================================================================
-- 1. encounters_list
-- =========================================================================
-- Replaces trpc.encounters.list and GET /v1/encounters.
--
-- Returns the encounter catalog, optionally filtered by expansion_slug
-- or raid_slug. RLS enforces auth (auth.uid() IS NOT NULL) via the
-- existing encounters_read policy from 0001.
--
-- The output columns mirror the 0001 encounters table. Two extra
-- columns are joined for caller convenience:
--   - raid_slug      — the parent raid's slug
--   - expansion_slug — the grandparent expansion's slug
-- so the web app can render hierarchical nav without a follow-up RPC.

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
  expansion_slug     TEXT
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
      x.slug        AS expansion_slug
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
  'List encounters, optionally filtered by expansion_slug or raid_slug. RLS enforces auth via encounters_read (0001). Replaces trpc.encounters.list and GET /v1/encounters (ADR-0002 §T-4).';

-- =========================================================================
-- 2. encounters_by_id
-- =========================================================================
-- Replaces trpc.encounters.byId and GET /v1/encounters/:id.
--
-- Single-row lookup. Returns zero rows if the encounter doesn't exist
-- or RLS hides it — the web app treats both as "not found."

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
  expansion_slug     TEXT
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
      x.slug        AS expansion_slug
    FROM encounters e
    JOIN raids      r ON r.id = e.raid_id
    JOIN expansions x ON x.id = r.expansion_id
    WHERE e.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION encounters_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION encounters_by_id(UUID) TO anon;

COMMENT ON FUNCTION encounters_by_id(UUID) IS
  'Single encounter lookup by id. RLS enforces auth via encounters_read (0001). Replaces trpc.encounters.byId and GET /v1/encounters/:id (ADR-0002 §T-4).';

-- =========================================================================
-- 3. abilities_list
-- =========================================================================
-- Replaces GET /v1/abilities.
--
-- Returns the ability catalog, optionally filtered by job_id or mode.
-- The encounter_id parameter is accepted for API compatibility with
-- the original REST surface but currently does not narrow the result
-- set (no encounter → jobs join in the schema today; the parameter is
-- preserved so the v1 contract is identical).
--
-- RLS enforces auth via the existing abilities_read policy from 0001.

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
      a.effective_from,
      a.effective_to,
      a.created_at,
      a.updated_at
    FROM abilities a
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
  'List abilities, optionally filtered by job_id or mode. The encounter_id parameter is accepted for compatibility but is a no-op (no encounter->jobs join exists in v1 schema). RLS enforces auth via abilities_read (0001). Replaces GET /v1/abilities (ADR-0002 §T-4).';

-- =========================================================================
-- 4. auth_me
-- =========================================================================
-- Replaces trpc.auth.me and GET /v1/auth/me.
--
-- Returns the calling user's id, email (from auth.users), and display
-- name (from profiles). The display_name falls back to the email's
-- local part when no profile row exists yet (first login).
--
-- RLS does not apply to auth.users (Supabase-managed). Profiles RLS
-- from 0001 (`profiles_read USING (id = auth.uid())`) gates the
-- profile lookup.

CREATE OR REPLACE FUNCTION auth_me()
RETURNS TABLE (
  user_id      UUID,
  email        TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      u.id                  AS user_id,
      u.email::TEXT         AS email,
      COALESCE(
        p.display_name,
        split_part(u.email, '@', 1),
        'Player'
      )                     AS display_name
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION auth_me() TO authenticated;

COMMENT ON FUNCTION auth_me() IS
  'Returns the calling user''s id, email, and display_name. Joins profiles to auth.users via auth.uid(). Replaces trpc.auth.me and GET /v1/auth/me (ADR-0002 §T-4).';

-- =========================================================================
-- 5. plans_list
-- =========================================================================
-- Replaces trpc.plans.list.
--
-- Returns up to `limit` plans owned by or shared with the calling
-- user. RLS via the existing plans_read policy from 0001 (owner OR
-- plan_access member) handles authorization; the WHERE here is a
-- performance optimization to avoid scanning plans the caller
-- cannot see.
--
-- Ordered by updated_at DESC so the most-recently-edited plans
-- appear first in the dashboard.

CREATE OR REPLACE FUNCTION plans_list(
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  id            UUID,
  owner_id      UUID,
  name          TEXT,
  encounter_id  UUID,
  party_id      UUID,
  mode          ability_mode,
  is_legacy     BOOLEAN,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  conflicts     JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id,
      p.owner_id,
      p.name,
      p.encounter_id,
      p.party_id,
      p.mode,
      p.is_legacy,
      p.created_at,
      p.updated_at,
      p.conflicts
    FROM plans p
    WHERE p.owner_id = auth.uid()
       OR EXISTS (
         SELECT 1 FROM plan_access pa
         WHERE pa.plan_id = p.id AND pa.user_id = auth.uid()
       )
    ORDER BY p.updated_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION plans_list(INT) TO authenticated;

COMMENT ON FUNCTION plans_list(INT) IS
  'List plans owned by or shared with the calling user, newest first. RLS enforces access via plans_read (0001). Replaces trpc.plans.list (ADR-0002 §T-4).';

-- =========================================================================
-- 6. plans_by_id
-- =========================================================================
-- Used by the share-link path (and any single-plan fetch).
--
-- Returns a single plan by id. RLS via plans_read (0001) handles
-- access — owners and plan_access members can read. The realtime
-- authorization gate realtime.check_plan_access() (0002) enforces
-- the same rules on the broadcast path.

CREATE OR REPLACE FUNCTION plans_by_id(
  p_id UUID
) RETURNS TABLE (
  id            UUID,
  owner_id      UUID,
  name          TEXT,
  encounter_id  UUID,
  party_id      UUID,
  mode          ability_mode,
  is_legacy     BOOLEAN,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  conflicts     JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id,
      p.owner_id,
      p.name,
      p.encounter_id,
      p.party_id,
      p.mode,
      p.is_legacy,
      p.created_at,
      p.updated_at,
      p.conflicts
    FROM plans p
    WHERE p.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION plans_by_id(UUID) TO authenticated;

COMMENT ON FUNCTION plans_by_id(UUID) IS
  'Single plan lookup. RLS enforces access via plans_read (0001). Used by share-link path and single-plan view. Replaces the share-link path previously served by GET /v1/plans/:id (ADR-0002 §T-4).';

-- =========================================================================
-- 7. timelines_by_encounter
-- =========================================================================
-- Replaces trpc.timelines.byEncounter.
--
-- Returns all timeline rows for an encounter, ordered by patch
-- version (descending) then source. RLS via the existing
-- timelines_read policy (auth.uid() IS NOT NULL) handles access.
--
-- Multiple rows per encounter are expected (one per
-- (version, source) tuple per the UNIQUE constraint in 0001).
-- The web app picks the best row client-side based on the
-- requested patch and mode.

CREATE OR REPLACE FUNCTION timelines_by_encounter(
  p_encounter_id UUID
) RETURNS TABLE (
  id                   UUID,
  encounter_id         UUID,
  version              TEXT,
  content_hash         TEXT,
  source               timeline_source,
  mode                 ability_mode,
  events               JSONB,
  branches             JSONB,
  joins                JSONB,
  merged_from_sources  JSONB,
  per_event_confidence JSONB,
  byte_size            INT,
  created_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      t.id,
      t.encounter_id,
      t.version,
      t.content_hash,
      t.source,
      t.mode,
      t.events,
      t.branches,
      t.joins,
      t.merged_from_sources,
      t.per_event_confidence,
      t.byte_size,
      t.created_at,
      t.updated_at
    FROM timelines t
    WHERE t.encounter_id = p_encounter_id
    ORDER BY t.version DESC, t.source ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION timelines_by_encounter(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION timelines_by_encounter(UUID) TO anon;

COMMENT ON FUNCTION timelines_by_encounter(UUID) IS
  'List timelines for an encounter, newest version first. RLS enforces auth via timelines_read (0001). Replaces trpc.timelines.byEncounter (ADR-0002 §T-4).';

-- =========================================================================
-- 8. plan_access_list_for_plan
-- =========================================================================
-- Returns the share-link / collaborator list for a plan. Used by the
-- share-link manager UI (who has access, what role, granted when,
-- via_share_token).
--
-- Access rule: the caller must be the plan owner OR a row in
-- plan_access for the same plan must reference the caller. This
-- mirrors the realtime ACL gate realtime.check_plan_access() in
-- 0002 (which reads the same table with the same semantics for the
-- broadcast path) and the plan_access_read RLS policy from 0001.
--
-- The function is SECURITY INVOKER so it inherits RLS on plans and
-- plan_access from the calling JWT.

CREATE OR REPLACE FUNCTION plan_access_list_for_plan(
  p_plan_id UUID
) RETURNS TABLE (
  plan_id         UUID,
  user_id         UUID,
  role            plan_access_role,
  via_share_token BOOLEAN,
  granted_at      TIMESTAMPTZ,
  display_name    TEXT,
  email           TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  -- Gate: caller must own the plan or have a plan_access row for it.
  IF NOT EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = p_plan_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM plan_access pa
          WHERE pa.plan_id = p_plan_id
            AND pa.user_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'plan_access_list_for_plan: forbidden';
  END IF;

  RETURN QUERY
    SELECT
      pa.plan_id,
      pa.user_id,
      pa.role,
      pa.via_share_token,
      pa.granted_at,
      p.display_name,
      u.email::TEXT AS email
    FROM plan_access pa
    LEFT JOIN profiles  p ON p.id = pa.user_id
    LEFT JOIN auth.users u ON u.id = pa.user_id
    WHERE pa.plan_id = p_plan_id
    ORDER BY pa.granted_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION plan_access_list_for_plan(UUID) TO authenticated;

COMMENT ON FUNCTION plan_access_list_for_plan(UUID) IS
  'List collaborators (and their roles) for a plan, with display_name + email. Caller must be the plan owner or a plan_access member. Mirrors realtime.check_plan_access (0002) for the share-link manager UI (ADR-0002 §T-4).';

-- =========================================================================
-- End of migration
-- =========================================================================
-- Applied to staging + prod via:
--   supabase db push
-- or
--   pnpm --filter @xivmitplan/persistence db:migrate
--
-- After this migration runs, the web app calls these via the new
-- Zod-typed wrapper at apps/web/src/lib/supabase-rpc.ts (Phase 4C).
-- INSERT/UPDATE flows (plan create, plan snapshot, plan share, three
-- timeline ingests, legacy claim) ship as Edge Functions under
-- apps/edge/ in Phase 4B and are NOT in this migration.