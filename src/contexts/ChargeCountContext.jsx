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
        const instancesUsed = actionsWithAbility.length;

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
  const addPendingAssignment = useCallback((bossActionId, mitigationId) => {
    // First, check if this assignment already exists to prevent duplicate decrements
    const assignmentExists = pendingAssignments.some(
      pa => pa.bossActionId === bossActionId && pa.mitigationId === mitigationId
    );

    if (!assignmentExists) {
      setPendingAssignments(prev => [
        ...prev,
        { bossActionId, mitigationId, timestamp: Date.now() }
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

        // Only decrement by 1, not to 0
        const newAvailableInstances = Math.max(0, currentCount.availableInstances - 1);

        return {
          ...prev,
          [mitigationId]: {
            ...currentCount,
            instancesUsed: currentCount.instancesUsed + 1,
            availableInstances: newAvailableInstances
          }
        };
      });
    }
  }, [bossLevel, selectedJobs, pendingAssignments]);

  // Remove a pending assignment
  const removePendingAssignment = useCallback((bossActionId, mitigationId) => {
    setPendingAssignments(prev =>
      prev.filter(pa => !(pa.bossActionId === bossActionId && pa.mitigationId === mitigationId))
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

      return {
        ...prev,
        [mitigationId]: {
          ...currentCount,
          instancesUsed: Math.max(0, currentCount.instancesUsed - 1),
          availableInstances: Math.min(currentCount.totalInstances, currentCount.availableInstances + 1)
        }
      };
    });
  }, [bossLevel]);

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
  const canAssignMitigationToBossAction = useCallback((bossActionId, mitigationId) => {
    // Find the ability and boss action
    const ability = mitigationAbilities.find(m => m.id === mitigationId);
    const bossAction = bossActions.find(a => a.id === bossActionId);

    if (!ability || !bossAction) return false;

    // Check if this ability is already assigned to this boss action
    const isAlreadyAssigned = assignments[bossActionId]?.some(m => m.id === mitigationId);

    // If not already assigned, it can be assigned
    if (!isAlreadyAssigned) return true;

    // For tank buster specific mitigations on tank buster actions,
    // allow multiple assignments if there are charges/instances available
    const isTankBusterMitigation = ability.forTankBusters && !ability.forRaidWide;
    const hasTankBusterAction = bossAction.isTankBuster;
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
    addPendingAssignment,
    removePendingAssignment,
    hasPendingAssignment,
    getChargeCount,
    getInstanceCount,
    canAssignMitigationToBossAction
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
