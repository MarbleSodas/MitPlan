import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const refMock = vi.fn();
const setMock = vi.fn();
const updateMock = vi.fn();

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  push: vi.fn(),
  set: (...args: unknown[]) => setMock(...args),
  get: (...args: unknown[]) => getMock(...args),
  remove: vi.fn(),
  update: (...args: unknown[]) => updateMock(...args),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  onValue: vi.fn(),
  off: vi.fn(),
  runTransaction: vi.fn(),
  query: vi.fn(),
  orderByChild: vi.fn(),
  equalTo: vi.fn(),
}));

vi.mock('./timelineService', () => ({
  getTimeline: vi.fn(),
}));

vi.mock('./planAccessService', () => ({
  initializePlanOwnership: vi.fn((_planId: unknown, userId: unknown, planData: Record<string, unknown>) => ({
    ...planData,
    ownerId: userId,
    userId,
    accessedBy: {},
    createdAt: 100,
    updatedAt: 100,
    lastAccessedAt: 100,
  })),
  trackPlanAccess: vi.fn(),
  getUserAccessiblePlans: vi.fn(),
  migratePlanOwnership: vi.fn((_planId: unknown, planData: Record<string, unknown>) => planData),
}));

vi.mock('./userService', () => ({
  getUserDisplayNames: vi.fn(),
}));

import {
  enablePlanShareView,
  rotatePlanShareViewToken,
  updatePlanFieldsWithOrigin,
} from './realtimePlanService';

function buildSnapshot(value: unknown) {
  return {
    exists: () => value !== null && value !== undefined,
    val: () => value,
    forEach: (callback: (child: { key: string; val: () => unknown }) => void) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
        callback({
          key,
          val: () => entryValue,
        });
      });
    },
  };
}

