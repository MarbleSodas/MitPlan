import type { ReactNode } from 'react';
import type { ElementType, PresenceTargetInput } from '../../types/presence';
import PresenceTarget from './PresenceTarget';

interface SelectionBorderProps {
  children: ReactNode;
  elementType: ElementType;
  elementId: string | null;
  className?: string;
  showIndicator?: boolean;
  indicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  surface?: PresenceTargetInput['surface'];
  field?: string | null;
  slotId?: string | null;
  section?: string | null;
  panel?: string | null;
  publishHover?: boolean;
  publishFocus?: boolean;
}

const SelectionBorder = ({
  children,
  elementType,
  elementId,
  className = '',
  showIndicator = true,
  indicatorPosition = 'top-right',
  surface = 'planner',
  field = null,
  slotId = null,
  section = null,
  panel = null,
  publishHover = false,
  publishFocus = false,
}: SelectionBorderProps) => {
  const target = elementId
    ? {
        surface,
        entityType: elementType,
        entityId: elementId,
        field,
        slotId,
        section,
        panel,
      }
    : null;

  return (
    <PresenceTarget
      target={target}
      className={className}
      showIndicator={showIndicator}
      indicatorPosition={indicatorPosition}
      publishHover={publishHover}
      publishFocus={publishFocus}
    >
      {children}
    </PresenceTarget>
  );
};

export default SelectionBorder;
