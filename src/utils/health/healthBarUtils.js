/**
 * Utility functions for health bar calculations
 */

/**
 * Calculate the damage percentage relative to max health
 *
 * @param {number} damage - The raw damage amount
 * @param {number} maxHealth - The maximum health value
 * @returns {number} - The damage as a percentage of max health (0-1)
 */
export const calculateDamagePercentage = (damage, maxHealth) => {
  if (!damage || !maxHealth) return 0;

  // Convert string damage to number if needed
  const numericDamage = typeof damage === 'string'
    ? parseInt(damage.replace(/[^0-9]/g, ''), 10)
    : damage;

  if (isNaN(numericDamage)) return 0;

  return Math.min(1, numericDamage / maxHealth);
};

/**
 * Calculate the mitigated damage amount
 *
 * @param {number} rawDamage - The raw unmitigated damage
 * @param {number} mitigationPercentage - The mitigation percentage (0-1)
 * @returns {number} - The mitigated damage amount
 */
export const calculateMitigatedDamage = (rawDamage, mitigationPercentage) => {
  if (!rawDamage) return 0;

  // Convert string damage to number if needed
  const numericDamage = typeof rawDamage === 'string'
    ? parseInt(rawDamage.replace(/[^0-9]/g, ''), 10)
    : rawDamage;

  if (isNaN(numericDamage)) return 0;

  return numericDamage * (1 - mitigationPercentage);
};

/**
 * Calculate the barrier amount based on ability potency and max health
 * Supports two representations:
 * - barrierPotency: fraction of max HP (e.g., 0.15 for 15%)
 * - barrierFlatPotency: healing potency to convert to HP using healingPotencyPer100
 *
 * @param {Object} ability - The barrier ability
 * @param {number} maxHealth - The maximum health value
 * @param {number} [healingPotencyPer100] - Healing amount per 100 potency (optional)
 * @returns {number} - The barrier amount
 */
export const calculateBarrierAmount = (ability, maxHealth, healingPotencyPer100 = null) => {
  if (!ability || !maxHealth) return 0;

  let amount = 0;

  // Percentage of max HP component
  if (ability.barrierPotency && ability.barrierPotency > 0) {
    amount += maxHealth * ability.barrierPotency;
  }

  // Flat potency component -> absolute HP (if we know the conversion)
  if (ability.barrierFlatPotency && ability.barrierFlatPotency > 0 && healingPotencyPer100) {
    amount += (ability.barrierFlatPotency / 100) * healingPotencyPer100;
  }

  return amount;
};

/**
 * Calculate the remaining health after damage
 *
 * @param {number} maxHealth - The maximum health value
 * @param {number} damage - The damage amount
 * @param {number} barrierAmount - The barrier amount (optional)
 * @returns {number} - The remaining health
 */
export const calculateRemainingHealth = (maxHealth, damage, barrierAmount = 0) => {
  if (!maxHealth) return 0;

  // Convert string damage to number if needed
  const numericDamage = typeof damage === 'string'
    ? parseInt(damage.replace(/[^0-9]/g, ''), 10)
    : damage;

  if (isNaN(numericDamage)) return maxHealth;

  // Calculate how much damage is absorbed by the barrier
  const damageToHealth = Math.max(0, numericDamage - barrierAmount);

  // Calculate remaining health
  return Math.max(0, maxHealth - damageToHealth);
};

/**
 * Format a health value for display
 *
 * @param {number} health - The health value
 * @returns {string} - Formatted health string
 */
