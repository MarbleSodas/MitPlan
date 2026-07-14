/**
 * data-source — the single UI-side facade for every catalog, plan, and
 * snapshot read/write XIVMitPlan makes.
 *
 * Wraps the Supabase RPC + Edge Function wrappers in `supabase-rpc.ts`
 * with a sample-data fallback so the dev server stays usable without
 * cloud credentials (per README §"Quickstart"). When
 * `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, the same
 * functions hit live Supabase; the rest of the app doesn't notice.
 *
 * The fallback is intentionally narrow:
 *   - 3 sample encounters (FRU P1, M1S, M2S) — matches the seed
 *     migration 0004 UUIDs so `plan.index.tsx`'s "New plan" CTA
 *     links to a real row when Supabase is connected.
 *   - 25 sample abilities — matches the seed migration 0004 ability
 *     catalog by `ability_id` text.
 *   - 3 sample plans — only used when no plans exist for the user
 *     and Supabase is not configured (read-only display).
 *   - Sample timeline events for FRU P1 / M1S / M2S.
 *
 * Why a single facade: the rest of the app shouldn't have to know
 * whether Supabase is configured. It just calls `listEncounters()`
 * and gets back the right shape. If we add a 4th source later
 * (offline cache, fixture injection for tests), it goes here.
 *
 * Phase 1 scope (current migration):
 *   - Read: encounters, plans, abilities, timelines, snapshot
 *   - Write: createPlan (Edge Function), upsertPlanMeta (local
 *     Y.Doc + debounced snapshot, no RPC)
 *
 * Phase 2+ scope:
 *   - Write: sharePlan, snapshotPlan (explicit), claimLegacyPlans
 *   - Read: planAccessListForPlan, party CRUD
 */
import { supabase as defaultSupabase } from './supabase.js';
import {
  encountersById,
  encountersList,
  abilitiesList,
  plansList,
  plansById,
  timelinesByEncounter,
  timelinesByEncounterMode,
  abilityEquivalenceList,
  communityTimelinesList,
  communityTimelineById,
  communityTimelineCreate,
  communityTimelineUpdate,
  communityTimelineDelete,
  communityTimelineLikeToggle,
  communityTimelineCollectionToggle,
  communityTimelineCollectionIds,
  createPlan as rpcCreatePlan,
  loadYDocSnapshot,
  snapshotPlan as rpcSnapshotPlan,
  planAccessListForPlan,
  sharePlan as rpcSharePlan,
  redeemShareToken,
  planRoleForCurrentUser,
  legacyClaimablePlanIds,
  claimLegacyPlans as rpcClaimLegacyPlans,
  updatePlan as rpcUpdatePlan,
  deletePlan as rpcDeletePlan,
  duplicatePlan as rpcDuplicatePlan,
  planExportSnapshot as rpcPlanExportSnapshot,
} from './supabase-rpc.js';
import type {
  Encounter,
  AbilityRow,
  PlanRow,
  TimelineRow,
  PlanAccessRow,
  AbilityEquivalenceRow,
  CommunityTimelineRow,
} from './supabase-rpc.js';
import { RawTimelineEvent } from './supabase-rpc.js';
import { SAMPLE_PLANS, SAMPLE_ABILITIES, SAMPLE_EVENTS, SAMPLE_ENCOUNTERS } from './sample-data.js';
import { capitalize } from './utils.js';
import type { AbilityMode } from '@xivmitplan/validation/ability';

// ---------------------------------------------------------------------------
// Local TypeScript shapes — the public interface of this module.
// ---------------------------------------------------------------------------

/**
 * Encounter as the UI consumes it (camelCase + raid_slug for breadcrumb).
 * Mirrors the `Encounter` Zod schema in `supabase-rpc.ts` but is
 * promoted to camelCase so React components don't sprinkle `.id`
 * with `.raid_slug` exceptions.
 */
export interface EncounterInfo {
  id: string;
  name: string;
  slug: string;
  patchVersion: string;
  raidSlug: string;
  raidName: string;
  expansionSlug: string;
  expansionName: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  raidTier: number | null;
}

