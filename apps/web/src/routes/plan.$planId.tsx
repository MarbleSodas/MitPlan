/**
 * Plan editor. The Yjs-backed real-time view. Architecture §3.2, §14.6.5.
 *
 * Path A Hardened (ADR-0003): the realtime provider is our own
 * `SupabaseBroadcastProvider`. The Supabase client is the singleton
 * from `lib/supabase.ts`, read directly by the factory. Snapshots are
 * written via the `upsert_ydoc_snapshot` RPC on a 2s debounce.
 *
 * Phase 1 layout (Caffeine-styled):
 *   - Top header: back-link, plan name (editable), realtime status
 *     badge, Add-mit CTA, encounter breadcrumb.
 *   - Two-column body: left rail = assignments list (live), main
 *     canvas = TimelineRail of the encounter's base timeline.
 *   - AbilityPicker is a right-anchored Sheet, pre-anchored to the
 *     event the user clicked (or the first event by default).
 *
 * Cold-load flow:
 *   1. Mount Y.Doc.
 *   2. Hydrate Y.Doc from `data-source.getYDocSnapshot(planId)` if
 *      one exists (the `load_ydoc_snapshot` RPC). This runs once per
 *      plan mount — encounter changes do NOT re-hydrate because the
 *      snapshot is per-plan, not per-encounter.
 *   3. Connect the realtime provider; broadcast + sync the doc.
 *
 * The encounter is read from the `?encounterId=` query param if
 * present (set by `plan.index.tsx`'s "New plan" CTA). Otherwise we
 * fall back to FRU P1 for the cold-open demo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { ArrowLeft, Plus, Sparkles, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import * as Y from 'yjs';
import { PlanDoc, createPlanDoc } from '@xivmitplan/crdt';
import {
  realtimeProvider,
  type RealtimeProvider,
  type RealtimeStatus,
} from '../lib/realtime-provider.js';
import { useSession } from '../lib/supabase.js';
import { usePlanDoc } from '@/lib/use-plan-doc';
import {
  getEncounter,
  getTimelineForEncounter,
  getYDocSnapshot,
  listAbilities,
  type AbilityInfo,
  type EncounterInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import { FRU_P1_ID } from '@/lib/sample-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AssignmentRow } from '@/components/plan/assignment-row';
import { AbilityPicker } from '@/components/plan/ability-picker';
import { TimelineRail } from '@/components/plan/timeline-rail';
import { Logo } from '@/components/logo';

const STATUS_BADGE: Record<
  RealtimeStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }
> = {
  connecting: { variant: 'secondary', icon: <Loader2 className="size-3 animate-spin" />, label: 'Connecting' },
  connected: { variant: 'default', icon: <Wifi className="size-3" />, label: 'Live' },
  disconnected: { variant: 'outline', icon: <WifiOff className="size-3" />, label: 'Offline' },
  error: { variant: 'destructive', icon: <AlertCircle className="size-3" />, label: 'Error' },
};

export const PlanEditor = () => {
  const { planId } = useParams<{ planId: string }>();
  const [search] = useSearchParams();
  const session = useSession();
  const [planDoc, setPlanDoc] = useState<PlanDoc | null>(null);
  const [encounter, setEncounter] = useState<EncounterInfo | null>(null);
  const [events, setEvents] = useState<TimelineEventInfo[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const providerRef = useRef<RealtimeProvider | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Only the picked id is needed — AbilityPicker resolves the full
  // event from the timeline events it already has.
  const [pickedEventId, setPickedEventId] = useState<string | null>(null);

  // The encounter is determined by (a) the URL query param set by the
  // "New plan" CTA, (b) the encounter stored in the plan row (Phase 2+),
  // or (c) the FRU P1 default for the cold-open demo.
  const encounterId = search.get('encounterId') ?? FRU_P1_ID;
  const initialName = search.get('name') ?? '';

  const { assignments, addAssignment, removeAssignment, planName, setPlanName, ready } = usePlanDoc(
    planDoc,
    planId ?? '00000000-0000-0000-0000-000000000000',
    initialName,
  );

  // Create the Y.Doc once on mount, destroy on unmount.
  useEffect(() => {
    const doc = createPlanDoc();
    setPlanDoc(doc);
    return () => {
      doc.doc.destroy();
      setPlanDoc(null);
    };
  }, []);

  // Load the encounter + timeline + ability catalog when the
  // encounter changes. Runs in parallel; the timeline rail renders as
  // soon as `events` lands. Doesn't gate the realtime provider — the
  // snapshot effect below owns hydration.
  useEffect(() => {
    let mounted = true;
    setEvents(null);
    setEncounter(null);
    setEventsError(null);

    Promise.all([
      getEncounter(encounterId),
      getTimelineForEncounter(encounterId),
      listAbilities(),
    ])
      .then(([enc, evts, abs]) => {
        if (!mounted) return;
        setEncounter(enc);
        setEvents(evts);
        setAbilities(abs);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        // eslint-disable-next-line no-console
        console.error('[plan-editor] encounter load failed', err);
        setEventsError(err instanceof Error ? err.message : 'Failed to load timeline');
      });

    return () => {
      mounted = false;
    };
  }, [encounterId]);

  // Snapshot restore. When the Y.Doc mounts, fetch the latest
  // snapshot for the plan (if any) and apply it before the realtime
  // provider connects. Runs ONCE per plan mount — the snapshot is
  // per-plan, not per-encounter, so encounter changes don't re-fire
  // this effect.
  useEffect(() => {
    if (!planDoc || !planId) return;
    let mounted = true;
    void (async () => {
      try {
        const snap = await getYDocSnapshot(planId);
        if (!mounted) return;
        if (snap && snap.byteSize > 1) {
          // byteSize > 1 skips the single-byte placeholder row that
          // plans-create inserts (prevents applying an empty update).
          Y.applyUpdate(planDoc.doc, snap.update);
        }
      } catch (err: unknown) {
        // Snapshot load failure is non-fatal: the realtime provider
        // will still sync the live doc, and the next debounced save
        // (2s of idle) will repair the snapshot.
        // eslint-disable-next-line no-console
        console.warn('[plan-editor] snapshot load failed', err);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [planDoc, planId]);

  // Wire the realtime provider to the same Y.Doc. Re-runs only when
  // auth state changes; the Y.Doc itself is stable across renders.
  // Gated on `hydrated` so we don't broadcast before the snapshot is
  // applied (which would race with the cold-load).
  useEffect(() => {
    if (!planDoc || !planId || !hydrated) return;
    if (session.loading || !session.session) return;
    const accessToken = session.session.access_token;
    if (!accessToken) return;
    const provider = realtimeProvider({
      planId,
      ydoc: planDoc.doc,
      accessToken,
      onStatus: setStatus,
    });
    providerRef.current = provider;
    provider.connect();
    return () => {
      provider.disconnect();
      providerRef.current = null;
    };
  }, [planDoc, planId, hydrated, session.loading, session.user?.id]);

  // Resolve the event id the AbilityPicker will pre-anchor new mits to:
  // user-picked id → first event of the loaded timeline.
  const defaultEventId = pickedEventId ?? events?.[0]?.id ?? null;

  // Lookup maps for the assignment row. Built lazily from the
  // data-source results; the row handles `null` entries gracefully
  // (renders a skeleton) so the rail doesn't pop while loading.
  const abilityById = useMemo(() => {
    const m = new Map<string, AbilityInfo>();
    for (const a of abilities ?? []) m.set(a.id, a);
    return m;
  }, [abilities]);
  const eventById = useMemo(() => {
    const m = new Map<string, TimelineEventInfo>();
    for (const e of events ?? []) m.set(e.id, e);
    return m;
  }, [events]);

  if (session.loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }
  if (!session.user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted-foreground text-sm">Please sign in to view this plan.</p>
        <Button asChild className="mt-4">
          <Link to={`/login?next=/plan/${planId}`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[status];
  const pickEvent = (e: TimelineEventInfo) => {
    setPickedEventId(e.id);
    setPickerOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b bg-card/40 px-6 py-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/plan" aria-label="Back to plans">
            <ArrowLeft />
          </Link>
        </Button>
        <Logo className="text-primary hidden sm:block" />
        <Input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="h-8 max-w-md border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-input"
          aria-label="Plan name"
        />
        {encounter && (
          <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
            {encounter.raidSlug.toUpperCase()} · {encounter.name}
          </Badge>
        )}
        <Badge variant={statusInfo.variant} className="gap-1.5">
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setPickedEventId(null);
              setPickerOpen(true);
            }}
            size="sm"
            disabled={!ready || !defaultEventId}
            title={!defaultEventId ? 'Load a timeline first' : undefined}
          >
            <Plus /> Add mitigation
          </Button>
        </div>
      </div>

      {/* Body: left rail + main canvas */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="bg-sidebar text-sidebar-foreground flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r p-4">
          <header className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold tracking-widest uppercase">Mitigations</h2>
            <span className="text-muted-foreground font-mono text-[10px]">
              {assignments.length}
            </span>
          </header>
          {assignments.length === 0 ? (
            <div className="border-border bg-card/40 flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No mitigations yet</p>
                <p className="text-muted-foreground text-xs">
                  Click an event on the timeline to plan your first.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {assignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  ability={abilityById.get(a.abilityId) ?? null}
                  event={eventById.get(a.eventId) ?? null}
                  onRemove={removeAssignment}
                />
              ))}
            </div>
          )}
        </aside>

        <main className="bg-background/40 flex-1 overflow-y-auto p-6">
          {eventsError ? (
            <div className="border-border bg-card/40 text-muted-foreground mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-2 rounded-2xl border p-10 text-center">
              <AlertCircle className="text-destructive size-6" />
              <p className="text-sm">Could not load timeline: {eventsError}</p>
            </div>
          ) : (
            <TimelineRail
              events={events}
              assignments={assignments}
              onPick={pickEvent}
            />
          )}
        </main>
      </div>

      <AbilityPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        eventId={defaultEventId}
        abilities={abilities}
        events={events}
        onPick={({ ability, event }) => {
          addAssignment({ ability, event });
        }}
      />
    </div>
  );
};