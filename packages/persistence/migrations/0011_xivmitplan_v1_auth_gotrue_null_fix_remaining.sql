-- 0011_xivmitplan_v1_auth_gotrue_null_fix_remaining.sql
--
-- Continuation of 0010. Migration 0010 already cleared NULLs in
-- auth.users.confirmation_token. The same GoTrue scanner bug also fires
-- on these nullable varchar columns:
--   * recovery_token
--   * email_change
--   * email_change_token_new
--
-- Backfilled separately because `supabase db push` records a migration
-- file as applied the first time it succeeds; subsequent edits to the
-- same filename are treated as already-applied.

UPDATE auth.users
SET
  recovery_token         = COALESCE(recovery_token,         ''),
  email_change           = COALESCE(email_change,           ''),
  email_change_token_new = COALESCE(email_change_token_new, '');
