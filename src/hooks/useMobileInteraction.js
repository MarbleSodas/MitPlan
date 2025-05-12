import { useCallback } from 'react';

/**
 * Custom hook for handling mobile interactions in the mitigation planner
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.checkAbilityCooldown - Function to check if an ability is on cooldown
 * @param {Function} options.addMitigation - Function to add a mitigation to a boss action
 * @param {Function} options.addPendingAssignment - Function to add a pending assignment
 * @param {Function} options.canAssignMitigationToBossAction - Function to check if a mitigation can be assigned to a boss action
 * @param {Function} options.setPendingAssignments - Function to set pending assignments
 * @param {Array} options.sortedBossActions - Array of sorted boss actions
 * @param {Object} options.assignments - Current mitigation assignments
 * @returns {Object} - Mobile interaction handlers
 */
const useMobileInteraction = ({
  checkAbilityCooldown,
  addMitigation,
  addPendingAssignment,
  canAssignMitigationToBossAction,
  setPendingAssignments,
  sortedBossActions,
  assignments
}) => {
  // Handle mobile mitigation assignment
  const handleMobileAssignMitigation = useCallback((bossActionId, mitigation) => {
    // Check if the ability would be on cooldown
    const bossAction = sortedBossActions.find(action => action.id === bossActionId);
    if (!bossAction) return;

    // Check if this mitigation is already assigned to this boss action
    const isAlreadyAssigned = assignments[bossActionId]?.some(m => m.id === mitigation.id);

    // If already assigned, check if it can be assigned again based on the rules
    if (isAlreadyAssigned && !canAssignMitigationToBossAction(bossActionId, mitigation.id)) {
      console.log(`Cannot assign ${mitigation.name} to ${bossAction.name} because it cannot be assigned multiple times to this boss action.`);
      return;
    }

    const cooldownResult = checkAbilityCooldown(
      mitigation.id,
      bossAction.time,
      isAlreadyAssigned, // Pass true if already assigned
      bossActionId
    );

    if (cooldownResult && cooldownResult.isOnCooldown) {
      // Ability is on cooldown, but we no longer show error messages
      console.log(`Cannot assign ${mitigation.name} to ${bossAction.name} because it would be on cooldown. Previously used at ${cooldownResult.lastUsedTime}s (${cooldownResult.lastUsedActionName}). Cooldown remaining: ${Math.ceil(cooldownResult.timeUntilReady)}s`);
    } else {
      // Create the pending assignment object
      const newPendingAssignment = {
        bossActionId: bossActionId,
        mitigationId: mitigation.id,
        timestamp: Date.now()
      };

      // Add pending assignment to the ChargeCountContext
      // This will update the charge/instance counts immediately
      addPendingAssignment(bossActionId, mitigation.id);

      // Add to local pending assignments for state management
      setPendingAssignments(prev => [...prev, newPendingAssignment]);

      // Then add the mitigation to the boss action
      const result = addMitigation(bossActionId, mitigation);

      if (result && result.conflicts && result.conflicts.removedCount > 0) {
        // Log about removed future assignments only if there are conflicts
        console.log(`Added ${mitigation.name} to ${bossAction.name}. Removed ${result.conflicts.removedCount} future assignments that would be on cooldown.`);
      }
    }
  }, [sortedBossActions, assignments, checkAbilityCooldown, addMitigation, addPendingAssignment, canAssignMitigationToBossAction, setPendingAssignments]);

  // Handle boss action click for mobile
  const handleBossActionClick = useCallback((action, isMobile, toggleBossActionSelection, setSelectedActionForMobile, setIsMobileBottomSheetOpen) => {
    if (isMobile) {
      // On mobile, open the bottom sheet with the selected action
      setSelectedActionForMobile(action);
      setIsMobileBottomSheetOpen(true);
    } else {
      // On desktop, use the existing toggle selection behavior
      toggleBossActionSelection(action);
    }
  }, []);

  return {
    handleMobileAssignMitigation,
    handleBossActionClick
  };
};

export default useMobileInteraction;
