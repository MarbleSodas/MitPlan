import { describe, expect, it } from 'vitest';
import { mitigationAbilities } from '../../data/abilities/mitigationAbilities';
import type { MitigationAbility } from '../../types';
import { calculateTotalMitigation } from '../mitigation/mitigationUtils';
import {
  calculateBarrierAmount,
  calculateHealingAmount,
  calculateHealingReceivedMultiplier
} from './healthBarUtils';
import { calculateHealthProjection } from './healthProjectionUtils';

const ability = (id: string): MitigationAbility => {
  const found = mitigationAbilities.find(item => item.id === id);
  if (!found) throw new Error(`Missing fixture ability: ${id}`);
  return found;
};

describe('richer mitigation and healing parity math', () => {
  it('expands Holy Sheltron into base mitigation plus Knight\'s Resolve', () => {
    const holySheltron = ability('holy_sheltron');

    expect(calculateTotalMitigation([holySheltron], 'both', 100)).toBeCloseTo(0.2775, 5);
    expect(calculateTotalMitigation([{ ...holySheltron, remainingDuration: 3 }], 'both', 100)).toBeCloseTo(0.15, 5);
  });

  it('applies Intervention layers with and without the Rampart or Guardian condition', () => {
    const intervention = ability('intervention');
    const rampartWindow = { id: 'rampart', mitigationValue: 0, damageType: 'both' };
    const guardianWindow = { id: 'guardian', mitigationValue: 0, damageType: 'both' };

    expect(calculateTotalMitigation([intervention], 'both', 100)).toBeCloseTo(0.19, 5);
    expect(calculateTotalMitigation([intervention, rampartWindow], 'both', 100)).toBeCloseTo(0.271, 5);
    expect(calculateTotalMitigation([intervention, guardianWindow], 'both', 100)).toBeCloseTo(0.271, 5);
  });

  it('models additional layered tank cooldowns and triggered heals', () => {
    const bloodwhetting = ability('bloodwhetting');
    const corundum = ability('heart_of_corundum');
    const shadowedVigil = ability('shadowed_vigil');

    expect(calculateTotalMitigation([bloodwhetting], 'both', 100)).toBeCloseTo(0.19, 5);
    expect(calculateTotalMitigation([corundum], 'both', 100)).toBeCloseTo(0.2775, 5);
    expect(corundum.lowHpTrigger).toEqual({
      thresholdPercent: 50,
      triggerOnExpire: true,
      healingPotency: 900
    });

    const projection = calculateHealthProjection({
      mitigations: [corundum, shadowedVigil],
      target: 'mainTank',
      maxHealth: 250_000,
      rawDamage: 100_000,
      damageType: 'both',
      bossLevel: 100,
      healingPotencyPer100: 6_000
    });

    expect(projection.healingAmount).toBe(126_000);
  });

  it('consumes Haima and Panhaima stack barriers per hit without changing single-hit behavior', () => {
    const haima = ability('haima');
    const panhaima = ability('panhaima');

    expect(calculateBarrierAmount(haima, 200_000, 6_000)).toBe(18_000);
    expect(calculateBarrierAmount(haima, 200_000, 6_000, { hitCount: 3 })).toBe(54_000);
    expect(calculateBarrierAmount(panhaima, 150_000, 6_000, { hitCount: 8 })).toBe(60_000);
  });

  it('applies target-side healing received bonuses to incoming heals and healing-scaled barriers', () => {
    const heal = {
      id: 'test_heal',
      name: 'Test Heal',
      type: 'healing',
      jobs: ['WHM'],
      target: 'party',
      healingPotency: 100,
      healingType: 'instant'
    } as MitigationAbility;
    const barrier = {
      id: 'test_barrier',
      name: 'Test Barrier',
      type: 'barrier',
      jobs: ['SGE'],
      target: 'party',
      barrierFlatPotency: 100,
      scaleBarrierWithHealing: true
    } as MitigationAbility;
    const bonuses = [
      ability('asylum'),
      ability('physis_ii'),
      ability('krasis'),
      ability('natures_minne')
    ];
    const targetSideBonuses = bonuses.map(bonus => ({
      id: bonus.id,
      name: bonus.name,
      type: 'buff',
      jobs: bonus.jobs,
      target: 'party',
      healingReceivedBonus: bonus.healingReceivedBonus
    } as MitigationAbility));
    const multiplier = calculateHealingReceivedMultiplier(bonuses);

    expect(multiplier).toBeCloseTo(1.6698, 5);
    expect(calculateHealingAmount([heal, ...targetSideBonuses], 6_000, 100, 150_000, multiplier)).toBeCloseTo(10_018.8, 1);

    const projection = calculateHealthProjection({
      mitigations: [barrier, ...targetSideBonuses],
      target: 'party',
      maxHealth: 150_000,
      rawDamage: 100_000,
      damageType: 'both',
      bossLevel: 100,
      healingPotencyPer100: 6_000
    });

    expect(projection.barrierAmount).toBeCloseTo(10_018.8, 1);
  });

  it('applies conditional max-HP barrier bonuses from active effects', () => {
    const shakeItOff = ability('shake');
    const bloodwhetting = ability('bloodwhetting');
    const thrill = ability('thrill_of_battle');

    expect(calculateBarrierAmount(shakeItOff, 200_000, 6_000)).toBe(30_000);

    const projection = calculateHealthProjection({
      mitigations: [shakeItOff, bloodwhetting, thrill],
      target: 'party',
      maxHealth: 200_000,
      rawDamage: 100_000,
      damageType: 'both',
      bossLevel: 100,
      healingPotencyPer100: 6_000
    });

    expect(projection.barrierAmount).toBe(38_000);
  });

  it('applies enhanced healing received bonuses only at their trait levels', () => {
    const rampart = ability('rampart');
    const asylum = ability('asylum');

    expect(calculateHealingReceivedMultiplier([rampart], 90)).toBe(1);
    expect(calculateHealingReceivedMultiplier([rampart], 100)).toBe(1.15);
    expect(calculateHealingReceivedMultiplier([asylum], 70)).toBe(1);
    expect(calculateHealingReceivedMultiplier([asylum], 100)).toBe(1.10);
  });

  it('keeps Eukrasian crit-only barrier metadata out of default shield math', () => {
    const diagnosis = ability('eukrasian_diagnosis');
    const adloquium = ability('adloquium');

    expect(diagnosis.conditionalBarrierOnCrit).toBeTruthy();
    expect(adloquium.conditionalBarrierOnCrit).toBeTruthy();
    expect(calculateBarrierAmount(diagnosis, 200_000, 6_000)).toBe(32_400);
    expect(calculateBarrierAmount(adloquium, 200_000, 6_000)).toBe(32_400);
  });

  it('keeps Liturgy multi-hit healing behavior in the shared projection helper', () => {
    const liturgy = ability('liturgy_of_the_bell');
    const projection = calculateHealthProjection({
      mitigations: [liturgy],
      target: 'party',
      maxHealth: 150_000,
      rawDamage: 100_000,
      damageType: 'both',
      bossLevel: 100,
      healingPotencyPer100: 6_000,
      hitCount: 3
    });

    expect(projection.healingAmount).toBe(72_000);
  });

  it('models Tempera Grassa as available only during the Tempera Coat window', () => {
    const temperaGrassa = ability('tempera_grassa');

    expect(temperaGrassa.cooldown).toBe(1);
    expect(temperaGrassa.requiresActiveWindow).toEqual({ abilityId: 'tempera_coat', windowDuration: 10 });
  });

  it('gates enriched transformed follow-up actions behind their active windows', () => {
    expect(ability('sun_sign').requiresActiveWindow).toEqual({ abilityId: 'neutral_sect', windowDuration: 30 });
    expect(ability('manifestation').requiresActiveWindow).toEqual({ abilityId: 'seraphism', windowDuration: 20 });
    expect(ability('accession').requiresActiveWindow).toEqual({ abilityId: 'seraphism', windowDuration: 20 });
  });
});
