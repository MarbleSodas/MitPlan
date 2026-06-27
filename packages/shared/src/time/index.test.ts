import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatTimeline, clamp, MS_PER_MINUTE, MS_PER_SECOND } from './index.js';

describe('time', () => {
  it('formatTimeline basic', () => {
    expect(formatTimeline(0)).toBe('0:00.00');
    expect(formatTimeline(MS_PER_SECOND * 30)).toBe('0:30.00');
    expect(formatTimeline(MS_PER_MINUTE + MS_PER_SECOND * 5)).toBe('1:05.00');
    expect(formatTimeline(MS_PER_MINUTE * 2 + MS_PER_SECOND * 13 + 420)).toBe('2:13.42');
  });

  it('formatTimeline handles negatives', () => {
    expect(formatTimeline(-1000)).toBe('-0:01.00');
  });

  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('property: clamp(n, lo, hi) is in [lo, hi]', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), fc.integer(), (n, lo, hi) => {
        const [min, max] = lo <= hi ? [lo, hi] : [hi, lo];
        const c = clamp(n, min, max);
        return c >= min && c <= max;
      }),
    );
  });
});