/** Ability as the UI consumes it. camelCase + job abbreviation. */
export interface AbilityInfo {
  id: string;
  jobId: string;
  jobAbbrev: string;
  abilityId: string;
  mode: AbilityMode;
  name: string;
  description: string | null;
  effectPct: number | null;
  recastS: number | null;
  durationS: number | null;
  isInvuln: boolean;
  isHeal: boolean;
  isShield: boolean;
  category: 'tank-cd' | 'healer-cd' | 'party-mit' | 'invuln' | 'shield' | 'utility';
  damageType: 'physical' | 'magical' | 'both' | null;
  target: 'self' | 'single' | 'party' | 'area' | null;
  charges: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface AbilityEquivalenceInfo {
  srcAbilityId: string;
  dstAbilityId: string;
  relation: 'EQUIVALENT' | 'CONSOLIDATED' | 'REMOVED' | 'ADDED';
  note: string | null;
  srcMode: AbilityMode;
  dstMode: AbilityMode;
}

export interface CommunityTimelineInfo {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  encounterId: string | null;
  mode: AbilityMode;
  actions: unknown[];
  isPublic: boolean;
  sourceTimelineId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  collectionCount: number;
}

/** Plan row as the UI consumes it. */
export interface PlanInfo {
  id: string;
  ownerId: string;
  name: string;
  encounterId: string;
  mode: 'REBORN' | 'EVOLVED' | 'CURRENT' | 'ALL';
  isLegacy: boolean;
  createdAt: string;
  updatedAt: string;
  sourceTimelineId: string | null | undefined;
  sourceTimelineVersion: string | null | undefined;
  sourceTimelineHash: string | null | undefined;
  accessRole: 'OWNER' | 'EDITOR' | 'VIEWER' | null;
}

/** Single timeline event as the UI consumes it. camelCase + UI tags. */
export interface TimelineEventInfo {
  id: string;
  position: number;
  /** Milliseconds from t=0 (encounter start). */
  timestampMs: number;
  type: 'MECHANIC' | 'BUSTER' | 'RAIDWIDE' | 'MECHANIC_START' | 'MECHANIC_END' | 'CUSTOM';
  name: string;
  durationMs: number | null;
  hitTimesMs: number[];
  /** Inline target kind from the canonical schema. */
  targetKind: 'MAIN_TANK' | 'OFF_TANK' | 'PARTY' | 'HEALER' | 'TARGETED' | 'ALL';
  confidence: number;
  notes?: string | null;
  /** Original planner-relevant fields exposed from the backend event. */
  normalizedNames?: string[];
  mechanicId?: string | null;
  patchVersion?: string;
  varianceMs?: number;
  mergedFromSources?: {
    cactbot: boolean;
    triggernometry: boolean;
    fflogs: boolean;
  };
}

/** Yjs snapshot payload — the raw Yjs update bytes ready for Y.applyUpdate. */
export interface YDocSnapshotInfo {
  update: Uint8Array;
  byteSize: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Configuration detection
// ---------------------------------------------------------------------------

/**
 * True when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
 * in the build env (i.e. .env.local at dev time, build-time env at
 * prod). When false, the data-source serves from `sample-data.ts` so
 * the UI still boots and the demo flow works without cloud.
 *
 * Read lazily on every call so tests can toggle the value via
 * `vi.stubEnv('VITE_SUPABASE_URL', ...)`. Cheap (two property reads).
 */
const isSupabaseConfigured = (): boolean => {
  const url = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '';
  const key = (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '';
  return url.length > 0 && key.length > 0;
};

// ---------------------------------------------------------------------------
// Sample data adapters (camelCase + category inference for abilities)
// ---------------------------------------------------------------------------

/**
 * Tank party-mit abilities whose `recast_s` falls in the tank-cd range
 * (60-120s) — checked BEFORE the recast heuristic below so they don't
 * get misclassified as 'tank-cd'. Keep in sync with seed migration 0004.
 */
const TANK_PARTY_MIT_IDS: ReadonlySet<string> = new Set([
  'reprisal',
  'arms-length',
  'dark-missionary',
  'passage-of-arms',
]);

/** Map sample-data `category` back into the same string for the live API.
 * The sample catalog uses 6 buckets; we infer them client-side from
 * `is_invuln` / `is_shield` / `is_heal` / `recast_s` / `job_id`. */
const inferAbilityCategory = (row: AbilityRow): AbilityInfo['category'] => {
  if (row.is_invuln) return 'invuln';
  if (row.is_shield) return 'shield';
  if (TANK_PARTY_MIT_IDS.has(row.ability_id)) return 'party-mit';
  const abbrev = JOB_ABBREV[row.job_id] ?? '';
  if (abbrev === 'SCH' || abbrev === 'AST' || abbrev === 'SGE' || abbrev === 'WHM') {
    if (row.is_heal) return 'healer-cd';
  }
  if (abbrev === 'PLD' || abbrev === 'WAR' || abbrev === 'DRK' || abbrev === 'GNB') {
    if (row.recast_s && row.recast_s >= 60 && row.recast_s <= 120) return 'tank-cd';
  }
  return 'party-mit';
};

/** Sample-data jobs (must mirror the seed migration 0004).
 * The 8 jobs in the seed are PLD/WAR/DRK/GNB/SCH/AST/BLM/MNK
 * (migration 0004:124-132). The remaining 12 IDs (5.x and 9-20) are
 * reserved for future seed expansion and not currently seeded. */
const JOB_ABBREV: Record<string, string> = {
  '50000000-0000-0000-0000-000000000001': 'PLD',
  '50000000-0000-0000-0000-000000000002': 'WAR',
  '50000000-0000-0000-0000-000000000003': 'DRK',
  '50000000-0000-0000-0000-000000000004': 'GNB',
  '50000000-0000-0000-0000-000000000005': 'SCH',
  '50000000-0000-0000-0000-000000000006': 'AST',
  '50000000-0000-0000-0000-000000000007': 'BLM',
  '50000000-0000-0000-0000-000000000008': 'MNK',
  '50000000-0000-0000-0000-000000000009': 'DRG',
  '50000000-0000-0000-0000-000000000010': 'SAM',
  '50000000-0000-0000-0000-000000000011': 'RPR',
  '50000000-0000-0000-0000-000000000012': 'VPR',
  '50000000-0000-0000-0000-000000000013': 'RDM',
  '50000000-0000-0000-0000-000000000014': 'SMN',
  '50000000-0000-0000-0000-000000000015': 'PCT',
  '50000000-0000-0000-0000-000000000016': 'BRD',
  '50000000-0000-0000-0000-000000000017': 'MCH',
  '50000000-0000-0000-0000-000000000018': 'DNC',
  '50000000-0000-0000-0000-000000000019': 'WHM',
  '50000000-0000-0000-0000-000000000020': 'SGE',
};

/** Sample encounter rows (mirror the expanded SAMPLE_ENCOUNTERS). */
const SAMPLE_ENCOUNTERS_UI: EncounterInfo[] = SAMPLE_ENCOUNTERS.map((e) => ({
  id: e.id,
  name: e.name,
  slug: `${e.raid.toLowerCase().replace(/\s+/g, '-')}-${e.name.toLowerCase().replace(/\s+/g, '-')}`,
  patchVersion: e.patchVersion,
  raidSlug: e.raid.toLowerCase().replace(/\s+/g, '-'),
  raidName: `${e.raid} (${e.tier})`,
  expansionSlug:
    parseInt(e.patchVersion) >= 7
      ? 'dawntrail'
      : parseInt(e.patchVersion) >= 6
        ? 'endwalker'
        : 'shadowbringers',
  expansionName:
    parseInt(e.patchVersion) >= 7
      ? 'Dawntrail'
      : parseInt(e.patchVersion) >= 6
        ? 'Endwalker'
        : 'Shadowbringers',
  effectiveFrom: e.patchVersion,
  effectiveTo: null,
  raidTier: null,
}));

/**
 * Deterministic, valid-shaped UUID for a sample ability. The sample
 * abilities use text ids like `a-hallowed-ground`; we derive a real
 * UUID by index so the wire format matches what production rows have
 * (and what the use-plan-doc test fixture uses).
 */
const sampleAbilityId = (sampleAbility: (typeof SAMPLE_ABILITIES)[number]): string => {
  const idx = SAMPLE_ABILITIES.findIndex((a) => a.id === sampleAbility.id);
  return `60000000-0000-0000-0000-${(idx + 1).toString(16).padStart(12, '0')}`;
};

/** Sample ability rows for the fallback path. Mirrors the expanded
 * SAMPLE_ABILITIES catalog. */
const SAMPLE_ABILITY_ROWS: AbilityInfo[] = SAMPLE_ABILITIES.map((s) => {
  const jobId = Object.entries(JOB_ABBREV).find(([, ab]) => ab === s.jobAbbrev)?.[0] ?? '';
  return {
    id: sampleAbilityId(s),
    jobId,
    jobAbbrev: s.jobAbbrev,
    abilityId: s.id.replace('a-', ''),
    mode: 'CURRENT',
    name: s.name,
    description: s.description,
    effectPct: s.effectPct > 0 ? s.effectPct : null,
    recastS: s.recastS,
    durationS: s.durationS,
    isInvuln: s.category === 'invuln',
    isHeal: s.category === 'healer-cd',
    isShield: s.category === 'shield',
    category: s.category,
    damageType: s.damageType ?? null,
    target: s.target ?? null,
    charges: s.charges ?? null,
    effectiveFrom: '7.0',
    effectiveTo: null,
  };
});

const SAMPLE_PLANS_CAMEL: PlanInfo[] = SAMPLE_PLANS.map((p) => ({
  id: p.meta.id,
  ownerId: '00000000-0000-0000-0000-000000000000',
  name: p.meta.name,
  encounterId: p.meta.encounterId,
  mode: 'CURRENT',
  isLegacy: p.meta.isLegacy,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: p.updatedAt,
  sourceTimelineId: undefined,
  sourceTimelineVersion: undefined,
  sourceTimelineHash: undefined,
  accessRole: 'OWNER',
}));

// ---------------------------------------------------------------------------
// Adapters: RPC rows → UI shapes (camelCase + normalized fields)
// ---------------------------------------------------------------------------

const toEncounterInfo = (row: Encounter): EncounterInfo => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  patchVersion: row.patch_version,
  raidSlug: row.raid_slug,
  raidName: row.raid_name ?? row.raid_slug.toUpperCase(),
  expansionSlug: row.expansion_slug,
  expansionName: capitalize(row.expansion_slug),
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
  raidTier: row.raid_tier ?? null,
});

const toAbilityInfo = (row: AbilityRow): AbilityInfo => ({
  id: row.id,
  jobId: row.job_id,
  jobAbbrev: row.job_abbrev ?? JOB_ABBREV[row.job_id] ?? '???',
  abilityId: row.ability_id,
  mode: row.mode,
  name: row.name,
  description: row.description,
  effectPct: row.effect_pct,
  recastS: row.recast_s,
  durationS: row.duration_s,
  isInvuln: row.is_invuln,
  isHeal: row.is_heal,
  isShield: row.is_shield,
  category: inferAbilityCategory(row),
  damageType: row.damage_type ?? null,
  target: row.target ?? null,
  charges: row.charges ?? null,
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
});

const toPlanInfo = (row: PlanRow): PlanInfo => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  encounterId: row.encounter_id,
  mode: row.mode,
  isLegacy: row.is_legacy,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sourceTimelineId: row.source_timeline_id,
  sourceTimelineVersion: row.source_timeline_version,
  sourceTimelineHash: row.source_timeline_hash,
  accessRole: row.access_role ?? null,
});

