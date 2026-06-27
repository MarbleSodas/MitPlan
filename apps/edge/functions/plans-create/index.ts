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
import { z } from "zod";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  name: z.string().min(1).max(128),
  encounterId: z.string().uuid(),
  partyId: z.string().uuid().optional(),
  mode: z.enum(["REBORN", "EVOLVED", "CURRENT", "ALL"]),
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
    return errorResponse(400, "INVALID_BODY", "Body must match { name, encounterId, mode, partyId? }", "*");
  }

  const planId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert the plan row using the admin client (we deterministically
  // set owner_id from the verified JWT). The admin client bypasses RLS
  // but is safe here because we explicitly assign the caller.
  const { error: planErr } = await ctx.supabaseAdmin.from("plans").insert({
    id: planId,
    owner_id: userId,
    name: body.name,
    encounter_id: body.encounterId,
    party_id: body.partyId ?? null,
    mode: body.mode,
    is_legacy: false,
    conflicts: [],
  });
  if (planErr) {
    if (planErr.code === "23503") {
      return errorResponse(404, "ENCOUNTER_NOT_FOUND", "encounterId does not exist", "*");
    }
    return errorResponse(500, "INSERT_FAILED", planErr.message, "*");
  }

  // Pre-create the ydoc_snapshots row with a single-byte placeholder.
  const placeholder = new Uint8Array([0]);
  const { error: ydocErr } = await ctx.supabaseAdmin.from("ydoc_snapshots").insert({
    plan_id: planId,
    update: placeholder,
    byte_size: placeholder.byteLength,
  });
  if (ydocErr) {
    return errorResponse(
      500,
      "YDOC_INIT_FAILED",
      `plan created but ydoc init failed: ${ydocErr.message}`,
      "*",
    );
  }

  return json({ planId, createdAt: now }, { status: 201 });
};

Deno.serve(withCors(handler));