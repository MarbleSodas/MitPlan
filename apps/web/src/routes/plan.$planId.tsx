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
 *   2. Fetch plan-row metadata via `data-source.getPlan()` so the
 *      editor knows the right encounter + plan name (used for plans
 *      opened from a PlanCard with no `?encounterId=` URL param).
 *   3. Hydrate Y.Doc from `data-source.getYDocSnapshot(planId)` if
 *      one exists (the `load_ydoc_snapshot` RPC). This runs once per
 *      plan mount — encounter changes do NOT re-hydrate because the
 *      snapshot is per-plan, not per-encounter. If a `?token=` is
 *      present the snapshot effect waits for `redeemShare()` to
 *      complete first (the recipient needs a `plan_access` row before
 *      the snapshot RPC will authorize them).
 *   4. Connect the realtime provider; broadcast + sync the doc.
 *
 * The encounter is determined by (a) the `?encounterId=` query param
 * (set by `plan.index.tsx`'s "New plan" CTA), (b) the plan row
 * (`planRow.encounterId` from `getPlan()`), or (c) the FRU P1 default
 * for the cold-open demo.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { ArrowLeft, Plus, Share2, Sparkles, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import * as Y from 'yjs';
import { PlanDoc, createPlanDoc } from '@xivmitplan/crdt';
import {
  realtimeProvider,
  type RealtimeProvider,
  type RealtimeStatus,
} from '../lib/realtime-provider.js';
import { useSession } from '../lib/supabase.js';
import { usePlanDoc } from '@/lib/use-plan-doc';
import { usePresence } from '@/lib/use-presence';
import {
  getEncounter,
  getPlan,
  getTimelineForEncounter,
  getYDocSnapshot,
  getPlanRole,
  listAbilities,
  redeemShare,
  saveSnapshot,
  type AbilityInfo,
  type EncounterInfo,
  type PlanInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import { evaluateEventMit, detectDoubleBookings, type MitStackResult } from '@/lib/mit-evaluator';
import { formatMs } from '@/lib/utils';
import { FRU_P1_ID } from '@/lib/sample-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AssignmentRow } from '@/components/plan/assignment-row';
import { AbilityPicker } from '@/components/plan/ability-picker';
import { TimelineRail } from '@/components/plan/timeline-rail';
import { DraggableAbilityStrip } from '@/components/plan/draggable-ability-strip';
import { PresenceBar } from '@/components/plan/presence-bar';
import { ShareDialog } from '@/components/plan/share-dialog';
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
  // Share-link capability token (from /plan/:id?token=...). When present
  // and the viewer is signed in, it is redeemed for a plan_access row.
  const shareToken = search.get('token') ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // null = no token to redeem; false = pending; true = redeemed (or skipped).
  const [shareRedeemed, setShareRedeemed] = useState<boolean | null>(shareToken ? false : null);
  // Only the picked id is needed — AbilityPicker resolves the full
  // event from the timeline events it already has.
  const [pickedEventId, setPickedEventId] = useState<string | null>(null);
  // Plan-row metadata loaded from data-source.getPlan(). Once loaded,
  // its `encounterId` overrides the URL query param + FRU P1 fallback.
  const [planRow, setPlanRow] = useState<PlanInfo | null>(null);
  const [planRole, setPlanRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER' | null | undefined>(undefined);
  // DnD: dragged ability chip for the overlay.
  const [activeDragAbility, setActiveDragAbility] = useState<AbilityInfo | null>(null);

  // The encounter is determined by (a) the URL query param set by the
  // "New plan" CTA, (b) the encounter stored in the plan row (loaded
  // below), or (c) the FRU P1 default for the cold-open demo.
  const urlEncounterId = search.get('encounterId');
  const initialName = search.get('name') ?? '';

  const { assignments, addAssignment, removeAssignment, planName, setPlanName, ready } = usePlanDoc(
    planDoc,
    planId ?? '00000000-0000-0000-0000-000000000000',
    initialName,
  );

  // Presence: track who's currently viewing this plan.
  const canEdit = planRole === 'OWNER' || planRole === 'EDITOR';
  const isOwner = planRole === 'OWNER';
  const presenceUsers = usePresence(planId ?? null, canEdit);

  // Create the Y.Doc once on mount, destroy on unmount.
  useEffect(() => {
    const doc = createPlanDoc();
    setPlanDoc(doc);
    return () => {
      doc.doc.destroy();
      setPlanDoc(null);
    };
  }, []);

  // Load the plan-row metadata so the editor can render the right
  // encounter + name when opened from a PlanCard (no `?encounterId=`
  // URL param). Runs once per plan mount; failure is non-fatal — the
  // editor falls back to the URL param, then FRU P1.
  useEffect(() => {
    if (!planId) return;
    let mounted = true;
    getPlan(planId)
      .then((row) => {
        if (!mounted) return;
        setPlanRow(row);
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[plan-editor] getPlan failed', err);
      });
    return () => {
      mounted = false;
    };
  }, [planId]);

  // Effective encounter id: URL query param > plan row > FRU P1 default.
  const encounterId = urlEncounterId ?? planRow?.encounterId ?? FRU_P1_ID;

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

  // Redeem a share-link token (account-grant model). Runs once when the
  // viewer is signed in and a ?token= is present. Grants a plan_access
  // row so the snapshot load + realtime connect below succeed. Errors
  // are non-fatal: the editor still proceeds (the snapshot simply won't
  // load, and the user can retry by reopening the link).
  useEffect(() => {
    if (!shareToken || !session.user || shareRedeemed !== false || !planId) return;
    let mounted = true;
    redeemShare(planId, shareToken)
      .then(() => {
        if (mounted) setShareRedeemed(true);
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[plan-editor] share token redeem failed', err);
        if (mounted) setShareRedeemed(true);
      });
    return () => {
      mounted = false;
    };
  }, [shareToken, session.user, shareRedeemed, planId]);

  // Role is derived by the database after share redemption completes. Do not
  // infer write access from URL state or from a client-side share token.
  useEffect(() => {
    if (!planId || !session.user || (shareToken && shareRedeemed !== true)) return;
    let mounted = true;
    getPlanRole(planId)
      .then((role) => {
        if (mounted) setPlanRole(role);
      })
      .catch(() => {
        if (mounted) setPlanRole(null);
      });
    return () => {
      mounted = false;
    };
  }, [planId, session.user?.id, shareToken, shareRedeemed]);

  // Snapshot restore. When the Y.Doc mounts, fetch the latest
  // snapshot for the plan (if any) and apply it before the realtime
  // provider connects. Runs ONCE per plan mount — the snapshot is
  // per-plan, not per-encounter, so encounter changes don't re-fire
  // this effect. Waits for any share-token redeem to finish first.
  //
  // NOTE: `shareRedeemed` is intentionally in the dep list. Without it
  // a share-link recipient would mount the doc + bail out of this
  // effect while redemption is pending, then never re-run when
  // redemption completes — leaving `hydrated` stuck at `false` and the
  // realtime provider unconnected.
  useEffect(() => {
    if (!planDoc || !planId) return;
    if (shareToken && shareRedeemed !== true) return;
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
  }, [planDoc, planId, shareToken, shareRedeemed]);

  // Wire the realtime provider to the same Y.Doc. Re-runs only when
  // auth state changes; the Y.Doc itself is stable across renders.
  // Gated on `hydrated` so we don't broadcast before the snapshot is
  // applied (which would race with the cold-load).
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

    // Late-join sync. After SUBSCRIBED, another debounced fetch picks
    // up any edits that were committed between our initial snapshot
    // read and the channel handshake — the 2s debounce in the
    // broadcast provider means the snapshot is briefly behind any
    // active editors. The 1500ms delay lands before the next debounce
    // fires. Origin 'remote' prevents echoing back as a local update.
    let lateJoinTimer: ReturnType<typeof setTimeout> | null = null;
    const wasStatus = (s: RealtimeStatus) => provider.status === s;
    const checkLateJoin = () => {
      if (wasStatus('connected')) {
        getYDocSnapshot(planId)
          .then((snap) => {
            if (snap && snap.byteSize > 1) {
              Y.applyUpdate(planDoc.doc, snap.update, 'remote');
            }
          })
          .catch(() => {
            /* non-fatal — broadcast will catch up on next edit */
          });
      }
    };
    const intervalId = setInterval(() => {
      if (wasStatus('connected')) {
        lateJoinTimer = null;
        clearInterval(intervalId);
        // Two re-fetches spaced 1500ms apart cover the 2s snapshot
        // debounce window so we converge on any in-flight edits.
        lateJoinTimer = setTimeout(checkLateJoin, 1500);
        setTimeout(checkLateJoin, 3000);
      }
    }, 200);
    // Bound the late-join window at 30s in case connection never lands.
    const boundTimer = setTimeout(() => clearInterval(intervalId), 30_000);

    return () => {
      provider.disconnect();
      providerRef.current = null;
      clearInterval(intervalId);
      clearTimeout(boundTimer);
      if (lateJoinTimer) clearTimeout(lateJoinTimer);
    };
  }, [planDoc, planId, hydrated, planRole, canEdit, session.loading, session.user?.id]);

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

  // Compute mit stacks for every event. Used by TimelineRail to show
  // residual % badges. Recomputes when assignments or abilities change.
  const mitStacks = useMemo(() => {
    if (!events) return new Map<string, MitStackResult>();
    const m = new Map<string, MitStackResult>();
    for (const e of events) {
      m.set(e.id, evaluateEventMit(e.id, assignments, abilityById));
    }
    return m;
  }, [events, assignments, abilityById]);

  // Detect double-bookings: same ability + job on the same event or
  // within the recast window of another event.
  const conflictingAssignmentIds = useMemo(() => {
    const conflicts = detectDoubleBookings(assignments, abilityById);
    const ids = new Set<string>();
    for (const [, list] of conflicts) {
      for (const a of list) ids.add(a.id);
    }
    return ids;
  }, [assignments, abilityById]);

  // All useCallback / useState hooks must be declared above the early
  // returns below — the React Rules of Hooks forbid changing the
  // hook count between renders.
  const handleAddAssignment = useCallback(
    ({ ability, event }: { ability: AbilityInfo; event: TimelineEventInfo }) => {
      if (!canEdit) return;
      const assignmentId = addAssignment({ ability, event });
      if (assignmentId) {
        toast.success(`${ability.name} assigned`, {
          description: `Anchored to ${event.name} at ${formatMs(event.timestampMs)}`,
          action: {
            label: 'Undo',
            onClick: () => {
              removeAssignment(assignmentId);
              toast.info('Assignment removed');
            },
          },
        });
      }
    },
    [addAssignment, removeAssignment, canEdit],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragAbility(null);
      if (!canEdit) return;
      const { active, over } = event;
      if (!over) return;

      const abilityData = active.data.current;
      const eventData = over.data.current;
      if (
        !abilityData ||
        abilityData.type !== 'ability' ||
        !eventData ||
        eventData.type !== 'event'
      )
        return;

      const ability = abilityData.ability as AbilityInfo;
      const timelineEvent = eventData.event as TimelineEventInfo;

      const assignmentId = addAssignment({ ability, event: timelineEvent });
      if (assignmentId) {
        toast.success(`${ability.name} assigned`, {
          description: `Anchored to ${timelineEvent.name} at ${formatMs(timelineEvent.timestampMs)}`,
          action: {
            label: 'Undo',
            onClick: () => {
              removeAssignment(assignmentId);
              toast.info('Assignment removed');
            },
          },
        });
      }
    },
    [addAssignment, removeAssignment, canEdit],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'ability') {
      setActiveDragAbility(data.ability as AbilityInfo);
    }
  }, []);

  const handleSaveVersion = useCallback(async () => {
    if (!planId) return;
    try {
      await saveSnapshot(planId, 'USER_SAVE');
      toast.success('Version saved');
    } catch {
      toast.error('Could not save version');
    }
  }, [planId]);

  if (session.loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }
  if (!session.user) {
    // Preserve any `?token=` share-link through the auth redirect so
    // the recipient doesn't lose their share context after sign-in.
    const next = shareToken
      ? `/plan/${planId}?token=${encodeURIComponent(shareToken)}`
      : `/plan/${planId}`;
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted-foreground text-sm">Please sign in to view this plan.</p>
        <Button asChild className="mt-4">
          <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  if (planRole === undefined) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (planRole === null) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted-foreground text-sm">You do not have access to this plan.</p>
        <Button asChild className="mt-4">
          <Link to="/plan">Back to plans</Link>
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
          readOnly={!canEdit}
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
          <PresenceBar users={presenceUsers} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveVersion}
            disabled={!ready || !canEdit}
            title="Save a versioned snapshot"
          >
            Save version
          </Button>
          {isOwner && <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
          >
            <Share2 /> Share
          </Button>}
          <Button
            onClick={() => {
              setPickedEventId(null);
              setPickerOpen(true);
            }}
            size="sm"
            disabled={!ready || !defaultEventId || !canEdit}
            title={!defaultEventId ? 'Load a timeline first' : undefined}
          >
            <Plus /> Add mitigation
          </Button>
        </div>
      </div>

      {/* Body: left rail + main canvas */}
      <DndContext {...(canEdit ? { onDragStart: handleDragStart, onDragEnd: handleDragEnd } : {})}>
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
                  isConflicting={conflictingAssignmentIds.has(a.id)}
                  onRemove={removeAssignment}
                />
              ))}
              </div>
            )}
          </aside>

          <main className="bg-background/40 flex-1 overflow-y-auto p-6">
            {canEdit && <DraggableAbilityStrip abilities={abilities} />}
            {eventsError ? (
              <div className="border-border bg-card/40 text-muted-foreground mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-2 rounded-2xl border p-10 text-center">
                <AlertCircle className="text-destructive size-6" />
                <p className="text-sm">Could not load timeline: {eventsError}</p>
              </div>
            ) : (
              <div className="mt-4">
                <TimelineRail
                  events={events}
                  assignments={assignments}
                  mitStacks={mitStacks}
                  selectedEventId={pickedEventId}
                  onPick={pickEvent}
                />
              </div>
            )}
          </main>
        </div>

        <DragOverlay>
          {activeDragAbility && (
            <div className="bg-primary text-primary-foreground rounded-md border px-3 py-1.5 text-xs font-medium shadow-lg">
              {activeDragAbility.jobAbbrev} {activeDragAbility.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {canEdit && <AbilityPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        eventId={defaultEventId}
        abilities={abilities}
        events={events}
        assignments={assignments}
        onPick={handleAddAssignment}
      />}

      {isOwner && <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        planId={planId ?? ''}
        viewers={presenceUsers}
      />}
    </div>
  );
};
