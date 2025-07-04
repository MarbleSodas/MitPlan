import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useRealtimePlan } from './RealtimePlanContext';
import { useRealtimeBossContext } from './RealtimeBossContext';
import { useRealtimeJobContext } from './RealtimeJobContext';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';
import { mitigationAbilities } from '../data';
import { getCooldownManager } from '../utils/cooldown/cooldownManager';
import {
  findActiveMitigationsAtTime,
  getAbilityChargeCount,
  getAbilityCooldownForLevel,
  getRoleSharedAbilityCount
} from '../utils';

// Create the context
const RealtimeMitigationContext = createContext();

// Create a provider component
export const RealtimeMitigationProvider = ({ children }) => {
  const {
    assignments: realtimeAssignments,
    updateAssignmentsRealtime,
    isInitialized
  } = useRealtimePlan();

  const { sortedBossActions, currentBossLevel } = useRealtimeBossContext();
  const { selectedJobs } = useRealtimeJobContext();
  const { user } = useAuth();
  const { sessionId, isOwnChange } = useCollaboration();

  const [activeMitigation, setActiveMitigation] = useState(null);
  const [localAssignments, setLocalAssignments] = useState({});
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);

  // Sync real-time assignments to local state
  useEffect(() => {
    if (isInitialized && realtimeAssignments) {
      setLocalAssignments(realtimeAssignments);
    }
  }, [realtimeAssignments, isInitialized]);

  // Check ability cooldown
  const checkAbilityCooldown = useCallback((mitigation, targetActionId, targetTime) => {
    if (!sortedBossActions || !Array.isArray(sortedBossActions) || !localAssignments) {
      return { isOnCooldown: false };
    }

    const targetAction = sortedBossActions.find(action => action.id === targetActionId);
    if (!targetAction) {
      return { isOnCooldown: false };
    }

    // Get ability properties
    const cooldownDuration = getAbilityCooldownForLevel(mitigation, currentBossLevel);
    const totalCharges = getAbilityChargeCount(mitigation, currentBossLevel);
    const isRoleShared = mitigation.isRoleShared;
    const roleSharedCount = isRoleShared ? getRoleSharedAbilityCount(mitigation, selectedJobs) : 1;

    // Find all assignments of this mitigation before the target time
    const previousAssignments = [];
    
    Object.entries(localAssignments).forEach(([actionId, mitigations]) => {
      const action = sortedBossActions.find(a => a.id === actionId);
      if (action && action.time < targetTime) {
        mitigations.forEach(assignedMitigation => {
          if (assignedMitigation.id === mitigation.id) {
            previousAssignments.push({
              actionId,
              time: action.time,
              mitigation: assignedMitigation
            });
          }
        });
      }
    });

    // Sort by time
    previousAssignments.sort((a, b) => a.time - b.time);

    // Check cooldown conflicts
    for (let i = previousAssignments.length - 1; i >= 0; i--) {
      const assignment = previousAssignments[i];
      const timeDiff = targetTime - assignment.time;
      
      if (timeDiff < cooldownDuration) {
        return {
          isOnCooldown: true,
          lastUsedActionId: assignment.actionId,
          timeUntilReady: cooldownDuration - timeDiff,
          lastUsedTime: assignment.time,
          lastUsedActionName: sortedBossActions.find(a => a.id === assignment.actionId)?.name
        };
      }
    }

    return { isOnCooldown: false };
  }, [sortedBossActions, localAssignments, currentBossLevel, selectedJobs]);

  // Add mitigation with real-time sync and conflict resolution
  const addMitigation = useCallback((bossActionId, mitigation, tankPosition = 'shared') => {
    // Check if this mitigation is already assigned to this action for this tank position
    if (localAssignments[bossActionId] && localAssignments[bossActionId].some(m =>
      m.id === mitigation.id && m.tankPosition === tankPosition
    )) {
      return false;
    }

    const timestamp = Date.now();
    const mitigationWithMetadata = {
      ...mitigation,
      tankPosition,
      assignedBy: user?.uid || 'anonymous',
      assignedAt: timestamp,
      sessionId: sessionId || 'unknown'
    };

    // Check if this is an Aetherflow-consuming ability and clear cache immediately for real-time UI updates
    const ability = mitigationAbilities.find(a => a.id === mitigation.id);
    if (ability && ability.consumesAetherflow) {
      const cooldownManager = getCooldownManager();
      if (cooldownManager?.aetherflowTracker) {
        console.log('[RealtimeMitigationContext] Clearing Aetherflow cache before adding stack-consuming ability:', ability.name);
        cooldownManager.aetherflowTracker.clearCache();
      }
    }

    // Add to pending assignments for optimistic updates
    const pendingAssignment = {
      id: `${bossActionId}-${mitigation.id}-${tankPosition}-${timestamp}`,
      bossActionId,
      mitigation: mitigationWithMetadata,
      timestamp,
      status: 'pending'
    };

    setPendingAssignments(prev => [...prev, pendingAssignment]);

    // Update local state immediately (optimistic update)
    const newAssignments = {
      ...localAssignments,
      [bossActionId]: [...(localAssignments[bossActionId] || []), mitigationWithMetadata]
    };

    setLocalAssignments(newAssignments);

    // Track assignment in history
    setAssignmentHistory(prev => [...prev, {
      action: 'add',
      bossActionId,
      mitigation: mitigationWithMetadata,
      timestamp,
      userId: user?.uid || 'anonymous'
    }]);

    // Sync to Firebase with conflict resolution
    if (isInitialized && updateAssignmentsRealtime) {
      updateAssignmentsRealtime(newAssignments).then(() => {
        // Remove from pending assignments on success
        setPendingAssignments(prev => prev.filter(p => p.id !== pendingAssignment.id));
        console.log('[RealtimeMitigationContext] Assignment synced successfully:', {
          bossActionId,
          mitigationId: mitigation.id,
          tankPosition,
          assignedBy: user?.uid
        });
      }).catch((error) => {
        console.error('[RealtimeMitigationContext] Failed to sync assignment:', error);
        // Revert optimistic update on error
        setLocalAssignments(prev => ({
          ...prev,
          [bossActionId]: prev[bossActionId]?.filter(m =>
            !(m.id === mitigation.id && m.tankPosition === tankPosition && m.assignedAt === timestamp)
          ) || []
        }));
        // Remove from pending assignments
        setPendingAssignments(prev => prev.filter(p => p.id !== pendingAssignment.id));
      });
    }

    return true;
  }, [localAssignments, isInitialized, updateAssignmentsRealtime, user, sessionId]);

  // Remove mitigation with real-time sync and conflict resolution
  const removeMitigation = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    if (!localAssignments[bossActionId]) return false;

    const timestamp = Date.now();
    const removedMitigation = localAssignments[bossActionId].find(m => {
      if (tankPosition) {
        return m.id === mitigationId && m.tankPosition === tankPosition;
      }
      return m.id === mitigationId;
    });

    if (!removedMitigation) {
      return false;
    }

    // Check if this is an Aetherflow-consuming ability
    const ability = mitigationAbilities.find(a => a.id === mitigationId);
    const isAetherflowAbility = ability && ability.consumesAetherflow;

    // If this is an Aetherflow-consuming ability, clear the cache immediately for real-time UI updates
    if (isAetherflowAbility) {
      const cooldownManager = getCooldownManager();
      if (cooldownManager?.aetherflowTracker) {
        console.log('[RealtimeMitigationContext] Clearing Aetherflow cache before removing stack-consuming ability:', ability.name);
        cooldownManager.aetherflowTracker.clearCache();
      }
    }

    // Update local state immediately (optimistic update)
    const newAssignments = {
      ...localAssignments,
      [bossActionId]: localAssignments[bossActionId].filter(m => {
        if (tankPosition) {
          return !(m.id === mitigationId && m.tankPosition === tankPosition);
        }
        return m.id !== mitigationId;
      })
    };

    // Remove empty arrays
    if (newAssignments[bossActionId].length === 0) {
      delete newAssignments[bossActionId];
    }

    setLocalAssignments(newAssignments);

    // Track removal in history
    setAssignmentHistory(prev => [...prev, {
      action: 'remove',
      bossActionId,
      mitigation: removedMitigation,
      timestamp,
      userId: user?.uid || 'anonymous'
    }]);

    // Sync to Firebase with conflict resolution
    if (isInitialized && updateAssignmentsRealtime) {
      updateAssignmentsRealtime(newAssignments).then(() => {
        console.log('[RealtimeMitigationContext] Removal synced successfully:', {
          bossActionId,
          mitigationId,
          tankPosition,
          removedBy: user?.uid,
          wasAetherflowAbility: isAetherflowAbility
        });
      }).catch((error) => {
        console.error('[RealtimeMitigationContext] Failed to sync removal:', error);
        // Revert optimistic update on error
        setLocalAssignments(prev => ({
          ...prev,
          [bossActionId]: [...(prev[bossActionId] || []), removedMitigation]
        }));
      });
    }

    return true;
  }, [localAssignments, isInitialized, updateAssignmentsRealtime, user]);

  // Get active mitigations at a specific time
  const getActiveMitigations = useCallback((time) => {
    if (!sortedBossActions || !Array.isArray(sortedBossActions) || !localAssignments) {
      return [];
    }

    // Note: findActiveMitigationsAtTime expects (assignments, bossActions, mitigationAbilities, targetActionId, targetTime, bossLevel)
    return findActiveMitigationsAtTime(localAssignments, sortedBossActions, mitigationAbilities, null, time, currentBossLevel);
  }, [sortedBossActions, localAssignments, currentBossLevel]);

  // Clear all assignments with real-time sync
  const clearAllAssignments = useCallback(() => {
    setLocalAssignments({});

    // Sync to Firebase
    if (isInitialized && updateAssignmentsRealtime) {
      updateAssignmentsRealtime({});
    }
  }, [isInitialized, updateAssignmentsRealtime]);

  // Import assignments with real-time sync
  const importAssignments = useCallback((importedAssignments) => {
    setLocalAssignments(importedAssignments);

    // Sync to Firebase
    if (isInitialized && updateAssignmentsRealtime) {
      updateAssignmentsRealtime(importedAssignments);
    }
  }, [isInitialized, updateAssignmentsRealtime]);

  // Create the context value
  const contextValue = {
    assignments: localAssignments,
    activeMitigation,
    setActiveMitigation,
    checkAbilityCooldown,
    addMitigation,
    removeMitigation,
    getActiveMitigations,
    clearAllAssignments,
    importAssignments,
    pendingAssignments,
    assignmentHistory
  };

  return (
    <RealtimeMitigationContext.Provider value={contextValue}>
      {children}
    </RealtimeMitigationContext.Provider>
  );
};

// Create a custom hook for using the mitigation context
export const useRealtimeMitigationContext = () => {
  const context = useContext(RealtimeMitigationContext);
  if (context === undefined) {
    throw new Error('useRealtimeMitigationContext must be used within a RealtimeMitigationProvider');
  }
  return context;
};

export default RealtimeMitigationContext;
