/**
 * Tests for the web-layer mit stack evaluator.
 * Covers: residual stacks, duration overlap, target filtering,
 * invulnerability, cooldown conflicts, malformed values, multi-hit
 * events, and shield/heal metadata.
 */
import { describe, expect, it } from 'vitest';
import type { AbilityInfo } from './data-source';
import { computeResidualMultiplier, detectDoubleBookings, evaluateEventMit } from './mit-evaluator';
import type { WebAssignment } from './mit-evaluator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAbility = (overrides: Partial<AbilityInfo> & { id: string }): AbilityInfo => ({
  id: overrides.id,
  jobId: '50000000-0000-0000-0000-000000000001',
  jobAbbrev: 'PLD',
  abilityId: overrides.id,
  mode: 'CURRENT',
  name: overrides.name ?? 'Test Ability',
  description: null,
  effectPct: overrides.effectPct ?? null,
  recastS: overrides.recastS ?? null,
  durationS: overrides.durationS ?? null,
  isInvuln: overrides.isInvuln ?? false,
  isHeal: overrides.isHeal ?? false,
  isShield: overrides.isShield ?? false,
  category: overrides.category ?? 'tank-cd',
  damageType: overrides.damageType ?? null,
  target: overrides.target ?? null,
  charges: overrides.charges ?? null,
  effectiveFrom: '7.0',
  effectiveTo: null,
});

const assign = (id: string, abilityId: string, eventId: string): WebAssignment => ({
  id,
  abilityId,
  eventId,
  targetUserId: null,
});

// ---------------------------------------------------------------------------
// computeResidualMultiplier
// ---------------------------------------------------------------------------

