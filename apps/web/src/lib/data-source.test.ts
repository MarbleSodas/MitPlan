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

  it('listEncounters returns the 6 seeded sample encounters', async () => {
    const list = await listEncounters();
    expect(list).toHaveLength(6);
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
    expect(enc?.slug).toBe('fru-p1-light-rampant');
    expect(enc?.raidSlug).toBe('fru');
    expect(enc?.raidName).toBe('Futures Rewritten (Ultimate)');
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

  it('listAbilities returns the 23 sample abilities', async () => {
    const abs = await listAbilities();
    expect(abs.length).toBe(23);
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
          created_at: '2026-06-30T00:00:00Z',
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
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const enc = await getEncounter(FRU_P1_ID);
    expect(enc).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith('encounters_by_id', { id: FRU_P1_ID });
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
    expect(rpcMock).toHaveBeenCalledWith('plans_list', { limit: 50 });
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

describe('data-source — sample fallback counts', () => {
  it('exposes the 6 sample encounters and 23 sample abilities', async () => {
    _invalidateCatalogCache();
    const encounters = await listEncounters();
    expect(encounters.length).toBe(6);
    expect(SAMPLE_ABILITIES.length).toBe(23);
  });
});
