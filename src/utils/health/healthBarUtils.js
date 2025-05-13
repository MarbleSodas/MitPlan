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

// Create an index file for easier imports
export default {
  calculateDamagePercentage,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  calculateRemainingHealth,
  formatHealth,
  formatPercentage
};
