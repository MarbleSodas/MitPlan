// Supabase Edge Function: plans-delete
// Path A (ADR-0002 §T-4). Architecture §10.3, §17.3.
//
// POST /functions/v1/plans-delete
// Body: { planId: uuid }
//
// Auth: required. Caller MUST be the plan owner. Editors and viewers
// cannot delete plans. The CASCADE rules on the plans table
// automatically remove associated ydoc_snapshots, plan_snapshots,
// plan_access, and share_tokens rows.
// Returns: { deleted: true }
import { z } from 'zod';
import { withCors, errorResponse, json } from '../../_shared/cors.ts';
import { createSupabaseClient, requireUser } from '../../_shared/supabase-client.ts';

const RequestBody = z.object({
  planId: z.string().uuid(),
});
type RequestBody = z.infer<typeof RequestBody>;
type PlanOwnerRow = { id: string; owner_id: string };

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Use POST');

  const ctx = await createSupabaseClient(req);
  const unauth = requireUser(ctx, '*');
  if (unauth) return unauth;
  const userId = ctx.userId!;

  let body: RequestBody;
  try {
    body = RequestBody.parse(await req.json());
  } catch {
    return errorResponse(400, 'INVALID_BODY', 'Body must match { planId }', '*');
  }

  // Owner-only check.
  const { data: rawPlan, error: planErr } = await ctx.supabase
    .from('plans')
    .select('id, owner_id')
    .eq('id', body.planId)
    .maybeSingle();
  const plan = rawPlan as unknown as PlanOwnerRow | null;
  if (planErr) return errorResponse(500, 'READ_FAILED', planErr.message, '*');
  if (!plan) return errorResponse(404, 'PLAN_NOT_FOUND', 'Plan not found', '*');
  if (plan.owner_id !== userId) {
    return errorResponse(403, 'NOT_OWNER', 'Only the plan owner can delete this plan', '*');
  }

  const { error: delErr } = await ctx.supabase.from('plans').delete().eq('id', body.planId);
  if (delErr) return errorResponse(500, 'DELETE_FAILED', delErr.message, '*');

  return json({ deleted: true });
};

Deno.serve(withCors(handler));