describe('computeResidualMultiplier', () => {
  it('returns 1.0 for empty input', () => {
    expect(computeResidualMultiplier([])).toBe(1.0);
  });

  it('computes single ability correctly', () => {
    expect(computeResidualMultiplier([20])).toBeCloseTo(0.8);
  });

  it('multiplies multiple ability percentages', () => {
    expect(computeResidualMultiplier([20, 10])).toBeCloseTo(0.72);
    expect(computeResidualMultiplier([30, 10, 10])).toBeCloseTo(0.567);
  });

  it('clamps out-of-range values', () => {
    expect(computeResidualMultiplier([-5])).toBeCloseTo(1.0);
    expect(computeResidualMultiplier([150])).toBeCloseTo(0.0);
    expect(computeResidualMultiplier([-10, 20])).toBeCloseTo(0.8);
  });

  it('handles 100% mit (invuln simulation)', () => {
    expect(computeResidualMultiplier([100])).toBe(0);
    expect(computeResidualMultiplier([100, 20])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// evaluateEventMit — legacy path (no context)
// ---------------------------------------------------------------------------

describe('evaluateEventMit (legacy path, no context)', () => {
  it('returns 100% with no assignments', () => {
    const result = evaluateEventMit('evt-1', [], new Map());
    expect(result.residualPct).toBe(100);
    expect(result.residualMultiplier).toBe(1);
    expect(result.entries).toHaveLength(0);
    expect(result.hasOverlap).toBe(false);
  });

  it('filters assignments by eventId', () => {
    const ramp = makeAbility({ id: 'ramp', effectPct: 20 });
    const abilities = new Map([['ramp', ramp]]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'ramp', 'evt-2')];
    const result = evaluateEventMit('evt-1', assignments, abilities);
    expect(result.entries).toHaveLength(1);
    expect(result.residualMultiplier).toBeCloseTo(0.8);
  });

  it('computes multiplicative residual', () => {
    const ramp = makeAbility({ id: 'ramp', effectPct: 20 });
    const sentinel = makeAbility({
      id: 'sentinel',
      effectPct: 30,
      jobAbbrev: 'PLD',
      name: 'Sentinel',
    });
    const abilities = new Map([
      ['ramp', ramp],
      ['sentinel', sentinel],
    ]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'sentinel', 'evt-1')];
    const result = evaluateEventMit('evt-1', assignments, abilities);
    expect(result.residualMultiplier).toBeCloseTo(0.8 * 0.7); // 0.56
    expect(result.hasOverlap).toBe(true);
  });

  it('detects invuln and returns 0%', () => {
    const hg = makeAbility({
      id: 'hallowed',
      effectPct: 100,
      isInvuln: true,
    });
    const ramp = makeAbility({ id: 'ramp', effectPct: 20 });
    const abilities = new Map([
      ['hallowed', hg],
      ['ramp', ramp],
    ]);
    const assignments = [assign('a1', 'hallowed', 'evt-1'), assign('a2', 'ramp', 'evt-1')];
    const result = evaluateEventMit('evt-1', assignments, abilities);
    expect(result.residualMultiplier).toBe(0);
    expect(result.residualPct).toBe(0);
  });

  it('skips abilities with null/zero effectPct', () => {
    const noMit = makeAbility({ id: 'no-mit', effectPct: null });
    const zeroMit = makeAbility({ id: 'zero-mit', effectPct: 0 });
    const abilities = new Map([
      ['no-mit', noMit],
      ['zero-mit', zeroMit],
    ]);
    const assignments = [assign('a1', 'no-mit', 'evt-1'), assign('a2', 'zero-mit', 'evt-1')];
    const result = evaluateEventMit('evt-1', assignments, abilities);
    expect(result.entries).toHaveLength(0);
    expect(result.residualMultiplier).toBe(1);
  });

  it('handles missing ability references gracefully', () => {
    const abilities = new Map<string, AbilityInfo>();
    const assignments = [assign('a1', 'unknown-ability', 'evt-1')];
    const result = evaluateEventMit('evt-1', assignments, abilities);
    expect(result.entries).toHaveLength(0);
    expect(result.residualMultiplier).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// evaluateEventMit — extended path (with context)
// ---------------------------------------------------------------------------

describe('evaluateEventMit (extended path, with context)', () => {
  it('filters by duration — only active abilities contribute', () => {
    const shortMit = makeAbility({
      id: 'short',
      effectPct: 20,
      durationS: 10,
    });
    const longMit = makeAbility({
      id: 'long',
      effectPct: 30,
      durationS: 60,
    });
    const abilities = new Map([
      ['short', shortMit],
      ['long', longMit],
    ]);
    const assignments = [assign('a1', 'short', 'evt-1'), assign('a2', 'long', 'evt-1')];

    // Hit at +5s — both active
    const r1 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [5_000],
    });
    expect(r1.perHit[0]!.entries).toHaveLength(2);
    expect(r1.perHit[0]!.residualMultiplier).toBeCloseTo(0.8 * 0.7);

    // Hit at +15s — short expired, long still active
    const r2 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [15_000],
    });
    expect(r2.perHit[0]!.entries).toHaveLength(1);
    expect(r2.perHit[0]!.entries[0]!.abilityId).toBe('long');
    expect(r2.perHit[0]!.residualMultiplier).toBeCloseTo(0.7);
  });

  it('filters by target type', () => {
    const selfMit = makeAbility({
      id: 'self-mit',
      effectPct: 20,
      target: 'self',
    });
    const partyMit = makeAbility({
      id: 'party-mit',
      effectPct: 10,
      target: 'party',
    });
    const abilities = new Map([
      ['self-mit', selfMit],
      ['party-mit', partyMit],
    ]);
    const assignments = [assign('a1', 'self-mit', 'evt-1'), assign('a2', 'party-mit', 'evt-1')];

    // PARTY target — only party-mit applies
    const r1 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      targetKind: 'PARTY',
    });
    expect(r1.perHit[0]!.entries).toHaveLength(1);
    expect(r1.perHit[0]!.entries[0]!.abilityId).toBe('party-mit');

    // MAIN_TANK target — self-mit applies
    const r2 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      targetKind: 'MAIN_TANK',
    });
    expect(r2.perHit[0]!.entries).toHaveLength(1);
    expect(r2.perHit[0]!.entries[0]!.abilityId).toBe('self-mit');
  });

  it('filters by damage type', () => {
    const physMit = makeAbility({
      id: 'phys',
      effectPct: 20,
      damageType: 'physical',
    });
    const magMit = makeAbility({
      id: 'mag',
      effectPct: 10,
      damageType: 'magical',
    });
    const abilities = new Map([
      ['phys', physMit],
      ['mag', magMit],
    ]);
    const assignments = [assign('a1', 'phys', 'evt-1'), assign('a2', 'mag', 'evt-1')];

    // Magical damage — only mag-mit applies
    const r1 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      damageType: 'magical',
    });
    expect(r1.perHit[0]!.entries).toHaveLength(1);
    expect(r1.perHit[0]!.entries[0]!.abilityId).toBe('mag');

    // Physical damage — only phys-mit applies
    const r2 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      damageType: 'physical',
    });
    expect(r2.perHit[0]!.entries).toHaveLength(1);
    expect(r2.perHit[0]!.entries[0]!.abilityId).toBe('phys');
  });

  it('evaluates each hit time independently (multi-hit)', () => {
    const mit = makeAbility({
      id: 'mit',
      effectPct: 20,
      durationS: 10,
    });
    const abilities = new Map([['mit', mit]]);
    const assignments = [assign('a1', 'mit', 'evt-1')];

    const result = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [2_000, 8_000, 15_000],
    });

    expect(result.perHit).toHaveLength(3);
    // Hit 1: within duration
    expect(result.perHit[0]!.entries).toHaveLength(1);
    expect(result.perHit[0]!.residualMultiplier).toBeCloseTo(0.8);
    // Hit 2: within duration
    expect(result.perHit[1]!.entries).toHaveLength(1);
    expect(result.perHit[1]!.residualMultiplier).toBeCloseTo(0.8);
    // Hit 3: outside duration
    expect(result.perHit[2]!.entries).toHaveLength(0);
    expect(result.perHit[2]!.residualMultiplier).toBe(1);
  });

  it('tracks shield metadata', () => {
    const shieldWithMit = makeAbility({
      id: 'holy-sheltron',
      effectPct: 15,
      isShield: true,
      durationS: 8,
    });
    const pureMit = makeAbility({
      id: 'ramp',
      effectPct: 20,
      durationS: 20,
    });
    const abilities = new Map([
      ['holy-sheltron', shieldWithMit],
      ['ramp', pureMit],
    ]);
    const assignments = [assign('a1', 'holy-sheltron', 'evt-1'), assign('a2', 'ramp', 'evt-1')];

    const result = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [4_000],
    });

    expect(result.perHit[0]!.shieldCount).toBe(1);
    expect(result.perHit[0]!.shieldTotalPct).toBe(15);
    expect(result.perHit[0]!.entries).toHaveLength(2);
    expect(result.perHit[0]!.residualMultiplier).toBeCloseTo(0.85 * 0.8);
  });

  it('handles invuln with context', () => {
    const hg = makeAbility({
      id: 'hallowed',
      effectPct: 100,
      isInvuln: true,
      durationS: 10,
    });
    const ramp = makeAbility({
      id: 'ramp',
      effectPct: 20,
      durationS: 20,
    });
    const abilities = new Map([
      ['hallowed', hg],
      ['ramp', ramp],
    ]);
    const assignments = [assign('a1', 'hallowed', 'evt-1'), assign('a2', 'ramp', 'evt-1')];

    // Within invuln window — zero damage
    const r1 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [5_000],
    });
    expect(r1.perHit[0]!.hasInvuln).toBe(true);
    expect(r1.perHit[0]!.residualMultiplier).toBe(0);

    // Outside invuln window — only ramp applies
    const r2 = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [15_000],
    });
    expect(r2.perHit[0]!.hasInvuln).toBe(false);
    expect(r2.perHit[0]!.residualMultiplier).toBeCloseTo(0.8);
  });

  it('handles malformed ability values safely', () => {
    const negMit = makeAbility({ id: 'neg', effectPct: -10 });
    const nullMit = makeAbility({ id: 'null-mit', effectPct: null });
    const zeroMit = makeAbility({ id: 'zero', effectPct: 0 });
    const noDuration = makeAbility({
      id: 'no-dur',
      effectPct: 20,
      durationS: null,
    });
    const abilities = new Map([
      ['neg', negMit],
      ['null-mit', nullMit],
      ['zero', zeroMit],
      ['no-dur', noDuration],
    ]);
    const assignments = [
      assign('a1', 'neg', 'evt-1'),
      assign('a2', 'null-mit', 'evt-1'),
      assign('a3', 'zero', 'evt-1'),
      assign('a4', 'no-dur', 'evt-1'),
    ];

    const result = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [5_000],
    });
    // Only no-dur (effectPct 20) contributes; neg/null/zero are filtered
    expect(result.perHit[0]!.entries).toHaveLength(1);
    expect(result.perHit[0]!.entries[0]!.abilityId).toBe('no-dur');
    expect(result.perHit[0]!.residualMultiplier).toBeCloseTo(0.8);
  });

  it('handles unknown target/damage-type gracefully', () => {
    const mit = makeAbility({ id: 'mit', effectPct: 20 });
    const abilities = new Map([['mit', mit]]);
    const assignments = [assign('a1', 'mit', 'evt-1')];

    // Unknown target kind — all applicable abilities pass through
    const r = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      targetKind: 'UNKNOWN_THING',
      damageType: null,
    });
    expect(r.perHit[0]!.entries).toHaveLength(1);
  });

  it('returns perHit and doubleBookings in result', () => {
    const mit = makeAbility({ id: 'mit', effectPct: 20, durationS: 10 });
    const abilities = new Map([['mit', mit]]);
    const assignments = [assign('a1', 'mit', 'evt-1')];

    const result = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [2_000, 8_000],
    });

    expect(result.perHit).toHaveLength(2);
    expect(result.doubleBookings).toBeInstanceOf(Map);
  });

  it('non-overlapping duration with multiple hits', () => {
    const mit = makeAbility({
      id: 'mit',
      effectPct: 20,
      durationS: 5,
    });
    const abilities = new Map([['mit', mit]]);
    const assignments = [assign('a1', 'mit', 'evt-1')];

    // Event at t=0, hit at t=10_000 — placement outside duration
    const r = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 0,
      hitTimesMs: [10_000],
    });
    expect(r.perHit[0]!.entries).toHaveLength(0);
    expect(r.perHit[0]!.residualMultiplier).toBe(1);
  });

  it('hit before event timestamp — not active', () => {
    const mit = makeAbility({
      id: 'mit',
      effectPct: 20,
      durationS: 10,
    });
    const abilities = new Map([['mit', mit]]);
    const assignments = [assign('a1', 'mit', 'evt-1')];

    const r = evaluateEventMit('evt-1', assignments, abilities, {
      eventTimestampMs: 5_000, // ability assigned at t=5s
      hitTimesMs: [2_000], // hit before assigned
    });
    expect(r.perHit[0]!.entries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectDoubleBookings
// ---------------------------------------------------------------------------

describe('detectDoubleBookings', () => {
  it('detects same job + ability on the same event', () => {
    const ramp = makeAbility({
      id: 'ramp',
      name: 'Rampart',
      jobAbbrev: 'PLD',
      effectPct: 20,
    });
    const abilities = new Map([['ramp', ramp]]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'ramp', 'evt-1')];
    const conflicts = detectDoubleBookings(assignments, abilities);
    expect(conflicts.size).toBe(1);
    const list = conflicts.values().next().value as WebAssignment[];
    expect(list).toHaveLength(2);
  });

  it('does not flag different abilities on the same event', () => {
    const ramp = makeAbility({
      id: 'ramp',
      name: 'Rampart',
      jobAbbrev: 'PLD',
      effectPct: 20,
    });
    const sentinel = makeAbility({
      id: 'sentinel',
      name: 'Sentinel',
      jobAbbrev: 'PLD',
      effectPct: 30,
    });
    const abilities = new Map([
      ['ramp', ramp],
      ['sentinel', sentinel],
    ]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'sentinel', 'evt-1')];
    const conflicts = detectDoubleBookings(assignments, abilities);
    expect(conflicts.size).toBe(0);
  });

  it('does not flag same ability across different events (no recast param)', () => {
    const ramp = makeAbility({
      id: 'ramp',
      name: 'Rampart',
      jobAbbrev: 'PLD',
      effectPct: 20,
    });
    const abilities = new Map([['ramp', ramp]]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'ramp', 'evt-2')];
    const conflicts = detectDoubleBookings(assignments, abilities);
    expect(conflicts.size).toBe(0);
  });

  it('detects recast-window conflicts across events', () => {
    const ramp = makeAbility({
      id: 'ramp',
      name: 'Rampart',
      jobAbbrev: 'PLD',
      effectPct: 20,
      recastS: 90,
    });
    const abilities = new Map([['ramp', ramp]]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'ramp', 'evt-2')];

    // 60s apart — inside 90s recast → conflict
    const timestampsClose = new Map<string, number>([
      ['evt-1', 10_000],
      ['evt-2', 70_000],
    ]);
    const conflicts = detectDoubleBookings(assignments, abilities, timestampsClose);
    expect(conflicts.size).toBe(1);
  });

  it('does not flag recast when timestamps are far enough apart', () => {
    const ramp = makeAbility({
      id: 'ramp',
      name: 'Rampart',
      jobAbbrev: 'PLD',
      effectPct: 20,
      recastS: 90,
    });
    const abilities = new Map([['ramp', ramp]]);
    const assignments = [assign('a1', 'ramp', 'evt-1'), assign('a2', 'ramp', 'evt-2')];

    // 120s apart — outside 90s recast → no conflict
    const timestampsFar = new Map<string, number>([
      ['evt-1', 10_000],
      ['evt-2', 130_000],
    ]);
    const conflicts = detectDoubleBookings(assignments, abilities, timestampsFar);
    expect(conflicts.size).toBe(0);
  });

  it('ignores abilities with null/zero recast in recast check', () => {
    const noRecast = makeAbility({
      id: 'no-recast',
      name: 'No Recast',
      jobAbbrev: 'PLD',
      effectPct: 20,
      recastS: null,
    });
    const abilities = new Map([['no-recast', noRecast]]);
    const assignments = [assign('a1', 'no-recast', 'evt-1'), assign('a2', 'no-recast', 'evt-2')];

    const timestamps = new Map<string, number>([
      ['evt-1', 10_000],
      ['evt-2', 70_000],
    ]);
    const conflicts = detectDoubleBookings(assignments, abilities, timestamps);
    // No recast value → no recast-window check → only same-event check (0)
    expect(conflicts.size).toBe(0);
  });

  it('handles missing ability references', () => {
    const abilities = new Map<string, AbilityInfo>();
    const assignments = [assign('a1', 'unknown', 'evt-1'), assign('a2', 'unknown', 'evt-2')];
    const conflicts = detectDoubleBookings(assignments, abilities);
    expect(conflicts.size).toBe(0);
  });

  it('combines same-event and recast-window conflicts', () => {
    const ramp = makeAbility({
      id: 'ramp',
      name: 'Rampart',
      jobAbbrev: 'PLD',
      effectPct: 20,
      recastS: 90,
    });
    const abilities = new Map([['ramp', ramp]]);
    const assignments = [
      assign('a1', 'ramp', 'evt-1'),
      assign('a2', 'ramp', 'evt-1'), // same-event
      assign('a3', 'ramp', 'evt-2'), // recast-window
    ];

    const timestamps = new Map<string, number>([
      ['evt-1', 10_000],
      ['evt-2', 60_000],
    ]);
    const conflicts = detectDoubleBookings(assignments, abilities, timestamps);
    expect(conflicts.size).toBe(2); // one same-event, one recast
  });
});
