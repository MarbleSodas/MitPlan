/**
 * Utility functions for processing boss actions
 */

/**
 * Process multi-hit tank busters in boss actions
 * This function identifies tank busters with the same name that occur within a short time window
 * and combines them into a single action with cumulative damage
 *
 * @param {Array} bossActions - Array of boss action objects
 * @param {number} timeThreshold - Maximum time difference between hits to be considered part of the same multi-hit tank buster (in seconds)
 * @returns {Array} - Processed boss actions with combined multi-hit tank busters
 */
/**
 * Process multi-hit tank busters and raid-wide abilities in boss actions
 * This function identifies actions with multiple hits based on their description or damage values
 * and enhances them with additional properties for display and calculation
 *
 * @param {Array} bossActions - Array of boss action objects
 * @param {number} timeThreshold - Maximum time difference between hits (not used in current implementation)
 * @returns {Array} - Processed boss actions with enhanced multi-hit information
 */
export const processMultiHitTankBusters = (bossActions, timeThreshold = 10) => {
  if (!bossActions || !Array.isArray(bossActions) || bossActions.length === 0) {
    return bossActions;
  }

  // Pre-process to identify multi-hit tank busters and raid-wide abilities from descriptions or damage values
  const processedBossActions = bossActions.map(action => {
    // Method 1: Check if the description mentions multiple hits
    const multiHitMatch = action.description ? action.description.match(/(\d+)[\s-]*hit|multi[\s-]*hit|multiple[\s-]*hit/i) : null;

    // Method 2: Check if the damage is specified as "per hit"
    const perHitMatch = action.unmitigatedDamage ? action.unmitigatedDamage.includes('per hit') : false;

    if (multiHitMatch || perHitMatch) {
      // Determine hit count
      let hitCount = 1;
      if (multiHitMatch && multiHitMatch[1]) {
        hitCount = parseInt(multiHitMatch[1], 10);
      } else if (multiHitMatch) {
        hitCount = 3; // Default to 3 if "multi-hit" is mentioned but no specific count
      } else if (perHitMatch) {
        hitCount = 3; // Default to 3 for "per hit" damage if no specific count is mentioned
      }

      // Store original damage per hit
      let originalDamagePerHit = action.unmitigatedDamage;

      // Calculate total damage
      let totalDamage = action.unmitigatedDamage;
      if (perHitMatch) {
        const damageMatch = action.unmitigatedDamage.match(/~?(\d+,?\d*)/);
        if (damageMatch) {
          const damagePerHit = parseInt(damageMatch[1].replace(/,/g, ''), 10);
          totalDamage = `${(damagePerHit * hitCount).toLocaleString()}`;
        }
      }

      return {
        ...action,
        isMultiHit: true,
        hitCount,
        originalDamagePerHit,
        unmitigatedDamage: totalDamage
      };
    }
    return action;
  });

  // Return the sorted actions
  return processedBossActions.sort((a, b) => a.time - b.time);
};

export default {
  processMultiHitTankBusters
};

/**
 * Returns true if the action is a dual tank buster mechanic, based on the isDualTankBuster property.
 */
export function isDualTankBusterAction(action) {
  // DEBUG: Log the action and its isDualTankBuster property
  console.log('[DEBUG] isDualTankBusterAction check:', {
    action,
    isDualTankBusterProperty: action.isDualTankBuster,
    result: !!action.isDualTankBuster
  });
  return !!action.isDualTankBuster;
}
