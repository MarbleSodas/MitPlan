import React, { createContext, useState, useContext, useEffect } from 'react';

// Define light and dark themes
const lightTheme = {
  colors: {
    primary: '#6366f1', // Modern indigo
    primaryDark: '#4f46e5', // Darker indigo for gradients
    primaryLight: '#818cf8', // Lighter indigo
    accent: '#8b5cf6', // Purple accent
    secondary: '#ffffff',
    background: '#f3f4f6', // Softer background
    backgroundGradient: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
    cardBackground: '#ffffff',
    text: '#1f2937', // Darker, more readable
    textSecondary: '#374151', // Darker gray for better visibility
    lightText: '#9ca3af',
    buttonText: '#ffffff',
    border: '#d1d5db', // Softer border
    borderLight: '#e5e7eb',
    hover: '#e0e7ff', // Indigo tint
    critical: '#ff0000',
    high: '#ff9900',
    medium: '#ffcc00',
    low: '#99cc00',
    barrier: '#ffcc00', // Yellow color for barriers
    healing: '#00ff88', // Bright green for healing recovery
    success: '#4caf50', // Green for healthy health bars
    warning: '#ff9900', // Orange for moderate health
    error: '#ef4444', // Bright red for error states
    errorHover: '#dc2626' // Darker red for hover states
  },
  breakpoints: {
    smallMobile: '320px',  // Small smartphones
    mobile: '480px',       // Regular smartphones
    largeMobile: '640px',  // Large smartphones
    tablet: '768px',       // Small tablets
    largeTablet: '992px',  // Large tablets
    desktop: '1200px',     // Desktops
    largeDesktop: '1440px' // Large desktops
  },
  spacing: {
    xsmall: '4px',
    small: '8px',
    medium: '12px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px',
    responsive: {
      small: 'clamp(4px, 1vw, 8px)',
      medium: 'clamp(8px, 2vw, 16px)',
      large: 'clamp(12px, 3vw, 24px)',
      xlarge: 'clamp(16px, 4vw, 32px)'
    }
  },
  fontSizes: {
    xsmall: '10px',
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '20px',
    xxlarge: '24px',
    xxxlarge: '32px',
    responsive: {
      small: 'clamp(10px, 0.8rem, 12px)',
      medium: 'clamp(12px, 0.9rem, 14px)',
      large: 'clamp(14px, 1rem, 16px)',
      xlarge: 'clamp(16px, 1.25rem, 20px)',
      xxlarge: 'clamp(20px, 1.5rem, 24px)',
      xxxlarge: 'clamp(24px, 2rem, 32px)'
    }
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    xlarge: '12px',
    pill: '9999px',
    responsive: {
      small: 'clamp(2px, 0.5vw, 4px)',
      medium: 'clamp(4px, 0.75vw, 6px)',
      large: 'clamp(6px, 1vw, 8px)',
      xlarge: 'clamp(8px, 1.5vw, 12px)'
    }
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xlarge: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    focus: '0 0 0 3px rgba(99, 102, 241, 0.4)',
    hover: '0 10px 20px rgba(99, 102, 241, 0.15)',
    active: '0 1px 2px rgba(0, 0, 0, 0.2) inset',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)'
  },
  mode: 'light'
};

