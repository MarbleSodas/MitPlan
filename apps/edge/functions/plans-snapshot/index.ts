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
import { base64ToBytes, byteaHexToBytes, bytesToBase64 } from "../../_shared/bytes.ts";
import {
  createSupabaseClient,
  requireUser,
  type RequestContext,
} from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  planId: z.string().uuid(),
  reason: z.enum(["IDLE", "USER_SAVE", "ASSIGNMENT_DELETE", "REBUILD"]),
});
type RequestBody = z.infer<typeof RequestBody>;

type PlanOwnerRow = { owner_id: string };
type PlanAccessRoleRow = { role: "OWNER" | "EDITOR" | "VIEWER" };
type YDocSnapshotRow = { update: unknown; byte_size: number };
type SnapshotRow = { id: string; created_at: string; byte_size: number };

/** Explicit role check on top of RLS — VIEWERs are read-only at the
 * snapshot RPC layer even though the ydoc_snapshots SELECT RLS policy
 * accepts any plan_access role. */
const assertEditorAccess = async (
  ctx: Pick<RequestContext, "supabase">,
  planId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> => {
  const { data, error } = await ctx.supabase
    .from("plans")
    .select("owner_id")
    .eq("id", planId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, code: "ACL_QUERY_FAILED", message: error.message };
  // No plan row → invalid plan id.
  if (!data) return { ok: false, status: 403, code: "FORBIDDEN", message: "No access to this plan" };

  const plan = data as unknown as PlanOwnerRow;
  if (plan.owner_id === userId) return { ok: true };

  const { data: accessData, error: accessError } = await ctx.supabase
    .from("plan_access")
    .select("role")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (accessError) {
    return { ok: false, status: 500, code: "ACL_QUERY_FAILED", message: accessError.message };
  }

  const access = accessData as unknown as PlanAccessRoleRow | null;
  if (!access || (access.role !== "OWNER" && access.role !== "EDITOR")) {
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
  const { data: rawYdoc, error: readErr } = await ctx.supabase
    .from("ydoc_snapshots")
    .select("update, byte_size")
    .eq("plan_id", body.planId)
    .maybeSingle();
  const ydoc = rawYdoc as unknown as YDocSnapshotRow | null;

  if (readErr) return errorResponse(500, "READ_FAILED", readErr.message, "*");
  if (!ydoc) return errorResponse(404, "YDOC_NOT_FOUND", "No ydoc snapshot for this plan", "*");

  // PostgREST returns BYTEA columns as either a hex-string (\x...) or
  // base64 depending on the Accept header. We accept both shapes.
  const updateField = ydoc.update as unknown;
  let ydocBytes: Uint8Array;
  if (updateField instanceof Uint8Array) {
    ydocBytes = updateField;
  } else if (typeof updateField === "string") {
    ydocBytes = updateField.startsWith("\\x")
      ? byteaHexToBytes(updateField)
      : base64ToBytes(updateField);
  } else {
    return errorResponse(500, "YDOC_SHAPE", `Unexpected ydoc update type: ${typeof updateField}`, "*");
  }

  const ydocB64 = bytesToBase64(ydocBytes);

  // Insert via the admin client: plan_snapshots only has a SELECT RLS
  // policy, so a user-scoped insert is denied. The admin client
  // bypasses RLS (mirrors plans-create).
  const { data: rawSnap, error: insErr } = await ctx.supabaseAdmin
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
  const snap = rawSnap as unknown as SnapshotRow | null;

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
