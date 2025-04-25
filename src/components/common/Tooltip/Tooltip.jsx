import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

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

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  width: 220px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: auto;
  }
`;

const TooltipContent = styled.div`
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  width: 220px;
  background-color: ${props => props.theme.mode === 'dark' ? '#222' : '#333'};
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 10px;
  position: absolute;
  z-index: 9999;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: opacity 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  max-width: 300px;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
  font-size: 14px;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;

    /* Arrow position and color based on tooltip placement */
    ${props => props.$placeAbove ? `
      top: 100%;
      border-color: ${props.theme.mode === 'dark' ? '#222' : '#333'} transparent transparent transparent;
    ` : `
      bottom: 100%;
      border-color: transparent transparent ${props.theme.mode === 'dark' ? '#222' : '#333'} transparent;
    `}
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 180px;
    max-width: 180px;
    font-size: 12px;
    padding: 8px;
    line-height: 1.3;
    ${props => props.$isMobileRight ? `
      left: auto !important;
      right: 10px !important;
      transform: translateY(${props.$placeAbove ? '-100%' : '0'}) !important;

      &::after {
        left: auto;
        right: 10px;
        margin-left: 0;
      }
    ` : ''}
  }
`;

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
