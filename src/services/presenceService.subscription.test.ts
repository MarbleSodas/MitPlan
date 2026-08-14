import { beforeEach, describe, expect, it, vi } from 'vitest';

const subscribeMock = vi.hoisted(() => vi.fn());
const unsubscribeMock = vi.hoisted(() => vi.fn());

vi.mock('./sessionManager', () => ({
  default: {
    subscribeToPresence: (...args: unknown[]) => subscribeMock(...args),
  },
}));

import { subscribeToPresence } from './presenceService';

describe('presenceService subscriptions', () => {
  beforeEach(() => {
    subscribeMock.mockReset();
    unsubscribeMock.mockReset();
    subscribeMock.mockReturnValue(unsubscribeMock);
  });

  it('returns the shared Presence-channel unsubscribe directly', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToPresence('plan-1', callback);
    unsubscribe();

    expect(subscribeMock).toHaveBeenCalledWith('plan-1', expect.any(Function));
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
