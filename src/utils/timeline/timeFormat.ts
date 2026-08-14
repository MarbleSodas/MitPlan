/** Formats timeline seconds after rounding to the nearest millisecond. */
export function formatTimelineTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const totalMilliseconds = Math.round(safeSeconds * 1000);
  const minutes = Math.floor(totalMilliseconds / 60_000);
  const secondsWithinMinute = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${minutes}:${String(secondsWithinMinute).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function formatTimelineDamage(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  const numericValue = typeof value === 'number'
    ? value
    : Number(String(value).replaceAll(',', '').trim());

  if (!Number.isFinite(numericValue)) return String(value);
  return Math.round(numericValue).toLocaleString();
}
