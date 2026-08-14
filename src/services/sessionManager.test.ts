import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const presenceState = { current: {} as Record<string, unknown[]> };
  const presenceSyncListeners = new Set<() => void>();
  const cursorListeners = new Set<(payload: Record<string, unknown>) => void>();
  const channel = {
    presenceState: vi.fn(() => presenceState.current),
    track: vi.fn(async (payload) => {
      presenceState.current = { connection: [payload] };
      presenceSyncListeners.forEach((listener) => listener());
    }),
    untrack: vi.fn(async () => {
      presenceState.current = {};
    }),
    send: vi.fn(async () => 'ok'),
  };
  const release = vi.fn(async () => {});
  return {
    channel,
    cursorListeners,
    presenceState,
    presenceSyncListeners,
    release,
  };
});

vi.mock('./planRealtimeChannel', () => ({
  acquirePlanChannel: vi.fn(() => ({
    channel: mocks.channel,
    ready: Promise.resolve(),
    onStatus: vi.fn(() => () => {}),
    onChange: vi.fn(() => () => {}),
    onCursor: vi.fn((listener) => {
      mocks.cursorListeners.add(listener);
      return () => mocks.cursorListeners.delete(listener);
    }),
    onPresenceSync: vi.fn((listener) => {
      mocks.presenceSyncListeners.add(listener);
      return () => mocks.presenceSyncListeners.delete(listener);
    }),
    release: mocks.release,
  })),
}));

import sessionManager from './sessionManager';

describe('sessionManager Supabase Presence', () => {
  beforeEach(() => {
    mocks.presenceState.current = {};
    mocks.channel.track.mockClear();
    mocks.channel.untrack.mockClear();
    mocks.channel.send.mockClear();
    mocks.release.mockClear();
    mocks.presenceSyncListeners.clear();
    mocks.cursorListeners.clear();
  });

  afterEach(async () => {
    await sessionManager.cleanup();
  });

  it('tracks a tab-scoped participant without persisting email or heartbeats', async () => {
    await sessionManager.startSession('plan-1', 'session-1', {
      userId: 'user-1',
      displayName: 'User One',
    });
    const callback = vi.fn();
    const unsubscribe = sessionManager.subscribeToSessions('plan-1', callback);

    expect(mocks.channel.track).toHaveBeenCalledTimes(1);
    expect(mocks.channel.track.mock.calls[0][0]).not.toHaveProperty('email');
    expect(callback).toHaveBeenLastCalledWith([
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'user-1',
        displayName: 'User One',
        isActive: true,
      }),
    ]);

    unsubscribe();
    await sessionManager.endSession('session-1');
    expect(mocks.channel.untrack).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it('broadcasts cursor updates and keeps them out of Presence payloads', async () => {
    await sessionManager.startSession('plan-1', 'session-1', {
      userId: 'user-1',
      displayName: 'User One',
    });
    await sessionManager.updateSessionPresence('session-1', {
      cursor: { x: 10, y: 20 },
      viewport: { surface: 'planner', section: 'timeline', scrollTop: 900 },
    });

    expect(mocks.channel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        sessionId: 'session-1',
        cursor: { x: 10, y: 20 },
      },
    });
    const tracked = mocks.channel.track.mock.calls.at(-1)?.[0];
    expect(tracked).not.toHaveProperty('cursor');
    expect(tracked.viewport).toEqual({
      surface: 'planner',
      panel: null,
      section: 'timeline',
    });
  });
});
