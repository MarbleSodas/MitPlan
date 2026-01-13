import React, { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
// Import CSS utilities for transform handling
import { CSS } from '@dnd-kit/utilities';

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

  // Compute classes based on state
  const opacityClass = isDisabled ? 'opacity-50' : (isDragging ? 'opacity-0' : 'opacity-100');
  const touchClass = isDragging ? 'touch-none' : '';
  const cursorClass = isDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing';

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
    <div
      ref={handleRef}
      style={style}
      {...(isDisabled ? {} : listeners)}
      {...(isDisabled ? {} : attributes)}
      tabIndex={isDisabled ? -1 : 0} // Make draggable items focusable for accessibility unless disabled
      role="button"
      aria-pressed={isDragging}
      aria-disabled={isDisabled}
      className={`relative group transition-[opacity,box-shadow] duration-100 ${opacityClass} ${touchClass} ${cursorClass}`}
    >
      {children}

      {/* Disabled shade overlay */}
      {isDisabled && (
        <div className="pointer-events-none absolute inset-0 bg-black/10 z-[1]" />
      )}

      {/* Cooldown reason overlay shown on hover */}
      {isDisabled && cooldownReason && (
        <div className="absolute inset-0 bg-black/70 text-white flex items-center justify-center text-center text-[12px] p-1 z-[2] opacity-0 pointer-events-none transition-opacity duration-100 group-hover:opacity-100">
          {cooldownReason}
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
Draggable.displayName = 'Draggable';

export default Draggable;
