import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { mitigationAbilities } from '../data';
import { getCooldownManager } from '../utils/cooldown/cooldownManager';
import {
  findActiveMitigationsAtTime,
  getAbilityChargeCount,
  getAbilityCooldownForLevel,
  getRoleSharedAbilityCount,
  loadFromLocalStorage,
  saveToLocalStorage
} from '../utils';
import { useBossContext } from './BossContext';
import { useTankPositionContext } from './TankPositionContext';

// Create the context
const MitigationContext = createContext();

// Create a provider component
export const MitigationProvider = ({ children, bossActions, bossLevel = 90, selectedJobs }) => {
  // Get tank position context
  const { tankPositions } = useTankPositionContext();
  
  // Initialize assignments from localStorage or empty object
  const [assignments, setAssignments] = useState(() => {
    // Try to load from localStorage
    const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', null);
    if (autosavedPlan && autosavedPlan.assignments) {
      try {
        // We need to reconstruct the full objects from the IDs
        const reconstructedAssignments = {};

        // Reconstruct assignments
        Object.entries(autosavedPlan.assignments).forEach(([bossActionId, mitigationData]) => {
          // Check if the data is in the new format (with tankPosition)
          if (Array.isArray(mitigationData)) {
            // Old format - just an array of mitigation IDs
            reconstructedAssignments[bossActionId] = mitigationData.map(id => {
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
          } else {
            // New format - object with tankPosition
            reconstructedAssignments[bossActionId] = [];

            // Process each tank position's mitigations
            Object.entries(mitigationData).forEach(([position, mitigationIds]) => {
              if (position === 'shared') {
                // Shared mitigations (apply to both tanks)
                mitigationIds.forEach(id => {
                  const mitigation = mitigationAbilities.find(m => m.id === id);
                  if (mitigation) {
                    reconstructedAssignments[bossActionId].push({
                      ...mitigation,
                      tankPosition: 'shared'
                    });
                  }
                });
              } else if (position === 'mainTank' || position === 'offTank') {
                // Tank-specific mitigations
                mitigationIds.forEach(id => {
                  const mitigation = mitigationAbilities.find(m => m.id === id);
                  if (mitigation) {
                    reconstructedAssignments[bossActionId].push({
                      ...mitigation,
                      tankPosition: position
                    });
                  }
                });
              }
            });
          }
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
  // isBeingAssigned parameter indicates if this check is for an ability that is currently being assigned
  // targetActionId is the ID of the boss action the ability is being assigned to (if isBeingAssigned is true)
  // This function is critical for determining if an ability can be used and how many charges are available
  const checkAbilityCooldown = useCallback((abilityId, targetTime, isBeingAssigned = false, targetActionId = null) => {
    if (!bossActions) return false;

    // Find the ability in mitigationAbilities to get its cooldown duration
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) return false;

    // Get the number of charges this ability has
    const totalCharges = getAbilityChargeCount(ability, bossLevel);

    // Get the level-specific cooldown duration
    const cooldownDuration = getAbilityCooldownForLevel(ability, bossLevel);

    // For role-shared abilities, get the total number of instances available
    const isRoleShared = ability.isRoleShared;
    const roleSharedCount = isRoleShared ? getRoleSharedAbilityCount(ability, selectedJobs) : 1;

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
      return {
        isOnCooldown: false,
        availableCharges: totalCharges * roleSharedCount,
        totalCharges: totalCharges * roleSharedCount,
        roleSharedCount: roleSharedCount,
        isRoleShared: isRoleShared
      };
    }

    // Find all uses before the target time
    const previousUses = actionsWithAbility.filter(action => action.time < targetTime);

    if (previousUses.length === 0) {
      return {
        isOnCooldown: false,
        availableCharges: totalCharges * roleSharedCount,
        totalCharges: totalCharges * roleSharedCount,
        roleSharedCount: roleSharedCount,
        isRoleShared: isRoleShared
      };
    }

    // Check if the ability is already used on this boss action
    // This enforces the restriction that an ability can only be used once per boss action
    const targetAction = bossActions.find(action => action.time === targetTime);
    if (targetAction && assignments[targetAction.id]?.some(m => m.id === abilityId)) {
      // For tank buster mitigation abilities, allow them to be applied twice to the same boss action
      // if they have multiple charges/instances
      const isTankBusterMitigation = ability.forTankBusters && !ability.forRaidWide;

      // If it's a tank buster specific mitigation and the boss action is a tank buster,
      // allow it to be applied twice if it has multiple charges/instances
      if (isTankBusterMitigation && targetAction.isTankBuster &&
        ((totalCharges > 1) || (isRoleShared && roleSharedCount > 1))) {
        // For tank buster mitigations, we'll continue with the normal cooldown check
        // This will allow a second application if there are charges/instances available
      } else {
        // For raid-wide mitigations or any ability on a non-matching boss action type,
        // prevent multiple assignments to the same boss action regardless of charges/instances
        return {
          isOnCooldown: true,
          lastUsedActionId: targetAction.id,
          timeUntilReady: 0,
          lastUsedTime: targetTime,
          lastUsedActionName: targetAction.name,
          reason: 'already-assigned',
          availableCharges: 0,  // Can't use on this action again
          totalCharges: totalCharges * roleSharedCount,
          roleSharedCount: roleSharedCount,
          isRoleShared: isRoleShared
        };
      }
    }

    // For role-shared abilities, we need to track cooldowns for each instance separately
    if (isRoleShared) {
      // Group previous uses into "instances" based on time
      // Each instance can only be used once per cooldown period
      const instanceGroups = [];

      // Sort previous uses by time (oldest first)
      const sortedUses = [...previousUses].sort((a, b) => a.time - b.time);

      // Assign each use to an instance group
      for (const use of sortedUses) {
        // Try to find an instance group where this use doesn't conflict with cooldowns
        let assigned = false;

        for (const group of instanceGroups) {
          // Check if this use would conflict with any use in this group
          const hasConflict = group.some(existingUse => {
            const timeBetweenUses = Math.abs(use.time - existingUse.time);
            return timeBetweenUses < cooldownDuration;
          });

          // If no conflict, add to this group
          if (!hasConflict) {
            group.push(use);
            assigned = true;
            break;
          }
        }

        // If couldn't assign to any existing group, create a new one
        if (!assigned) {
          instanceGroups.push([use]);
        }
      }

      // Calculate how many instances are still on cooldown at the target time
      let instancesOnCooldown = 0;
      let nextAvailableTime = 0;

      for (const group of instanceGroups) {
        // Find the most recent use in this group
        const mostRecentUse = group.reduce((latest, use) =>
          use.time > latest.time ? use : latest, group[0]);

        // Check if this instance is still on cooldown
        const timeSinceUse = targetTime - mostRecentUse.time;
        if (timeSinceUse < cooldownDuration) {
          instancesOnCooldown++;

          // Track when the next instance will be available
          const timeUntilReady = cooldownDuration - timeSinceUse;
          if (nextAvailableTime === 0 || timeUntilReady < nextAvailableTime) {
            nextAvailableTime = timeUntilReady;
          }
        }
      }

      // Calculate available instances
      let availableInstances = Math.max(0, roleSharedCount - instancesOnCooldown);

      // If this ability is being assigned to the current boss action,
      // decrement the available instances to reflect the current assignment
      if (isBeingAssigned && targetActionId) {
        availableInstances = Math.max(0, availableInstances - 1);
      }

      // If no instances are available, return cooldown info
      if (availableInstances === 0) {
        return {
          isOnCooldown: true,
          timeUntilReady: nextAvailableTime,
          availableCharges: 0,
          totalCharges: totalCharges * roleSharedCount,
          roleSharedCount: roleSharedCount,
          isRoleShared: true,
          instancesUsed: instancesOnCooldown,
          totalInstances: roleSharedCount
        };
      }

      // If we reach here, at least one instance is available
      return {
        isOnCooldown: false,
        availableCharges: availableInstances * totalCharges,
        totalCharges: totalCharges * roleSharedCount,
        roleSharedCount: roleSharedCount,
        isRoleShared: true,
        instancesUsed: instancesOnCooldown,
        totalInstances: roleSharedCount
      };
    }
    // For abilities with multiple charges (but not role-shared)
    else if (totalCharges > 1) {
      // Calculate how many charges are available
      let availableCharges = totalCharges;

      // Sort previous uses by time (oldest first)
      const sortedUses = [...previousUses].sort((a, b) => a.time - b.time);

      // For each previous use, check if it's still on cooldown
      // and decrement available charges if it is
      for (let i = 0; i < sortedUses.length; i++) {
        const use = sortedUses[i];
        const timeSinceUse = targetTime - use.time;

        // If this use is still on cooldown
        if (timeSinceUse < cooldownDuration) {
          availableCharges--;
        } else {
          // If this use has recovered, all earlier uses have also recovered
          // (since they're sorted by time)
          break;
        }
      }

      // If this ability is being assigned to the current boss action,
      // decrement the available charges to reflect the current assignment
      if (isBeingAssigned && targetActionId) {
        availableCharges--;
      }

      // Ensure we don't go below 0 available charges
      availableCharges = Math.max(0, availableCharges);

      // If no charges are available, return cooldown info
      if (availableCharges === 0) {
        // Find the oldest use that's still on cooldown
        // This is the one that will recover first
        const usesOnCooldown = sortedUses.filter(use =>
          (targetTime - use.time) < cooldownDuration
        );

        const oldestUseOnCooldown = usesOnCooldown[0];
        const timeSinceOldestUse = targetTime - oldestUseOnCooldown.time;

        return {
          isOnCooldown: true,
          lastUsedActionId: oldestUseOnCooldown.id,
          timeUntilReady: cooldownDuration - timeSinceOldestUse,
          lastUsedTime: oldestUseOnCooldown.time,
          lastUsedActionName: oldestUseOnCooldown.name,
          chargesUsed: totalCharges - availableCharges,
          availableCharges: availableCharges,
          totalCharges: totalCharges,
          isRoleShared: false
        };
      }

      // If we reach here, at least one charge is available
      return {
        isOnCooldown: false,
        availableCharges: availableCharges,
        totalCharges: totalCharges,
        chargesUsed: totalCharges - availableCharges,
        isRoleShared: false
      };
    } else {
      // For abilities with a single charge, just check the most recent use
      const mostRecentUse = previousUses[previousUses.length - 1];
      const timeSinceLastUse = targetTime - mostRecentUse.time;

      // Check if the ability is still on cooldown at the target time
      const isOnCooldown = timeSinceLastUse < cooldownDuration;

      if (isOnCooldown) {
        return {
          isOnCooldown: true,
          lastUsedActionId: mostRecentUse.id,
          timeUntilReady: cooldownDuration - timeSinceLastUse,
          lastUsedTime: mostRecentUse.time,
          lastUsedActionName: mostRecentUse.name,
          chargesUsed: 1,
          availableCharges: 0,
          totalCharges: 1,
          isRoleShared: false
        };
      } else {
        return {
          isOnCooldown: false,
          availableCharges: 1,
          totalCharges: 1,
          chargesUsed: 0,
          isRoleShared: false
        };
      }
    }
  }, [assignments, bossActions, bossLevel, selectedJobs]);

  // Check and remove future mitigation assignments that would be on cooldown
  const checkAndRemoveFutureConflicts = useCallback((bossActionId, mitigation) => {
    if (!bossActions) return { removedCount: 0, removedActions: [] };

    // Find the boss action to get its time
    const bossAction = bossActions.find(action => action.id === bossActionId);
    if (!bossAction) {
      return { removedCount: 0, removedActions: [] };
    }

    const bossActionTime = bossAction.time;

    // Get the number of charges this ability has
    const totalCharges = getAbilityChargeCount(mitigation, bossLevel);

    // Get the cooldown duration for this ability
    const cooldownDuration = getAbilityCooldownForLevel(mitigation, bossLevel);

    // Check if this is a role-shared ability
    const isRoleShared = mitigation.isRoleShared;
    const roleSharedCount = isRoleShared ? getRoleSharedAbilityCount(mitigation, selectedJobs) : 1;

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

    // For role-shared abilities, we need to handle each instance separately
    if (isRoleShared) {
      // Find all future actions with this ability assigned
      const futureActions = actionsWithAbility.filter(action => action.time > bossActionTime);

      // If there are no future actions, no conflicts to resolve
      if (futureActions.length === 0) {
        return { removedCount: 0, removedActions: [] };
      }

      // Add the current action to the list of actions with this ability
      const allActions = [
        ...actionsWithAbility.filter(action => action.time <= bossActionTime),
        { id: bossActionId, time: bossActionTime, name: bossAction.name },
        ...futureActions
      ].sort((a, b) => a.time - b.time);

      // Group actions into instance groups based on cooldown periods
      // Each instance can handle one use per cooldown period
      const instanceGroups = Array.from({ length: roleSharedCount }, () => []);
      const removedActions = [];
      const newAssignments = { ...assignments };

      // First, assign all existing actions to instance groups
      for (const action of allActions) {
        // Skip the action we're adding to
        if (action.id === bossActionId) continue;

        // Try to find an instance group where this action doesn't conflict with cooldowns
        let assigned = false;

        for (const group of instanceGroups) {
          // Check if this action would conflict with any action in this group
          const hasConflict = group.some(existingAction => {
            const timeBetweenActions = Math.abs(action.time - existingAction.time);
            return timeBetweenActions < cooldownDuration;
          });

          // If no conflict, add to this group
          if (!hasConflict) {
            group.push(action);
            assigned = true;
            break;
          }
        }

        // If couldn't assign to any existing group and it's a future action,
        // remove the mitigation from this action
        if (!assigned && action.time > bossActionTime) {
          if (newAssignments[action.id]) {
            // Filter out the mitigation from this action
            newAssignments[action.id] = newAssignments[action.id].filter(m => m.id !== mitigation.id);
            removedActions.push(action);
          }
        }
      }

      // Update assignments if we removed any
      if (removedActions.length > 0) {
        setAssignments(newAssignments);
      }

      return {
        removedCount: removedActions.length,
        removedActions
      };
    }
    // If this ability has multiple charges (but not role-shared), we need to handle it differently
    else if (totalCharges > 1) {
      // Find all future actions with this ability assigned
      const futureActions = actionsWithAbility.filter(action => action.time > bossActionTime);

      // If there are no future actions, no conflicts to resolve
      if (futureActions.length === 0) {
        return { removedCount: 0, removedActions: [] };
      }

      // For each future action, check if adding this mitigation would exceed the charge count
      const removedActions = [];
      const newAssignments = { ...assignments };

      // Add the current action to the list of actions with this ability
      const allActions = [
        ...actionsWithAbility.filter(action => action.time <= bossActionTime),
        { id: bossActionId, time: bossActionTime, name: bossAction.name },
        ...futureActions
      ].sort((a, b) => a.time - b.time);

      // For each action time point, calculate available charges
      // and remove actions where no charges would be available
      for (let i = 0; i < allActions.length; i++) {
        const currentAction = allActions[i];

        // Skip the action we're adding to
        if (currentAction.id === bossActionId) continue;

        // Calculate available charges at this time point
        let availableCharges = totalCharges;

        // Check all previous uses and decrement available charges if they're still on cooldown
        for (let j = 0; j < i; j++) {
          const previousAction = allActions[j];
          const timeSincePreviousUse = currentAction.time - previousAction.time;

          // If this previous use is still on cooldown
          if (timeSincePreviousUse < cooldownDuration) {
            availableCharges--;
          }
        }

        // If no charges are available at this time point and it's a future action,
        // remove the mitigation from this action
        if (availableCharges <= 0 && currentAction.time > bossActionTime) {
          if (newAssignments[currentAction.id]) {
            // Filter out the mitigation from this action
            newAssignments[currentAction.id] = newAssignments[currentAction.id].filter(m => m.id !== mitigation.id);
            removedActions.push(currentAction);
          }
        }
      }

      // Update assignments if we removed any
      if (removedActions.length > 0) {
        setAssignments(newAssignments);
      }

      return {
        removedCount: removedActions.length,
        removedActions
      };
    } else {
      // For abilities with a single charge, use the original logic
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
    }
  }, [assignments, bossActions, bossLevel, selectedJobs]);

  // Add a mitigation to a boss action
  const addMitigation = useCallback((bossActionId, mitigation, tankPosition = 'shared') => {
    // Store the original tankPosition for debugging purposes
    const originalTankPosition = tankPosition;
    // Determine if this is a tank-specific mitigation (self-target)
    const isTankSpecific = mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide;

    // Determine if this is a single-target mitigation that can be cast on tanks
    const isSingleTargetTankMitigation = mitigation.target === 'single' && mitigation.forTankBusters;

    // For tank-specific self-targeting mitigations, always verify job compatibility
    // regardless of provided tankPosition to ensure it's correctly assigned
    if (isTankSpecific) {
      // Check which tank has access to this ability
      const mainTankJob = tankPositions?.mainTank;
      const offTankJob = tankPositions?.offTank;
      
      const canMainTankUse = mainTankJob && mitigation.jobs.includes(mainTankJob);
      const canOffTankUse = offTankJob && mitigation.jobs.includes(offTankJob);
      
      // Override tankPosition if job compatibility doesn't match provided position
      if (canMainTankUse && !canOffTankUse) {
        // Only main tank can use this ability
        tankPosition = 'mainTank';
      } else if (canOffTankUse && !canMainTankUse) {
        // Only off tank can use this ability
        tankPosition = 'offTank';
      } else if (canMainTankUse && canOffTankUse) {
        // If both tanks can use it, respect the provided tankPosition
        if (['mainTank', 'offTank'].includes(tankPosition)) {
          // Keep the explicit tank position that was provided
        } else {
          // If no specific position was provided, default to mainTank
          // Note: The modal should have handled this case in the UI layer
          tankPosition = 'mainTank';
        }
      } else if (!['mainTank', 'offTank'].includes(tankPosition)) {
        // If tankPosition isn't set and neither can use, default to mainTank as fallback
        tankPosition = 'mainTank';
      }
      // If tankPosition is already set to mainTank/offTank, keep it as is
    }

    // For single-target tank mitigations
    if (isSingleTargetTankMitigation) {
      // For single-target mitigation, we need to force a valid target
      if (!['mainTank', 'offTank'].includes(tankPosition)) {
        // Check which tank has access to this ability (for single-target abilities that can be cast on tanks)
        const mainTankJob = tankPositions?.mainTank;
        const offTankJob = tankPositions?.offTank;
        
        // For single-target abilities, what matters is which job can CAST the ability
        // not which job will receive it (since these can generally be cast on any tank)
        const canMainTankUse = mainTankJob && mitigation.jobs.includes(mainTankJob);
        const canOffTankUse = offTankJob && mitigation.jobs.includes(offTankJob);
        
        if (canMainTankUse && !canOffTankUse) {
          // Only main tank can cast this ability, but can target either tank
          // In this case, target defaults to main tank
          tankPosition = 'mainTank';
        } else if (canOffTankUse && !canMainTankUse) {
          // Only off tank can cast this ability, but can target either tank
          // In this case, target defaults to off tank
          tankPosition = 'offTank';
        } else {
          // Both tanks can use it or neither can - default to mainTank
          tankPosition = 'mainTank';
        }
      }
      // If tankPosition is already set to mainTank/offTank, keep it as is
    }

    // For party-wide mitigations, always use 'shared'
    if (!isTankSpecific && !isSingleTargetTankMitigation) {
      tankPosition = 'shared';
    }

    // Debug log for tank-specific mitigations
    if (mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) {
      console.log('[DEBUG] Tank-specific self-targeting mitigation in addMitigation:', {
        mitigationName: mitigation.name,
        initialTankPosition: originalTankPosition, // The original tankPosition argument
        finalTankPosition: tankPosition, // The possibly modified tankPosition
        mitigationJobs: mitigation.jobs,
        mainTankJob: tankPositions?.mainTank,
        offTankJob: tankPositions?.offTank,
        canMainTankUse: tankPositions?.mainTank && mitigation.jobs.includes(tankPositions?.mainTank),
        canOffTankUse: tankPositions?.offTank && mitigation.jobs.includes(tankPositions?.offTank)
      });
    }

    // Add tankPosition to the mitigation object
    const mitigationWithPosition = {
      ...mitigation,
      tankPosition
    };

    // Check if this mitigation is already assigned to this action for this tank position
    if (assignments[bossActionId] && assignments[bossActionId].some(m =>
      m.id === mitigation.id && m.tankPosition === tankPosition
    )) {
      return false;
    }

    // Check for cooldown conflicts and remove future assignments if needed
    const conflicts = checkAndRemoveFutureConflicts(bossActionId, mitigation);

    // If this is an Aetherflow-consuming ability, clear the cache immediately for real-time UI updates
    if (mitigation.consumesAetherflow) {
      const cooldownManager = getCooldownManager();
      if (cooldownManager?.aetherflowTracker) {
        console.log('[MitigationContext] Clearing Aetherflow cache before adding stack-consuming ability:', mitigation.name);
        cooldownManager.aetherflowTracker.clearCache();
      }
    }

    // Add the mitigation to the assignments
    setAssignments(prev => ({
      ...prev,
      [bossActionId]: [...(prev[bossActionId] || []), mitigationWithPosition]
    }));

    // Check if this is an Aetherflow ability
    if (mitigation.consumesAetherflow) {
      // If we have access to the Aetherflow context, check if we can use the ability
      if (aetherflowContextRef.current) {
        const { useAetherflowStack } = aetherflowContextRef.current;
        // Use an Aetherflow stack
        useAetherflowStack();
      }
    }

    // Check if this is the Aetherflow ability itself
    if (mitigation.isAetherflowProvider) {
      // If we have access to the Aetherflow context, refresh stacks
      if (aetherflowContextRef.current) {
        const { refreshAetherflowStacks } = aetherflowContextRef.current;

        // Find the boss action to get its time
        const bossAction = bossActions.find(action => action.id === bossActionId);
        if (bossAction) {
          // Refresh Aetherflow stacks
          refreshAetherflowStacks(bossAction.time);
        }
      }
    }

    return {
      success: true,
      conflicts
    };
  }, [assignments, checkAndRemoveFutureConflicts, bossActions]);

  // Remove a mitigation from a boss action
  const removeMitigation = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    if (!assignments[bossActionId]) {
      return false;
    }

    // Find the mitigation being removed
    // If tankPosition is provided, only remove the mitigation for that tank position
    const mitigation = tankPosition
      ? assignments[bossActionId].find(m => m.id === mitigationId && m.tankPosition === tankPosition)
      : assignments[bossActionId].find(m => m.id === mitigationId);

    // If this is an Aetherflow-consuming ability, clear the cache to trigger recalculation
    const ability = mitigationAbilities.find(a => a.id === mitigationId);
    if (mitigation && ability && ability.consumesAetherflow) {
      // Clear the Aetherflow cache to trigger recalculation
      const cooldownManager = getCooldownManager();
      if (cooldownManager?.aetherflowTracker) {
        console.log('[MitigationContext] Clearing Aetherflow cache after removing stack-consuming ability:', ability.name);
        cooldownManager.aetherflowTracker.clearCache();
      }

      // If we have access to the Aetherflow context, trigger recalculation
      if (aetherflowContextRef.current) {
        // The useEffect in AetherflowContext will handle the recalculation
        // when assignments change
      }
    }

    setAssignments(prev => ({
      ...prev,
      [bossActionId]: tankPosition
        ? prev[bossActionId].filter(m => !(m.id === mitigationId && m.tankPosition === tankPosition))
        : prev[bossActionId].filter(m => m.id !== mitigationId)
    }));

    return true;
  }, [assignments]);

  // Find active mitigations at a specific time
  const getActiveMitigations = useCallback((targetActionId, targetTime, tankPosition = null) => {
    if (!bossActions) return [];

    // Get all active mitigations
    const activeMitigations = findActiveMitigationsAtTime(
      assignments,
      bossActions,
      mitigationAbilities,
      targetActionId,
      targetTime,
      bossLevel
    );

    // If no tank position is specified, return all mitigations
    if (!tankPosition) {
      return activeMitigations;
    }

    // We no longer need to check for dual tank busters since we're properly
    // filtering by tank position and targeting type for all mitigation abilities

    // Filter mitigations based on tank position
    return activeMitigations.filter(mitigation => {
      // Get the full mitigation ability data
      const fullMitigation = mitigationAbilities.find(m => m.id === mitigation.id);
      if (!fullMitigation) return false;

      // For self-targeting abilities (like Rampart), only include if they match this tank position
      if (fullMitigation.target === 'self') {
        return mitigation.tankPosition === tankPosition;
      }

      // For single-target abilities (like Intervention, Heart of Corundum)
      // Only include if they're specifically targeted at this tank position
      if (fullMitigation.target === 'single') {
        return mitigation.tankPosition === tankPosition;
      }

      // For party-wide abilities (like Reprisal, Divine Veil), include for all tanks
      if (fullMitigation.target === 'party' || fullMitigation.target === 'area') {
        return true;
      }

      // Include mitigations specifically for this tank position
      if (mitigation.tankPosition === tankPosition) {
        return true;
      }

      // Include shared mitigations
      if (mitigation.tankPosition === 'shared') {
        return true;
      }

      // For mitigations without a tankPosition property:
      // - If it's a tank-specific mitigation (self-target, tank buster only), assume it's for the main tank
      if (!mitigation.tankPosition && fullMitigation.target === 'self' && fullMitigation.forTankBusters && !fullMitigation.forRaidWide) {
        return tankPosition === 'mainTank';
      }

      // For abilities without a specific target, include only if they're shared or for this tank
      return mitigation.tankPosition === 'shared' || !mitigation.tankPosition;
    });
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
      // Group mitigations by tank position
      const groupedMitigations = {
        shared: [],
        mainTank: [],
        offTank: []
      };

      // Sort mitigations into their respective groups
      mitigations.forEach(mitigation => {
        const position = mitigation.tankPosition || 'shared';
        if (['shared', 'mainTank', 'offTank'].includes(position)) {
          groupedMitigations[position].push(mitigation.id);
        } else {
          // Fallback for any mitigations without a position
          groupedMitigations.shared.push(mitigation.id);
        }
      });

      // Only include non-empty groups in the optimized assignments
      const positionAssignments = {};
      Object.entries(groupedMitigations).forEach(([position, ids]) => {
        if (ids.length > 0) {
          positionAssignments[position] = ids;
        }
      });

      // Store the grouped mitigation IDs
      optimizedAssignments[bossActionId] = positionAssignments;
    });

    // Create the autosave data
    const autosaveData = {
      version: '1.3', // Increment version to indicate new format
      lastSaved: new Date().toISOString(),
      assignments: optimizedAssignments
    };

    // Save to localStorage
    saveToLocalStorage('mitPlanAutosave', autosaveData);
  }, [assignments]);

  // Reference to the Aetherflow context
  const aetherflowContextRef = useRef(null);

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

  // Set up a function to receive the Aetherflow context
  const setAetherflowContext = (context) => {
    aetherflowContextRef.current = context;
  };

  // Set up a function to receive the TankPosition context
  const tankPositionContextRef = useRef(null);
  const setTankPositionContext = (context) => {
    tankPositionContextRef.current = context;
  };

  return (
    <MitigationContext.Provider value={{
      ...contextValue,
      setAetherflowContext,
      setTankPositionContext
    }}>
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
