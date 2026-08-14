import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../config/supabase', () => ({
  database: {},
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

vi.mock('../lib/supabaseRealtimeDatabase', () => ({
  ref: vi.fn(),
  push: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  serverTimestamp: vi.fn(() => 1),
  query: vi.fn(),
  orderByChild: vi.fn(),
  equalTo: vi.fn(),
}));

import { toggleLike } from './timelineService';

describe('timelineService likes', () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue({
      data: { liked: true, likeCount: 4 },
      error: null,
    });
  });

  it('toggles only the current user through the field-safe database RPC', async () => {
    await expect(toggleLike('timeline-1', 'user-1')).resolves.toEqual({
      liked: true,
      likeCount: 4,
    });
    expect(rpcMock).toHaveBeenCalledWith('toggle_timeline_like', {
      p_timeline_key: 'timeline-1',
    });
  });

  it('keeps the existing service error contract when the RPC is denied', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('denied') });
    await expect(toggleLike('timeline-1', 'user-1')).rejects.toThrow('Failed to toggle like');
  });
});
