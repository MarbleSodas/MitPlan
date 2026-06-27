// Supabase Edge Function: timelines-ingest-triggernometry
// Path A (ADR-0002 §T-4). Architecture §12.2, Appendix B.2.
//
// POST /functions/v1/timelines-ingest-triggernometry
// Body: { encounterId: uuid, xml: string, patchVersion: string }
//
// Auth: required.
// Returns: { timelineId, version, eventCount, contentHash }
//
// Triggernometry is event-driven, not time-anchored. The parser infers
// `timestampMs` by matching trigger names against the encounter's
// Cactbot timeline (highest-confidence source already ingested). If no
// Cactbot timeline exists yet, the events fall back to t=60s with
// `confidence: 0.6` and `varianceMs: 2000`.
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
import { parseTriggernometryXml, normalizeTriggernometry } from "@xivmitplan/domain/parsers/triggernometry";
import { TimelineEvent } from "@xivmitplan/validation/timeline";
import { withCors, errorResponse, json } from "../../_shared/cors.ts";
import { createSupabaseClient, requireUser } from "../../_shared/supabase-client.ts";

const RequestBody = z.object({
  encounterId: z.string().uuid(),
  xml: z.string().min(1),
  patchVersion: z.string().min(1),
});
// Bring in zod for the schema.
import { z } from "zod";

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

  let body: { encounterId: string; xml: string; patchVersion: string };
  try {
    body = RequestBody.parse(await req.json());
  } catch {
    return errorResponse(400, "INVALID_BODY", "Body must be { encounterId, xml, patchVersion }", "*");
  }

  const parsed = parseTriggernometryXml(body.xml);

  // Read the encounter's Cactbot timeline (if any) for timestamp inference.
  const { data: cactbotRow } = await ctx.supabase
    .from("timelines")
    .select("events")
    .eq("encounter_id", body.encounterId)
    .eq("source", "CACTBOT")
    .maybeSingle();
  const cactbotEvents = cactbotRow
    ? (cactbotRow.events as unknown[])
        .map((e) => TimelineEvent.safeParse(e))
        .filter((r): r is { success: true; data: ReturnType<typeof TimelineEvent.parse> } => r.success)
        .map((r) => r.data)
    : [];

  const events = normalizeTriggernometry(
    parsed,
    {
      encounterId: body.encounterId as unknown as ReturnType<typeof crypto.randomUUID>,
      patchVersion: body.patchVersion,
    },
    cactbotEvents,
  );

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
        version: body.patchVersion,
        source: "TRIGGERNOMETRY",
        events: validated,
        branches: [],
        joins: [],
        merged_from_sources: { cactbot: false, triggernometry: true, fflogs: false },
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