/**
 * Utility functions for auto-assigning tank-specific mitigations
 */

import { mitigationAbilities } from '../../data';

/**
 * Get recommended tank-specific self-mitigations for a tank job
 *
 * @param {string} tankJobId - The tank job ID (e.g., 'PLD', 'WAR', 'DRK', 'GNB')
 * @param {number} bossLevel - The boss level for ability availability
 * @returns {Array} - Array of recommended mitigation abilities for the tank
 */
export const getRecommendedTankMitigations = (tankJobId, bossLevel = 90) => {
  if (!tankJobId) return [];

  // Get all tank-specific self-targeting mitigations for this job
  const tankMitigations = mitigationAbilities.filter(ability =>
    ability.target === 'self' &&
    ability.forTankBusters &&
    !ability.forRaidWide &&
    ability.jobs.includes(tankJobId) &&
    ability.levelRequirement <= bossLevel
  );

  // Sort by priority: invulnerabilities first, then by mitigation value (highest first)
  return tankMitigations.sort((a, b) => {
    // Prioritize invulnerabilities
    if (a.type === 'invulnerability' && b.type !== 'invulnerability') return -1;
    if (b.type === 'invulnerability' && a.type !== 'invulnerability') return 1;

    // Then sort by mitigation value (highest first)
    return (b.mitigationValue || 0) - (a.mitigationValue || 0);
  });
};

/**
 * Get recommended single-target mitigations that can be cast by a tank
 *
 * @param {string} tankJobId - The tank job ID that will cast the ability
 * @param {number} bossLevel - The boss level for ability availability
 * @returns {Array} - Array of recommended single-target mitigation abilities
 */
export const getRecommendedSingleTargetMitigations = (tankJobId, bossLevel = 90) => {
  if (!tankJobId) return [];

  // Get all single-target mitigations that this tank can cast
  const singleTargetMitigations = mitigationAbilities.filter(ability =>
    ability.target === 'single' &&
    ability.forTankBusters &&
    ability.jobs.includes(tankJobId) &&
    ability.levelRequirement <= bossLevel
  );

  // Sort by mitigation value (highest first)
  return singleTargetMitigations.sort((a, b) => {
    return (b.mitigationValue || 0) - (a.mitigationValue || 0);
  });
};

/**
 * Get the best available tank mitigation for a specific tank and boss action
 * 
 * @param {string} tankJobId - The tank job ID
 * @param {Object} bossAction - The boss action object
 * @param {number} bossLevel - The boss level
 * @param {Function} checkAbilityAvailability - Function to check if ability is available
 * @returns {Object|null} - The best available mitigation or null if none available
 */
export const getBestAvailableTankMitigation = (
  tankJobId, 
  bossAction, 
  bossLevel, 
  checkAbilityAvailability
) => {
  if (!tankJobId || !bossAction || !checkAbilityAvailability) return null;

  const recommendedMitigations = getRecommendedTankMitigations(tankJobId, bossLevel);
  
  // Find the first available mitigation
  for (const mitigation of recommendedMitigations) {
    const availability = checkAbilityAvailability(
      mitigation.id,
      bossAction.time,
      bossAction.id,
      { isBeingAssigned: true }
    );
    
    if (availability.canAssign()) {
      return mitigation;
    }
  }
  
  return null;
};

/**
 * Auto-assign tank-specific mitigations for a tank buster boss action
 * 
 * @param {Object} bossAction - The boss action object
 * @param {Object} tankPositions - Tank position assignments {mainTank: 'PLD', offTank: 'WAR'}
 * @param {number} bossLevel - The boss level
 * @param {Function} addMitigation - Function to add mitigation assignment
 * @param {Function} checkAbilityAvailability - Function to check ability availability
 * @param {Object} options - Additional options
 * @returns {Array} - Array of auto-assigned mitigations
 */
