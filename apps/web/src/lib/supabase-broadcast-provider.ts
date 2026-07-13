/**
 * SupabaseBroadcastProvider — Path A Hardened realtime bridge.
 *
 * Implements the {@link RealtimeProvider} interface using Supabase Realtime
 * Broadcast directly, with no third-party Yjs provider dependency.
 * ADR-0003.
 *
 * Wire format
 * -----------
 * - Channel: `plan:${planId}` (matches the realtime ACL gate in
 *   `realtime.check_plan_access` from migration 0002).
 * - `event: 'y-update'` payload: `{ update: string }` — base64-encoded
 *   Yjs update diff (the binary arg of the local `update` event).
 *
 * Persistence
 * -----------
 * The realtime sync (broadcast) is the load-bearing path. The snapshot
 * RPC (`upsert_ydoc_snapshot` from migration 0002) is a 2-second
 * debounced best-effort write. If the RPC fails, the doc still stays
 * in sync across clients via broadcast; we re-attempt the snapshot
 * after 5 seconds.
 *
 * Why this exists (ADR-0003 §Context)
 * -----------------------------------
 * The previous implementation wrapped `y-supabase` (4★ community fork
 * under `supabase-community`, 16 commits, 2024 maintainer quote: "I
 * know this is no where near production ready but it works!"). This
 * provider replaces that dependency with code we own.
 *
 * Supabase Realtime Broadcast itself is production-grade (Supabase-
 * maintained, used by Supabase's own products at scale), so the only
 * risk was the thin y-supabase wrapper, not the underlying transport.
 */
import * as Y from 'yjs';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { showReconnecting } from '../components/reconnecting-toast.js';
import { base64ToBytes, bytesToBase64, bytesToByteaHex } from './bytes.js';
import type { RealtimeProvider, RealtimeStatus } from '@xivmitplan/crdt';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Debounce window for the `upsert_ydoc_snapshot` RPC. ADR-0003 §Persistence. */
export const SNAPSHOT_DEBOUNCE_MS = 2_000;

/** Back-off window for a single retry after a snapshot RPC failure. */
export const SNAPSHOT_RETRY_MS = 5_000;

/**
 * Maximum time to wait for `SUBSCRIBED` before transitioning to 'error'.
 * ADR-0003 §Failure modes — protects against an indefinite 'Connecting…'
 * state when the broker never acks (e.g. ACL gate silently rejects, or
 * the network is up but the gateway is unreachable).
 */
export const SUBSCRIBE_TIMEOUT_MS = 10_000;

/** Broadcast event name for Yjs doc updates. */
export const BROADCAST_EVENT_UPDATE = 'y-update';

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

/** Payload shape for the `'y-update'` broadcast event. */
export interface YUpdatePayload {
  /** Base64-encoded Yjs update. */
  update: string;
}

/**
 * Minimal Supabase client surface used by this provider. Defined here
 * (not exported from `@supabase/supabase-js`) so test mocks can stand in
 * without pulling the full SDK type.
 */
