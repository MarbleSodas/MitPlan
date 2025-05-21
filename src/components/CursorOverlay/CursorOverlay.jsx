import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../contexts/PlanContext';

const CursorContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
`;

const Cursor = styled.div`
  position: absolute;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  z-index: 1001;
  pointer-events: none;
  transition: transform 0.1s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 16px solid ${props => props.$color || '#ff5733'};
    transform: rotate(-45deg);
  }
  
  &::after {
    content: '${props => props.$username || ''}';
    position: absolute;
    top: 16px;
    left: 8px;
    background-color: ${props => props.$color || '#ff5733'};
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0.9;
  }
`;

const Selection = styled.div`
  position: absolute;
  background-color: ${props => props.$color ? `${props.$color}33` : 'rgba(255, 87, 51, 0.2)'};
  border: 1px solid ${props => props.$color || '#ff5733'};
  z-index: 1000;
  pointer-events: none;
`;

const CursorOverlay = ({ containerRef }) => {
  const { cursorPositions } = usePlan();
  const [containerRect, setContainerRect] = useState(null);
  
  // Update container rect on resize
  useEffect(() => {
    if (!containerRef?.current) return;
    
    const updateRect = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    
    // Initial update
    updateRect();
    
    // Update on resize
    window.addEventListener('resize', updateRect);
    
    return () => {
      window.removeEventListener('resize', updateRect);
    };
  }, [containerRef]);
  
  if (!containerRef?.current || !containerRect || cursorPositions.length === 0) {
    return null;
  }
  
  return (
    <CursorContainer>
      {cursorPositions.map((cursor) => (
        <React.Fragment key={cursor.userId}>
          {/* Cursor */}
          {cursor.position && (
            <Cursor
              style={{
                left: `${cursor.position.x}px`,
                top: `${cursor.position.y}px`,
              }}
              $color={cursor.color}
              $username={cursor.username}
            />
          )}
          
          {/* Selection */}
          {cursor.selection && (
            <Selection
              style={{
                left: `${cursor.selection.startX}px`,
                top: `${cursor.selection.startY}px`,
                width: `${cursor.selection.width}px`,
                height: `${cursor.selection.height}px`,
              }}
              $color={cursor.color}
            />
          )}
        </React.Fragment>
      ))}
    </CursorContainer>
  );
};

export default CursorOverlay;
