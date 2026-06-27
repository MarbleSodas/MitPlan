/**
 * Plan editor. The Yjs-backed real-time view. Architecture §3.2, §14.6.5.
 *
 * Phase 0: stub + realtime provider wiring. Phase 2+ renders the
 * dual-pane editor (timeline + mit assignments + tank state).
 *
 * Path A (ADR-0002): the realtime provider wraps y-supabase and writes
 * snapshots via the upsert_ydoc_snapshot RPC (migration 0002). The
 * Supabase client is attached to the Y.Doc via `attachSupabaseClient`
 * so the provider can read it without constructing its own.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import * as Y from 'yjs';
import { createPlanDoc } from '@xivmitplan/crdt/factory';
import {
  attachSupabaseClient,
  realtimeProvider,
  type RealtimeProvider,
} from '../lib/realtime-provider.js';
import { supabase, useSession } from '../lib/supabase.js';

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
    const doc = createPlanDoc().doc;
    docRef.current = doc;
    attachSupabaseClient(doc, supabase);
    const provider = realtimeProvider({
      planId,
      ydoc: doc,
      accessToken: session.session.access_token,
      onStatus: setStatus,
    });
    providerRef.current = provider;
    provider.connect();
    return () => {
      provider.disconnect();
      providerRef.current = null;
      docRef.current = null;
    };
  }, [planId, session.loading, session.session]);

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
