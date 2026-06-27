// Supabase Edge Function: plans-snapshot
// Path A (ADR-0002 §T-4). Architecture §14.6, §17.3.
//
// POST /functions/v1/plans-snapshot
// Body: { planId: uuid, reason: 'IDLE'|'USER_SAVE'|'ASSIGNMENT_DELETE'|'REBUILD' }
//
// Auth: required (must be the plan owner or have EDITOR access — RLS enforces).
// Returns: { snapshotId, byteSize, createdAt }
//
// Reads the current `ydoc_snapshots.update` (the latest Yjs state,
// debounce-persisted by y-supabase), base64-encodes it, and inserts a
// row into the versioned `plan_snapshots` table.
import { z } from "zod";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  planId: z.string().uuid(),
  reason: z.enum(["IDLE", "USER_SAVE", "ASSIGNMENT_DELETE", "REBUILD"]),
});
type RequestBody = z.infer<typeof RequestBody>;

/** Bytes → base64 (btoa on the joined binary string). */
const bytesToBase64 = (bytes: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
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
    return errorResponse(400, "INVALID_BODY", "Body must be { planId, reason }", "*");
  }

  // RLS gates this SELECT against ydoc_snapshots — the call fails
  // unless the caller is the owner or has plan_access.
  const { data: ydoc, error: readErr } = await ctx.supabase
    .from("ydoc_snapshots")
    .select("update, byte_size")
    .eq("plan_id", body.planId)
    .maybeSingle();

  if (readErr) return errorResponse(500, "READ_FAILED", readErr.message, "*");
  if (!ydoc) return errorResponse(404, "YDOC_NOT_FOUND", "No ydoc snapshot for this plan", "*");

  // PostgREST returns BYTEA columns as either a hex-string (\x...) or
  // base64 depending on the Accept header. We accept both shapes.
  const updateField = ydoc.update as unknown;
  let ydocBytes: Uint8Array;
  if (updateField instanceof Uint8Array) {
    ydocBytes = updateField;
  } else if (typeof updateField === "string") {
    if (updateField.startsWith("\\x")) {
      const hex = updateField.slice(2);
      ydocBytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < ydocBytes.length; i++) {
        ydocBytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
    } else {
      const bin = atob(updateField);
      ydocBytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) ydocBytes[i] = bin.charCodeAt(i);
    }
  } else {
    return errorResponse(500, "YDOC_SHAPE", `Unexpected ydoc update type: ${typeof updateField}`, "*");
  }

  const ydocB64 = bytesToBase64(ydocBytes);

  const { data: snap, error: insErr } = await ctx.supabase
    .from("plan_snapshots")
    .insert({
      plan_id: body.planId,
      ydoc_b64: ydocB64,
      byte_size: ydocBytes.byteLength,
      reason: body.reason,
      created_by: userId,
    })
    .select("id, created_at, byte_size")
    .single();

  if (insErr || !snap) {
    return errorResponse(500, "SNAPSHOT_FAILED", insErr?.message ?? "unknown", "*");
  }

  return json({
    snapshotId: snap.id,
    byteSize: snap.byte_size,
    createdAt: snap.created_at,
  });
};

Deno.serve(withCors(handler));