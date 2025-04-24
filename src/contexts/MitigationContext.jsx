import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { mitigationAbilities } from '../data';
import { findActiveMitigationsAtTime } from '../utils';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';

// Create the context
const MitigationContext = createContext();

// Create a provider component
export const MitigationProvider = ({ children, bossActions, bossLevel = 90 }) => {
  // Initialize assignments from localStorage or empty object
  const [assignments, setAssignments] = useState(() => {
    // Try to load from localStorage
    const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', null);
    if (autosavedPlan && autosavedPlan.assignments) {
      try {
        // We need to reconstruct the full objects from the IDs
        const reconstructedAssignments = {};

        // Reconstruct assignments
        Object.entries(autosavedPlan.assignments).forEach(([bossActionId, mitigationIds]) => {
          reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
            // Find the full mitigation object by ID
            const mitigation = mitigationAbilities.find(m => m.id === id);
            return mitigation || { 
              id, 
              name: 'Unknown Ability', 
              description: 'Ability not found', 
              duration: 0, 
              cooldown: 0, 
              jobs: [], 
              icon: '', 
              type: 'unknown' 
            };
          });
        });
        return reconstructedAssignments;
      } catch (err) {
        console.error('Error loading autosaved plan:', err);
      }
    }
    return {};
  });
  
  // Track active mitigation being dragged
  const [activeMitigation, setActiveMitigation] = useState(null);

  // Check if an ability would be on cooldown at a specific time based on its previous uses
  const checkAbilityCooldown = useCallback((abilityId, targetTime) => {
    if (!bossActions) return false;
    
    // Find the ability in mitigationAbilities to get its cooldown duration
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) return false;

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

    // Get the level-specific cooldown duration
    let cooldownDuration = ability.cooldown;
    if (ability.levelCooldowns) {
      const availableLevels = Object.keys(ability.levelCooldowns)
        .map(Number)
        .filter(level => level <= bossLevel)
        .sort((a, b) => b - a);

      if (availableLevels.length > 0) {
        cooldownDuration = ability.levelCooldowns[availableLevels[0]];
      }
    }

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
    if (!bossActions) return { removedCount: 0, removedActions: [] };
    
    // Find the boss action to get its time
    const bossAction = bossActions.find(action => action.id === bossActionId);
    if (!bossAction) {
      return { removedCount: 0, removedActions: [] };
    }

    const bossActionTime = bossAction.time;

    // Get the cooldown duration for this ability
    let cooldownDuration = mitigation.cooldown;
    if (mitigation.levelCooldowns) {
      const availableLevels = Object.keys(mitigation.levelCooldowns)
        .map(Number)
        .filter(level => level <= bossLevel)
        .sort((a, b) => b - a);

      if (availableLevels.length > 0) {
        cooldownDuration = mitigation.levelCooldowns[availableLevels[0]];
      }
    }

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
  }, [assignments, bossActions, bossLevel]);

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
  }, [assignments, checkAndRemoveFutureConflicts]);

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
  }, [assignments]);

  // Find active mitigations at a specific time
  const getActiveMitigations = useCallback((targetActionId, targetTime) => {
    if (!bossActions) return [];
    
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
  }, []);

  // Import assignments from external data
  const importAssignments = useCallback((importedAssignments) => {
    setAssignments(importedAssignments);
  }, []);

  // Autosave effect - save the current assignments whenever they change
  useEffect(() => {
    // Create optimized assignments object with only the necessary data
    const optimizedAssignments = {};

    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      // Store only the mitigation IDs instead of the full objects
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => mitigation.id);
    });

    // Create the autosave data
    const autosaveData = {
      version: '1.2',
      lastSaved: new Date().toISOString(),
      assignments: optimizedAssignments
    };

    // Save to localStorage
    saveToLocalStorage('mitPlanAutosave', autosaveData);
  }, [assignments]);

  // Create the context value
  const contextValue = {
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

  return (
    <MitigationContext.Provider value={contextValue}>
      {children}
    </MitigationContext.Provider>
  );
};

// Create a custom hook for using the mitigation context
export const useMitigationContext = () => {
  const context = useContext(MitigationContext);
  if (context === undefined) {
    throw new Error('useMitigationContext must be used within a MitigationProvider');
  }
  return context;
};

export default MitigationContext;
