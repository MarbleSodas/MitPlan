import React, { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import styled from 'styled-components';

const DropArea = styled.div`
  position: relative;
  transition: background-color 0.2s ease;

  /* Valid drop target styling when dragging over */
  ${props => props.$isOver && !props['aria-disabled'] && props.$isSelected && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(51, 153, 255, 0.2);
      border: 2px dashed #3399ff;
      border-radius: inherit;
      pointer-events: none;
      z-index: 1;
    }
  `}

  /* Invalid drop target styling when dragging over */
  ${props => props.$isOver && !props['aria-disabled'] && !props.$isSelected && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 0, 0, 0.1);
      border: 2px dashed #ff4444;
      border-radius: inherit;
      pointer-events: none;
      z-index: 1;
    }
  `}

  /* Visual indicator for valid drop targets when something is being dragged */
  ${props => props.$isDragActive && props.$isSelected && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(51, 153, 255, 0.05);
      border: 1px solid rgba(51, 153, 255, 0.3);
      border-radius: inherit;
      pointer-events: none;
      z-index: 0;
    }
  `}

  /* Dimmed styling for invalid drop targets when something is being dragged */
  ${props => props.$isDragActive && !props.$isSelected && `
    opacity: 0.5;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.1);
      border-radius: inherit;
      pointer-events: none;
      z-index: 0;
    }
  `}
`;

const Droppable = forwardRef(({ id, children, data, disableDrop = false, isSelected = false, ...props }, ref) => {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data,
    disabled: disableDrop
  });

  // Check if there's an active drag operation
  const isDragActive = !!active;

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
    <DropArea
      ref={handleRef}
      $isOver={isOver}
      $isSelected={isSelected}
      $isDragActive={isDragActive}
      role="region"
      aria-live={isOver ? 'assertive' : 'off'}
      aria-disabled={disableDrop}
      {...props}
    >
      {children}
      {isOver && active && (
        <span className="sr-only">
          {isSelected
            ? `Item ${active.id} can be dropped on ${id}`
            : `Item ${active.id} cannot be dropped on ${id} - boss action not selected`
          }
        </span>
      )}
    </DropArea>
  );
});

// Add display name for better debugging
Droppable.displayName = 'Droppable';

export default Droppable;
