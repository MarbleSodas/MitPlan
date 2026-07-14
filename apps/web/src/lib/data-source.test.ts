/**
 * data-source tests — verify the fallback path returns the
 * sample-data shape when Supabase isn't configured, and that the
 * RPC path is invoked when it is. We mock the supabase client with
 * vi.fn so the RPC path doesn't need a live Supabase project.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted — must come before any imports that use it.
const rpcMock = vi.fn();
const functionsInvokeMock = vi.fn();
vi.mock('./supabase.js', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    functions: {
      invoke: (...args: unknown[]) => functionsInvokeMock(...args),
    },
  },
}));

import {
  _invalidateCatalogCache,
  createPlan,
  getEncounter,
  getPlan,
  getTimelineForEncounter,
  getYDocSnapshot,
  listAbilities,
  listEncounters,
  listMyPlans,
} from './data-source';
import { FRU_P1_ID, FRU_P2_ID, M1S_ID, SAMPLE_ABILITIES } from './sample-data';

const setSupabaseConfigured = (configured: boolean) => {
  if (configured) {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  } else {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  }
};

describe('data-source — fallback mode (Supabase unconfigured)', () => {
  beforeEach(() => {
    setSupabaseConfigured(false);
    _invalidateCatalogCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rpcMock.mockReset();
    functionsInvokeMock.mockReset();
  });

  it('listEncounters returns the 15 seeded sample encounters', async () => {
    const list = await listEncounters();
    expect(list).toHaveLength(15);
    expect(list.find((e) => e.id === FRU_P1_ID)).toBeDefined();
    expect(list.find((e) => e.id === FRU_P2_ID)).toBeDefined();
    expect(list.find((e) => e.id === M1S_ID)).toBeDefined();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('getEncounter returns null for unknown ids', async () => {
    expect(await getEncounter('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('getEncounter returns the FRU P1 sample row by id', async () => {
    const enc = await getEncounter(FRU_P1_ID);
    expect(enc?.slug).toBe('fru-light-rampant');
    expect(enc?.raidSlug).toBe('fru');
    expect(enc?.raidName).toBe('FRU (Ultimate)');
  });

  it('getTimelineForEncounter returns the FRU P1 sample events', async () => {
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.name).toBe('Pull');
  });

  it('getTimelineForEncounter returns the FRU P2 sample events', async () => {
    const events = await getTimelineForEncounter(FRU_P2_ID);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.name).toBe('Phase 2 pull');
  });

  it('listAbilities returns the sample abilities', async () => {
    const abs = await listAbilities();
    expect(abs.length).toBeGreaterThan(20);
    expect(abs.find((a) => a.abilityId === 'reprisal')).toBeDefined();
  });

  it('listMyPlans returns the 3 sample plans', async () => {
    const plans = await listMyPlans();
    expect(plans).toHaveLength(3);
  });

  it('getPlan returns null for unknown plan ids', async () => {
    expect(await getPlan('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('getYDocSnapshot returns null (no live snapshot in fallback mode)', async () => {
    expect(await getYDocSnapshot('any-plan-id')).toBeNull();
  });

  it('createPlan mints a UUID locally without hitting the network', async () => {
    const { planId } = await createPlan({ name: 'Test', encounterId: FRU_P1_ID, mode: 'CURRENT' });
    expect(planId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('data-source — RPC mode (Supabase configured)', () => {
  beforeEach(() => {
    setSupabaseConfigured(true);
    _invalidateCatalogCache();
    rpcMock.mockReset();
    functionsInvokeMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('listEncounters calls encounters_list RPC and returns the parsed rows', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: FRU_P1_ID,
          raid_id: '30000000-0000-0000-0000-000000000001',
          name: 'Light Rampant',
          slug: 'fru-p1-light-rampant',
          patch_version: '7.21',
          boss_npc_source_id: 1,
          effective_from: '7.21',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          raid_slug: 'fru',
          expansion_slug: 'dawntrail',
        },
      ],
      error: null,
    });
    const list = await listEncounters();
    expect(rpcMock).toHaveBeenCalledWith('encounters_list', {});
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('Light Rampant');
    expect(list[0]?.raidSlug).toBe('fru');
  });

  it('getEncounter returns null when the RPC returns no rows', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const enc = await getEncounter(FRU_P1_ID);
    expect(enc).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith('encounters_by_id', { p_id: FRU_P1_ID });
  });

  it('getEncounter unwraps the single row returned by the table RPC', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: FRU_P1_ID,
          raid_id: '30000000-0000-0000-0000-000000000001',
          name: 'Light Rampant',
          slug: 'fru-p1-light-rampant',
          patch_version: '7.21',
          boss_npc_source_id: 1,
          effective_from: '7.21',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          raid_slug: 'fru',
          expansion_slug: 'dawntrail',
        },
      ],
      error: null,
    });

    const enc = await getEncounter(FRU_P1_ID);

    expect(enc?.id).toBe(FRU_P1_ID);
    expect(enc?.name).toBe('Light Rampant');
  });

  it('listMyPlans calls plans_list RPC and maps the response', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: '00000000-0000-0000-0000-000000000099',
          owner_id: '00000000-0000-0000-0000-000000000001',
          name: 'Live Plan',
          encounter_id: FRU_P1_ID,
          party_id: null,
          mode: 'CURRENT',
          is_legacy: false,
          created_at: '2026-06-30T00:00:00Z',
          updated_at: '2026-06-30T00:00:00Z',
          conflicts: [],
        },
      ],
      error: null,
    });
    const plans = await listMyPlans();
    expect(rpcMock).toHaveBeenCalledWith('plans_list', { p_limit: 50 });
    expect(plans).toHaveLength(1);
    expect(plans[0]?.name).toBe('Live Plan');
    expect(plans[0]?.encounterId).toBe(FRU_P1_ID);
  });

  it('createPlan invokes the plans-create Edge Function', async () => {
    const newPlanId = '99999999-0000-0000-0000-000000000001';
    functionsInvokeMock.mockResolvedValueOnce({
      data: { planId: newPlanId, createdAt: '2026-06-30T00:00:00Z' },
      error: null,
    });
    const result = await createPlan({ name: 'Edge Plan', encounterId: FRU_P1_ID, mode: 'CURRENT' });
    expect(functionsInvokeMock).toHaveBeenCalledWith('plans-create', {
      body: { name: 'Edge Plan', encounterId: FRU_P1_ID, mode: 'CURRENT' },
    });
    expect(result.planId).toBe(newPlanId);
  });

  it('getYDocSnapshot decodes BYTEA hex to a Uint8Array', async () => {
    // Hex "0102" decodes to bytes [0x01, 0x02]
    rpcMock.mockResolvedValueOnce({
      data: [{ update: '\\x0102', byte_size: 2, updated_at: '2026-06-30T00:00:00Z' }],
      error: null,
    });
    const snap = await getYDocSnapshot('00000000-0000-0000-0000-000000000099');
    expect(snap).not.toBeNull();
    expect(Array.from(snap!.update)).toEqual([0x01, 0x02]);
    expect(snap?.byteSize).toBe(2);
  });
});

describe('data-source — RPC adapter behavior (catalog fields)', () => {
  beforeEach(() => {
    setSupabaseConfigured(true);
    _invalidateCatalogCache();
    rpcMock.mockReset();
    functionsInvokeMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('listAbilities maps damage_type/target/charges from RPC row', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: '60000000-0000-0000-0000-000000000013',
          job_id: '50000000-0000-0000-0000-000000000001',
          ability_id: 'reprisal',
          mode: 'CURRENT',
          name: 'Reprisal',
          description: 'Party-wide 10% mit.',
          effect_pct: 10,
          recast_s: 60,
          range_m: 0,
          duration_s: 15,
          is_invuln: false,
          is_heal: false,
          is_shield: false,
          damage_type: 'both',
          target: 'party',
          charges: 1,
          job_abbrev: 'PLD',
          effective_from: '7.0',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          updated_at: '2026-06-30T00:00:00+00:00',
        },
      ],
      error: null,
    });
    const abs = await listAbilities();
    expect(abs).toHaveLength(1);
    expect(abs[0]?.jobAbbrev).toBe('PLD');
    expect(abs[0]?.damageType).toBe('both');
    expect(abs[0]?.target).toBe('party');
    expect(abs[0]?.charges).toBe(1);
  });

  it('listAbilities falls back to JOB_ABBREV when job_abbrev is absent', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: '60000000-0000-0000-0000-000000000013',
          job_id: '50000000-0000-0000-0000-000000000001',
          ability_id: 'reprisal',
          mode: 'CURRENT',
          name: 'Reprisal',
          description: null,
          effect_pct: 10,
          recast_s: 60,
          range_m: 0,
          duration_s: 15,
          is_invuln: false,
          is_heal: false,
          is_shield: false,
          damage_type: null,
          target: null,
          charges: null,
          effective_from: '7.0',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          updated_at: '2026-06-30T00:00:00+00:00',
        },
      ],
      error: null,
    });
    const abs = await listAbilities();
    expect(abs[0]?.jobAbbrev).toBe('PLD');
    expect(abs[0]?.damageType).toBeNull();
    expect(abs[0]?.target).toBeNull();
    expect(abs[0]?.charges).toBeNull();
  });

  it('listEncounters maps raid_name and raid_tier from RPC', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: FRU_P1_ID,
          raid_id: '30000000-0000-0000-0000-000000000001',
          name: 'Light Rampant',
          slug: 'fru-p1-light-rampant',
          patch_version: '7.21',
          boss_npc_source_id: 1,
          effective_from: '7.21',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          raid_slug: 'fru',
          expansion_slug: 'dawntrail',
          raid_name: 'Futures Rewritten (Ultimate)',
          raid_tier: 1,
        },
      ],
      error: null,
    });
    const list = await listEncounters();
    expect(list[0]?.raidName).toBe('Futures Rewritten (Ultimate)');
    expect(list[0]?.raidTier).toBe(1);
  });

  it('getEncounter maps raid_name and raid_tier', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: FRU_P1_ID,
          raid_id: '30000000-0000-0000-0000-000000000001',
          name: 'Light Rampant',
          slug: 'fru-p1-light-rampant',
          patch_version: '7.21',
          boss_npc_source_id: 1,
          effective_from: '7.21',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          raid_slug: 'fru',
          expansion_slug: 'dawntrail',
          raid_name: 'Futures Rewritten (Ultimate)',
          raid_tier: 1,
        },
      ],
      error: null,
    });
    const enc = await getEncounter(FRU_P1_ID);
    expect(enc?.raidName).toBe('Futures Rewritten (Ultimate)');
    expect(enc?.raidTier).toBe(1);
  });
});

describe('data-source — malformed/partial row handling', () => {
  beforeEach(() => {
    setSupabaseConfigured(true);
    _invalidateCatalogCache();
    rpcMock.mockReset();
    functionsInvokeMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('getTimelineForEncounter does not crash on malformed event rows', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: '70000000-0000-0000-0000-000000000001',
          encounter_id: FRU_P1_ID,
          version: '7.21',
          content_hash: 'abc',
          source: 'MANUAL',
          mode: 'CURRENT',
          events: [
            // Well-formed event
            {
              id: 'evt-1',
              position: 0,
              timestampMs: 0,
              type: 'MECHANIC',
              name: 'Pull',
            },
            // Malformed — missing required fields
            { id: 'evt-2' },
            // Malformed — null where string expected
            null,
          ],
          branches: [],
          joins: [],
          merged_from_sources: { cactbot: false, triggernometry: false, fflogs: false },
          per_event_confidence: {},
          byte_size: 100,
          created_at: '2026-06-30T00:00:00+00:00',
          updated_at: '2026-06-30T00:00:00+00:00',
        },
      ],
      error: null,
    });
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events.length).toBe(3);
    // Well-formed event should have defaults filled
    expect(events[0]?.name).toBe('Pull');
    expect(events[0]?.hitTimesMs).toEqual([]);
    expect(events[0]?.normalizedNames).toEqual([]);
    expect(events[0]?.patchVersion).toBe('');
    // Malformed events get a placeholder with the parse error in notes
    expect(events[1]?.id).toBe('malformed');
    expect(events[1]?.confidence).toBe(0);
    expect(events[1]?.notes).toContain('Parse error');
    expect(events[2]?.id).toBe('malformed');
  });

  it('listAbilities does not crash on partial rows without optional catalog fields', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: '60000000-0000-0000-0000-000000000013',
          job_id: '50000000-0000-0000-0000-000000000001',
          ability_id: 'reprisal',
          mode: 'CURRENT',
          name: 'Reprisal',
          description: null,
          effect_pct: 10,
          recast_s: 60,
          range_m: 0,
          duration_s: 15,
          is_invuln: false,
          is_heal: false,
          is_shield: false,
          effective_from: '7.0',
          effective_to: null,
          created_at: '2026-06-30T00:00:00+00:00',
          updated_at: '2026-06-30T00:00:00+00:00',
        },
      ],
      error: null,
    });
    const abs = await listAbilities();
    expect(abs).toHaveLength(1);
    expect(abs[0]?.jobAbbrev).toBe('PLD'); // falls back to JOB_ABBREV
    expect(abs[0]?.damageType).toBeNull();
    expect(abs[0]?.target).toBeNull();
    expect(abs[0]?.charges).toBeNull();
  });

  it('getTimelineForEncounter returns empty array for missing timeline (no rows)', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const events = await getTimelineForEncounter('10000000-0000-0000-0000-000000000099');
    expect(events).toEqual([]);
  });
});

describe('data-source — canonical timeline selection', () => {
  beforeEach(() => {
    setSupabaseConfigured(true);
    _invalidateCatalogCache();
    rpcMock.mockReset();
    functionsInvokeMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const makeTimelineRow = (
    overrides: Partial<Record<string, unknown>> = {},
  ): Record<string, unknown> => ({
    id: '70000000-0000-0000-0000-000000000101',
    encounter_id: FRU_P1_ID,
    version: '7.21',
    content_hash: 'abc',
    source: 'MANUAL',
    mode: 'CURRENT',
    events: [
      {
        id: 'evt-1',
        position: 0,
        timestampMs: 0,
        type: 'MECHANIC',
        name: 'Pull',
      },
    ],
    branches: [],
    joins: [],
    merged_from_sources: { cactbot: false, triggernometry: false, fflogs: false },
    per_event_confidence: {},
    byte_size: 100,
    created_at: '2026-06-30T00:00:00+00:00',
    updated_at: '2026-06-30T00:00:00+00:00',
    ...overrides,
  });

  it('prefers CURRENT mode over REBORN/EVOLVED', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000201', mode: 'REBORN', source: 'CACTBOT' }),
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000202', mode: 'CURRENT', source: 'CACTBOT' }),
      ],
      error: null,
    });
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe('Pull');
  });

  it('prefers MANUAL source over CACTBOT within CURRENT mode', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000203', mode: 'CURRENT', source: 'CACTBOT' }),
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000204', mode: 'CURRENT', source: 'MANUAL', version: '7.20' }),
      ],
      error: null,
    });
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe('Pull');
  });

  it('falls back to CACTBOT when no MANUAL timeline exists', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000205', mode: 'CURRENT', source: 'FFLOGS' }),
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000206', mode: 'CURRENT', source: 'CACTBOT' }),
      ],
      error: null,
    });
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events).toHaveLength(1);
  });

  it('returns first available row when no CURRENT mode exists', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000207', mode: 'REBORN', source: 'CACTBOT' }),
        makeTimelineRow({ id: '70000000-0000-0000-0000-000000000208', mode: 'ALL', source: 'MANUAL' }),
      ],
      error: null,
    });
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events).toHaveLength(1);
  });

  it('returns empty array for no timeline rows', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const events = await getTimelineForEncounter(FRU_P1_ID);
    expect(events).toEqual([]);
  });
});

describe('data-source — sample fallback counts', () => {
  beforeEach(() => {
    // Force fallback mode for these checks. Without this, the test
    // environment leaks `apps/web/.env` via Vite's import.meta.env
    // loader, the live code path runs, and `rpcMock` returns undefined
    // → "Cannot destructure property 'data' of undefined".
    setSupabaseConfigured(false);
    _invalidateCatalogCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes the expanded sample encounters and abilities', async () => {
    const encounters = await listEncounters();
    expect(encounters.length).toBeGreaterThanOrEqual(15);
    expect(SAMPLE_ABILITIES.length).toBeGreaterThanOrEqual(20);
  });
});