const toCommunityTimelineInfo = (row: CommunityTimelineRow): CommunityTimelineInfo => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  description: row.description,
  encounterId: row.encounter_id,
  mode: row.mode,
  actions: row.actions,
  isPublic: row.is_public,
  sourceTimelineId: row.source_timeline_id,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  likeCount: row.like_count,
  collectionCount: row.collection_count,
});

const toTimelineEvent = (e: unknown): TimelineEventInfo => {
  const parsed = RawTimelineEvent.safeParse(e);
  if (!parsed.success) {
    return {
      id: 'malformed',
      position: 0,
      timestampMs: 0,
      type: 'MECHANIC',
      name: 'Malformed event',
      durationMs: null,
      hitTimesMs: [],
      targetKind: 'ALL',
      confidence: 0,
      notes: `Parse error: ${parsed.error.message}`,
      normalizedNames: [],
      mechanicId: null,
      patchVersion: '',
      mergedFromSources: { cactbot: false, triggernometry: false, fflogs: false },
    };
  }
  const r = parsed.data;
  return {
    id: r.id,
    position: r.position,
    timestampMs: r.timestampMs,
    type: r.type,
    name: r.name,
    durationMs: r.durationMs,
    hitTimesMs: r.hitTimesMs,
    targetKind: r.targets.kind,
    confidence: r.confidence,
    notes: r.notes,
    normalizedNames: r.normalizedNames,
    mechanicId: r.mechanicId,
    patchVersion: r.patchVersion,
    mergedFromSources: r.mergedFromSources,
    ...(r.varianceMs !== undefined ? { varianceMs: r.varianceMs } : {}),
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all encounters in the catalog. When Supabase is configured,
 * hits `rpc('encounters_list')`; otherwise serves the 6 sample
 * encounters (FRU P1/P2 + M1S/M2S + P1S/P4S).
 *
 * Cached at the module level — multiple components (EncounterPicker,
 * PlanList) share a single RPC. Tests can call
 * `_invalidateCatalogCache()` to force a refetch.
 */
async function listEncountersImpl(): Promise<EncounterInfo[]> {
  if (!isSupabaseConfigured()) return SAMPLE_ENCOUNTERS_UI;
  const rows = await encountersList(defaultSupabase, {});
  return rows.map(toEncounterInfo);
}

let encountersCache: Promise<EncounterInfo[]> | null = null;

export const listEncounters = (): Promise<EncounterInfo[]> =>
  encountersCache ?? (encountersCache = listEncountersImpl());

/**
 * Fetch a single encounter by id. Returns null if not found.
 */
export const getEncounter = async (id: string): Promise<EncounterInfo | null> => {
  if (!isSupabaseConfigured()) {
    return SAMPLE_ENCOUNTERS_UI.find((e) => e.id === id) ?? null;
  }
  const row = await encountersById(defaultSupabase, { p_id: id });
  return row ? toEncounterInfo(row) : null;
};

/**
 * List all abilities in the catalog. The fallback serves 23 abilities
 * from the demo seed; live mode hits `rpc('abilities_list')`.
 *
 * Cached at the module level — multiple components share a single RPC.
 * Tests can call `_invalidateCatalogCache()` to force a refetch.
 */
async function listAbilitiesImpl(mode?: AbilityMode): Promise<AbilityInfo[]> {
  if (!isSupabaseConfigured()) {
    if (!mode || mode === 'CURRENT' || mode === 'ALL') return SAMPLE_ABILITY_ROWS;
    return SAMPLE_ABILITY_ROWS.filter((ability) => ability.mode === mode);
  }
  const rows = await abilitiesList(defaultSupabase, mode ? { p_mode: mode } : {});
  return rows.map(toAbilityInfo);
}

const abilitiesCache = new Map<string, Promise<AbilityInfo[]>>();
const timelineCache = new Map<string, Promise<TimelineEventInfo[]>>();

/** Test-only: drop the catalog cache so the next fetch hits the network. */
export const _invalidateCatalogCache = (): void => {
  abilitiesCache.clear();
  encountersCache = null;
  timelineCache.clear();
  canonicalTimelineCache.clear();
};

export const listAbilities = (mode?: AbilityMode): Promise<AbilityInfo[]> => {
  const key = mode ?? 'DEFAULT';
  const cached = abilitiesCache.get(key);
  if (cached) return cached;
  const request = listAbilitiesImpl(mode);
  abilitiesCache.set(key, request);
  return request;
};

export const listAbilityEquivalence = async (
  mode?: AbilityMode,
): Promise<AbilityEquivalenceInfo[]> => {
  if (!isSupabaseConfigured()) return [];
  const rows = await abilityEquivalenceList(defaultSupabase, mode ? { p_mode: mode } : {});
  return rows.map((row: AbilityEquivalenceRow) => ({
    srcAbilityId: row.src_ability_id,
    dstAbilityId: row.dst_ability_id,
    relation: row.relation,
    note: row.note,
    srcMode: row.src_mode,
    dstMode: row.dst_mode,
  }));
};

export const listCommunityTimelines = async (
  input: {
    publicOnly?: boolean;
    mode?: AbilityMode;
    query?: string;
    limit?: number;
  } = {},
): Promise<CommunityTimelineInfo[]> => {
  if (!isSupabaseConfigured()) return [];
  const rows = await communityTimelinesList(defaultSupabase, {
    p_public_only: input.publicOnly ?? true,
    ...(input.mode ? { p_mode: input.mode } : {}),
    ...(input.query ? { p_query: input.query } : {}),
    ...(input.limit ? { p_limit: input.limit } : {}),
  });
  return rows.map(toCommunityTimelineInfo);
};

export const getCommunityTimeline = async (id: string): Promise<CommunityTimelineInfo | null> => {
  if (!isSupabaseConfigured()) return null;
  const row = await communityTimelineById(defaultSupabase, { p_id: id });
  return row ? toCommunityTimelineInfo(row) : null;
};

export const createCommunityTimeline = async (input: {
  name: string;
  description?: string;
  encounterId?: string | null;
  mode: AbilityMode;
  actions: unknown[];
  isPublic: boolean;
  sourceTimelineId?: string | null;
}): Promise<{ id: string; createdAt: string }> => {
  if (!isSupabaseConfigured()) throw new Error('Community timelines require Supabase');
  const row = await communityTimelineCreate(defaultSupabase, {
    p_name: input.name,
    p_description: input.description,
    p_encounter_id: input.encounterId,
    p_mode: input.mode,
    p_actions: input.actions,
    p_is_public: input.isPublic,
    p_source_timeline_id: input.sourceTimelineId,
  });
  return { id: row.id, createdAt: row.created_at };
};

export const updateCommunityTimeline = async (input: {
  id: string;
  name: string;
  description?: string;
  encounterId?: string | null;
  mode: AbilityMode;
  actions: unknown[];
  isPublic: boolean;
  sourceTimelineId?: string | null;
}): Promise<void> => {
  if (!isSupabaseConfigured()) throw new Error('Community timelines require Supabase');
  await communityTimelineUpdate(defaultSupabase, {
    p_id: input.id,
    p_name: input.name,
    p_description: input.description,
    p_encounter_id: input.encounterId,
    p_mode: input.mode,
    p_actions: input.actions,
    p_is_public: input.isPublic,
    p_source_timeline_id: input.sourceTimelineId,
  });
};

export const deleteCommunityTimeline = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) throw new Error('Community timelines require Supabase');
  await communityTimelineDelete(defaultSupabase, { p_id: id });
};

