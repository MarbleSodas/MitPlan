/**
 * Cross-client integration test for SupabaseBroadcastProvider.
 *
 * Two providers share a relay channel that mimics Supabase Realtime
 * Broadcast: each `channel.send()` from one provider invokes the broadcast
 * listener on the other. This catches wire-format bugs the per-method
 * unit tests can't (encoding mismatches, origin-loop bugs, ordering).
 *
 * Tests run in happy-dom with vi.useFakeTimers so the debounced
 * snapshot RPCs can be advanced deterministically.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  SupabaseBroadcastProvider,
} from './supabase-broadcast-provider.js';
import { flushMicrotasks, makeMockSupabase } from './__test__/realtime-fixtures.js';

/**
 * Build a relay that lets two providers share a channel. Each
 * `channel.send()` from one side calls the broadcast listener on the
 * other side. localSubscribed tracks which side has hit SUBSCRIBED.
 */
function makeRelay() {
  const sides: Array<{
    channel: ReturnType<typeof makeChannel>;
    subscribed: boolean;
  }> = [];
  const sentMessages: Array<{ side: 'A' | 'B'; msg: unknown }> = [];

  function makeChannel(side: 'A' | 'B') {
    const listeners: Array<(msg: { event: string; payload: unknown }) => void> = [];
    let subscribeCb: ((status: string) => void) | null = null;
    const channel = {
      on(_type: string, filter: { event: string }, handler: (msg: { payload: unknown }) => void) {
        listeners.push((msg) => {
          if (msg.event === filter.event) handler({ payload: msg.payload });
        });
        return channel;
      },
      subscribe(cb: (status: string) => void) {
        subscribeCb = cb;
        // Auto-fire SUBSCRIBED on first subscribe call. The relay sets
        // up all channels synchronously, so all sides become connected
        // before any send happens.
        queueMicrotask(() => subscribeCb?.('SUBSCRIBED'));
        return channel;
      },
      send: vi.fn((msg: { event: string; payload: unknown }) => {
        sentMessages.push({ side, msg });
        // Relay: deliver the message to the OTHER side's listeners only.
        const otherSide = sides.find((s) => s.channel !== channel);
        if (otherSide && otherSide.channel) {
          otherSide.channel.__deliverBroadcast({
            event: msg.event,
            payload: msg.payload,
          });
        }
        return 'ok';
      }),
      unsubscribe() {
        subscribeCb?.('CLOSED');
        return channel;
      },
      // Test-only helpers
      __deliverBroadcast(msg: { event: string; payload: unknown }) {
        listeners.forEach((l) => l(msg));
      },
      __completeSubscribe(status: string) {
        subscribeCb?.(status);
      },
    };
    sides.push({ channel: channel as never, subscribed: false });
    return channel;
  }

  return { makeChannel, sentMessages, sides };
}

