/**
 * Utility functions for handling abilities based on level
 */

/**
 * Filter mitigation abilities based on boss level and selected jobs
 *
 * @param {Array} abilities - Array of mitigation ability objects
 * @param {Object} selectedJobs - Object containing selected jobs
 * @param {number} bossLevel - The level of the boss
 * @returns {Array} - Filtered array of abilities
 */
export const filterAbilitiesByLevel = (abilities, selectedJobs, bossLevel) => {
  if (!abilities || !bossLevel) return [];

  return abilities.filter(ability => {
    // Check if the ability is available at the boss level
    if (ability.levelRequirement && ability.levelRequirement > bossLevel) {
      return false;
    }

    // If no jobs are selected, show all abilities that meet the level requirement
    if (!selectedJobs) return true;

    // Check if any of the selected jobs can use this ability
    return ability.jobs.some(jobId => {
      // Find which role this job belongs to
      for (const [, jobs] of Object.entries(selectedJobs)) {
        if (Array.isArray(jobs)) {
          // Handle both optimized format (array of job IDs) and legacy format (array of job objects)
          if (jobs.length > 0 && typeof jobs[0] === 'string') {
            // Optimized format: ["SCH", "WHM"]
            if (jobs.includes(jobId)) {
              return true;
            }
          } else if (jobs.length > 0 && typeof jobs[0] === 'object' && jobs[0] !== null) {
            // Legacy format: [{ id: "SCH", selected: true }]
            const job = jobs.find(j => j && j.id === jobId);
            if (job && job.selected) {
              return true;
            }
          }
        }
      }
      return false;
    });
  });
};

/**
 * Get the appropriate description for an ability based on boss level
 *
 * @param {Object} ability - The mitigation ability object
 * @param {number} bossLevel - The level of the boss
 * @returns {string} - The appropriate description for the ability at the given level
 */
export const getAbilityDescriptionForLevel = (ability, bossLevel) => {
  if (!ability || !bossLevel) return ability?.description || '';

  // If the ability doesn't have level-specific descriptions, return the default
  if (!ability.levelDescriptions) return ability.description;

  // Find the highest level description that is less than or equal to the boss level
  const availableLevels = Object.keys(ability.levelDescriptions)
    .map(Number)
    .filter(level => level <= bossLevel)
    .sort((a, b) => b - a); // Sort in descending order

  if (availableLevels.length === 0) return ability.description;

  // Return the description for the highest available level
  return ability.levelDescriptions[availableLevels[0]];
};

/**
 * Get the appropriate cooldown for an ability based on boss level
 *
 * @param {Object} ability - The mitigation ability object
 * @param {number} bossLevel - The level of the boss
 * @returns {number} - The appropriate cooldown for the ability at the given level
 */
export const getAbilityCooldownForLevel = (ability, bossLevel) => {
  if (!ability || !bossLevel) return ability?.cooldown || 0;

  // If the ability doesn't have level-specific cooldowns, return the default
  if (!ability.levelCooldowns) return ability.cooldown;

  // Find the highest level cooldown that is less than or equal to the boss level
  const availableLevels = Object.keys(ability.levelCooldowns)
    .map(Number)
    .filter(level => level <= bossLevel)
    .sort((a, b) => b - a); // Sort in descending order

  if (availableLevels.length === 0) return ability.cooldown;

  // Return the cooldown for the highest available level
  return ability.levelCooldowns[availableLevels[0]];
};

/**
 * Get the appropriate mitigation value for an ability based on boss level
 *
 * @param {Object} ability - The mitigation ability object
 * @param {number} bossLevel - The level of the boss
 * @returns {number|Object} - The appropriate mitigation value for the ability at the given level
 */
export const getAbilityMitigationValueForLevel = (ability, bossLevel) => {
  if (!ability || !bossLevel) return ability?.mitigationValue || 0;

  // If the ability doesn't have level-specific mitigation values, return the default
  if (!ability.levelMitigationValues) return ability.mitigationValue;

  // Find the highest level mitigation value that is less than or equal to the boss level
  const availableLevels = Object.keys(ability.levelMitigationValues)
    .map(Number)
    .filter(level => level <= bossLevel)
    .sort((a, b) => b - a); // Sort in descending order

  if (availableLevels.length === 0) return ability.mitigationValue;

  // Return the mitigation value for the highest available level
  return ability.levelMitigationValues[availableLevels[0]];
};

/**
 * Get the appropriate duration for an ability based on boss level
 *
 * @param {Object} ability - The mitigation ability object
 * @param {number} bossLevel - The level of the boss
 * @returns {number} - The appropriate duration for the ability at the given level
 */
export const getAbilityDurationForLevel = (ability, bossLevel) => {
  if (!ability || !bossLevel) return ability?.duration || 0;

  // If the ability doesn't have level-specific durations, return the default
  if (!ability.levelDurations) {
    // Try to extract duration from the level description
    if (ability.levelDescriptions) {
      const description = getAbilityDescriptionForLevel(ability, bossLevel);
      const durationMatch = description.match(/for (\d+)s/);
      if (durationMatch && durationMatch[1]) {
        return parseInt(durationMatch[1], 10);
      }
    }
    return ability.duration;
  }

  // Find the highest level duration that is less than or equal to the boss level
  const availableLevels = Object.keys(ability.levelDurations)
    .map(Number)
    .filter(level => level <= bossLevel)
    .sort((a, b) => b - a); // Sort in descending order

  if (availableLevels.length === 0) return ability.duration;

  // Return the duration for the highest available level
  return ability.levelDurations[availableLevels[0]];
};

