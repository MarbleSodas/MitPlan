import { useEffect, useCallback } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { throttle } from 'lodash';

/**
 * Hook to track cursor movements and send them to other users
 * @param {Object} containerRef - Reference to the container element
 * @param {number} throttleMs - Throttle time in milliseconds
 * @returns {Object} - Cursor tracking functions
 */
const useCursorTracking = (containerRef, throttleMs = 50) => {
  const { currentPlan, canEdit, sendCursorPosition, sendCursorSelection } = usePlan();
  
  // Throttled function to send cursor position
  const throttledSendPosition = useCallback(
    throttle((position) => {
      if (currentPlan && canEdit) {
        sendCursorPosition(position);
      }
    }, throttleMs),
    [currentPlan, canEdit, sendCursorPosition, throttleMs]
  );
  
  // Throttled function to send selection
  const throttledSendSelection = useCallback(
    throttle((selection) => {
      if (currentPlan && canEdit) {
        sendCursorSelection(selection);
      }
    }, throttleMs),
    [currentPlan, canEdit, sendCursorSelection, throttleMs]
  );
  
  // Track mouse movements
  useEffect(() => {
    if (!containerRef?.current || !currentPlan || !canEdit) return;
    
    const container = containerRef.current;
    
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      throttledSendPosition(position);
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      throttledSendPosition.cancel();
    };
  }, [containerRef, currentPlan, canEdit, throttledSendPosition]);
  
  // Track selection changes
  useEffect(() => {
    if (!containerRef?.current || !currentPlan || !canEdit) return;
    
    const container = containerRef.current;
    
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const rect = container.getBoundingClientRect();
      
      // Check if selection is within container
      if (!container.contains(range.commonAncestorContainer)) return;
      
      const rangeRect = range.getBoundingClientRect();
      
      // Convert to container coordinates
      const selectionData = {
        startX: rangeRect.left - rect.left,
        startY: rangeRect.top - rect.top,
        width: rangeRect.width,
        height: rangeRect.height,
        text: selection.toString()
      };
      
      throttledSendSelection(selectionData);
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      throttledSendSelection.cancel();
    };
  }, [containerRef, currentPlan, canEdit, throttledSendSelection]);
  
  return {
    // No functions to return for now, but could add manual tracking functions if needed
  };
};

export default useCursorTracking;
