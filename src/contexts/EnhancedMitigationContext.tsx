import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAbilityDurationForLevel, getAbilityCooldownForLevel, getRoleSharedAbilityCount } from '../utils/abilities/abilityUtils';
import { mitigationAbilities } from '../data';
import { CooldownManager, getCooldownManager, updateCooldownManager } from '../utils/cooldown/cooldownManager';
import { initializeCooldownSystem } from '../utils/cooldown';
import { findActiveMitigationsAtTime } from '../utils';
import { useTankPositionContext } from './TankPositionContext';
import { useRealtimePlan } from './RealtimePlanContext';
import { useRealtimeBossContext } from './RealtimeBossContext';

// Create the context
const EnhancedMitigationContext = createContext();

// Create a provider component for realtime contexts
export const EnhancedMitigationProvider = ({ children }) => {
  // Get dependencies from realtime contexts
  const realtimeBoss = useRealtimeBossContext();
  const { tankPositions, registerTankPositionChangeHandler } = useTankPositionContext();
  const realtimePlan = useRealtimePlan();

  const currentBossActions = realtimeBoss.sortedBossActions;
  const selectedBossAction = realtimeBoss.selectedBossAction;
  const currentBossLevel = realtimeBoss.currentBossLevel;
  const selectedJobs = realtimePlan.selectedJobs;
  const assignments = realtimePlan.assignments;
  const updateAssignmentsRealtime = realtimePlan.updateAssignmentsRealtime;
  const isInitialized = realtimePlan.isInitialized;

  // Local state for pending assignments (for immediate UI feedback)
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // Ref to track the cooldown manager
  const cooldownManagerRef = useRef(null);

  // Log context status for debugging
  useEffect(() => {
    console.log('[EnhancedMitigationContext] Context status:', {
      isInitialized,
      bossActionsCount: currentBossActions?.length || 0,
      selectedJobsCount: Object.keys(selectedJobs || {}).length,
      assignmentsCount: Object.keys(assignments || {}).length,
      cooldownManagerExists: !!cooldownManagerRef.current,
      aetherflowTrackerExists: !!cooldownManagerRef.current?.aetherflowTracker
    });
  }, [isInitialized, currentBossActions, selectedJobs, assignments]);

  /**
   * Handle tank position changes by updating mitigation assignments
   * This function is called when tank positions change to ensure assignments remain valid
   */
  const handleTankPositionChange = useCallback(async (oldPositions, newPositions) => {
    if (!assignments || !isInitialized || !updateAssignmentsRealtime) {
      console.log('[EnhancedMitigationContext] Skipping tank position change handling - not ready');
      return;
    }

    console.log('[EnhancedMitigationContext] Handling tank position change:', {
      oldPositions,
      newPositions,
      assignmentCount: Object.keys(assignments).length
    });

    const updatedAssignments = { ...assignments };
    const changes = [];
    let hasChanges = false;

    // Process each boss action's assignments
    for (const [bossActionId, actionAssignments] of Object.entries(assignments)) {
      if (!Array.isArray(actionAssignments)) continue;

      const updatedActionAssignments = [];

      for (const assignment of actionAssignments) {
        const mitigation = mitigationAbilities.find(m => m.id === assignment.id);
        if (!mitigation) {
          // Keep assignment if we can't find the mitigation data
          updatedActionAssignments.push(assignment);
          continue;
        }

        const processedAssignment = processAssignmentForPositionChange(
          assignment,
          mitigation,
          oldPositions,
          newPositions
        );

        if (processedAssignment) {
          updatedActionAssignments.push(processedAssignment);

          // Track changes for logging
          if (processedAssignment.tankPosition !== assignment.tankPosition) {
            changes.push({
              bossActionId,
              mitigation: mitigation.name,
              oldPosition: assignment.tankPosition,
              newPosition: processedAssignment.tankPosition,
              reason: 'position_change'
            });
            hasChanges = true;
          }
        } else {
          // Assignment was removed due to incompatibility
          changes.push({
            bossActionId,
            mitigation: mitigation.name,
            oldPosition: assignment.tankPosition,
            newPosition: null,
            reason: 'incompatible_job'
          });
          hasChanges = true;
        }
      }

      updatedAssignments[bossActionId] = updatedActionAssignments;
    }

    // Update assignments if there were changes
    if (hasChanges) {
      console.log('[EnhancedMitigationContext] Tank position changes detected:', changes);

      try {
        await updateAssignmentsRealtime(updatedAssignments);
        console.log('[EnhancedMitigationContext] Successfully updated assignments for tank position change');
      } catch (error) {
        console.error('[EnhancedMitigationContext] Error updating assignments for tank position change:', error);
      }
    } else {
      console.log('[EnhancedMitigationContext] No assignment changes needed for tank position change');
    }
  }, [assignments, isInitialized, updateAssignmentsRealtime]);

  /**
   * Process a single assignment for tank position changes
   */
  const processAssignmentForPositionChange = useCallback((assignment, mitigation, oldPositions, newPositions) => {
    // Case 1: Self-target tank-specific abilities
    if (mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) {
      return handleSelfTargetAssignmentForPositionChange(assignment, mitigation, newPositions);
    }

    // Case 2: Single-target abilities that target tanks
    if (mitigation.target === 'single' && mitigation.targetsTank) {
      return handleSingleTargetAssignmentForPositionChange(assignment, mitigation, newPositions);
    }

    // Case 3: Party/area abilities or non-tank-specific abilities - no change needed
    // These assignments remain as-is since they don't depend on specific tank positions
    return assignment;
  }, []);

  /**
   * Handle self-target tank-specific ability assignments during position changes
   */
  const handleSelfTargetAssignmentForPositionChange = useCallback((assignment, mitigation, newPositions) => {
    const { tankPosition } = assignment;

    // For shared assignments, no change needed
    if (tankPosition === 'shared') {
      return assignment;
    }

    // Get the new tank job at this position
    const newTankJob = newPositions[tankPosition];

    if (!newTankJob) {
      // No tank assigned to this position anymore - remove the assignment
      return null;
    }

    // Check if the new tank job can use this ability
    const canNewTankUse = mitigation.jobs.includes(newTankJob);

    if (canNewTankUse) {
      // New tank can use this ability - keep the assignment at the same position
      return assignment;
    }

    // New tank can't use this ability - try to reassign to a compatible tank
    const mainTankJob = newPositions.mainTank;
    const offTankJob = newPositions.offTank;

    const canMainTankUse = mainTankJob && mitigation.jobs.includes(mainTankJob);
    const canOffTankUse = offTankJob && mitigation.jobs.includes(offTankJob);

    if (canMainTankUse && tankPosition !== 'mainTank') {
      // Reassign to main tank
      return { ...assignment, tankPosition: 'mainTank' };
    } else if (canOffTankUse && tankPosition !== 'offTank') {
      // Reassign to off tank
      return { ...assignment, tankPosition: 'offTank' };
    }

    // No compatible tank found - remove the assignment
    return null;
  }, []);

  /**
   * Handle single-target ability assignments during position changes
   */
  const handleSingleTargetAssignmentForPositionChange = useCallback((assignment, mitigation, newPositions) => {
    // For single-target abilities, we need to check if the caster job is still available
    // The assignment stays with the same tank position, but we need to verify compatibility

    const { tankPosition } = assignment;

    // For shared assignments, no change needed (these are typically party-wide abilities)
    if (tankPosition === 'shared') {
      return assignment;
    }

    // Get the new tank job at this position (this is the target of the ability)
    const targetTankJob = newPositions[tankPosition];

    if (!targetTankJob) {
      // No tank assigned to this position anymore - remove the assignment
      return null;
    }

    // For single-target abilities, we need to check if any selected tank can cast this ability
    // The ability should remain assigned to the same target position
    const mainTankJob = newPositions.mainTank;
    const offTankJob = newPositions.offTank;

    const canMainTankCast = mainTankJob && mitigation.jobs.includes(mainTankJob);
    const canOffTankCast = offTankJob && mitigation.jobs.includes(offTankJob);

    if (canMainTankCast || canOffTankCast) {
      // At least one tank can cast this ability - keep the assignment
      return assignment;
    }

    // No tank can cast this ability anymore - remove the assignment
    return null;
  }, []);

  // Register tank position change handler
  useEffect(() => {
    if (!registerTankPositionChangeHandler || !handleTankPositionChange) {
      return;
    }

    console.log('[EnhancedMitigationContext] Registering tank position change handler');
    const unregister = registerTankPositionChangeHandler(handleTankPositionChange);

    return () => {
      console.log('[EnhancedMitigationContext] Unregistering tank position change handler');
      unregister();
    };
  }, [registerTankPositionChangeHandler, handleTankPositionChange]);

  // Initialize and update cooldown manager
  useEffect(() => {
    // Don't initialize if we don't have basic context data
    if (!currentBossActions || !selectedJobs || !isInitialized) {
      console.log('[EnhancedMitigationContext] Waiting for context data...');
      return;
    }

    if (!cooldownManagerRef.current) {
      // Initialize the enhanced cooldown system
      const cooldownSystem = initializeCooldownSystem({
        bossActions: currentBossActions,
        bossLevel: currentBossLevel,
        selectedJobs,
        tankPositions,
        assignments,
        enableValidation: (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.NODE_ENV === 'development'), // Enable validation in development
        enableRealtimeSync: true
      });

      cooldownManagerRef.current = cooldownSystem.cooldownManager;

      console.log('[EnhancedMitigationContext] Cooldown system initialized:', {
        bossActionsCount: currentBossActions?.length || 0,
        selectedJobsCount: Object.keys(selectedJobs || {}).length,
        assignmentsCount: Object.keys(assignments || {}).length,
        systemStatus: cooldownSystem.getSystemStatus()
      });
    } else {
      // Update the manager with current data
      updateCooldownManager({
        bossActions: currentBossActions,
        bossLevel: currentBossLevel,
        selectedJobs,
        tankPositions,
        assignments
      });
    }
  }, [currentBossActions, currentBossLevel, selectedJobs, tankPositions, assignments]);

  // Real-time synchronization effect
  useEffect(() => {
    if (!isInitialized || !cooldownManagerRef.current || !currentBossActions || !selectedJobs) return;

    // Sync cooldown manager state when assignments change from real-time updates
    const manager = cooldownManagerRef.current;

    // Clear caches to ensure fresh calculations with new data
    manager.clearCache();

    // Update specialized trackers with latest data
    if (manager.chargesTracker) {
      manager.chargesTracker.update({
        bossActions: currentBossActions,
        bossLevel: currentBossLevel,
        assignments
      });
    }

    if (manager.instancesTracker) {
      manager.instancesTracker.update({
        bossActions: currentBossActions,
        bossLevel: currentBossLevel,
        selectedJobs,
        assignments
      });
    }

    // Force re-render of components that depend on instance counts
    // This ensures that MitigationItem components update their instance displays
    setForceUpdateCounter(prev => prev + 1);

    if (manager.aetherflowTracker) {
      manager.aetherflowTracker.update({
        bossActions: currentBossActions,
        bossLevel: currentBossLevel,
        selectedJobs,
        assignments
      });
    }
  }, [isInitialized, assignments, currentBossActions, currentBossLevel, selectedJobs]);

  // Memoized cooldown manager instance
  const cooldownManager = useMemo(() => {
    return cooldownManagerRef.current || getCooldownManager();
  }, [cooldownManagerRef.current]);

  /**
   * Check if an ability is available at a specific time
   */
  const checkAbilityAvailability = useCallback((abilityId, targetTime, targetBossActionId = null, options = {}) => {
    if (!cooldownManager) {
      return {
        isAvailable: false,
        reason: 'manager_not_ready',
        availableCharges: 0,
        totalCharges: 1,
        availableInstances: 0,
        totalInstances: 1
      };
    }

    return cooldownManager.checkAbilityAvailability(abilityId, targetTime, targetBossActionId, options);
  }, [cooldownManager, forceUpdateCounter]);

  /**
   * Check multiple abilities at once
   */
  const checkMultipleAbilities = useCallback((abilityIds, targetTime, targetBossActionId = null, options = {}) => {
    if (!cooldownManager) {
      return {};
    }

    return cooldownManager.checkMultipleAbilities(abilityIds, targetTime, targetBossActionId, options);
  }, [cooldownManager, forceUpdateCounter]);

  /**
   * Get all available abilities at a specific time
   */
  const getAvailableAbilities = useCallback((targetTime, targetBossActionId = null, options = {}) => {
    if (!cooldownManager) {
      return [];
    }

    return cooldownManager.getAvailableAbilities(targetTime, targetBossActionId, options);
  }, [cooldownManager, forceUpdateCounter]);

  /**
   * Add a pending assignment for immediate UI feedback
   */
  const addPendingAssignment = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    const pendingAssignment = {
      id: `${bossActionId}_${mitigationId}_${tankPosition || 'shared'}_${Date.now()}`,
      bossActionId,
      mitigationId,
      tankPosition,
      timestamp: Date.now()
    };

    setPendingAssignments(prev => [...prev, pendingAssignment]);
    
    // Auto-remove after a timeout to prevent stale pending assignments
    setTimeout(() => {
      setPendingAssignments(prev => prev.filter(p => p.id !== pendingAssignment.id));
    }, 5000);

    return pendingAssignment.id;
  }, []);

  /**
   * Remove a pending assignment
   */
  const removePendingAssignment = useCallback((pendingId) => {
    setPendingAssignments(prev => prev.filter(p => p.id !== pendingId));
  }, []);

  /**
   * Check if there's a pending assignment
   */
  const hasPendingAssignment = useCallback((bossActionId, mitigationId, tankPosition = null) => {
    return pendingAssignments.some(p =>
      p.bossActionId === bossActionId &&
      p.mitigationId === mitigationId &&
      p.tankPosition === tankPosition
    );
  }, [pendingAssignments]);

  /**
   * Get active mitigations at a specific time (for compatibility with existing components)
   */
  const getActiveMitigations = useCallback((targetActionId, targetTime, tankPosition = null) => {
    if (!currentBossActions) return [];

    // Use the existing utility function for finding active mitigations
    return findActiveMitigationsAtTime(
      assignments,
      currentBossActions,
      mitigationAbilities,
      targetActionId,
      targetTime,
      currentBossLevel
    );
  }, [assignments, currentBossActions, currentBossLevel]);

  /**
   * Add a mitigation to a boss action with enhanced conflict resolution
   */
  const addMitigation = useCallback(async (bossActionId, mitigation, tankPosition = null, options = {}) => {
    if (!isInitialized || !updateAssignmentsRealtime) {
      console.warn('[EnhancedMitigationContext] Cannot add mitigation: not initialized');
      return false;
    }

    // Check availability before adding
    const bossAction = currentBossActions?.find(action => action.id === bossActionId);
    if (!bossAction) {
      console.warn('[EnhancedMitigationContext] Boss action not found:', bossActionId);
      return false;
    }

    // For single-target mitigations, check if there's an existing assignment with null tank position
    // and remove it before adding the new one with the correct tank position
    const currentAssignments = assignments[bossActionId] || [];
    const existingNullAssignment = currentAssignments.find(m =>
      m.id === mitigation.id &&
      (m.tankPosition === null || m.tankPosition === 'shared') &&
      mitigation.target === 'single' &&
      tankPosition &&
      tankPosition !== 'shared'
    );

    if (existingNullAssignment) {
      console.log('[EnhancedMitigationContext] Removing existing null tank position assignment before adding specific tank assignment:', {
        mitigationId: mitigation.id,
        existingTankPosition: existingNullAssignment.tankPosition,
        newTankPosition: tankPosition
      });

      // Remove the existing assignment with null/shared tank position
      const updatedAssignments = {
        ...assignments,
        [bossActionId]: currentAssignments.filter(m => m !== existingNullAssignment)
      };

      // Update assignments immediately to prevent duplicate detection
      updateAssignmentsRealtime(updatedAssignments);

      // Update the cooldown manager with the new assignments and clear cache
      if (cooldownManagerRef.current) {
        cooldownManagerRef.current.update({ assignments: updatedAssignments });
        // Clear the usage history cache to ensure fresh availability check
        if (cooldownManagerRef.current.usageHistoryCache) {
          cooldownManagerRef.current.usageHistoryCache.clear();
        }
      }

      // Wait for the state update to propagate
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Pre-assignment availability check (after removing conflicting assignment)
    const preAvailability = checkAbilityAvailability(mitigation.id, bossAction.time, bossActionId, {
      tankPosition,
      isBeingAssigned: true,
      casterJobId: options?.casterJobId || null
    });

    if (!preAvailability.canAssign()) {
      console.warn('[EnhancedMitigationContext] Cannot assign mitigation (pre-check):', {
        abilityId: mitigation.id,
        reason: preAvailability.reason,
        availableCharges: preAvailability.availableCharges,
        availableInstances: preAvailability.availableInstances
      });
      return false;
    }

    // Add pending assignment for immediate UI feedback
    const pendingId = addPendingAssignment(bossActionId, mitigation.id, tankPosition);

    try {
      // Create the mitigation assignment object with enhanced metadata
      const abilityDef = mitigationAbilities.find(a => a.id === mitigation.id);
      const isRoleShared = !!abilityDef?.isRoleShared;
      const isMultiInstance = isRoleShared && getRoleSharedAbilityCount(abilityDef, selectedJobs) > 1;
      const chosenCasterJobId = options?.casterJobId || null;
      const abilityJobs = abilityDef?.jobs || [];
      const casterJobBelongsToAbility = chosenCasterJobId && abilityJobs.includes(chosenCasterJobId);
      const validatedCasterJobId = casterJobBelongsToAbility 
        ? chosenCasterJobId 
        : (abilityJobs.length === 1 ? abilityJobs[0] : null);
      
      const effectiveCasterJobId = isMultiInstance ? validatedCasterJobId : null;
      const instanceId = isRoleShared ? `${mitigation.id}_${effectiveCasterJobId || Date.now()}` : null;

      const cooldownSec = getAbilityCooldownForLevel(mitigation, currentBossLevel);
      const mitigationAssignment = {
        id: mitigation.id,
        name: mitigation.name,
        tankPosition: tankPosition || 'shared',
        assignedAt: Date.now(),
        assignedBy: options?.casterUserId || 'current_user',
        nextAvailableAt: typeof cooldownSec === 'number' ? (bossAction.time + cooldownSec) : null,
        chargeIndex: preAvailability.availableCharges > 1 ? (preAvailability.totalCharges - preAvailability.availableCharges) : 0,
        instanceId,
        cooldownManagerVersion: cooldownManagerRef.current?.lastCacheUpdate || Date.now(),
        casterJobId: validatedCasterJobId,
        casterUserId: options?.casterUserId || null,
        casterDisplayName: options?.casterDisplayName || null,
        casterColor: options?.casterColor || null
      };

      // Get current assignments for this boss action
      const currentAssignments = assignments[bossActionId] || [];

      // Double-check availability with current assignments (conflict resolution)
      const postAvailability = checkAbilityAvailability(mitigation.id, bossAction.time, bossActionId, {
        tankPosition,
        isBeingAssigned: true,
        excludeCurrentAssignment: false,
        casterJobId: options?.casterJobId || null
      });

      if (!postAvailability.canAssign()) {
        console.warn('[EnhancedMitigationContext] Cannot assign mitigation (post-check - conflict detected):', {
          abilityId: mitigation.id,
          reason: postAvailability.reason,
          availableCharges: postAvailability.availableCharges,
          availableInstances: postAvailability.availableInstances
        });

        // Remove pending assignment
        removePendingAssignment(pendingId);
        return false;
      }

      // Check if this is an Aetherflow-consuming ability and clear cache immediately for real-time UI updates
      const ability = abilityDef;
      if (ability && ability.consumesAetherflow && cooldownManagerRef.current?.aetherflowTracker) {
        console.log('[EnhancedMitigationContext] Clearing Aetherflow cache before adding stack-consuming ability:', ability.name);
        cooldownManagerRef.current.aetherflowTracker.clearCache();
      }

      // Add the new assignment
      const newAssignments = {
        ...assignments,
        [bossActionId]: [...currentAssignments, mitigationAssignment]
      };

      // Update via real-time system with conflict resolution metadata
      await updateAssignmentsRealtime(newAssignments, {
        changeOrigin: 'enhanced_mitigation_context',
        timestamp: Date.now(),
        conflictResolution: {
          preCheck: preAvailability,
          postCheck: postAvailability,
          assignmentMetadata: mitigationAssignment
        }
      });

      // Remove pending assignment on success
      removePendingAssignment(pendingId);

      console.log('[EnhancedMitigationContext] Mitigation added successfully:', {
        bossActionId,
        mitigationId: mitigation.id,
        tankPosition,
        chargeIndex: mitigationAssignment.chargeIndex,
        instanceId: mitigationAssignment.instanceId,
        casterJobId: mitigationAssignment.casterJobId
      });

      return true;
    } catch (error) {
      console.error('[EnhancedMitigationContext] Failed to add mitigation:', error);

      // Remove pending assignment on error
      removePendingAssignment(pendingId);

      return false;
    }
  }, [
    isInitialized,
    updateAssignmentsRealtime,
    currentBossActions,
    assignments,
    checkAbilityAvailability,
    addPendingAssignment,
    removePendingAssignment
  ]);

  /**
   * Remove a mitigation from a boss action
   */
  const removeMitigation = useCallback(async (bossActionId, mitigationId, tankPosition = null) => {
    if (!isInitialized || !updateAssignmentsRealtime) {
      console.warn('[EnhancedMitigationContext] Cannot remove mitigation: not initialized');
      return false;
    }

    try {
      // Get current assignments for this boss action
      const currentAssignments = assignments[bossActionId] || [];

      // Find the mitigation being removed to check if it's an Aetherflow ability
      const removedMitigation = currentAssignments.find(assignment => {
        if (assignment.id !== mitigationId) return false;

        // If tank position is specified, only match assignments with matching tank position
        if (tankPosition && assignment.tankPosition !== tankPosition) return false;

        return true;
      });

      // If this is an Aetherflow-consuming ability, clear the cache immediately for real-time UI updates
      if (removedMitigation && cooldownManagerRef.current?.aetherflowTracker) {
        const ability = mitigationAbilities.find(a => a.id === mitigationId);
        if (ability && ability.consumesAetherflow) {
          console.log('[EnhancedMitigationContext] Clearing Aetherflow cache before removing stack-consuming ability:', ability.name);
          cooldownManagerRef.current.aetherflowTracker.clearCache();
        }
      }

      // Remove the specific assignment
      const filteredAssignments = currentAssignments.filter(assignment => {
        if (assignment.id !== mitigationId) return true;

        // If tank position is specified, only remove assignments with matching tank position
        if (tankPosition && assignment.tankPosition !== tankPosition) return true;

        return false;
      });

      // Update assignments
      const newAssignments = {
        ...assignments,
        [bossActionId]: filteredAssignments
      };

      // Update via real-time system
      await updateAssignmentsRealtime(newAssignments);

      console.log('[EnhancedMitigationContext] Mitigation removed successfully:', {
        bossActionId,
        mitigationId,
        tankPosition,
        wasAetherflowAbility: removedMitigation && mitigationAbilities.find(a => a.id === mitigationId)?.consumesAetherflow
      });
      
      return true;
    } catch (error) {
      console.error('[EnhancedMitigationContext] Failed to remove mitigation:', error);
      return false;
    }
  }, [isInitialized, updateAssignmentsRealtime, assignments]);

  const updateMitigationPrecast = useCallback(async (bossActionId, mitigationId, tankPosition = null, precastSeconds = 0) => {
    if (!isInitialized || !updateAssignmentsRealtime) {
      console.warn('[EnhancedMitigationContext] Cannot update precast: not initialized');
      return false;
    }

    // Normalize and clamp input
    let raw = Number(precastSeconds);
    if (!Number.isFinite(raw) || raw < 0) raw = 0;

    const ability = mitigationAbilities.find(m => m.id === mitigationId);
    const duration = ability ? getAbilityDurationForLevel(ability, currentBossLevel) : null;
    const clamped = Math.max(0, duration != null ? Math.min(raw, duration) : raw);

    const updated = { ...assignments };
    const actionAssignments = Array.isArray(updated[bossActionId]) ? [...updated[bossActionId]] : [];

    let changed = false;
    const nextActionAssignments = actionAssignments.map(a => {
      if (a.id === mitigationId && (!tankPosition || a.tankPosition === tankPosition)) {
        changed = true;
        return { ...a, precastSeconds: clamped };
      }
      return a;
    });

    if (!changed) return false;

    updated[bossActionId] = nextActionAssignments;
    try {
      await updateAssignmentsRealtime(updated);
      return true;
    } catch (e) {
      console.error('[EnhancedMitigationContext] Failed to update precastSeconds', e);
      return false;
    }
  }, [assignments, isInitialized, updateAssignmentsRealtime, currentBossLevel]);

  // Context value
  const contextValue = useMemo(() => ({
    // Cooldown checking
    checkAbilityAvailability,
    checkMultipleAbilities,
    getAvailableAbilities,

    // Assignment management
    addMitigation,
    removeMitigation,
    getActiveMitigations,
    updateMitigationPrecast,

    // Pending assignments
    pendingAssignments,
    addPendingAssignment,
    removePendingAssignment,
    hasPendingAssignment,

    // Data access
    assignments: assignments || {},
    selectedJobs: selectedJobs || {},
    currentBossActions: currentBossActions || [],
    currentBossLevel: currentBossLevel || 90,
    tankPositions: tankPositions || {},

    // Manager access (for advanced use cases)
    cooldownManager,

    // Status
    isInitialized
  }), [
    checkAbilityAvailability,
    checkMultipleAbilities,
    getAvailableAbilities,
    addMitigation,
    removeMitigation,
    getActiveMitigations,
    updateMitigationPrecast,
    pendingAssignments,
    addPendingAssignment,
    removePendingAssignment,
    hasPendingAssignment,
    assignments,
    selectedJobs,
    currentBossActions,
    currentBossLevel,
    tankPositions,
    cooldownManager,
    isInitialized
  ]);

  return (
    <EnhancedMitigationContext.Provider value={contextValue}>
      {children}
    </EnhancedMitigationContext.Provider>
  );
};

// Custom hook to use the context
export const useEnhancedMitigation = () => {
  const context = useContext(EnhancedMitigationContext);
  if (!context) {
    throw new Error('useEnhancedMitigation must be used within an EnhancedMitigationProvider');
  }
  return context;
};

export default EnhancedMitigationContext;
