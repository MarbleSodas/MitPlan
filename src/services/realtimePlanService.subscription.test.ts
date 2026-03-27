import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const equalToMock = vi.fn();
const offMock = vi.fn();
const onValueMock = vi.fn();
const orderByChildMock = vi.fn();
const queryMock = vi.fn();
const refMock = vi.fn();
const unsubscribeOwnerMock = vi.fn();
const unsubscribeLegacyMock = vi.fn();

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  push: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  serverTimestamp: vi.fn(() => Date.now()),
  onValue: (...args: unknown[]) => onValueMock(...args),
  off: (...args: unknown[]) => offMock(...args),
  runTransaction: vi.fn(),
  query: (...args: unknown[]) => queryMock(...args),
  orderByChild: (...args: unknown[]) => orderByChildMock(...args),
  equalTo: (...args: unknown[]) => equalToMock(...args),
}));

vi.mock('./planAccessService', () => ({
  initializePlanOwnership: vi.fn((_planId: unknown, _userId: unknown, planData: unknown) => planData),
  trackPlanAccess: vi.fn(),
  getUserAccessiblePlans: vi.fn(),
}));

import { subscribeToUserPlans } from './realtimePlanService';

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

describe('realtimePlanService user plan subscriptions', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    equalToMock.mockReset();
    offMock.mockReset();
    onValueMock.mockReset();
    orderByChildMock.mockReset();
    queryMock.mockReset();
    refMock.mockReset();
    unsubscribeOwnerMock.mockReset();
    unsubscribeLegacyMock.mockReset();

    refMock.mockImplementation((_database: unknown, path: string) => ({ path }));
    orderByChildMock.mockImplementation((field: string) => ({ field }));
    equalToMock.mockImplementation((value: string) => ({ value }));
    queryMock.mockImplementation(
      (baseRef: { path: string }, order: { field: string }, equal: { value: string }) => ({
        path: baseRef.path,
        orderField: order.field,
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

  it('subscribes through owner-scoped queries and merges owner plus legacy plans', () => {
    const handlers = new Map<
      string,
      { onData: (snapshot: ReturnType<typeof buildSnapshot>) => void; onError: (error: Error) => void }
    >();

    onValueMock.mockImplementation(
      (
        queryTarget: { orderField: string },
        onData: (snapshot: ReturnType<typeof buildSnapshot>) => void,
        onError: (error: Error) => void
      ) => {
        handlers.set(queryTarget.orderField, { onData, onError });
        return queryTarget.orderField === 'ownerId' ? unsubscribeOwnerMock : unsubscribeLegacyMock;
      }
    );

    const callback = vi.fn();
    const unsubscribe = subscribeToUserPlans('user-1', callback);

    expect(onValueMock).toHaveBeenCalledTimes(2);
    expect(onValueMock.mock.calls.map(([queryTarget]) => queryTarget.orderField)).toEqual(['ownerId', 'userId']);

    handlers.get('ownerId')?.onData(
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

    expect(callback).not.toHaveBeenCalled();

    handlers.get('userId')?.onData(
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

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].map((plan: { id: string }) => plan.id)).toEqual([
      'plan-owner',
      'plan-legacy',
      'plan-modern',
    ]);

    unsubscribe();
    expect(unsubscribeOwnerMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeLegacyMock).toHaveBeenCalledTimes(1);
    expect(offMock).not.toHaveBeenCalled();
  });

  it('surfaces subscription failures instead of suppressing them into an empty success state', () => {
    const handlers = new Map<
      string,
      { onData: (snapshot: ReturnType<typeof buildSnapshot>) => void; onError: (error: Error) => void }
    >();

    onValueMock.mockImplementation(
      (
        queryTarget: { orderField: string },
        onData: (snapshot: ReturnType<typeof buildSnapshot>) => void,
        onError: (error: Error) => void
      ) => {
        handlers.set(queryTarget.orderField, { onData, onError });
        return queryTarget.orderField === 'ownerId' ? unsubscribeOwnerMock : unsubscribeLegacyMock;
      }
    );

    const callback = vi.fn();
    subscribeToUserPlans('user-1', callback);

    const permissionError = new Error('permission_denied at /plans');
    handlers.get('ownerId')?.onError(permissionError);

    expect(callback).toHaveBeenCalledWith([], permissionError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error listening to user plans changes:', permissionError);
  });
});
