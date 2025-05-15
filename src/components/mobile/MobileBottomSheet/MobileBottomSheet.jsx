import { useEffect, useRef, useState } from 'react';
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
  transform: translate3d(0, ${props => props.$isOpen ? '0' : '100%'}, 0);
  transition: transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1); /* Material Design standard curve */
  max-height: ${props => props.$isFullScreen ? '100vh' : '90vh'}; /* Adjustable height based on content */
  height: ${props => props.$isFullScreen ? '100vh' : '90vh'}; /* Fixed height to ensure consistent sizing */
  display: flex;
  flex-direction: column;
  will-change: transform; /* Optimize for animations */
  touch-action: none; /* Prevent default touch behavior on container */
  -webkit-overflow-scrolling: touch; /* Improve scrolling on iOS devices */
  overscroll-behavior: contain; /* Prevent scroll chaining */
  backface-visibility: hidden; /* Prevent flickering during animations */
  transform-style: preserve-3d; /* Better 3D rendering */

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

  /* Prevent content from being selectable during swipe */
  &.is-swiping * {
    user-select: none !important;
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
  touch-action: none; /* Prevent default touch behavior */
  cursor: grab;
  min-height: 56px; /* Ensure minimum touch target size */

  &:active {
    cursor: grabbing;
  }

  /* Visual indicator for draggable area */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 10px;
    background: linear-gradient(
      to bottom,
      ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'},
      transparent
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:active::before {
    opacity: 1;
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.large};
    border-top-left-radius: ${props => props.theme.borderRadius.xlarge};
    border-top-right-radius: ${props => props.theme.borderRadius.xlarge};
    min-height: 64px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    min-height: 48px;
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

const SwipeHandleArea = styled.div`
  width: 100%;
  padding: 8px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: none; /* Prevent default touch behavior */
  user-select: none; /* Prevent text selection */
  cursor: grab;
  position: relative;
  z-index: 3; /* Ensure it's above other elements */

  &:active {
    cursor: grabbing;
  }
`;

const SwipeIndicator = styled.div`
  width: 60px;
  height: 6px;
  background-color: ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.pill};
  opacity: 0.8;
  transition: all 0.2s ease;

  ${SwipeHandleArea}:active & {
    opacity: 1;
    background-color: ${props => props.theme.colors.primary};
    transform: scale(1.1);
  }

  /* Tablet styles */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    width: 70px;
    height: 7px;
  }

  /* Small mobile styles */
  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    width: 50px;
    height: 5px;
  }
`;

const MobileBottomSheet = ({ isOpen, onClose, title, children, isFullScreen = false }) => {
  const sheetRef = useRef(null);
  const headerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const startTime = useRef(0);
  const isSwiping = useRef(false);
  const swipeVelocity = useRef(0);

  // Add state to track if we're currently processing an action
  // This prevents the sheet from closing during mitigation assignment
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Add state to track if we should allow closing
  // This prevents accidental closures during mitigation assignment
  // Default to true to ensure the X button works on initial render
  const [allowClosing, setAllowClosing] = useState(true);

  // Add state to track animation state
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Check if the touch event is in the swipe handle area or header
  const isTouchInSwipeArea = (e) => {
    if (!sheetRef.current) return false;

    // Get the swipe handle and header elements
    const swipeHandle = sheetRef.current.querySelector('.swipe-handle-area');
    const header = sheetRef.current.querySelector('.bottom-sheet-header');

    if (!swipeHandle && !header) return false;

    // Get the touch coordinates
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;

    // Check if the touch is in the swipe handle area
    if (swipeHandle) {
      const swipeRect = swipeHandle.getBoundingClientRect();
      if (
        touchY >= swipeRect.top &&
        touchY <= swipeRect.bottom &&
        touchX >= swipeRect.left &&
        touchX <= swipeRect.right
      ) {
        return true;
      }
    }

    // Check if the touch is in the header area
    if (header) {
      const headerRect = header.getBoundingClientRect();
      if (
        touchY >= headerRect.top &&
        touchY <= headerRect.bottom &&
        touchX >= headerRect.left &&
        touchX <= headerRect.right
      ) {
        return true;
      }
    }

    return false;
  };

  // Handle swipe down to close
  const handleTouchStart = (e) => {
    // Don't handle touch events if we're processing an action or animation
    if (isProcessingAction || !allowClosing || isAnimating) {
      return;
    }

    // Only handle touches in the swipe handle area or header
    if (!isTouchInSwipeArea(e)) {
      return;
    }

    try {
      // Store the initial touch position and time
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      startTime.current = Date.now();
      isSwiping.current = true;

      // Reset velocity
      swipeVelocity.current = 0;

      // Set initial transition to none for immediate response
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'none';
        // Add is-swiping class to prevent content selection during swipe
        sheetRef.current.classList.add('is-swiping');
      }
    } catch (error) {
      console.error('Error in handleTouchStart:', error);
      isSwiping.current = false;
    }
  };

  const handleTouchMove = (e) => {
    // Only handle if we're in a swiping state
    if (!isSwiping.current || !sheetRef.current) {
      return;
    }

    try {
      // Update current touch position
      const prevY = currentY.current;
      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      // Calculate velocity (pixels per millisecond)
      const deltaTime = Date.now() - startTime.current;
      if (deltaTime > 0) {
        const instantVelocity = (currentY.current - prevY) / deltaTime;
        // Smooth velocity with exponential moving average
        swipeVelocity.current = swipeVelocity.current * 0.7 + instantVelocity * 0.3;
      }

      // Only handle downward swipes
      if (deltaY > 0) {
        // Prevent default to stop scrolling
        e.preventDefault();
        e.stopPropagation();

        // Apply transform with easing
        let transformY = deltaY;

        // Add resistance as user drags down further (cubic easing)
        // This creates a more natural feel with increasing resistance
        transformY = Math.pow(deltaY, 0.8);

        // Limit maximum drag distance
        const maxDrag = window.innerHeight * 0.4;
        if (transformY > maxDrag) {
          transformY = maxDrag + (transformY - maxDrag) * 0.2;
        }

        // Apply the transform with hardware acceleration
        // Using requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
          if (sheetRef.current && isSwiping.current) {
            sheetRef.current.style.transform = `translate3d(0, ${transformY}px, 0)`;
          }
        });
      }
    } catch (error) {
      console.error('Error in handleTouchMove:', error);

      // Reset transform in case of error
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
        sheetRef.current.classList.remove('is-swiping');
      }

      isSwiping.current = false;
    }
  };

  const handleTouchEnd = () => {
    // Only handle if we're in a swiping state
    if (!isSwiping.current || !sheetRef.current) {
      isSwiping.current = false;
      return;
    }

    try {
      setIsAnimating(true);

      // Remove is-swiping class
      if (sheetRef.current) {
        sheetRef.current.classList.remove('is-swiping');
      }

      const deltaY = currentY.current - startY.current;
      const velocity = swipeVelocity.current;

      // Velocity threshold for quick swipes (pixels per millisecond)
      const VELOCITY_THRESHOLD = 0.5;

      // Distance threshold for slower swipes
      const DISTANCE_THRESHOLD = window.innerHeight * 0.15; // 15% of screen height

      // Determine if we should close based on velocity or distance
      const shouldClose =
        (velocity > VELOCITY_THRESHOLD) || // Fast swipe
        (deltaY > DISTANCE_THRESHOLD);     // Sufficient distance

      if (shouldClose) {
        // Calculate animation duration based on velocity
        const baseDuration = 300; // Base duration in ms
        const velocityFactor = Math.abs(velocity) > 0 ? Math.min(1, 1 / Math.abs(velocity) * 0.5) : 1;
        const duration = Math.max(150, Math.min(300, baseDuration * velocityFactor));

        // Use a natural easing curve
        sheetRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
        sheetRef.current.style.transform = `translate3d(0, ${window.innerHeight}px, 0)`;

        // Delay closing to allow animation to complete
        setTimeout(() => {
          // Log for debugging
          console.log('Swipe down detected, closing bottom sheet');
          onClose();

          // Reset the sheet position after closing
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'none';
            sheetRef.current.style.transform = '';
          }

          setIsAnimating(false);
        }, duration);
      } else {
        // Return to original position with a bounce effect
        sheetRef.current.style.transition = 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        sheetRef.current.style.transform = 'translate3d(0, 0, 0)';

        // Reset the transition after animation
        setTimeout(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
          }
          setIsAnimating(false);
        }, 300);
      }
    } catch (error) {
      console.error('Error in handleTouchEnd:', error);

      // Reset transform in case of error
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      setIsAnimating(false);
    } finally {
      // Always reset touch state
      isSwiping.current = false;
      startY.current = 0;
      currentY.current = 0;
      startTime.current = 0;
      swipeVelocity.current = 0;
    }
  };

  // Handle touch cancel
  const handleTouchCancel = () => {
    // Reset to original position
    if (sheetRef.current && isSwiping.current) {
      // Remove is-swiping class
      sheetRef.current.classList.remove('is-swiping');

      // Animate back to original position with bounce effect
      sheetRef.current.style.transition = 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      sheetRef.current.style.transform = 'translate3d(0, 0, 0)';

      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        }
        setIsAnimating(false);
      }, 300);
    }

    // Reset state
    isSwiping.current = false;
    startY.current = 0;
    currentY.current = 0;
    startTime.current = 0;
    swipeVelocity.current = 0;
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
      >
        <SwipeHandleArea
          className="swipe-handle-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <SwipeIndicator />
        </SwipeHandleArea>

        <BottomSheetHeader
          className="bottom-sheet-header"
          ref={headerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <BottomSheetTitle>{title}</BottomSheetTitle>
          <CloseButton
            onClick={() => {
              // Always attempt to close the sheet when the X button is clicked
              onClose();
              console.log('X button clicked, closing bottom sheet');
            }}
            aria-label="Close"
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
