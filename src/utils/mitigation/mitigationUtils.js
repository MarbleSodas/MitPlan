/**
 * Utility functions for mitigation calculations
 */
import {
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel,
  getAbilityChargeCount,
  getAbilityCooldownForLevel
} from '../abilities/abilityUtils';

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
  // Safety checks
  if (!bossActions || !Array.isArray(bossActions) || !assignments) {
    return [];
  }

  // Initialize array to store active mitigations
  const activeMitigations = [];

  // Sort boss actions by time
  const sortedActions = [...bossActions].sort((a, b) => a.time - b.time);

  // Check each boss action (past or future relative to targetTime)
  for (const action of sortedActions) {
    // Skip if this is the target action itself (we only want inherited/other windows here)
    if (action.id === targetActionId) {
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

      // Calculate when this mitigation starts (support precast) and ends
      let precast = Number(assignedMitigation.precastSeconds);
      if (!Number.isFinite(precast) || precast < 0) precast = 0;
      const startTime = Math.max(0, action.time - precast);
      const endTime = startTime + duration;

      // Only count windows that have started by the target time
      if (startTime > targetTime) {
        continue;
      }


      // Special handling for abilities that should be consumed by the first boss action
      // This includes:
      // 1. Shield/barrier abilities without regeneration (Divine Benison, The Blackest Night, etc.)
      // 2. Instant healing abilities without regeneration (Cure, Tetragrammaton, Lustrate, etc.)
      // 3. Healing abilities with barriers (Adloquium, Succor) - both healing AND barrier consumed
      const isBarrierWithoutRegen = mitigation.type === 'barrier' && !mitigation.regenPotency && !mitigation.regenDuration;
      const isInstantHealingWithoutRegen = mitigation.type === 'healing' &&
        mitigation.healingType === 'instant' &&
        !mitigation.regenPotency &&
        !mitigation.regenDuration;
      const isHealingWithBarrier = mitigation.type === 'healing' && mitigation.barrierPotency;
      // NEW: Duration-based healing (e.g., Excogitation) should NOT carry over either.
      // These heals are modeled as having a duration but should be consumed on the action they are assigned to.
      const isDurationHealingSingleAction = mitigation.type === 'healing' &&
        (mitigation.duration && mitigation.duration > 0) &&
        // exclude pure buff-only entries
        mitigation.healingType !== 'boost' &&
        // exclude explicit regens; those heals are applied visually per-action only
        !mitigation.regenPotency && !mitigation.regenDuration;

      if (isBarrierWithoutRegen || isInstantHealingWithoutRegen || isHealingWithBarrier || isDurationHealingSingleAction) {
        // These abilities should ONLY affect the boss action they're assigned to
        // They should NEVER carry over to subsequent actions, regardless of duration
        // For healing+barrier abilities like Succor/Adloquium: BOTH healing AND barrier are consumed immediately

        // Skip this ability if we're checking a different boss action than where it was assigned
        // (i.e., don't let it carry over to subsequent actions)
        if (action.id !== targetActionId) {
          continue;
        }
      }

      // If the mitigation is still active at the target time, add it to the result
      if (endTime > targetTime) {
        activeMitigations.push({
          ...assignedMitigation,
          sourceActionId: action.id,
          sourceActionName: action.name,
          sourceActionTime: startTime,
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

  // Note: breakdown handles both direct and inherited mitigations uniformly

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

/**
 * Check if a mitigation ability is available with the current selected jobs
 *
 * @param {Object} mitigation - The mitigation ability to check
 * @param {Object} selectedJobs - Object containing selected jobs
 * @returns {boolean} - Whether the mitigation is available with current job selection
 */
export const isMitigationAvailable = (mitigation, selectedJobs) => {
  if (!mitigation || !selectedJobs || !mitigation.jobs) {
    return false;
  }

  // Check if any of the jobs that can use this ability are selected
  return mitigation.jobs.some(jobId => {
    // Find which role this job belongs to
    for (const [, jobs] of Object.entries(selectedJobs)) {
      // Handle both optimized format (array of job IDs) and full format (array of job objects)
      if (Array.isArray(jobs)) {
        // Check if it's an array of strings (optimized format from Firebase)
        if (jobs.length > 0 && typeof jobs[0] === 'string') {
          if (jobs.includes(jobId)) {
            return true;
          }
        } else if (jobs.length > 0 && typeof jobs[0] === 'object' && jobs[0] !== null) {
          // Array of job objects (legacy format from local state)
          const job = jobs.find(j => j && j.id === jobId);
          if (job && job.selected) {
            return true;
          }
        }
      }
    }
    return false;
  });
};

/**
 * Calculate an optimal mitigation plan for a set of boss actions
 *
 * @param {Array} bossActions - Array of boss action objects
 * @param {Array} availableMitigations - Array of available mitigation abilities
 * @param {Object} selectedJobs - Object containing selected jobs
 * @param {number} bossLevel - The level of the boss
 * @param {number} targetMinimumMitigation - Minimum mitigation percentage to aim for (0-1)
 * @returns {Object} - Optimal mitigation assignments
 */
export const calculateOptimalMitigationPlan = (
  bossActions,
  availableMitigations,
  selectedJobs,
  bossLevel = 90,
  targetMinimumMitigation = 0.15 // Default to 15% minimum mitigation
) => {
  // Sort boss actions by time
  const sortedActions = [...bossActions].sort((a, b) => a.time - b.time);

  // Filter mitigations to only include those available with selected jobs
  const filteredMitigations = availableMitigations.filter(mitigation =>
    isMitigationAvailable(mitigation, selectedJobs)
  );

  // Initialize assignments object
  const assignments = {};

  // Initialize ability usage tracking
  const abilityUsage = {};
  filteredMitigations.forEach(mitigation => {
    abilityUsage[mitigation.id] = {
      lastUsedTime: -Infinity,
      chargesUsed: 0,
      totalCharges: getAbilityChargeCount(mitigation, bossLevel)
    };
  });

  // Process each boss action
  for (const action of sortedActions) {
    // Skip actions that don't deal damage
    if (!action.unmitigatedDamage) continue;

    // Initialize assignments for this action
    assignments[action.id] = [];

    // Get the damage type for this action (default to 'both' if not specified)
    const damageType = action.damageType || 'both';

    // Calculate which abilities are available at this time
    const availableAbilities = filteredMitigations.filter(mitigation => {
      // Skip abilities that don't apply to this damage type
      if (mitigation.damageType && mitigation.damageType !== 'both' && mitigation.damageType !== damageType) {
        return false;
      }

      // Skip abilities that don't match the action type (tankbuster/raidwide)
      if (action.isTankBuster && !mitigation.forTankBusters) return false;
      if (!action.isTankBuster && !mitigation.forRaidWide) return false;

      // Check if the ability is on cooldown
      const usage = abilityUsage[mitigation.id];
      const cooldownDuration = getAbilityCooldownForLevel(mitigation, bossLevel);
      const timeSinceLastUse = action.time - usage.lastUsedTime;

      // For abilities with multiple charges
      if (usage.totalCharges > 1) {
        // If we haven't used all charges, the ability is available
        if (usage.chargesUsed < usage.totalCharges) {
          return true;
        }

        // If the oldest charge has recovered, the ability is available
        if (timeSinceLastUse >= cooldownDuration) {
          return true;
        }

        return false;
      } else {
        // For abilities with a single charge, just check if it's off cooldown
        return timeSinceLastUse >= cooldownDuration;
      }
    });

    // Sort abilities by mitigation value (highest first)
    const sortedAbilities = [...availableAbilities].sort((a, b) => {
      const aValue = typeof a.mitigationValue === 'object' ?
        Math.max(a.mitigationValue.physical || 0, a.mitigationValue.magical || 0) :
        a.mitigationValue || 0;

      const bValue = typeof b.mitigationValue === 'object' ?
        Math.max(b.mitigationValue.physical || 0, b.mitigationValue.magical || 0) :
        b.mitigationValue || 0;

      return bValue - aValue;
    });

    // Assign mitigations until we reach the target minimum
    let currentMitigation = 0;
    for (const ability of sortedAbilities) {
      // Skip if we've already reached the target
      if (currentMitigation >= targetMinimumMitigation) break;

      // Add this ability to the assignments
      assignments[action.id].push(ability);

      // Update ability usage tracking
      const usage = abilityUsage[ability.id];
      if (usage.totalCharges > 1 && usage.chargesUsed < usage.totalCharges) {
        // If we have charges available, increment the count
        usage.chargesUsed++;
      } else {
        // Otherwise, reset the count and update the last used time
        usage.chargesUsed = 1;
        usage.lastUsedTime = action.time;
      }

      // Update current mitigation value
      const mitigationValue = getAbilityMitigationValueForLevel(ability, bossLevel);
      if (typeof mitigationValue === 'object') {
        // For abilities with different physical/magical values
        if (damageType === 'physical') {
          currentMitigation = 1 - ((1 - currentMitigation) * (1 - (mitigationValue.physical || 0)));
        } else if (damageType === 'magical') {
          currentMitigation = 1 - ((1 - currentMitigation) * (1 - (mitigationValue.magical || 0)));
        } else {
          // For 'both', use the higher value
          const value = Math.max(mitigationValue.physical || 0, mitigationValue.magical || 0);
          currentMitigation = 1 - ((1 - currentMitigation) * (1 - value));
        }
      } else if (mitigationValue) {
        // For abilities with a single mitigation value
        currentMitigation = 1 - ((1 - currentMitigation) * (1 - mitigationValue));
      }
    }
  }

  return assignments;
};

// Create an index file for easier imports
export default {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateOptimalMitigationPlan
};
