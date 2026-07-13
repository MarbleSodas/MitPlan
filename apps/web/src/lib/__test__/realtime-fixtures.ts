/**
 * Shared test fixtures for the realtime provider tests.
 *
 * Each test file (unit, integration, contract) rolls its own channel
 * harness because the harness shape differs per scenario — the unit
 * test is manually driven, the integration test auto-fires SUBSCRIBED
 * and relays broadcasts to a peer, and the contract test uses a no-op
 * stub. The Supabase wrapper around that channel is uniform, though,
 * so we share it here.
 */
import { vi } from 'vitest';
import type { SupabaseLike } from '../supabase-broadcast-provider.js';

/**
 * Wrap a mock channel in the minimal `SupabaseLike` shape the provider
 * expects. Pass a pre-built `rpc` mock if the test needs to assert on
 * call counts / return values; otherwise a default resolved-null mock
 * is used.
 *
 * `channel` and `removeChannel` are exposed as `vi.fn` spies so tests
 * can assert on call counts via `.mock.calls.length`.
 */
export function makeMockSupabase(
  channel: unknown,
  rpc: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({ data: null, error: null }),
): {
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
} & SupabaseLike {
  return {
    channel: vi.fn(() => channel as never),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    rpc,
  };
}

/**
 * Drain two microtask turns. Sufficient for most supabase-js code
 * paths that resolve their internal Promises via microtask (not
 * setTimeout). Use between assertions when a microtask boundary is
 * needed but `vi.advanceTimersByTimeAsync` is not.
 */
export const flushMicrotasks = async (): Promise<void> => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};