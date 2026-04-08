import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const equalToMock = vi.fn();
const getMock = vi.fn();
const orderByChildMock = vi.fn();
const orderByKeyMock = vi.fn();
const queryMock = vi.fn();
const refMock = vi.fn();

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  get: (...args: unknown[]) => getMock(...args),
  set: vi.fn(),
  update: vi.fn(),
  query: (...args: unknown[]) => queryMock(...args),
  orderByChild: (...args: unknown[]) => orderByChildMock(...args),
  orderByKey: (...args: unknown[]) => orderByKeyMock(...args),
  equalTo: (...args: unknown[]) => equalToMock(...args),
}));

import {
  getUserAccessiblePlans,
  getUserOwnedPlans,
  getUserSharedPlans,
} from './planAccessService';
import { STALE_DATABASE_RULES_MESSAGE } from './firebaseErrorUtils';

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

describe('planAccessService', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    equalToMock.mockReset();
    getMock.mockReset();
    orderByChildMock.mockReset();
    orderByKeyMock.mockReset();
    queryMock.mockReset();
    refMock.mockReset();

    refMock.mockImplementation((_database: unknown, path: string) => ({ path }));
    orderByChildMock.mockImplementation((field: string) => ({ field }));
    orderByKeyMock.mockImplementation(() => ({ orderByKey: true }));
    equalToMock.mockImplementation((value: string) => ({ value }));
    queryMock.mockImplementation(
      (baseRef: { path: string }, order: { field?: string; orderByKey?: boolean }, equal: { value: string }) => ({
        path: baseRef.path,
        orderField: order.field ?? null,
        orderByKey: order.orderByKey === true,
        equalToValue: equal.value,
      })
    );
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads owned plans from both ownerId and legacy userId queries without duplicates', async () => {
    getMock.mockImplementation((target: { path: string; orderField?: string; equalToValue?: string }) => {
      if (target.path === 'plans' && target.orderField === 'ownerId') {
        return Promise.resolve(
          buildSnapshot({
            'plan-owner': {
              ownerId: 'user-1',
              userId: 'user-1',
              name: 'Owner Plan',
              updatedAt: 200,
            },
            'plan-modern': {
              ownerId: 'user-1',
              name: 'Modern Plan',
              updatedAt: 100,
            },
          })
        );
      }

      if (target.path === 'plans' && target.orderField === 'userId') {
        return Promise.resolve(
          buildSnapshot({
            'plan-owner': {
              ownerId: 'user-1',
              userId: 'user-1',
              name: 'Owner Plan',
              updatedAt: 200,
            },
            'plan-legacy': {
              userId: 'user-1',
              name: 'Legacy Plan',
              updatedAt: 150,
            },
          })
        );
      }

      throw new Error(`Unexpected get target: ${JSON.stringify(target)}`);
    });

    const plans = await getUserOwnedPlans('user-1');

    expect(plans.map((plan) => plan.id)).toEqual(['plan-owner', 'plan-legacy', 'plan-modern']);
    expect(plans.every((plan) => plan.isOwner)).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls.map(([, order]) => order.field)).toEqual(['ownerId', 'userId']);
  });

  it('loads shared plans from accessed history, excluding owned plans and missing records', async () => {
    getMock.mockImplementation((target: { path: string; orderField?: string | null; orderByKey?: boolean; equalToValue?: string }) => {
      if (target.path === 'planCollaborationsByUser' && target.orderByKey === true && target.equalToValue === 'user-1') {
        return Promise.resolve(buildSnapshot({}));
      }

      if (target.path === 'userProfiles/user-1/accessedPlans') {
        return Promise.resolve(
          buildSnapshot({
            'shared-plan': {
              lastAccess: 500,
              accessCount: 3,
            },
            'owned-plan': {
              lastAccess: 450,
              accessCount: 1,
            },
            'missing-plan': {
              lastAccess: 400,
              accessCount: 1,
            },
          })
        );
      }

      if (target.path === 'plans/shared-plan') {
        return Promise.resolve(
          buildSnapshot({
            ownerId: 'user-2',
            name: 'Shared Plan',
            updatedAt: 100,
          })
        );
      }

      if (target.path === 'plans/owned-plan') {
        return Promise.resolve(
          buildSnapshot({
            ownerId: 'user-1',
            name: 'Owned Plan',
            updatedAt: 200,
          })
        );
      }

      if (target.path === 'plans/missing-plan') {
        return Promise.resolve(buildSnapshot(null));
      }

      throw new Error(`Unexpected get target: ${JSON.stringify(target)}`);
    });

    const plans = await getUserSharedPlans('user-1');

    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual(
      expect.objectContaining({
        id: 'shared-plan',
        name: 'Shared Plan',
        isOwner: false,
        hasAccessed: true,
        accessInfo: expect.objectContaining({
          lastAccess: 500,
          accessCount: 3,
        }),
      })
    );
  });

  it('loads viewed plans from tokenized shared view records', async () => {
    getMock.mockImplementation((target: { path: string; orderField?: string | null; orderByKey?: boolean; equalToValue?: string }) => {
      if (target.path === 'planCollaborationsByUser' && target.orderByKey === true && target.equalToValue === 'user-1') {
        return Promise.resolve(buildSnapshot({}));
      }

      if (target.path === 'userProfiles/user-1/accessedPlans') {
        return Promise.resolve(
          buildSnapshot({
            'shared-plan': {
              accessType: 'view',
              viewToken: 'view-token-1',
              lastAccess: 600,
              accessCount: 2,
            },
          })
        );
      }

      if (target.path === 'planShareViews/view-token-1') {
        return Promise.resolve(
          buildSnapshot({
            planId: 'shared-plan',
            ownerId: 'user-2',
            name: 'Viewed Shared Plan',
            bossId: 'lala',
            selectedJobs: {},
            assignments: {},
            tankPositions: {
              mainTank: null,
              offTank: null,
            },
            viewEnabled: true,
            updatedAt: 550,
            sourcePlanUpdatedAt: 500,
          })
        );
      }

      throw new Error(`Unexpected get target: ${JSON.stringify(target)}`);
    });

    const plans = await getUserSharedPlans('user-1');

    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual(
      expect.objectContaining({
        id: 'shared-plan',
        name: 'Viewed Shared Plan',
        shareMode: 'view',
        accessLevel: 'viewer',
        viewToken: 'view-token-1',
      })
    );
  });

  it('keeps loading viewed plans when the collaboration index is permission denied', async () => {
    getMock.mockImplementation((target: { path: string; orderField?: string | null; orderByKey?: boolean; equalToValue?: string }) => {
      if (target.path === 'planCollaborationsByUser' && target.orderByKey === true && target.equalToValue === 'user-1') {
        return Promise.reject(new Error('Permission denied'));
      }

      if (target.path === 'userProfiles/user-1/accessedPlans') {
        return Promise.resolve(
          buildSnapshot({
            'shared-plan': {
              accessType: 'view',
              viewToken: 'view-token-1',
              lastAccess: 600,
              accessCount: 2,
            },
          })
        );
      }

      if (target.path === 'planShareViews/view-token-1') {
        return Promise.resolve(
          buildSnapshot({
            planId: 'shared-plan',
            ownerId: 'user-2',
            name: 'Viewed Shared Plan',
            bossId: 'lala',
            selectedJobs: {},
            assignments: {},
            tankPositions: {
              mainTank: null,
              offTank: null,
            },
            viewEnabled: true,
            updatedAt: 550,
            sourcePlanUpdatedAt: 500,
          })
        );
      }

      throw new Error(`Unexpected get target: ${JSON.stringify(target)}`);
    });

    const plans = await getUserSharedPlans('user-1');

    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual(
      expect.objectContaining({
        id: 'shared-plan',
        shareMode: 'view',
        viewToken: 'view-token-1',
      })
    );
  });

  it('merges owned and shared plans for accessible-plan loading', async () => {
    getMock.mockImplementation((target: { path: string; orderField?: string | null; orderByKey?: boolean; equalToValue?: string }) => {
      if (target.path === 'plans' && target.orderField === 'ownerId') {
        return Promise.resolve(
          buildSnapshot({
            'owned-plan': {
              ownerId: 'user-1',
              userId: 'user-1',
              name: 'Owned Plan',
              updatedAt: 150,
            },
          })
        );
      }

      if (target.path === 'plans' && target.orderField === 'userId') {
        return Promise.resolve(buildSnapshot({}));
      }

      if (target.path === 'planCollaborationsByUser' && target.orderByKey === true && target.equalToValue === 'user-1') {
        return Promise.resolve(buildSnapshot({}));
      }

      if (target.path === 'userProfiles/user-1/accessedPlans') {
        return Promise.resolve(
          buildSnapshot({
            'shared-plan': {
              lastAccess: 300,
              accessCount: 2,
            },
          })
        );
      }

      if (target.path === 'plans/shared-plan') {
        return Promise.resolve(
          buildSnapshot({
            ownerId: 'user-2',
            name: 'Shared Plan',
            updatedAt: 100,
          })
        );
      }

      throw new Error(`Unexpected get target: ${JSON.stringify(target)}`);
    });

    const plans = await getUserAccessiblePlans('user-1');

    expect(plans.map((plan) => plan.id)).toEqual(['shared-plan', 'owned-plan']);
  });

  it('surfaces owned-plan query failures instead of returning a fake empty state', async () => {
    getMock.mockRejectedValue(new Error('permission_denied at /plans'));

    await expect(getUserOwnedPlans('user-1')).rejects.toThrow(STALE_DATABASE_RULES_MESSAGE);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
