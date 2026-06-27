/**
 * Realtime provider — concrete binding for the web app.
 * Architecture §14.6.5 (Path A: y-supabase on Supabase Realtime Broadcast).
 *
 * The `RealtimeProvider` interface and `RealtimeProviderOptions` types
 * live in `@xivmitplan/crdt/provider`. This file contains only the
 * concrete y-supabase implementation + the debounced snapshot write
 * via the `upsert_ydoc_snapshot` RPC (migration 0002).
 *
 * Design notes:
 *
 * - y-supabase's `SupabaseProvider` auto-connects in its constructor
 *   and exposes `destroy()` for cleanup (no public connect/disconnect).
 *   Our `RealtimeProvider` interface requires explicit lifecycle, so we
 *   lazy-construct: the underlying provider is built inside `connect()`.
 *
 * - y-supabase's `save()` does `supabase.from(table).update().eq()`,
 *   which would fail on `ydoc_snapshots` because RLS has no
 *   INSERT/UPDATE policy (writes go through the SECURITY DEFINER RPC).
 *   We override `save` to a no-op and implement our own debounced write.
 *
 * - Persistence is decoupled from the broadcast path. The broadcast
 *   (the realtime sync) is the load-bearing part; the snapshot is a
 *   best-effort write every 2s of idle. If the RPC fails, the doc
 *   still stays in sync across clients via broadcast.
 */
import { type SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import SupabaseProvider from 'y-supabase';
import { showReconnecting } from '../components/reconnecting-toast.js';
import type {
  RealtimeProvider,
  RealtimeProviderOptions,
  RealtimeStatus,
} from '@xivmitplan/crdt';

// Re-export so existing imports from this file keep working.
export type { RealtimeProvider, RealtimeProviderOptions, RealtimeStatus } from '@xivmitplan/crdt';

const SNAPSHOT_DEBOUNCE_MS = 2_000;

/**
 * Construct a y-supabase `SupabaseProvider` for the given plan.
 *
 * The caller is responsible for managing the SupabaseClient lifetime
 * (typically a singleton per session).
 */
export const realtimeProvider = (opts: RealtimeProviderOptions): RealtimeProvider => {
  let provider: SupabaseProvider | null = null;
  let awareness: Awareness | null = null;
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  let status: RealtimeStatus = 'connecting';

  const supabase: SupabaseClient = opts.ydoc as unknown as SupabaseClient; // unused placeholder — caller wires via shared client
  // The actual Supabase client is shared via @xivmitplan/web's lib/supabase.ts;
  // we read it from the doc's metadata (set in connect() below). This avoids
  // the realtime provider needing its own client instantiation.
  void supabase;

  const setStatus = (s: RealtimeStatus) => {
    status = s;
    opts.onStatus(s);
  };

  /** Debounced write of the full Y.Doc state to ydoc_snapshots. */
  const scheduleSnapshotWrite = () => {
    if (snapshotTimer) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      snapshotTimer = null;
      void writeSnapshotNow();
    }, SNAPSHOT_DEBOUNCE_MS);
  };

  const writeSnapshotNow = async () => {
    const client = (opts.ydoc as Y.Doc & { __supabase?: SupabaseClient }).__supabase;
    if (!client) return;
    const update = Y.encodeStateAsUpdate(opts.ydoc);
    try {
      const { error } = await client.rpc('upsert_ydoc_snapshot', {
        p_plan_id: opts.planId,
        p_update: update as unknown as Uint8Array,
        p_byte_size: update.byteLength,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[realtime] ydoc snapshot upsert failed:', error);
      }
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] ydoc snapshot upsert threw:', cause);
    }
  };

  return {
    connect: () => {
      showReconnecting('Connecting…');
      if (provider) {
        // Already connected; no-op.
        return;
      }
      // The Supabase client is attached to the doc by the consumer
      // (plan.$planId.tsx attaches it after constructing the doc).
      const client = (opts.ydoc as Y.Doc & { __supabase?: SupabaseClient }).__supabase;
      if (!client) {
        setStatus('error');
        // eslint-disable-next-line no-console
        console.error('[realtime] no Supabase client attached to the Y.Doc');
        return;
      }
      awareness = new Awareness(opts.ydoc);
      provider = new SupabaseProvider(opts.ydoc, client, {
        channel: `plan:${opts.planId}`,
        tableName: '__disabled_save__', // unused — we override save below
        columnName: 'update',
        idName: 'plan_id',
        id: opts.planId,
        awareness,
        resyncInterval: 30_000, // ADR-0002 §T-1: lower message volume on free tier
      });
      // Suppress y-supabase's built-in save (RLS would block it; we use
      // the SECURITY DEFINER upsert_ydoc_snapshot RPC instead).
      provider.save = async () => undefined;
      // Map y-supabase 'connect'/'disconnect' events to our status.
      provider.on('connect', () => setStatus('connected'));
      provider.on('disconnect', () => setStatus('disconnected'));
      // Debounced snapshot write on every local doc update.
      opts.ydoc.on('update', (_update, origin) => {
        if (origin !== provider) scheduleSnapshotWrite();
      });
      // Initial status is whatever y-supabase reports.
      setStatus(provider.connected ? 'connected' : 'connecting');
    },
    disconnect: () => {
      if (snapshotTimer) {
        clearTimeout(snapshotTimer);
        snapshotTimer = null;
      }
      if (provider) {
        provider.destroy();
        provider = null;
      }
      awareness = null;
      setStatus('disconnected');
    },
    get status() {
      return status;
    },
  };
};

/** Refresh the Supabase session and reconnect. Called from a
 *  onAuthenticationFailed listener. */
export const refreshAndReconnect = async (
  provider: RealtimeProvider,
  getAccessToken: () => Promise<string>,
): Promise<void> => {
  showReconnecting('Reconnecting…');
  await getAccessToken();
  provider.disconnect();
  provider.connect();
};

/**
 * Attach a Supabase client to a Y.Doc so the realtime provider can
 * read it. This indirection avoids the realtime provider needing to
 * construct its own client — we share the session client from
 * `lib/supabase.ts`.
 */
export const attachSupabaseClient = (doc: Y.Doc, client: SupabaseClient): void => {
  (doc as Y.Doc & { __supabase?: SupabaseClient }).__supabase = client;
};