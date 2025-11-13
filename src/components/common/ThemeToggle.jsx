import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = ({ className, showLabel = false }) => {
  const { isDarkMode, toggleTheme, theme } = useTheme();


  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center h-9 w-9 rounded-lg font-semibold cursor-pointer transition-all relative overflow-hidden focus:outline-none focus:ring-2 text-blue-500 hover:text-white hover:bg-blue-500` + (className ? ` ${className}` : '')}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div
        className={`flex items-center justify-center transition-all ${!isDarkMode ? 'scale-100 rotate-0 opacity-100 static' : 'scale-0 rotate-180 opacity-0 absolute'}`}
      >
        <Sun size={20} />
      </div>
      <div
        className={`flex items-center justify-center transition-all ${isDarkMode ? 'scale-100 rotate-0 opacity-100 static' : 'scale-0 rotate-180 opacity-0 absolute'}`}
      >
        <Moon size={20} />
      </div>
      {showLabel && (
        <span className="ml-2 text-sm">
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
