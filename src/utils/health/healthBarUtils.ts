import type { MitigationAbility, JobId } from '../../types';

interface HealingAbility extends MitigationAbility {
  healingPotencyBonus?: number | { value: number; stackMode: 'additive' | 'multiplicative' };
}

interface BuffsByJob {
  [jobId: string]: { additive: number; multiplicative: number };
}

export const calculateDamagePercentage = (damage: number | string | undefined, maxHealth: number): number => {
  if (!damage || !maxHealth) return 0;

  const numericDamage = typeof damage === 'string'
    ? parseInt(damage.replace(/[^0-9]/g, ''), 10)
    : damage;

  if (isNaN(numericDamage)) return 0;

  return Math.min(1, numericDamage / maxHealth);
};

export const calculateMitigatedDamage = (rawDamage: number | string | undefined, mitigationPercentage: number): number => {
  if (!rawDamage) return 0;

  const numericDamage = typeof rawDamage === 'string'
    ? parseInt(rawDamage.replace(/[^0-9]/g, ''), 10)
    : rawDamage;

  if (isNaN(numericDamage)) return 0;

  return numericDamage * (1 - mitigationPercentage);
};

export const calculateBarrierAmount = (
  ability: Partial<MitigationAbility> | null | undefined,
  maxHealth: number,
  healingPotencyPer100: number | null = null
): number => {
  if (!ability || !maxHealth) return 0;

  let amount = 0;

  if (ability.barrierPotency && ability.barrierPotency > 0) {
    amount += maxHealth * ability.barrierPotency;
  }

  if (ability.barrierFlatPotency && ability.barrierFlatPotency > 0 && healingPotencyPer100) {
    amount += (ability.barrierFlatPotency / 100) * healingPotencyPer100;
  }

  return amount;
};

export const calculateRemainingHealth = (
  maxHealth: number,
  damage: number | string | undefined,
  barrierAmount: number = 0
): number => {
  if (!maxHealth) return 0;

  const numericDamage = typeof damage === 'string'
    ? parseInt(damage.replace(/[^0-9]/g, ''), 10)
    : damage;

  if (numericDamage === undefined || isNaN(numericDamage)) return maxHealth;

  const damageToHealth = Math.max(0, numericDamage - barrierAmount);

  return Math.max(0, maxHealth - damageToHealth);
};

