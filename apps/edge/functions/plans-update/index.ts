// Supabase Edge Function: plans-update
// Path A (ADR-0002 §T-4). Architecture §10.3, §17.3.
//
// POST /functions/v1/plans-update
// Body: { planId: uuid, name: string }
//
// Auth: required. Caller must be the plan owner or have an EDITOR role
// in plan_access. VIEWERs are not allowed to mutate plan metadata.
// Returns: { planId }
//
// The explicit ACL check below provides the endpoint-specific role
// semantics, while the user-scoped UPDATE retains the plans_write RLS
// policy as a second authorization boundary.
import { z } from 'zod';
import { withCors, errorResponse, json } from '../../_shared/cors.ts';
import { createSupabaseClient, requireUser } from '../../_shared/supabase-client.ts';

const RequestBody = z.object({
  planId: z.string().uuid(),
  name: z.string().min(1).max(128),
});
type RequestBody = z.infer<typeof RequestBody>;
type PlanOwnerRow = { id: string; owner_id: string };
type PlanAccessRoleRow = { role: 'OWNER' | 'EDITOR' | 'VIEWER' };

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
    return errorResponse(400, 'INVALID_BODY', 'Body must match { planId, name }', '*');
  }

  // Verify the caller has write access (owner or editor).
  const { data: rawPlan, error: planErr } = await ctx.supabase
    .from('plans')
    .select('id, owner_id')
    .eq('id', body.planId)
    .maybeSingle();
  const plan = rawPlan as unknown as PlanOwnerRow | null;
  if (planErr) return errorResponse(500, 'READ_FAILED', planErr.message, '*');
  if (!plan) return errorResponse(404, 'PLAN_NOT_FOUND', 'Plan not found', '*');

  const isOwner = plan.owner_id === userId;
  if (!isOwner) {
    const { data: rawAccess } = await ctx.supabase
      .from('plan_access')
      .select('role')
      .eq('plan_id', body.planId)
      .eq('user_id', userId)
      .maybeSingle();
    const access = rawAccess as unknown as PlanAccessRoleRow | null;
    if (!access || (access.role !== 'EDITOR' && access.role !== 'OWNER')) {
      return errorResponse(
        403,
        'FORBIDDEN',
        'Owner or editor access required to update this plan',
        '*',
      );
    }
  }

  const { error: updErr } = await ctx.supabase
    .from('plans')
    .update({ name: body.name, updated_at: new Date().toISOString() })
    .eq('id', body.planId);
  if (updErr) return errorResponse(500, 'UPDATE_FAILED', updErr.message, '*');

  return json({ planId: body.planId });
};

Deno.serve(withCors(handler));
