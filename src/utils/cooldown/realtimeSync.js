/**
 * Real-time Cooldown Synchronization Utilities
 * 
 * This module provides utilities for synchronizing cooldown states across
 * multiple users in real-time collaboration scenarios.
 */

import { getCooldownManager, updateCooldownManager } from './cooldownManager';
import { updateChargesTracker } from './chargesTracker';
import { updateInstancesTracker } from './instancesTracker';
import { updateAetherflowTracker } from './aetherflowTracker';

/**
 * Represents a cooldown state snapshot for synchronization
 */
export class CooldownSnapshot {
  constructor({
    timestamp = Date.now(),
    assignments = {},
    bossActions = [],
    bossLevel = 90,
    selectedJobs = {},
    tankPositions = {},
    changeOrigin = null,
    conflictResolution = null
  }) {
    this.timestamp = timestamp;
    this.assignments = assignments;
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.selectedJobs = selectedJobs;
    this.tankPositions = tankPositions;
    this.changeOrigin = changeOrigin;
    this.conflictResolution = conflictResolution;
  }

  /**
   * Create a snapshot from current state
   */
  static fromCurrentState(data, metadata = {}) {
    return new CooldownSnapshot({
      ...data,
      ...metadata,
      timestamp: Date.now()
    });
  }

  /**
   * Check if this snapshot is newer than another
   */
  isNewerThan(otherSnapshot) {
    return this.timestamp > otherSnapshot.timestamp;
  }

  /**
   * Get a hash of the assignments for conflict detection
   */
  getAssignmentsHash() {
    return JSON.stringify(this.assignments);
  }
}

/**
 * Real-time cooldown synchronization manager
 */
export class RealtimeCooldownSync {
  constructor() {
    this.lastSnapshot = null;
    this.pendingUpdates = new Map();
    this.conflictHandlers = new Map();
    this.syncListeners = new Set();
  }

  /**
   * Register a conflict handler for a specific scenario
   */
  registerConflictHandler(scenario, handler) {
    this.conflictHandlers.set(scenario, handler);
  }

  /**
   * Add a sync listener
   */
  addSyncListener(listener) {
    this.syncListeners.add(listener);
  }

  /**
   * Remove a sync listener
   */
  removeSyncListener(listener) {
    this.syncListeners.delete(listener);
  }

