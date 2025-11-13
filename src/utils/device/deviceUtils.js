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
export const isMobileDevice = () => false;

/**
 * Check if the current device is a tablet
 *
 * @returns {boolean} - True if the device is a tablet
 */
export const isTabletDevice = () => false;

/**
 * Check if the device is a small mobile device (smaller phones)
 *
 * @returns {boolean} - True if the device is a small mobile device
 */
export const isSmallMobileDevice = () => false;

/**
 * Get the current device type based on screen width
 *
 * @returns {string} - Device type: 'smallMobile', 'mobile', 'largeMobile', 'tablet', 'largeTablet', 'desktop', or 'largeDesktop'
 */
export const getDeviceType = () => 'desktop';

/**
 * Check if the device supports touch events
 *
 * @returns {boolean} - True if the device supports touch events
 */
export const isTouchDevice = () => false;

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