export interface SupabaseLike {
  channel(name: string, opts?: unknown): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): Promise<unknown>;
  rpc<Args extends Record<string, unknown>>(
    fn: string,
    args: Args,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

// ---------------------------------------------------------------------------
// Base64 helpers — re-exported from `lib/bytes.ts` under the legacy
// names (`base64ToUint8`, `uint8ToBase64`) so existing imports
// (`from '@/lib/supabase-broadcast-provider'`) keep resolving.
// ---------------------------------------------------------------------------

export { base64ToBytes as base64ToUint8, bytesToBase64 as uint8ToBase64 } from './bytes.js';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface SupabaseBroadcastProviderOptions {
  /** Plan UUID. Used as the channel/room name (`plan:${planId}`). */
  planId: string;
  /** The Y.Doc to sync. The provider attaches handlers; the consumer owns lifecycle. */
  ydoc: Y.Doc;
  /** Supabase access token; passed through for presence config + refresh hooks. */
  accessToken: string;
  /** Called whenever the high-level status changes. */
  onStatus: (status: RealtimeStatus) => void;
  /**
   * Reserved for the share-link path. v1.0 doesn't broadcast this; the
   * `plan_access` table is consulted by the realtime ACL gate
   * (`realtime.check_plan_access`) at channel-join time.
   */
  shareToken?: string;
  /** Override the Supabase client (used in tests). */
  supabase: SupabaseLike;
}

/**
 * Custom realtime provider bridging Yjs and Supabase Realtime Broadcast.
 *
 * Lifecycle:
 * - `connect()` opens the Supabase channel; SUBSCRIBED → `status: 'connected'`.
 * - `disconnect()` closes the channel and flushes any pending snapshot.
 * - Both are idempotent.
 *
 * Concurrency:
 * - Local Y.Doc updates are broadcast immediately (best-effort; failures
 *   are logged, not retried — the next user edit will retry).
 * - The snapshot RPC is debounced 2s after the last update.
 * - Remote updates carry `origin: 'remote'` to prevent broadcast loops.
 *
 * Failure modes:
 * - SUBSCRIBE timeout → `status: 'error'`. The consumer should call
 *   `provider.disconnect()` then `provider.connect()` to retry.
 * - Snapshot RPC failure → re-attempted once after 5s.
 */
export class SupabaseBroadcastProvider implements RealtimeProvider {
  private readonly ydoc: Y.Doc;
  private readonly planId: string;
  private readonly accessToken: string;
  private readonly onStatus: (status: RealtimeStatus) => void;
  private readonly supabase: SupabaseLike;

  private channel: RealtimeChannel | null = null;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribeTimeout: ReturnType<typeof setTimeout> | null = null;
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null;
  private _status: RealtimeStatus = 'disconnected';
  /**
   * Latched on `disconnect()`. Blocks `scheduleSnapshotRetry()` from
   * scheduling new timers against an already-torn-down provider (which
   * would otherwise loop forever against the singleton supabase client).
   * Reset to `false` at the start of every `connect()`.
   */
  private _disposed = false;

  constructor(opts: SupabaseBroadcastProviderOptions) {
    this.ydoc = opts.ydoc;
    this.planId = opts.planId;
    // Defensive: callers may pass an empty string (e.g. anon session,
    // missing access_token). Slice of empty string is fine.
    this.accessToken = opts.accessToken ?? '';
    this.onStatus = opts.onStatus;
    this.supabase = opts.supabase;
  }

  /** Current high-level status. Updated synchronously on transitions. */
  get status(): RealtimeStatus {
    return this._status;
  }

  /**
   * Open the Supabase Realtime channel and start broadcasting.
   *
   * Idempotent: calling while connecting or connected is a no-op.
   */
  connect(): void {
    if (this._status === 'connecting' || this._status === 'connected') {
      return;
    }
    // Reset the disposed latch from any prior disconnect().
    this._disposed = false;
    this.setStatus('connecting');
    showReconnecting('Connecting…');

    const channelName = `plan:${this.planId}`;
    const channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.accessToken.slice(0, 16) },
      },
    });

    channel.on('broadcast', { event: BROADCAST_EVENT_UPDATE }, ({ payload }) => {
      this.applyRemoteUpdate(payload as YUpdatePayload);
    });

    // Attach the local update handler BEFORE SUBSCRIBED. Edits made
    // during the connecting window are still captured by the snapshot
    // path (which does not depend on the channel); the broadcast path
    // either queues (supabase-js behavior) or drops pre-SUBSCRIBE
    // messages, both of which are safe — the next user edit after
    // SUBSCRIBED re-broadcasts the post-SUBSCRIBE state.
    this.attachLocalUpdateHandler();

    // SUBSCRIBE timeout: if the broker doesn't reply within
    // SUBSCRIBE_TIMEOUT_MS, transition to 'error' so the consumer can
    // recover via disconnect()/connect(). The default-case below also
    // catches any unrecognized status (e.g. Supabase's 'JOINING').
    this.subscribeTimeout = setTimeout(() => {
      this.subscribeTimeout = null;
      if (this._status === 'connecting') {
        // eslint-disable-next-line no-console
        console.warn(
          `[realtime] SUBSCRIBE timeout after ${SUBSCRIBE_TIMEOUT_MS}ms (plan:${this.planId})`,
        );
        this.setStatus('error');
      }
    }, SUBSCRIBE_TIMEOUT_MS);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (this.subscribeTimeout) {
          clearTimeout(this.subscribeTimeout);
          this.subscribeTimeout = null;
        }
        this.setStatus('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (this.subscribeTimeout) {
          clearTimeout(this.subscribeTimeout);
          this.subscribeTimeout = null;
        }
        this.setStatus('error');
      } else if (status === 'CLOSED') {
        if (this.subscribeTimeout) {
          clearTimeout(this.subscribeTimeout);
          this.subscribeTimeout = null;
        }
        this.setStatus('disconnected');
      } else {
        // Unrecognized status (e.g. Supabase 'JOINING', or future
        // additions). Stay in 'connecting'; the SUBSCRIBE_TIMEOUT_MS
        // timer above will transition to 'error' if this lingers.
        // Do NOT clear subscribeTimeout here — it must remain pending
        // so the timeout can recover from a stuck state.
        // eslint-disable-next-line no-console
        console.warn(`[realtime] unrecognized subscribe status: ${status}`);
      }
    });

    this.channel = channel;
  }

  /**
   * Close the Supabase Realtime channel and flush any pending snapshot.
   *
   * Idempotent. The pending snapshot (if any) is flushed via a
   * fire-and-forget Promise — callers shouldn't await disconnect().
   */
  disconnect(): void {
    // Latch disposed FIRST so any in-flight flushSnapshot that rejects
    // does not schedule a retry timer against this torn-down provider.
    this._disposed = true;
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    if (this.subscribeTimeout) {
      clearTimeout(this.subscribeTimeout);
      this.subscribeTimeout = null;
    }
    if (this.updateHandler) {
      this.ydoc.off('update', this.updateHandler);
      this.updateHandler = null;
    }
    if (this.channel) {
      // Flush the pending snapshot before tearing down. We don't await
      // because callers expect disconnect() to return promptly. The
      // _disposed latch above guarantees that any failure here will NOT
      // schedule a retry (scheduleSnapshotRetry bails when disposed).
      void this.flushSnapshot();
      try {
        void this.supabase.removeChannel(this.channel);
      } catch {
        // removeChannel is fire-and-forget; a sync throw (rare mock
        // seam) must not break disconnect()'s idempotency contract.
      }
      this.channel = null;
    }
    this.setStatus('disconnected');
  }

  // -------------------------------------------------------------------------
  // Internal: status
  // -------------------------------------------------------------------------

  private setStatus(status: RealtimeStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.onStatus(status);
  }

  // -------------------------------------------------------------------------
  // Internal: update handler
  // -------------------------------------------------------------------------

  /** Wire up the local Y.Doc update → broadcast + debounced snapshot. */
  private attachLocalUpdateHandler(): void {
    this.updateHandler = (update, origin) => {
      // Don't echo back remote updates — only broadcast our own.
      // Pass the diff arg (not Y.encodeStateAsUpdate) to avoid
      // re-broadcasting the full doc state on every keystroke.
      if (origin === 'remote') return;
      this.broadcastUpdate(update);
      this.scheduleSnapshot();
    };
    this.ydoc.on('update', this.updateHandler);
  }

  // -------------------------------------------------------------------------
  // Internal: remote apply
  // -------------------------------------------------------------------------

  private applyRemoteUpdate(payload: YUpdatePayload): void {
    if (!payload?.update) return;
    try {
      const update = base64ToBytes(payload.update);
      // Origin 'remote' prevents the local handler from re-broadcasting.
      Y.applyUpdate(this.ydoc, update, 'remote');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] failed to apply remote Yjs update:', err);
      this.setStatus('error');
    }
  }

  // -------------------------------------------------------------------------
  // Internal: broadcast
  // -------------------------------------------------------------------------

  private broadcastUpdate(update: Uint8Array): void {
    if (!this.channel) return;
    const payload: YUpdatePayload = { update: bytesToBase64(update) };
    try {
      this.channel.send({
        type: 'broadcast',
        event: BROADCAST_EVENT_UPDATE,
        payload,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] failed to broadcast Yjs update:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Internal: snapshot persistence
  // -------------------------------------------------------------------------

  /** Schedule a debounced snapshot write. Coalesces burst updates. */
  private scheduleSnapshot(): void {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      void this.flushSnapshot();
    }, SNAPSHOT_DEBOUNCE_MS);
  }

  /** Write the current Y.Doc state to `ydoc_snapshots` via the SECURITY DEFINER RPC. */
  private async flushSnapshot(): Promise<void> {
    const update = Y.encodeStateAsUpdate(this.ydoc);
    try {
      // PostgREST expects BYTEA as a `\x…` hex string (or base64).
      // Passing a raw Uint8Array JSON-serializes to `{0: byte, 1: byte, …}`
      // which Postgres rejects — encode explicitly so the wire payload
      // is the canonical BYTEA hex form (mirroring what
      // `loadYDocSnapshot` decodes back to a Uint8Array).
      const { error } = await this.supabase.rpc('upsert_ydoc_snapshot', {
        p_plan_id: this.planId,
        p_update: bytesToByteaHex(update),
        p_byte_size: update.byteLength,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[realtime] ydoc snapshot upsert failed:', error.message);
        this.scheduleSnapshotRetry();
      }
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] ydoc snapshot upsert threw:', cause);
      this.scheduleSnapshotRetry();
    }
  }

  /** Single retry after a failure. Further retries are left to the next Y.Doc update. */
  private scheduleSnapshotRetry(): void {
    // Don't schedule on a torn-down provider (would loop forever
    // against the singleton supabase client). See disconnect().
    if (this._disposed) return;
    if (this.snapshotTimer) return;
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      void this.flushSnapshot();
    }, SNAPSHOT_RETRY_MS);
  }
}