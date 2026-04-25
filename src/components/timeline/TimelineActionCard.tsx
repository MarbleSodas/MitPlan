import { useState } from 'react';
import { Edit2, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import {
  BOSS_ACTION_CLASSIFICATION_LABELS,
  getBossActionTypeLabel,
  isSmallPartyClassification,
  isTankBusterClassification,
} from '../../utils/boss/bossActionUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PresenceTarget from '../collaboration/PresenceTarget';

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImportanceBorderColor = () => {
    if (isTankBusterClassification(action.classification) || action.isTankBuster || action.isDualTankBuster) return 'border-l-destructive';
    switch (action.importance) {
      case 'critical': return 'border-l-destructive';
      case 'high': return 'border-l-[oklch(0.795_0.184_86.047)]';
      case 'medium': return 'border-l-[oklch(0.967_0.003_264.542)]';
      case 'low': return 'border-l-[oklch(0.623_0.188_145.28)]';
      default: return 'border-l-primary';
    }
  };

  const getImportanceBackground = () => {
    if (isTankBusterClassification(action.classification) || action.isTankBuster || action.isDualTankBuster) return 'bg-destructive/5';
    switch (action.importance) {
      case 'critical': return 'bg-destructive/5';
      case 'high': return 'bg-[oklch(0.795_0.184_86.047)]/5';
      default: return '';
    }
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
            <div
              {...dragHandleProps}
              className="mt-0.5 flex h-9 w-9 flex-shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </div>

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
                      className="h-9 w-20 rounded-lg font-mono text-center"
                      min={0}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setTempTime(action.time);
                        setIsEditingTime(true);
                      }}
                      className="inline-flex h-9 min-w-[4.75rem] items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-semibold font-mono text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                      title="Click to edit time"
                    >
                      {formatTime(action.time)}
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
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-500">
                    TB
                  </span>
                )}
                {action.isDualTankBuster && (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-500">
                    Dual
                  </span>
                )}
                {isSmallPartyClassification(action.classification) && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-500">
                    4P
                  </span>
                )}
                {action.isMultiHit && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                    {action.hitCount && action.hitCount > 1 ? `${action.hitCount}x` : 'Multi'}
                  </span>
                )}
                {action.hasDot && (
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-500">
                    DoT
                  </span>
                )}
                {action.damageType && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium',
                      action.damageType === 'magical'
                        ? 'bg-purple-500/15 text-purple-500'
                        : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                    )}
                  >
                    {action.damageType === 'magical' ? 'Magical' : 'Physical'}
                  </span>
                )}
                {action.isCustom && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-500">
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
              className="h-9 w-9 rounded-lg"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(action)}
              className="h-9 w-9 rounded-lg hover:text-primary"
              title="Edit action"
            >
              <Edit2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(action.id)}
              className="h-9 w-9 rounded-lg hover:text-destructive hover:bg-destructive/10"
              title="Delete action"
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
                <span className="font-medium">{action.unmitigatedDamage}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Importance:</span>
              <span className={cn(
                "capitalize font-medium",
                action.importance === 'critical' && 'text-red-400',
                action.importance === 'high' && 'text-orange-400',
                action.importance === 'medium' && 'text-amber-400',
                action.importance === 'low' && 'text-green-400'
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
