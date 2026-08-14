import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  className?: string;
};

const toneClasses = {
  neutral: 'border-border bg-background text-foreground',
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
} as const;

export function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