export const toggleCommunityTimelineLike = async (
  id: string,
): Promise<{ liked: boolean; likeCount: number }> => {
  if (!isSupabaseConfigured()) throw new Error('Community timelines require Supabase');
  const result = await communityTimelineLikeToggle(defaultSupabase, { p_id: id });
  return { liked: result.liked, likeCount: result.like_count };
};

export const toggleCommunityTimelineCollection = async (
  id: string,
  add: boolean,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) throw new Error('Community timelines require Supabase');
  return communityTimelineCollectionToggle(defaultSupabase, { p_id: id, p_add: add });
};

export const listCommunityTimelineCollectionIds = async (): Promise<string[]> => {
  if (!isSupabaseConfigured()) return [];
  const rows = await communityTimelineCollectionIds(defaultSupabase);
  return rows.map((row) => row.timeline_id);
};

/**
 * List the current user's plans (newest first). Returns the 3 sample
 * plans in fallback mode.
 */
export const listMyPlans = async (): Promise<PlanInfo[]> => {
  if (!isSupabaseConfigured()) return SAMPLE_PLANS_CAMEL;
  const rows = await plansList(defaultSupabase, { p_limit: 50 });
  return rows.map(toPlanInfo);
};

/**
 * Fetch a single plan by id. Returns null if not found or no access.
 */
