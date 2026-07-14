/**
 * Theme toggle. Animated pill switch between light / dark.
 * Uses a rotating icon transition instead of the old dropdown menu.
 */
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'relative size-8 overflow-hidden rounded-full transition-colors',
        'hover:bg-muted',
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="relative grid size-full place-items-center">
        <Sun
          className={cn(
            'size-4 transition-all duration-500 ease-in-out',
            isDark
              ? 'opacity-0 rotate-90 scale-0'
              : 'opacity-100 rotate-0 scale-100',
          )}
        />
        <Moon
          className={cn(
            'absolute size-4 transition-all duration-500 ease-in-out',
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0',
          )}
        />
      </span>
    </Button>
  );
};
