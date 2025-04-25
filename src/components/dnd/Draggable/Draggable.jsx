import React, { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import styled from 'styled-components';
// Import CSS utilities for transform handling
import { CSS } from '@dnd-kit/utilities';

const DraggableItem = styled.div`
  opacity: ${props => {
    if (props.$isDisabled) return 0.5;
    // When dragging, make the original item invisible
    return props.$isDragging ? 0 : 1;
  }};
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  /* Only disable touch actions when actively dragging to allow scrolling otherwise */
  touch-action: ${props => props.$isDragging ? 'none' : 'auto'};
  position: relative;
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'grab'};

  ${props => props.$isDisabled && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.1);
      z-index: 1;
      border-radius: inherit;
    }
  `}

  &:active {
    cursor: ${props => props.$isDisabled ? 'not-allowed' : 'grabbing'};
  }
`;

const CooldownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 12px;
  padding: 5px;
  border-radius: inherit;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;

  ${DraggableItem}:hover & {
    opacity: 1;
  }
`;

const Draggable = forwardRef(({ id, children, data, isDisabled = false, cooldownReason = null }, ref) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    // setActivatorNodeRef is available but not used in this implementation
    transform,
    isDragging
  } = useDraggable({
    id,
    data,
    disabled: isDisabled
  });

  // Only apply transform when not dragging to avoid duplicate dragging visuals
  const style = transform && !isDragging ? {
    transform: CSS.Transform.toString(transform),
  } : undefined;

  // Combine refs if one is passed from parent
  const handleRef = (node) => {
    setNodeRef(node);
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <DraggableItem
      ref={handleRef}
      style={style}
      {...(isDisabled ? {} : listeners)}
      {...(isDisabled ? {} : attributes)}
      $isDragging={isDragging}
      $isDisabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0} // Make draggable items focusable for accessibility unless disabled
      role="button"
      aria-pressed={isDragging}
      aria-disabled={isDisabled}
    >
      {children}
      {isDisabled && cooldownReason && (
        <CooldownOverlay className="cooldown-reason">
          {cooldownReason}
        </CooldownOverlay>
      )}
    </DraggableItem>
  );
});

// Add display name for better debugging
Draggable.displayName = 'Draggable';

export default Draggable;