/**
 * Get the number of charges for an ability
 *
 * @param {Object} ability - The mitigation ability object
 * @param {number} bossLevel - The level of the boss
 * @returns {number} - The number of charges for the ability (default: 1)
 */
export const getAbilityChargeCount = (ability, bossLevel) => {
  if (!ability) return 1;

  // If the ability doesn't have a count property, it has 1 charge
  if (!ability.count) return 1;

  // If the ability has level-specific charge counts, find the appropriate one
  if (ability.levelCharges && bossLevel) {
    const availableLevels = Object.keys(ability.levelCharges)
      .map(Number)
      .filter(level => level <= bossLevel)
      .sort((a, b) => b - a); // Sort in descending order

    if (availableLevels.length > 0) {
      return ability.levelCharges[availableLevels[0]];
    }
  }

  // Return the default count
  return ability.count;
};

/**
 * Count how many instances of a role-shared ability are available based on selected jobs
 *
 * @param {Object} ability - The mitigation ability object
 * @param {Object} selectedJobs - Object containing selected jobs
 * @returns {number} - The number of available instances of this ability
 */
export const getRoleSharedAbilityCount = (ability, selectedJobs) => {
  // If the ability is not role-shared, return 1
  if (!ability || !ability.isRoleShared) return 1;

  // If no jobs are selected, return 0
  if (!selectedJobs) return 0;

  // Count how many selected jobs can use this ability
  let count = 0;

  for (const jobId of ability.jobs) {
    // Find which role this job belongs to
    for (const [, jobs] of Object.entries(selectedJobs)) {
      if (Array.isArray(jobs)) {
        // Handle both optimized format (array of job IDs) and legacy format (array of job objects)
        if (jobs.length > 0 && typeof jobs[0] === 'string') {
          // Optimized format: ["SCH", "WHM"]
          if (jobs.includes(jobId)) {
            count++;
            break; // Found a match for this job, move to the next one
          }
        } else if (jobs.length > 0 && typeof jobs[0] === 'object' && jobs[0] !== null) {
          // Legacy format: [{ id: "SCH", selected: true }]
          const job = jobs.find(j => j && j.id === jobId);
          if (job && job.selected) {
            count++;
            break; // Found a match for this job, move to the next one
          }
        }
      }
    }
  }

  return count;
};

/**
 * Check if a self-targeting ability is usable by a specific tank
 *
 * @param {Object} ability - The mitigation ability object
 * @param {string} tankJobId - The job ID of the tank to check
 * @param {Object} tankPositions - Object containing tank positions
 * @returns {boolean} - Whether the ability is usable by the specified tank
 */
export const isSelfTargetingAbilityUsableByTank = (ability, tankJobId, tankPositions) => {
  // If the ability is not self-targeting or not for tank busters, it's not relevant
  if (!ability || ability.target !== 'self' || !ability.forTankBusters) {
    return true;
  }

  // If the ability can be used by the specified tank job, it's usable
  if (ability.jobs.includes(tankJobId)) {
    return true;
  }

  // Otherwise, it's not usable by this tank
  return false;
};

/**
 * Filter out abilities that have been upgraded by higher-level versions
 *
 * @param {Array} abilities - Array of mitigation ability objects
 * @param {number} bossLevel - The level of the boss
 * @returns {Array} - Filtered array of abilities with upgrades removed
 */
export const filterAbilityUpgrades = (abilities, bossLevel) => {
  if (!abilities || !bossLevel) return abilities || [];

  return abilities.filter(ability => {
    // If this ability has an upgrade
    if (ability.upgradedBy) {
      // Find the upgrade ability
      const upgradeAbility = abilities.find(a => a.id === ability.upgradedBy);

      // If the upgrade exists and is available at the current boss level
      if (upgradeAbility && upgradeAbility.levelRequirement <= bossLevel) {
        return false; // Hide the original ability
      }
    }

    return true; // Keep the ability
  });
};

/**
 * Get available abilities with proper upgrade filtering
 * This is the main function to use for getting abilities that should be displayed
 *
 * @param {Array} abilities - Array of mitigation ability objects
 * @param {Object} selectedJobs - Object containing selected jobs
 * @param {number} bossLevel - The level of the boss
 * @returns {Array} - Filtered array of abilities with level, job, and upgrade filtering applied
 */
export const getAvailableAbilities = (abilities, selectedJobs, bossLevel) => {
  if (!abilities) return [];

  // First apply existing level and job filtering
  const levelFiltered = filterAbilitiesByLevel(abilities, selectedJobs, bossLevel);

  // Then apply upgrade filtering to remove outdated abilities
  return filterAbilityUpgrades(levelFiltered, bossLevel);
};

// Create an index file for easier imports
export default {
  filterAbilitiesByLevel,
  getAbilityDescriptionForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount,
  isSelfTargetingAbilityUsableByTank,
  filterAbilityUpgrades,
  getAvailableAbilities
};