export const formatHealth = (health) => {
  if (!health && health !== 0) return '0';

  return health.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

/**
 * Compact formatter for health values (e.g., 143k, 1.2M)
 */
export const formatHealthCompact = (health) => {
  if (health === null || health === undefined) return '0';
  const n = Number(health);
  if (Number.isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000000) {
    const value = n / 1000000;
    // Use 1 decimal for values under 10M, otherwise no decimals
    return `${value.toFixed(abs >= 10000000 ? 0 : 1)}M`;
  }
  if (abs >= 1000) {
    // Round to nearest thousand
    return `${Math.round(n / 1000)}k`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};


/**
 * Format a percentage for display
 *
 * @param {number} percentage - The percentage value (0-1)
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (percentage) => {
  if (!percentage && percentage !== 0) return '0%';

  return `${Math.round(percentage * 100)}%`;
};

/**
 * Get current healing potency from localStorage
 *
 * @param {number} bossLevel - Boss level to get healing potency for
 * @returns {number} - Healing potency per 100 cure potency
 */
export const getHealingPotency = (bossLevel = 90) => {
  const HEALING_POTENCY_VALUES = {
    90: 5000,   // Level 90 default healing per 100 potency
    100: 6000   // Level 100 default healing per 100 potency
  };

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

  return HEALING_POTENCY_VALUES[bossLevel] || HEALING_POTENCY_VALUES[100];
};

/**
 * Calculate healing amount from healing abilities
 *
 * @param {Array} healingAbilities - Array of healing abilities
 * @param {number} healingPotencyPer100 - Healing amount per 100 potency
 * @param {number} bossLevel - Boss level for ability scaling
 * @param {number} maxHealth - Maximum health for full heal calculations
 * @returns {number} - Total healing amount
 */
export const calculateHealingAmount = (healingAbilities, healingPotencyPer100, bossLevel = 90, maxHealth = 0) => {
  if (!healingAbilities || healingAbilities.length === 0 || !healingPotencyPer100) return 0;

  let totalHealing = 0;

  // Compute per-job healing potency bonuses present on this action
  const buffsByJob = {};
  healingAbilities.forEach(a => {
    const job = Array.isArray(a.jobs) && a.jobs.length > 0 ? a.jobs[0] : null;
    if (!job) return;
    const bonus = a.healingPotencyBonus || null;
    let value = 0;
    let stackMode = 'multiplicative';
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
    // If an ability increases max HP, also apply an instant heal equal to the amount increased
    if (ability.maxHpIncrease && ability.maxHpIncrease > 0 && maxHealth > 0) {
      totalHealing += maxHealth * ability.maxHpIncrease;
    }
    // Process abilities that have healing components (type: 'healing') or explicit healing potency or regen effects
    if (ability.type === 'healing' || (ability.healingPotency && ability.healingPotency > 0) || (ability.regenPotency && ability.regenPotency > 0)) {
      let instantHealingPotency = 0;
      let regenHealingPotency = 0;

      // Get instant healing potency from ability data
      if (ability.healingPotency !== undefined) {
        instantHealingPotency = ability.healingPotency;
      } else {
        // Fallback to old hardcoded values for backward compatibility
        switch (ability.id) {
          case 'aurora':
            instantHealingPotency = 0; // Aurora is pure regen
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

      // Get regen potency from ability data
      if (ability.regenPotency !== undefined) {
        regenHealingPotency = ability.regenPotency;
      } else {
        // Fallback for abilities that have regen but no explicit regenPotency
        if (ability.id === 'aurora') {
          regenHealingPotency = 200; // Aurora's regen potency
        }
      }

      // Handle different healing types
      if (ability.healingType === 'fullHeal' || ability.isFullHeal) {
        // Full heal abilities like Benediction restore all HP
        totalHealing += maxHealth;
      } else if (ability.healingType === 'boost') {
        // Healing boost abilities don't provide direct healing; accounted for as buffs above
        return;
      } else {
        // Determine job-based healing modifier for this ability
        const job = Array.isArray(ability.jobs) && ability.jobs.length > 0 ? ability.jobs[0] : null;
        let modifier = 1;
        if (job && buffsByJob[job]) {
          // Apply additive and multiplicative as per FFXIV stacking conventions
          // First apply additive bonuses to potency, then multiplicative multiplier
          const add = buffsByJob[job].additive || 0; // e.g., +0.20
          const mult = buffsByJob[job].multiplicative || 1; // e.g., 1.10 * 1.05
          modifier = (1 + add) * mult;
        }

        // Calculate instant healing component
        if (instantHealingPotency > 0) {
          totalHealing += ((instantHealingPotency * modifier) / 100) * healingPotencyPer100;
        }

        // Calculate regen healing component if present
        if (regenHealingPotency > 0 && ability.regenDuration) {
          // Assuming 3-second ticks for most regen effects in FFXIV
          const tickInterval = 3;
          const totalTicks = Math.floor(ability.regenDuration / tickInterval);

          // Apply modifier to total regen potency (per-action only)
          const regenHealing = ((regenHealingPotency * modifier) / 100) * healingPotencyPer100 * totalTicks;
          totalHealing += regenHealing;
        }
      }
    }
  });

  // Eudaimonia (Philosophia): add 150 potency heal per Sage spell cast on this action
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
  } catch (e) {}

  return totalHealing;
};

/**
 * Calculate health after healing is applied
 *
 * @param {number} remainingHealth - Health remaining after damage
 * @param {number} healingAmount - Amount of healing to apply
 * @param {number} maxHealth - Maximum health value
 * @returns {number} - Health after healing (capped at max health)
 */
export const calculateHealthAfterHealing = (remainingHealth, healingAmount, maxHealth) => {
  if (!remainingHealth && remainingHealth !== 0) return 0;
  if (!healingAmount) return remainingHealth;

  return Math.min(maxHealth, remainingHealth + healingAmount);
};

// Create an index file for easier imports
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
