import { useCallback } from 'react';
import { mitigationAbilities } from '../data';
import { useTankSelectionModalContext } from '../contexts/TankSelectionModalContext';
import { isDualTankBusterAction } from '../utils/boss/bossActionUtils';

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
  setPendingAssignments,
  tankPositions
}) => {
  // Get the tank selection modal context
  const { openTankSelectionModal } = useTankSelectionModalContext();

  // Process mitigation assignment after all checks
  const processMitigationAssignment = useCallback((selectedBossAction, mitigation, tankPosition = 'shared') => {
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

    // Then add the mitigation to the boss action with the appropriate tank position
    const result = addMitigation(selectedBossAction.id, mitigation, tankPosition);

    if (result && result.conflicts && result.conflicts.removedCount > 0) {
      // Log about removed future assignments only if there are conflicts
      console.log(`Added ${mitigation.name} to ${selectedBossAction.name} for ${tankPosition}. Removed ${result.conflicts.removedCount} future assignments that would be on cooldown.`);
    }
  }, [addMitigation, addPendingAssignment, setPendingAssignments]);

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
        // Determine tank position for tank-specific mitigations
        let tankPosition = 'shared';

        // If this is a tank buster and either:
        // 1. A self-targeting ability for tank busters, or
        // 2. A single-target ability for tank busters that can target tanks
        // DEBUG: Log all relevant values before modal condition in useDragAndDrop
        console.log('[DEBUG] useDragAndDrop Modal Condition Check', {
          selectedBossAction,
          mitigation,
          isTankBuster: selectedBossAction.isTankBuster,
          isDualTankBuster: isDualTankBusterAction(selectedBossAction),
          isDualTankBusterProperty: selectedBossAction.isDualTankBuster,
          mitigationTarget: mitigation.target,
          forTankBusters: mitigation.forTankBusters,
          forRaidWide: mitigation.forRaidWide,
          targetsTank: mitigation.targetsTank
        });

        if (selectedBossAction.isTankBuster &&
            ((mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) ||
             (mitigation.target === 'single' && mitigation.forTankBusters && mitigation.targetsTank))) {

          // For dual tank busters, we need to ask which tank to apply the mitigation to
          // DEBUG: Log when modal logic is triggered for dual tank buster in useDragAndDrop
          console.log('[DEBUG] useDragAndDrop Dual Tank Buster Modal Trigger:', {
            selectedBossAction,
            mitigation,
            isDualTankBusterAction: isDualTankBusterAction(selectedBossAction),
            isDualTankBusterProperty: selectedBossAction.isDualTankBuster,
            tankPositions
          });

          if (selectedBossAction.isDualTankBuster && mitigation.target === 'single' && mitigation.targetsTank) {
            // Use the custom modal to select which tank to apply the mitigation to
            openTankSelectionModal(mitigation.name, (selectedTankPosition) => {
              processMitigationAssignment(selectedBossAction, mitigation, selectedTankPosition);
            }, mitigation, selectedBossAction);

            // Set active mitigation to null and return early
            // The modal callback will handle the assignment when a tank is selected
            setActiveMitigation(null);
            return;
          }
          // If only one tank is selected, use that tank's position
          else if (tankPositions?.mainTank) {
            tankPosition = 'mainTank';
          }
          else if (tankPositions?.offTank) {
            tankPosition = 'offTank';
          }
        }

        // Process the mitigation assignment with the determined tank position
        processMitigationAssignment(selectedBossAction, mitigation, tankPosition);
      }
    }

    setActiveMitigation(null);
  }, [setActiveMitigation, checkAbilityCooldown, canAssignMitigationToBossAction, tankPositions, openTankSelectionModal, processMitigationAssignment]);

  return {
    handleDragStart,
    handleDragEnd
  };
};

export default useDragAndDrop;