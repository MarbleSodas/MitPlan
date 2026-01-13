import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';

// Create a portal container if it doesn't exist
const getOrCreatePortalContainer = () => {
  let container = document.getElementById('tooltip-portal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tooltip-portal-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
};

const TooltipContainer = forwardRef((props, ref) => {
  const { children, className = '', ...rest } = props;
  // Wrapper just needs to be an inline-block with relative positioning for measuring
  return (
    <div ref={ref} {...rest} className={`relative inline-block ${className}`}>
      {children}
    </div>
  );
});

const TooltipContent = (props) => {
  const isVisible = props['$isVisible'];
  const placeAbove = props['$placeAbove'];
  const { children, className = '', style } = props;
  const base = 'fixed z-[9999] bg-neutral-800 dark:bg-neutral-900 text-white text-left rounded-md px-2.5 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.25)] pointer-events-none max-w-[300px] whitespace-pre-wrap leading-[1.4] text-[14px] transition-opacity duration-200';
  const visibility = isVisible ? 'opacity-100 visible' : 'opacity-0 invisible';
  return (
    <div
      style={style}
      className={`${base} ${visibility} ${className}`}
    >
      {children}
      <span
        className={`absolute left-1/2 -translate-x-1/2 ${placeAbove ? 'top-full' : 'bottom-full'} w-2 h-2 bg-neutral-800 dark:bg-neutral-900 rotate-45`}
      />
    </div>
  );
};

function Tooltip({ children, content, disabled = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placeAbove: true, isMobileRight: false });
  const containerRef = useRef(null);
  const portalContainer = typeof document !== 'undefined' ? getOrCreatePortalContainer() : null;

  // Calculate position when tooltip becomes visible or on window resize
  const calculatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth <= 768;

      // Check if there's enough space above the element
      const spaceAbove = rect.top;
      const tooltipHeight = isMobile ? 100 : 150; // Approximate height of tooltip (smaller on mobile)
      const minMargin = isMobile ? 5 : 10; // Smaller margin on mobile

      // For mobile, check if we're in the right side of the screen
      const isMobileRight = isMobile && rect.left > viewportWidth / 2;

      // Determine if tooltip should be placed above or below the element
      const placeAbove = spaceAbove >= tooltipHeight + minMargin;

      // Position tooltip above or below the element based on available space
      setPosition({
        top: placeAbove ? rect.top - minMargin : rect.bottom + minMargin,
        left: rect.left + rect.width / 2, // Centered horizontally
        placeAbove: placeAbove, // Store placement direction for arrow positioning
        isMobileRight: isMobileRight // Store if we're on the right side of the screen on mobile
      });
    }
  };

  // Update position when tooltip visibility changes or on window resize
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isVisible]);

  // If disabled, don't show tooltip
  if (disabled) {
    return children;
  }

  const handleMouseEnter = () => {
    setIsVisible(true);
    calculatePosition();
  };

  return (
    <TooltipContainer
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {portalContainer && createPortal(
        <TooltipContent
          $isVisible={isVisible}
          $placeAbove={position.placeAbove}
          $isMobileRight={position.isMobileRight}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: `translate(-50%, ${position.placeAbove ? '-100%' : '0'})`, // Adjust transform based on placement
          }}
        >
          {content}
        </TooltipContent>,
        portalContainer
      )}
    </TooltipContainer>
  );
}

export default Tooltip;