export const autoAssignTankBusterMitigations = (
  bossAction,
  tankPositions,
  bossLevel,
  addMitigation,
  checkAbilityAvailability,
  options = {}
) => {
  const { 
    enableAutoAssignment = true,
    maxMitigationsPerTank = 2,
    preferInvulnerabilities = true 
  } = options;

  if (!enableAutoAssignment || !bossAction?.isTankBuster || !tankPositions) {
    return [];
  }

  const assignedMitigations = [];

  console.log('[AutoAssignment] Processing tank buster:', {
    bossAction: bossAction.name,
    tankPositions,
    isDualTankBuster: bossAction.isDualTankBuster
  });

  // For dual tank busters, assign mitigations to both tanks
  if (bossAction.isDualTankBuster) {
    // Assign to main tank
    if (tankPositions.mainTank) {
      const mainTankMitigations = autoAssignForSingleTank(
        tankPositions.mainTank,
        'mainTank',
        bossAction,
        bossLevel,
        addMitigation,
        checkAbilityAvailability,
        maxMitigationsPerTank,
        tankPositions
      );
      assignedMitigations.push(...mainTankMitigations);
    }

    // Assign to off tank
    if (tankPositions.offTank) {
      const offTankMitigations = autoAssignForSingleTank(
        tankPositions.offTank,
        'offTank',
        bossAction,
        bossLevel,
        addMitigation,
        checkAbilityAvailability,
        maxMitigationsPerTank,
        tankPositions
      );
      assignedMitigations.push(...offTankMitigations);
    }
  } else {
    // For single tank busters, assign to main tank (or off tank if no main tank)
    const targetTank = tankPositions.mainTank || tankPositions.offTank;
    const targetPosition = tankPositions.mainTank ? 'mainTank' : 'offTank';
    
    if (targetTank) {
      const tankMitigations = autoAssignForSingleTank(
        targetTank,
        targetPosition,
        bossAction,
        bossLevel,
        addMitigation,
        checkAbilityAvailability,
        maxMitigationsPerTank,
        tankPositions
      );
      assignedMitigations.push(...tankMitigations);
    }
  }

  console.log('[AutoAssignment] Assigned mitigations:', assignedMitigations);
  return assignedMitigations;
};

/**
 * Auto-assign mitigations for a single tank
 *
 * @param {string} tankJobId - The tank job ID
 * @param {string} tankPosition - The tank position ('mainTank' or 'offTank')
 * @param {Object} bossAction - The boss action object
 * @param {number} bossLevel - The boss level
 * @param {Function} addMitigation - Function to add mitigation assignment
 * @param {Function} checkAbilityAvailability - Function to check ability availability
 * @param {number} maxMitigations - Maximum mitigations to assign
 * @param {Object} tankPositions - All tank positions for single-target assignment
 * @returns {Array} - Array of assigned mitigations
 */
const autoAssignForSingleTank = (
  tankJobId,
  tankPosition,
  bossAction,
  bossLevel,
  addMitigation,
  checkAbilityAvailability,
  maxMitigations = 2,
  tankPositions = null
) => {
  const assignedMitigations = [];

  // Get self-targeting mitigations
  const selfMitigations = getRecommendedTankMitigations(tankJobId, bossLevel);

  // Get single-target mitigations if we have tank positions
  const singleTargetMitigations = tankPositions ?
    getRecommendedSingleTargetMitigations(tankJobId, bossLevel) : [];

  console.log('[AutoAssignment] Assigning for tank:', {
    tankJobId,
    tankPosition,
    selfMitigationsCount: selfMitigations.length,
    singleTargetMitigationsCount: singleTargetMitigations.length
  });

  // Combine and prioritize mitigations (self-targeting first, then single-target)
  const allMitigations = [...selfMitigations, ...singleTargetMitigations];

  // Assign up to maxMitigations available mitigations
  for (const mitigation of allMitigations) {
    if (assignedMitigations.length >= maxMitigations) break;

    let targetPosition = tankPosition;

    // For single-target mitigations, determine the best target
    if (mitigation.target === 'single' && tankPositions) {
      const decision = determineSingleTargetAssignment(mitigation, bossAction, tankPositions);
      if (!decision.assignment) continue; // Skip if can't assign
      targetPosition = decision.assignment.targetPosition;
    }

    const availability = checkAbilityAvailability(
      mitigation.id,
      bossAction.time,
      bossAction.id,
      { isBeingAssigned: true, tankPosition: targetPosition }
    );

    if (availability.canAssign()) {
      try {
        const result = addMitigation(bossAction.id, mitigation, targetPosition);
        if (result && result.success !== false) {
          assignedMitigations.push({
            mitigation,
            tankPosition: targetPosition,
            tankJobId,
            type: mitigation.target === 'single' ? 'single-target' : 'self-targeting'
          });
          console.log('[AutoAssignment] Successfully assigned:', {
            mitigation: mitigation.name,
            casterPosition: tankPosition,
            targetPosition,
            type: mitigation.target
          });
        }
      } catch (error) {
        console.error('[AutoAssignment] Error assigning mitigation:', {
          mitigation: mitigation.name,
          error
        });
      }
    }
  }

  return assignedMitigations;
};

/**
 * Check if auto-assignment should be triggered for a boss action
 *
 * @param {Object} bossAction - The boss action object
 * @param {Object} tankPositions - Tank position assignments
 * @param {Object} currentAssignments - Current mitigation assignments
 * @returns {boolean} - Whether auto-assignment should be triggered
 */
