-- 0007_xivmitplan_v1_rls_recursion_fix.sql
--
-- Fixes an infinite RLS recursion between `plans` and `plan_access`:
--
--   plans_read   → EXISTS (SELECT 1 FROM plan_access ...)   (references plan_access)
--   plan_access_read → EXISTS (SELECT 1 FROM plans ...)      (references plans)
--
-- Evaluating either policy re-enters the other, producing
-- "infinite recursion detected in policy for relation plan_access"
-- (seen at runtime via rpc('plans_list')).
--
-- Fix:
--   1. plan_access_read now only checks `user_id = auth.uid()`. A user
--      can always read their own access rows. Plan ownership is no
--      longer checked here, which breaks the cycle (plan_access_read
--      no longer references `plans`). Plan read/write access for
--      collaborators is still granted through plans_read / plans_write,
--      which query plan_access (a non-recursive direction now).
--   2. plan_access_list_for_plan becomes SECURITY DEFINER so the
--      share-link manager UI can list *all* access rows for a plan it
--      owns (the now-restrictive plan_access_read would otherwise hide
--      other members' rows). The function keeps its own auth gate via
--      auth.uid(), so only authorized callers receive rows.

DROP POLICY IF EXISTS plan_access_read ON plan_access;
CREATE POLICY plan_access_read ON plan_access FOR SELECT USING (
  user_id = auth.uid()
);
ALTER FUNCTION plan_access_list_for_plan(UUID) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION plan_access_list_for_plan(UUID) TO authenticated;
