/**
 * AssignmentRow. Single mit assignment displayed in the plan editor's
 * left rail. Looks up the ability + event by ID from the sample-data
 * lookup, surfaces the recast + effect + target type as small badges
 * so the eye can scan a list quickly.
 */
import { Trash2 } from 'lucide-react';
import type { Assignment } from '@xivmitplan/validation/plan';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SAMPLE_ABILITIES, SAMPLE_EVENTS } from '@/lib/sample-data';
import { cn } from '@/lib/utils';

const formatMs = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

const TARGET_TYPE_LABEL: Record<Assignment['targetType'], string> = {
  MAIN_TANK: 'MT',
  OFF_TANK: 'OT',
  PLAYER: 'Player',
  PARTY: 'Party',
  COVER: 'Cover',
};

const CATEGORY_TINT: Record<string, string> = {
  'tank-cd': 'bg-chart-1/15 text-chart-1',
  'healer-cd': 'bg-chart-2/15 text-chart-2',
  'party-mit': 'bg-primary/15 text-primary',
  invuln: 'bg-destructive/15 text-destructive',
  shield: 'bg-chart-4/15 text-chart-4',
};

export const AssignmentRow = ({
  assignment,
  onRemove,
}: {
  assignment: Assignment;
  onRemove: (id: string) => void;
}) => {
  const ability = SAMPLE_ABILITIES.find((a) => a.id === assignment.abilityId);
  const event = Object.values(SAMPLE_EVENTS)
    .flat()
    .find((e) => e.id === assignment.eventId);
  if (!ability || !event) return null;

  const tint = CATEGORY_TINT[ability.category] ?? 'bg-muted text-muted-foreground';

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-transparent bg-card px-3 py-2.5',
        'hover:border-border transition-colors',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold tracking-tight',
          tint,
        )}
        aria-hidden
      >
        {ability.jobAbbrev}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{ability.name}</p>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            onClick={() => onRemove(assignment.id)}
            aria-label={`Remove ${ability.name}`}
          >
            <Trash2 />
          </Button>
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
            {TARGET_TYPE_LABEL[assignment.targetType]}
          </Badge>
          <span>·</span>
          <span>{formatMs(event.positionMs)}</span>
          <span>·</span>
          <span>{event.name}</span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px]">
            {ability.recastS}s
            {ability.effectPct > 0 && (
              <span className="text-chart-1">{ability.effectPct}%</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};