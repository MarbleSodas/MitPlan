// Supabase Edge Function: plans-duplicate
// Path A (ADR-0002 §T-4). Architecture §10.3, §17.3.
//
// POST /functions/v1/plans-duplicate
// Body: { planId: uuid, name?: string }
//
// Auth: required. Caller must be the plan owner or have an EDITOR role
// in plan_access. The duplicate always assigns `owner_id = auth.uid()`
// (the duplicator becomes the owner of the copy), even when the source
// plan was originally owned by another user.
//
// The duplicate copies:
//   1. Plan metadata (encounter_id, party_id, mode, conflicts)
//   2. The current Yjs doc state (ydoc_snapshots)
//
// The ydoc_snapshot copy uses the SECURITY DEFINER upsert_ydoc_snapshot
// RPC so the BYTEA arrives as a canonical hex literal rather than a
// JSON-serialized Uint8Array.
// Returns: { planId, createdAt }
import { z } from 'zod';
import { withCors, errorResponse, json } from '../../_shared/cors.ts';
import { base64ToBytes, bytesToByteaHex } from '../../_shared/bytes.ts';
import {
  createSupabaseClient,
  requireUser,
  type RequestContext,
} from '../../_shared/supabase-client.ts';

const RequestBody = z.object({
  planId: z.string().uuid(),
  name: z.string().min(1).max(128).optional(),
});
type RequestBody = z.infer<typeof RequestBody>;
type SourcePlanRow = {
  id: string;
  owner_id: string;
  name: string;
  encounter_id: string;
  party_id: string | null;
  mode: string;
  conflicts: unknown;
};
type PlanAccessRoleRow = { role: 'OWNER' | 'EDITOR' | 'VIEWER' };
type YDocSnapshotRow = { update: unknown; byte_size: number };

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
    return errorResponse(400, 'INVALID_BODY', 'Body must match { planId, name? }', '*');
  }

  // Read the source plan (user-scoped client respects RLS so the caller
  // must have at least READ access).
  const { data: rawSrc, error: srcErr } = await ctx.supabase
    .from('plans')
    .select('id, owner_id, name, encounter_id, party_id, mode, conflicts')
    .eq('id', body.planId)
    .maybeSingle();
  const src = rawSrc as unknown as SourcePlanRow | null;
  if (srcErr) return errorResponse(500, 'READ_FAILED', srcErr.message, '*');
  if (!src) return errorResponse(404, 'PLAN_NOT_FOUND', 'Source plan not found', '*');

  // ACL: owner or editor (not viewer) may duplicate.
  const isOwner = src.owner_id === userId;
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
        'Owner or editor access required to duplicate this plan',
        '*',
      );
    }
  }

  const newPlanId = crypto.randomUUID();
  const now = new Date().toISOString();
  const newName = body.name ?? `${src.name} (Copy)`;

  // Insert the new plan row (admin client bypasses RLS insert restriction).
  const { error: insErr } = await ctx.supabaseAdmin.from('plans').insert({
    id: newPlanId,
    owner_id: userId,
    name: newName,
    encounter_id: src.encounter_id,
    party_id: src.party_id ?? null,
    mode: src.mode,
    is_legacy: false,
    conflicts: src.conflicts,
  });
  if (insErr) {
    if (insErr.code === '23503') {
      return errorResponse(400, 'ENCOUNTER_NOT_FOUND', 'Source plan encounter does not exist', '*');
    }
    return errorResponse(500, 'INSERT_FAILED', insErr.message, '*');
  }

  // Copy the ydoc_snapshot from the source plan to the new plan.
  // Use the SECURITY DEFINER upsert_ydoc_snapshot RPC so BYTEA arrives
  // as a canonical hex literal rather than a JSON-serialized object.
  const { data: rawYdoc, error: ydocReadErr } = await ctx.supabase
    .from('ydoc_snapshots')
    .select('update, byte_size')
    .eq('plan_id', body.planId)
    .maybeSingle();
  const ydoc = rawYdoc as unknown as YDocSnapshotRow | null;

  if (ydocReadErr) {
    await rollbackPlan(ctx.supabaseAdmin, newPlanId);
    return errorResponse(500, 'SNAPSHOT_READ_FAILED', ydocReadErr.message, '*');
  }

  if (ydoc) {
    const updateField = ydoc.update as unknown;
    let hexUpdate: string;

    try {
      if (updateField instanceof Uint8Array) {
        hexUpdate = bytesToByteaHex(updateField);
      } else if (typeof updateField === 'string' && updateField.startsWith('\\x')) {
        hexUpdate = updateField;
      } else if (typeof updateField === 'string') {
        // Base64-encoded string from PostgREST.
        hexUpdate = bytesToByteaHex(base64ToBytes(updateField));
      } else {
        throw new Error(`Unexpected ydoc update type: ${typeof updateField}`);
      }
    } catch (cause) {
      await rollbackPlan(ctx.supabaseAdmin, newPlanId);
      return errorResponse(
        500,
        'YDOC_SHAPE',
        cause instanceof Error ? cause.message : 'Invalid ydoc update',
        '*',
      );
    }

    const { error: ydocErr } = await ctx.supabase.rpc('upsert_ydoc_snapshot', {
      p_plan_id: newPlanId,
      p_update: hexUpdate,
      p_byte_size: ydoc.byte_size,
    });
    if (ydocErr) {
      await rollbackPlan(ctx.supabaseAdmin, newPlanId);
      return errorResponse(500, 'SNAPSHOT_COPY_FAILED', ydocErr.message, '*');
    }
  }

  return json({ planId: newPlanId, createdAt: now }, { status: 201 });
};

const rollbackPlan = async (
  admin: RequestContext['supabaseAdmin'],
  planId: string,
): Promise<void> => {
  const { error } = await admin.from('plans').delete().eq('id', planId);
  if (error) {
    console.error(`plans-duplicate: rollback failed for ${planId}: ${error.message}`);
  }
};

Deno.serve(withCors(handler));
