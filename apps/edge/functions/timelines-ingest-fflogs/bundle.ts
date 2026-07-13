// apps/edge/functions/timelines-ingest-fflogs/index.ts
import { z as z4 } from "https://esm.sh/zod@3.23.0";

// packages/shared/src/result/index.ts
var ok = (value) => ({ ok: true, value });
var err = (error) => ({ ok: false, error });

// packages/validation/src/fflogs/index.ts
import { z } from "https://esm.sh/zod@3.23.0";
var FFLogsAbility = z.object({
  gameID: z.number().int().positive(),
  name: z.string(),
  icon: z.string().nullable().optional()
});
var FFLogsBeginCast = z.object({
  timestamp: z.number().int().nonnegative(),
  ability: FFLogsAbility,
  sourceID: z.number().int().positive()
});
var FFLogsEndCast = z.object({
  timestamp: z.number().int().nonnegative()
});
var FFLogsEvent = z.object({
  beginCast: FFLogsBeginCast.nullable(),
  endCast: FFLogsEndCast.nullable()
});
var FFLogsReport = z.object({
  code: z.string().min(1),
  events: z.object({
    data: z.array(FFLogsEvent),
    nextPageTimestamp: z.number().int().nullable().optional()
  })
});
var FFLogsIngestRequest = z.object({
  encounterId: z.string().uuid(),
  reportCode: z.string().min(1),
  /** OAuth bearer token for the FFLogs user. Per-user, not shared. */
  oauthToken: z.string().min(1),
  /** Boss NPC source ID. Determines which events are filtered. */
  bossSourceId: z.number().int().positive()
});

// packages/validation/src/timeline/index.ts
import { z as z3 } from "https://esm.sh/zod@3.23.0";

// packages/validation/src/ability/index.ts
import { z as z2 } from "https://esm.sh/zod@3.23.0";
var AbilityMode = z2.enum(["REBORN", "EVOLVED", "CURRENT", "ALL"]);
var Role = z2.enum(["TANK", "HEALER", "MELEE", "RANGED", "CASTER"]);
var Ability = z2.object({
  id: z2.string().uuid(),
  jobId: z2.string().uuid(),
  abilityId: z2.string(),
  mode: AbilityMode,
  name: z2.string().min(1).max(128),
  description: z2.string().nullable(),
  /** 0-100, the multiplicative mit percentage. */
  effectPct: z2.number().min(0).max(100).nullable(),
  /** Recast in seconds. */
  recastS: z2.number().min(0).nullable(),
  /** Range in meters (yalms). */
  rangeM: z2.number().min(0).nullable(),
  /** Duration in seconds. */
  durationS: z2.number().min(0).nullable(),
  /** True if this ability is a tank invuln. */
  isInvuln: z2.boolean(),
  /** True if this ability is a heal. */
  isHeal: z2.boolean(),
  /** True if this ability is a shield. */
  isShield: z2.boolean(),
  /** Effective from patch version (e.g., "7.0", "7.20", "8.0"). */
  effectiveFrom: z2.string(),
  /** Effective to patch version. null = currently effective. */
  effectiveTo: z2.string().nullable(),
  createdAt: z2.string().datetime(),
  updatedAt: z2.string().datetime()
});
var AbilityEquivalenceRelation = z2.enum([
  "EQUIVALENT",
  "CONSOLIDATED",
  "REMOVED",
  "ADDED"
]);
var AbilityEquivalence = z2.object({
  srcAbilityId: z2.string().uuid(),
  dstAbilityId: z2.string().uuid(),
  relation: AbilityEquivalenceRelation,
  note: z2.string().nullable()
});
var AbilityCatalogQuery = z2.object({
  jobId: z2.string().uuid().optional(),
  mode: AbilityMode.optional(),
  /** Free-text search on `name`. */
  q: z2.string().optional(),
  /** Page size (1-200, default 50). */
  limit: z2.number().int().min(1).max(200).default(50),
  /** Offset for pagination. */
  offset: z2.number().int().min(0).default(0)
});

