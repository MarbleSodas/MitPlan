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
  border-top-left-radius: ${props => props.theme.borderRadius.responsive.xlarge};
  border-top-right-radius: ${props => props.theme.borderRadius.responsive.xlarge};
  box-shadow: ${props => props.theme.shadows.xlarge};
  z-index: 10001; /* Increased z-index to ensure it's above the overlay */
  transform: translateY(${props => props.$isOpen ? '0' : '100%'});
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: ${props => props.$isFullScreen ? '100vh' : '90vh'}; /* Adjustable height based on content */
  height: ${props => props.$isFullScreen ? '100vh' : '90vh'}; /* Fixed height to ensure consistent sizing */
  display: flex;
  flex-direction: column;
  will-change: transform; /* Optimize for animations */
  touch-action: pan-y; /* Allow vertical scrolling */
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  overscroll-behavior: contain; /* Prevent scroll chaining */

  /* Safe area insets for notched devices */
  padding-bottom: env(safe-area-inset-bottom, 0);

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    max-width: 600px; /* Limit width on larger screens */
    margin: 0 auto; /* Center on larger screens */
    border-top-left-radius: ${props => props.theme.borderRadius.xlarge};
    border-top-right-radius: ${props => props.theme.borderRadius.xlarge};
  }

  /* Special handling for browser inspect mode */
  @media (min-height: 300px) and (max-height: 500px) {
    max-height: 95vh; /* Allow even more space in browser inspect mode */
    height: 95vh; /* Fixed height for browser inspect mode */
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    max-height: 95vh; /* Take up more space on small screens */
    height: 95vh;
  }
`;

const BottomSheetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing.responsive.medium};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  position: sticky;
  top: 0;
  background-color: ${props => props.theme.colors.secondary};
  border-top-left-radius: ${props => props.theme.borderRadius.responsive.xlarge};
  border-top-right-radius: ${props => props.theme.borderRadius.responsive.xlarge};
  z-index: 2; /* Ensure header stays above content when scrolling */
  box-shadow: ${props => props.theme.shadows.small}; /* Subtle shadow to emphasize the header */
  user-select: none; /* Prevent text selection */

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.large};
    border-top-left-radius: ${props => props.theme.borderRadius.xlarge};
    border-top-right-radius: ${props => props.theme.borderRadius.xlarge};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
  }
`;

const BottomSheetTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.responsive.large};
  font-weight: 600;
  color: ${props => props.theme.colors.text};

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.fontSizes.responsive.xlarge};
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    font-size: ${props => props.theme.fontSizes.responsive.medium};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  min-width: 44px; /* Minimum touch target size */
  min-height: 44px; /* Minimum touch target size */
  -webkit-tap-highlight-color: transparent; /* Remove default mobile tap highlight */
  touch-action: manipulation; /* Optimize for touch */
  user-select: none; /* Prevent text selection */
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  }

  &:active {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
    transform: scale(0.95);
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: 10px;
  }
`;

const BottomSheetContent = styled.div`
  padding: ${props => props.theme.spacing.responsive.medium};
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  max-height: 75vh; /* Increased from 60vh to 75vh to take up more space */
  overscroll-behavior: contain; /* Prevent scroll chaining */
  touch-action: pan-y; /* Allow vertical scrolling */
  padding-bottom: calc(${props => props.theme.spacing.responsive.xlarge} + env(safe-area-inset-bottom, 0)); /* Add more padding at the bottom for better scrolling experience */
  scroll-padding: ${props => props.theme.spacing.responsive.large}; /* Ensure content is not hidden behind fixed elements */

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.large};
    padding-bottom: calc(${props => props.theme.spacing.responsive.xlarge} + env(safe-area-inset-bottom, 0));
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    padding-bottom: calc(${props => props.theme.spacing.responsive.large} + env(safe-area-inset-bottom, 0));
  }

  /* Scrollbar styling for webkit browsers */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const SwipeIndicator = styled.div`
  width: 60px;
  height: 6px;
  background-color: ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.pill};
  margin: 12px auto 4px;
  opacity: 0.8;
  transition: all 0.2s ease;
  user-select: none; /* Prevent text selection */
  touch-action: none; /* Prevent touch events */

  &:active {
    opacity: 1;
    background-color: ${props => props.theme.colors.primary};
    transform: scale(1.1);
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    width: 70px;
    height: 7px;
    margin: 14px auto 6px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    width: 50px;
    height: 5px;
    margin: 10px auto 2px;
  }
`;