export const getPlan = async (id: string): Promise<PlanInfo | null> => {
  if (!isSupabaseConfigured()) {
    return SAMPLE_PLANS_CAMEL.find((p) => p.id === id) ?? null;
  }
  const row = await plansById(defaultSupabase, { p_id: id });
  return row ? toPlanInfo(row) : null;
};

/**
 * Fetch the base timeline events for an encounter. Returns an empty
 * array if the encounter has no timeline (e.g. legacy encounters
 * without seed data).
 *
 * Cached at the module level keyed by encounterId — multiple
 * components share a single RPC per encounter.
 *
 * Canonical selection (RPC path):
 *   1. Prefer CURRENT mode timelines over other modes.
 *   2. Within same mode, prefer MANUAL source, then CACTBOT/FFLOGS.
 *   3. Pick the newest version within the preferred group.
 */
async function getTimelineForEncounterImpl(
  encounterId: string,
  mode?: AbilityMode,
): Promise<TimelineEventInfo[]> {
  if (!isSupabaseConfigured()) {
    return (SAMPLE_EVENTS[encounterId] ?? []).map((e) => ({
      id: e.id,
      position: e.positionMs,
      timestampMs: e.positionMs,
      type: e.type,
      name: e.name,
      durationMs: null,
      hitTimesMs: [],
      targetKind: e.type === 'BUSTER' ? 'MAIN_TANK' : e.type === 'RAIDWIDE' ? 'ALL' : 'PARTY',
      confidence: 0.85,
      notes: null,
      normalizedNames: [e.name.toLowerCase().replace(/\s+/g, '-')],
      mechanicId: null,
      patchVersion: '7.21',
      mergedFromSources: { cactbot: false, triggernometry: false, fflogs: false },
    }));
  }
  const rows: TimelineRow[] = mode
    ? await timelinesByEncounterMode(defaultSupabase, {
        p_encounter_id: encounterId,
        p_mode: mode,
      })
    : await timelinesByEncounter(defaultSupabase, { p_encounter_id: encounterId });
  if (rows.length === 0) return [];

  // Select the requested mode. CURRENT preserves the historical fallback to
  // any available row so older catalogs remain readable while they migrate.
  const requested = mode && mode !== 'ALL' ? rows.filter((r) => r.mode === mode) : rows;
  const current = rows.filter((r) => r.mode === 'CURRENT');
  const candidates =
    requested.length > 0
      ? requested
      : mode === 'CURRENT'
        ? current.length > 0
          ? current
          : rows
        : [];

  if (candidates.length === 0) return [];

  const sourceRank: Record<string, number> = {
    MANUAL: 0,
    CACTBOT: 1,
    FFLOGS: 2,
    TRIGGERNOMETRY: 3,
    MERGED: 4,
  };
  const selected = [...candidates].sort((a, b) => {
    if (mode === 'ALL' && a.mode !== b.mode) {
      const modeDiff = (a.mode === 'CURRENT' ? 0 : 1) - (b.mode === 'CURRENT' ? 0 : 1);
      if (modeDiff !== 0) return modeDiff;
    }
    const sourceDiff = (sourceRank[a.source] ?? 99) - (sourceRank[b.source] ?? 99);
    if (sourceDiff !== 0) return sourceDiff;
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  })[0];
  return selected?.events.map(toTimelineEvent) ?? [];
}