  /**
   * Notify all sync listeners
   */
  notifySyncListeners(event, data) {
    this.syncListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[RealtimeCooldownSync] Error in sync listener:', error);
      }
    });
  }

  /**
   * Process an incoming real-time update
   */
  processRealtimeUpdate(snapshot, options = {}) {
    const { 
      preventFeedbackLoop = true,
      forceUpdate = false,
      conflictResolution = 'latest_wins'
    } = options;

    // Prevent feedback loops from our own changes
    if (preventFeedbackLoop && snapshot.changeOrigin === 'enhanced_mitigation_context') {
      console.log('[RealtimeCooldownSync] Skipping own change to prevent feedback loop');
      return false;
    }

    // Check for conflicts if we have a previous snapshot
    if (this.lastSnapshot && !forceUpdate) {
      const conflict = this.detectConflict(this.lastSnapshot, snapshot);
      
      if (conflict) {
        console.warn('[RealtimeCooldownSync] Conflict detected:', conflict);
        
        const resolved = this.resolveConflict(conflict, conflictResolution);
        if (!resolved) {
          console.error('[RealtimeCooldownSync] Failed to resolve conflict');
          return false;
        }
        
        // Use the resolved snapshot
        snapshot = resolved;
      }
    }

    // Update cooldown manager with new data
    this.updateCooldownState(snapshot);
    
    // Store the snapshot
    this.lastSnapshot = snapshot;
    
    // Notify listeners
    this.notifySyncListeners('state_updated', {
      snapshot,
      hasConflict: false
    });

    return true;
  }

  /**
   * Detect conflicts between snapshots
   */
  detectConflict(oldSnapshot, newSnapshot) {
    // Check for timestamp conflicts
    if (oldSnapshot.timestamp > newSnapshot.timestamp) {
      return {
        type: 'timestamp_conflict',
        oldSnapshot,
        newSnapshot,
        reason: 'New snapshot is older than current snapshot'
      };
    }

    // Check for assignment conflicts
    const oldHash = oldSnapshot.getAssignmentsHash();
    const newHash = newSnapshot.getAssignmentsHash();
    
    if (oldHash !== newHash) {
      // Detailed conflict analysis
      const conflicts = this.analyzeAssignmentConflicts(oldSnapshot.assignments, newSnapshot.assignments);
      
      if (conflicts.length > 0) {
        return {
          type: 'assignment_conflict',
          oldSnapshot,
          newSnapshot,
          conflicts,
          reason: 'Assignment conflicts detected'
        };
      }
    }

    return null;
  }

  /**
   * Analyze assignment conflicts in detail
   */
  analyzeAssignmentConflicts(oldAssignments, newAssignments) {
    const conflicts = [];
    
    // Check each boss action for conflicts
    const allBossActionIds = new Set([
      ...Object.keys(oldAssignments),
      ...Object.keys(newAssignments)
    ]);

    for (const bossActionId of allBossActionIds) {
      const oldMitigations = oldAssignments[bossActionId] || [];
      const newMitigations = newAssignments[bossActionId] || [];
      
      // Check for ability conflicts
      const oldAbilityIds = new Set(oldMitigations.map(m => m.id));
      const newAbilityIds = new Set(newMitigations.map(m => m.id));
      
      // Find abilities that were added or removed
      const addedAbilities = [...newAbilityIds].filter(id => !oldAbilityIds.has(id));
      const removedAbilities = [...oldAbilityIds].filter(id => !newAbilityIds.has(id));
      
      if (addedAbilities.length > 0 || removedAbilities.length > 0) {
        conflicts.push({
          bossActionId,
          addedAbilities,
          removedAbilities,
          oldMitigations,
          newMitigations
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts using specified strategy
   */
  resolveConflict(conflict, strategy = 'latest_wins') {
    switch (strategy) {
      case 'latest_wins':
        return conflict.newSnapshot;
        
      case 'oldest_wins':
        return conflict.oldSnapshot;
        
      case 'merge':
        return this.mergeSnapshots(conflict.oldSnapshot, conflict.newSnapshot);
        
      case 'custom':
        const handler = this.conflictHandlers.get(conflict.type);
        if (handler) {
          return handler(conflict);
        }
        // Fall back to latest_wins if no custom handler
        return conflict.newSnapshot;
        
      default:
        console.warn('[RealtimeCooldownSync] Unknown conflict resolution strategy:', strategy);
        return conflict.newSnapshot;
    }
  }

  /**
   * Merge two snapshots (advanced conflict resolution)
   */
  mergeSnapshots(oldSnapshot, newSnapshot) {
    // For now, implement a simple merge strategy
    // This could be enhanced with more sophisticated merging logic
    
    const mergedAssignments = { ...oldSnapshot.assignments };
    
    // Merge assignments from new snapshot
    Object.entries(newSnapshot.assignments).forEach(([bossActionId, mitigations]) => {
      const oldMitigations = mergedAssignments[bossActionId] || [];
      const newMitigations = mitigations || [];
      
      // Combine mitigations, preferring newer ones
      const combinedMitigations = [...oldMitigations];
      
      newMitigations.forEach(newMitigation => {
        const existingIndex = combinedMitigations.findIndex(m => 
          m.id === newMitigation.id && m.tankPosition === newMitigation.tankPosition
        );
        
        if (existingIndex >= 0) {
          // Replace if newer
          if (newMitigation.assignedAt > combinedMitigations[existingIndex].assignedAt) {
            combinedMitigations[existingIndex] = newMitigation;
          }
        } else {
          // Add new mitigation
          combinedMitigations.push(newMitigation);
        }
      });
      
      mergedAssignments[bossActionId] = combinedMitigations;
    });

    return new CooldownSnapshot({
      ...newSnapshot,
      assignments: mergedAssignments,
      timestamp: Math.max(oldSnapshot.timestamp, newSnapshot.timestamp),
      changeOrigin: 'conflict_resolution_merge'
    });
  }

  /**
   * Update cooldown state with new snapshot
   */
  updateCooldownState(snapshot) {
    // Update the main cooldown manager
    updateCooldownManager({
      bossActions: snapshot.bossActions,
      bossLevel: snapshot.bossLevel,
      selectedJobs: snapshot.selectedJobs,
      tankPositions: snapshot.tankPositions,
      assignments: snapshot.assignments
    });

    // Update specialized trackers
    const trackerData = {
      bossActions: snapshot.bossActions,
      bossLevel: snapshot.bossLevel,
      selectedJobs: snapshot.selectedJobs,
      assignments: snapshot.assignments
    };

    updateChargesTracker(trackerData);
    updateInstancesTracker(trackerData);
    updateAetherflowTracker(trackerData);

    console.log('[RealtimeCooldownSync] Cooldown state updated from real-time sync');
  }

  /**
   * Create a snapshot from current state for sending to other users
   */
  createOutgoingSnapshot(data, metadata = {}) {
    return CooldownSnapshot.fromCurrentState(data, {
      ...metadata,
      changeOrigin: 'enhanced_mitigation_context'
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSnapshot?.timestamp || null,
      pendingUpdates: this.pendingUpdates.size,
      hasConflicts: false, // This could be enhanced to track ongoing conflicts
      isConnected: true // This would be determined by the real-time connection status
    };
  }
}

/**
 * Global instance for real-time cooldown synchronization
 */
let globalRealtimeSync = null;

/**
 * Get or create the global real-time sync instance
 */
export const getRealtimeCooldownSync = () => {
  if (!globalRealtimeSync) {
    globalRealtimeSync = new RealtimeCooldownSync();
  }
  return globalRealtimeSync;
};

/**
 * Process a real-time update
 */
export const processRealtimeUpdate = (snapshot, options = {}) => {
  const sync = getRealtimeCooldownSync();
  return sync.processRealtimeUpdate(snapshot, options);
};

/**
 * Create an outgoing snapshot
 */
export const createOutgoingSnapshot = (data, metadata = {}) => {
  const sync = getRealtimeCooldownSync();
  return sync.createOutgoingSnapshot(data, metadata);
};

export default RealtimeCooldownSync;
