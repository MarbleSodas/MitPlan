/**
 * Realtime provider factory — Path A Hardened. ADR-0003.
 *
 * Returns a {@link SupabaseBroadcastProvider} wired to the singleton
 * Supabase client from `./supabase.js`. The factory is the only public
 * surface; consumers depend on the provider-agnostic {@link RealtimeProvider}
 * interface from `@xivmitplan/crdt/provider`, never on the concrete class.
 *
 * History: prior versions of this file wrapped `y-supabase` (a 4-star
 * community fork under `supabase-community`). That implementation has
 * been replaced with our own ~250-LOC bridge
 * (`./supabase-broadcast-provider.ts`). See ADR-0003 for the rationale
 * and the v2 re-introduction triggers for a Hocuspocus-on-DO swap.
 */
import { supabase as defaultSupabase } from './supabase.js';
import {
  SupabaseBroadcastProvider,
  type SupabaseLike,
} from './supabase-broadcast-provider.js';
import type { RealtimeProvider, RealtimeProviderOptions } from '@xivmitplan/crdt';

// Re-export so existing imports from this file keep working.
export type { RealtimeProvider, RealtimeProviderOptions, RealtimeStatus } from '@xivmitplan/crdt';

/**
 * Extended provider interface that includes an explicit reconnect
 * method for error/offline recovery.
 */
export interface RealtimeProviderWithReconnect extends RealtimeProvider {
  reconnect(): void;
}

/**
 * Construct a {@link SupabaseBroadcastProvider} for the given plan.
 *
 * The Supabase client is the singleton from `lib/supabase.ts` (the same
 * client used for Auth + PostgREST RPCs). Tests can pass a mock via the
 * `supabase` option; production callers should omit it.
 *
 * ADR-0003 §"v2 re-introduction triggers" documents when to swap this
 * factory for a Hocuspocus-on-DO binding: at sustained 100+ concurrent
 * Realtime connections OR 50+ msgs/sec OR any single plan going viral.
 */
export const realtimeProvider = (
  opts: RealtimeProviderOptions & { supabase?: SupabaseLike },
): RealtimeProviderWithReconnect => {
  // Build the provider options without forwarding `shareToken` if it's
  // undefined — `exactOptionalPropertyTypes` in tsconfig.base.json
  // rejects explicit `undefined` for optional fields.
  const providerOpts = {
    planId: opts.planId,
    ydoc: opts.ydoc,
    accessToken: opts.accessToken,
    onStatus: opts.onStatus,
    ...(opts.readOnly !== undefined ? { readOnly: opts.readOnly } : {}),
    supabase: opts.supabase ?? (defaultSupabase as unknown as SupabaseLike),
    ...(opts.shareToken !== undefined ? { shareToken: opts.shareToken } : {}),
  };
  return new SupabaseBroadcastProvider(providerOpts);
};