export const getTimelineForEncounter = (
  encounterId: string,
  mode?: AbilityMode,
): Promise<TimelineEventInfo[]> => {
  const key = `${encounterId}:${mode ?? 'DEFAULT'}`;
  const cached = timelineCache.get(key);
  if (cached) return cached;
  const p = getTimelineForEncounterImpl(encounterId, mode);
  timelineCache.set(key, p);
  return p;
};

/**
 * Full canonical timeline info including provenance metadata.
 * Returns the best-match timeline row with its events, hash, version, etc.
 */
export interface CanonicalTimelineInfo {
  id: string;
  version: string;
  contentHash: string;
  source: string;
  mode: AbilityMode;
  events: TimelineEventInfo[];
}

/**
 * Fetch the best canonical timeline for an encounter, including
 * provenance metadata (id, version, contentHash). Returns null when
 * no timeline exists for the encounter.
 */
async function getCanonicalTimelineForEncounterImpl(
  encounterId: string,
  mode?: AbilityMode,
): Promise<CanonicalTimelineInfo | null> {
  if (!isSupabaseConfigured()) return null;
  const rows: TimelineRow[] = mode
    ? await timelinesByEncounterMode(defaultSupabase, {
        p_encounter_id: encounterId,
        p_mode: mode,
      })
    : await timelinesByEncounter(defaultSupabase, { p_encounter_id: encounterId });
  if (rows.length === 0) return null;

  const requested = mode && mode !== 'ALL' ? rows.filter((r) => r.mode === mode) : rows;
  const current = rows.filter((r) => r.mode === 'CURRENT');
  const candidates =
    requested.length > 0
      ? requested
      : mode === 'CURRENT'
        ? current.length > 0
          ? current
          : rows
        : [];

  if (candidates.length === 0) return null;

  const sourceRank: Record<string, number> = {
    MANUAL: 0,
    CACTBOT: 1,
    FFLOGS: 2,
    TRIGGERNOMETRY: 3,
    MERGED: 4,
  };
  const selected = [...candidates].sort((a, b) => {
    if (mode === 'ALL' && a.mode !== b.mode) {
      const modeDiff = (a.mode === 'CURRENT' ? 0 : 1) - (b.mode === 'CURRENT' ? 0 : 1);
      if (modeDiff !== 0) return modeDiff;
    }
    const sourceDiff = (sourceRank[a.source] ?? 99) - (sourceRank[b.source] ?? 99);
    if (sourceDiff !== 0) return sourceDiff;
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  })[0]!;

  return {
    id: selected.id,
    version: selected.version,
    contentHash: selected.content_hash,
    source: selected.source,
    mode: selected.mode,
    events: selected.events.map(toTimelineEvent),
  };
}

