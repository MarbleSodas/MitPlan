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
 * 
 * @param {Object} ability - The barrier ability
 * @param {number} maxHealth - The maximum health value
 * @returns {number} - The barrier amount
 */
export const calculateBarrierAmount = (ability, maxHealth) => {
  if (!ability || !ability.barrierPotency || !maxHealth) return 0;
  
  return maxHealth * ability.barrierPotency;
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

  healingAbilities.forEach(ability => {
    if (ability.type === 'healing') {
      let healingPotency = 0;

      // Use the healingPotency from ability data if available
      if (ability.healingPotency !== undefined) {
        healingPotency = ability.healingPotency;
      } else {
        // Fallback to old hardcoded values for backward compatibility
        switch (ability.id) {
          case 'aurora':
            healingPotency = 200;
            break;
          case 'indomitability':
            healingPotency = 400;
            break;
          case 'excogitation':
            healingPotency = 800;
            break;
          case 'liturgy_of_the_bell':
            healingPotency = 400;
            break;
          default:
            healingPotency = 300;
        }
      }

      // Handle different healing types
      if (ability.healingType === 'fullHeal' || ability.isFullHeal) {
        // Full heal abilities like Benediction restore all HP
        totalHealing += maxHealth;
      } else if (ability.healingType === 'regen' && ability.regenDuration) {
        // For regen abilities, calculate total healing over duration
        // Assuming 3-second ticks for most regen effects
        const tickInterval = 3;
        const totalTicks = Math.floor(ability.regenDuration / tickInterval);
        totalHealing += (healingPotency / 100) * healingPotencyPer100 * totalTicks;
      } else if (ability.healingType === 'boost') {
        // Healing boost abilities don't provide direct healing
        // They would enhance other healing abilities, but we'll skip for now
        return;
      } else {
        // Instant and triggered healing
        totalHealing += (healingPotency / 100) * healingPotencyPer100;
      }
    }
  });

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
  formatPercentage,
  getHealingPotency,
  calculateHealingAmount,
  calculateHealthAfterHealing
};
