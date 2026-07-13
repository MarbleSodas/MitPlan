/**
 * TimelineEventCard. A single clickable event in the plan editor's
 * timeline rail. Surfaces the event time, name, type, target kind,
 * and a real-time residual damage % badge driven by the web-layer
 * mit evaluator.
 *
 * Click → onPick(event). The plan editor opens the AbilityPicker
 * sheet pre-anchored to this event.
 */
import { Clock, Shield, Skull, Sparkles, Swords, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatMs } from '@/lib/utils';
import type { TimelineEventInfo } from '@/lib/data-source';
import type { MitStackResult } from '@/lib/mit-evaluator';
import {
  EVENT_CLASS,
  TARGET_LABEL,
  type EventClass,
  type TimelineEventType,
} from '@xivmitplan/domain/timeline';

const TYPE_ICON: Record<TimelineEventType, typeof Sparkles> = {
  MECHANIC: Sparkles,
  MECHANIC_START: Sparkles,
  MECHANIC_END: Sparkles,
  BUSTER: Skull,
  RAIDWIDE: Users,
};

const TONE_TINT: Record<EventClass['tone'], string> = {
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
  warn: 'bg-primary/15 text-primary border-primary/30',
  info: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const RESIDUAL_STYLES = (pct: number) => {
  if (pct <= 0) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (pct <= 25) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
  if (pct <= 50) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25';
  if (pct <= 75) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25';
  return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25';
};

export const TimelineEventCard = ({
  event,
  assignmentCount,
  mitStack,
  isSelected,
  onPick,
}: {
  event: TimelineEventInfo;
  /** Number of assignments currently anchored to this event. Drives
   * the small badge on the right edge. */
  assignmentCount: number;
  /** Pre-computed mit stack result for this event, or null if none. */
  mitStack: MitStackResult | null;
  /** True when this event is the currently selected anchor for new assignments. */
  isSelected?: boolean;
  onPick: (event: TimelineEventInfo) => void;
}) => {
  const klass = EVENT_CLASS[event.type];
  const Icon = TYPE_ICON[event.type];
  const hasMit = mitStack && mitStack.entries.length > 0;

  return (
    <button
      type="button"
      onClick={() => onPick(event)}
      className={cn(
        'group bg-card hover:border-primary/40 flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
        isSelected
          ? 'border-primary/60 bg-primary/5 ring-primary/20 ring-1'
          : 'border-transparent',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold tracking-tight',
          TONE_TINT[klass.tone],
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{event.name}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {hasMit && (
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 px-1.5 py-0 font-mono text-[10px]',
                  RESIDUAL_STYLES(mitStack!.residualPct),
                )}
              >
                <Shield className="size-3" />
                {Math.round(mitStack!.residualPct)}%
              </Badge>
            )}
            {assignmentCount > 0 && (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 font-mono text-[10px]">
                <Swords className="mr-1 size-3" />
                {assignmentCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <Clock className="size-3" />
          <span className="font-mono">{formatMs(event.timestampMs)}</span>
          <span>·</span>
          <span>{TARGET_LABEL[event.targetKind]}</span>
          <span>·</span>
          <span>{klass.label}</span>
          {event.confidence < 1 && (
            <>
              <span>·</span>
              <span className="font-mono">conf {Math.round(event.confidence * 100)}%</span>
            </>
          )}
          {hasMit && mitStack!.entries.length > 1 && (
            <>
              <span>·</span>
              <span className="text-chart-1 font-mono">
                ×{mitStack!.entries.length} stack
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
};