const MobileBottomSheet = ({ isOpen, onClose, title, children, isFullScreen = false }) => {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Add state to track if we're currently processing an action
  // This prevents the sheet from closing during mitigation assignment
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Add state to track if we should allow closing
  // This prevents accidental closures during mitigation assignment
  // Default to true to ensure the X button works on initial render
  const [allowClosing, setAllowClosing] = useState(true);

  // Listen for custom events from MobileMitigationSelector
  useEffect(() => {
    // Create a ref to track if the component is mounted
    const isMounted = { current: true };

    // Track any active timeouts for cleanup
    const timeouts = [];

    const handleProcessingStart = (event) => {
      if (isMounted.current) {
        // Prevent default to avoid any potential browser issues
        if (event && event.preventDefault) {
          event.preventDefault();
        }

        setIsProcessingAction(true);
        setAllowClosing(false);
      }
    };

    const handleProcessingEnd = (event) => {
      if (isMounted.current) {
        // Prevent default to avoid any potential browser issues
        if (event && event.preventDefault) {
          event.preventDefault();
        }

        setIsProcessingAction(false);

        // Add a small delay before allowing closing again
        const timeoutId = setTimeout(() => {
          if (isMounted.current) {
            setAllowClosing(true);
          }
        }, 300);

        // Track the timeout for cleanup
        timeouts.push(timeoutId);
      }
    };

    // Create custom event listeners
    window.addEventListener('mitigation-processing-start', handleProcessingStart);
    window.addEventListener('mitigation-processing-end', handleProcessingEnd);

    return () => {
      isMounted.current = false;

      // Clean up all timeouts
      timeouts.forEach(id => clearTimeout(id));

      window.removeEventListener('mitigation-processing-start', handleProcessingStart);
      window.removeEventListener('mitigation-processing-end', handleProcessingEnd);
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Always close when clicking outside, regardless of processing state
      // This ensures users can always close the sheet
      if (sheetRef.current && !sheetRef.current.contains(event.target)) {
        // Log for debugging
        console.log('Clicked outside, closing bottom sheet');
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle swipe down to close
  const handleTouchStart = (e) => {
    // Don't handle touch events if we're processing an action
    if (isProcessingAction || !allowClosing) {
      return;
    }

    try {
      // Store the initial touch position
      startY.current = e.touches[0].clientY;
      // Reset current position
      currentY.current = startY.current;
    } catch (error) {
      console.error('Error in handleTouchStart:', error);
    }
  };

  const handleTouchMove = (e) => {
    // Removed the processing action check to ensure swiping always works
    // This ensures users can always close the sheet

    try {
      // Safety check for sheetRef
      if (!sheetRef.current) {
        return;
      }

      // Get the content element for scroll position checking
      const content = sheetRef.current.querySelector('.bottom-sheet-content');

      // Safety check for content
      if (!content) {
        return;
      }

      // Update current touch position
      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      // Only handle downward swipes
      if (deltaY > 0) {
        // Only prevent default and move the sheet if we're at the top of the content
        // This allows normal scrolling within the content area
        if (content.scrollTop <= 0) {
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
    } catch (error) {
      console.error('Error in handleTouchMove:', error);

      // Reset transform in case of error
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
    }
  };

  const handleTouchEnd = () => {
    try {
      // Safety check for sheetRef
      if (!sheetRef.current) {
        return;
      }

      const deltaY = currentY.current - startY.current;

      // If swiped down more than threshold, close the sheet
      // Removed the isProcessingAction and allowClosing conditions to ensure the sheet can always be closed
      if (deltaY > 80) {
        // Add a small animation before closing
        sheetRef.current.style.transition = 'transform 0.2s ease';
        sheetRef.current.style.transform = `translateY(${Math.min(deltaY * 1.2, window.innerHeight)}px)`;

        setTimeout(() => {
          // Log for debugging
          console.log('Swipe down detected, closing bottom sheet');

          onClose();
          // Reset the transition after closing
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s ease';
            sheetRef.current.style.transform = '';
          }
        }, 200);
      } else {
        // Otherwise, reset the position with a bounce effect
        sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        sheetRef.current.style.transform = '';

        // Reset the transition after animation
        setTimeout(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s ease';
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error in handleTouchEnd:', error);

      // Reset transform in case of error
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
    } finally {
      // Always reset touch positions
      startY.current = 0;
      currentY.current = 0;
    }
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
      <BottomSheetOverlay
        $isOpen={isOpen}
        onClick={() => {
          // Log for debugging
          console.log('Overlay clicked, closing bottom sheet');
          onClose();
        }}
      />
      <BottomSheetContainer
        $isOpen={isOpen}
        $isFullScreen={isFullScreen}
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
              // Always attempt to close the sheet when the X button is clicked
              // This ensures the button is always functional
              onClose();

              // Log for debugging
              console.log('X button clicked, closing bottom sheet');
            }}
            aria-label="Close"
            // Remove conditional styling to ensure the button always looks clickable
            style={{
              opacity: 1,
              cursor: 'pointer'
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
