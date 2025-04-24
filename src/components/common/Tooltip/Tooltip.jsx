import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  z-index: 9999;
`;

const TooltipContent = styled.div`
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  width: 200px;
  background-color: ${props => props.theme.mode === 'dark' ? '#222' : '#333'};
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 10px;
  position: fixed; /* Changed from absolute to fixed */
  z-index: 9999;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: opacity 0.3s, background-color 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none; /* Ensures tooltip doesn't interfere with mouse events */
  max-width: 300px;
  word-wrap: break-word;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: ${props => props.theme.mode === 'dark' ? '#222' : '#333'} transparent transparent transparent;
  }
`;

function Tooltip({ children, content, disabled = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);

  // Calculate position when tooltip becomes visible
  const calculatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // Position tooltip above the element
      setPosition({
        top: rect.top + scrollTop - 10, // 10px above the element
        left: rect.left + rect.width / 2, // Centered horizontally
      });
    }
  };

  // Add window resize event listener to update tooltip position
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition);
      calculatePosition();
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
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
      <TooltipContent
        $isVisible={isVisible}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translate(-50%, -100%)', // Center horizontally and position above
        }}
      >
        {content}
      </TooltipContent>
    </TooltipContainer>
  );
}

export default Tooltip;
