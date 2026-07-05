/**
 * TimelineEventCard. A single clickable event in the plan editor's
 * timeline rail. Surfaces the event time, name, type, and target
 * kind so the eye can scan a long timeline quickly.
 *
 * Click → onPick(event). The plan editor opens the AbilityPicker
 * sheet pre-anchored to this event.
 */
import { Clock, Skull, Sparkles, Swords, Users, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatMs } from '@/lib/utils';
import type { TimelineEventInfo } from '@/lib/data-source';

const MECHANIC_META = {
  label: 'Mech',
  icon: Sparkles,
  tint: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
} as const;

const TYPE_META: Record<
  TimelineEventInfo['type'],
  { label: string; icon: LucideIcon; tint: string }
> = {
  MECHANIC: MECHANIC_META,
  MECHANIC_START: MECHANIC_META,
  MECHANIC_END: MECHANIC_META,
  BUSTER: { label: 'TB', icon: Skull, tint: 'bg-destructive/15 text-destructive border-destructive/30' },
  RAIDWIDE: { label: 'RW', icon: Users, tint: 'bg-primary/15 text-primary border-primary/30' },
};

const TARGET_LABEL: Record<TimelineEventInfo['targetKind'], string> = {
  MAIN_TANK: 'MT',
  OFF_TANK: 'OT',
  PARTY: 'Party',
  HEALER: 'Healers',
  TARGETED: 'Targeted',
  ALL: 'All',
};

export const TimelineEventCard = ({
  event,
  assignmentCount,
  onPick,
}: {
  event: TimelineEventInfo;
  /** Number of assignments currently anchored to this event. Drives
   * the small badge on the right edge. */
  assignmentCount: number;
  onPick: (event: TimelineEventInfo) => void;
}) => {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(event)}
      className={cn(
        'group bg-card hover:border-primary/40 flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold tracking-tight',
          meta.tint,
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{event.name}</p>
          {assignmentCount > 0 && (
            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 font-mono text-[10px]">
              <Swords className="mr-1 size-3" />
              {assignmentCount}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <Clock className="size-3" />
          <span className="font-mono">{formatMs(event.timestampMs)}</span>
          <span>·</span>
          <span>{TARGET_LABEL[event.targetKind]}</span>
          {event.confidence < 1 && (
            <>
              <span>·</span>
              <span className="font-mono">conf {Math.round(event.confidence * 100)}%</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
};