describe('SupabaseBroadcastProvider — cross-client integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('one local edit propagates to the other client within one relay hop', async () => {
    const relay = makeRelay();
    const channelA = relay.makeChannel('A');
    const channelB = relay.makeChannel('B');

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new SupabaseBroadcastProvider({
      planId: 'plan-int-1',
      ydoc: docA,
      accessToken: 'tok-A',
      onStatus: () => {},
      supabase: makeMockSupabase(channelA),
    });
    const providerB = new SupabaseBroadcastProvider({
      planId: 'plan-int-1',
      ydoc: docB,
      accessToken: 'tok-B',
      onStatus: () => {},
      supabase: makeMockSupabase(channelB),
    });

    providerA.connect();
    providerB.connect();
    await flushMicrotasks();
    expect(providerA.status).toBe('connected');
    expect(providerB.status).toBe('connected');

    // Edit on A
    docA.getText('hello').insert(0, 'world');

    // The send mock relays the broadcast to B's listeners; the relay
    // is synchronous (setTimeout 0 not involved), so docB should pick up
    // the update by the next microtask.
    await flushMicrotasks();
    expect(docB.getText('hello').toString()).toBe('world');

    providerA.disconnect();
    providerB.disconnect();
  });

  it('two clients converge to identical Y.Doc state after bidirectional edits', async () => {
    const relay = makeRelay();
    const channelA = relay.makeChannel('A');
    const channelB = relay.makeChannel('B');

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new SupabaseBroadcastProvider({
      planId: 'plan-int-2',
      ydoc: docA,
      accessToken: 'tok-A',
      onStatus: () => {},
      supabase: makeMockSupabase(channelA),
    });
    const providerB = new SupabaseBroadcastProvider({
      planId: 'plan-int-2',
      ydoc: docB,
      accessToken: 'tok-B',
      onStatus: () => {},
      supabase: makeMockSupabase(channelB),
    });

    providerA.connect();
    providerB.connect();
    await flushMicrotasks();

    // A writes "alpha"
    docA.getText('msg').insert(0, 'alpha');
    await flushMicrotasks();
    // B writes "beta" on top of alpha (in B's doc — so it's B-doc's text)
    docB.getText('msg').insert(0, 'beta-');
    await flushMicrotasks();
    // A writes "gamma" on top of A's doc
    docA.getText('msg').insert(0, 'gamma-');
    await flushMicrotasks();

    // After all edits have propagated, both docs should hold the union
    // of insertions in the correct order. Yjs CRDT semantics guarantee
    // convergence regardless of edit order.
    const textA = docA.getText('msg').toString();
    const textB = docB.getText('msg').toString();
    expect(textA).toBe(textB);

    providerA.disconnect();
    providerB.disconnect();
  });

  it('does not broadcast remote-origin updates back to the wire (no loops)', async () => {
    const relay = makeRelay();
    const channelA = relay.makeChannel('A');
    const channelB = relay.makeChannel('B');

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new SupabaseBroadcastProvider({
      planId: 'plan-int-3',
      ydoc: docA,
      accessToken: 'tok-A',
      onStatus: () => {},
      supabase: makeMockSupabase(channelA),
    });
    const providerB = new SupabaseBroadcastProvider({
      planId: 'plan-int-3',
      ydoc: docB,
      accessToken: 'tok-B',
      onStatus: () => {},
      supabase: makeMockSupabase(channelB),
    });

    providerA.connect();
    providerB.connect();
    await flushMicrotasks();
    const sentBefore = relay.sentMessages.length;

    // Edit on A
    docA.getText('msg').insert(0, 'from-A');
    await flushMicrotasks();

    // The relay recorded one send (from A). B should not have sent
    // anything in response, because `Y.applyUpdate(origin='remote')`
    // skips the local handler that would re-broadcast.
    expect(docB.getText('msg').toString()).toBe('from-A');
    expect(relay.sentMessages.length - sentBefore).toBe(1);
    expect(relay.sentMessages.at(-1)?.side).toBe('A');

    providerA.disconnect();
    providerB.disconnect();
  });

  it('per-client snapshot RPCs run independently with the correct planId', async () => {
    const relay = makeRelay();
    const channelA = relay.makeChannel('A');
    const channelB = relay.makeChannel('B');

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const supabaseA = makeMockSupabase(channelA);
    const supabaseB = makeMockSupabase(channelB);

    const providerA = new SupabaseBroadcastProvider({
      planId: 'plan-int-4',
      ydoc: docA,
      accessToken: 'tok-A',
      onStatus: () => {},
      supabase: supabaseA,
    });
    const providerB = new SupabaseBroadcastProvider({
      planId: 'plan-int-4',
      ydoc: docB,
      accessToken: 'tok-B',
      onStatus: () => {},
      supabase: supabaseB,
    });

    providerA.connect();
    providerB.connect();
    await flushMicrotasks();

    docA.getText('msg').insert(0, 'A-edit');
    docB.getText('msg').insert(0, 'B-edit');

    // Advance past the 2s debounce window for both providers.
    await vi.advanceTimersByTimeAsync(2_500);

    // Both should have written a snapshot, with their respective client Y.Doc state.
    expect(supabaseA.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseB.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseA.rpc).toHaveBeenCalledWith(
      'upsert_ydoc_snapshot',
      expect.objectContaining({ p_plan_id: 'plan-int-4' }),
    );
    expect(supabaseB.rpc).toHaveBeenCalledWith(
      'upsert_ydoc_snapshot',
      expect.objectContaining({ p_plan_id: 'plan-int-4' }),
    );

    providerA.disconnect();
    providerB.disconnect();
  });
});