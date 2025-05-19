import { useState, useEffect } from 'react';
import { isMobileDevice } from '../utils';

/**
 * Hook to detect if the current device is mobile
 * @returns {boolean} isMobile - Whether the current device is mobile
 */
export const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Initial check
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    // Throttle function to limit execution during resize
    const throttle = (func, delay) => {
      let lastCall = 0;
      return (...args) => {
        const now = new Date().getTime();
        if (now - lastCall < delay) {
          return;
        }
        lastCall = now;
        return func(...args);
      };
    };
    
    // Create throttled resize handler
    const resizeHandler = throttle(checkMobile, 250);
    
    // Initial check
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', resizeHandler);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  return isMobile;
};

export default useDeviceDetection;