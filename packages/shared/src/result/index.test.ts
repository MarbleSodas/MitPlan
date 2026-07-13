import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ok, err, isOk, isErr, map, mapErr, andThen, unwrap, unwrapOr } from './index.js';

describe('Result', () => {
  it('ok and isOk / isErr', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
  });

  it('err and isOk / isErr', () => {
    const r = err('boom');
    expect(isOk(r)).toBe(false);
    expect(isErr(r)).toBe(true);
  });

  it('map on ok', () => {
    expect(map(ok(2), (x) => x * 3)).toEqual({ ok: true, value: 6 });
  });

  it('map on err', () => {
    const e = err('a');
    expect(map(e, (x: number) => x * 3)).toEqual({ ok: false, error: 'a' });
  });

  it('mapErr on err', () => {
    expect(mapErr(err('a'), (e) => e.toUpperCase())).toEqual({ ok: false, error: 'A' });
  });

  it('andThen on ok', () => {
    const r = andThen(ok(2), (x) => (x > 0 ? ok(x * 10) : err('neg')));
    expect(r).toEqual({ ok: true, value: 20 });
  });

  it('andThen on err short-circuits', () => {
    const r = andThen(err('start'), () => ok(99));
    expect(r).toEqual({ ok: false, error: 'start' });
  });

  it('unwrap on ok', () => {
    expect(unwrap(ok(7))).toBe(7);
  });

  it('unwrap on err throws', () => {
    expect(() => unwrap(err('x'))).toThrow();
  });

  it('unwrapOr returns value on ok, fallback on err', () => {
    expect(unwrapOr(ok(1), 99)).toBe(1);
    expect(unwrapOr(err('x'), 99)).toBe(99);
  });

  it('property: map(ok(x), f) === ok(f(x))', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const r = map(ok(n), (x) => x + 1);
        return isOk(r) && r.value === n + 1;
      }),
    );
  });

  it('property: mapErr never changes ok value', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const r = mapErr(ok(n), () => 'transformed');
        return isOk(r) && r.value === n;
      }),
    );
  });
});
