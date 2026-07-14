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
import { useMemo, useState, useCallback } from 'react';
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
import type { RealtimeStatus } from '@xivmitplan/crdt';
import { usePlanDoc } from '@/lib/use-plan-doc';
import { usePlanSession } from '@/lib/use-plan-session';
import { usePresence } from '@/lib/use-presence';
import { useSession } from '@/lib/supabase';
import {
  saveSnapshot,
  updatePlan,
  duplicatePlan,
  deletePlan,
  exportPlanSnapshot,
  type AbilityInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import {
  evaluateEventMit,
  detectDoubleBookings,
  type ExtendedMitStackResult,
} from '@/lib/mit-evaluator';
import { bytesToBase64 } from '@/lib/bytes';
import { formatMs } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AssignmentRow } from '@/components/plan/assignment-row';
import { TimelineRail } from '@/components/plan/timeline-rail';
import { DraggableAbilityStrip } from '@/components/plan/draggable-ability-strip';
import { MitigationLibrary } from '@/components/plan/mitigation-library';
import { PresenceBar } from '@/components/plan/presence-bar';
import { PartyPanel } from '@/components/plan/party-panel';
import { ShareDialog } from '@/components/plan/share-dialog';
import { Logo } from '@/components/logo';
import { buildLegacyTimeline } from '@/lib/legacy-timeline';
import {
  buildEffectiveTimeline,
  canonicalToEffective,
  detectCanonicalDrift,
  type EffectiveTimelineEvent,
} from '@/lib/plan-timeline-adapter';
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
  const initialName = search.get('name') ?? '';
  const shareToken = search.get('token') ?? null;
  const session = usePlanSession(planId, { initialName, shareToken });
  const authSession = useSession();
  const {
    planDoc,
    planRow,
    planRole,
    canEdit,
    isOwner,
    encounter,
    events,
    eventsError,
    abilities,
    status,
    ready,
    canonicalTimeline,
    mode,
    providerRef,
  } = session;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Only the picked id is needed — the library resolves the full event
  // from the timeline events it already has.
  const [pickedEventId, setPickedEventId] = useState<string | null>(null);
  // Whether this plan was imported from MitPlan v1 (Firebase). Drives the
  // synthetic-timeline reconstruction so its mitigation renders on a canvas.
  const isLegacyPlan = planRow?.isLegacy ?? false;
  // DnD: dragged ability chip for the overlay.
  const [activeDragAbility, setActiveDragAbility] = useState<AbilityInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planAction, setPlanAction] = useState<'duplicate' | 'delete' | 'export' | null>(null);

  const {
    assignments,
    addAssignment,
    removeAssignment,
    planName,
    setPlanName,
    timelineActions,
    partyState,
    setSelectedJob,
    setTankPosition,
    addClaim,
  } = usePlanDoc(planDoc, planId ?? '00000000-0000-0000-0000-000000000000', initialName, canEdit);
  const presenceUsers = usePresence(planId ?? null, canEdit);

  // The shared session owns the Y.Doc, metadata, snapshot, role, catalog,
  // and realtime lifecycle for both plan routes.

  // Merge canonical events with plan-local timeline actions. Imported plans
  // also get synthetic events for assignments that have no catalog match.
  const displayEvents = useMemo(() => {
    if (!events) return null;
    const effective = buildEffectiveTimeline(events, timelineActions);
    if (!isLegacyPlan) return effective;
    const catalogById = new Map(events.map((e) => [e.id, e]));
    const synthetic = buildLegacyTimeline(assignments, catalogById);
    if (synthetic.length === 0) return effective;
    return [
      ...effective,
      ...synthetic.map((event) => ({
        ...canonicalToEffective(event),
        isCustom: true,
        sourceEventId: null,
      })),
    ].sort((a, b) => a.timestampMs - b.timestampMs);
  }, [events, timelineActions, assignments, isLegacyPlan]);

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
    const m = new Map<string, EffectiveTimelineEvent>();
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

  const timelineDrift = useMemo(
    () =>
      detectCanonicalDrift(
        planRow?.sourceTimelineHash,
        planRow?.sourceTimelineVersion,
        canonicalTimeline ? [canonicalTimeline] : [],
      ),
    [canonicalTimeline, planRow?.sourceTimelineHash, planRow?.sourceTimelineVersion],
  );

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
    if (!planId || !canEdit || nextName === planRow?.name) return;

    try {
      await updatePlan({ planId, name: nextName });
      toast.success('Plan renamed');
    } catch (error: unknown) {
      if (planRow) setPlanName(planRow.name);
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
        timeline: displayEvents,
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
  }, [displayEvents, encounter, planAction, planDoc, planId, planName]);

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
          variant={timelineDrift.hasDrifted ? 'destructive' : 'outline'}
          className="font-mono text-[10px]"
          title={timelineDrift.message ?? `Catalog mode: ${mode}`}
        >
          {mode}
          {canonicalTimeline?.version ? ` · ${canonicalTimeline.version}` : ''}
        </Badge>
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
              <DropdownMenuItem
                onSelect={() => navigate(`/plan/${planId}/timeline`)}
                disabled={!ready}
              >
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

            <PartyPanel
              abilities={abilities}
              partyState={partyState}
              currentUserId={authSession.user?.id ?? null}
              canEdit={canEdit}
              onSelectJob={(jobId) => {
                if (authSession.user?.id) setSelectedJob(authSession.user.id, jobId);
              }}
              onSetTankPosition={(position) => {
                if (authSession.user?.id) setTankPosition(authSession.user.id, position);
              }}
              onClaim={(jobId, displayName) => {
                if (authSession.user?.id) addClaim(authSession.user.id, jobId, displayName);
              }}
            />

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
            {timelineDrift.hasDrifted && timelineDrift.message && (
              <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border px-3 py-2 text-xs">
                {timelineDrift.message}
              </div>
            )}
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