export const shouldTriggerAutoAssignment = (bossAction, tankPositions, currentAssignments = {}) => {
  // Only trigger for tank busters
  if (!bossAction?.isTankBuster) return false;

  // Only trigger if we have tank positions assigned
  if (!tankPositions?.mainTank && !tankPositions?.offTank) return false;

  // Don't trigger if this boss action already has tank-specific mitigations assigned
  const existingAssignments = currentAssignments[bossAction.id] || [];
  const hasTankSpecificMitigations = existingAssignments.some(assignment =>
    assignment.tankPosition && assignment.tankPosition !== 'shared'
  );

  return !hasTankSpecificMitigations;
};

/**
 * Determine the best tank assignment for a single-target mitigation
 *
 * @param {Object} mitigation - The mitigation ability object
 * @param {Object} bossAction - The boss action object
 * @param {Object} tankPositions - Tank position assignments
 * @returns {Object} - Assignment decision with caster and target information
 */
export const determineSingleTargetAssignment = (mitigation, bossAction, tankPositions) => {
  if (!mitigation || mitigation.target !== 'single' || !tankPositions) {
    return { shouldShowModal: false, assignment: null };
  }

  const mainTankJob = tankPositions.mainTank;
  const offTankJob = tankPositions.offTank;

  const canMainTankCast = mainTankJob && mitigation.jobs.includes(mainTankJob);
  const canOffTankCast = offTankJob && mitigation.jobs.includes(offTankJob);

  console.log('[SingleTargetAssignment] Analyzing assignment:', {
    mitigation: mitigation.name,
    mainTankJob,
    offTankJob,
    canMainTankCast,
    canOffTankCast,
    isDualTankBuster: bossAction.isDualTankBuster,
    forTankBusters: mitigation.forTankBusters
  });

  // For dual tank busters: ALL single-target abilities with forTankBusters: true should show modal
  // This ensures that healer/DPS abilities like Divine Benison, Aquaveil, etc. also show tank selection
  if (bossAction.isDualTankBuster && mitigation.forTankBusters) {
    console.log('[SingleTargetAssignment] Dual tank buster with single-target tank mitigation - showing modal for tank selection');
    return {
      shouldShowModal: true,
      assignment: null,
      reason: 'Dual tank buster with single-target tank mitigation - user choice needed for tank selection'
    };
  }

  // For single tank busters or non-tank-buster actions: use job-based logic

  // If only one tank can cast the ability, auto-assign
  if (canMainTankCast && !canOffTankCast) {
    return {
      shouldShowModal: false,
      assignment: {
        casterPosition: 'mainTank',
        targetPosition: 'mainTank',
        reason: 'Only main tank can cast this ability'
      }
    };
  }

  if (canOffTankCast && !canMainTankCast) {
    return {
      shouldShowModal: false,
      assignment: {
        casterPosition: 'offTank',
        targetPosition: 'offTank',
        reason: 'Only off tank can cast this ability'
      }
    };
  }

  // If both tanks can cast the ability, show modal to let user choose
  if (canMainTankCast && canOffTankCast) {
    return {
      shouldShowModal: true,
      assignment: null,
      reason: 'Both tanks can cast - user choice needed for tank selection'
    };
  }

  // If neither tank can cast and it's not a dual tank buster scenario, don't assign
  return {
    shouldShowModal: false,
    assignment: null,
    reason: 'No tank can cast this ability and not applicable for dual tank buster targeting'
  };
};

/**
 * Determine the best tank assignment for a self-target mitigation
 *
 * @param {Object} mitigation - The mitigation ability object
 * @param {Object} bossAction - The boss action object
 * @param {Object} tankPositions - Tank position assignments
 * @returns {Object} - Assignment decision with caster and target information
 */
export const determineSelfTargetAssignment = (mitigation, bossAction, tankPositions) => {
  if (!mitigation || mitigation.target !== 'self' || !tankPositions) {
    return { shouldShowModal: false, assignment: null };
  }

  const mainTankJob = tankPositions.mainTank;
  const offTankJob = tankPositions.offTank;

  const canMainTankCast = mainTankJob && mitigation.jobs.includes(mainTankJob);
  const canOffTankCast = offTankJob && mitigation.jobs.includes(offTankJob);

  // Special case for Rampart: Show modal for dual tank busters to allow user choice
  const isRampart = mitigation.id === 'rampart';

  console.log('[SelfTargetAssignment] Analyzing assignment:', {
    mitigation: mitigation.name,
    mitigationId: mitigation.id,
    mainTankJob,
    offTankJob,
    canMainTankCast,
    canOffTankCast,
    isRampart,
    isDualTankBuster: bossAction.isDualTankBuster
  });

  // Special case: Rampart on dual tank busters should show modal
  if (isRampart && bossAction.isDualTankBuster && (canMainTankCast || canOffTankCast)) {
    console.log('[SelfTargetAssignment] Rampart on dual tank buster - showing modal for tank selection');
    return {
      shouldShowModal: true,
      assignment: null,
      reason: 'Rampart on dual tank buster - user choice needed for which tank uses their instance'
    };
  }

  // For all other self-target abilities, auto-assign to the tank that can cast them
  if (canMainTankCast && !canOffTankCast) {
    return {
      shouldShowModal: false,
      assignment: {
        casterPosition: 'mainTank',
        targetPosition: 'mainTank',
        reason: 'Only main tank can cast this self-target ability'
      }
    };
  }

  if (canOffTankCast && !canMainTankCast) {
    return {
      shouldShowModal: false,
      assignment: {
        casterPosition: 'offTank',
        targetPosition: 'offTank',
        reason: 'Only off tank can cast this self-target ability'
      }
    };
  }

  // If both tanks can cast the ability (like Rampart for single tank busters), default to main tank
  if (canMainTankCast && canOffTankCast && !bossAction.isDualTankBuster) {
    return {
      shouldShowModal: false,
      assignment: {
        casterPosition: 'mainTank',
        targetPosition: 'mainTank',
        reason: 'Single tank buster - main tank uses self-target ability'
      }
    };
  }

  // If neither tank can cast, don't assign
  return {
    shouldShowModal: false,
    assignment: null,
    reason: 'No tank can cast this self-target ability'
  };
};

