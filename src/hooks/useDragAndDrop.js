import { useCallback } from 'react';
import { mitigationAbilities } from '../data';

/**
 * Custom hook for handling drag and drop operations in the mitigation planner
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.setActiveMitigation - Function to set the active mitigation
 * @param {Function} options.checkAbilityCooldown - Function to check if an ability is on cooldown
 * @param {Function} options.addMitigation - Function to add a mitigation to a boss action
 * @param {Function} options.addPendingAssignment - Function to add a pending assignment
 * @param {Function} options.canAssignMitigationToBossAction - Function to check if a mitigation can be assigned to a boss action
 * @param {Function} options.setPendingAssignments - Function to set pending assignments
 * @returns {Object} - Drag and drop handlers
 */
const useDragAndDrop = ({
  setActiveMitigation,
  checkAbilityCooldown,
  addMitigation,
  addPendingAssignment,
  canAssignMitigationToBossAction,
  setPendingAssignments
}) => {
  // Handle drag start
  const handleDragStart = useCallback((event) => {
    const id = event.active.id;

    // Find the mitigation ability being dragged
    const mitigation = mitigationAbilities.find(m => m.id === id);
    if (mitigation) {
      setActiveMitigation(mitigation);
    }
  }, [setActiveMitigation]);

  // Handle drag end
  const handleDragEnd = useCallback((event, selectedBossAction, assignments) => {
    const { active, over } = event;

    // If no drop target or no selected boss action, do nothing
    if (!over || !selectedBossAction) {
      setActiveMitigation(null);
      return;
    }

    // Find the mitigation ability being dragged
    const mitigation = mitigationAbilities.find(m => m.id === active.id);
    if (!mitigation) {
      setActiveMitigation(null);
      return;
    }

    // Check if the drop target is the selected boss action
    if (over.id === selectedBossAction.id) {
      // Check if this mitigation is already assigned to this boss action
      const isAlreadyAssigned = assignments[selectedBossAction.id]?.some(m => m.id === mitigation.id);

      // If already assigned, check if it can be assigned again based on the rules
      if (isAlreadyAssigned && !canAssignMitigationToBossAction(selectedBossAction.id, mitigation.id)) {
        console.log(`Cannot assign ${mitigation.name} to ${selectedBossAction.name} because it cannot be assigned multiple times to this boss action.`);
        setActiveMitigation(null);
        return;
      }

      // Check if the ability would be on cooldown
      const cooldownResult = checkAbilityCooldown(
        mitigation.id,
        selectedBossAction.time,
        isAlreadyAssigned, // Pass true if already assigned
        selectedBossAction.id
      );

      if (cooldownResult && cooldownResult.isOnCooldown) {
        // Ability is on cooldown, but we no longer show error messages
        console.log(`Cannot assign ${mitigation.name} to ${selectedBossAction.name} because it would be on cooldown. Previously used at ${cooldownResult.lastUsedTime}s (${cooldownResult.lastUsedActionName}). Cooldown remaining: ${Math.ceil(cooldownResult.timeUntilReady)}s`);
      } else {
        // Create the pending assignment object
        const newPendingAssignment = {
          bossActionId: selectedBossAction.id,
          mitigationId: mitigation.id,
          timestamp: Date.now()
        };

        // Add pending assignment to the ChargeCountContext
        // This will update the charge/instance counts immediately
        addPendingAssignment(selectedBossAction.id, mitigation.id);

        // Add to local pending assignments for state management
        setPendingAssignments(prev => [...prev, newPendingAssignment]);

        // Then add the mitigation to the boss action
        const result = addMitigation(selectedBossAction.id, mitigation);

        if (result && result.conflicts && result.conflicts.removedCount > 0) {
          // Log about removed future assignments only if there are conflicts
          console.log(`Added ${mitigation.name} to ${selectedBossAction.name}. Removed ${result.conflicts.removedCount} future assignments that would be on cooldown.`);
        }
      }
    }

    setActiveMitigation(null);
  }, [setActiveMitigation, checkAbilityCooldown, addMitigation, addPendingAssignment, canAssignMitigationToBossAction, setPendingAssignments]);

  return {
    handleDragStart,
    handleDragEnd
  };
};

export default useDragAndDrop;
