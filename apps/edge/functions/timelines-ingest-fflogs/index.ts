// Supabase Edge Function: timelines-ingest-fflogs
// Path A (ADR-0002 §T-4). Architecture §12.2, Appendix B.3.
//
// POST /functions/v1/timelines-ingest-fflogs
// Body: { encounterId: uuid, reportCode: string, bossSourceId: number }
//
// Auth: required.
// Returns: { timelineId, version, eventCount, contentHash }
//
// FFLogs requires an OAuth token. The token lives in the Edge Function
// env as `FFLOGS_OAUTH_TOKEN` — set via `supabase secrets set`. The
// public RPC surface does not accept the token (it is shared project
// infrastructure).
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//   FFLOGS_OAUTH_TOKEN (custom secret — required)
import { z } from "zod";
import { fetchFFLogsReport, normalizeFFLogs } from "@xivmitplan/domain/parsers/fflogs";
import { TimelineEvent } from "@xivmitplan/validation/timeline";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  encounterId: z.string().uuid(),
  reportCode: z.string().min(1),
  bossSourceId: z.number().int().positive(),
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
    return errorResponse(400, "INVALID_BODY", "Body must be { encounterId, reportCode, bossSourceId }", "*");
  }

  const oauthToken = Deno.env.get("FFLOGS_OAUTH_TOKEN");
  if (!oauthToken) {
    return errorResponse(500, "MISSING_SECRET", "FFLOGS_OAUTH_TOKEN not configured on the function", "*");
  }

  const fetched = await fetchFFLogsReport(body.reportCode, oauthToken, body.bossSourceId);
  if (!fetched.ok) {
    return errorResponse(502, "FFLOGS_FETCH_FAILED", fetched.error.message, "*");
  }

  const { data: encounter, error: encErr } = await ctx.supabase
    .from("encounters")
    .select("patch_version")
    .eq("id", body.encounterId)
    .single();
  if (encErr || !encounter) {
    return errorResponse(404, "ENCOUNTER_NOT_FOUND", "encounterId not found", "*");
  }

  const events = normalizeFFLogs(fetched.value, {
    encounterId: body.encounterId as unknown as ReturnType<typeof crypto.randomUUID>,
    patchVersion: encounter.patch_version,
  });

  const validated = events
    .map((e) => TimelineEvent.safeParse(e))
    .filter((r): r is { success: true; data: ReturnType<typeof TimelineEvent.parse> } => r.success)
    .map((r) => r.data);

  const contentHash = await sha256Hex(JSON.stringify(validated));

  const { data: row, error: upErr } = await ctx.supabase
    .from("timelines")
    .upsert(
      {
        encounter_id: body.encounterId,
        version: encounter.patch_version,
        source: "FFLOGS",
        events: validated,
        branches: [],
        joins: [],
        merged_from_sources: { cactbot: false, triggernometry: false, fflogs: true },
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