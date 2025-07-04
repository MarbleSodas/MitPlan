/**
 * Hook for handling auto-assignment of tank-specific mitigations
 */

import { useCallback } from 'react';
import { useTankPositionContext } from '../contexts/TankPositionContext';
import { useEnhancedMitigation } from '../contexts/EnhancedMitigationContext';
import { autoAssignTankBusterMitigations, shouldTriggerAutoAssignment } from '../utils/mitigation/autoAssignmentUtils';

/**
 * Custom hook for auto-assigning tank-specific mitigations
 * 
 * @param {number} bossLevel - The current boss level
 * @returns {Object} - Auto-assignment functions
 */
export const useAutoAssignment = (bossLevel = 90) => {
  const { tankPositions } = useTankPositionContext();
  const { 
    addMitigation, 
    checkAbilityAvailability, 
    assignments,
    isInitialized 
  } = useEnhancedMitigation();

  /**
   * Trigger auto-assignment for a boss action if conditions are met
   * 
   * @param {Object} bossAction - The boss action to potentially auto-assign for
   * @param {Object} options - Auto-assignment options
   * @returns {Array} - Array of auto-assigned mitigations
   */
  const triggerAutoAssignment = useCallback((bossAction, options = {}) => {
    // Only proceed if the enhanced mitigation system is initialized
    if (!isInitialized || !addMitigation || !checkAbilityAvailability) {
      console.log('[AutoAssignment] System not initialized, skipping auto-assignment');
      return [];
    }

    // Check if auto-assignment should be triggered
    if (!shouldTriggerAutoAssignment(bossAction, tankPositions, assignments, options)) {
      console.log('[AutoAssignment] Conditions not met for auto-assignment:', {
        isTankBuster: bossAction?.isTankBuster,
        hasTankPositions: !!(tankPositions?.mainTank || tankPositions?.offTank),
        bossActionId: bossAction?.id,
        existingAssignments: assignments[bossAction?.id] || [],
        options
      });
      return [];
    }

    console.log('[AutoAssignment] Triggering auto-assignment for:', {
      bossAction: bossAction.name,
      tankPositions,
      bossLevel
    });

    // Perform auto-assignment
    const assignedMitigations = autoAssignTankBusterMitigations(
      bossAction,
      tankPositions,
      bossLevel,
      addMitigation,
      checkAbilityAvailability,
      {
        enableAutoAssignment: true,
        maxMitigationsPerTank: 1, // Start conservative with 1 mitigation per tank
        preferInvulnerabilities: false, // Don't auto-assign invulns initially
        ...options
      }
    );

    return assignedMitigations;
  }, [
    bossLevel,
    tankPositions,
    addMitigation,
    checkAbilityAvailability,
    assignments,
    isInitialized
  ]);

  /**
   * Check if auto-assignment is available for a boss action
   *
   * @param {Object} bossAction - The boss action to check
   * @param {Object} options - Additional options for checking
   * @returns {boolean} - Whether auto-assignment is available
   */
  const canAutoAssign = useCallback((bossAction, options = {}) => {
    return isInitialized &&
           shouldTriggerAutoAssignment(bossAction, tankPositions, assignments, options);
  }, [isInitialized, tankPositions, assignments]);

  /**
   * Get recommended mitigations for a specific tank and boss action
   * 
   * @param {string} tankJobId - The tank job ID
   * @param {Object} bossAction - The boss action
   * @returns {Array} - Array of recommended mitigations
   */
  const getRecommendedMitigations = useCallback((tankJobId, bossAction) => {
    if (!tankJobId || !bossAction || !checkAbilityAvailability) return [];

    const { getRecommendedTankMitigations } = require('../utils/mitigation/autoAssignmentUtils');
    const recommended = getRecommendedTankMitigations(tankJobId, bossLevel);

    // Filter by availability
    return recommended.filter(mitigation => {
      const availability = checkAbilityAvailability(
        mitigation.id,
        bossAction.time,
        bossAction.id,
        { isBeingAssigned: true }
      );
      return availability.canAssign();
    });
  }, [bossLevel, checkAbilityAvailability]);

  return {
    triggerAutoAssignment,
    canAutoAssign,
    getRecommendedMitigations,
    isAutoAssignmentReady: isInitialized && !!addMitigation && !!checkAbilityAvailability
  };
};

export default useAutoAssignment;
