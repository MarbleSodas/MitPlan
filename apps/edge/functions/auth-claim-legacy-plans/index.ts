// Supabase Edge Function: auth-claim-legacy-plans
// Path A (ADR-0002 §T-4). Architecture §17.7.4, §22.7.
//
// POST /functions/v1/auth-claim-legacy-plans
// Body: { planIds: uuid[] }
//
// Auth: required.
// Returns: { claimed: number }
//
// Bridges MitPlan v1 (Google Firebase) into XIVMitPlan v1.0. Delegates
// to the Postgres `claim_legacy_plans(plan_ids uuid[])` function
// (defined in migration 0001) which moves plan ownership to the caller
// in a single transaction.
import { z } from "zod";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  planIds: z.array(z.string().uuid()).min(1).max(500),
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
    return errorResponse(400, "INVALID_BODY", "Body must be { planIds: uuid[1..500] }", "*");
  }

  const { data, error } = await ctx.supabase.rpc("claim_legacy_plans", {
    plan_ids: body.planIds,
  });

  if (error) {
    if (error.code === "42501") {
      return errorResponse(403, "FORBIDDEN", "Caller is not the legacy owner of one or more plans", "*");
    }
    return errorResponse(500, "CLAIM_FAILED", error.message, "*");
  }

  const claimed = typeof data === "number" ? data : Number(data ?? 0);
  return json({ claimed });
};

Deno.serve(withCors(handler));