/**
 * Supabase RPC + Edge Function client.
 *
 * This is the typed entry point for every backend call XIVMitPlan makes.
 * It replaces the tRPC client that lived in the now-deleted `apps/server`
 * package. See ADR-0002 §"API surface" and architecture §18.1.
 *
 * Two layers:
 *
 * 1. `rpc<I, O>` — wraps `client.rpc(fn, args)` for PostgREST RPCs defined
 *    in migration 0003 (`encounters_list`, `encounters_by_id`,
 *    `abilities_list`, `auth_me`, `plans_list`, `plans_by_id`,
 *    `timelines_by_encounter`, `plan_access_list_for_plan`).
 *
 * 2. `callEdgeFunction<T>` — wraps `client.functions.invoke(name, ...)`
 *    for the 7 Deno Edge Functions under `apps/edge/` (ingest pipelines
 *    and write paths that need service-role keys or external fetches).
 *
 * Both layers run Zod validation on the response so the rest of the app
 * gets end-to-end type safety via `z.infer<typeof schema>`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { byteaHexToBytes } from "./bytes.js";
import { TimelineGraph } from "@xivmitplan/validation/timeline";
import { CactbotIngestRequest } from "@xivmitplan/validation/cactbot";
import { TriggernometryIngestRequest } from "@xivmitplan/validation/triggernometry";
import { FFLogsIngestRequest } from "@xivmitplan/validation/fflogs";
import { AbilityMode } from "@xivmitplan/validation/ability";

// ---------------------------------------------------------------------------
// Local minimal Zod schemas for response shapes that mirror the SQL
// `RETURNS TABLE (...)` in migration 0003. These are intentionally narrow —
// the SQL is the source of truth. Promote to @xivmitplan/validation when
// migration 0003 is finalized.
// ---------------------------------------------------------------------------

export const Encounter = z.object({
  id: z.string().uuid(),
  raid_id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  patch_version: z.string(),
  boss_npc_source_id: z.number().int(),
  effective_from: z.string().nullable(),
  effective_to: z.string().nullable(),
  created_at: z.string().datetime(),
  raid_slug: z.string(),
  expansion_slug: z.string(),
});
export type Encounter = z.infer<typeof Encounter>;

export const AbilityRow = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  ability_id: z.string(),
  mode: AbilityMode,
  name: z.string(),
  description: z.string().nullable(),
  effect_pct: z.number().int().nullable(),
  recast_s: z.number().int().nullable(),
  range_m: z.number().int().nullable(),
  duration_s: z.number().int().nullable(),
  is_invuln: z.boolean(),
  is_heal: z.boolean(),
  is_shield: z.boolean(),
  effective_from: z.string(),
  effective_to: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AbilityRow = z.infer<typeof AbilityRow>;

export const AuthMeResult = z.object({
  user_id: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
});
export type AuthMeResult = z.infer<typeof AuthMeResult>;

export const PlanRow = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string(),
  encounter_id: z.string().uuid(),
  party_id: z.string().uuid().nullable(),
  mode: AbilityMode,
  is_legacy: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  conflicts: z.array(z.unknown()),
});
export type PlanRow = z.infer<typeof PlanRow>;

export const TimelineRow = z.object({
  id: z.string().uuid(),
  encounter_id: z.string().uuid(),
  version: z.string(),
  content_hash: z.string(),
  source: z.enum(["CACTBOT", "TRIGGERNOMETRY", "FFLOGS", "MERGED", "MANUAL"]),
  mode: AbilityMode,
  events: z.array(z.unknown()),
  branches: z.array(z.unknown()),
  joins: z.array(z.unknown()),
  merged_from_sources: z.object({
    cactbot: z.boolean(),
    triggernometry: z.boolean(),
    fflogs: z.boolean(),
  }),
  per_event_confidence: z.record(z.string(), z.number()),
  byte_size: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type TimelineRow = z.infer<typeof TimelineRow>;

export const PlanAccessRow = z.object({
  plan_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
  via_share_token: z.boolean(),
  granted_at: z.string().datetime(),
  display_name: z.string().nullable(),
  email: z.string().email().nullable(),
});
export type PlanAccessRow = z.infer<typeof PlanAccessRow>;

// Edge Function response envelopes.
const IngestAck = z.object({
  timelineId: z.string().uuid(),
  version: z.string(),
  eventCount: z.number().int().nonnegative(),
  contentHash: z.string(),
});
type IngestAck = z.infer<typeof IngestAck>;

const CreatePlanResult = z.object({
  planId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
type CreatePlanResult = z.infer<typeof CreatePlanResult>;

const SnapshotPlanResult = z.object({
  snapshotId: z.string().uuid(),
  byteSize: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
type SnapshotPlanResult = z.infer<typeof SnapshotPlanResult>;

const SharePlanResult = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});
type SharePlanResult = z.infer<typeof SharePlanResult>;

const ClaimLegacyPlansResult = z.object({
  claimed: z.number().int().nonnegative(),
});
type ClaimLegacyPlansResult = z.infer<typeof ClaimLegacyPlansResult>;

const RedeemShareTokenResult = z.object({
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
  expiresAt: z.string().datetime().nullable(),
});
type RedeemShareTokenResult = z.infer<typeof RedeemShareTokenResult>;

const RedeemShareTokenArgs = z.object({
  planId: z.string().uuid(),
  token: z.string().min(1),
});
type RedeemShareTokenArgs = z.infer<typeof RedeemShareTokenArgs>;

const PlanRoleArgs = z.object({ p_plan_id: z.string().uuid() });
const PlanRoleResult = z.enum(["OWNER", "EDITOR", "VIEWER"]).nullable();
const LegacyClaimablePlan = z.object({ id: z.string().uuid(), name: z.string() });

// ---------------------------------------------------------------------------
// Input arg schemas. These use snake_case to match the SQL function params.
// ---------------------------------------------------------------------------

const EncountersListArgs = z.object({
  p_expansion_slug: z.string().optional(),
  p_raid_slug: z.string().optional(),
});
type EncountersListArgs = z.infer<typeof EncountersListArgs>;

const EncountersByIdArgs = z.object({ p_id: z.string().uuid() });
type EncountersByIdArgs = z.infer<typeof EncountersByIdArgs>;

const AbilitiesListArgs = z.object({
  p_job_id: z.string().uuid().optional(),
  p_mode: AbilityMode.optional(),
  p_encounter_id: z.string().uuid().optional(),
});
type AbilitiesListArgs = z.infer<typeof AbilitiesListArgs>;

const PlansListArgs = z.object({
  p_limit: z.number().int().min(1).max(100).optional(),
});
type PlansListArgs = z.infer<typeof PlansListArgs>;

const PlansByIdArgs = z.object({ p_id: z.string().uuid() });
type PlansByIdArgs = z.infer<typeof PlansByIdArgs>;

const TimelinesByEncounterArgs = z.object({
  p_encounter_id: z.string().uuid(),
});
type TimelinesByEncounterArgs = z.infer<typeof TimelinesByEncounterArgs>;

const PlanAccessListForPlanArgs = z.object({ p_plan_id: z.string().uuid() });
type PlanAccessListForPlanArgs = z.infer<typeof PlanAccessListForPlanArgs>;

const CreatePlanArgs = z.object({
  name: z.string().min(1).max(128),
  encounterId: z.string().uuid(),
  partyId: z.string().uuid().optional(),
  mode: AbilityMode,
});
type CreatePlanArgs = z.infer<typeof CreatePlanArgs>;

const SnapshotPlanArgs = z.object({
  planId: z.string().uuid(),
  reason: z.enum(["IDLE", "USER_SAVE", "ASSIGNMENT_DELETE", "REBUILD"]).default("USER_SAVE"),
});
type SnapshotPlanArgs = z.infer<typeof SnapshotPlanArgs>;

const SharePlanArgs = z.object({
  planId: z.string().uuid(),
  role: z.enum(["read", "edit"]),
  expiresInDays: z.number().int().min(1).max(90),
});
type SharePlanArgs = z.infer<typeof SharePlanArgs>;

const ClaimLegacyPlansArgs = z.object({
  planIds: z.array(z.string().uuid()).min(1).max(500),
});
type ClaimLegacyPlansArgs = z.infer<typeof ClaimLegacyPlansArgs>;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a PostgREST RPC call with end-to-end Zod validation.
 * Throws `RpcError` on RPC error or Zod parse error.
 */
