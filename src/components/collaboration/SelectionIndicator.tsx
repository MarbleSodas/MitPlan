import type { ElementSelection } from '../../types/presence';
import { getInitials } from '../../types/presence';

interface SelectionIndicatorProps {
  selections: ElementSelection[];
  maxDisplay?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md';
}

const SelectionIndicator = ({
  selections,
  maxDisplay = 3,
  position = 'top-right',
  size = 'sm'
}: SelectionIndicatorProps) => {
  const otherSelections = selections.filter(s => !s.isCurrentUser);
  
  if (otherSelections.length === 0) {
    return null;
  }

  const displayedSelections = otherSelections.slice(0, maxDisplay);
  const overflowCount = Math.max(0, otherSelections.length - maxDisplay);

  const positionClasses = {
    'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
    'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
    'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2'
  };

  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs'
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} flex items-center z-10 pointer-events-none`}
      style={{ gap: '-4px' }}
    >
      {displayedSelections.map((selection, index) => (
        <div
          key={selection.sessionId}
          className={`
            ${sizeClasses[size]}
            rounded-full flex items-center justify-center
            text-white font-semibold
            border-2 border-card
            shadow-sm
            animate-selection-appear
          `}
          style={{ 
            backgroundColor: selection.color,
            marginLeft: index > 0 ? '-6px' : '0',
            zIndex: displayedSelections.length - index
          }}
          title={selection.displayName}
        >
          {getInitials(selection.displayName)}
        </div>
      ))}
      
      {overflowCount > 0 && (
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full flex items-center justify-center
            bg-muted-foreground text-white font-semibold
            border-2 border-card
            shadow-sm
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

export default SelectionIndicator;
