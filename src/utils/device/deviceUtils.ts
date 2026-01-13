type DeviceType = 'smallMobile' | 'mobile' | 'largeMobile' | 'tablet' | 'largeTablet' | 'desktop' | 'largeDesktop';

interface ViewportDimensions {
  width: number;
  height: number;
}

const BREAKPOINTS = {
  smallMobile: 320,
  mobile: 480,
  largeMobile: 640,
  tablet: 768,
  largeTablet: 992,
  desktop: 1200,
  largeDesktop: 1440
} as const;

export const isMobileDevice = (): boolean => false;

export const isTabletDevice = (): boolean => false;

export const isSmallMobileDevice = (): boolean => false;

export const getDeviceType = (): DeviceType => 'desktop';

export const isTouchDevice = (): boolean => false;

export const isPortraitOrientation = (): boolean => {
  return window.innerHeight > window.innerWidth;
};

export const isLandscapeOrientation = (): boolean => {
  return window.innerWidth > window.innerHeight;
};

export const getViewportDimensions = (): ViewportDimensions => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

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
