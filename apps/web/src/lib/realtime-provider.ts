/**
 * Realtime provider — concrete binding for the web app.
 * Architecture §14.6.5 (Path A: y-supabase on Supabase Realtime Broadcast).
 *
 * The `RealtimeProvider` interface and `RealtimeProviderOptions` types
 * live in `@xivmitplan/crdt/provider` (extracted there in Phase 1B).
 * This file contains only the concrete y-supabase implementation.
 *
 * Phase 2 (the realtime migration) will swap the y-partyserver
 * implementation for y-supabase. The interface contract stays.
 */
import YProvider from 'y-partyserver/provider';
import { showReconnecting } from '../components/reconnecting-toast.js';
import type {
  RealtimeProvider,
  RealtimeProviderOptions,
  RealtimeStatus,
} from '@xivmitplan/crdt';

// Re-export so existing imports from this file keep working.
export type { RealtimeProvider, RealtimeProviderOptions, RealtimeStatus } from '@xivmitplan/crdt';

const REALTIME_HOST =
  (import.meta.env['VITE_REALTIME_HOST'] as string | undefined) ??
  'localhost:1999'; // wrangler dev default for partykit

/**
 * Construct a YProvider with the JWT in the connection params.
 * y-partyserver re-reads params on reconnect (architecture §14.6.5).
 *
 * Path A: this y-partyserver binding is replaced in Phase 2 with
 * y-supabase. The interface contract is preserved.
 */
export const realtimeProvider = (opts: RealtimeProviderOptions): RealtimeProvider => {
  const provider = new YProvider(REALTIME_HOST, opts.planId, opts.ydoc, {
    params: { token: opts.accessToken },
  });

  let status: RealtimeStatus = 'connecting';

  const setStatus = (s: RealtimeStatus) => {
    status = s;
    opts.onStatus(s);
  };

  provider.on('status', (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
    setStatus(event.status);
  });

  return {
    connect: () => {
      showReconnecting('Connecting…');
      provider.connect();
    },
    disconnect: () => {
      provider.disconnect();
      setStatus('disconnected');
    },
    get status() {
      return status;
    },
  };
};

/** Refresh the Supabase session and reconnect. Called from a
 *  onAuthenticationFailed listener (Phase 2+). */
export const refreshAndReconnect = async (
  provider: RealtimeProvider,
  getAccessToken: () => Promise<string>,
): Promise<void> => {
  showReconnecting('Reconnecting…');
  await getAccessToken();
  provider.disconnect();
  provider.connect();
};