-- 0005_xivmitplan_v1_share_tokens.sql
--
-- XIVMitPlan v1.0 — share-by-link capability tokens.
--
-- A share token is an opaque capability that grants VIEWER/EDITOR
-- access to a plan for any *authenticated* user who redeems it
-- (account-grant model). This replaces the previous custom-JWT
-- anonymous-link approach, which could never pass
-- `realtime.check_plan_access` (it derived the user from
-- `claims->>'sub'::UUID`, but the minted token used `sub: 'system-share'`).
--
-- Flow:
--   1. Owner calls plans-share  -> a row is inserted here, token returned.
--   2. Recipient opens /plan/:id?token=XYZ while signed in.
--   3. plans-share-redeem validates the token (exists, unexpired,
--      unrevoked, matches plan) and upserts a `plan_access` row for the
--      caller. From then on the normal RLS + realtime ACL paths apply.

CREATE TABLE share_tokens (
  token      TEXT PRIMARY KEY,
  plan_id    UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  role       plan_access_role NOT NULL,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX share_tokens_plan_idx ON share_tokens(plan_id);

ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Only the plan owner (and the service-role key) can manage tokens.
CREATE POLICY share_tokens_owner ON share_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plans p
      WHERE p.id = share_tokens.plan_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans p
      WHERE p.id = share_tokens.plan_id AND p.owner_id = auth.uid()
    )
  );
