import React, { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import styled from 'styled-components';

const DropArea = styled.div`
  border: ${props => props.isOver ? '2px dashed #3399ff' : 'none'};
  background-color: ${props => props.isOver ? 'rgba(51, 153, 255, 0.1)' : 'transparent'};
  border-radius: 6px;
  transition: background-color 0.2s, border 0.2s;
  position: relative;

  &:focus-within {
    outline: 2px solid #3399ff;
    outline-offset: 2px;
  }
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
      isOver={isOver}
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
