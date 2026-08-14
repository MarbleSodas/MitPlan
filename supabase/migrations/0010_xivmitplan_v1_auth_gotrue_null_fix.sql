-- 0010_xivmitplan_v1_auth_gotrue_null_fix.sql
--
-- Workaround for an upstream GoTrue bug where scanning a NULL
-- auth.users.confirmation_token into a string field returns:
--   "sql: Scan error on column index 3, name \"confirmation_token\":
--    converting NULL to string is unsupported"
--
-- Backfill existing NULLs with empty strings and set a default so newly
-- provisioned users never produce NULL values that the running GoTrue
-- image cannot deserialize.

UPDATE auth.users
SET confirmation_token = ''
WHERE confirmation_token IS NULL;
-- Note: a follow-up ALTER TABLE auth.users ALTER COLUMN confirmation_token
-- SET DEFAULT '' would prevent future NULLs, but requires ownership of
-- auth.users (owned by supabase_auth_admin, not the postgres role used by
-- `supabase db push`). The backfill above resolves the active bug; new
-- users provisioned by current GoTrue do not reproduce it.;
