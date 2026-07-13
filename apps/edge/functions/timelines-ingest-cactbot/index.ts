// Supabase Edge Function: timelines-ingest-cactbot
// Path A (ADR-0002 §T-4). Architecture §12.2, Appendix B.1.
//
// POST /functions/v1/timelines-ingest-cactbot
// Body: { encounterId: uuid, raw: string }
//
// Auth: required (the user's `auth.uid()` is read from the bearer token).
// Returns: { timelineId, version, eventCount, contentHash }
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
import { z } from "zod";
import { parseCactbotRaw, normalizeCactbot } from "@xivmitplan/domain/parsers/cactbot";
import { TimelineEvent } from "@xivmitplan/validation/timeline";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  encounterId: z.string().uuid(),
  raw: z.string().min(1),
});
type RequestBody = z.infer<typeof RequestBody>;

const sha256Hex = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST");

  const ctx = await createSupabaseClient(req);
  const unauth = requireUser(ctx, "*");
  if (unauth) return unauth;

  let body: RequestBody;
  try {
    body = RequestBody.parse(await req.json());
  } catch {
    return errorResponse(400, "INVALID_BODY", "Body must be { encounterId, raw }", "*");
  }

  // Look up the encounter first — normalizeCactbot needs the patch
  // version to stamp onto every event (TimelineEvent validation
  // requires patchVersion: z.string()).
  const { data: encounter, error: encErr } = await ctx.supabase
    .from("encounters")
    .select("id, patch_version")
    .eq("id", body.encounterId)
    .single();
  if (encErr || !encounter) {
    return errorResponse(404, "ENCOUNTER_NOT_FOUND", "encounterId not found", "*");
  }

  const lines = parseCactbotRaw(body.raw);
  const events = normalizeCactbot(lines, {
    encounterId: body.encounterId,
    patchVersion: encounter.patch_version,
  });

  const validated = events
    .map((e) => TimelineEvent.safeParse(e))
    .filter((r): r is { success: true; data: ReturnType<typeof TimelineEvent.parse> } => r.success)
    .map((r) => r.data);

  const contentHash = await sha256Hex(JSON.stringify(validated));

  // timelines has only a SELECT RLS policy (migration 0001:359). Writes
  // must go through the admin client; ingest is a server-side
  // pipeline so bypassing RLS is intentional and contained.
  const { data: row, error: upErr } = await ctx.supabaseAdmin
    .from("timelines")
    .upsert(
      {
        encounter_id: body.encounterId,
        version: encounter.patch_version,
        source: "CACTBOT",
        events: validated,
        branches: [],
        joins: [],
        merged_from_sources: { cactbot: true, triggernometry: false, fflogs: false },
        byte_size: JSON.stringify(validated).length,
        content_hash: contentHash,
      },
      { onConflict: "encounter_id,version,source" },
    )
    .select("id, version, content_hash")
    .single();

  if (upErr || !row) {
    return errorResponse(500, "UPSERT_FAILED", upErr?.message ?? "unknown", "*");
  }

  return json({
    timelineId: row.id,
    version: row.version,
    eventCount: validated.length,
    contentHash: row.content_hash,
  });
};

Deno.serve(withCors(handler));