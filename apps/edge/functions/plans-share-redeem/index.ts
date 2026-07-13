// Supabase Edge Function: plans-share-redeem
// Path A (ADR-0002 §T-4). Architecture §7.7.5, §17.3.
//
// POST /functions/v1/plans-share-redeem
// Body: { planId: uuid, token: string }
//
// Auth: required (the user redeeming the link).
// Returns: { role: 'VIEWER'|'EDITOR', expiresAt }
//
// Validates the opaque share token from `share_tokens` and grants the
// caller a normal `plan_access` row. After this, the plan is reachable
// through the standard RLS policies and `realtime.check_plan_access`.
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
import { z } from "zod";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  planId: z.string().uuid(),
  token: z.string().min(1),
});
type RequestBody = z.infer<typeof RequestBody>;

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST");

  const ctx = await createSupabaseClient(req);
  const unauth = requireUser(ctx, "*");
  if (unauth) return unauth;
  const userId = ctx.userId!;

  let body: RequestBody;
  try {
    body = RequestBody.parse(await req.json());
  } catch {
    return errorResponse(400, "INVALID_BODY", "Body must match { planId, token }", "*");
  }

  // Read the token with the admin client (the caller is not yet a
  // plan_access grantee, so RLS would hide it).
  const { data: tok, error: tokErr } = await ctx.supabaseAdmin
    .from("share_tokens")
    .select("plan_id, role, expires_at, revoked")
    .eq("token", body.token)
    .maybeSingle();
  if (tokErr) return errorResponse(500, "TOKEN_LOOKUP_FAILED", tokErr.message, "*");
  if (!tok) return errorResponse(404, "TOKEN_NOT_FOUND", "Invalid or unknown share token", "*");
  if (tok.revoked) return errorResponse(410, "TOKEN_REVOKED", "This share link was revoked", "*");
  if (tok.plan_id !== body.planId) {
    return errorResponse(400, "TOKEN_PLAN_MISMATCH", "Token does not match this plan", "*");
  }
  if (tok.expires_at && new Date(tok.expires_at).getTime() < Date.now()) {
    return errorResponse(410, "TOKEN_EXPIRED", "This share link has expired", "*");
  }

  // Grant (idempotent) access to the caller.
  const { error: grantErr } = await ctx.supabaseAdmin.from("plan_access").upsert(
    {
      plan_id: body.planId,
      user_id: userId,
      role: tok.role,
      via_share_token: true,
    },
    { onConflict: "plan_id,user_id" },
  );
  if (grantErr) {
    return errorResponse(500, "GRANT_FAILED", grantErr.message, "*");
  }

  return json({ role: tok.role, expiresAt: tok.expires_at });
};

Deno.serve(withCors(handler));
