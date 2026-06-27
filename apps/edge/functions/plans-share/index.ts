// Supabase Edge Function: plans-share
// Path A (ADR-0002 §T-4). Architecture §7.7.5, §17.3.
//
// POST /functions/v1/plans-share
// Body: { planId: uuid, role: 'read'|'edit', expiresInDays: int 1..90 }
//
// Auth: required (must be the plan owner).
// Returns: { token, expiresAt }
//
// The share token is an HS256 JWT signed with `JWT_SIGNING_KEY`.
// Claims include a `plan_access` field that the realtime authorization
// function (`realtime.check_plan_access` in 0002) accepts for anonymous
// channel access.
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//   JWT_SIGNING_KEY (custom secret — required, HS256)
import { z } from "zod";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  planId: z.string().uuid(),
  role: z.enum(["read", "edit"]),
  expiresInDays: z.number().int().min(1).max(90),
});
type RequestBody = z.infer<typeof RequestBody>;

// --- JWT (HS256) helpers. Web Crypto only; no Node `crypto`. --------------

const base64UrlEncode = (bytes: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlEncodeString = (s: string): string =>
  base64UrlEncode(new TextEncoder().encode(s));

const signHS256 = async (key: string, data: string): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(sig));
};

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

  const signingKey = Deno.env.get("JWT_SIGNING_KEY");
  if (!signingKey) return errorResponse(500, "MISSING_SECRET", "JWT_SIGNING_KEY not configured", "*");

  // Map the public role to the internal plan_access.role enum.
  const internalRole = body.role === "read" ? "VIEWER" : "EDITOR";

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

  // Mint the JWT.
  const now = Math.floor(Date.now() / 1000);
  const exp = now + body.expiresInDays * 86_400;
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "system-share",
    plan_id: body.planId,
    plan_access: body.role,
    iat: now,
    exp,
  };
  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await signHS256(signingKey, `${headerB64}.${payloadB64}`);
  const token = `${headerB64}.${payloadB64}.${signature}`;

  // Audit row (best-effort).
  const { error: accessErr } = await ctx.supabaseAdmin.from("plan_access").upsert(
    {
      plan_id: body.planId,
      user_id: userId,
      role: internalRole,
      via_share_token: true,
    },
    { onConflict: "plan_id,user_id" },
  );
  if (accessErr) {
    console.error(`plan_access upsert failed: ${accessErr.message}`);
  }

  const expiresAt = new Date(exp * 1000).toISOString();
  return json({ token, expiresAt });
};

Deno.serve(withCors(handler));