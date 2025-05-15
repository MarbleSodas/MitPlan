/**
 * Utility functions for device detection and responsive design
 */

// Breakpoint values (should match ThemeContext.jsx)
const BREAKPOINTS = {
  smallMobile: 320,
  mobile: 480,
  largeMobile: 640,
  tablet: 768,
  largeTablet: 992,
  desktop: 1200,
  largeDesktop: 1440
};

/**
 * Check if the current device is a mobile device
 * This uses both screen width and user agent detection for better accuracy
 *
 * @returns {boolean} - True if the device is a mobile device
 */
export const isMobileDevice = () => {
  // Check screen width (anything below tablet is considered mobile)
  const isMobileWidth = window.innerWidth < BREAKPOINTS.tablet;

  // Check user agent for mobile devices
  const isMobileUserAgent = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Return true if either condition is met
  return isMobileWidth || isMobileUserAgent;
};

/**
 * Check if the current device is a tablet
 *
 * @returns {boolean} - True if the device is a tablet
 */
export const isTabletDevice = () => {
  // Check if screen width is in tablet range
  const isTabletWidth = window.innerWidth >= BREAKPOINTS.tablet && window.innerWidth < BREAKPOINTS.desktop;

  // Check user agent for tablets (iPad is the most common)
  const isTabletUserAgent = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);

  // Return true if either condition is met
  return isTabletWidth || isTabletUserAgent;
};

/**
 * Check if the device is a small mobile device (smaller phones)
 *
 * @returns {boolean} - True if the device is a small mobile device
 */
export const isSmallMobileDevice = () => {
  return window.innerWidth < BREAKPOINTS.mobile;
};

/**
 * Get the current device type based on screen width
 *
 * @returns {string} - Device type: 'smallMobile', 'mobile', 'largeMobile', 'tablet', 'largeTablet', 'desktop', or 'largeDesktop'
 */
export const getDeviceType = () => {
  const width = window.innerWidth;

  if (width < BREAKPOINTS.mobile) return 'smallMobile';
  if (width < BREAKPOINTS.largeMobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'largeMobile';
  if (width < BREAKPOINTS.largeTablet) return 'tablet';
  if (width < BREAKPOINTS.desktop) return 'largeTablet';
  if (width < BREAKPOINTS.largeDesktop) return 'desktop';
  return 'largeDesktop';
};

/**
 * Check if the device supports touch events
 *
 * @returns {boolean} - True if the device supports touch events
 */
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Check if the device is in portrait orientation
 *
 * @returns {boolean} - True if the device is in portrait orientation
 */
export const isPortraitOrientation = () => {
  return window.innerHeight > window.innerWidth;
};

/**
 * Check if the device is in landscape orientation
 *
 * @returns {boolean} - True if the device is in landscape orientation
 */
export const isLandscapeOrientation = () => {
  return window.innerWidth > window.innerHeight;
};

/**
 * Get the current viewport dimensions
 *
 * @returns {Object} - Object with width and height properties
 */
export const getViewportDimensions = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

// Export all functions as default object for easier imports
export default {
  isMobileDevice,
  isTabletDevice,
  isSmallMobileDevice,
  getDeviceType,
  isTouchDevice,
  isPortraitOrientation,
  isLandscapeOrientation,
  getViewportDimensions,
  BREAKPOINTS
};
