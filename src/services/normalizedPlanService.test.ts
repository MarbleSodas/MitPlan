import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.hoisted(() => vi.fn());
const shared = vi.hoisted(() => {
  let changeListener: ((payload: Record<string, unknown>) => void) | null = null;
  const release = vi.fn(async () => {});
  return {
    release,
    setChangeListener(listener: (payload: Record<string, unknown>) => void) {
      changeListener = listener;
    },
    emit(payload: Record<string, unknown>) {
      changeListener?.(payload);
    },
  };
});

vi.mock('../config/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock('./planRealtimeChannel', () => ({
  acquirePlanChannel: vi.fn(() => ({
    channel: {},
    ready: Promise.resolve(),
    onStatus: vi.fn(() => () => {}),
    onChange: vi.fn((listener) => {
      shared.setChangeListener(listener);
      return () => {};
    }),
    onCursor: vi.fn(() => () => {}),
    onPresenceSync: vi.fn(() => () => {}),
    release: shared.release,
  })),
}));

import {
  applyPlanOperation,
  createNormalizedPlan,
  diffAssignmentEvents,
  listPublishedTimelineVersions,
  loadPlanWorkspace,
  subscribeToWorkspaceChanges,
} from './normalizedPlanService';

const workspace = {
  plan: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Plan',
    bossId: 'm12s',
    selectedJobs: { tank: [], healer: [], melee: [], ranged: [], caster: [] },
    assignments: {},
    tankPositions: { mainTank: null, offTank: null },
  },
  assignments: {},
  revision: 4,
  permissions: { canRead: true, canEdit: true, canAdmin: false },
  partySlots: [],
  changes: [],
  preference: null,
};

describe('normalizedPlanService', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    shared.release.mockClear();
  });

  it('loads a canonical workspace and keeps schema revision separate', async () => {
    rpcMock.mockResolvedValue({ data: workspace, error: null });
    const result = await loadPlanWorkspace(workspace.plan.id, 2);

    expect(rpcMock).toHaveBeenCalledWith('load_plan_workspace_v2', {
      p_plan_id: workspace.plan.id,
      p_after_revision: 2,
    });
    expect(result.plan.schemaVersion).toBe(1);
    expect(result.plan.revision).toBe(4);
    expect(result.plan.mode).toBe('CURRENT');
  });

  it('creates Evercold plans through the mode-aware RPC', async () => {
    rpcMock.mockResolvedValue({
      data: {
        ...workspace,
        plan: { ...workspace.plan, mode: 'EVOLVED' },
      },
      error: null,
    });

    const result = await createNormalizedPlan({
      ...workspace.plan,
      mode: 'EVOLVED',
    });

    expect(rpcMock).toHaveBeenCalledWith('create_normalized_plan_v2', {
      p_plan: expect.objectContaining({ mode: 'EVOLVED' }),
    });
    expect(result.plan.mode).toBe('EVOLVED');
  });

  it('commits an idempotent operation with an explicit base revision', async () => {
    rpcMock.mockResolvedValue({ data: { ...workspace, revision: 5 }, error: null });
    await applyPlanOperation(
      workspace.plan.id,
      {
        kind: 'set_event_assignments',
        targetType: 'assignment',
        targetKey: 'event-1',
        payload: { assignmentEvents: { 'event-1': [{ id: 'reprisal' }] } },
      },
      4,
      '22222222-2222-4222-8222-222222222222'
    );

    expect(rpcMock).toHaveBeenCalledWith('apply_plan_operation', expect.objectContaining({
      p_base_revision: 4,
      p_operation_id: '22222222-2222-4222-8222-222222222222',
    }));
  });

  it('diffs assignments by stable event key instead of replacing the map', () => {
    expect(diffAssignmentEvents(
      {
        first: [{ id: 'reprisal' }],
        second: [{ id: 'addle' }],
      },
      {
        first: [{ id: 'reprisal' }],
        second: [{ id: 'feint' }],
        third: [{ id: 'temperance' }],
      }
    )).toEqual({
      second: [{ id: 'feint' }],
      third: [{ id: 'temperance' }],
    });
  });

  it('lists only server-published upgrade choices for an encounter', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        id: 'version-1',
        timelineKey: 'm12s',
        versionLabel: '7.51',
        status: 'published',
        routeIds: ['door', 'final'],
      }],
      error: null,
    });

    const versions = await listPublishedTimelineVersions('m12s');

    expect(rpcMock).toHaveBeenCalledWith('list_published_timeline_versions', {
      p_encounter_key: 'm12s',
    });
    expect(versions[0].routeIds).toEqual(['door', 'final']);
  });

  it('receives database-originated canonical deltas on the private plan topic', async () => {
    const onChange = vi.fn();
    const subscription = subscribeToWorkspaceChanges(workspace.plan.id, { onChange });
    await subscription.ready;

    shared.emit({
      payload: {
        new: {
          id: 'change-1',
          operation_id: 'operation-1',
          revision: 5,
          actor_id: 'user-1',
          operation_kind: 'set_event_assignments',
          target_type: 'assignment',
          target_key: 'event-1',
          created_at: '2026-07-28T00:00:00Z',
          after_data: workspace,
        },
      },
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      revision: 5,
      targetKey: 'event-1',
      afterData: workspace,
    }));
    await subscription.unsubscribe();
    expect(shared.release).toHaveBeenCalledTimes(1);
  });
});
