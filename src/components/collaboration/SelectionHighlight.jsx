/**
 * Selection Highlight Component
 * Provides Google Docs-like selection highlighting for collaborative editing
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCollaboration } from '../../contexts/CollaborationContext';
import './SelectionHighlight.css';

const SelectionHighlight = ({ 
  elementId, 
  elementType = 'element',
  children, 
  className = '',
  onSelectionChange 
}) => {
  const {
    userSelections,
    userId,
    updateSelection,
    clearSelection,
    isCollaborating
  } = useCollaboration();

  const elementRef = useRef(null);
  const [isSelected, setIsSelected] = useState(false);
  const [otherUserSelections, setOtherUserSelections] = useState([]);

  // Get user color based on their ID
  const getUserColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Update other user selections for this element
  useEffect(() => {
    if (!isCollaborating) {
      setOtherUserSelections([]);
      return;
    }

    const selections = Object.entries(userSelections)
      .filter(([selectionUserId, selection]) => 
        selectionUserId !== userId && 
        selection && 
        selection.elementId === elementId
      )
      .map(([selectionUserId, selection]) => ({
        userId: selectionUserId,
        userName: selection.userName || 'Anonymous User',
        color: getUserColor(selectionUserId),
        timestamp: selection.timestamp
      }));

    setOtherUserSelections(selections);
  }, [userSelections, userId, elementId, isCollaborating]);

  // Handle element selection
  const handleSelect = (event) => {
    if (!isCollaborating) return;

    event.stopPropagation();
    
    setIsSelected(true);
    
    // Update selection in collaboration context
    updateSelection(elementId, {
      elementType,
      position: {
        x: event.clientX,
        y: event.clientY
      }
    });

    // Notify parent component
    if (onSelectionChange) {
      onSelectionChange(elementId, elementType, true);
    }
  };

  // Handle element deselection
  const handleDeselect = () => {
    if (!isCollaborating) return;

    setIsSelected(false);
    clearSelection();

    // Notify parent component
    if (onSelectionChange) {
      onSelectionChange(elementId, elementType, false);
    }
  };

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (elementRef.current && !elementRef.current.contains(event.target)) {
        handleDeselect();
      }
    };

    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isSelected]);

  // Auto-deselect after timeout
  useEffect(() => {
    if (isSelected) {
      const timeout = setTimeout(() => {
        handleDeselect();
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [isSelected]);

  // Generate selection indicators for other users
  const renderSelectionIndicators = () => {
    if (!isCollaborating || otherUserSelections.length === 0) {
      return null;
    }

    return otherUserSelections.map((selection, index) => (
      <div
        key={selection.userId}
        className="selection-indicator"
        style={{
          borderColor: selection.color,
          backgroundColor: `${selection.color}20`, // 20% opacity
          '--user-color': selection.color
        }}
        title={`${selection.userName} is editing this ${elementType}`}
      >
        <div className="selection-label">
          <span className="selection-user-name">
            {selection.userName}
          </span>
          <div 
            className="selection-user-dot"
            style={{ backgroundColor: selection.color }}
          />
        </div>
      </div>
    ));
  };

  // Generate current user selection indicator
  const renderCurrentUserSelection = () => {
    if (!isCollaborating || !isSelected) {
      return null;
    }

    const userColor = getUserColor(userId);

    return (
      <div
        className="selection-indicator current-user"
        style={{
          borderColor: userColor,
          backgroundColor: `${userColor}30`, // 30% opacity
          '--user-color': userColor
        }}
      >
        <div className="selection-label">
          <span className="selection-user-name">You</span>
          <div 
            className="selection-user-dot"
            style={{ backgroundColor: userColor }}
          />
        </div>
      </div>
    );
  };

  const hasSelections = isSelected || otherUserSelections.length > 0;
  const combinedClassName = `
    selection-highlight 
    ${className} 
    ${hasSelections ? 'has-selections' : ''}
    ${isSelected ? 'selected' : ''}
    ${otherUserSelections.length > 0 ? 'other-selected' : ''}
  `.trim();

  return (
    <div
      ref={elementRef}
      className={combinedClassName}
      onClick={handleSelect}
      data-element-id={elementId}
      data-element-type={elementType}
    >
      {/* Selection indicators for other users */}
      {renderSelectionIndicators()}
      
      {/* Current user selection indicator */}
      {renderCurrentUserSelection()}
      
      {/* Original content */}
      <div className="selection-content">
        {children}
      </div>
    </div>
  );
};

export default SelectionHighlight;
