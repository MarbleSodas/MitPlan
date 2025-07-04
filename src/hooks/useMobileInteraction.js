import { useCallback } from 'react';

/**
 * Custom hook for handling mobile interactions in the mitigation planner
 * Updated to use the Enhanced Cooldown System
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.checkAbilityAvailability - Enhanced function to check ability availability
 * @param {Function} options.addMitigation - Function to add a mitigation to a boss action
 * @param {Array} options.sortedBossActions - Array of sorted boss actions
 * @param {Object} options.assignments - Current mitigation assignments
 * @returns {Object} - Mobile interaction handlers
 */
const useMobileInteraction = ({
  checkAbilityAvailability,
  addMitigation,
  sortedBossActions,
  assignments
}) => {
  // Handle mobile mitigation assignment
  const handleMobileAssignMitigation = useCallback((bossActionId, mitigation, tankPosition = 'shared') => {
    // Find the boss action
    const bossAction = sortedBossActions.find(action => action.id === bossActionId);
    if (!bossAction) return;

    // Use enhanced availability checking
    const availability = checkAbilityAvailability(
      mitigation.id,
      bossAction.time,
      bossActionId,
      { isBeingAssigned: true, tankPosition }
    );

    // Check if the ability can be assigned
    if (!availability.canAssign()) {
      const reason = availability.getUnavailabilityReason();
      console.log(`Cannot assign ${mitigation.name} to ${bossAction.name}: ${reason}`);
      return;
    }

    // If we get here, the ability can be assigned
    console.log(`Assigning ${mitigation.name} to ${bossAction.name} for ${tankPosition}`);

    // Add the mitigation using the enhanced system
    const result = addMitigation(bossActionId, mitigation, tankPosition);

    if (result) {
      console.log(`Successfully added ${mitigation.name} to ${bossAction.name} for ${tankPosition}`);
    }
  }, [sortedBossActions, checkAbilityAvailability, addMitigation]);

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
