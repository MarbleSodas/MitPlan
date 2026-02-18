import React, { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const Draggable = forwardRef(({ id, children, data, isDisabled = false, cooldownReason = null }, ref) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id,
    data,
    disabled: isDisabled
  });

  const style = transform && !isDragging
    ? { transform: CSS.Transform.toString(transform) }
    : undefined;

  const opacityClass = isDisabled ? 'opacity-50' : (isDragging ? 'opacity-0' : 'opacity-100');
  const cursorClass = isDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing';

  const handleRef = (node: HTMLDivElement | null) => {
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
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      aria-pressed={isDragging}
      aria-disabled={isDisabled}
      className={`relative group transition-[opacity,box-shadow] duration-100 ${opacityClass} ${cursorClass}`}
    >
      {children}

      {isDisabled && (
        <div className="pointer-events-none absolute inset-0 bg-black/10 z-[1]" />
      )}

      {isDisabled && cooldownReason && (
        <div className="absolute inset-0 bg-black/70 text-white flex items-center justify-center text-center text-[12px] p-1 z-[2] opacity-0 pointer-events-none transition-opacity duration-100 group-hover:opacity-100">
          {cooldownReason}
        </div>
      )}
    </div>
  );
});

Draggable.displayName = 'Draggable';

export default Draggable;
