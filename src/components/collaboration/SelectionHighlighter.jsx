import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const SelectionOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
  border-radius: 8px;
  border: 2px solid ${props => props.userColor || '#4CAF50'};
  background: ${props => props.userColor || '#4CAF50'}10;
  transition: all 0.2s ease;
  
  &::before {
    content: '${props => props.userName || 'User'}';
    position: absolute;
    top: -24px;
    left: 0;
    background: ${props => props.userColor || '#4CAF50'};
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    z-index: 11;
  }
`;

const SelectionPulse = styled.div`
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 8px;
  border: 2px solid ${props => props.userColor || '#4CAF50'};
  animation: selectionPulse 2s infinite;
  pointer-events: none;
  
  @keyframes selectionPulse {
    0% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.02); }
    100% { opacity: 0.8; transform: scale(1); }
  }
`;

/**
 * Hook to manage element selection highlighting
 */
export const useSelectionHighlighting = (elementId, userSelections = {}, currentUserId) => {
  const [isSelected, setIsSelected] = useState(false);
  const [selector, setSelector] = useState(null);

  useEffect(() => {
    // Check if this element is selected by any user (excluding current user)
    const selection = Object.entries(userSelections).find(([userId, selection]) => 
      userId !== currentUserId && selection?.elementId === elementId
    );

    if (selection) {
      const [userId, selectionData] = selection;
      setIsSelected(true);
      setSelector({
        userId,
        userName: selectionData.userName || 'Anonymous',
        userColor: selectionData.userColor || '#4CAF50'
      });
    } else {
      setIsSelected(false);
      setSelector(null);
    }
  }, [elementId, userSelections, currentUserId]);

  return { isSelected, selector };
};

/**
 * Component to highlight selected elements in collaboration
 */
const SelectionHighlighter = ({ 
  elementId, 
  userSelections = {}, 
  currentUserId,
  children,
  showPulse = true 
}) => {
  const { isSelected, selector } = useSelectionHighlighting(
    elementId, 
    userSelections, 
    currentUserId
  );

  return (
    <div style={{ position: 'relative' }}>
      {children}
      
      {isSelected && selector && (
        <>
          <SelectionOverlay
            userColor={selector.userColor}
            userName={selector.userName}
          />
          {showPulse && (
            <SelectionPulse userColor={selector.userColor} />
          )}
        </>
      )}
    </div>
  );
};

/**
 * Higher-order component to add selection highlighting to any component
 */
export const withSelectionHighlighting = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const { elementId, userSelections, currentUserId, ...otherProps } = props;
    
    return (
      <SelectionHighlighter
        elementId={elementId}
        userSelections={userSelections}
        currentUserId={currentUserId}
      >
        <WrappedComponent ref={ref} {...otherProps} />
      </SelectionHighlighter>
    );
  });
};

export default SelectionHighlighter;
