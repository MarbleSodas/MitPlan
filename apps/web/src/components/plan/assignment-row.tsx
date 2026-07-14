/**
 * AssignmentRow. Single mit assignment displayed in the plan editor's
 * left rail. Surfaces the ability + event + target type as small
 * badges so the eye can scan a list quickly.
 *
 * The parent (plan editor) resolves the ability + event from the
 * data-source caches and passes them as props. This keeps the row
 * pure (no fetches in the list) and makes it trivial to memo.
 */
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Assignment } from '@xivmitplan/validation/plan';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AbilityInfo, TimelineEventInfo } from '@/lib/data-source';
import { cn, formatMs } from '@/lib/utils';
import { AbilityIcon } from './ability-icon';

const TARGET_TYPE_LABEL: Record<Assignment['targetType'], string> = {
  MAIN_TANK: 'MT',
  OFF_TANK: 'OT',
  PLAYER: 'Player',
  PARTY: 'Party',
  COVER: 'Cover',
};

export const AssignmentRow = ({
  assignment,
  ability,
  event,
  isConflicting,
  canEdit = true,
  onRemove,
}: {
  assignment: Assignment;
  ability: AbilityInfo | null;
  event: TimelineEventInfo | null;
  /** True when this assignment double-books the same ability within its recast window. */
  isConflicting?: boolean;
  /** When false, the remove button is hidden (viewer mode). */
  canEdit?: boolean;
  onRemove: (id: string) => void;
}) => {
  // The parent passed nulls while the data-source is still loading, OR an
  // imported assignment whose ability/event couldn't be re-anchored to a
  // catalog entity. In both cases we still render a readable row so the
  // configuration is visible (using the original names when present).
  const mitigationName =
    ability?.name ?? assignment.legacyMitigationName ?? 'Unknown mitigation';
  const eventName = event?.name ?? assignment.legacyBossActionId ?? 'Unknown event';

  if (!ability || !event) {
    return (
      <div className="group flex items-start gap-3 rounded-lg border border-transparent bg-card px-3 py-2.5">
        <AbilityIcon abilityId={assignment.legacyMitigationId} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{mitigationName}</p>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:text-destructive group-hover:opacity-100"
                onClick={() => onRemove(assignment.id)}
                aria-label={`Remove ${mitigationName}`}
              >
                <Trash2 />
              </Button>
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
              {TARGET_TYPE_LABEL[assignment.targetType]}
            </Badge>
            <span>·</span>
            <span>{eventName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-transparent bg-card px-3 py-2.5',
        'hover:border-border transition-colors',
        isConflicting && 'border-yellow-500/40 bg-yellow-500/5',
      )}
    >
      <AbilityIcon abilityId={ability.abilityId} jobAbbrev={ability.jobAbbrev} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {ability.name}
            {isConflicting && (
              <span
                className="text-yellow-600 dark:text-yellow-400"
                title="Double-booking detected: same ability used within recast window"
              >
                <AlertTriangle className="size-3.5" />
              </span>
            )}
          </p>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:text-destructive group-hover:opacity-100"
              onClick={() => onRemove(assignment.id)}
              aria-label={`Remove ${ability.name}`}
            >
              <Trash2 />
            </Button>
          )}
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
            {TARGET_TYPE_LABEL[assignment.targetType]}
          </Badge>
          <span>·</span>
          <span>{formatMs(event.timestampMs)}</span>
          <span>·</span>
          <span>{event.name}</span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px]">
            {ability.recastS != null ? `${ability.recastS}s` : '–'}
            {ability.effectPct != null && ability.effectPct > 0 && (
              <span className="text-chart-1">{ability.effectPct}%</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
