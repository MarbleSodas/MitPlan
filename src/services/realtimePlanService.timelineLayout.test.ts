import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const pushMock = vi.fn();
const refMock = vi.fn();
const setMock = vi.fn();
const updateMock = vi.fn();
const getTimelineMock = vi.fn();

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  push: (...args: unknown[]) => pushMock(...args),
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
  getTimeline: (...args: unknown[]) => getTimelineMock(...args),
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

import {
  createPlan,
  hydratePlanTimelineLayoutIfMissing,
  updatePlanTimelineLayoutRealtime,
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

describe('realtimePlanService timeline layout support', () => {
  const sourceTimeline = {
    id: 'timeline-1',
    bossId: 'the-tyrant-m11s',
    bossTags: ['the-tyrant-m11s', 'M11S'],
    bossMetadata: {
      level: 100,
      name: 'The Tyrant (M11S)',
      baseHealth: {
        party: 186000,
        tank: 295000,
      },
    },
    actions: [
      {
        id: 'action-1',
        name: 'Opening Raidwide',
        time: 12,
        unmitigatedDamage: 200000,
      },
    ],
    format: 'legacy_flat',
    schemaVersion: 1,
  };

  beforeEach(() => {
    getMock.mockReset();
    pushMock.mockReset();
    refMock.mockReset();
    setMock.mockReset();
    updateMock.mockReset();
    getTimelineMock.mockReset();

    refMock.mockImplementation((_database: unknown, path: string) => ({ path }));
    pushMock.mockReturnValue({ key: 'plan-1' });
    setMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(undefined);
    getTimelineMock.mockResolvedValue(sourceTimeline);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a plan-owned timeline layout from the source timeline and folds in legacy HP overrides', async () => {
    await createPlan('user-1', {
      name: 'The Tyrant Plan',
      sourceTimelineId: 'timeline-1',
      sourceTimelineName: 'The Tyrant Timeline',
      healthSettings: {
        partyMinHealth: 150000,
        tankMaxHealth: {
          mainTank: 310000,
          offTank: 305000,
        },
      },
    });

    expect(getTimelineMock).toHaveBeenCalledWith('timeline-1');
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        bossId: 'the-tyrant-m11s',
        sourceTimelineId: 'timeline-1',
        sourceTimelineName: 'The Tyrant Timeline',
        timelineLayout: expect.objectContaining({
          bossId: 'the-tyrant-m11s',
          bossTags: ['the-tyrant-m11s', 'M11S'],
          healthConfig: {
            party: 150000,
            defaultTank: 295000,
            mainTank: 310000,
            offTank: 305000,
          },
        }),
        bossMetadata: expect.objectContaining({
          name: 'The Tyrant (M11S)',
        }),
      })
    );

    const storedPlan = setMock.mock.calls[0][1];
    expect(storedPlan.timelineLayout.actions[0]).not.toHaveProperty('targetTank');
  });

  it('hydrates a missing timeline layout for older timeline-backed plans', async () => {
    getMock.mockResolvedValue(
      buildSnapshot({
        name: 'Older Plan',
        bossId: 'the-tyrant-m11s',
        ownerId: 'user-1',
        userId: 'user-1',
        accessedBy: {},
        sourceTimelineId: 'timeline-1',
        sourceTimelineName: 'The Tyrant Timeline',
        healthSettings: {
          partyMinHealth: 160000,
          tankMaxHealth: {
            mainTank: 320000,
            offTank: 315000,
          },
        },
      })
    );

    await hydratePlanTimelineLayoutIfMissing('plan-1', 'user-1', 'session-1');

    expect(getTimelineMock).toHaveBeenCalledWith('timeline-1');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'plans/plan-1/timelineLayout': expect.objectContaining({
          bossId: 'the-tyrant-m11s',
          healthConfig: {
            party: 160000,
            defaultTank: 295000,
            mainTank: 320000,
            offTank: 315000,
          },
        }),
        'plans/plan-1/bossId': 'the-tyrant-m11s',
        'plans/plan-1/bossTags': ['the-tyrant-m11s', 'M11S'],
        'plans/plan-1/bossMetadata': expect.objectContaining({
          name: 'The Tyrant (M11S)',
        }),
        'plans/plan-1/lastModifiedBy': 'user-1',
        'plans/plan-1/lastChangeOrigin': 'session-1',
      })
    );
  });

  it('updates the plan timeline layout and clears legacy phase overrides in the same write', async () => {
    await updatePlanTimelineLayoutRealtime(
      'plan-1',
      {
        bossId: 'the-tyrant-m11s',
        bossTags: ['the-tyrant-m11s'],
        bossMetadata: sourceTimeline.bossMetadata,
        actions: sourceTimeline.actions,
        adaptiveModel: null,
        resolution: null,
        phases: [],
        analysisSources: [],
        guideSources: [],
        format: 'legacy_flat',
        schemaVersion: 1,
        description: 'Updated route',
        healthConfig: {
          party: 180000,
          defaultTank: 295000,
          mainTank: 300000,
          offTank: 298000,
        },
      },
      'user-1',
      'session-1'
    );

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'plans/plan-1/timelineLayout': expect.objectContaining({
          bossId: 'the-tyrant-m11s',
          description: 'Updated route',
          healthConfig: {
            party: 180000,
            defaultTank: 295000,
            mainTank: 300000,
            offTank: 298000,
          },
        }),
        'plans/plan-1/phaseOverrides': {},
        'plans/plan-1/lastModifiedBy': 'user-1',
        'plans/plan-1/lastChangeOrigin': 'session-1',
      })
    );
  });
});
