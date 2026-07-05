/**
 * AbilityPicker. Sheet (right-anchored slide-over) with a searchable
 * list of abilities grouped by category. The user picks an ability +
 * the event they want to anchor it to, and the parent writes the
 * assignment to the live PlanDoc.
 *
 * Abilities and the encounter timeline are passed in as props — the
 * plan editor already fetched them via the cached data-source, so the
 * picker doesn't make its own RPCs. The parent pins a specific event
 * via `eventId` (e.g. when the user clicked a timeline card);
 * otherwise the first event is pre-selected.
 */
import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type AbilityInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import { ABILITY_CATEGORY_LABEL, ABILITY_CATEGORY_ORDER } from '@/lib/sample-data';
import { cn, formatMs } from '@/lib/utils';

export const AbilityPicker = ({
  open,
  onOpenChange,
  eventId,
  abilities,
  events,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected event id (e.g. the timeline card the user clicked).
   * Ignored after the user has chosen an ability in this session —
   * `pending.event` wins until they back out. */
  eventId: string | null;
  abilities: AbilityInfo[] | null;
  events: TimelineEventInfo[] | null;
  onPick: (input: { ability: AbilityInfo; event: TimelineEventInfo }) => void;
}) => {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<{
    ability: AbilityInfo;
    event: TimelineEventInfo;
  } | null>(null);

  // Reset transient state when the sheet closes so the next open
  // doesn't surface a stale selection from a previous encounter.
  useEffect(() => {
    if (open) return;
    setPending(null);
    setQuery('');
  }, [open]);

  const grouped = useMemo(() => {
    if (!abilities) return new Map<AbilityInfo['category'], AbilityInfo[]>();
    const q = query.toLowerCase().trim();
    const matches = q
      ? abilities.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.jobAbbrev.toLowerCase().includes(q) ||
            (a.description?.toLowerCase().includes(q) ?? false),
        )
      : abilities;
    const map = new Map<AbilityInfo['category'], AbilityInfo[]>();
    for (const cat of ABILITY_CATEGORY_ORDER) map.set(cat, []);
    for (const a of matches) {
      const cur = map.get(a.category);
      if (cur) cur.push(a);
    }
    return map;
  }, [abilities, query]);

  // Resolve the event to anchor new ability selections to. Order of
  // precedence: pending.event (user picked one in this session) →
  // parent eventId → first event of the loaded timeline. Computed once
  // per render so the per-row `find()` isn't O(N) per ability.
  const anchorEvent: TimelineEventInfo | null = useMemo(() => {
    if (pending) return pending.event;
    if (eventId && events) return events.find((e) => e.id === eventId) ?? null;
    if (events && events.length > 0) return events[0]!;
    return null;
  }, [pending, eventId, events]);

  const handleConfirm = () => {
    if (!pending) return;
    onPick(pending);
    setPending(null);
    setQuery('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add mitigation</SheetTitle>
          <SheetDescription>
            Search the catalog of mits and anchor one to a timeline event.
          </SheetDescription>
        </SheetHeader>

        {!pending ? (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search by ability, job, or effect…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {Array.from(grouped.entries()).map(([cat, list]) =>
                list.length === 0 ? null : (
                  <div key={cat}>
                    <h4 className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold tracking-widest uppercase">
                      {ABILITY_CATEGORY_LABEL[cat]}
                    </h4>
                    <div className="flex flex-col gap-1">
                      {list.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          disabled={!anchorEvent}
                          onClick={() => setPending({ ability: a, event: anchorEvent! })}
                          className="hover:bg-muted flex items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors disabled:opacity-50"
                        >
                          <Badge
                            variant="outline"
                            className="w-12 justify-center font-mono text-[10px]"
                          >
                            {a.jobAbbrev}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.name}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {a.description}
                            </p>
                          </div>
                          <div className="text-muted-foreground flex shrink-0 flex-col items-end font-mono text-[10px]">
                            <span>{a.recastS ?? '–'}s</span>
                            {a.effectPct != null && a.effectPct > 0 && (
                              <span className="text-chart-1">{a.effectPct}%</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
              {abilities && abilities.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No abilities match. Try a different search.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="bg-muted/40 rounded-md border p-3">
              <p className="text-sm font-medium">{pending.ability.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {pending.ability.jobAbbrev} · {pending.ability.description}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Anchor to event</Label>
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {(events ?? []).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setPending({ ...pending, event: e })}
                    className={cn(
                      'flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      pending.event.id === e.id
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted',
                    )}
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {formatMs(e.timestampMs)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-auto flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPending(null)}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Add to plan
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};