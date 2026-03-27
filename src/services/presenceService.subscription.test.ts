import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  offMock,
  onValueMock,
  unsubscribeMock,
} = vi.hoisted(() => ({
  offMock: vi.fn(),
  onValueMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  get: vi.fn(),
  off: (...args: unknown[]) => offMock(...args),
  onDisconnect: vi.fn(() => ({ remove: vi.fn() })),
  onValue: (...args: unknown[]) => onValueMock(...args),
  ref: vi.fn((_database: unknown, path: string) => ({ path })),
  remove: vi.fn(),
  set: vi.fn(),
}));

import { subscribeToPresence } from './presenceService';

describe('presenceService subscriptions', () => {
  beforeEach(() => {
    offMock.mockReset();
    onValueMock.mockReset();
    unsubscribeMock.mockReset();
    onValueMock.mockReturnValue(unsubscribeMock);
  });

  it('returns the Firebase unsubscribe directly', () => {
    const callback = vi.fn();

    const unsubscribe = subscribeToPresence('plan-1', callback);
    unsubscribe();

    expect(onValueMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(offMock).not.toHaveBeenCalled();
  });
});
