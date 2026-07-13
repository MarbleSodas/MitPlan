// Supabase Edge Function: plans-share
// Path A (ADR-0002 §T-4). Architecture §7.7.5, §17.3.
//
// POST /functions/v1/plans-share
// Body: { planId: uuid, role: 'read'|'edit', expiresInDays: int 1..90 }
//
// Auth: required (must be the plan owner).
// Returns: { token, expiresAt }
//
// Mints an opaque share capability token stored in `share_tokens`.
// The recipient redeems it via plans-share-redeem, which grants a
// normal `plan_access` row (account-grant model). This replaces the
// previous custom-JWT anonymous-link approach, which could not pass
// `realtime.check_plan_access` (it derived the user from
// `claims->>'sub'::UUID` but minted `sub: 'system-share'`).
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
import { z } from "zod";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  planId: z.string().uuid(),
  role: z.enum(["read", "edit"]),
  expiresInDays: z.number().int().min(1).max(90),
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
    return errorResponse(400, "INVALID_BODY", "Body must match { planId, role, expiresInDays 1..90 }", "*");
  }

  // Confirm the caller owns the plan. RLS would let any viewer read,
  // but only owners should be able to mint share tokens.
  const { data: plan, error: planErr } = await ctx.supabase
    .from("plans")
    .select("id, owner_id")
    .eq("id", body.planId)
    .maybeSingle();
  if (planErr) return errorResponse(500, "READ_FAILED", planErr.message, "*");
  if (!plan) return errorResponse(404, "PLAN_NOT_FOUND", "planId not found", "*");
  if (plan.owner_id !== userId) {
    return errorResponse(403, "NOT_OWNER", "Only the plan owner can mint share tokens", "*");
  }

  // Map the public role to the internal plan_access_role enum.
  const internalRole = body.role === "read" ? "VIEWER" : "EDITOR";

  // Opaque capability token. crypto.randomUUID is URL-safe enough for
  // a query-param link; collision probability is negligible.
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + body.expiresInDays * 86_400_000).toISOString();

  const { error: tokErr } = await ctx.supabase.from("share_tokens").insert({
    token,
    plan_id: body.planId,
    role: internalRole,
    created_by: userId,
    expires_at: expiresAt,
  });
  if (tokErr) {
    return errorResponse(500, "TOKEN_FAILED", tokErr.message, "*");
  }

  return json({ token, expiresAt });
};

Deno.serve(withCors(handler));