export async function rpc<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  client: SupabaseClient,
  fn: string,
  args: z.input<I>,
  inputSchema: I,
  outputSchema: O,
): Promise<z.output<O>> {
  const parsedArgs = inputSchema.parse(args);

  const { data, error } = await client.rpc(fn, parsedArgs as Record<string, unknown>);
  if (error) throw new RpcError(fn, error.message, error);

  const result = outputSchema.safeParse(data);
  if (!result.success) {
    throw new RpcError(
      fn,
      `RPC "${fn}" returned a payload that failed output validation: ${result.error.message}`,
      result.error,
    );
  }
  return result.data;
}

/**
 * Wraps an Edge Function invocation with optional output validation.
 */
export async function callEdgeFunction<TArgs, TOut = unknown>(
  client: SupabaseClient,
  name: string,
  args: TArgs,
  schema?: z.ZodType<TOut>,
): Promise<TOut> {
  const { data, error } = await client.functions.invoke<TOut>(name, {
    body: args as Record<string, unknown>,
  });
  if (error) throw new EdgeFunctionError(name, error.message, error);
  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new EdgeFunctionError(
        name,
        `Edge Function "${name}" returned a payload that failed validation: ${parsed.error.message}`,
        parsed.error,
      );
    }
    return parsed.data;
  }
  return data as TOut;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class RpcError extends Error {
  public readonly fn: string;
  public override readonly cause: unknown;
  constructor(fn: string, message: string, cause: unknown) {
    super(`[rpc:${fn}] ${message}`);
    this.name = "RpcError";
    this.fn = fn;
    this.cause = cause;
  }
}

