/**
 * TimelineRail. The plan editor's main canvas — a vertical list of
 * `TimelineEventCard`s for the encounter's base timeline, grouped
 * by minute bucket so the eye can scan long phases.
 *
 * Pure presentational in Phase 1: the plan editor owns the catalog
 * fetch and passes `events` + `assignments` as props. Click an event
 * → onPick(event) (the editor opens the AbilityPicker sheet
 * pre-anchored to the picked event).
 */
import { useMemo } from 'react';
import { Skull } from 'lucide-react';
import { TimelineEventCard } from './timeline-event-card';
import type { TimelineEventInfo } from '@/lib/data-source';
import type { Assignment } from '@xivmitplan/validation/plan';

const BUCKET_MIN_MS = 60_000;

interface Bucket {
  label: string;
  events: Array<{ event: TimelineEventInfo; count: number }>;
}

const bucketize = (
  events: TimelineEventInfo[],
  counts: Map<string, number>,
): Bucket[] => {
  const map = new Map<number, Array<{ event: TimelineEventInfo; count: number }>>();
  for (const e of events) {
    const minute = Math.floor(e.timestampMs / BUCKET_MIN_MS);
    const entry = { event: e, count: counts.get(e.id) ?? 0 };
    const cur = map.get(minute);
    if (cur) cur.push(entry);
    else map.set(minute, [entry]);
  }
  const out: Bucket[] = [];
  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b);
  for (const k of sortedKeys) {
    const items = map.get(k)!.sort((a, b) => a.event.timestampMs - b.event.timestampMs);
    out.push({ label: `${k.toString().padStart(2, '0')}:00`, events: items });
  }
  return out;
};

export const TimelineRail = ({
  events,
  assignments,
  onPick,
}: {
  events: TimelineEventInfo[] | null;
  assignments: Assignment[];
  onPick: (event: TimelineEventInfo) => void;
}) => {
  // Single-pass count + bucket. Recomputes when events or assignments
  // change; ignores other deep-tree mutations (just iterates assignments).
  const buckets = useMemo(() => {
    if (!events) return [];
    const counts = new Map<string, number>();
    for (const a of assignments) counts.set(a.eventId, (counts.get(a.eventId) ?? 0) + 1);
    return bucketize(events, counts);
  }, [events, assignments]);

  if (!events) {
    return (
      <div className="text-muted-foreground mx-auto flex h-full max-w-2xl items-center justify-center gap-2">
        <Skull className="size-4 animate-pulse" /> Loading base timeline…
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="border-border bg-card/40 text-muted-foreground mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-10 text-center text-sm">
        <p>No base timeline for this encounter yet.</p>
        <p className="text-xs">Add events from a cactbot / triggernometry / fflogs source.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {buckets.map((bucket) => (
        <section key={bucket.label} className="flex flex-col gap-2">
          <header className="text-muted-foreground sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/80 px-1 py-1 font-mono text-[11px] tracking-widest uppercase backdrop-blur">
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
              {bucket.label}
            </span>
            <span className="bg-border/40 h-px flex-1" />
          </header>
          <div className="flex flex-col gap-1.5">
            {bucket.events.map(({ event, count }) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                assignmentCount={count}
                onPick={onPick}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};