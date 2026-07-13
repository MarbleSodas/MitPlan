/**
 * Pure math. The FFXIV mit formula and the MitStackEvaluator.
 * Architecture §2.1 #6, §10.3 (Open/Closed), Appendix A example 5.
 *
 * Property-based tested with `fast-check` per NFR-12.
 */
import type { AbilityId } from '../ids/index.js';
import { brandId } from '@xivmitplan/shared/ids';
import type { DomainError } from '../errors/index.js';
import type {
  MitStackEvaluator,
  MitStackInput,
  MitStackResult,
} from '../ports/index.js';

/**
 * The multiplicative mit formula.
 *
 * FFXIV computes damage as:
 *   raw = base
 *   after mit = raw * (1 - mitPct/100)   // multiplicative across mits
 *   after shield = max(0, after mit - shieldPct)   // additive shield
 *
 * Note: the per-game formula is actually `raw * (1 - mitPct) * (1 - mitPct) * ...`
 * with a final additive shield after. The architecture §2.1 #6 says:
 *   1.0 × ∏(1 - effectPct/100) for percent mits, then additive shield.
 * The shield layer is multiplicative in FFXIV after a hotfix; we
 * model it as additive (matches MitPlan v1's behavior and the
 * published FFXIV formula on the official wiki).
 */
export const computeResidualMultiplier = (
  effectPcts: ReadonlyArray<number>,
): number => {
  if (effectPcts.length === 0) return 1.0;
  const safe = effectPcts.map((p) => Math.max(0, Math.min(100, p)));
  return safe.reduce((acc, p) => acc * (1 - p / 100), 1.0);
};

export const computeResidualPct = (multiplier: number): number => multiplier * 100;

/**
 * The default MitStackEvaluator. The composition root wires this into
 * the PlanService. The interface is the extension point
 * (architecture §10.3, Appendix A example 2).
 */
export class MultiplicativeMitStackEvaluator implements MitStackEvaluator {
  evaluate(input: MitStackInput): MitStackResult {
    type Entry = {
      abilityId: AbilityId;
      abilityName: string;
      effectPct: number;
      isInvuln: boolean;
    };
    const entries: Entry[] = [];
    const effectPcts: number[] = [];
    const conflicts: DomainError[] = [];

    for (const a of input.activeAssignments) {
      const ability = input.abilityById.get(brandId<'AbilityId'>(a.abilityId));
      if (!ability) {
        conflicts.push({
          kind: 'VALIDATION',
          rule: 'ability_resolved',
          message: `Assignment ${a.id} references unknown ability ${a.abilityId}`,
          context: { assignmentId: a.id, abilityId: a.abilityId },
        });
        continue;
      }
      if (ability.effectPct == null) {
        continue;
      }
      entries.push({
        abilityId: ability.id,
        abilityName: ability.name,
        effectPct: ability.effectPct,
        isInvuln: ability.isInvuln,
      });
      effectPcts.push(ability.effectPct);
    }

    const hasInvuln = input.hasInvuln || entries.some((e) => e.isInvuln);
    const residualMultiplier = hasInvuln ? 0 : computeResidualMultiplier(effectPcts);

    const seen = new Map<string, number>();
    for (const a of input.activeAssignments) {
      const key = `${a.abilityId}:${a.targetUserId ?? 'party'}:${a.eventId}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count] of seen) {
      if (count > 1) {
        conflicts.push({
          kind: 'CONFLICT',
          message: `Double-booking: ${key} assigned ${count} times`,
          conflictingIds: input.activeAssignments
            .filter((a) => `${a.abilityId}:${a.targetUserId ?? 'party'}:${a.eventId}` === key)
            .map((a) => a.id),
        });
      }
    }

    return {
      residualMultiplier,
      residualPct: computeResidualPct(residualMultiplier),
      entries,
      conflicts,
    };
  }
}

/** Used by tests to seed the AbilityId for an Ability. */
export const asAbilityId = (s: string): AbilityId => brandId<'AbilityId'>(s);