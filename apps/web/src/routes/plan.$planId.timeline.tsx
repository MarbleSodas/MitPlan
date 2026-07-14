/**
 * Plan timeline editor route — /plan/:planId/timeline
 *
 * Provides the editable timeline view for plan-local action management.
 * Users can:
 *   - View the full effective timeline (canonical + custom actions)
 *   - Add template/custom actions
 *   - Edit action times, names, durations
 *   - Reorder actions via drag handle
 *   - Delete and duplicate actions
 *   - Configure timeline settings (health, tags, description)
 *
 * Uses the same usePlanSession and usePlanDoc hooks as the planner route,
 * operating on the same Yjs PlanDoc.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  Clock,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Settings,
  Trash2,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlanTimelineAction } from '@xivmitplan/validation/plan';
import { usePlanDoc } from '@/lib/use-plan-doc';
import { usePlanSession } from '@/lib/use-plan-session';
import {
  buildEffectiveTimeline,
  detectCanonicalDrift,
  type EffectiveTimelineEvent,
} from '@/lib/plan-timeline-adapter';
import { formatMs } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const PlanTimelineEditor = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const session = usePlanSession(planId);
  const {
    planDoc,
    planRole,
    canEdit,
    planRow,
    encounter,
    events,
    canonicalTimeline,
    mode,
    ready: sessionReady,
  } = session;

  const {
    timelineActions,
    addTimelineAction,
    updateTimelineAction,
    removeTimelineAction,
    reorderTimelineActions,
    timelineSettings,
    setTimelineSettings,
    ready: docReady,
  } = usePlanDoc(planDoc, planId ?? '', '', canEdit);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(timelineSettings);

  // Build the effective timeline from canonical events + plan-local actions.
  const effectiveTimeline = useMemo(() => {
    if (!events) return [];
    return buildEffectiveTimeline(events, timelineActions);
  }, [events, timelineActions]);

  const ready = sessionReady && docReady;
  const timelineDrift = useMemo(
    () =>
      detectCanonicalDrift(
        planRow?.sourceTimelineHash,
        planRow?.sourceTimelineVersion,
        canonicalTimeline ? [canonicalTimeline] : [],
      ),
    [canonicalTimeline, planRow?.sourceTimelineHash, planRow?.sourceTimelineVersion],
  );

  // Sync settings draft when dialog opens.
  useEffect(() => {
    if (settingsOpen) {
      setSettingsDraft(timelineSettings);
    }
  }, [settingsOpen, timelineSettings]);

  const handleAddCustomAction = useCallback(() => {
    if (!canEdit || !events) return;
    const lastEvent = events[events.length - 1];
    const lastTime = lastEvent?.timestampMs ?? 0;
    const action: Omit<PlanTimelineAction, 'id'> = {
      position: effectiveTimeline.length,
      timestampMs: lastTime + 10000,
      type: 'CUSTOM',
      name: 'Custom action',
      durationMs: null,
      hitTimesMs: [],
      targetKind: 'PARTY',
      sourceEventId: null,
      isCustom: true,
      notes: null,
      linkedAbilityId: null,
      damageType: null,
      hitCount: null,
      isDot: false,
      targetsTank: 'NONE',
    };
    addTimelineAction(action);
    toast.success('Custom action added');
  }, [canEdit, events, effectiveTimeline.length, addTimelineAction]);

  const handleSaveSettings = useCallback(() => {
    if (!canEdit) return;
    setTimelineSettings(settingsDraft);
    setSettingsOpen(false);
    toast.success('Timeline settings saved');
  }, [canEdit, settingsDraft, setTimelineSettings]);

  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx <= 0) return;
      const ids = effectiveTimeline.map((e) => {
        const action = timelineActions.find((a) => a.id === e.id);
        return action?.id ?? e.id;
      });
      [ids[idx - 1], ids[idx]] = [ids[idx]!, ids[idx - 1]!];
      reorderTimelineActions(ids);
    },
    [effectiveTimeline, timelineActions, reorderTimelineActions],
  );

  const handleMoveDown = useCallback(
    (idx: number) => {
      if (idx >= effectiveTimeline.length - 1) return;
      const ids = effectiveTimeline.map((e) => {
        const action = timelineActions.find((a) => a.id === e.id);
        return action?.id ?? e.id;
      });
      [ids[idx], ids[idx + 1]] = [ids[idx + 1]!, ids[idx]!];
      reorderTimelineActions(ids);
    },
    [effectiveTimeline, timelineActions, reorderTimelineActions],
  );

  if (!planId) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground text-sm">No plan selected.</p>
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

  const isCustomAction = (event: EffectiveTimelineEvent, action: PlanTimelineAction | undefined) =>
    action?.isCustom === true || event.isCustom;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card/40 px-3 py-3 sm:gap-3 sm:px-6">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to={`/plan/${planId}`} aria-label="Back to planner">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">Timeline Editor</h1>
          {encounter && (
            <p className="text-muted-foreground truncate text-[10px]">
              {encounter.raidSlug.toUpperCase()} · {encounter.name}
            </p>
          )}
        </div>
        <Badge
          variant={timelineDrift.hasDrifted ? 'destructive' : 'outline'}
          className="font-mono text-[10px]"
          title={timelineDrift.message ?? `Catalog mode: ${mode}`}
        >
          {mode}
          {canonicalTimeline?.version ? ` · ${canonicalTimeline.version}` : ''}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          disabled={!canEdit}
        >
          <Settings /> Settings
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCustomAction}
          disabled={!canEdit || !ready}
        >
          <Plus /> Add action
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            navigate(`/plan/${planId}`);
            toast.success('Timeline saved to plan');
          }}
        >
          <Save /> Done
        </Button>
      </div>

      {/* Timeline list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {timelineDrift.hasDrifted && timelineDrift.message && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mx-auto mb-4 max-w-2xl rounded-lg border px-3 py-2 text-xs">
            {timelineDrift.message}
          </div>
        )}
        {!events && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        )}

        {events && events.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-sm">
              No timeline events available for this encounter.
            </p>
          </div>
        )}

        {events && events.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-1">
            {effectiveTimeline.map((event, idx) => {
              const linkedAction = timelineActions.find((a) => a.id === event.id);
              const isCustom = isCustomAction(event, linkedAction);
              const prevTime = idx > 0 ? effectiveTimeline[idx - 1]!.timestampMs : 0;
              const gap = event.timestampMs - prevTime;

              return (
                <div key={event.id} className="group flex items-start gap-2">
                  {/* Drag handle + reorder */}
                  <div className="flex shrink-0 flex-col items-center gap-0.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0 || !canEdit}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 size-3.5"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <GripVertical className="text-muted-foreground size-3.5" />
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === effectiveTimeline.length - 1 || !canEdit}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 size-3.5"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Gap indicator */}
                  {gap > 0 && idx > 0 && (
                    <div className="pointer-events-none absolute top-0 left-8 flex items-center gap-1 text-[10px] text-muted-foreground/40">
                      <Clock className="size-2.5" />+{formatMs(gap)}
                    </div>
                  )}

                  {/* Event content */}
                  <div
                    className={cn(
                      'flex flex-1 items-start gap-3 rounded-lg border p-3 transition-colors',
                      isCustom ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
                    )}
                  >
                    {/* Time column */}
                    <div className="flex w-20 shrink-0 flex-col items-center">
                      {canEdit && linkedAction ? (
                        <Input
                          type="number"
                          value={event.timestampMs}
                          onChange={(e) => {
                            updateTimelineAction(linkedAction.id, {
                              timestampMs: Number(e.target.value),
                            });
                          }}
                          className="h-6 w-full px-1 text-center font-mono text-[10px]"
                          aria-label="Timestamp (ms)"
                        />
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatMs(event.timestampMs)}
                        </span>
                      )}
                      {isCustom && (
                        <Badge
                          variant="outline"
                          className="mt-0.5 font-mono text-[8px] text-[10px] text-primary/60"
                        >
                          Custom
                        </Badge>
                      )}
                    </div>

                    {/* Name + details */}
                    <div className="min-w-0 flex-1">
                      {canEdit && linkedAction && linkedAction.isCustom ? (
                        <Input
                          value={event.name}
                          onChange={(e) => {
                            updateTimelineAction(linkedAction.id, {
                              name: e.target.value,
                            });
                          }}
                          className="h-6 px-1 text-sm font-medium"
                          aria-label="Action name"
                        />
                      ) : (
                        <p className="truncate text-sm font-medium">{event.name}</p>
                      )}

                      <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-[10px]">
                        <span className="capitalize">{event.type.toLowerCase()}</span>
                        <span>Target: {event.targetKind}</span>
                        {event.durationMs != null && (
                          <span>Duration: {formatMs(event.durationMs)}</span>
                        )}
                        {event.hitTimesMs.length > 0 && (
                          <span>Hits: {event.hitTimesMs.length}</span>
                        )}
                        {event.notes && <span className="italic">{event.notes}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    {canEdit && linkedAction && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const action = linkedAction;
                            addTimelineAction({
                              position: action.position + 1,
                              timestampMs: action.timestampMs + 1000,
                              type: 'CUSTOM',
                              name: `${action.name} (Copy)`,
                              durationMs: action.durationMs,
                              hitTimesMs: action.hitTimesMs,
                              targetKind: action.targetKind,
                              sourceEventId: null,
                              isCustom: true,
                              notes: action.notes,
                              linkedAbilityId: null,
                              damageType: null,
                              hitCount: null,
                              isDot: false,
                              targetsTank: 'NONE',
                            });
                            toast.success('Action duplicated');
                          }}
                          className="text-muted-foreground hover:text-foreground rounded p-1"
                          aria-label="Duplicate action"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {linkedAction.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              removeTimelineAction(linkedAction.id);
                              toast.success('Action removed');
                            }}
                            className="text-muted-foreground hover:text-destructive rounded p-1"
                            aria-label="Delete action"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Timeline settings</DialogTitle>
            <DialogDescription>
              Configure health values, description, and tags for this plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tank-hp">Tank HP</Label>
                <Input
                  id="tank-hp"
                  type="number"
                  value={settingsDraft.tankHp ?? ''}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      tankHp: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Auto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party-hp">Party HP</Label>
                <Input
                  id="party-hp"
                  type="number"
                  value={settingsDraft.partyHp ?? ''}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      partyHp: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Auto"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={settingsDraft.description ?? ''}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, description: e.target.value || null })
                }
                placeholder="Optional plan description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