// packages/validation/src/timeline/index.ts
var TimelineSource = z3.enum(["CACTBOT", "TRIGGERNOMETRY", "FFLOGS", "MERGED"]);
var MergedFromSources = z3.object({
  cactbot: z3.boolean(),
  triggernometry: z3.boolean(),
  fflogs: z3.boolean()
});
var Confidence = z3.number().min(0).max(1);
var TimelineEvent = z3.object({
  id: z3.string().uuid(),
  position: z3.number().int().nonnegative(),
  /** Milliseconds from t=0 (encounter start). */
  timestampMs: z3.number().int().nonnegative(),
  type: z3.enum(["MECHANIC", "BUSTER", "RAIDWIDE", "MECHANIC_START", "MECHANIC_END"]),
  name: z3.string().min(1),
  normalizedNames: z3.array(z3.string()),
  durationMs: z3.number().int().positive().nullable(),
  /** Per-hit timestamps within the mechanic (for multi-hit AoE). */
  hitTimesMs: z3.array(z3.number().int().nonnegative()),
  targets: z3.object({
    kind: z3.enum(["MAIN_TANK", "OFF_TANK", "PARTY", "HEALER", "TARGETED", "ALL"]),
    jobIds: z3.array(z3.string().uuid()).optional()
  }),
  mechanicId: z3.string().nullable(),
  patchVersion: z3.string(),
  confidence: Confidence,
  /** Spread across pulls (FFLogs only). */
  varianceMs: z3.number().int().nonnegative().optional(),
  mergedFromSources: MergedFromSources,
  notes: z3.string().nullable().optional()
});
var BranchCondition = z3.discriminatedUnion("type", [
  z3.object({ type: z3.literal("ALWAYS") }),
  z3.object({
    type: z3.literal("RNG"),
    distribution: z3.array(
      z3.object({
        outcomeId: z3.string().uuid(),
        weight: z3.number().min(0).max(1)
      })
    )
  }),
  z3.object({
    type: z3.literal("PARTY_ACTION"),
    preconditions: z3.string()
    // CompiledExpression (placeholder until v2.1)
  }),
  z3.object({
    type: z3.literal("ROLE_COMP"),
    required: z3.array(z3.string().uuid())
  }),
  z3.object({
    type: z3.literal("HP_GATE"),
    thresholdPct: z3.number().min(0).max(100)
  })
]);
var BranchOutcome = z3.object({
  id: z3.string().uuid(),
  label: z3.string(),
  events: z3.array(TimelineEvent)
});
var Branch = z3.object({
  id: z3.string().uuid(),
  parentEventId: z3.string().uuid(),
  label: z3.string(),
  condition: BranchCondition,
  outcomes: z3.array(BranchOutcome)
});
var JoinPoint = z3.object({
  id: z3.string().uuid(),
  branchId: z3.string().uuid(),
  atEventId: z3.string().uuid()
});
var TimelineGraph = z3.object({
  id: z3.string().uuid(),
  encounterId: z3.string().uuid(),
  version: z3.string(),
  contentHash: z3.string(),
  source: TimelineSource,
  events: z3.array(TimelineEvent),
  branches: z3.array(Branch),
  joins: z3.array(JoinPoint),
  mergedFromSources: MergedFromSources,
  perEventConfidence: z3.record(z3.string(), Confidence).optional(),
  mode: AbilityMode,
  createdAt: z3.string().datetime(),
  updatedAt: z3.string().datetime()
});
var MergeConflict = z3.object({
  eventId: z3.string().uuid(),
  kind: z3.enum(["TIMESTAMP_DRIFT", "MISSING_FROM_ONE", "NAME_MISMATCH", "VARIANCE_HIGH"]),
  sources: z3.array(TimelineSource),
  detail: z3.string(),
  detectedAt: z3.string().datetime()
});
var MergeResult = z3.object({
  timeline: TimelineGraph,
  conflicts: z3.array(MergeConflict)
});

// packages/domain/src/parsers/fflogs.ts
var median = (xs) => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
};
var stdev = (xs) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.round(Math.sqrt(v));
};
var normalizeFFLogs = (report, options) => {
  const groups = /* @__PURE__ */ new Map();
  for (const ev of report.events.data) {
    const c = ev.beginCast;
    if (!c) continue;
    const key = c.ability.gameID;
    const g = groups.get(key) ?? { name: c.ability.name, timestamps: [] };
    g.timestamps.push(c.timestamp);
    groups.set(key, g);
  }
  const events = [];
  for (const [gameId, g] of groups) {
    const id = crypto.randomUUID();
    const timestampMs = median(g.timestamps);
    const varianceMs = stdev(g.timestamps);
    const event = TimelineEvent.safeParse({
      id,
      position: events.length,
      timestampMs,
      type: "MECHANIC",
      name: g.name,
      normalizedNames: [g.name.toLowerCase().replace(/\s+/g, " ").trim()],
      durationMs: null,
      hitTimesMs: [timestampMs],
      targets: { kind: "PARTY" },
      mechanicId: String(gameId),
      patchVersion: options.patchVersion,
      confidence: 0.7,
      varianceMs,
      mergedFromSources: { cactbot: false, triggernometry: false, fflogs: true },
      notes: null
    });
    if (event.success) events.push(event.data);
  }
  return events;
};
var fetchFFLogsReport = async (reportCode, oauthToken, bossSourceId) => {
  try {
    const response = await fetch("https://www.fflogs.com/api/v2/client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oauthToken}`
      },
      body: JSON.stringify({
        query: `query($code: String!, $cursor: Number) {
          reportData { report(code: $code) {
            code
            events(dataType: BeginCasts, sourceID: ${bossSourceId}, cursor: $cursor, limit: 10000) {
              data
              nextPageTimestamp
            }
          } }
        }`,
        variables: { code: reportCode, cursor: null }
      })
    });
    if (!response.ok) {
      return err({
        kind: "PARSER",
        source: "FFLOGS",
        message: `FFLogs HTTP ${response.status}`
      });
    }
    const json2 = await response.json();
    if (!json2.data) {
      return err({
        kind: "PARSER",
        source: "FFLOGS",
        message: "FFLogs returned no data",
        cause: json2.errors
      });
    }
    const report = json2.data.reportData.report;
    const parsed = FFLogsReport.safeParse(report);
    if (!parsed.success) {
      return err({
        kind: "PARSER",
        source: "FFLOGS",
        message: "FFLogs response shape mismatch",
        cause: parsed.error
      });
    }
    return ok(parsed.data);
  } catch (cause) {
    return err({ kind: "PARSER", source: "FFLOGS", message: "FFLogs fetch failed", cause });
  }
};

