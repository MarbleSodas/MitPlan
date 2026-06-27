/**
 * Time utilities. All time in domain code is `number` milliseconds since
 * the encounter start (t=0). The only place that converts to wall-clock
 * time is the UI. See architecture §8.2.
 */

export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;

/** Format a duration in milliseconds as `M:SS.cs` (minutes:seconds.centiseconds). */
export const formatTimeline = (ms: number): string => {
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((abs % MS_PER_SECOND) / 10);
  return `${sign}${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};

/** Clamp a value to a [min, max] range. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