export class EdgeFunctionError extends Error {
  public readonly fn: string;
  public override readonly cause: unknown;
  constructor(fn: string, message: string, cause: unknown) {
    super(`[edge:${fn}] ${message}`);
    this.name = "EdgeFunctionError";
    this.fn = fn;
    this.cause = cause;
  }
}

// ===========================================================================
// PostgREST RPC wrappers — migration 0003
// ===========================================================================

export const encountersList = (
  client: SupabaseClient,
  args: EncountersListArgs,
): Promise<Encounter[]> =>
  rpc(client, "encounters_list", args, EncountersListArgs, z.array(Encounter));

export const encountersById = (
  client: SupabaseClient,
  args: EncountersByIdArgs,
): Promise<Encounter | null> =>
  rpc(client, "encounters_by_id", args, EncountersByIdArgs, Encounter.nullable());

export const abilitiesList = (
  client: SupabaseClient,
  args: AbilitiesListArgs = {},
): Promise<AbilityRow[]> =>
  rpc(client, "abilities_list", args, AbilitiesListArgs, z.array(AbilityRow));

export const authMe = (client: SupabaseClient): Promise<AuthMeResult> =>
  rpc(client, "auth_me", {}, z.object({}), AuthMeResult);

export const plansList = (
  client: SupabaseClient,
  args: PlansListArgs = {},
): Promise<PlanRow[]> =>
  rpc(client, "plans_list", args, PlansListArgs, z.array(PlanRow));

export const plansById = (
  client: SupabaseClient,
  args: PlansByIdArgs,
): Promise<PlanRow | null> =>
  rpc(client, "plans_by_id", args, PlansByIdArgs, PlanRow.nullable());

/**
 * Returns the raw `timelines` rows. The web app converts these into
 * TimelineGraph via a client-side helper (TimelineGraph's Zod shape
 * is stricter — it requires positions, branches, etc. — so we keep
 * the RPC return shape loose here).
 */
export const timelinesByEncounter = (
  client: SupabaseClient,
  args: TimelinesByEncounterArgs,
): Promise<TimelineRow[]> =>
  rpc(client, "timelines_by_encounter", args, TimelinesByEncounterArgs, z.array(TimelineRow));

/** Alias consumers can use when they want a TimelineGraph-shaped array. */
export const timelineGraphsByEncounter = async (
  client: SupabaseClient,
  args: TimelinesByEncounterArgs,
): Promise<TimelineGraph[]> => {
  const rows = await timelinesByEncounter(client, args);
  return rows.map((r) =>
    TimelineGraph.parse({
      id: r.id,
      encounterId: r.encounter_id,
      version: r.version,
      contentHash: r.content_hash,
      source: r.source,
      events: r.events,
      branches: r.branches,
      joins: r.joins,
      mergedFromSources: r.merged_from_sources,
      perEventConfidence: r.per_event_confidence,
      mode: r.mode,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }),
  );
};

export const planAccessListForPlan = (
  client: SupabaseClient,
  args: PlanAccessListForPlanArgs,
): Promise<PlanAccessRow[]> =>
  rpc(
    client,
    "plan_access_list_for_plan",
    args,
    PlanAccessListForPlanArgs,
    z.array(PlanAccessRow),
  );

// ---------------------------------------------------------------------------
// load_ydoc_snapshot
// ---------------------------------------------------------------------------
// Returns the latest Yjs snapshot for a plan, with ACL check (see
// migration 0002). The SQL function returns BYTEA; PostgREST serializes
// BYTEA as a hex-encoded string prefixed with `\x` by default. The
// wrapper below decodes hex → Uint8Array directly so the consumer can
// pass it to `Y.applyUpdate` without a base64 round-trip.

