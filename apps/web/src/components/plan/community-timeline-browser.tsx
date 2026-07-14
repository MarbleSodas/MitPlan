import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Copy, Edit2, Globe, Heart, Lock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AbilityMode } from '@xivmitplan/validation/ability';
import {
  createCommunityTimeline,
  deleteCommunityTimeline,
  listCommunityTimelineCollectionIds,
  listCommunityTimelines,
  toggleCommunityTimelineCollection,
  toggleCommunityTimelineLike,
  updateCommunityTimeline,
  type CommunityTimelineInfo,
  type EncounterInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import { useSession } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState = {
  name: string;
  description: string;
  encounterId: string;
  mode: AbilityMode;
  actions: unknown[];
  isPublic: boolean;
  sourceTimelineId: string | null;
};

const emptyForm = (encounterId: string, mode: AbilityMode, actions: unknown[] = []): FormState => ({
  name: '',
  description: '',
  encounterId,
  mode,
  actions,
  isPublic: false,
  sourceTimelineId: null,
});

const actionRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {};

export const CommunityTimelineBrowser = ({
  encounters,
  eventsByEncounter,
  mode,
}: {
  encounters: EncounterInfo[];
  eventsByEncounter: Map<string, TimelineEventInfo[]>;
  mode: AbilityMode;
}) => {
  const session = useSession();
  const [timelines, setTimelines] = useState<CommunityTimelineInfo[]>([]);
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityTimelineInfo | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(encounters[0]?.id ?? '', mode, eventsByEncounter.get(encounters[0]?.id ?? '') ?? []),
  );

  const load = async () => {
    setLoading(true);
    try {
      const [nextTimelines, nextCollectionIds] = await Promise.all([
        listCommunityTimelines({ publicOnly: false, mode, limit: 100 }),
        listCommunityTimelineCollectionIds(),
      ]);
      setTimelines(nextTimelines);
      setCollectionIds(new Set(nextCollectionIds));
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Could not load community timelines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // The mode is the only remote query dependency; search is local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const encounterById = useMemo(
    () => new Map(encounters.map((encounter) => [encounter.id, encounter] as const)),
    [encounters],
  );
  const visibleTimelines = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return timelines;
    return timelines.filter((timeline) =>
      `${timeline.name} ${timeline.description}`.toLowerCase().includes(normalized),
    );
  }, [query, timelines]);

  const openCreate = () => {
    const encounterId = encounters[0]?.id ?? '';
    setEditing(null);
    setForm(emptyForm(encounterId, mode, eventsByEncounter.get(encounterId) ?? []));
    setDialogOpen(true);
  };

  const openEdit = (timeline: CommunityTimelineInfo) => {
    setEditing(timeline);
    setForm({
      name: timeline.name,
      description: timeline.description,
      encounterId: timeline.encounterId ?? '',
      mode: timeline.mode,
      actions: timeline.actions,
      isPublic: timeline.isPublic,
      sourceTimelineId: timeline.sourceTimelineId,
    });
    setDialogOpen(true);
  };

  const handleEncounterChange = (encounterId: string) => {
    setForm((current) => ({
      ...current,
      encounterId,
      actions: editing ? current.actions : (eventsByEncounter.get(encounterId) ?? []),
    }));
  };

  const updateAction = (index: number, updates: Record<string, unknown>) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) =>
        actionIndex === index ? { ...actionRecord(action), ...updates } : action,
      ),
    }));
  };

  const addAction = () => {
    setForm((current) => {
      const previous = actionRecord(current.actions[current.actions.length - 1]);
      return {
        ...current,
        actions: [
          ...current.actions,
          {
            id: crypto.randomUUID(),
            position: current.actions.length,
            timestampMs: Number(previous['timestampMs'] ?? 0) + 1000,
            type: 'CUSTOM',
            name: 'Custom action',
            durationMs: null,
            hitTimesMs: [],
            targetKind: 'PARTY',
            isCustom: true,
          },
        ],
      };
    });
  };

  const removeAction = (index: number) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.filter((_, actionIndex) => actionIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || busyId) return;
    setBusyId(editing?.id ?? 'create');
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim(),
        encounterId: form.encounterId || null,
        mode: form.mode,
        actions: form.actions,
        isPublic: form.isPublic,
        sourceTimelineId: form.sourceTimelineId,
      };
      if (editing) {
        await updateCommunityTimeline({ id: editing.id, ...input });
        toast.success('Community timeline updated');
      } else {
        await createCommunityTimeline(input);
        toast.success('Community timeline created');
      }
      setDialogOpen(false);
      await load();
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save community timeline');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (timeline: CommunityTimelineInfo) => {
    if (!window.confirm(`Delete "${timeline.name}"?`) || busyId) return;
    setBusyId(timeline.id);
    try {
      await deleteCommunityTimeline(timeline.id);
      setTimelines((current) => current.filter((entry) => entry.id !== timeline.id));
      toast.success('Community timeline deleted');
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete community timeline');
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (timeline: CommunityTimelineInfo) => {
    if (busyId) return;
    setBusyId(timeline.id);
    try {
      await createCommunityTimeline({
        name: `${timeline.name} (Copy)`,
        description: timeline.description,
        encounterId: timeline.encounterId,
        mode: timeline.mode,
        actions: timeline.actions,
        isPublic: false,
        sourceTimelineId: timeline.id,
      });
      toast.success('Timeline copied to your collection');
      await load();
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Could not copy community timeline');
    } finally {
      setBusyId(null);
    }
  };

  const handleLike = async (timeline: CommunityTimelineInfo) => {
    if (busyId) return;
    setBusyId(timeline.id);
    try {
      const result = await toggleCommunityTimelineLike(timeline.id);
      setLikedIds((current) => {
        const next = new Set(current);
        if (result.liked) next.add(timeline.id);
        else next.delete(timeline.id);
        return next;
      });
      setTimelines((current) =>
        current.map((entry) =>
          entry.id === timeline.id ? { ...entry, likeCount: result.likeCount } : entry,
        ),
      );
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update like');
    } finally {
      setBusyId(null);
    }
  };

  const handleCollection = async (timeline: CommunityTimelineInfo) => {
    if (busyId) return;
    const add = !collectionIds.has(timeline.id);
    setBusyId(timeline.id);
    try {
      await toggleCommunityTimelineCollection(timeline.id, add);
      setCollectionIds((current) => {
        const next = new Set(current);
        if (add) next.add(timeline.id);
        else next.delete(timeline.id);
        return next;
      });
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update collection');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Community timelines</h2>
          <p className="text-muted-foreground text-sm">
            Save editable action copies without changing the canonical catalog.
          </p>
        </div>
        <Button onClick={openCreate} disabled={encounters.length === 0}>
          <Plus /> Create timeline
        </Button>
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search community timelines"
        aria-label="Search community timelines"
      />
      {loading && <p className="text-muted-foreground text-sm">Loading community timelines…</p>}
      {!loading && visibleTimelines.length === 0 && (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No community timelines yet. Create one from the selected canonical mode.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {visibleTimelines.map((timeline) => {
          const encounter = timeline.encounterId
            ? encounterById.get(timeline.encounterId)
            : undefined;
          const isOwner = timeline.ownerId === session.user?.id;
          const busy = busyId === timeline.id;
          return (
            <article key={timeline.id} className="border-border bg-card rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{timeline.name}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {encounter?.name ?? 'Custom encounter'} · {timeline.actions.length} actions
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {timeline.mode}
                  </Badge>
                  <Badge variant={timeline.isPublic ? 'secondary' : 'outline'}>
                    {timeline.isPublic ? <Globe /> : <Lock />}
                    <span className="sr-only">{timeline.isPublic ? 'Public' : 'Private'}</span>
                  </Badge>
                </div>
              </div>
              {timeline.description && (
                <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">
                  {timeline.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {timeline.isPublic && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleLike(timeline)}
                    disabled={busy}
                  >
                    <Heart fill={likedIds.has(timeline.id) ? 'currentColor' : 'none'} />
                    {timeline.likeCount}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCollection(timeline)}
                  disabled={busy}
                >
                  <Bookmark fill={collectionIds.has(timeline.id) ? 'currentColor' : 'none'} />
                  {collectionIds.has(timeline.id) ? 'Saved' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDuplicate(timeline)}
                  disabled={busy}
                >
                  <Copy /> Copy
                </Button>
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(timeline)}
                      disabled={busy}
                    >
                      <Edit2 /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(timeline)}
                      disabled={busy}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit community timeline' : 'Create community timeline'}
              </DialogTitle>
              <DialogDescription>
                This stores a mutable action copy. Canonical encounter data remains unchanged.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="community-timeline-name">Name</Label>
              <Input
                id="community-timeline-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={128}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="community-timeline-description">Description</Label>
              <Input
                id="community-timeline-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={5000}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-sm font-medium">Encounter</span>
                <select
                  value={form.encounterId}
                  onChange={(event) => handleEncounterChange(event.target.value)}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Custom encounter</option>
                  {encounters.map((encounter) => (
                    <option key={encounter.id} value={encounter.id}>
                      {encounter.raidSlug.toUpperCase()} · {encounter.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-sm font-medium">Mode</span>
                <select
                  value={form.mode}
                  onChange={(event) =>
                    setForm({ ...form, mode: event.target.value as AbilityMode })
                  }
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="REBORN">Reborn</option>
                  <option value="EVOLVED">Evolved</option>
                  <option value="CURRENT">Current</option>
                  <option value="ALL">All modes</option>
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Actions ({form.actions.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAction}>
                  <Plus /> Add action
                </Button>
              </div>
              <div className="border-border max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                {form.actions.length === 0 && (
                  <p className="text-muted-foreground px-1 py-3 text-xs">No actions yet.</p>
                )}
                {form.actions.map((rawAction, index) => {
                  const action = actionRecord(rawAction);
                  return (
                    <div key={String(action['id'] ?? index)} className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={Number(action['timestampMs'] ?? 0)}
                        onChange={(event) =>
                          updateAction(index, { timestampMs: Number(event.target.value) })
                        }
                        className="h-8 w-24 font-mono text-xs"
                        aria-label={`Action ${index + 1} timestamp`}
                      />
                      <Input
                        value={String(action['name'] ?? 'Custom action')}
                        onChange={(event) => updateAction(index, { name: event.target.value })}
                        className="h-8 min-w-0 flex-1 text-xs"
                        aria-label={`Action ${index + 1} name`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                        aria-label={`Remove action ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => setForm({ ...form, isPublic: event.target.checked })}
              />
              Publish to community discovery
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.name.trim() || busyId !== null}>
                {editing ? 'Save changes' : 'Create timeline'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
