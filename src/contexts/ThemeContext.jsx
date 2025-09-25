import React, { createContext, useState, useContext, useEffect } from 'react';

// Define light and dark themes
const lightTheme = {
  colors: {
    primary: '#3399ff',
    secondary: '#ffffff',
    background: '#f5f5f5',
    cardBackground: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    lightText: '#666666',
    buttonText: '#ffffff',
    border: '#dddddd',
    hover: '#e6f7ff',
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
    medium: '0 2px 4px rgba(0, 0, 0, 0.1)',
    large: '0 4px 8px rgba(0, 0, 0, 0.1)',
    xlarge: '0 8px 16px rgba(0, 0, 0, 0.1)',
    focus: '0 0 0 3px rgba(51, 153, 255, 0.5)',
    hover: '0 2px 8px rgba(0, 0, 0, 0.15)',
    active: '0 1px 2px rgba(0, 0, 0, 0.2) inset'
  },
  mode: 'light'
};

const darkTheme = {
  colors: {
    primary: '#3399ff',
    secondary: '#1e2a38',
    background: '#121212',
    cardBackground: '#1e1e1e',
    text: '#f5f5f5',
    textSecondary: '#cccccc',
    lightText: '#cccccc', // Improved contrast from #aaaaaa
    buttonText: '#ffffff',
    border: '#444444',
    hover: '#2a3a4a',
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
    medium: '0 2px 4px rgba(0, 0, 0, 0.3)',
    large: '0 4px 8px rgba(0, 0, 0, 0.3)',
    xlarge: '0 8px 16px rgba(0, 0, 0, 0.3)',
    focus: '0 0 0 3px rgba(51, 153, 255, 0.6)',
    hover: '0 2px 8px rgba(0, 0, 0, 0.3)',
    active: '0 1px 2px rgba(0, 0, 0, 0.4) inset'
  },
  mode: 'dark'
};

// Create the context
const ThemeContext = createContext();

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

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('darkMode', newMode.toString());
      const root = document.documentElement;
      if (newMode) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
      return newMode;
    });
  };

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
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
