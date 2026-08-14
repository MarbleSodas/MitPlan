import { useRef } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  icon?: ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
};

type ActionMenuProps = {
  label?: string;
  items: ActionMenuItem[];
  className?: string;
  children?: ReactNode;
};

/**
 * Keeps secondary card actions discoverable without competing with the
 * primary action. Native details/summary gives us keyboard and screen-reader
 * support without introducing another menu dependency into the app shell.
 */
export function ActionMenu({ label = 'More actions', items, className, children }: ActionMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className={cn('relative', className)}>
      <summary
        aria-label={label}
        className="flex h-11 w-11 list-none items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        {children ?? <MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
      </summary>
      <div
        role="menu"
        aria-label={label}
        className="absolute right-0 z-30 mt-2 min-w-44 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
      >
        {items.map(({ label: itemLabel, onSelect, icon: Icon, destructive, disabled }) => (
          <Button
            key={itemLabel}
            type="button"
            role="menuitem"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onSelect();
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className={cn(
              'w-full justify-start gap-2 px-2.5',
              destructive && 'mt-1 border-t border-border pt-2 text-destructive hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            {itemLabel}
          </Button>
        ))}
      </div>
    </details>
  );
}

export default ActionMenu;
