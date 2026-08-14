-- 0009_xivmitplan_v1_core_release_hardening.sql
--
-- Core-release corrections. This migration is forward-only: projects that
-- already applied 0001..0008 receive the same authorization and legacy-import
-- behavior as new projects without rewriting their migration history.

-- Store a prepared Yjs update and a resolved encounter while legacy data waits
-- to be claimed. The Firebase exporter creates ydoc_b64 with the application
-- schema, so a claimed plan opens as a usable document rather than an empty row.
ALTER TABLE legacy_local_plans
  ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES encounters(id),
  ADD COLUMN IF NOT EXISTS ydoc_b64 TEXT;
UPDATE legacy_local_plans
SET encounter_id = COALESCE(
  encounter_id,
  (SELECT id FROM encounters WHERE slug = 'legacy-import-sentinel' LIMIT 1)
)
WHERE encounter_id IS NULL;
-- New Supabase users receive a profile that can participate in legacy matching.
-- Provider IDs are only cached when the primary identity is the corresponding
-- provider; auth.identities remains the authority for linked accounts.
CREATE OR REPLACE FUNCTION public.handle_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, display_name, discord_id, google_id, email, email_verified_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, 'Player'), '@', 1), 'Player'),
    CASE WHEN NEW.raw_app_meta_data ->> 'provider' = 'discord'
      THEN COALESCE(NEW.raw_user_meta_data ->> 'provider_id', NEW.raw_user_meta_data ->> 'sub') END,
    CASE WHEN NEW.raw_app_meta_data ->> 'provider' = 'google'
      THEN COALESCE(NEW.raw_user_meta_data ->> 'provider_id', NEW.raw_user_meta_data ->> 'sub') END,
    lower(NEW.email),
    NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    email_verified_at = EXCLUDED.email_verified_at,
    discord_id = COALESCE(public.profiles.discord_id, EXCLUDED.discord_id),
    google_id = COALESCE(public.profiles.google_id, EXCLUDED.google_id),
    updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS auth_user_profile ON auth.users;
CREATE TRIGGER auth_user_profile
  AFTER INSERT OR UPDATE OF email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_profile();
-- Backfill existing accounts without exposing auth.users to callers.
INSERT INTO profiles (id, display_name, email, email_verified_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(COALESCE(u.email, 'Player'), '@', 1), 'Player'),
  lower(u.email),
  u.email_confirmed_at
FROM auth.users u
WHERE u.id <> '00000000-0000-0000-0000-000000000000'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_verified_at = EXCLUDED.email_verified_at,
  updated_at = now();
-- A client can learn only its own role. The owner role is derived from plans,
-- never from a mutable plan_access record.
CREATE OR REPLACE FUNCTION public.plan_role_for_current_user(p_plan_id UUID)
RETURNS plan_access_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role plan_access_role;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM plans WHERE id = p_plan_id AND owner_id = v_uid) THEN
    RETURN 'OWNER'::plan_access_role;
  END IF;
  SELECT role INTO v_role FROM plan_access
  WHERE plan_id = p_plan_id AND user_id = v_uid;
  RETURN v_role;
END;
$$;
GRANT EXECUTE ON FUNCTION public.plan_role_for_current_user(UUID) TO authenticated;
-- Realtime authorization is installed by the normalized planning migration.
-- Supabase permits policies on realtime.messages but no longer permits custom
-- functions in the locked realtime schema.
-- Collaborator identity and email are owner-only administrative data.
CREATE OR REPLACE FUNCTION public.plan_access_list_for_plan(p_plan_id UUID)
RETURNS TABLE (
  plan_id UUID, user_id UUID, role plan_access_role, via_share_token BOOLEAN,
  granted_at TIMESTAMPTZ, display_name TEXT, email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = p_plan_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'plan_access_list_for_plan: owner access required';
  END IF;
  RETURN QUERY
    SELECT pa.plan_id, pa.user_id, pa.role, pa.via_share_token, pa.granted_at,
      p.display_name, u.email::TEXT
    FROM public.plan_access pa
    LEFT JOIN public.profiles p ON p.id = pa.user_id
    LEFT JOIN auth.users u ON u.id = pa.user_id
    WHERE pa.plan_id = p_plan_id
    ORDER BY pa.granted_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.plan_access_list_for_plan(UUID) TO authenticated;
-- Replace the caller-controlled legacy claim RPC. A claim is possible only
-- when the caller's verified email or cached Discord identity matches the
-- imported owner metadata. Claims persist the exporter-built Yjs document.
DROP FUNCTION IF EXISTS public.claim_legacy_plans(UUID, UUID[]);
CREATE OR REPLACE FUNCTION public.claim_legacy_plans(p_plan_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'claim_legacy_plans: not authenticated'; END IF;
  WITH identity AS (
    SELECT lower(u.email) AS email, p.discord_id
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = v_uid AND u.email_confirmed_at IS NOT NULL
  ), claimed AS (
    UPDATE public.legacy_local_plans l
    SET claimed_by = v_uid, claimed_at = now()
    FROM identity i
    WHERE l.id = ANY(p_plan_ids)
      AND l.claimed_by IS NULL
      AND (
        (l.owner_email IS NOT NULL AND lower(l.owner_email) = i.email)
        OR (l.owner_discord_id IS NOT NULL AND l.owner_discord_id = i.discord_id)
      )
      AND l.ydoc_b64 IS NOT NULL
      AND l.ydoc_b64 <> ''
    RETURNING l.id, l.payload, l.encounter_id, l.ydoc_b64, l.captured_at
  ), inserted AS (
    INSERT INTO public.plans (id, owner_id, name, encounter_id, mode, is_legacy, created_at, updated_at, conflicts)
    SELECT c.id, v_uid, COALESCE(c.payload ->> 'name', 'Imported plan'),
      COALESCE(c.encounter_id, (SELECT id FROM public.encounters WHERE slug = 'legacy-import-sentinel' LIMIT 1)),
      'CURRENT', TRUE, c.captured_at, now(), '[]'::jsonb
    FROM claimed c
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ), snapshots AS (
    INSERT INTO public.ydoc_snapshots (plan_id, update, byte_size, created_at, updated_at)
    SELECT c.id, decode(c.ydoc_b64, 'base64'), octet_length(decode(c.ydoc_b64, 'base64')), now(), now()
    FROM claimed c JOIN inserted i ON i.id = c.id
    RETURNING plan_id
  )
  SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_legacy_plans(UUID[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.legacy_claimable_plan_ids()
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT l.id, COALESCE(l.payload ->> 'name', 'Imported plan')
  FROM public.legacy_local_plans l
  JOIN auth.users u ON u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE l.claimed_by IS NULL
    AND l.ydoc_b64 IS NOT NULL
    AND l.ydoc_b64 <> ''
    AND (
      (l.owner_email IS NOT NULL AND lower(l.owner_email) = lower(u.email))
      OR (l.owner_discord_id IS NOT NULL AND l.owner_discord_id = p.discord_id)
    );
$$;
GRANT EXECUTE ON FUNCTION public.legacy_claimable_plan_ids() TO authenticated;
