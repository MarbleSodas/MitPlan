/**
 * usePlanSession — shared plan editor lifecycle hook.
 *
 * Extracts the Y.Doc lifecycle, plan metadata loading, snapshot
 * hydration, realtime provider setup, and role resolution from the
 * PlanEditor route so both the planner route and the timeline editor
 * route use the same session logic.
 *
 * Usage:
 *   const session = usePlanSession(planId, { initialName, shareToken });
 *   // session exposes: planDoc, planRow, planRole, events, abilities,
 *   //   encounter, status, hydrated, canEdit, isOwner, etc.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import * as Y from 'yjs';
import { PlanDoc, createPlanDoc } from '@xivmitplan/crdt';
import type { RealtimeStatus } from '@xivmitplan/crdt';
import { useSession } from './supabase';
import {
  realtimeProvider,
  type RealtimeProviderWithReconnect,
} from './realtime-provider';
import {
  getEncounter,
  getPlan,
  getTimelineForEncounter,
  getYDocSnapshot,
  getPlanRole,
  listAbilities,
  redeemShare,
  getCanonicalTimelineForEncounter,
  type AbilityInfo,
  type EncounterInfo,
  type PlanInfo,
  type TimelineEventInfo,
  type CanonicalTimelineInfo,
} from './data-source';
import { FRU_P1_ID } from './sample-data';

export interface PlanSessionOptions {
  /** Initial plan name (from URL query param). */
  initialName?: string;
  /** Share-link token (from ?token= URL param). */
  shareToken?: string | null;
}

export interface PlanSessionResult {
  /** The Yjs PlanDoc, or null before creation. */
  planDoc: PlanDoc | null;
  /** Plan row metadata loaded from the server, or null. */
  planRow: PlanInfo | null;
  /** Server-derived role, or null without access. */
  planRole: 'OWNER' | 'EDITOR' | 'VIEWER' | null | undefined;
  /** True when the plan role is OWNER or EDITOR. */
  canEdit: boolean;
  /** True when the plan role is OWNER. */
  isOwner: boolean;
  /** The resolved encounter info, or null. */
  encounter: EncounterInfo | null;
  /** Canonical timeline events loaded from the server. */
  events: TimelineEventInfo[] | null;
  /** Error message if timeline loading failed. */
  eventsError: string | null;
  /** Full canonical timeline with provenance metadata. */
  canonicalTimeline: CanonicalTimelineInfo | null;
  /** Ability catalog. */
  abilities: AbilityInfo[] | null;
  /** Realtime connection status. */
  status: RealtimeStatus;
  /** True when the Y.Doc has been hydrated from the server snapshot. */
  hydrated: boolean;
  /** True when the provider is fully connected and synced. */
  ready: boolean;
  /** The realtime provider instance, for manual reconnect. */
  providerRef: React.MutableRefObject<RealtimeProviderWithReconnect | null>;
  /** Manual reconnect handler. */
  reconnect: () => void;
  /** The resolved encounter id. */
  encounterId: string;
}

