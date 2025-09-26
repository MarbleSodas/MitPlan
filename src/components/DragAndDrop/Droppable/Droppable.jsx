import React, { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';

const Droppable = forwardRef(({ id, children, data, disableDrop = false, isSelected = false, ...props }, ref) => {
  const { isOver, setNodeRef, active } = useDroppable({ id, data, disabled: disableDrop });
  const isDragActive = !!active;

  const handleRef = (node) => {
    setNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const overlay = () => {
    if (isOver && !disableDrop && isSelected) {
      return (
        <div className="absolute inset-0 pointer-events-none z-[1] rounded-[inherit] border-2 border-dashed"
             style={{ backgroundColor: 'rgba(51, 153, 255, 0.2)', borderColor: '#3399ff' }} />
      );
    }
    if (isOver && !disableDrop && !isSelected) {
      return (
        <div className="absolute inset-0 pointer-events-none z-[1] rounded-[inherit] border-2 border-dashed"
             style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: '#ff4444' }} />
      );
    }
    if (isDragActive && isSelected) {
      return (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-[inherit] border"
             style={{ backgroundColor: 'rgba(51, 153, 255, 0.05)', borderColor: 'rgba(51, 153, 255, 0.3)' }} />
      );
    }
    if (isDragActive && !isSelected) {
      return (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-[inherit]"
             style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
      );
    }
    return null;
  };

  return (
    <div
      ref={handleRef}
      className="relative transition-colors"
      role="region"
      aria-live={isOver ? 'assertive' : 'off'}
      aria-disabled={disableDrop}
      style={{ opacity: isDragActive && !isSelected ? 0.5 : 1 }}
      {...props}
    >
      {children}
      {overlay()}
      {isOver && active && (
        <span className="sr-only">
          {isSelected ? `Item ${active.id} can be dropped on ${id}` : `Item ${active.id} cannot be dropped on ${id} - boss action not selected`}
        </span>
      )}
    </div>
  );
});

Droppable.displayName = 'Droppable';
export default Droppable;
