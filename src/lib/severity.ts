/**
 * Single source of truth for severity (importance) → color token mapping.
 * Used by timeline markers, action cards, and the boss-action library so the
 * same semantic level is always expressed with the same token classes.
 *
 * Scale: critical → destructive, high → warning, medium → info, low → success.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_STYLES: Record<
  Severity,
  { dot: string; chip: string; border: string; background: string; text: string; label: string }
> = {
  critical: {
    dot: 'bg-destructive',
    chip: 'border-destructive/20 bg-destructive/10 text-destructive',
    border: 'border-l-destructive',
    background: 'bg-destructive/5',
    text: 'text-destructive',
    label: 'Critical',
  },
  high: {
    dot: 'bg-warning',
    chip: 'border-warning/20 bg-warning/10 text-warning',
    border: 'border-l-warning',
    background: 'bg-warning/5',
    text: 'text-warning',
    label: 'High',
  },
  medium: {
    dot: 'bg-info',
    chip: 'border-info/20 bg-info/10 text-info',
    border: 'border-l-info',
    background: '',
    text: 'text-info',
    label: 'Medium',
  },
  low: {
    dot: 'bg-success',
    chip: 'border-success/20 bg-success/10 text-success',
    border: 'border-l-success',
    background: '',
    text: 'text-success',
    label: 'Low',
  },
};

export const getSeverityStyle = (severity: Severity): (typeof SEVERITY_STYLES)[Severity] =>
  SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.medium;
