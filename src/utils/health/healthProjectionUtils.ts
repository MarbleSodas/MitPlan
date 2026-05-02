import type { MitigationAbility } from '../../types';
import { calculateTotalMitigation } from '../mitigation/mitigationUtils';
import {
  calculateBarrierAmount,
  calculateHealingAmount,
  calculateHealingPotencyModifierForAbility,
  calculateHealingReceivedMultiplier
} from './healthBarUtils';

export type HealthProjectionTarget = 'party' | 'mainTank' | 'offTank';

export interface HealthProjectionInput {
  mitigations: Array<MitigationAbility & Record<string, unknown>>;
  target: HealthProjectionTarget;
  maxHealth: number;
  rawDamage: number;
  damageType?: string;
  bossLevel: number;
  healingPotencyPer100: number;
  hitCount?: number;
}

export interface HealthProjectionResult {
  targetMitigations: Array<MitigationAbility & Record<string, unknown>>;
  mitigationPercentage: number;
  barrierAmount: number;
  healingAmount: number;
  remainingHealth: number;
  healingReceivedMultiplier: number;
}

export const appliesToProjectionTarget = (
  mitigation: Partial<MitigationAbility> & Record<string, unknown>,
  target: HealthProjectionTarget
): boolean => {
  if (target === 'party') {
    return mitigation.target === 'party' || mitigation.target === 'area';
  }

  if (mitigation.target === 'party' || mitigation.target === 'area' || mitigation.targetsTank) {
    return true;
  }

  const tankPosition = mitigation.tankPosition;
  return tankPosition === target || tankPosition === 'shared';
};

const hasBarrierEffect = (mitigation: Partial<MitigationAbility>): boolean => (
  mitigation.type === 'barrier' ||
  Boolean(mitigation.barrierPotency || mitigation.barrierFlatPotency || mitigation.stackBarrierEffect)
);

const hasHealingEffect = (mitigation: Partial<MitigationAbility>): boolean => (
  mitigation.type === 'healing' ||
  Boolean(
    mitigation.healingPotency ||
    mitigation.regenPotency ||
    mitigation.healingPotencyBonus ||
    mitigation.healingReceivedBonus ||
    mitigation.maxHpIncrease
  )
);

export const calculateHealthProjection = ({
  mitigations,
  target,
  maxHealth,
  rawDamage,
  damageType = 'both',
  bossLevel,
  healingPotencyPer100,
  hitCount = 1
}: HealthProjectionInput): HealthProjectionResult => {
  const targetMitigations = mitigations.filter(mitigation =>
    appliesToProjectionTarget(mitigation, target)
  );

  const mitigationPercentage = calculateTotalMitigation(targetMitigations, damageType, bossLevel);
  const healingReceivedMultiplier = calculateHealingReceivedMultiplier(targetMitigations, bossLevel);

  const barrierAmount = targetMitigations
    .filter(hasBarrierEffect)
    .reduce((sum, mitigation) => {
      const activeAbilityIds = targetMitigations
        .map(activeMitigation => activeMitigation.id)
        .filter((id): id is string => Boolean(id));
      const potencyModifier = (
        mitigation.scaleBarrierWithHealing ||
        mitigation.type === 'healing' ||
        mitigation.barrierFlatPotency ||
        mitigation.stackBarrierEffect
      )
        ? calculateHealingPotencyModifierForAbility(mitigation, targetMitigations) * healingReceivedMultiplier
        : 1;

      return sum + calculateBarrierAmount(mitigation, maxHealth, healingPotencyPer100, {
        hitCount,
        healingMultiplier: potencyModifier,
        activeAbilityIds
      });
    }, 0);

  const healingAbilities = targetMitigations.filter(hasHealingEffect);
  let healingAmount = calculateHealingAmount(
    healingAbilities,
    healingPotencyPer100,
    bossLevel,
    maxHealth,
    healingReceivedMultiplier
  );

  const liturgy = targetMitigations.find(mitigation => mitigation.id === 'liturgy_of_the_bell');
  if (liturgy && hitCount > 1) {
    const buffContext = targetMitigations.filter(mitigation =>
      mitigation.id === liturgy.id ||
      mitigation.healingPotencyBonus
    );
    const liturgyTickHealing = calculateHealingAmount(
      buffContext,
      healingPotencyPer100,
      bossLevel,
      maxHealth,
      healingReceivedMultiplier
    );
    healingAmount += Math.max(0, hitCount - 1) * liturgyTickHealing;
  }

  const remainingHealth = Math.max(
    0,
    maxHealth - Math.max(0, rawDamage - barrierAmount) * (1 - mitigationPercentage)
  );

  return {
    targetMitigations,
    mitigationPercentage,
    barrierAmount,
    healingAmount,
    remainingHealth,
    healingReceivedMultiplier
  };
};
