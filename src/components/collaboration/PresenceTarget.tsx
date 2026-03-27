import {
  useCallback,
  useMemo,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { usePresenceTarget } from '../../hooks/useElementSelections';
import type {
  CollaborationInteraction,
  PresenceTarget as PresenceTargetShape,
  PresenceTargetInput,
} from '../../types/presence';
import { createPresenceTarget } from '../../types/presence';
import PresenceBadgeGroup from './PresenceBadgeGroup';
import PresenceOutline from './PresenceOutline';

interface PresenceTargetProps {
  children: ReactNode;
  target: PresenceTargetInput | PresenceTargetShape | null;
  className?: string;
  style?: CSSProperties;
  showIndicator?: boolean;
  indicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  publishHover?: boolean;
  publishFocus?: boolean;
  hoverInteraction?: CollaborationInteraction;
  focusInteraction?: CollaborationInteraction;
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
  onFocusCapture?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlurCapture?: (event: FocusEvent<HTMLDivElement>) => void;
}

const PresenceTarget = ({
  children,
  target,
  className = '',
  style,
  showIndicator = true,
  indicatorPosition = 'top-right',
  publishHover = false,
  publishFocus = false,
  hoverInteraction = 'hovering',
  focusInteraction = 'selected',
  onMouseEnter,
  onMouseLeave,
  onFocusCapture,
  onBlurCapture,
}: PresenceTargetProps) => {
  const presence = usePresenceOptional();
  const normalizedTarget = useMemo(
    () => (target ? createPresenceTarget(target) : null),
    [target]
  );
  const { selections } = usePresenceTarget(normalizedTarget);

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (publishHover && presence && normalizedTarget) {
        presence.setActiveTarget(normalizedTarget);
        presence.setInteraction(hoverInteraction);
      }

      onMouseEnter?.(event);
    },
    [hoverInteraction, normalizedTarget, onMouseEnter, presence, publishHover]
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        publishHover &&
        presence &&
        normalizedTarget &&
        presence.getMyPresence()?.activeTarget?.key === normalizedTarget.key &&
        presence.getMyPresence()?.interaction === hoverInteraction
      ) {
        presence.setInteraction(null);
        presence.setActiveTarget(null);
      }

      onMouseLeave?.(event);
    },
    [hoverInteraction, normalizedTarget, onMouseLeave, presence, publishHover]
  );

  const handleFocusCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (publishFocus && presence && normalizedTarget) {
        presence.setActiveTarget(normalizedTarget);
        presence.setInteraction(focusInteraction);
      }

      onFocusCapture?.(event);
    },
    [focusInteraction, normalizedTarget, onFocusCapture, presence, publishFocus]
  );

  const handleBlurCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (
        publishFocus &&
        presence &&
        normalizedTarget &&
        !event.currentTarget.contains(event.relatedTarget as Node | null) &&
        presence.getMyPresence()?.activeTarget?.key === normalizedTarget.key &&
        presence.getMyPresence()?.interaction === focusInteraction
      ) {
        presence.setInteraction(null);
        presence.setActiveTarget(null);
      }

      onBlurCapture?.(event);
    },
    [focusInteraction, normalizedTarget, onBlurCapture, presence, publishFocus]
  );

  return (
    <PresenceOutline
      selections={selections}
      className={className}
      style={style}
    >
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {children}
        {showIndicator && (
          <PresenceBadgeGroup
            selections={selections}
            position={indicatorPosition}
            maxDisplay={3}
          />
        )}
      </div>
    </PresenceOutline>
  );
};

export default PresenceTarget;
