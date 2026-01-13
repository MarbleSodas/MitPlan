import type { ReactNode } from 'react';
import { useElementSelections } from '../../hooks/useElementSelections';
import SelectionIndicator from './SelectionIndicator';
import type { ElementType } from '../../types/presence';

interface SelectionBorderProps {
  children: ReactNode;
  elementType: ElementType;
  elementId: string | null;
  className?: string;
  showIndicator?: boolean;
  indicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const SelectionBorder = ({
  children,
  elementType,
  elementId,
  className = '',
  showIndicator = true,
  indicatorPosition = 'top-right'
}: SelectionBorderProps) => {
  const { selections, isSelectedByOthers, primaryColor, allColors } = useElementSelections(
    elementType,
    elementId
  );

  const getBorderStyle = (): React.CSSProperties => {
    if (!isSelectedByOthers || !primaryColor) {
      return {};
    }

    if (allColors.length === 1) {
      return {
        boxShadow: `0 0 0 2px ${primaryColor}, 0 0 12px ${primaryColor}40`
      };
    }

    if (allColors.length >= 2) {
      return {
        boxShadow: `0 0 0 2px ${allColors[0]}, 0 0 0 4px ${allColors[1]}`
      };
    }

    return {};
  };

  return (
    <div 
      className={`relative transition-shadow duration-150 ${className}`}
      style={getBorderStyle()}
    >
      {children}
      {showIndicator && (
        <SelectionIndicator
          selections={selections}
          position={indicatorPosition}
          maxDisplay={3}
        />
      )}
    </div>
  );
};

export default SelectionBorder;