const darkTheme = {
  colors: {
    primary: '#818cf8', // Lighter indigo for dark mode
    primaryDark: '#6366f1',
    primaryLight: '#a5b4fc',
    accent: '#a78bfa', // Lighter purple accent
    secondary: '#1e2a38',
    background: '#0f172a', // Deeper, richer dark
    backgroundGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    cardBackground: '#1e293b', // Slate background
    text: '#f1f5f9', // Softer white
    textSecondary: '#cbd5e1', // Lighter gray
    lightText: '#94a3b8',
    buttonText: '#ffffff',
    border: '#334155', // Subtle border
    borderLight: '#475569',
    hover: '#312e81', // Deep indigo hover
    critical: '#ff6666', // Brighter for better visibility
    high: '#ffbb44', // Brighter for better visibility
    medium: '#ffee44', // Brighter for better visibility
    low: '#bbee44',  // Brighter for better visibility
    barrier: '#ffdd44', // Brighter yellow for barriers in dark mode
    healing: '#44ff99', // Brighter green for healing recovery in dark mode
    success: '#66bb66', // Brighter green for healthy health bars
    warning: '#ffbb44', // Brighter orange for moderate health
    error: '#ef4444', // Bright red for error states
    errorHover: '#dc2626' // Darker red for hover states
  },
  breakpoints: {
    smallMobile: '320px',  // Small smartphones
    mobile: '480px',       // Regular smartphones
    largeMobile: '640px',  // Large smartphones
    tablet: '768px',       // Small tablets
    largeTablet: '992px',  // Large tablets
    desktop: '1200px',     // Desktops
    largeDesktop: '1440px' // Large desktops
  },
  spacing: {
    xsmall: '4px',
    small: '8px',
    medium: '12px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px',
    responsive: {
      small: 'clamp(4px, 1vw, 8px)',
      medium: 'clamp(8px, 2vw, 16px)',
      large: 'clamp(12px, 3vw, 24px)',
      xlarge: 'clamp(16px, 4vw, 32px)'
    }
  },
  fontSizes: {
    xsmall: '10px',
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '20px',
    xxlarge: '24px',
    xxxlarge: '32px',
    responsive: {
      small: 'clamp(10px, 0.8rem, 12px)',
      medium: 'clamp(12px, 0.9rem, 14px)',
      large: 'clamp(14px, 1rem, 16px)',
      xlarge: 'clamp(16px, 1.25rem, 20px)',
      xxlarge: 'clamp(20px, 1.5rem, 24px)',
      xxxlarge: 'clamp(24px, 2rem, 32px)'
    }
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    xlarge: '12px',
    pill: '9999px',
    responsive: {
      small: 'clamp(2px, 0.5vw, 4px)',
      medium: 'clamp(4px, 0.75vw, 6px)',
      large: 'clamp(6px, 1vw, 8px)',
      xlarge: 'clamp(8px, 1.5vw, 12px)'
    }
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xlarge: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    focus: '0 0 0 3px rgba(129, 140, 248, 0.5)',
    hover: '0 10px 20px rgba(129, 140, 248, 0.2)',
    active: '0 1px 2px rgba(0, 0, 0, 0.4) inset',
    glow: '0 0 20px rgba(129, 140, 248, 0.4)'
  },
  mode: 'dark'
};

// Create the context
const ThemeContext = createContext();

// Apply theme values as CSS variables on :root for Tailwind arbitrary-var usage
const applyThemeVariables = (themeObj) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const set = (name, value) => root.style.setProperty(name, String(value));

  // Colors
  const c = themeObj.colors || {};
  Object.entries(c).forEach(([k, v]) => set(`--color-${k}`, v));

  // Spacing
  const s = themeObj.spacing || {};
  Object.entries(s).forEach(([k, v]) => {
    if (typeof v === 'object' && v) {
      Object.entries(v).forEach(([rk, rv]) => set(`--space-r-${rk}`, rv));
    } else {
      set(`--space-${k}`, v);
    }
  });

  // Font sizes
  const f = themeObj.fontSizes || {};
  Object.entries(f).forEach(([k, v]) => {
    if (typeof v === 'object' && v) {
      Object.entries(v).forEach(([rk, rv]) => set(`--fs-r-${rk}`, rv));
    } else {
      set(`--fs-${k}`, v);
    }
  });

  // Border radius
  const r = themeObj.borderRadius || {};
  Object.entries(r).forEach(([k, v]) => {
    if (typeof v === 'object' && v) {
      Object.entries(v).forEach(([rk, rv]) => set(`--radius-r-${rk}`, rv));
    } else {
      set(`--radius-${k}`, v);
    }
  });

  // Derived tokens used by components
  // Selected card background highlight
  const selectBg = themeObj.mode === 'dark' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(99, 102, 241, 0.08)';
  set('--select-bg', selectBg);

  // Gradient backgrounds
  set('--gradient-primary', themeObj.mode === 'dark'
    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)');
  set('--gradient-mesh', themeObj.mode === 'dark'
    ? 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.2) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.2) 0px, transparent 50%)'
    : 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%)');
};

// Create a provider component
export const ThemeProvider = ({ children }) => {
  // Initialize theme state from localStorage or system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a preference stored in localStorage
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference !== null) {
      return savedPreference === 'true';
    }
    // Otherwise check for system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    const themeObj = isDarkMode ? darkTheme : lightTheme;
    
    localStorage.setItem('darkMode', isDarkMode.toString());
    
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    
    applyThemeVariables(themeObj);
  }, [isDarkMode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if user hasn't set a preference
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };

    // Add listener for theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Create the context value
  const contextValue = {
    isDarkMode,
    toggleTheme,
    theme: isDarkMode ? darkTheme : lightTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook for using the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
