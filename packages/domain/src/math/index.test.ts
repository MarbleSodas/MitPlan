/**
 * Property-based tests for the MitStackEvaluator. Architecture §2.1 #6,
 * §10.3, Appendix A example 5. Covers NFR-12 (90% domain coverage).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeResidualMultiplier,
  computeResidualPct,
  MultiplicativeMitStackEvaluator,
  asAbilityId,
} from './index.js';
import { brandId } from '@xivmitplan/shared/ids';
import type { Assignment } from '@xivmitplan/validation/plan';
import type { Ability } from '../catalog/index.js';

describe('computeResidualMultiplier', () => {
  it('returns 1.0 for an empty stack', () => {
    expect(computeResidualMultiplier([])).toBe(1.0);
  });

  it('returns the correct value for a single 10% mit', () => {
    expect(computeResidualMultiplier([10])).toBeCloseTo(0.9);
  });

  it('multiplicative: two 10% mits → 0.81', () => {
    expect(computeResidualMultiplier([10, 10])).toBeCloseTo(0.81);
  });

  it('property: result is in [0, 1]', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 100 })), (pcts) => {
        const r = computeResidualMultiplier(pcts);
        return r >= 0 && r <= 1;
      }),
    );
  });

  it('property: result is monotonically non-increasing in number of mits', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 20 }), (pcts) => {
        const r1 = computeResidualMultiplier(pcts);
        const r2 = computeResidualMultiplier([...pcts, 10]);
        return r2 <= r1 + 1e-9;
      }),
    );
  });

  it('property: bound input [0, 100]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (n) => {
        const r = computeResidualMultiplier([n]);
        return r >= 0 && r <= 1;
      }),
    );
  });
});

describe('computeResidualPct', () => {
  it('returns the percentage', () => {
    expect(computeResidualPct(0.9)).toBe(90);
    expect(computeResidualPct(1)).toBe(100);
    expect(computeResidualPct(0)).toBe(0);
  });
});

describe('MultiplicativeMitStackEvaluator', () => {
  const makeAbility = (id: string, effectPct: number | null, isInvuln = false): Ability => ({
    id: brandId<'AbilityId'>(id),
    jobId: brandId<'JobId'>('00000000-0000-0000-0000-000000000001'),
    abilityId: id,
    mode: 'CURRENT',
    name: id,
    description: null,
    effectPct,
    recastS: 60,
    rangeM: null,
    durationS: null,
    isInvuln,
    isHeal: false,
    isShield: false,
    effectiveFrom: '7.0',
    effectiveTo: null,
  });

  const makeAssignment = (id: string, abilityId: string, targetUserId: string | null): Assignment => ({
    id: brandId(id) as Assignment['id'],
    abilityId: asAbilityId(abilityId),
    targetUserId,
    targetType: 'PARTY',
    eventId: brandId<'TimelineEventId'>('00000000-0000-0000-0000-000000000099'),
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 0,
  });

  it('returns 100% residual on an empty stack', () => {
    const evalr = new MultiplicativeMitStackEvaluator();
    const result = evalr.evaluate({
      eventId: 'evt',
      targetUserId: null,
      activeAssignments: [],
      abilityById: new Map(),
      hasInvuln: false,
    });
    expect(result.residualMultiplier).toBe(1);
    expect(result.residualPct).toBe(100);
    expect(result.entries).toHaveLength(0);
  });

  it('computes correctly for two 10% mits', () => {
    const evalr = new MultiplicativeMitStackEvaluator();
    const a1 = makeAbility('reprisal', 10);
    const a2 = makeAbility('addleb', 10);
    const abilityById = new Map([
      [a1.id, a1],
      [a2.id, a2],
    ]);
    const result = evalr.evaluate({
      eventId: 'evt',
      targetUserId: null,
      activeAssignments: [makeAssignment('a1', 'reprisal', null), makeAssignment('a2', 'addleb', null)],
      abilityById,
      hasInvuln: false,
    });
    expect(result.residualMultiplier).toBeCloseTo(0.81);
    expect(result.residualPct).toBeCloseTo(81);
  });

  it('tank invuln short-circuits to 0', () => {
    const evalr = new MultiplicativeMitStackEvaluator();
    const a = makeAbility('hallowed', null, true);
    const abilityById = new Map([[a.id, a]]);
    const result = evalr.evaluate({
      eventId: 'evt',
      targetUserId: 'u1',
      activeAssignments: [makeAssignment('h', 'hallowed', 'u1')],
      abilityById,
      hasInvuln: true,
    });
    expect(result.residualMultiplier).toBe(0);
    expect(result.residualPct).toBe(0);
  });

  it('detects double-booking conflicts', () => {
    const evalr = new MultiplicativeMitStackEvaluator();
    const a = makeAbility('reprisal', 10);
    const abilityById = new Map([[a.id, a]]);
    const result = evalr.evaluate({
      eventId: 'evt',
      targetUserId: 'u1',
      activeAssignments: [
        makeAssignment('1', 'reprisal', 'u1'),
        makeAssignment('2', 'reprisal', 'u1'),
      ],
      abilityById,
      hasInvuln: false,
    });
    expect(result.conflicts.some((c) => c.kind === 'CONFLICT')).toBe(true);
  });

  it('surfaces a validation conflict for unknown abilities', () => {
    const evalr = new MultiplicativeMitStackEvaluator();
    const result = evalr.evaluate({
      eventId: 'evt',
      targetUserId: null,
      activeAssignments: [makeAssignment('1', 'unknown', null)],
      abilityById: new Map(),
      hasInvuln: false,
    });
    expect(result.conflicts.some((c) => c.kind === 'VALIDATION')).toBe(true);
  });

  it('property: residualMultiplier <= 1', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            effectPct: fc.integer({ min: 0, max: 100 }),
          }),
          { maxLength: 10 },
        ),
        (specs) => {
          const evalr = new MultiplicativeMitStackEvaluator();
          const abilities = new Map<ReturnType<typeof asAbilityId>, Ability>();
          const assignments: Assignment[] = [];
          specs.forEach((s, i) => {
            const ability = makeAbility(s.id, s.effectPct);
            abilities.set(ability.id, ability);
            assignments.push(makeAssignment(`${i}`, s.id, null));
          });
          const r = evalr.evaluate({
            eventId: 'e',
            targetUserId: null,
            activeAssignments: assignments,
            abilityById: abilities,
            hasInvuln: false,
          });
          return r.residualMultiplier <= 1 + 1e-9;
        },
      ),
    );
  });
});
