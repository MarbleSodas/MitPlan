import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  onValueMock,
  unsubscribeMock,
} = vi.hoisted(() => ({
  onValueMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  get: vi.fn(),
  onDisconnect: vi.fn(() => ({ remove: vi.fn() })),
  onValue: (...args: unknown[]) => onValueMock(...args),
  ref: vi.fn((_database: unknown, path: string) => ({ path })),
  remove: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}));

import sessionManager from './sessionManager';

function createSessionsSnapshot(
  sessions: Array<{ sessionId: string; data: Record<string, unknown> }>
) {
  return {
    exists: () => sessions.length > 0,
    forEach: (callback: (childSnapshot: { key: string; val: () => Record<string, unknown> }) => void) => {
      sessions.forEach((session) => {
        callback({
          key: session.sessionId,
          val: () => session.data,
        });
      });
    },
  };
}

describe('sessionManager subscriptions', () => {
  beforeEach(() => {
    onValueMock.mockReset();
    unsubscribeMock.mockReset();
    onValueMock.mockReturnValue(unsubscribeMock);
  });

  afterEach(() => {
    sessionManager.cleanup();
  });

  it('returns the Firebase unsubscribe directly', () => {
    const callback = vi.fn();

    const unsubscribe = sessionManager.subscribeToSessions('plan-1', callback);
    unsubscribe();

    expect(onValueMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('suppresses heartbeat-only collaborator churn', () => {
    let sessionSubscriptionCallback: ((snapshot: ReturnType<typeof createSessionsSnapshot>) => void) | null = null;

    onValueMock.mockImplementation((_ref: unknown, callback: (snapshot: ReturnType<typeof createSessionsSnapshot>) => void) => {
      sessionSubscriptionCallback = callback;
      return unsubscribeMock;
    });

    const callback = vi.fn();
    sessionManager.subscribeToSessions('plan-1', callback);

    sessionSubscriptionCallback?.(
      createSessionsSnapshot([
        {
          sessionId: 'session-1',
          data: {
            userId: 'user-1',
            displayName: 'User One',
            email: 'user@example.com',
            color: '#3b82f6',
            isActive: true,
            lastActivity: 100,
          },
        },
      ])
    );

    sessionSubscriptionCallback?.(
      createSessionsSnapshot([
        {
          sessionId: 'session-1',
          data: {
            userId: 'user-1',
            displayName: 'User One',
            email: 'user@example.com',
            color: '#3b82f6',
            isActive: true,
            lastActivity: 200,
          },
        },
      ])
    );

    sessionSubscriptionCallback?.(
      createSessionsSnapshot([
        {
          sessionId: 'session-1',
          data: {
            userId: 'user-1',
            displayName: 'User One Updated',
            email: 'user@example.com',
            color: '#3b82f6',
            isActive: true,
            lastActivity: 300,
          },
        },
      ])
    );

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, [
      {
        sessionId: 'session-1',
        userId: 'user-1',
        displayName: 'User One',
        email: 'user@example.com',
        color: '#3b82f6',
        isActive: true,
      },
    ]);
    expect(callback).toHaveBeenNthCalledWith(2, [
      {
        sessionId: 'session-1',
        userId: 'user-1',
        displayName: 'User One Updated',
        email: 'user@example.com',
        color: '#3b82f6',
        isActive: true,
      },
    ]);
  });
});
