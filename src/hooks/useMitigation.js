import { useState, useCallback, useEffect } from 'react';
import { mitigationAbilities } from '../data';
import { getAbilityCooldownForLevel, findActiveMitigationsAtTime } from '../utils';
import useLocalStorage from './useLocalStorage';

/**
 * Custom hook for managing mitigation assignments
 *
 * @param {Array} bossActions - Array of boss action objects
 * @param {number} bossLevel - The level of the boss
 * @returns {Object} - Mitigation state and functions
 */
function useMitigation(bossActions, bossLevel = 90) {
  // Initialize assignments from localStorage or empty object
  const [assignments, setAssignments] = useLocalStorage('mitigationAssignments', {});

  // Track active mitigation being dragged
  const [activeMitigation, setActiveMitigation] = useState(null);

  // Check if an ability would be on cooldown at a specific time based on its previous uses
  const checkAbilityCooldown = useCallback((abilityId, targetTime) => {
    // Find the ability in mitigationAbilities to get its cooldown duration
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) {
      console.log(`Ability ${abilityId} not found in mitigationAbilities`);
      return false;
    }

    // Get the level-specific cooldown duration
    const cooldownDuration = getAbilityCooldownForLevel(ability, bossLevel);

    // Find all boss actions with this ability assigned, sorted by time
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
      .filter(action => action !== null)
      .sort((a, b) => a.time - b.time);

    // If no previous uses, ability is not on cooldown
    if (actionsWithAbility.length === 0) {
      return false;
    }

    // Find the most recent use before the target time
    const previousUses = actionsWithAbility.filter(action => action.time < targetTime);

    if (previousUses.length === 0) {
      return false;
    }

    // Get the most recent use
    const mostRecentUse = previousUses[previousUses.length - 1];

    // Calculate time since last use
    const timeSinceLastUse = targetTime - mostRecentUse.time;

    // Check if the ability is still on cooldown at the target time
    const isOnCooldown = timeSinceLastUse < cooldownDuration;

    if (isOnCooldown) {
      return {
        isOnCooldown: true,
        lastUsedActionId: mostRecentUse.id,
        timeUntilReady: cooldownDuration - timeSinceLastUse,
        lastUsedTime: mostRecentUse.time,
        lastUsedActionName: mostRecentUse.name
      };
    }

    return false;
  }, [assignments, bossActions, bossLevel]);

  // Check and remove future mitigation assignments that would be on cooldown
  const checkAndRemoveFutureConflicts = useCallback((bossActionId, mitigation) => {
    // Find the boss action to get its time
    const bossAction = bossActions.find(action => action.id === bossActionId);
    if (!bossAction) {
      console.log(`Boss action ${bossActionId} not found`);
      return { removedCount: 0, removedActions: [] };
    }

    const bossActionTime = bossAction.time;

    // Get the cooldown duration for this ability
    const cooldownDuration = getAbilityCooldownForLevel(mitigation, bossLevel);

    // Find all actions with this ability assigned, sorted by time
    const actionsWithAbility = Object.entries(assignments)
      .filter(([, mitigations]) => mitigations && mitigations.some(m => m.id === mitigation.id))
      .map(([actionId]) => {
        const action = bossActions.find(a => a.id === actionId);
        if (!action) return null;
        return {
          id: actionId,
          time: action.time,
          name: action.name
        };
      })
      .filter(action => action !== null)
      .sort((a, b) => a.time - b.time);

    // Find future actions that would be on cooldown
    const cooldownEndTime = bossActionTime + cooldownDuration;
    const conflictingActions = actionsWithAbility.filter(action =>
      action.time > bossActionTime && action.time < cooldownEndTime
    );

    if (conflictingActions.length === 0) {
      return { removedCount: 0, removedActions: [] };
    }

    // Remove the mitigation from conflicting actions
    const removedActions = [];
    const newAssignments = { ...assignments };

    conflictingActions.forEach(action => {
      if (newAssignments[action.id]) {
        // Filter out the mitigation from this action
        newAssignments[action.id] = newAssignments[action.id].filter(m => m.id !== mitigation.id);
        removedActions.push(action);
      }
    });

    // Update assignments
    setAssignments(newAssignments);

    return {
      removedCount: removedActions.length,
      removedActions
    };
  }, [assignments, bossActions, bossLevel, setAssignments]);

  // Add a mitigation to a boss action
  const addMitigation = useCallback((bossActionId, mitigation) => {
    // Check if this mitigation is already assigned to this action
    if (assignments[bossActionId] && assignments[bossActionId].some(m => m.id === mitigation.id)) {
      return false;
    }

    // Check for cooldown conflicts and remove future assignments if needed
    const conflicts = checkAndRemoveFutureConflicts(bossActionId, mitigation);

    // Add the mitigation to the assignments
    setAssignments(prev => ({
      ...prev,
      [bossActionId]: [...(prev[bossActionId] || []), mitigation]
    }));

    return {
      success: true,
      conflicts
    };
  }, [assignments, checkAndRemoveFutureConflicts, setAssignments]);

  // Remove a mitigation from a boss action
  const removeMitigation = useCallback((bossActionId, mitigationId) => {
    if (!assignments[bossActionId]) {
      return false;
    }

    setAssignments(prev => ({
      ...prev,
      [bossActionId]: prev[bossActionId].filter(m => m.id !== mitigationId)
    }));

    return true;
  }, [assignments, setAssignments]);

  // Find active mitigations at a specific time
  const getActiveMitigations = useCallback((targetActionId, targetTime) => {
    return findActiveMitigationsAtTime(
      assignments,
      bossActions,
      mitigationAbilities,
      targetActionId,
      targetTime,
      bossLevel
    );
  }, [assignments, bossActions, bossLevel]);

  // Clear all assignments
  const clearAllAssignments = useCallback(() => {
    setAssignments({});
  }, [setAssignments]);

  // Import assignments from external data
  const importAssignments = useCallback((importedAssignments) => {
    setAssignments(importedAssignments);
  }, [setAssignments]);

  // Autosave effect - save the current assignments whenever they change
  useEffect(() => {
    // Already handled by useLocalStorage hook
  }, [assignments]);

  return {
    assignments,
    activeMitigation,
    setActiveMitigation,
    checkAbilityCooldown,
    addMitigation,
    removeMitigation,
    getActiveMitigations,
    clearAllAssignments,
    importAssignments
  };
}

export default useMitigation;
