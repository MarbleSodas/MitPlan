import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const ThemeToggle = ({ className, showLabel = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="icon"
      className={cn("relative overflow-hidden", className)}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      style={{ border: '2px solid var(--primary)' }}
    >
      <div
        className={cn(
          "flex items-center justify-center transition-all",
          !isDarkMode ? 'scale-100 rotate-0 opacity-100 static' : 'scale-0 rotate-180 opacity-0 absolute'
        )}
      >
        <Sun size={20} />
      </div>
      <div
        className={cn(
          "flex items-center justify-center transition-all",
          isDarkMode ? 'scale-100 rotate-0 opacity-100 static' : 'scale-0 rotate-180 opacity-0 absolute'
        )}
      >
        <Moon size={20} />
      </div>
      {showLabel && (
        <span className="ml-2 text-sm">
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </Button>
  );
};

export default ThemeToggle;
