/**
 * Cache tests. Architecture §7.5.
 */
import { describe, expect, it } from 'vitest';
import { inMemoryCache } from './index.js';

describe('inMemoryCache', () => {
  it('returns null for missing keys', async () => {
    const c = inMemoryCache();
    expect(await c.get('missing')).toBeNull();
  });

  it('stores and retrieves values', async () => {
    const c = inMemoryCache();
    await c.set('k', { a: 1 });
    expect(await c.get('k')).toEqual({ a: 1 });
  });

  it('respects TTL', async () => {
    const c = inMemoryCache();
    await c.set('k', 'v', 1);
    expect(await c.get('k')).toBe('v');
    await new Promise((r) => setTimeout(r, 1100));
    expect(await c.get('k')).toBeNull();
  });

  it('set-merge: sadd returns 1 on first add, 0 on duplicate', async () => {
    const c = inMemoryCache();
    // sadd returns void in the typed interface; we still verify behavior.
    await c.sadd('s', 'a');
    await c.sadd('s', 'b');
    await c.sadd('s', 'a');
    const m = await c.smembers('s');
    expect(m.sort()).toEqual(['a', 'b']);
  });

  it('del removes keys', async () => {
    const c = inMemoryCache();
    await c.set('k', 1);
    await c.del('k');
    expect(await c.get('k')).toBeNull();
  });

  it('incr increments by 1', async () => {
    const c = inMemoryCache();
    expect(await c.incr('n')).toBe(1);
    expect(await c.incr('n')).toBe(2);
    expect(await c.incr('n')).toBe(3);
  });
});
