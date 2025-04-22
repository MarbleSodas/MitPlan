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
        const job = jobs.find(j => j.id === jobId);
        if (job && job.selected) {
          return true;
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