export const formatHealth = (health: number | null | undefined): string => {
  if (!health && health !== 0) return '0';

  return health.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export const formatHealthCompact = (health: number | null | undefined): string => {
  if (health === null || health === undefined) return '0';
  const n = Number(health);
  if (Number.isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000000) {
    const value = n / 1000000;
    return `${value.toFixed(abs >= 10000000 ? 0 : 1)}M`;
  }
  if (abs >= 1000) {
    return `${Math.round(n / 1000)}k`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export const formatPercentage = (percentage: number | null | undefined): string => {
  if (!percentage && percentage !== 0) return '0%';

  return `${Math.round(percentage * 100)}%`;
};

const HEALING_POTENCY_VALUES: Record<number, number> = {
  90: 5000,
  100: 6000
};

export const getHealingPotency = (bossLevel: number = 90): number => {
  try {
    const savedPotency = localStorage.getItem(`mitplan-healing-potency-${bossLevel}`);
    if (savedPotency) {
      const potencyNum = parseInt(savedPotency, 10);
      if (potencyNum > 0) {
        return potencyNum;
      }
    }
  } catch (error) {
    console.warn('Error reading healing potency from localStorage:', error);
  }

  return HEALING_POTENCY_VALUES[bossLevel] ?? HEALING_POTENCY_VALUES[100] ?? 6000;
};

export const calculateHealingAmount = (
  healingAbilities: HealingAbility[] | null | undefined,
  healingPotencyPer100: number,
  _bossLevel: number = 90,
  maxHealth: number = 0
): number => {
  if (!healingAbilities || healingAbilities.length === 0 || !healingPotencyPer100) return 0;

  let totalHealing = 0;

  const buffsByJob: BuffsByJob = {};
  healingAbilities.forEach(a => {
    const job: JobId | null = (Array.isArray(a.jobs) && a.jobs.length > 0 && a.jobs[0]) ? a.jobs[0] : null;
    if (!job) return;
    const bonus = a.healingPotencyBonus || null;
    let value = 0;
    let stackMode: 'additive' | 'multiplicative' = 'multiplicative';
    if (bonus) {
      if (typeof bonus === 'number') {
        value = bonus;
      } else if (typeof bonus === 'object' && bonus.value !== undefined) {
        value = bonus.value;
        if (bonus.stackMode) stackMode = bonus.stackMode;
      }
      if (!buffsByJob[job]) buffsByJob[job] = { additive: 0, multiplicative: 1 };
      if (stackMode === 'additive') {
        buffsByJob[job].additive += value;
      } else {
        buffsByJob[job].multiplicative *= (1 + value);
      }
    }
  });

  healingAbilities.forEach(ability => {
    if (ability.maxHpIncrease && ability.maxHpIncrease > 0 && maxHealth > 0) {
      totalHealing += maxHealth * ability.maxHpIncrease;
    }

    if (ability.type === 'healing' || (ability.healingPotency && ability.healingPotency > 0) || (ability.regenPotency && ability.regenPotency > 0)) {
      let instantHealingPotency = 0;
      let regenHealingPotency = 0;

      if (ability.healingPotency !== undefined) {
        instantHealingPotency = ability.healingPotency;
      } else {
        switch (ability.id) {
          case 'aurora':
            instantHealingPotency = 0;
            break;
          case 'indomitability':
            instantHealingPotency = 400;
            break;
          case 'excogitation':
            instantHealingPotency = 800;
            break;
          case 'liturgy_of_the_bell':
            instantHealingPotency = 400;
            break;
          default:
            instantHealingPotency = 300;
        }
      }

      if (ability.regenPotency !== undefined) {
        regenHealingPotency = ability.regenPotency;
      } else {
        if (ability.id === 'aurora') {
          regenHealingPotency = 200;
        }
      }

      if (ability.healingType === 'fullHeal' || ability.isFullHeal) {
        totalHealing += maxHealth;
      } else if (ability.healingType === 'boost') {
        return;
      } else {
        const job: JobId | null = (Array.isArray(ability.jobs) && ability.jobs.length > 0 && ability.jobs[0]) ? ability.jobs[0] : null;
        let modifier = 1;
        if (job && buffsByJob[job]) {
          const add = buffsByJob[job].additive || 0;
          const mult = buffsByJob[job].multiplicative || 1;
          modifier = (1 + add) * mult;
        }

        if (instantHealingPotency > 0) {
          totalHealing += ((instantHealingPotency * modifier) / 100) * healingPotencyPer100;
        }

        if (regenHealingPotency > 0 && ability.regenDuration) {
          const tickInterval = 3;
          const totalTicks = Math.floor(ability.regenDuration / tickInterval);
          const regenHealing = ((regenHealingPotency * modifier) / 100) * healingPotencyPer100 * totalTicks;
          totalHealing += regenHealing;
        }
      }
    }
  });

  try {
    const hasPhilosophia = healingAbilities.some(a => a && a.id === 'philosophia');
    if (hasPhilosophia) {
      const sageSpellCount = healingAbilities.filter(a => a && Array.isArray(a.jobs) && a.jobs.includes('SGE') && a.isSpell === true).length;
      if (sageSpellCount > 0) {
        const basePotency = 150 * sageSpellCount;
        let modifier = 1;
        if (buffsByJob['SGE']) {
          const add = buffsByJob['SGE'].additive || 0;
          const mult = buffsByJob['SGE'].multiplicative || 1;
          modifier = (1 + add) * mult;
        }
        totalHealing += ((basePotency * modifier) / 100) * healingPotencyPer100;
      }
    }
  } catch (_e) {
    // Ignore errors in Philosophia calculation
  }

  return totalHealing;
};

export const calculateHealthAfterHealing = (
  remainingHealth: number | null | undefined,
  healingAmount: number,
  maxHealth: number
): number => {
  if (!remainingHealth && remainingHealth !== 0) return 0;
  if (!healingAmount) return remainingHealth;

  return Math.min(maxHealth, remainingHealth + healingAmount);
};

export default {
  calculateDamagePercentage,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  calculateRemainingHealth,
  formatHealth,
  formatHealthCompact,
  formatPercentage,
  getHealingPotency,
  calculateHealingAmount,
  calculateHealthAfterHealing
};
