/**
 * Utility functions for mitigation calculations
 */
import { getAbilityMitigationValueForLevel, getAbilityDurationForLevel } from '../abilities/abilityUtils';

/**
 * Find all mitigation abilities that are active at a specific time point
 * based on when they were applied to previous boss actions and their durations
 *
 * @param {Object} assignments - The current mitigation assignments
 * @param {Array} bossActions - Array of boss action objects
 * @param {Array} mitigationAbilities - Array of all mitigation ability objects
 * @param {string} targetActionId - The ID of the boss action to check
 * @param {number} targetTime - The time point to check for active mitigations
 * @param {number} bossLevel - The level of the boss
 * @returns {Array} - Array of active mitigation objects with source information
 */
export const findActiveMitigationsAtTime = (assignments, bossActions, mitigationAbilities, targetActionId, targetTime, bossLevel = 90) => {
  // Initialize array to store active mitigations
  const activeMitigations = [];

  // Sort boss actions by time
  const sortedActions = [...bossActions].sort((a, b) => a.time - b.time);

  // Check each boss action that occurs before the target time
  for (const action of sortedActions) {
    // Skip if this is the target action or occurs after the target time
    if (action.id === targetActionId || action.time >= targetTime) {
      continue;
    }

    // Check if this action has any assigned mitigations
    const actionMitigations = assignments[action.id] || [];

    // For each assigned mitigation, check if it's still active at the target time
    for (const assignedMitigation of actionMitigations) {
      // Find the full mitigation ability data
      const mitigation = mitigationAbilities.find(m => m.id === assignedMitigation.id);
      if (!mitigation) continue;

      // Get the level-specific duration
      const duration = getAbilityDurationForLevel(mitigation, bossLevel);

      // Calculate when this mitigation ends
      const endTime = action.time + duration;

      // If the mitigation is still active at the target time, add it to the result
      if (endTime > targetTime) {
        activeMitigations.push({
          ...assignedMitigation,
          sourceActionId: action.id,
          sourceActionName: action.name,
          sourceActionTime: action.time,
          remainingDuration: endTime - targetTime
        });
      }
    }
  }

  return activeMitigations;
};

/**
 * Calculate the total mitigation percentage from a list of mitigation abilities
 * Mitigation stacks multiplicatively in FFXIV
 *
 * @param {Array} mitigations - Array of mitigation ability objects
 * @param {string} damageType - The type of damage ('magical', 'physical', or 'both')
 * @param {number} bossLevel - The level of the boss (optional)
 * @returns {number} - The total mitigation percentage (0-1)
 */
export const calculateTotalMitigation = (mitigations, damageType = 'both', bossLevel = null) => {
  if (!mitigations || mitigations.length === 0) {
    return 0;
  }

  // Start with 0% mitigation (1.0 = full damage)
  let totalMultiplier = 1.0;

  mitigations.forEach(mitigation => {
    // Get the appropriate mitigation value for the boss level
    const mitigationValue = bossLevel ?
      getAbilityMitigationValueForLevel(mitigation, bossLevel) :
      mitigation.mitigationValue;

    // Skip abilities without mitigation values or those that don't apply to this damage type
    if (!mitigationValue) {
      return;
    }

    // Handle abilities that have different values for physical vs magical
    if (typeof mitigationValue === 'object') {
      if (damageType === 'magical' && mitigationValue.magical) {
        totalMultiplier *= (1 - mitigationValue.magical);
      } else if (damageType === 'physical' && mitigationValue.physical) {
        totalMultiplier *= (1 - mitigationValue.physical);
      } else if (damageType === 'both') {
        // For 'both', use the higher value (usually for display purposes)
        const value = Math.max(
          mitigationValue.magical || 0,
          mitigationValue.physical || 0
        );
        totalMultiplier *= (1 - value);
      }
    }
    // Handle abilities with a single mitigation value
    else if (
      mitigation.damageType === 'both' ||
      mitigation.damageType === damageType ||
      !mitigation.damageType // If no damageType is specified, assume it works on all types
    ) {
      totalMultiplier *= (1 - mitigationValue);
    }
  });

  // Convert to percentage reduction (e.g., 0.45 means 45% damage reduction)
  const mitigationPercentage = 1 - totalMultiplier;

  return mitigationPercentage;
};

/**
 * Format a mitigation percentage as a string with % sign
 *
 * @param {number} mitigationValue - The mitigation value (0-1)
 * @returns {string} - Formatted string (e.g., "45%")
 */
export const formatMitigation = (mitigationValue) => {
  return `${Math.round(mitigationValue * 100)}%`;
};

/**
 * Generate a detailed breakdown of mitigation contributions
 *
 * @param {Array} mitigations - Array of mitigation ability objects
 * @param {string} damageType - The type of damage ('magical', 'physical', or 'both')
 * @param {number} bossLevel - The level of the boss (optional)
 * @returns {string} - Formatted breakdown of mitigation contributions
 */
export const generateMitigationBreakdown = (mitigations, damageType = 'both', bossLevel = null) => {
  if (!mitigations || mitigations.length === 0) {
    return 'No mitigation applied';
  }

  // Check if any mitigations have sourceActionId (inherited mitigations)
  const hasInheritedMitigations = mitigations.some(m => m.sourceActionId);

  const totalMitigation = calculateTotalMitigation(mitigations, damageType, bossLevel);
  let breakdown = `Total mitigation: ${formatMitigation(totalMitigation)}\n\nBreakdown:`;

  mitigations.forEach(mitigation => {
    // Get the appropriate mitigation value for the boss level
    const mitigationValue = bossLevel ?
      getAbilityMitigationValueForLevel(mitigation, bossLevel) :
      mitigation.mitigationValue;

    if (!mitigationValue) {
      return;
    }

    let value = 0;

    // Handle abilities that have different values for physical vs magical
    if (typeof mitigationValue === 'object') {
      if (damageType === 'magical' && mitigationValue.magical) {
        value = mitigationValue.magical;
      } else if (damageType === 'physical' && mitigationValue.physical) {
        value = mitigationValue.physical;
      } else if (damageType === 'both') {
        // For 'both', show both values
        const magicalValue = mitigationValue.magical || 0;
        const physicalValue = mitigationValue.physical || 0;

        if (magicalValue === physicalValue) {
          value = magicalValue;
        } else {
          breakdown += `\n• ${mitigation.name}: ${formatMitigation(physicalValue)} physical, ${formatMitigation(magicalValue)} magical`;
          return;
        }
      }
    }
    // Handle abilities with a single mitigation value
    else if (
      mitigation.damageType === 'both' ||
      mitigation.damageType === damageType ||
      !mitigation.damageType
    ) {
      value = mitigationValue;
    } else {
      // This mitigation doesn't apply to this damage type
      return;
    }

    breakdown += `\n• ${mitigation.name}: ${formatMitigation(value)}`;
  });

  return breakdown;
};

// Create an index file for easier imports
export default {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown
};
