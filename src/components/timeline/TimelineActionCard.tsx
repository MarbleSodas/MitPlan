import { useState } from 'react';
import { Edit2, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import {
  BOSS_ACTION_CLASSIFICATION_LABELS,
  getBossActionTypeLabel,
  isSmallPartyClassification,
  isTankBusterClassification,
} from '../../utils/boss/bossActionUtils';
import { cn } from '@/lib/utils';
import { SEVERITY_STYLES, getSeverityStyle } from '@/lib/severity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PresenceTarget from '../collaboration/PresenceTarget';
import { formatTimelineDamage, formatTimelineTime } from '../../utils/timeline/timeFormat';

const TimelineActionCard = ({
  action,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onDuplicate,
  onQuickTimeEdit,
  dragHandleProps,
  isDragging,
}) => {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState(action.time);
  const eventTarget = {
    surface: 'timeline' as const,
    entityType: 'timelineEvent' as const,
    entityId: action.id,
  };

  const getImportanceBorderColor = () => {
    if (isTankBusterClassification(action.classification) || action.isTankBuster || action.isDualTankBuster) return SEVERITY_STYLES.critical.border;
    return getSeverityStyle(action.importance).border;
  };

  const getImportanceBackground = () => {
    if (isTankBusterClassification(action.classification) || action.isTankBuster || action.isDualTankBuster) return SEVERITY_STYLES.critical.background;
    return getSeverityStyle(action.importance).background;
  };

  const handleTimeKeyDown = (e) => {
    if (e.key === 'Enter') {
      onQuickTimeEdit(action.id, tempTime);
      setIsEditingTime(false);
    } else if (e.key === 'Escape') {
      setTempTime(action.time);
      setIsEditingTime(false);
    }
  };

  const handleTimeBlur = () => {
    onQuickTimeEdit(action.id, tempTime);
    setIsEditingTime(false);
  };

  const classificationLabel = action.classification
    ? (BOSS_ACTION_CLASSIFICATION_LABELS[action.classification] || getBossActionTypeLabel(action))
    : getBossActionTypeLabel(action);

  return (
    <PresenceTarget
      target={eventTarget}
      className="rounded-xl"
      publishHover={true}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-xl border-l-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-md',
          getImportanceBorderColor(),
          getImportanceBackground(),
          isDragging && 'shadow-lg opacity-90'
        )}
      >
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-3">
            <button
              type="button"
              {...dragHandleProps}
              className="mt-0.5 flex h-11 w-11 flex-shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
              aria-label={`Reorder ${action.name}`}
            >
              <GripVertical size={16} />
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PresenceTarget
                  target={{ ...eventTarget, field: 'time' }}
                  className="rounded-lg"
                  showIndicator={false}
                  publishFocus={true}
                  focusInteraction="editing"
                >
                  {isEditingTime ? (
                    <Input
                      type="number"
                      value={tempTime}
                      onChange={(e) => setTempTime(Number.parseInt(e.target.value, 10) || 0)}
                      onKeyDown={handleTimeKeyDown}
                      onBlur={handleTimeBlur}
                      autoFocus
                      variant="compact"
                      className="h-11 w-24 rounded-lg font-mono text-center"
                      aria-label={`Time for ${action.name} in seconds`}
                      min={0}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setTempTime(action.time);
                        setIsEditingTime(true);
                      }}
                      className="inline-flex h-11 min-w-[5.75rem] items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-semibold font-mono text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      title="Click to edit time"
                    >
                      {formatTimelineTime(action.time)}
                    </button>
                  )}
                </PresenceTarget>

                <span className="text-2xl leading-none flex-shrink-0">{action.icon}</span>
                <span className="min-w-0 truncate text-base font-semibold text-foreground">
                  {action.name}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {classificationLabel}
                </span>
                {(action.isTankBuster || isTankBusterClassification(action.classification)) && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    TB
                  </span>
                )}
                {action.isDualTankBuster && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    Dual
                  </span>
                )}
                {isSmallPartyClassification(action.classification) && (
                  <span className="rounded-full bg-info/15 px-2 py-0.5 text-[11px] font-medium text-info">
                    4P
                  </span>
                )}
                {action.isMultiHit && (
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                    {action.hitCount && action.hitCount > 1 ? `${action.hitCount}x` : 'Multi'}
                  </span>
                )}
                {action.hasDot && (
                  <span className="rounded-full bg-info/15 px-2 py-0.5 text-[11px] font-medium text-info">
                    DoT
                  </span>
                )}
                {action.damageType && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium',
                      action.damageType === 'magical'
                        ? 'bg-role-caster/15 text-role-caster'
                        : 'bg-damage-physical/15 text-damage-physical'
                    )}
                  >
                    {action.damageType === 'magical' ? 'Magical' : 'Physical'}
                  </span>
                )}
                {action.isCustom && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    Custom
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 self-end sm:self-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleExpand(action.id)}
              className="h-11 w-11 rounded-lg"
              aria-label={isExpanded ? `Collapse ${action.name}` : `Expand ${action.name}`}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(action)}
              className="h-11 w-11 rounded-lg hover:text-primary"
              aria-label={`Edit ${action.name}`}
            >
              <Edit2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(action.id)}
              className="h-11 w-11 rounded-lg hover:text-destructive hover:bg-destructive/10"
              aria-label={`Delete ${action.name}`}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-border px-4 pb-4 pt-0">
            <div className="space-y-2 pt-4">
            {action.unmitigatedDamage && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Damage:</span>
                <span className="font-medium">
                  {formatTimelineDamage(action.unmitigatedDamage)} unmitigated damage
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Importance:</span>
              <span className={cn(
                "capitalize font-medium",
                getSeverityStyle(action.importance).text
              )}>
                {action.importance || 'medium'}
              </span>
            </div>

            {action.classification && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Classification:</span>
                <span className="font-medium">
                  {BOSS_ACTION_CLASSIFICATION_LABELS[action.classification] || getBossActionTypeLabel(action)}
                </span>
              </div>
            )}

            {(action.isMultiHit || action.hasDot) && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-muted-foreground">Modifiers:</span>
                {action.isMultiHit && (
                  <span className="font-medium">
                    {action.hitCount && action.hitCount > 1 ? `${action.hitCount}-Hit` : 'Multi-hit'}
                  </span>
                )}
                {action.hasDot && (
                  <span className="font-medium">DoT</span>
                )}
              </div>
            )}

            {action.description && (
              <div className="text-sm">
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1 text-foreground m-0">{action.description}</p>
              </div>
            )}

            {action.sourceBoss && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium capitalize">{action.sourceBoss.replace(/-/g, ' ')}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDuplicate(action)}
                className="h-7 px-2 text-xs"
              >
                <Copy size={12} />
                Duplicate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(action)}
                className="h-7 px-2 text-xs hover:text-primary"
              >
                <Edit2 size={12} />
                Edit All
              </Button>
            </div>
          </div>
          </div>
        )}
      </div>
    </PresenceTarget>
  );
};

export default TimelineActionCard;
