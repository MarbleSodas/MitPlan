// Supabase Edge Function: plans-create
// Path A (ADR-0002 §T-4). Architecture §10.3, §17.3.
//
// POST /functions/v1/plans-create
// Body: { name: string, encounterId: uuid, partyId?: uuid, mode: 'REBORN'|'EVOLVED'|'CURRENT'|'ALL' }
//
// Auth: required. The caller becomes the plan owner (`owner_id = auth.uid()`).
// Returns: { planId, createdAt }
//
// Pre-creates a `ydoc_snapshots` row with a single-byte placeholder
// (`\x00`). Without this row, y-supabase's first UPDATE is a silent
// no-op until someone explicitly INSERTs the row — and the Yjs doc
// would appear empty across reconnects. See architecture §14.6.3.
import { z } from 'zod';
import { withCors, errorResponse, json } from '../../_shared/cors.ts';
import { createSupabaseClient, requireUser } from '../../_shared/supabase-client.ts';

const RequestBody = z.object({
  name: z.string().min(1).max(128),
  encounterId: z.string().uuid(),
  partyId: z.string().uuid().optional(),
  mode: z.enum(['REBORN', 'EVOLVED', 'CURRENT', 'ALL']),
});
type RequestBody = z.infer<typeof RequestBody>;

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
    return errorResponse(
      400,
      'INVALID_BODY',
      'Body must match { name, encounterId, mode, partyId? }',
      '*',
    );
  }

  const planId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Select the canonical timeline for this encounter deterministically.
  let sourceTimelineId: string | null = null;
  let sourceVersion: string | null = null;
  let sourceHash: string | null = null;
  try {
    const { data: timeline, error: tlErr } = await ctx.supabaseAdmin.rpc(
      'select_canonical_timeline_for_encounter',
      // ALL is a catalog view rather than a canonical timeline variant;
      // pin it to the current encounter timeline for provenance.
      { p_encounter_id: body.encounterId, p_mode: body.mode === 'ALL' ? 'CURRENT' : body.mode },
    );
    if (!tlErr && timeline && timeline.length > 0) {
      sourceTimelineId = timeline[0].id;
      sourceVersion = timeline[0].version;
      sourceHash = timeline[0].content_hash;
    }
  } catch {
    // Non-fatal: plan creation proceeds without provenance.
  }

  // Insert the plan row using the admin client (we deterministically
  // set owner_id from the verified JWT). The admin client bypasses RLS
  // but is safe here because we explicitly assign the caller.
  const { error: planErr } = await ctx.supabaseAdmin.from('plans').insert({
    id: planId,
    owner_id: userId,
    name: body.name,
    encounter_id: body.encounterId,
    party_id: body.partyId ?? null,
    mode: body.mode,
    is_legacy: false,
    conflicts: [],
    source_timeline_id: sourceTimelineId,
    source_timeline_version: sourceVersion,
    source_timeline_hash: sourceHash,
  });
  if (planErr) {
    if (planErr.code === '23503') {
      return errorResponse(404, 'ENCOUNTER_NOT_FOUND', 'encounterId does not exist', '*');
    }
    return errorResponse(500, 'INSERT_FAILED', planErr.message, '*');
  }

  // Pre-create the ydoc_snapshots row with a single-byte placeholder
  // (`\x00`). Use the same SECURITY DEFINER RPC the web client uses
  // (upsert_ydoc_snapshot) so the BYTEA arrives as a canonical hex
  // literal rather than a JSON-serialized Uint8Array (`{"0":0}`) or a
  // literal base64 string — both of which would corrupt the snapshot.
  // The caller is the plan owner, so the RPC's internal ACL check passes.
  const { error: ydocErr } = await ctx.supabase.rpc('upsert_ydoc_snapshot', {
    p_plan_id: planId,
    p_update: '\\x00',
    p_byte_size: 1,
  });
  if (ydocErr) {
    try {
      const { error: rollbackErr } = await ctx.supabaseAdmin
        .from('plans')
        .delete()
        .eq('id', planId);
      if (rollbackErr) {
        console.error(`plans-create: rollback failed for ${planId}: ${rollbackErr.message}`);
      }
    } catch (rollbackCause) {
      console.error(`plans-create: rollback failed for ${planId}`, rollbackCause);
    }
    return errorResponse(
      500,
      'YDOC_INIT_FAILED',
      `plan created but ydoc init failed: ${ydocErr.message}`,
      '*',
    );
  }

  return json({ planId, createdAt: now }, { status: 201 });
};

Deno.serve(withCors(handler));