const LoadYDocSnapshotArgs = z.object({ p_plan_id: z.string().uuid() });
type LoadYDocSnapshotArgs = z.infer<typeof LoadYDocSnapshotArgs>;

const LoadYDocSnapshotRow = z.object({
  /** BYTEA serialized by PostgREST as `\x...` hex (default). */
  update: z.string(),
  byte_size: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
});
type LoadYDocSnapshotRow = z.infer<typeof LoadYDocSnapshotRow>;

export const loadYDocSnapshot = async (
  client: SupabaseClient,
  args: LoadYDocSnapshotArgs,
): Promise<{ update: Uint8Array; byteSize: number; updatedAt: string } | null> => {
  const parsed = LoadYDocSnapshotArgs.parse(args);
  const { data, error } = await client.rpc('load_ydoc_snapshot', parsed);
  if (error) throw new RpcError('load_ydoc_snapshot', error.message, error);
  const result = z.array(LoadYDocSnapshotRow).safeParse(data);
  if (!result.success) {
    throw new RpcError(
      'load_ydoc_snapshot',
      `RPC "load_ydoc_snapshot" returned a payload that failed validation: ${result.error.message}`,
      result.error,
    );
  }
  const row = result.data[0];
  if (!row) return null;
  return {
    update: byteaHexToBytes(row.update),
    byteSize: row.byte_size,
    updatedAt: row.updated_at,
  };
};

// ===========================================================================
// Edge Function wrappers — apps/edge/
// ===========================================================================

export const ingestCactbotTimeline = (
  client: SupabaseClient,
  args: z.infer<typeof CactbotIngestRequest>,
): Promise<IngestAck> =>
  callEdgeFunction(client, "timelines-ingest-cactbot", args, IngestAck);

export const ingestTriggernometryTimeline = (
  client: SupabaseClient,
  args: z.infer<typeof TriggernometryIngestRequest>,
): Promise<IngestAck> =>
  callEdgeFunction(client, "timelines-ingest-triggernometry", args, IngestAck);

export const ingestFFLogsTimeline = (
  client: SupabaseClient,
  args: z.infer<typeof FFLogsIngestRequest>,
): Promise<IngestAck> =>
  callEdgeFunction(client, "timelines-ingest-fflogs", args, IngestAck);

export const createPlan = (
  client: SupabaseClient,
  args: CreatePlanArgs,
): Promise<CreatePlanResult> =>
  callEdgeFunction(client, "plans-create", args, CreatePlanResult);

export const snapshotPlan = (
  client: SupabaseClient,
  args: SnapshotPlanArgs,
): Promise<SnapshotPlanResult> =>
  callEdgeFunction(client, "plans-snapshot", args, SnapshotPlanResult);

export const sharePlan = (
  client: SupabaseClient,
  args: SharePlanArgs,
): Promise<SharePlanResult> =>
  callEdgeFunction(client, "plans-share", args, SharePlanResult);

export const claimLegacyPlans = (
  client: SupabaseClient,
  args: ClaimLegacyPlansArgs,
): Promise<ClaimLegacyPlansResult> =>
  callEdgeFunction(client, "auth-claim-legacy-plans", args, ClaimLegacyPlansResult);

export const redeemShareToken = (
  client: SupabaseClient,
  args: RedeemShareTokenArgs,
): Promise<RedeemShareTokenResult> =>
  callEdgeFunction(client, "plans-share-redeem", args, RedeemShareTokenResult);

/** Returns the caller's server-derived role for a plan, or null without access. */
export const planRoleForCurrentUser = async (
  client: SupabaseClient,
  args: z.infer<typeof PlanRoleArgs>,
): Promise<z.infer<typeof PlanRoleResult>> => {
  const parsed = PlanRoleArgs.parse(args);
  const { data, error } = await client.rpc('plan_role_for_current_user', parsed);
  if (error) throw new RpcError('plan_role_for_current_user', error.message, error);
  const result = PlanRoleResult.safeParse(data);
  if (!result.success) {
    throw new RpcError('plan_role_for_current_user', result.error.message, result.error);
  }
  return result.data;
};

/** Lists only legacy plans whose owner identity matches the current user. */
export const legacyClaimablePlanIds = async (
  client: SupabaseClient,
): Promise<Array<z.infer<typeof LegacyClaimablePlan>>> => {
  const { data, error } = await client.rpc('legacy_claimable_plan_ids');
  if (error) throw new RpcError('legacy_claimable_plan_ids', error.message, error);
  const result = z.array(LegacyClaimablePlan).safeParse(data);
  if (!result.success) {
    throw new RpcError('legacy_claimable_plan_ids', result.error.message, result.error);
  }
  return result.data;
};