describe('realtimePlanService sharing snapshots', () => {
  let storedPlan: Record<string, unknown>;
  let shareViews: Record<string, Record<string, unknown>>;

  beforeEach(() => {
    getMock.mockReset();
    refMock.mockReset();
    setMock.mockReset();
    updateMock.mockReset();

    storedPlan = {
      id: 'plan-1',
      name: 'Public Plan',
      ownerId: 'owner-1',
      userId: 'owner-1',
      isPublic: true,
      description: 'Original description',
      bossId: 'lala',
      selectedJobs: {},
      assignments: {
        'action-1': [{ id: 'reprisal' }],
      },
      tankPositions: {
        mainTank: null,
        offTank: null,
      },
      shareSettings: {
        viewToken: 'snapshot-1',
        viewEnabled: false,
        viewUpdatedAt: null,
      },
      accessedBy: {},
      createdAt: 100,
      updatedAt: 300,
      lastAccessedAt: 300,
    };
    shareViews = {};

    refMock.mockImplementation((_database: unknown, path: string) => ({ path }));
    setMock.mockImplementation(async (target: { path?: string }, value: unknown) => {
      if (!target?.path) {
        return;
      }

      if (target.path === 'plans/plan-1') {
        storedPlan = value as Record<string, unknown>;
      }

      if (target.path.startsWith('planShareViews/')) {
        shareViews[target.path] = value as Record<string, unknown>;
      }
    });
    updateMock.mockImplementation(async (_target: unknown, updates: Record<string, unknown>) => {
      Object.entries(updates).forEach(([path, value]) => {
        if (path.startsWith('plans/plan-1/')) {
          const field = path.replace('plans/plan-1/', '');
          storedPlan = {
            ...storedPlan,
            [field]: value,
          };
        }

        if (path.startsWith('planShareViews/')) {
          const [, token, ...rest] = path.split('/');
          const shareViewPath = `planShareViews/${token}`;
          const field = rest.join('/');
          shareViews[shareViewPath] = {
            ...(shareViews[shareViewPath] || {}),
            [field]: value,
          };
        }
      });
    });
    getMock.mockImplementation(async (target: { path?: string }) => {
      if (target?.path === 'plans/plan-1') {
        return buildSnapshot(storedPlan);
      }

      if (target?.path && target.path.startsWith('planShareViews/')) {
        return buildSnapshot(shareViews[target.path] || null);
      }

      return buildSnapshot(null);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('captures a frozen snapshot when enabling the public snapshot link without changing public edit access', async () => {
    const result = await enablePlanShareView('plan-1', 'owner-1');

    expect(result.viewToken).toBe('snapshot-1');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'plans/plan-1/shareSettings': {
          viewToken: 'snapshot-1',
          viewEnabled: true,
          viewUpdatedAt: expect.any(Number),
        },
        'plans/plan-1/updatedAt': 'server-timestamp',
        'plans/plan-1/lastModifiedBy': 'owner-1',
      })
    );
    expect(updateMock.mock.calls[0][1]).not.toHaveProperty('plans/plan-1/isPublic');
    expect(setMock).toHaveBeenCalledWith(
      { path: 'planShareViews/snapshot-1' },
      expect.objectContaining({
        planId: 'plan-1',
        name: 'Public Plan',
        viewEnabled: true,
        snapshotCreatedAt: expect.any(Number),
        sourcePlanUpdatedAt: 300,
        assignments: {
          'action-1': [{ id: 'reprisal' }],
        },
      })
    );
  });

  it('does not rewrite an existing snapshot during ordinary plan edits', async () => {
    storedPlan.shareSettings = {
      viewToken: 'snapshot-1',
      viewEnabled: true,
      viewUpdatedAt: 350,
    };
    shareViews['planShareViews/snapshot-1'] = {
      planId: 'plan-1',
      name: 'Frozen Snapshot',
      viewEnabled: true,
      snapshotCreatedAt: 275,
      sourcePlanUpdatedAt: 300,
    };

    await updatePlanFieldsWithOrigin('plan-1', { name: 'Renamed Plan' }, 'owner-1', 'session-1');

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'plans/plan-1/name': 'Renamed Plan',
        'plans/plan-1/updatedAt': 'server-timestamp',
        'plans/plan-1/lastModifiedBy': 'owner-1',
        'plans/plan-1/lastChangeOrigin': 'session-1',
      })
    );
    expect(setMock).not.toHaveBeenCalled();
    expect(shareViews['planShareViews/snapshot-1']).toEqual(
      expect.objectContaining({
        name: 'Frozen Snapshot',
        snapshotCreatedAt: 275,
        sourcePlanUpdatedAt: 300,
      })
    );
  });

  it('regenerates a new snapshot and revokes the previous token when rotating the snapshot link', async () => {
    storedPlan.shareSettings = {
      viewToken: 'snapshot-1',
      viewEnabled: true,
      viewUpdatedAt: 350,
    };
    shareViews['planShareViews/snapshot-1'] = {
      planId: 'plan-1',
      name: 'Old Snapshot',
      viewEnabled: true,
      snapshotCreatedAt: 275,
      sourcePlanUpdatedAt: 300,
    };

    const result = await rotatePlanShareViewToken('plan-1', 'owner-1');

    expect(result.viewToken).not.toBe('snapshot-1');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'plans/plan-1/shareSettings': {
          viewToken: result.viewToken,
          viewEnabled: true,
          viewUpdatedAt: expect.any(Number),
        },
        'planShareViews/snapshot-1/viewEnabled': false,
        'planShareViews/snapshot-1/revokedAt': expect.any(Number),
        'planShareViews/snapshot-1/updatedAt': expect.any(Number),
      })
    );
    expect(setMock).toHaveBeenCalledWith(
      { path: `planShareViews/${result.viewToken}` },
      expect.objectContaining({
        planId: 'plan-1',
        name: 'Public Plan',
        viewEnabled: true,
        snapshotCreatedAt: expect.any(Number),
        sourcePlanUpdatedAt: 300,
      })
    );
  });
});
