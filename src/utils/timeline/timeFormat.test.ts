import { describe, expect, it } from 'vitest';
import { formatTimelineDamage, formatTimelineTime } from './timeFormat';

describe('timeline formatting', () => {
  it('rounds timeline values to milliseconds without floating-point artifacts', () => {
    expect(formatTimelineTime(89.40300000000002)).toBe('1:29.403');
    expect(formatTimelineTime(60)).toBe('1:00.000');
  });

  it('formats damage values with locale separators', () => {
    expect(formatTimelineDamage(10000)).toBe('10,000');
    expect(formatTimelineDamage('12500')).toBe('12,500');
    expect(formatTimelineDamage('unknown')).toBe('unknown');
  });
});