// apps/edge/_shared/cors.ts
var corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin"
});
var resolveOrigin = (req) => {
  const allowed = (Deno.env.get("CORS_ORIGINS") ?? "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean);
  const requestOrigin = req.headers.get("Origin") ?? "";
  return allowed.includes(requestOrigin) ? requestOrigin : allowed[0] ?? "*";
};
var json = (body, init = {}, origin = "*") => {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, String(v));
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
};
var errorResponse = (status, code, message, origin = "*") => json({ error: { code, message } }, { status }, origin);
var withCors = (handler2) => async (req) => {
  const origin = resolveOrigin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  try {
    const res = await handler2(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      if (!headers.has(k)) headers.set(k, String(v));
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  } catch (cause) {
    return errorResponse(
      500,
      "INTERNAL",
      cause instanceof Error ? cause.message : "Unknown error",
      origin
    );
  }
};

// apps/edge/_shared/supabase-client.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";
var createSupabaseClient = async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing Supabase env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : void 0
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let userId = null;
  if (jwt) {
    const { data, error } = await supabase.auth.getUser(jwt);
    if (!error && data.user) userId = data.user.id;
  }
  return { supabase, supabaseAdmin, userId, jwt };
};
var requireUser = (ctx, origin) => {
  if (!ctx.userId) {
    return errorResponse2(401, "UNAUTHENTICATED", "Missing or invalid bearer token", origin);
  }
  return null;
};
var errorResponse2 = (status, code, message, origin) => new Response(
  JSON.stringify({ error: { code, message } }),
  { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } }
);

// apps/edge/functions/timelines-ingest-fflogs/index.ts
var RequestBody = z4.object({
  encounterId: z4.string().uuid(),
  reportCode: z4.string().min(1),
  bossSourceId: z4.number().int().positive()
});
var sha256Hex = async (s) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
var handler = async (req) => {
  if (req.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST");
  const ctx = await createSupabaseClient(req);
  const unauth = requireUser(ctx, "*");
  if (unauth) return unauth;
  let body;
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
  const { data: encounter, error: encErr } = await ctx.supabase.from("encounters").select("patch_version").eq("id", body.encounterId).single();
  if (encErr || !encounter) {
    return errorResponse(404, "ENCOUNTER_NOT_FOUND", "encounterId not found", "*");
  }
  const events = normalizeFFLogs(fetched.value, {
    encounterId: body.encounterId,
    patchVersion: encounter.patch_version
  });
  const validated = events.map((e) => TimelineEvent.safeParse(e)).filter((r) => r.success).map((r) => r.data);
  const contentHash = await sha256Hex(JSON.stringify(validated));
  const { data: row, error: upErr } = await ctx.supabaseAdmin.from("timelines").upsert(
    {
      encounter_id: body.encounterId,
      version: encounter.patch_version,
      source: "FFLOGS",
      events: validated,
      branches: [],
      joins: [],
      merged_from_sources: { cactbot: false, triggernometry: false, fflogs: true },
      byte_size: JSON.stringify(validated).length,
      content_hash: contentHash
    },
    { onConflict: "encounter_id,version,source" }
  ).select("id, version, content_hash").single();
  if (upErr || !row) {
    return errorResponse(500, "UPSERT_FAILED", upErr?.message ?? "unknown", "*");
  }
  return json({
    timelineId: row.id,
    version: row.version,
    eventCount: validated.length,
    contentHash: row.content_hash
  });
};
Deno.serve(withCors(handler));
