/**
 * Plan editor. The Yjs-backed real-time view. Architecture §3.2, §14.6.5.
 *
 * Phase 0: stub + realtime provider wiring. Phase 2+ renders the
 * dual-pane editor (timeline + mit assignments + tank state).
 *
 * Path A Hardened (ADR-0003): the realtime provider is our own
 * SupabaseBroadcastProvider (~250 LOC). The Supabase client is the
 * singleton from `lib/supabase.ts`, read directly by the factory.
 * Snapshots are written via the upsert_ydoc_snapshot RPC
 * (migration 0002) on a 2s debounce.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import * as Y from 'yjs';
import { createPlanDoc } from '@xivmitplan/crdt/factory';
import {
  realtimeProvider,
  type RealtimeProvider,
} from '../lib/realtime-provider.js';
import { useSession } from '../lib/supabase.js';

export const PlanEditor = () => {
  const { planId } = useParams<{ planId: string }>();
  const session = useSession();
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<RealtimeProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'connecting',
  );

  useEffect(() => {
    if (!planId) return;
    if (session.loading || !session.session) return;
    // Guard against anon / incomplete sessions where access_token is
    // undefined. The provider defensively handles undefined but the
    // presence key would be empty, which is worse than not connecting.
    const accessToken = session.session.access_token;
    if (!accessToken) return;
    const doc = createPlanDoc().doc;
    docRef.current = doc;
    const provider = realtimeProvider({
      planId,
      ydoc: doc,
      accessToken,
      onStatus: setStatus,
    });
    providerRef.current = provider;
    provider.connect();
    return () => {
      provider.disconnect();
      providerRef.current = null;
      docRef.current = null;
    };
    // Depend on `session.user?.id` rather than `session.session`: a new
    // Session object reference is produced by supabase-js's
    // onAuthStateChange on every TOKEN_REFRESHED (~hourly). Depending
    // on `session.session` would tear down and recreate the Y.Doc +
    // provider on every refresh, abandoning any in-flight local edits.
    // The provider captures accessToken once in the constructor for the
    // presence key (display-only); the realtime auth gate reads from
    // the supabase client's auto-refreshed session header.
  }, [planId, session.loading, session.user?.id]);

  if (session.loading) return <p>Loading…</p>;
  if (!session.user) return <p>Please sign in.</p>;

  return (
    <div className="plan-editor">
      <header>
        <h1>Plan {planId?.slice(0, 8)}</h1>
        <span className={`status status-${status}`}>{status}</span>
      </header>
      <p className="muted">Phase 0 stub. Phase 2+ renders the dual-pane editor.</p>
    </div>
  );
};
