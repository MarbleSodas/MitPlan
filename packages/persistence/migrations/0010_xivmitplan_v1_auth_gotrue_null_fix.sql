-- 0010_xivmitplan_v1_auth_gotrue_null_fix.sql
--
-- Workaround for an upstream GoTrue bug where scanning a NULL token or
-- email-change column into a string field returns:
--   "sql: Scan error on column index N, name \"<col>\":
--    converting NULL to string is unsupported"
--
-- Backfill the known-affected nullable varchar columns so the running
-- GoTrue image can deserialize every auth.users row. Confirmed-affected
-- columns at the time of writing:
--   * confirmation_token
--   * recovery_token
--   * email_change
--   * email_change_token_new
--
-- Note: ALTER TABLE ... SET DEFAULT '' would prevent future NULLs, but
-- requires ownership of auth.users (owned by supabase_auth_admin, not the
-- postgres role used by `supabase db push`). The backfill resolves the
-- active bug; new users provisioned by current GoTrue do not reproduce
-- it once their confirmation flow completes.

UPDATE auth.users
SET
  confirmation_token     = COALESCE(confirmation_token,     ''),
  recovery_token         = COALESCE(recovery_token,         ''),
  email_change           = COALESCE(email_change,           ''),
  email_change_token_new = COALESCE(email_change_token_new, '');

