import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

// Define light and dark themes
const lightTheme = {
  colors: {
    primary: '#3399ff',
    secondary: '#ffffff',
    background: '#f5f5f5',
    cardBackground: '#ffffff',
    text: '#333333',
    lightText: '#666666',
    border: '#dddddd',
    critical: '#ff0000',
    high: '#ff9900',
    medium: '#ffcc00',
    low: '#99cc00'
  },
  breakpoints: {
    mobile: '768px',
    tablet: '992px',
    desktop: '1200px'
  },
  spacing: {
    small: '5px',
    medium: '10px',
    large: '20px',
    xlarge: '30px'
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px'
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: '0 2px 4px rgba(0, 0, 0, 0.1)',
    large: '0 4px 8px rgba(0, 0, 0, 0.1)'
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
    lightText: '#cccccc', // Improved contrast from #aaaaaa
    border: '#444444',
    critical: '#ff6666', // Brighter for better visibility
    high: '#ffbb44', // Brighter for better visibility
    medium: '#ffee44', // Brighter for better visibility
    low: '#bbee44'  // Brighter for better visibility
  },
  breakpoints: {
    mobile: '768px',
    tablet: '992px',
    desktop: '1200px'
  },
  spacing: {
    small: '5px',
    medium: '10px',
    large: '20px',
    xlarge: '30px'
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px'
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.3)',
    medium: '0 2px 4px rgba(0, 0, 0, 0.3)',
    large: '0 4px 8px rgba(0, 0, 0, 0.3)'
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
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
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
      <StyledThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        {children}
      </StyledThemeProvider>
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
