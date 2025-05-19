import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { mitigationAbilities } from '../data';
import {
  getAbilityChargeCount,
  getRoleSharedAbilityCount
} from '../utils';

// Create the context
const ChargeCountContext = createContext();

/**
 * Provider component for tracking charge and instance counts for mitigation abilities
 */
export const ChargeCountProvider = ({ children, bossActions, bossLevel = 90, selectedJobs, assignments }) => {
  // State to track charge counts for each mitigation ability
  const [chargeCounts, setChargeCounts] = useState({});

  // State to track instance counts for role-shared abilities
  const [instanceCounts, setInstanceCounts] = useState({});

  // State to track pending assignments that haven't been fully processed yet
  const [pendingAssignments, setPendingAssignments] = useState([]);

  // Memoize the calculation of charge and instance counts
  // This prevents unnecessary recalculations when other state changes
  const calculateCounts = useCallback(() => {
    const newChargeCounts = {};
    const newInstanceCounts = {};

    // Process all mitigation abilities
    mitigationAbilities.forEach(ability => {
      const abilityId = ability.id;
      const totalCharges = getAbilityChargeCount(ability, bossLevel);
      const isRoleShared = ability.isRoleShared;
      const roleSharedCount = isRoleShared ? getRoleSharedAbilityCount(ability, selectedJobs) : 1;

      // Find all boss actions with this ability assigned
      const actionsWithAbility = Object.entries(assignments)
        .filter(([, mitigations]) => mitigations && mitigations.some(m => m.id === abilityId))
        .map(([actionId]) => {
          const action = bossActions.find(a => a.id === actionId);
          if (!action) return null;
          return {
            id: actionId,
            time: action.time,
            name: action.name
          };
        })
        .filter(action => action !== null);

      // For role-shared abilities, calculate instance counts
      if (isRoleShared) {
        // Total instances available is based on how many jobs that provide this ability are selected
        const totalInstances = roleSharedCount;

        // Count how many boss actions have this ability assigned
        // For self-targeting abilities like Rampart, we need to track per-tank usage
        const isSelfTargeting = ability.target === 'self';

        // For self-targeting abilities, we need to track assignments per tank position
        let instancesUsed = 0;

        if (isSelfTargeting) {
          // For self-targeting abilities, count assignments based on tank position
          // This ensures each tank has their own instance of abilities like Rampart
          const tankPositionCounts = {};

          // Count assignments by tank position
          actionsWithAbility.forEach(actionId => {
            const mitigations = assignments[actionId] || [];
            mitigations.forEach(m => {
              if (m.id === abilityId && m.tankPosition) {
                tankPositionCounts[m.tankPosition] = (tankPositionCounts[m.tankPosition] || 0) + 1;
              }
            });
          });

          // Count unique tank positions that have this ability assigned
          instancesUsed = Object.keys(tankPositionCounts).length;
        } else {
          // For non-self-targeting abilities, count total assignments
          instancesUsed = actionsWithAbility.length;
        }

        // Calculate available instances
        const availableInstances = Math.max(0, totalInstances - instancesUsed);

        newInstanceCounts[abilityId] = {
          totalInstances,
          instancesUsed,
          availableInstances
        };
      }

      // For abilities with multiple charges, calculate charge counts
      if (totalCharges > 1) {
        // Calculate how many charges are used
        const chargesUsed = actionsWithAbility.length;

        // Calculate available charges
        const availableCharges = Math.max(0, totalCharges - chargesUsed);

        newChargeCounts[abilityId] = {
          totalCharges,
          chargesUsed,
          availableCharges
        };
      }
    });

    return { newChargeCounts, newInstanceCounts };
  }, [assignments, selectedJobs, bossActions, bossLevel]);

  // Update charge and instance counts when dependencies change
  useEffect(() => {
    const { newChargeCounts, newInstanceCounts } = calculateCounts();
    setChargeCounts(newChargeCounts);
    setInstanceCounts(newInstanceCounts);
  }, [calculateCounts]);

  // Add a pending assignment
  const addPendingAssignment = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    // First, check if this assignment already exists to prevent duplicate decrements
    const assignmentExists = pendingAssignments.some(
      pa => pa.bossActionId === bossActionId && pa.mitigationId === mitigationId && pa.tankPosition === tankPosition
    );

    if (!assignmentExists) {
      setPendingAssignments(prev => [
        ...prev,
        { bossActionId, mitigationId, tankPosition, timestamp: Date.now() }
      ]);

      // Update charge counts immediately for UI feedback
      setChargeCounts(prev => {
        const ability = mitigationAbilities.find(m => m.id === mitigationId);
        if (!ability || getAbilityChargeCount(ability, bossLevel) <= 1) return prev;

        const currentCount = prev[mitigationId] || {
          totalCharges: getAbilityChargeCount(ability, bossLevel),
          chargesUsed: 0,
          availableCharges: getAbilityChargeCount(ability, bossLevel)
        };

        // Only decrement by 1, not to 0
        const newAvailableCharges = Math.max(0, currentCount.availableCharges - 1);

        return {
          ...prev,
          [mitigationId]: {
            ...currentCount,
            chargesUsed: currentCount.chargesUsed + 1,
            availableCharges: newAvailableCharges
          }
        };
      });

      // Update instance counts immediately for UI feedback
      setInstanceCounts(prev => {
        const ability = mitigationAbilities.find(m => m.id === mitigationId);
        if (!ability || !ability.isRoleShared) return prev;

        const roleSharedCount = getRoleSharedAbilityCount(ability, selectedJobs);
        const currentCount = prev[mitigationId] || {
          totalInstances: roleSharedCount,
          instancesUsed: 0,
          availableInstances: roleSharedCount
        };

        // For self-targeting abilities like Rampart, we need to track per-tank usage
        const isSelfTargeting = ability.target === 'self';

        // Only increment instancesUsed for new tank positions
        let shouldIncrementInstancesUsed = true;

        if (isSelfTargeting && tankPosition) {
          // Check if this tank position already has this ability assigned
          const tankPositionCounts = {};

          // Count existing assignments by tank position
          Object.entries(assignments).forEach(([actionId, mitigations]) => {
            if (mitigations) {
              mitigations.forEach(m => {
                if (m.id === mitigationId && m.tankPosition) {
                  tankPositionCounts[m.tankPosition] = true;
                }
              });
            }
          });

          // Also check pending assignments
          pendingAssignments.forEach(pa => {
            if (pa.mitigationId === mitigationId && pa.tankPosition) {
              tankPositionCounts[pa.tankPosition] = true;
            }
          });

          // Only increment if this tank position doesn't already have this ability assigned
          shouldIncrementInstancesUsed = !tankPositionCounts[tankPosition];
        }

        // Only decrement by 1, not to 0
        const newAvailableInstances = Math.max(0, currentCount.availableInstances - (shouldIncrementInstancesUsed ? 1 : 0));
        const newInstancesUsed = currentCount.instancesUsed + (shouldIncrementInstancesUsed ? 1 : 0);

        return {
          ...prev,
          [mitigationId]: {
            ...currentCount,
            instancesUsed: newInstancesUsed,
            availableInstances: newAvailableInstances
          }
        };
      });
    }
  }, [bossLevel, selectedJobs, pendingAssignments, assignments]);

  // Remove a pending assignment
  const removePendingAssignment = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    // Find the pending assignment to remove
    const pendingAssignment = pendingAssignments.find(pa =>
      pa.bossActionId === bossActionId &&
      pa.mitigationId === mitigationId &&
      (tankPosition === null || pa.tankPosition === tankPosition)
    );

    // If no matching pending assignment is found, return early
    if (!pendingAssignment) return;

    // Get the tank position from the pending assignment
    const assignmentTankPosition = pendingAssignment.tankPosition;

    // Remove the pending assignment
    setPendingAssignments(prev =>
      prev.filter(pa => !(pa.bossActionId === bossActionId && pa.mitigationId === mitigationId &&
        (tankPosition === null || pa.tankPosition === tankPosition)))
    );

    // Update charge counts immediately for UI feedback
    setChargeCounts(prev => {
      const ability = mitigationAbilities.find(m => m.id === mitigationId);
      if (!ability || getAbilityChargeCount(ability, bossLevel) <= 1) return prev;

      const currentCount = prev[mitigationId];
      if (!currentCount) return prev;

      return {
        ...prev,
        [mitigationId]: {
          ...currentCount,
          chargesUsed: Math.max(0, currentCount.chargesUsed - 1),
          availableCharges: Math.min(currentCount.totalCharges, currentCount.availableCharges + 1)
        }
      };
    });

    // Update instance counts immediately for UI feedback
    setInstanceCounts(prev => {
      const ability = mitigationAbilities.find(m => m.id === mitigationId);
      if (!ability || !ability.isRoleShared) return prev;

      const currentCount = prev[mitigationId];
      if (!currentCount) return prev;

      // For self-targeting abilities like Rampart, we need to track per-tank usage
      const isSelfTargeting = ability.target === 'self';

      // Only decrement instancesUsed if this was the only assignment for this tank position
      let shouldDecrementInstancesUsed = true;

      if (isSelfTargeting && assignmentTankPosition) {
        // Check if this tank position has other assignments of this ability
        const hasOtherAssignments = Object.entries(assignments).some(([actionId, mitigations]) => {
          if (mitigations && actionId !== bossActionId) {
            return mitigations.some(m =>
              m.id === mitigationId &&
              m.tankPosition === assignmentTankPosition
            );
          }
          return false;
        });

        // Also check other pending assignments
        const hasOtherPendingAssignments = pendingAssignments.some(pa =>
          pa !== pendingAssignment &&
          pa.mitigationId === mitigationId &&
          pa.tankPosition === assignmentTankPosition
        );

        // Only decrement if there are no other assignments for this tank position
        shouldDecrementInstancesUsed = !hasOtherAssignments && !hasOtherPendingAssignments;
      }

      return {
        ...prev,
        [mitigationId]: {
          ...currentCount,
          instancesUsed: Math.max(0, currentCount.instancesUsed - (shouldDecrementInstancesUsed ? 1 : 0)),
          availableInstances: Math.min(currentCount.totalInstances, currentCount.availableInstances + (shouldDecrementInstancesUsed ? 1 : 0))
        }
      };
    });
  }, [bossLevel, pendingAssignments, assignments]);

  // Check if a mitigation has a pending assignment for a specific boss action
  const hasPendingAssignment = useCallback((bossActionId, mitigationId) => {
    return pendingAssignments.some(pa =>
      pa.bossActionId === bossActionId && pa.mitigationId === mitigationId
    );
  }, [pendingAssignments]);

  // Get charge count for a specific mitigation
  const getChargeCount = useCallback((mitigationId) => {
    return chargeCounts[mitigationId] || null;
  }, [chargeCounts]);

  // Get instance count for a specific mitigation
  const getInstanceCount = useCallback((mitigationId) => {
    return instanceCounts[mitigationId] || null;
  }, [instanceCounts]);

  // Check if a mitigation ability can be assigned to a specific boss action
  const canAssignMitigationToBossAction = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    // Find the ability and boss action
    const ability = mitigationAbilities.find(m => m.id === mitigationId);
    const bossAction = bossActions.find(a => a.id === bossActionId);

    if (!ability || !bossAction) return false;

    // For self-targeting abilities like Rampart, check if this tank position already has this ability assigned
    const isSelfTargeting = ability.target === 'self';

    if (isSelfTargeting && tankPosition) {
      // Check if this tank position already has this ability assigned to this boss action
      const isAlreadyAssignedToTankPosition = assignments[bossActionId]?.some(m =>
        m.id === mitigationId && m.tankPosition === tankPosition
      );

      // If already assigned to this tank position for this boss action, don't allow another assignment
      if (isAlreadyAssignedToTankPosition) return false;
    } else {
      // For non-self-targeting abilities, check if already assigned to this boss action
      const isAlreadyAssigned = assignments[bossActionId]?.some(m => m.id === mitigationId);

      // If not already assigned, it can be assigned
      if (!isAlreadyAssigned) return true;
    }

    // For tank buster specific mitigations on tank buster actions,
    // allow multiple assignments if there are charges/instances available
    const isTankBusterMitigation = ability.forTankBusters && !ability.forRaidWide;
    const hasTankBusterAction = bossAction.isTankBuster || bossAction.isDualTankBuster;
    const hasMultipleCharges = getAbilityChargeCount(ability, bossLevel) > 1;
    const isRoleShared = ability.isRoleShared;
    const hasMultipleInstances = isRoleShared && getRoleSharedAbilityCount(ability, selectedJobs) > 1;

    // Allow tank buster mitigations to be applied multiple times to tank buster actions
    // if they have multiple charges/instances
    if (isTankBusterMitigation && hasTankBusterAction && (hasMultipleCharges || hasMultipleInstances)) {
      // Check if there are available charges/instances
      if (hasMultipleCharges) {
        const chargeCount = chargeCounts[mitigationId];
        return chargeCount && chargeCount.availableCharges > 0;
      }

      if (hasMultipleInstances) {
        const instanceCount = instanceCounts[mitigationId];

        // For self-targeting abilities, check if this tank position already has an instance
        if (isSelfTargeting && tankPosition) {
          // Check if this tank position already has this ability assigned to any boss action
          const hasTankPositionAssignment = Object.values(assignments).some(mitigations =>
            mitigations?.some(m => m.id === mitigationId && m.tankPosition === tankPosition)
          );

          // If this tank position already has this ability assigned, don't allow another assignment
          if (hasTankPositionAssignment) return false;

          // Otherwise, check if there are available instances
          return instanceCount && instanceCount.availableInstances > 0;
        }

        return instanceCount && instanceCount.availableInstances > 0;
      }
    }

    // For all other cases, don't allow multiple assignments to the same boss action
    return false;
  }, [assignments, bossActions, bossLevel, chargeCounts, instanceCounts, selectedJobs]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    chargeCounts,
    instanceCounts,
    pendingAssignments,
    addPendingAssignment, // Now accepts tankPosition parameter
    removePendingAssignment, // Now accepts tankPosition parameter
    hasPendingAssignment,
    getChargeCount,
    getInstanceCount,
    canAssignMitigationToBossAction // Now accepts tankPosition parameter
  }), [
    chargeCounts,
    instanceCounts,
    pendingAssignments,
    addPendingAssignment,
    removePendingAssignment,
    hasPendingAssignment,
    getChargeCount,
    getInstanceCount,
    canAssignMitigationToBossAction
  ]);

  return (
    <ChargeCountContext.Provider value={contextValue}>
      {children}
    </ChargeCountContext.Provider>
  );
};

// Custom hook for using the charge count context
export const useChargeCountContext = () => {
  const context = useContext(ChargeCountContext);
  if (context === undefined) {
    throw new Error('useChargeCountContext must be used within a ChargeCountProvider');
  }
  return context;
};

export default ChargeCountContext;
