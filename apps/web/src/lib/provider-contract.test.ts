/**
 * RealtimeProvider contract test. ADR-0003 §"v2 re-introduction triggers".
 *
 * Verifies that the {@link RealtimeProvider} interface is enforceable:
 * any implementation (SupabaseBroadcastProvider today; Hocuspocus-on-DO,
 * Liveblocks, PartyKit, or anything else tomorrow) must honor the same
 * documented contract.
 *
 * This test exists to prevent provider lock-in. If a future refactor
 * changes the contract surface, this test will fail loudly, forcing the
 * author to update the interface and document the change in ADR-0003.
 *
 * Note: this file imports `SupabaseBroadcastProvider` directly, NOT the
 * `realtimeProvider` factory from `./realtime-provider.js`. The factory
 * pulls in the singleton Supabase client from `./supabase.js`, which
 * attempts to instantiate the Supabase Realtime client at module-load
 * (and fails on Node 25+ without a global WebSocket). The factory-level
 * contract is exercised transitively by every test in
 * `supabase-broadcast-provider.test.ts` (which constructs providers via
 * the mock seam), so the interface coverage is the same.
 */
import { describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { SupabaseBroadcastProvider } from './supabase-broadcast-provider.js';
import { makeMockSupabase } from './__test__/realtime-fixtures.js';
import type { RealtimeProvider, RealtimeStatus } from '@xivmitplan/crdt';

const VALID_STATUSES: RealtimeStatus[] = ['connecting', 'connected', 'disconnected', 'error'];

/**
 * Minimal channel stub: every Supabase Realtime channel method is a
 * no-op returning the channel itself (matches the Supabase chainable
 * builder pattern). The contract test never asserts on broadcast
 * content — it only checks provider lifecycle surface.
 */
function makeChannelStub(): unknown {
  const channelStub: unknown = {
    on: vi.fn(() => channelStub),
    subscribe: vi.fn(() => channelStub),
    send: vi.fn(() => 'ok'),
    unsubscribe: vi.fn(() => channelStub),
  };
  return channelStub;
}

interface ProviderHarness {
  provider: RealtimeProvider;
  supabase: ReturnType<typeof makeMockSupabase>;
  doc: Y.Doc;
}

function makeProvider(
  planId = 'contract',
  onStatus: (s: RealtimeStatus) => void = () => {},
): ProviderHarness {
  const doc = new Y.Doc();
  const supabase = makeMockSupabase(makeChannelStub());
  const provider = new SupabaseBroadcastProvider({
    planId,
    ydoc: doc,
    accessToken: 'tok',
    onStatus,
    supabase,
  });
  return { provider, supabase, doc };
}

function assertContract(provider: RealtimeProvider): void {
  expect(provider).toBeDefined();
  expect(typeof provider.connect).toBe('function');
  expect(typeof provider.disconnect).toBe('function');
  expect(VALID_STATUSES).toContain(provider.status);
}

describe('RealtimeProvider contract (ADR-0003)', () => {
  describe('surface', () => {
    it('SupabaseBroadcastProvider is a valid RealtimeProvider', () => {
      const { provider } = makeProvider('contract-1');
      assertContract(provider);
      provider.disconnect();
    });
  });

  describe('idempotency', () => {
    it('connect() is idempotent', () => {
      const { provider, supabase } = makeProvider('contract-2');
      provider.connect();
      const channelsAfterFirst = supabase.channel.mock.calls.length;
      provider.connect();
      provider.connect();
      expect(supabase.channel.mock.calls.length).toBe(channelsAfterFirst);
      provider.disconnect();
    });

    it('disconnect() is idempotent', () => {
      const { provider } = makeProvider('contract-3');
      expect(() => provider.disconnect()).not.toThrow();
      provider.connect();
      expect(() => provider.disconnect()).not.toThrow();
      expect(() => provider.disconnect()).not.toThrow();
    });
  });

  describe('status surface', () => {
    it('starts at "disconnected" before connect() is called', () => {
      const { provider } = makeProvider('contract-4');
      expect(provider.status).toBe('disconnected');
      provider.disconnect();
    });

    it('ends at "disconnected" after disconnect() returns', () => {
      const { provider } = makeProvider('contract-5');
      provider.connect();
      provider.disconnect();
      expect(provider.status).toBe('disconnected');
    });

    it('reports one of the four documented status values at all times', () => {
      const { provider } = makeProvider('contract-6');
      expect(VALID_STATUSES).toContain(provider.status);
      provider.connect();
      expect(VALID_STATUSES).toContain(provider.status);
      provider.disconnect();
      expect(VALID_STATUSES).toContain(provider.status);
    });
  });

  describe('status callback', () => {
    it('invokes onStatus for every transition', () => {
      const transitions: RealtimeStatus[] = [];
      const { provider } = makeProvider('contract-7', (s) => transitions.push(s));
      provider.connect();
      expect(transitions).toContain('connecting');
      provider.disconnect();
      expect(transitions).toContain('disconnected');
      expect(transitions[0]).toBe('connecting');
      expect(transitions[transitions.length - 1]).toBe('disconnected');
    });
  });

  describe('replacement-friendliness', () => {
    it('a future Hocuspocus implementation can pass this same contract test', () => {
      // This test documents the contract. To verify a future
      // implementation, replace `SupabaseBroadcastProvider` below with
      // a class wrapping `@hocuspocus/provider` and re-run. If it
      // fails, the contract has drifted — update ADR-0003.
      const doc = new Y.Doc();
      const provider: RealtimeProvider = new SupabaseBroadcastProvider({
        planId: 'contract-8',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase: makeMockSupabase(makeChannelStub()),
      });
      assertContract(provider);
      provider.disconnect();
    });
  });
});