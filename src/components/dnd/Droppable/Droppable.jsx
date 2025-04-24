import React, { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import styled from 'styled-components';

const DropArea = styled.div`
  position: relative;
  transition: background-color 0.2s ease;

  ${props => props.$isOver && !props['aria-disabled'] && `
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
`;

const Droppable = forwardRef(({ id, children, data, disableDrop = false, ...props }, ref) => {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data,
    disabled: disableDrop
  });

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
      role="region"
      aria-live={isOver ? 'assertive' : 'off'}
      aria-disabled={disableDrop}
      {...props}
    >
      {children}
      {isOver && active && (
        <span className="sr-only">
          Item {active.id} is over drop area {id}
        </span>
      )}
    </DropArea>
  );
});

// Add display name for better debugging
Droppable.displayName = 'Droppable';

export default Droppable;
