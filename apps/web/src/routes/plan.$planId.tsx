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
import { useParams, useSearchParams, Link, useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Timeline as TimelineIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import * as Y from 'yjs';
import { PlanDoc, createPlanDoc } from '@xivmitplan/crdt';
import {
  realtimeProvider,
  type RealtimeProviderWithReconnect,
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
  updatePlan,
  duplicatePlan,
  deletePlan,
  exportPlanSnapshot,
  type AbilityInfo,
  type EncounterInfo,
  type PlanInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import {
  evaluateEventMit,
  detectDoubleBookings,
  type ExtendedMitStackResult,
} from '@/lib/mit-evaluator';
import { bytesToBase64 } from '@/lib/bytes';
import { formatMs } from '@/lib/utils';
import { FRU_P1_ID } from '@/lib/sample-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AssignmentRow } from '@/components/plan/assignment-row';
import { TimelineRail } from '@/components/plan/timeline-rail';
import { DraggableAbilityStrip } from '@/components/plan/draggable-ability-strip';
import { MitigationLibrary } from '@/components/plan/mitigation-library';
import { PresenceBar } from '@/components/plan/presence-bar';
import { ShareDialog } from '@/components/plan/share-dialog';
import { Logo } from '@/components/logo';
import { buildLegacyTimeline } from '@/lib/legacy-timeline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STATUS_BADGE: Record<
  RealtimeStatus,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: React.ReactNode;
    label: string;
  }
> = {
  connecting: {
    variant: 'secondary',
    icon: <Loader2 className="size-3 animate-spin" />,
    label: 'Connecting',
  },
  connected: { variant: 'default', icon: <Wifi className="size-3" />, label: 'Live' },
  disconnected: { variant: 'outline', icon: <WifiOff className="size-3" />, label: 'Offline' },
  error: { variant: 'destructive', icon: <AlertCircle className="size-3" />, label: 'Error' },
};

export const PlanEditor = () => {
  const { planId } = useParams<{ planId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const session = useSession();
  const [planDoc, setPlanDoc] = useState<PlanDoc | null>(null);
  const [encounter, setEncounter] = useState<EncounterInfo | null>(null);
  const [events, setEvents] = useState<TimelineEventInfo[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const providerRef = useRef<RealtimeProviderWithReconnect | null>(null);
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
  const [planRole, setPlanRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER' | null | undefined>(
    undefined,
  );
  // Whether this plan was imported from MitPlan v1 (Firebase). Drives the
  // synthetic-timeline reconstruction so its mitigation renders on a canvas.
  const isLegacyPlan = planRow?.isLegacy ?? false;
  // DnD: dragged ability chip for the overlay.
  const [activeDragAbility, setActiveDragAbility] = useState<AbilityInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planAction, setPlanAction] = useState<'duplicate' | 'delete' | 'export' | null>(null);

  // The encounter is determined by (a) the URL query param set by the
  // "New plan" CTA, (b) the encounter stored in the plan row (loaded
  // below), or (c) the FRU P1 default for the cold-open demo.
  const urlEncounterId = search.get('encounterId');
  const initialName = search.get('name') ?? '';

  // Presence: track who's currently viewing this plan.
  // Derived early so usePlanDoc can guard mutations against read-only roles.
  const canEdit = planRole === 'OWNER' || planRole === 'EDITOR';
  const isOwner = planRole === 'OWNER';

  const { assignments, addAssignment, removeAssignment, planName, setPlanName, ready } = usePlanDoc(
    planDoc,
    planId ?? '00000000-0000-0000-0000-000000000000',
    initialName,
    canEdit,
  );
  const presenceUsers = usePresence(planId ?? null, canEdit);

  // Create the Y.Doc on planId, destroy on planId change or unmount.
  // Also resets hydration, role, and status so downstream effects re-fire.
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

  // Hydrate the doc's plan name from plan-row metadata when both are
  // available and the current name is still the auto-generated placeholder.
  useEffect(() => {
    if (!planRow || !planDoc || !planId) return;
    const currentName = planDoc.meta.get('name');
    if (!currentName || currentName === `Plan ${planId.slice(0, 8)}`) {
      planDoc.meta.set('name', planRow.name);
    }
  }, [planId, planRow, planDoc]);

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

    Promise.all([getEncounter(encounterId), getTimelineForEncounter(encounterId), listAbilities()])
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
    const lateJoinTimers: ReturnType<typeof setTimeout>[] = [];
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
        clearInterval(intervalId);
        // Two re-fetches spaced 1500ms apart cover the 2s snapshot
        // debounce window so we converge on any in-flight edits.
        lateJoinTimers.push(setTimeout(checkLateJoin, 1500), setTimeout(checkLateJoin, 3000));
      }
    }, 200);
    // Bound the late-join window at 30s in case connection never lands.
    const boundTimer = setTimeout(() => clearInterval(intervalId), 30_000);

    return () => {
      provider.disconnect();
      providerRef.current = null;
      clearInterval(intervalId);
      clearTimeout(boundTimer);
      for (const timer of lateJoinTimers) clearTimeout(timer);
    };
  }, [planDoc, planId, hydrated, planRole, canEdit, session.loading, session.user?.id]);

  // Auto-reconnect on transient errors. Clears the retry timer on
  // planId change so a stale timer doesn't reconnect to the old plan.
  useEffect(() => {
    if (status !== 'error') return;
    if (!providerRef.current) return;
    const timer = setTimeout(() => {
      providerRef.current?.reconnect();
    }, 5000);
    return () => clearTimeout(timer);
  }, [status, planId]);

  // For imported plans without a matching catalog timeline, rebuild a
  // synthetic timeline from the assignments' original bossActionIds so
  // every mitigation renders on the canvas. Catalog events are kept and
  // synthetic events are appended, ordered by their original occurrence.
  const displayEvents = useMemo(() => {
    if (!events) return null;
    if (!isLegacyPlan) return events;
    const catalogById = new Map(events.map((e) => [e.id, e]));
    const synthetic = buildLegacyTimeline(assignments, catalogById);
    if (synthetic.length === 0) return events;
    return [...events, ...synthetic].sort((a, b) => a.timestampMs - b.timestampMs);
  }, [events, assignments, isLegacyPlan]);

  // Resolve the event id the AbilityPicker will pre-anchor new mits to:
  // user-picked id → first event of the loaded timeline.
  const defaultEventId = pickedEventId ?? displayEvents?.[0]?.id ?? null;

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
    for (const e of displayEvents ?? []) m.set(e.id, e);
    return m;
  }, [displayEvents]);

  const eventTimestampsById = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of displayEvents ?? []) m.set(e.id, e.timestampMs);
    return m;
  }, [displayEvents]);

  // Compute mit stacks for every event. The extended path accounts for
  // multi-hit timing, ability duration, target kind, and damage type.
  const mitStacks = useMemo(() => {
    if (!displayEvents) return new Map<string, ExtendedMitStackResult>();
    const m = new Map<string, ExtendedMitStackResult>();
    for (const e of displayEvents) {
      m.set(
        e.id,
        evaluateEventMit(e.id, assignments, abilityById, {
          eventTimestampMs: e.timestampMs,
          hitTimesMs: e.hitTimesMs,
          targetKind: e.targetKind,
        }),
      );
    }
    return m;
  }, [displayEvents, assignments, abilityById]);

  // Detect double-bookings: same ability + job on the same event or
  // within the recast window of another event.
  const conflictingAssignmentIds = useMemo(() => {
    const conflicts = detectDoubleBookings(assignments, abilityById, eventTimestampsById);
    const ids = new Set<string>();
    for (const [, list] of conflicts) {
      for (const a of list) ids.add(a.id);
    }
    return ids;
  }, [assignments, abilityById, eventTimestampsById]);

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

  const handlePlanNameBlur = useCallback(async () => {
    const nextName = planName.trim();
    if (!nextName) {
      if (planRow) setPlanName(planRow.name);
      toast.error('Plan name cannot be empty');
      return;
    }
    if (!planId || !planRow || nextName === planRow.name || !canEdit) return;

    try {
      await updatePlan({ planId, name: nextName });
      setPlanRow((current) => (current ? { ...current, name: nextName } : current));
      toast.success('Plan renamed');
    } catch (error: unknown) {
      setPlanName(planRow.name);
      toast.error(error instanceof Error ? error.message : 'Could not rename plan');
    }
  }, [canEdit, planId, planName, planRow, setPlanName]);

  const handleDuplicatePlan = useCallback(async () => {
    if (!planId || !canEdit || planAction) return;
    setPlanAction('duplicate');
    try {
      const copy = await duplicatePlan({ planId });
      toast.success('Plan duplicated');
      navigate(`/plan/${copy.planId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not duplicate plan');
    } finally {
      setPlanAction(null);
    }
  }, [canEdit, navigate, planAction, planId]);

  const handleDeletePlan = useCallback(async () => {
    if (!planId || !isOwner || planAction) return;
    setPlanAction('delete');
    try {
      await deletePlan(planId);
      toast.success('Plan deleted');
      navigate('/plan', { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not delete plan');
    } finally {
      setPlanAction(null);
      setDeleteDialogOpen(false);
    }
  }, [isOwner, navigate, planAction, planId]);

  const handleExportPlan = useCallback(async () => {
    if (!planDoc || planAction) return;
    setPlanAction('export');
    try {
      // Keep the local Y.Doc as the source for the current download, but
      // include the server snapshot when available for recovery/audit.
      const remoteSnapshot = planId ? await exportPlanSnapshot(planId).catch(() => null) : null;
      const exportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        planId,
        name: planName,
        encounter,
        timeline: events,
        ydocB64: bytesToBase64(planDoc.encodeStateAsUpdate()),
        document: planDoc.toJSON(),
        serverSnapshot: remoteSnapshot,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const safeName = (planName || 'xivmitplan')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-|-$/g, '');
      anchor.href = url;
      anchor.download = `${safeName || 'xivmitplan'}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Plan exported');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not export plan');
    } finally {
      setPlanAction(null);
    }
  }, [encounter, events, planAction, planDoc, planId, planName]);

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
  const isSupabaseConfigured = !!(
    import.meta.env['VITE_SUPABASE_URL'] && import.meta.env['VITE_SUPABASE_ANON_KEY']
  );
  const pickEvent = (e: TimelineEventInfo) => {
    setPickedEventId(e.id);
    setPickerOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card/40 px-3 py-3 sm:gap-3 sm:px-6">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/plan" aria-label="Back to plans">
            <ArrowLeft />
          </Link>
        </Button>
        <Logo className="text-primary hidden sm:block" />
        <Input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          onBlur={() => void handlePlanNameBlur()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          readOnly={!canEdit}
          maxLength={128}
          className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-input sm:max-w-md"
          aria-label="Plan name"
        />
        {encounter && (
          <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
            {encounter.raidSlug.toUpperCase()} · {encounter.name}
          </Badge>
        )}
        <Badge
          variant={statusInfo.variant}
          className={`shrink-0 gap-1.5 ${status === 'error' || status === 'disconnected' ? 'cursor-pointer' : ''}`}
          onClick={
            status === 'error' || status === 'disconnected'
              ? () => providerRef.current?.reconnect()
              : undefined
          }
        >
          {statusInfo.icon}
          <span className="hidden sm:inline">{statusInfo.label}</span>
          {(status === 'error' || status === 'disconnected') && (
            <span className="ml-1 text-[10px] underline">Retry</span>
          )}
        </Badge>
        <PresenceBar users={presenceUsers} />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveVersion}
            disabled={!ready || !canEdit || !isSupabaseConfigured}
            title={
              isSupabaseConfigured
                ? 'Save a versioned snapshot'
                : 'Version snapshots require Supabase'
            }
          >
            Save version
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 /> Share
            </Button>
          )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Plan actions"
                disabled={planAction !== null}
              >
                {planAction ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Plan actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => navigate(`/plan/${planId}/timeline`)} disabled={!ready}>
                <TimelineIcon /> Edit timeline
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportPlan} disabled={!ready}>
                <Download /> Export current plan
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onSelect={() => void handleDuplicatePlan()}>
                  <Copy /> Duplicate plan
                </DropdownMenuItem>
              )}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 /> Delete plan
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body: left rail + main canvas */}
      <DndContext {...(canEdit ? { onDragStart: handleDragStart, onDragEnd: handleDragEnd } : {})}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <aside className="bg-sidebar text-sidebar-foreground flex max-h-[38vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-b p-3 sm:p-4 lg:max-h-none lg:w-96 lg:border-r lg:border-b-0">
            {encounter && (
              <div className="border-border/70 bg-card/30 rounded-lg border p-3">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Plan overview
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Encounter</span>
                  <span className="truncate text-right font-medium" title={encounter.name}>
                    {encounter.name}
                  </span>
                  <span className="text-muted-foreground">Timeline</span>
                  <span className="text-right font-mono">
                    {displayEvents ? `${displayEvents.length} events` : 'Loading…'}
                  </span>
                  <span className="text-muted-foreground">Assignments</span>
                  <span className="text-right font-mono">{assignments.length}</span>
                </div>
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {encounter.patchVersion}
                  </Badge>
                  {encounter.raidName && <span className="truncate">{encounter.raidName}</span>}
                </div>
              </div>
            )}

            {/* Mitigation Library — searchable ability panel */}
            {canEdit && (
              <div className="flex max-h-72 flex-col overflow-hidden rounded-lg border">
                <MitigationLibrary
                  abilities={abilities}
                  events={displayEvents}
                  existingAssignments={assignments}
                  anchorEventId={pickedEventId ?? displayEvents?.[0]?.id ?? null}
                  onAssign={(abilityId, eventId) => {
                    const ability = abilityById.get(abilityId);
                    const event = eventById.get(eventId);
                    if (ability && event) {
                      handleAddAssignment({ ability, event });
                    }
                  }}
                  onPickAbility={() => {
                    setPickedEventId(null);
                    setPickerOpen(true);
                  }}
                  standalone
                />
              </div>
            )}

            {/* Assignments list */}
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
                    canEdit={canEdit}
                    onRemove={removeAssignment}
                  />
                ))}
              </div>
            )}
          </aside>

          <main className="bg-background/40 min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
            {canEdit && <DraggableAbilityStrip abilities={abilities} />}
            {eventsError ? (
              <div className="border-border bg-card/40 text-muted-foreground mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-2 rounded-2xl border p-10 text-center">
                <AlertCircle className="text-destructive size-6" />
                <p className="text-sm">Could not load timeline: {eventsError}</p>
              </div>
            ) : (
              <div className="mt-4">
                <TimelineRail
                  events={displayEvents}
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

      {canEdit && abilities && displayEvents && (
        <MitigationLibrary
          abilities={abilities}
          events={displayEvents}
          existingAssignments={assignments}
          anchorEventId={defaultEventId}
          onAssign={(abilityId, eventId) => {
            const ability = abilityById.get(abilityId);
            const event = eventById.get(eventId);
            if (ability && event) {
              handleAddAssignment({ ability, event });
            }
          }}
          onPickAbility={() => {
            setPickedEventId(null);
            setPickerOpen(true);
          }}
          standalone={false}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
        />
      )}

      {isOwner && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          planId={planId ?? ''}
          viewers={presenceUsers}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this plan?</DialogTitle>
            <DialogDescription>
              This permanently removes the plan, its assignments, snapshots, and share links. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={planAction === 'delete'}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeletePlan()}
              disabled={planAction === 'delete'}
            >
              {planAction === 'delete' && <Loader2 className="animate-spin" />}
              Delete plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
