/**
 * Tests for SupabaseBroadcastProvider. Vitest + happy-dom.
 *
 * The Supabase realtime client is mocked via a hand-rolled `makeMockChannel`
 * so tests drive `SUBSCRIBED` / `CHANNEL_ERROR` / `CLOSED` callbacks
 * deterministically and inspect sent broadcasts without spinning up a
 * real WebSocket.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  SupabaseBroadcastProvider,
  SNAPSHOT_DEBOUNCE_MS,
  base64ToUint8,
  uint8ToBase64,
} from './supabase-broadcast-provider.js';
import { flushMicrotasks, makeMockSupabase } from './__test__/realtime-fixtures.js';
import type { RealtimeStatus } from '@xivmitplan/crdt';

// ---------------------------------------------------------------------------
// Mock channel
// ---------------------------------------------------------------------------

interface BroadcastHandler {
  type: 'broadcast' | 'presence';
  event: string;
  payload: unknown;
}

interface MockChannel {
  on: (
    type: string,
    filter: { event: string },
    handler: (msg: { payload: unknown }) => void,
  ) => MockChannel;
  subscribe: (cb: (status: string) => void) => MockChannel;
  send: (msg: BroadcastHandler) => unknown;
  unsubscribe: () => MockChannel;
  /** Test-only: simulate a remote broadcast arriving on the channel. */
  __emitBroadcast: (event: string, payload: unknown) => void;
  /** Test-only: simulate subscribe completion. */
  __completeSubscribe: (status: string) => void;
}

