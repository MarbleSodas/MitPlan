import type { ElementSelection } from '../../types/presence';
import { getInitials } from '../../types/presence';

interface PresenceBadgeGroupProps {
  selections: ElementSelection[];
  maxDisplay?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md';
}

const PresenceBadgeGroup = ({
  selections,
  maxDisplay = 3,
  position = 'top-right',
  size = 'sm',
}: PresenceBadgeGroupProps) => {
  const otherSelections = selections.filter((selection) => !selection.isCurrentUser);

  if (otherSelections.length === 0) {
    return null;
  }

  const displayedSelections = otherSelections.slice(0, maxDisplay);
  const overflowCount = Math.max(0, otherSelections.length - maxDisplay);

  const positionClasses = {
    'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
    'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
    'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2',
  } as const;

  const sizeClasses = {
    sm: 'h-5 w-5 text-[10px]',
    md: 'h-6 w-6 text-xs',
  } as const;

  return (
    <div
      className={`pointer-events-none absolute z-10 flex items-center ${positionClasses[position]}`}
      style={{ gap: '-4px' }}
    >
      {displayedSelections.map((selection, index) => {
        const isEditing = selection.interaction === 'editing';

        return (
          <div
            key={selection.sessionId}
            className={`
              ${sizeClasses[size]}
              animate-selection-appear
              flex items-center justify-center rounded-full border-2 border-card
              font-semibold text-white shadow-sm
            `}
            style={{
              backgroundColor: selection.color,
              marginLeft: index > 0 ? '-6px' : '0',
              zIndex: displayedSelections.length - index,
              boxShadow: isEditing ? `0 0 0 2px ${selection.color}55` : undefined,
            }}
            title={`${selection.displayName}${isEditing ? ' is editing' : ''}`}
          >
            {getInitials(selection.displayName)}
          </div>
        );
      })}

      {overflowCount > 0 && (
        <div
          className={`
            ${sizeClasses[size]}
            flex items-center justify-center rounded-full border-2 border-card
            bg-muted-foreground font-semibold text-white shadow-sm
          `}
          style={{ marginLeft: '-6px', zIndex: 0 }}
          title={`+${overflowCount} more`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

export default PresenceBadgeGroup;
