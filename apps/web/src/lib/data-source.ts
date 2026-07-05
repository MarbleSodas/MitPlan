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
  createPlan as rpcCreatePlan,
  loadYDocSnapshot,
} from './supabase-rpc.js';
import type { Encounter, AbilityRow, PlanRow, TimelineRow } from './supabase-rpc.js';
import {
  FRU_P1_ID,
  FRU_P2_ID,
  M1S_ID,
  M2S_ID,
  P1S_ID,
  P4S_ID,
  SAMPLE_PLANS,
  SAMPLE_ABILITIES,
  SAMPLE_EVENTS,
} from './sample-data.js';
import { capitalize } from './utils.js';

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
}

/** Ability as the UI consumes it. camelCase + job abbreviation. */
export interface AbilityInfo {
  id: string;
  jobId: string;
  jobAbbrev: string;
  abilityId: string;
  name: string;
  description: string | null;
  effectPct: number | null;
  recastS: number | null;
  durationS: number | null;
  isInvuln: boolean;
  isHeal: boolean;
  isShield: boolean;
  category: 'tank-cd' | 'healer-cd' | 'party-mit' | 'invuln' | 'shield';
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
}

/** Single timeline event as the UI consumes it. camelCase + UI tags. */
export interface TimelineEventInfo {
  id: string;
  position: number;
  /** Milliseconds from t=0 (encounter start). */
  timestampMs: number;
  type: 'MECHANIC' | 'BUSTER' | 'RAIDWIDE' | 'MECHANIC_START' | 'MECHANIC_END';
  name: string;
  durationMs: number | null;
  hitTimesMs: number[];
  /** Inline target kind from the canonical schema. */
  targetKind: 'MAIN_TANK' | 'OFF_TANK' | 'PARTY' | 'HEALER' | 'TARGETED' | 'ALL';
  confidence: number;
  notes?: string | null;
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
 * The sample catalog uses 5 buckets that don't exist on the DB schema;
 * we infer them client-side from `is_invuln` / `is_shield` / `is_heal`
 * / `recast_s` / `job_id`. */
const inferAbilityCategory = (row: AbilityRow): AbilityInfo['category'] => {
  if (row.is_invuln) return 'invuln';
  if (row.is_shield) return 'shield';
  if (TANK_PARTY_MIT_IDS.has(row.ability_id)) return 'party-mit';
  const abbrev = JOB_ABBREV[row.job_id] ?? '';
  if (abbrev === 'SCH' || abbrev === 'AST') {
    if (row.is_heal) return 'healer-cd';
  }
  if (abbrev === 'PLD' || abbrev === 'WAR' || abbrev === 'DRK' || abbrev === 'GNB') {
    if (row.recast_s && row.recast_s >= 60 && row.recast_s <= 120) return 'tank-cd';
  }
  return 'party-mit';
};

/** Sample-data jobs (must mirror the seed migration 0004). */
const JOB_ABBREV: Record<string, string> = {
  '50000000-0000-0000-0000-000000000001': 'PLD',
  '50000000-0000-0000-0000-000000000002': 'WAR',
  '50000000-0000-0000-0000-000000000003': 'DRK',
  '50000000-0000-0000-0000-000000000004': 'GNB',
  '50000000-0000-0000-0000-000000000005': 'SCH',
  '50000000-0000-0000-0000-000000000006': 'AST',
  '50000000-0000-0000-0000-000000000007': 'BLM',
  '50000000-0000-0000-0000-000000000008': 'MNK',
};

/** Sample encounter rows (mirror the seed migration 0004 for the 6
 * encounters the demo cares about). Used when Supabase isn't
 * configured. */
const SAMPLE_ENCOUNTERS: EncounterInfo[] = [
  {
    id: FRU_P1_ID,
    name: 'Light Rampant',
    slug: 'fru-p1-light-rampant',
    patchVersion: '7.21',
    raidSlug: 'fru',
    raidName: 'Futures Rewritten (Ultimate)',
    expansionSlug: 'dawntrail',
    expansionName: 'Dawntrail',
    effectiveFrom: '7.21',
    effectiveTo: null,
  },
  {
    id: FRU_P2_ID,
    name: 'Darklit Dragonsong',
    slug: 'fru-p2-darklit-dragonsong',
    patchVersion: '7.21',
    raidSlug: 'fru',
    raidName: 'Futures Rewritten (Ultimate)',
    expansionSlug: 'dawntrail',
    expansionName: 'Dawntrail',
    effectiveFrom: '7.21',
    effectiveTo: null,
  },
  {
    id: M1S_ID,
    name: 'Sugar Riot',
    slug: 'm1s-sugar-riot',
    patchVersion: '7.05',
    raidSlug: 'm1s',
    raidName: 'Alexandrian (Savage) M1',
    expansionSlug: 'dawntrail',
    expansionName: 'Dawntrail',
    effectiveFrom: '7.05',
    effectiveTo: null,
  },
  {
    id: M2S_ID,
    name: 'Howling Blade',
    slug: 'm2s-howling-blade',
    patchVersion: '7.08',
    raidSlug: 'm2s',
    raidName: 'Alexandrian (Savage) M2',
    expansionSlug: 'dawntrail',
    expansionName: 'Dawntrail',
    effectiveFrom: '7.08',
    effectiveTo: null,
  },
  {
    id: P1S_ID,
    name: 'Erichthonios',
    slug: 'p1s-erichthonios',
    patchVersion: '6.05',
    raidSlug: 'p1s',
    raidName: 'Pandaemonium (Savage) P1',
    expansionSlug: 'endwalker',
    expansionName: 'Endwalker',
    effectiveFrom: '6.05',
    effectiveTo: '7.0',
  },
  {
    id: P4S_ID,
    name: 'Hephaistos',
    slug: 'p4s-hephaistos',
    patchVersion: '6.18',
    raidSlug: 'p4s',
    raidName: 'Pandaemonium (Savage) P4',
    expansionSlug: 'endwalker',
    expansionName: 'Endwalker',
    effectiveFrom: '6.18',
    effectiveTo: '7.0',
  },
];

/** Sample ability rows for the fallback path. Mirrors the seed
 * migration 0004 ability catalog. */
const SAMPLE_ABILITY_ROWS: AbilityInfo[] = SAMPLE_ABILITIES.map((s) => {
  const jobId = Object.entries(JOB_ABBREV).find(([, ab]) => ab === s.jobAbbrev)?.[0] ?? '';
  return {
    id: s.id.replace('a-', '60000000-0000-0000-0000-000000000'), // Deterministic UUID
    jobId,
    jobAbbrev: s.jobAbbrev,
    abilityId: s.id.replace('a-', ''),
    name: s.name,
    description: s.description,
    effectPct: s.effectPct > 0 ? s.effectPct : null,
    recastS: s.recastS,
    durationS: null,
    isInvuln: s.category === 'invuln',
    isHeal: s.category === 'healer-cd',
    isShield: s.category === 'shield',
    category: s.category,
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
  raidName: row.raid_slug.toUpperCase(), // Best-effort; expand if needed
  expansionSlug: row.expansion_slug,
  expansionName: capitalize(row.expansion_slug),
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
});

const toAbilityInfo = (row: AbilityRow): AbilityInfo => ({
  id: row.id,
  jobId: row.job_id,
  jobAbbrev: JOB_ABBREV[row.job_id] ?? '???',
  abilityId: row.ability_id,
  name: row.name,
  description: row.description,
  effectPct: row.effect_pct,
  recastS: row.recast_s,
  durationS: row.duration_s,
  isInvuln: row.is_invuln,
  isHeal: row.is_heal,
  isShield: row.is_shield,
  category: inferAbilityCategory(row),
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
});

/** Shape of a single `events` array element as the timeline RPC returns it.
 * The RPC schema declares `events: z.array(z.unknown())` because the
 * payload is a complex nested graph; we narrow on each map step. */
interface RawTimelineEvent {
  id: string;
  position: number;
  timestampMs: number;
  type: TimelineEventInfo['type'];
  name: string;
  durationMs?: number | null;
  hitTimesMs?: number[];
  targets?: { kind: TimelineEventInfo['targetKind'] };
  confidence?: number;
  notes?: string | null;
}

const toTimelineEvent = (e: unknown): TimelineEventInfo => {
  const r = e as RawTimelineEvent;
  return {
    id: r.id,
    position: r.position,
    timestampMs: r.timestampMs,
    type: r.type,
    name: r.name,
    durationMs: r.durationMs ?? null,
    hitTimesMs: r.hitTimesMs ?? [],
    targetKind: r.targets?.kind ?? 'ALL',
    confidence: r.confidence ?? 1,
    notes: r.notes ?? null,
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
  if (!isSupabaseConfigured()) return SAMPLE_ENCOUNTERS;
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
    return SAMPLE_ENCOUNTERS.find((e) => e.id === id) ?? null;
  }
  const row = await encountersById(defaultSupabase, { id });
  return row ? toEncounterInfo(row) : null;
};

/**
 * List all abilities in the catalog. The fallback serves 23 abilities
 * from the demo seed; live mode hits `rpc('abilities_list')`.
 *
 * Cached at the module level — multiple components share a single RPC.
 * Tests can call `_invalidateCatalogCache()` to force a refetch.
 */
async function listAbilitiesImpl(): Promise<AbilityInfo[]> {
  if (!isSupabaseConfigured()) return SAMPLE_ABILITY_ROWS;
  const rows = await abilitiesList(defaultSupabase, {});
  return rows.map(toAbilityInfo);
}

let abilitiesCache: Promise<AbilityInfo[]> | null = null;
const timelineCache = new Map<string, Promise<TimelineEventInfo[]>>();

/** Test-only: drop the catalog cache so the next fetch hits the network. */
export const _invalidateCatalogCache = (): void => {
  abilitiesCache = null;
  encountersCache = null;
  timelineCache.clear();
};

export const listAbilities = (): Promise<AbilityInfo[]> =>
  abilitiesCache ?? (abilitiesCache = listAbilitiesImpl());

/**
 * List the current user's plans (newest first). Returns the 3 sample
 * plans in fallback mode.
 */
export const listMyPlans = async (): Promise<PlanInfo[]> => {
  if (!isSupabaseConfigured()) return SAMPLE_PLANS_CAMEL;
  const rows = await plansList(defaultSupabase, { limit: 50 });
  return rows.map(toPlanInfo);
};

/**
 * Fetch a single plan by id. Returns null if not found or no access.
 */
export const getPlan = async (id: string): Promise<PlanInfo | null> => {
  if (!isSupabaseConfigured()) {
    return SAMPLE_PLANS_CAMEL.find((p) => p.id === id) ?? null;
  }
  const row = await plansById(defaultSupabase, { id });
  return row ? toPlanInfo(row) : null;
};

/**
 * Fetch the base timeline events for an encounter. Returns an empty
 * array if the encounter has no timeline (e.g. legacy encounters
 * without seed data).
 *
 * Cached at the module level keyed by encounterId — multiple
 * components share a single RPC per encounter.
 */
async function getTimelineForEncounterImpl(
  encounterId: string,
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
    }));
  }
  const rows: TimelineRow[] = await timelinesByEncounter(defaultSupabase, {
    encounter_id: encounterId,
  });
  // Pick the newest version per encounter (RPC returns DESC).
  const latest = rows[0];
  if (!latest) return [];
  return latest.events.map(toTimelineEvent);
}

export const getTimelineForEncounter = (encounterId: string): Promise<TimelineEventInfo[]> => {
  const cached = timelineCache.get(encounterId);
  if (cached) return cached;
  const p = getTimelineForEncounterImpl(encounterId);
  timelineCache.set(encounterId, p);
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