const canonicalTimelineCache = new Map<string, Promise<CanonicalTimelineInfo | null>>();

export const getCanonicalTimelineForEncounter = (
  encounterId: string,
  mode?: AbilityMode,
): Promise<CanonicalTimelineInfo | null> => {
  const key = `${encounterId}:${mode ?? 'DEFAULT'}`;
  const cached = canonicalTimelineCache.get(key);
  if (cached) return cached;
  const p = getCanonicalTimelineForEncounterImpl(encounterId, mode);
  canonicalTimelineCache.set(key, p);
  return p;
};

/**
 * Fetch the latest Yjs snapshot for a plan. Returns null if no
 * snapshot exists (e.g. brand-new plan). Used by the plan editor
 * on cold load to hydrate the Y.Doc before the realtime provider
 * starts broadcasting.
 *
 * The RPC is defined in migration 0002 (`load_ydoc_snapshot`) and
 * wired through the typed `loadYDocSnapshot` wrapper in
 * `supabase-rpc.ts`, which handles BYTEA → base64 conversion +
 * Zod validation.
 */
export const getYDocSnapshot = (planId: string): Promise<YDocSnapshotInfo | null> => {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  return loadYDocSnapshot(defaultSupabase, { p_plan_id: planId });
};

/**
 * Create a new plan via the `plans-create` Edge Function. Returns the
 * new plan id. In fallback mode, mints a local UUID and returns it
 * (the plan row is not actually persisted — the editor will operate
 * against a fresh Y.Doc).
 */
export const createPlan = async (input: {
  name: string;
  encounterId: string;
  mode: 'REBORN' | 'EVOLVED' | 'CURRENT' | 'ALL';
}): Promise<{ planId: string; createdAt: string }> => {
  if (!isSupabaseConfigured()) {
    const planId = crypto.randomUUID();
    return { planId, createdAt: new Date().toISOString() };
  }
  return rpcCreatePlan(defaultSupabase, input);
};

// ---------------------------------------------------------------------------
// Sharing (account-grant model). Phase 2 scope — previously stubbed.
// ---------------------------------------------------------------------------

/** Plan access grant as the UI consumes it. */
export interface PlanAccessInfo {
  planId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  viaShareToken: boolean;
  grantedAt: string;
  displayName: string | null;
  email: string | null;
}

/**
 * Mint a share link for a plan. Returns the opaque capability token;
 * the caller builds the link `/plan/:planId?token=...`. Requires
 * Supabase (account-required sharing).
 */
export const sharePlan = async (input: {
  planId: string;
  role: 'read' | 'edit';
  expiresInDays: number;
}): Promise<{ token: string; expiresAt: string }> => {
  if (!isSupabaseConfigured()) throw new Error('sharePlan requires Supabase');
  return rpcSharePlan(defaultSupabase, input);
};

/**
 * Redeem a share-link token. Grants the caller a `plan_access` row so
 * the plan becomes readable/editable through the standard RLS +
 * realtime paths. Requires Supabase (account-required sharing).
 */
export const redeemShare = async (
  planId: string,
  token: string,
): Promise<{ role: 'OWNER' | 'EDITOR' | 'VIEWER'; expiresAt: string | null }> => {
  if (!isSupabaseConfigured()) throw new Error('redeemShare requires Supabase');
  return redeemShareToken(defaultSupabase, { planId, token });
};

