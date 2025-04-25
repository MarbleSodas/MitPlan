/**
 * Utility functions for device detection and responsive design
 */

/**
 * Check if the current device is a mobile device
 * This uses both screen width and user agent detection for better accuracy
 * 
 * @returns {boolean} - True if the device is a mobile device
 */
export const isMobileDevice = () => {
  // Check screen width
  const isMobileWidth = window.innerWidth <= 768;
  
  // Check user agent for mobile devices
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Return true if either condition is met
  return isMobileWidth || isMobileUserAgent;
};

/**
 * Check if the device supports touch events
 * 
 * @returns {boolean} - True if the device supports touch events
 */
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Create an index file for easier imports
export default {
  isMobileDevice,
  isTouchDevice
};
