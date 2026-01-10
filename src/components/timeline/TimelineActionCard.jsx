import { useState } from 'react';
import { Edit2, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImportanceBorderColor = () => {
    if (action.isTankBuster || action.isDualTankBuster) return 'border-l-destructive';
    switch (action.importance) {
      case 'critical': return 'border-l-destructive';
      case 'high': return 'border-l-[oklch(0.795_0.184_86.047)]';
      case 'medium': return 'border-l-[oklch(0.967_0.003_264.542)]';
      case 'low': return 'border-l-[oklch(0.623_0.188_145.28)]';
      default: return 'border-l-primary';
    }
  };

  const getImportanceBackground = () => {
    if (action.isTankBuster || action.isDualTankBuster) return 'bg-destructive/5';
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

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg border-l-4 transition-all hover:border-primary",
        getImportanceBorderColor(),
        getImportanceBackground(),
        isDragging && "shadow-lg opacity-90"
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
        >
          <GripVertical size={16} />
        </div>

        {isEditingTime ? (
          <input
            type="number"
            value={tempTime}
            onChange={(e) => setTempTime(parseInt(e.target.value) || 0)}
            onKeyDown={handleTimeKeyDown}
            onBlur={handleTimeBlur}
            autoFocus
            className="w-16 px-2 py-1 text-sm font-mono bg-card border border-primary rounded focus:outline-none"
            min={0}
          />
        ) : (
          <button
            onClick={() => {
              setTempTime(action.time);
              setIsEditingTime(true);
            }}
            className="w-14 text-sm font-mono font-medium text-foreground hover:text-primary transition-colors text-left"
            title="Click to edit time"
          >
            {formatTime(action.time)}
          </button>
        )}

        <span className="text-xl flex-shrink-0">{action.icon}</span>

        <span className="flex-1 font-medium truncate text-sm">
          {action.name}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {action.isTankBuster && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-medium rounded">
              TB
            </span>
          )}
          {action.isDualTankBuster && (
            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-medium rounded">
              Dual
            </span>
          )}
          {action.damageType && (
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded",
              action.damageType === 'magical' 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            )}>
              {action.damageType === 'magical' ? 'Mag' : 'Phys'}
            </span>
          )}
          {action.isCustom && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-medium rounded">
              Custom
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleExpand(action.id)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onEdit(action)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
            title="Edit action"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(action.id)}
            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
            title="Delete action"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border mt-0">
          <div className="pt-3 space-y-2">
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
              <button
                onClick={() => onDuplicate(action)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                <Copy size={12} />
                Duplicate
              </button>
              <button
                onClick={() => onEdit(action)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
              >
                <Edit2 size={12} />
                Edit All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineActionCard;