/**
 * Unified function to determine mitigation assignment logic
 * This is the main entry point for determining whether to show tank selection modal
 *
 * @param {Object} mitigation - The mitigation ability object
 * @param {Object} bossAction - The boss action object
 * @param {Object} tankPositions - Tank position assignments
 * @param {Object} selectedJobs - Selected jobs (optional, for compatibility)
 * @returns {Object} - Assignment decision with modal and assignment information
 */
export const determineMitigationAssignment = (mitigation, bossAction, tankPositions, selectedJobs = null) => {
  if (!mitigation || !bossAction || !tankPositions) {
    return { shouldShowModal: false, assignment: null };
  }

  console.log('[MitigationAssignment] Analyzing mitigation:', {
    mitigationName: mitigation.name,
    mitigationId: mitigation.id,
    target: mitigation.target,
    bossActionName: bossAction.name,
    isDualTankBuster: bossAction.isDualTankBuster,
    forTankBusters: mitigation.forTankBusters
  });

  // For single-target mitigations, use the specialized logic
  if (mitigation.target === 'single') {
    return determineSingleTargetAssignment(mitigation, bossAction, tankPositions);
  }

  // For self-target mitigations, use the specialized logic (includes special Rampart handling)
  if (mitigation.target === 'self') {
    return determineSelfTargetAssignment(mitigation, bossAction, tankPositions);
  }

  // For party-wide or area mitigations, no modal needed
  return {
    shouldShowModal: false,
    assignment: {
      casterPosition: 'shared',
      targetPosition: 'shared',
      reason: 'Party-wide or area mitigation - no tank selection needed'
    }
  };
};

/**
 * Auto-assign single-target mitigations for multi-tank busters
 *
 * @param {Object} mitigation - The mitigation ability object
 * @param {Object} bossAction - The boss action object
 * @param {Object} tankPositions - Tank position assignments
 * @param {Function} addMitigation - Function to add mitigation assignment
 * @param {Function} checkAbilityAvailability - Function to check ability availability
 * @returns {Object} - Assignment result
 */
export const autoAssignSingleTargetMitigation = (
  mitigation,
  bossAction,
  tankPositions,
  addMitigation,
  checkAbilityAvailability
) => {
  const decision = determineSingleTargetAssignment(mitigation, bossAction, tankPositions);

  if (!decision.assignment) {
    return {
      success: false,
      shouldShowModal: decision.shouldShowModal,
      reason: decision.reason
    };
  }

  // Check if the ability is available
  const availability = checkAbilityAvailability(
    mitigation.id,
    bossAction.time,
    bossAction.id,
    { isBeingAssigned: true, tankPosition: decision.assignment.targetPosition }
  );

  if (!availability.canAssign()) {
    return {
      success: false,
      shouldShowModal: false,
      reason: `Ability not available: ${availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : 'Unknown reason'}`
    };
  }

  // Assign the mitigation
  try {
    const result = addMitigation(bossAction.id, mitigation, decision.assignment.targetPosition);

    console.log('[SingleTargetAssignment] Auto-assigned:', {
      mitigation: mitigation.name,
      caster: decision.assignment.casterPosition,
      target: decision.assignment.targetPosition,
      reason: decision.assignment.reason
    });

    return {
      success: true,
      shouldShowModal: false,
      assignment: decision.assignment,
      reason: decision.assignment.reason
    };
  } catch (error) {
    console.error('[SingleTargetAssignment] Error assigning mitigation:', error);
    return {
      success: false,
      shouldShowModal: false,
      reason: `Assignment failed: ${error.message}`
    };
  }
};