function makeMockChannel(): { channel: MockChannel; sent: BroadcastHandler[] } {
  const sent: BroadcastHandler[] = [];
  const broadcastListeners: Array<(msg: { event: string; payload: unknown }) => void> = [];
  let subscribeCb: ((status: string) => void) | null = null;

  const channel: MockChannel = {
    on(_type, filter, handler) {
      broadcastListeners.push((msg) => {
        if (msg.event === filter.event) handler({ payload: msg.payload });
      });
      return channel;
    },
    subscribe(cb) {
      subscribeCb = cb;
      // Tests must explicitly drive subscribe completion via
      // `__completeSubscribe('SUBSCRIBED')`. No auto-fire by default —
      // that prevents races between the queued SUBSCRIBED and a test's
      // own CHANNEL_ERROR / TIMED_OUT in the same tick.
      return channel;
    },
    send: vi.fn((msg: BroadcastHandler) => {
      sent.push(msg);
      return 'ok';
    }),
    unsubscribe() {
      subscribeCb?.('CLOSED');
      return channel;
    },
    __emitBroadcast(event, payload) {
      broadcastListeners.forEach((l) => l({ event, payload }));
    },
    __completeSubscribe(status) {
      subscribeCb?.(status);
    },
  };

  return { channel, sent };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SupabaseBroadcastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('lifecycle', () => {
    it('transitions disconnected → connecting → connected on subscribe', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();
      const statuses: RealtimeStatus[] = [];

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-1',
        ydoc: doc,
        accessToken: 'test-token',
        onStatus: (s) => statuses.push(s),
        supabase,
      });

      expect(provider.status).toBe('disconnected');
      provider.connect();
      expect(provider.status).toBe('connecting');

      channel.__completeSubscribe('SUBSCRIBED');
      expect(provider.status).toBe('connected');
      expect(statuses).toEqual(['connecting', 'connected']);

      provider.disconnect();
      expect(provider.status).toBe('disconnected');
    });

    it('transitions to error on CHANNEL_ERROR', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();
      const statuses: RealtimeStatus[] = [];

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-2',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: (s) => statuses.push(s),
        supabase,
      });

      provider.connect();
      channel.__completeSubscribe('CHANNEL_ERROR');
      await flushMicrotasks();

      expect(provider.status).toBe('error');
      expect(statuses).toContain('error');

      provider.disconnect();
    });

    it('idempotent connect (no second channel)', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-3',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });

      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');
      provider.connect(); // no-op
      provider.connect(); // no-op

      expect(supabase.channel).toHaveBeenCalledTimes(1);
      provider.disconnect();
    });

    it('idempotent disconnect (no throw when not connected)', () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-4',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });

      expect(() => provider.disconnect()).not.toThrow();
      provider.connect();
      expect(() => provider.disconnect()).not.toThrow();
      expect(() => provider.disconnect()).not.toThrow();
      expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    });

    it('clears the snapshot timer on disconnect and flushes pending state', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-5',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'a');
      provider.disconnect();

      // disconnect() is contract-required to flush any pending
      // snapshot via fire-and-forget (the user's last edit should
      // survive a disconnect). The debounced timer is cleared, so
      // no further RPCs fire even if the time advances.
      await vi.advanceTimersByTimeAsync(10_000);
      // The flush from disconnect is a single fire-and-forget RPC.
      // After it resolves, no further calls happen unless the user
      // makes a new edit.
      expect(supabase.rpc.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it('does NOT schedule a retry timer after disconnect if the in-flight RPC fails (no leak)', async () => {
      // Regression for the retry-loop bug. Sequence:
      // 1. User edits → debounce timer set.
      // 2. Timer fires → flushSnapshot starts; RPC is pending.
      // 3. User disconnects WHILE the RPC is pending.
      // 4. RPC resolves with an error.
      // 5. The retry handler must NOT schedule a new timer, because
      //    `_disposed` was latched at disconnect time.
      //
      // We model the pending RPC as a manually-controlled promise so
      // we can disconnect before it resolves.
      let resolveRpc: (value: { data: null; error: { message: string } }) => void = () => {};
      const pendingRpc = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        resolveRpc = resolve;
      });
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      supabase.rpc.mockReturnValue(pendingRpc as unknown as ReturnType<typeof supabase.rpc>);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-retry-leak',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'a');
      // Fire the 2s debounce — the RPC is now pending.
      await vi.advanceTimersByTimeAsync(2_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Disconnect while the RPC is still in flight.
      provider.disconnect();

      // Now resolve the in-flight RPC with an error. The provider's
      // _disposed latch MUST prevent scheduleSnapshotRetry from firing.
      resolveRpc({ data: null, error: { message: 'boom' } });
      await flushMicrotasks();

      // The disconnect-time legitimate flush is a 2nd RPC — that is
      // expected (it captures the last edit). What's NOT expected is
      // a 3rd RPC: the retry scheduled from the failed first RPC.
      await vi.advanceTimersByTimeAsync(30_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('transitions to error on SUBSCRIBE timeout', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();
      const statuses: RealtimeStatus[] = [];

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-timeout',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: (s) => statuses.push(s),
        supabase,
      });
      provider.connect();
      // Never call __completeSubscribe — simulates the broker not
      // replying (ACL gate silently rejects, gateway unreachable, etc.)
      await vi.advanceTimersByTimeAsync(10_500);
      expect(provider.status).toBe('error');
      expect(statuses).toContain('error');
    });

    it('transitions to error on unrecognized subscribe status', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();
      const statuses: RealtimeStatus[] = [];

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-unknown',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: (s) => statuses.push(s),
        supabase,
      });
      provider.connect();
      // Simulate Supabase's intermediate 'JOINING' (or a future status).
      channel.__completeSubscribe('JOINING');
      await flushMicrotasks();
      // Still connecting — the SUBSCRIBE_TIMEOUT_MS timer handles it.
      expect(provider.status).toBe('connecting');

      // Advance past the timeout — should transition to 'error'.
      await vi.advanceTimersByTimeAsync(10_500);
      expect(provider.status).toBe('error');
      expect(statuses).toContain('error');
    });

    it('captures edits made during the connecting window via disconnect flush', async () => {
      // Regression for the connecting-window data-loss bug: previously,
      // the local update handler was attached only inside the
      // SUBSCRIBED callback, so any edit before SUBSCRIBED was neither
      // broadcast nor snapshotted. With the eager attach, the doc
      // updates fire on the ydoc; the disconnect-time flushSnapshot
      // captures them.
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-pre-sub',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      // Don't fire SUBSCRIBED — simulate slow connect.
      doc.getText('hello').insert(0, 'pre-sub-edit');

      // Disconnect before SUBSCRIBED. The flush should still capture
      // the edit.
      provider.disconnect();
      await vi.advanceTimersByTimeAsync(5_000);

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      const callArgs = supabase.rpc.mock.calls[0]?.[1] as {
        p_plan_id: string;
        p_byte_size: number;
      };
      expect(callArgs.p_plan_id).toBe('plan-pre-sub');
      expect(callArgs.p_byte_size).toBeGreaterThan(0);
    });

    it('does not crash on undefined accessToken (presence key guard)', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      // The factory at plan.$planId.tsx guards accessToken === ''; the
      // provider itself is defensively permissive (accessToken is
      // declared `accessToken: string` in the interface but the
      // constructor falls back to '' via `opts.accessToken ?? ''`).
      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-empty-tok',
        ydoc: doc,
        accessToken: '',
        onStatus: () => {},
        supabase,
      });
      expect(() => provider.connect()).not.toThrow();
      // The presence key would be '' (slice of empty string). supabase-js
      // accepts that. The channel is still created.
      expect(supabase.channel).toHaveBeenCalledTimes(1);
      provider.disconnect();
    });
  });

  describe('broadcast', () => {
    it('broadcasts local Y.Doc updates as base64-encoded events', async () => {
      const { channel, sent } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-bcast-1',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'world');

      expect(sent).toHaveLength(1);
      expect(sent[0]?.type).toBe('broadcast');
      expect(sent[0]?.event).toBe('y-update');
      const payload = sent[0]?.payload as { update: string };
      expect(typeof payload.update).toBe('string');
      // Round-trip the base64 → Uint8Array and apply to a fresh doc to verify
      // the wire format is well-formed.
      const remoteDoc = new Y.Doc();
      Y.applyUpdate(remoteDoc, base64ToUint8(payload.update));
      expect(remoteDoc.getText('hello').toString()).toBe('world');

      provider.disconnect();
    });

    it('does not publish or snapshot local updates in read-only mode', async () => {
      const { channel, sent } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();
      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-read-only',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        readOnly: true,
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('local').insert(0, 'blocked');
      await vi.advanceTimersByTimeAsync(SNAPSHOT_DEBOUNCE_MS);

      expect(sent).toHaveLength(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
      provider.disconnect();
    });

    it('applies remote updates to the local Y.Doc', async () => {
      const { channel, sent } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-bcast-2',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      // Construct a remote update and inject it.
      const remoteDoc = new Y.Doc();
      remoteDoc.getText('hello').insert(0, 'remote');
      const remoteUpdate = Y.encodeStateAsUpdate(remoteDoc);

      channel.__emitBroadcast('y-update', { update: uint8ToBase64(remoteUpdate) });

      expect(doc.getText('hello').toString()).toBe('remote');
      // No echo: the applyUpdate with origin='remote' must not trigger a send.
      expect(sent).toHaveLength(0);

      provider.disconnect();
    });

    it('broadcasts on the channel named plan:<planId>', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'abc-123',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();

      expect(supabase.channel).toHaveBeenCalledWith(
        'plan:abc-123',
        expect.objectContaining({
          config: expect.objectContaining({
            broadcast: { self: false },
          }),
        }),
      );

      provider.disconnect();
    });
  });

  describe('snapshot persistence', () => {
    it('debounces the snapshot RPC to 2s after the last update', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-snap-1',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'a');
      await vi.advanceTimersByTimeAsync(1_000);
      doc.getText('hello').insert(1, 'b');
      await vi.advanceTimersByTimeAsync(1_000);
      doc.getText('hello').insert(2, 'c');

      // 3 updates, timer reset each time. Not yet 2s since last.
      expect(supabase.rpc).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'upsert_ydoc_snapshot',
        expect.objectContaining({
          p_plan_id: 'plan-snap-1',
          p_byte_size: expect.any(Number),
        }),
      );

      provider.disconnect();
    });

    it('retries the snapshot RPC after 5s on failure', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-snap-2',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'a');
      await vi.advanceTimersByTimeAsync(2_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // First call failed → retry scheduled after 5s
      await vi.advanceTimersByTimeAsync(5_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(2);

      provider.disconnect();
    });

    it('does not retry after a successful snapshot', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-snap-3',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'a');
      await vi.advanceTimersByTimeAsync(2_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // No second call within 5s of the successful one
      await vi.advanceTimersByTimeAsync(10_000);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      provider.disconnect();
    });

    it('encodes the snapshot as BYTEA hex (\\x...) not a raw Uint8Array', async () => {
      const { channel } = makeMockChannel();
      const supabase = makeMockSupabase(channel);
      const doc = new Y.Doc();

      const provider = new SupabaseBroadcastProvider({
        planId: 'plan-snap-hex',
        ydoc: doc,
        accessToken: 'tok',
        onStatus: () => {},
        supabase,
      });
      provider.connect();
      channel.__completeSubscribe('SUBSCRIBED');

      doc.getText('hello').insert(0, 'a');
      doc.getText('hello').insert(1, 'b');
      doc.getText('hello').insert(2, 'c');
      await vi.advanceTimersByTimeAsync(2_000);

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      const [fn, args] = (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(fn).toBe('upsert_ydoc_snapshot');
      // `p_update` must be a `\x…` hex string so PostgREST round-trips
      // it as BYTEA. A raw Uint8Array would JSON-serialize to
      // `{0: byte, 1: byte, …}` and Postgres would reject it.
      expect(typeof args.p_update).toBe('string');
      expect(args.p_update as string).toMatch(/^\\x[0-9a-f]+$/);
      expect(typeof args.p_byte_size).toBe('number');

      provider.disconnect();
    });
  });

  describe('base64 helpers', () => {
    it('round-trips a Uint8Array through base64', () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 128, 64, 32]);
      const encoded = uint8ToBase64(original);
      const decoded = base64ToUint8(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('handles empty buffers', () => {
      const empty = new Uint8Array(0);
      expect(uint8ToBase64(empty)).toBe('');
      expect(Array.from(base64ToUint8(''))).toEqual([]);
    });

    it('handles large buffers (1MB)', () => {
      const large = new Uint8Array(1024 * 1024);
      for (let i = 0; i < large.length; i++) large[i] = i % 256;
      const encoded = uint8ToBase64(large);
      const decoded = base64ToUint8(encoded);
      expect(decoded.byteLength).toBe(large.byteLength);
      expect(decoded[0]).toBe(0);
      expect(decoded[large.length - 1]).toBe((large.length - 1) % 256);
    });
  });
});
