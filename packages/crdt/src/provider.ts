/**
 * Realtime provider abstraction. Architecture §14.1 (Path A: y-supabase).
 *
 * The `RealtimeProvider` interface is provider-agnostic — it hides the
 * wire-protocol implementation (y-supabase, Hocuspocus, Liveblocks, etc.)
 * from the consuming UI code. Consumers depend only on `connect` /
 * `disconnect` / `status` and on the `RealtimeProviderFactory` shape.
 *
 * Today (2026-06-27) the only binding is y-supabase in
 * `apps/web/src/lib/realtime-provider.ts`. The abstraction exists so a
 * future swap to Liveblocks, PartyKit, or Hocuspocus+DO (the v2
 * re-introduction trigger from ADR-0002 §"v2 re-introduction triggers")
 * is a mechanical change in `apps/web/`, not a multi-package refactor.
 *
 * Server-side bindings (the old `apps/realtime` YServer subclass) do
 * not use this interface — they're a different abstraction entirely
 * (Supabase Realtime + RLS policies, per ADR-0002).
 */
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

/** High-level connection status surfaced to UI consumers. */
export type RealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

/** Inputs to `RealtimeProviderFactory`. */
export interface RealtimeProviderOptions {
  /** The plan this provider is bound to. Used as the channel/room name. */
  planId: string;
  /** The Y.Doc to sync. The provider attaches handlers; the consumer owns the lifecycle. */
  ydoc: Y.Doc;
  /** Supabase (or other) access token; passed through for auth on the wire. */
  accessToken: string;
  /** Called when the high-level status changes. */
  onStatus: (status: RealtimeStatus) => void;
  /** Optional share-link token (X-Plan-Access-Token header on the legacy path). */
  shareToken?: string;
}

/**
 * The provider interface. The contract:
 *
 * - `connect()` is idempotent. Calling twice should not open two connections.
 * - `disconnect()` is idempotent. Calling when already disconnected is a no-op.
 * - `status` reflects the latest state observed by the implementation.
 *   The implementation must invoke `onStatus` whenever it changes.
 *
 * Implementations may expose additional methods (e.g. for explicit
 * reconnect after a token refresh); those are accessed through the
 * concrete type, not this interface.
 */
export interface RealtimeProvider {
  connect(): void;
  disconnect(): void;
  readonly status: RealtimeStatus;
}

/**
 * Factory signature. Implementations receive the options and return a
 * `RealtimeProvider`. The factory is responsible for *not* connecting
 * until `connect()` is called on the returned instance.
 */
export type RealtimeProviderFactory = (
  opts: RealtimeProviderOptions,
) => RealtimeProvider;

/**
 * Refresh the auth token and reconnect. Helper kept on the abstraction
 * surface so consumers can call it without depending on the concrete
 * provider type. (The concrete y-supabase binding re-reads the
 * Supabase client's auth headers on reconnect, so refreshing the token
 * in the underlying Supabase client is the typical call sequence.)
 */
export type RefreshAndReconnect = (
  provider: RealtimeProvider,
  getAccessToken: () => Promise<string>,
) => Promise<void>;

/**
 * Re-exported for callers that want to construct their own Awareness
 * wrapper without depending on `y-protocols/awareness` directly.
 * The `Awareness` class is from `y-protocols`; re-exporting here keeps
 * the type imports inside the package.
 */
export type { Awareness };