/** Return the caller's effective plan role. This must never be inferred from UI state. */
export const getPlanRole = async (
  planId: string,
): Promise<'OWNER' | 'EDITOR' | 'VIEWER' | null> => {
  if (!isSupabaseConfigured()) return 'OWNER';
  return planRoleForCurrentUser(defaultSupabase, { p_plan_id: planId });
};

/**
 * List the access grants for a plan (owner + editors + viewers).
 * Returns an empty array in fallback mode (no Supabase configured).
 */
export const listPlanAccess = async (planId: string): Promise<PlanAccessInfo[]> => {
  if (!isSupabaseConfigured()) return [];
  const rows = await planAccessListForPlan(defaultSupabase, { p_plan_id: planId });
  return rows.map((r: PlanAccessRow) => ({
    planId: r.plan_id,
    userId: r.user_id,
    role: r.role,
    viaShareToken: r.via_share_token,
    grantedAt: r.granted_at,
    displayName: r.display_name,
    email: r.email,
  }));
};

/**
 * Claim MitPlan v1 (Firebase) legacy plans for the current user. Bridges
 * old plans into XIVMitPlan v1.0 via the `claim_legacy_plans` RPC
 * (migration 0001). Requires Supabase.
 */
export const claimLegacyPlans = async (planIds: string[]): Promise<number> => {
  if (!isSupabaseConfigured()) throw new Error('claimLegacyPlans requires Supabase');
  const { claimed } = await rpcClaimLegacyPlans(defaultSupabase, { planIds });
  return claimed;
};

/** List imported plans that the current verified identity may claim. */
export const listClaimableLegacyPlans = async (): Promise<Array<{ id: string; name: string }>> => {
  if (!isSupabaseConfigured()) return [];
  return legacyClaimablePlanIds(defaultSupabase);
};

/**
 * Write a versioned snapshot of the plan's current Yjs state to
 * `plan_snapshots` (distinct from the debounced `ydoc_snapshots`
 * autosave). Use this for an explicit "save version" action. Requires
 * Supabase.
 */
export const saveSnapshot = async (
  planId: string,
  reason: 'IDLE' | 'USER_SAVE' | 'ASSIGNMENT_DELETE' | 'REBUILD' = 'USER_SAVE',
): Promise<{ snapshotId: string; byteSize: number; createdAt: string }> => {
  if (!isSupabaseConfigured()) throw new Error('saveSnapshot requires Supabase');
  return rpcSnapshotPlan(defaultSupabase, { planId, reason });
};

// ---------------------------------------------------------------------------
// Plan management — migration 0013 + apps/edge/plans-{update,delete,duplicate}
// ---------------------------------------------------------------------------

/** Plan snapshot in safe base64 form for export/download. */
export interface PlanExportSnapshotInfo {
  snapshotId: string;
  ydocB64: string;
  byteSize: number;
  reason: string;
  createdAt: string;
}

/**
 * Export the current plan snapshot as a safe base64 payload. Prefers
 * the latest versioned plan_snapshot; falls back to the debounced
 * ydoc_snapshot. Returns null when no snapshot data exists.
 *
 * In fallback mode (no Supabase configured), returns null.
 */
export const exportPlanSnapshot = async (
  planId: string,
): Promise<PlanExportSnapshotInfo | null> => {
  if (!isSupabaseConfigured()) return null;
  const row = await rpcPlanExportSnapshot(defaultSupabase, { p_plan_id: planId });
  if (!row) return null;
  return {
    snapshotId: row.snapshot_id,
    ydocB64: row.ydoc_b64,
    byteSize: row.byte_size,
    reason: row.reason,
    createdAt: row.created_at,
  };
};

/**
 * Update plan metadata (at minimum the name). The caller must be the
 * plan owner or have an EDITOR role. In fallback mode this is a no-op
 * (memory-only plans cannot be persisted).
 */
export const updatePlan = async (input: { planId: string; name: string }): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  await rpcUpdatePlan(defaultSupabase, input);
};

/**
 * Delete a plan permanently. Only the plan owner may do this. The
 * CASCADE rules remove associated ydoc_snapshots, plan_snapshots,
 * plan_access, and share_tokens rows.
 *
 * In fallback mode this is a no-op (memory-only plans have no storage).
 */
export const deletePlan = async (planId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  await rpcDeletePlan(defaultSupabase, { planId });
};

/**
 * Duplicate a plan. The caller must be the owner or an editor of the
 * source plan. The copy always assigns the duplicator as owner. Optionally
 * specify a new name; defaults to `<original name> (Copy)`.
 *
 * Returns the new plan id and creation timestamp.
 *
 * In fallback mode, returns a local UUID without persisting anything
 * (the plan editor starts fresh against a new Y.Doc).
 */
export const duplicatePlan = async (input: {
  planId: string;
  name?: string;
}): Promise<{ planId: string; createdAt: string }> => {
  if (!isSupabaseConfigured()) {
    return { planId: crypto.randomUUID(), createdAt: new Date().toISOString() };
  }
  return rpcDuplicatePlan(defaultSupabase, input);
};