export const usePlanSession = (
  planId: string | undefined,
  options: PlanSessionOptions = {},
): PlanSessionResult => {
  const { shareToken: externalShareToken } = options;
  const [search] = useSearchParams();
  const session = useSession();
  const urlShareToken = search.get('token') ?? null;
  const shareToken = externalShareToken ?? urlShareToken;

  // Core state
  const [planDoc, setPlanDoc] = useState<PlanDoc | null>(null);
  const [planRow, setPlanRow] = useState<PlanInfo | null>(null);
  const [planRole, setPlanRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER' | null | undefined>(
    undefined,
  );
  const [encounter, setEncounter] = useState<EncounterInfo | null>(null);
  const [events, setEvents] = useState<TimelineEventInfo[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [canonicalTimeline, setCanonicalTimeline] = useState<CanonicalTimelineInfo | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const providerRef = useRef<RealtimeProviderWithReconnect | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [shareRedeemed, setShareRedeemed] = useState<boolean | null>(
    shareToken ? false : null,
  );

  const canEdit = planRole === 'OWNER' || planRole === 'EDITOR';
  const isOwner = planRole === 'OWNER';
  const urlEncounterId = search.get('encounterId');

  // Create the Y.Doc on planId change.
  useEffect(() => {
    if (!planId) return;
    setPlanDoc(null);
    setHydrated(false);
    setPlanRole(undefined);
    setStatus('connecting');
    const doc = createPlanDoc();
    setPlanDoc(doc);
    return () => {
      doc.doc.destroy();
      setPlanDoc(null);
    };
  }, [planId]);

  // Load plan row metadata.
  useEffect(() => {
    if (!planId) return;
    let mounted = true;
    getPlan(planId)
      .then((row) => {
        if (mounted) setPlanRow(row);
      })
      .catch(() => { /* non-fatal */ });
    return () => { mounted = false; };
  }, [planId]);

  // Seed the doc's plan name from plan-row metadata.
  useEffect(() => {
    if (!planRow || !planDoc || !planId) return;
    const currentName = planDoc.meta.get('name');
    if (!currentName || currentName === `Plan ${planId.slice(0, 8)}`) {
      planDoc.meta.set('name', planRow.name);
    }
  }, [planId, planRow, planDoc]);

  // Resolve encounter id.
  const encounterId = urlEncounterId ?? planRow?.encounterId ?? FRU_P1_ID;

  // Load encounter + timeline + ability catalog.
  useEffect(() => {
    let mounted = true;
    setEvents(null);
    setEncounter(null);
    setEventsError(null);
    setCanonicalTimeline(null);

    Promise.all([
      getEncounter(encounterId),
      getTimelineForEncounter(encounterId),
      listAbilities(),
      getCanonicalTimelineForEncounter(encounterId),
    ])
      .then(([enc, evts, abs, canonical]) => {
        if (!mounted) return;
        setEncounter(enc);
        setEvents(evts);
        setAbilities(abs);
        setCanonicalTimeline(canonical);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setEventsError(err instanceof Error ? err.message : 'Failed to load timeline');
      });

    return () => { mounted = false; };
  }, [encounterId]);

  // Redeem share-link token.
  useEffect(() => {
    if (!shareToken || !session.user || shareRedeemed !== false || !planId) return;
    let mounted = true;
    redeemShare(planId, shareToken)
      .then(() => { if (mounted) setShareRedeemed(true); })
      .catch(() => { if (mounted) setShareRedeemed(true); });
    return () => { mounted = false; };
  }, [shareToken, session.user, shareRedeemed, planId]);

  // Load plan role.
  useEffect(() => {
    if (!planId || !session.user || (shareToken && shareRedeemed !== true)) return;
    let mounted = true;
    getPlanRole(planId)
      .then((role) => { if (mounted) setPlanRole(role); })
      .catch(() => { if (mounted) setPlanRole(null); });
    return () => { mounted = false; };
  }, [planId, session.user?.id, shareToken, shareRedeemed]);

  // Hydrate Y.Doc from server snapshot.
  useEffect(() => {
    if (!planDoc || !planId) return;
    if (shareToken && shareRedeemed !== true) return;
    let mounted = true;
    void (async () => {
      try {
        const snap = await getYDocSnapshot(planId);
        if (!mounted) return;
        if (snap && snap.byteSize > 1) {
          Y.applyUpdate(planDoc.doc, snap.update);
        }
      } catch {
        // non-fatal
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, [planDoc, planId, shareToken, shareRedeemed]);

  // Wire realtime provider.
  useEffect(() => {
    if (!planDoc || !planId || !hydrated || !planRole) return;
    if (session.loading || !session.session) return;
    const accessToken = session.session.access_token;
    if (!accessToken) return;
    const provider = realtimeProvider({
      planId,
      ydoc: planDoc.doc,
      accessToken,
      onStatus: setStatus,
      readOnly: !canEdit,
    });
    providerRef.current = provider;
    provider.connect();

    // Late-join sync: re-fetch snapshot after connect to catch any
    // in-flight edits that were made between our initial snapshot read
    // and channel handshake.
    const lateJoinTimers: ReturnType<typeof setTimeout>[] = [];
    const intervalId = setInterval(() => {
      if (provider.status === 'connected') {
        clearInterval(intervalId);
        const check = () => {
          if (provider.status !== 'connected') return;
          getYDocSnapshot(planId).then((snap) => {
            if (snap && snap.byteSize > 1) {
              Y.applyUpdate(planDoc.doc, snap.update, 'remote');
            }
          }).catch(() => { /* non-fatal */ });
        };
        lateJoinTimers.push(setTimeout(check, 1500), setTimeout(check, 3000));
      }
    }, 200);
    const boundTimer = setTimeout(() => clearInterval(intervalId), 30_000);

    return () => {
      provider.disconnect();
      providerRef.current = null;
      clearInterval(intervalId);
      clearTimeout(boundTimer);
      for (const t of lateJoinTimers) clearTimeout(t);
    };
  }, [planDoc, planId, hydrated, planRole, canEdit, session.loading, session.user?.id]);

  // Auto-reconnect on transient errors.
  useEffect(() => {
    if (status !== 'error') return;
    if (!providerRef.current) return;
    const timer = setTimeout(() => {
      providerRef.current?.reconnect();
    }, 5000);
    return () => clearTimeout(timer);
  }, [status, planId]);

  const ready = planDoc !== null && hydrated && planRole !== undefined;

  return {
    planDoc,
    planRow,
    planRole,
    canEdit,
    isOwner,
    encounter,
    events,
    eventsError,
    canonicalTimeline,
    abilities,
    status,
    hydrated,
    ready,
    providerRef,
    reconnect: () => providerRef.current?.reconnect(),
    encounterId,
  };
};
