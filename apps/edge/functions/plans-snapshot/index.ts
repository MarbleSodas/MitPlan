// Supabase Edge Function: plans-snapshot
// Path A (ADR-0002 §T-4). Architecture §14.6, §17.3.
//
// POST /functions/v1/plans-snapshot
// Body: { planId: uuid, reason: 'IDLE'|'USER_SAVE'|'ASSIGNMENT_DELETE'|'REBUILD' }
//
// Auth: required. Caller must be the plan OWNER/EDITOR (NOT VIEWER —
// snapshots are a write-side operation even though they read from
// `ydoc_snapshots`).
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

/** Explicit role check on top of RLS — VIEWERs are read-only at the
 * snapshot RPC layer even though the ydoc_snapshots SELECT RLS policy
 * accepts any plan_access role. Mirrors upsert_ydoc_snapshot's
 * OWNER/EDITOR gate (migration 0002:138-152). */
const assertEditorAccess = async (
  ctx: { supabase: ReturnType<typeof Object> },
  planId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> => {
  // Use the user-scoped client so we benefit from the existing RLS
  // policy for plan_access SELECT — non-members can't probe.
  const { data, error } = await ctx.supabase
    .from("plans")
    .select("owner_id, plan_access!inner(role)")
    .eq("id", planId)
    .eq("plan_access.user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, code: "ACL_QUERY_FAILED", message: error.message };
  // No row → caller has no access at all.
  if (!data) return { ok: false, status: 403, code: "FORBIDDEN", message: "No access to this plan" };
  // Supabase returns `plan_access` as an array via the !inner join.
  const rows = (data as { plan_access?: Array<{ role: string }> }).plan_access ?? [];
  const isOwner = (data as { owner_id: string }).owner_id === userId;
  const isEditor = rows.some((r) => r.role === "OWNER" || r.role === "EDITOR");
  if (!isOwner && !isEditor) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Editor access required" };
  }
  return { ok: true };
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

  // Explicit editor-only ACL gate (RLS alone allows VIEWERs to read
  // ydoc_snapshots, but a VIEWER must not be able to mint a versioned
  // snapshot — snapshots are a write-side operation).
  const acl = await assertEditorAccess(ctx, body.planId, userId);
  if (!acl.ok) {
    return errorResponse(acl.status, acl.code, acl.message, "*");
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

  // Insert via the admin client: plan_snapshots only has a SELECT RLS
  // policy, so a user-scoped insert is denied. The admin client
  // bypasses RLS (mirrors plans-create).
  const { data: snap, error: insErr } = await ctx.supabaseAdmin
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