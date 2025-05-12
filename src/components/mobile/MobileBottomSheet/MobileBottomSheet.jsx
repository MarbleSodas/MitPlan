import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

const BottomSheetOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000; /* Increased z-index to ensure it's above everything */
  display: ${props => props.$isOpen ? 'block' : 'none'};
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const BottomSheetContainer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.colors.secondary};
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.2);
  z-index: 10001; /* Increased z-index to ensure it's above the overlay */
  transform: translateY(${props => props.$isOpen ? '0' : '100%'});
  transition: transform 0.3s ease;
  max-height: 90vh; /* Increased from 80vh to 90vh to take up more space */
  height: 90vh; /* Fixed height to ensure consistent sizing */
  display: flex;
  flex-direction: column;

  /* Special handling for browser inspect mode */
  @media (min-height: 300px) and (max-height: 500px) {
    max-height: 95vh; /* Allow even more space in browser inspect mode */
    height: 95vh; /* Fixed height for browser inspect mode */
  }
`;

const BottomSheetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  position: sticky;
  top: 0;
  background-color: ${props => props.theme.colors.secondary};
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  z-index: 2; /* Ensure header stays above content when scrolling */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* Subtle shadow to emphasize the header */
`;

const BottomSheetTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &:hover, &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const BottomSheetContent = styled.div`
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  max-height: 75vh; /* Increased from 60vh to 75vh to take up more space */
  overscroll-behavior: contain; /* Prevent scroll chaining */
  touch-action: pan-y; /* Allow vertical scrolling */
  padding-bottom: 24px; /* Add more padding at the bottom for better scrolling experience */
`;

const SwipeIndicator = styled.div`
  width: 50px;
  height: 5px;
  background-color: ${props => props.theme.colors.border};
  border-radius: 3px;
  margin: 10px auto;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 1;
    background-color: ${props => props.theme.colors.primary};
  }
`;

const MobileBottomSheet = ({ isOpen, onClose, title, children }) => {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Add state to track if we're currently processing an action
  // This prevents the sheet from closing during mitigation assignment
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Add state to track if we should allow closing
  // This prevents accidental closures during mitigation assignment
  const [allowClosing, setAllowClosing] = useState(true);

  // Add event listeners for mitigation processing events
  useEffect(() => {
    const handleProcessingStart = () => {
      setIsProcessingAction(true);
      setAllowClosing(false);
    };

    const handleProcessingEnd = () => {
      setIsProcessingAction(false);
      setAllowClosing(true);
    };

    // Add event listeners
    window.addEventListener('mitigation-processing-start', handleProcessingStart);
    window.addEventListener('mitigation-processing-end', handleProcessingEnd);

    // Cleanup
    return () => {
      window.removeEventListener('mitigation-processing-start', handleProcessingStart);
      window.removeEventListener('mitigation-processing-end', handleProcessingEnd);
    };
  }, []);

  // Listen for custom events from MobileMitigationSelector
  useEffect(() => {
    const handleProcessingStart = () => {
      setIsProcessingAction(true);
      setAllowClosing(false);
    };

    const handleProcessingEnd = () => {
      setIsProcessingAction(false);
      // Add a small delay before allowing closing again
      setTimeout(() => {
        setAllowClosing(true);
      }, 500);
    };

    // Create custom event listeners
    window.addEventListener('mitigation-processing-start', handleProcessingStart);
    window.addEventListener('mitigation-processing-end', handleProcessingEnd);

    return () => {
      window.removeEventListener('mitigation-processing-start', handleProcessingStart);
      window.removeEventListener('mitigation-processing-end', handleProcessingEnd);
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sheetRef.current &&
          !sheetRef.current.contains(event.target) &&
          allowClosing &&
          !isProcessingAction) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, allowClosing, isProcessingAction]);

  // Handle swipe down to close
  const handleTouchStart = (e) => {
    // Store the initial touch position
    startY.current = e.touches[0].clientY;
    // Reset current position
    currentY.current = startY.current;
  };

  const handleTouchMove = (e) => {
    // If we're processing an action, don't allow swiping
    if (isProcessingAction || !allowClosing) {
      return;
    }

    // Get the content element for scroll position checking
    const content = sheetRef.current.querySelector('div:last-child');
    // Update current touch position
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Only handle downward swipes
    if (deltaY > 0) {
      // Only prevent default and move the sheet if we're at the top of the content
      // This allows normal scrolling within the content area
      if (content && content.scrollTop <= 0) {
        // Prevent default to stop scrolling when swiping down from the top of the content
        e.preventDefault();

        // Apply transform to move the sheet
        let transformY = deltaY;

        // Add resistance as user drags down further
        if (deltaY > 200) {
          transformY = 200 + (deltaY - 200) * 0.2;
        }

        sheetRef.current.style.transform = `translateY(${transformY}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    const deltaY = currentY.current - startY.current;

    // If swiped down more than threshold and not processing an action, close the sheet
    if (deltaY > 80 && allowClosing && !isProcessingAction) {
      // Add a small animation before closing
      sheetRef.current.style.transition = 'transform 0.2s ease';
      sheetRef.current.style.transform = `translateY(${Math.min(deltaY * 1.2, window.innerHeight)}px)`;

      setTimeout(() => {
        onClose();
        // Reset the transition after closing
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.3s ease';
          sheetRef.current.style.transform = '';
        }
      }, 200);
    } else {
      // Otherwise, reset the position with a bounce effect
      sheetRef.current.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      sheetRef.current.style.transform = '';

      // Reset the transition after animation
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.3s ease';
        }
      }, 500);
    }

    startY.current = 0;
    currentY.current = 0;
  };

  // Prevent body scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      // Save current body position
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Store original body styles
      const originalStyles = {
        position: document.body.style.position,
        width: document.body.style.width,
        top: document.body.style.top,
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight
      };

      // Apply fixed positioning to body to prevent scrolling
      // Add padding right to prevent layout shift when scrollbar disappears
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        // Restore body position when component unmounts or sheet closes
        document.body.style.position = originalStyles.position;
        document.body.style.width = originalStyles.width;
        document.body.style.top = originalStyles.top;
        document.body.style.overflow = originalStyles.overflow;
        document.body.style.paddingRight = originalStyles.paddingRight;

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  return (
    <>
      <BottomSheetOverlay $isOpen={isOpen} onClick={onClose} />
      <BottomSheetContainer
        $isOpen={isOpen}
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <SwipeIndicator />
        <BottomSheetHeader>
          <BottomSheetTitle>{title}</BottomSheetTitle>
          <CloseButton
            onClick={() => {
              if (allowClosing && !isProcessingAction) {
                onClose();
              }
            }}
            aria-label="Close"
            style={{
              opacity: allowClosing && !isProcessingAction ? 1 : 0.5,
              cursor: allowClosing && !isProcessingAction ? 'pointer' : 'not-allowed'
            }}
          >
            <X size={24} />
          </CloseButton>
        </BottomSheetHeader>
        <BottomSheetContent className="bottom-sheet-content">
          {children}
        </BottomSheetContent>
      </BottomSheetContainer>
    </>
  );
};

export default MobileBottomSheet;
