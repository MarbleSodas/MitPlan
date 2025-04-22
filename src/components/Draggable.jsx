import React, { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import styled from 'styled-components';
// Import CSS utilities for transform handling
import { CSS } from '@dnd-kit/utilities';

const DraggableItem = styled.div`
  opacity: ${props => {
    if (props.isDisabled) return 0.5;
    // When dragging, make the original item invisible
    return props.isDragging ? 0 : 1;
  }};
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  touch-action: none; /* Prevents touch scrolling while dragging on mobile */
  position: relative;
  cursor: ${props => props.isDisabled ? 'not-allowed' : 'grab'};

  ${props => props.isDisabled && `
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
    cursor: ${props => props.isDisabled ? 'not-allowed' : 'grabbing'};
  }

  &:focus {
    outline: ${props => props.isDisabled ? 'none' : '2px solid #3399ff'};
  }

  &:hover {
    .cooldown-reason {
      opacity: ${props => props.isDisabled ? 1 : 0};
    }
    transform: ${props => props.isDisabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.isDisabled ? 'none' : '0 2px 5px rgba(0, 0, 0, 0.1)'};
  }
`;

const CooldownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: inherit;
  text-align: center;
  padding: 10px;
  white-space: pre-line;
  line-height: 1.4;
  backdrop-filter: blur(2px);
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
      isDragging={isDragging}
      isDisabled={isDisabled}
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
