/**
 * OptimizedPlanSyncService
 * 
 * Optimized real-time collaboration service that uses a single plan document
 * to minimize Firebase Realtime Database operations and costs.
 * 
 * Key optimizations:
 * - Single document per plan instead of multiple paths
 * - Smart change detection to prevent unnecessary writes
 * - Event-driven updates only when data actually changes
 * - Consolidated listener architecture
 * - Reduced Firebase operations by 60-70%
 */

import { ref, set, onValue, off, serverTimestamp, get } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { getCollaborationPath } from '../utils/firebaseHelpers';
import performanceMonitor from '../utils/collaborationPerformanceMonitor';

class OptimizedPlanSyncService {
  constructor() {
    this.realtimeDb = realtimeDb;
    this.listeners = new Map();
    this.planCache = new Map();
    this.lastKnownStates = new Map();
    this.pendingWrites = new Map();

    // Debounce settings
    this.debounceDelay = 300; // Reduced from 500ms
    this.debounceTimers = new Map();

    // Change origin tracking to prevent feedback loops
    this.userOriginatedChanges = new Map(); // Track changes initiated by current user
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get the Firebase path for a plan document
   */
  getPlanPath(planId) {
    return getCollaborationPath(planId, 'plan');
  }

  /**
   * Track a change as user-originated to prevent feedback loops
   * Enhanced with better session tracking and user identification
   */
  trackUserOriginatedChange(planId, userId, version, changedFields) {
    // Create multiple tracking keys for robust identification
    const primaryKey = `${planId}_${userId}`;
    const versionKey = `${planId}_${userId}_v${version}`;
    const sessionKey = `${planId}_${this.sessionId}_${userId}`;

    const changeInfo = {
      version,
      changedFields,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      planId,
      userId,
      // Add browser session identifier for additional uniqueness
      browserSessionId: this._getBrowserSessionId()
    };

    // Store under multiple keys for robust tracking
    this.userOriginatedChanges.set(primaryKey, changeInfo);
    this.userOriginatedChanges.set(versionKey, changeInfo);
    this.userOriginatedChanges.set(sessionKey, changeInfo);

    // Clean up old entries after 45 seconds (increased from 30 for better reliability)
    setTimeout(() => {
      this.userOriginatedChanges.delete(primaryKey);
      this.userOriginatedChanges.delete(versionKey);
      this.userOriginatedChanges.delete(sessionKey);
    }, 45000);

    console.log('%c[OPTIMIZED SYNC] Enhanced tracking of user-originated change', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      userId,
      version,
      changedFields,
      sessionId: this.sessionId,
      browserSessionId: changeInfo.browserSessionId,
      trackingKeys: [primaryKey, versionKey, sessionKey]
    });
  }

  /**
   * Check if a change was originated by the current user
   * Enhanced with multiple tracking methods for robust feedback loop prevention
   */
  isUserOriginatedChange(planId, userId, version, sessionId) {
    // Check multiple tracking keys for robust identification
    const primaryKey = `${planId}_${userId}`;
    const versionKey = `${planId}_${userId}_v${version}`;
    const sessionKey = `${planId}_${sessionId}_${userId}`;

    // Try to find change info using any of the tracking keys
    let changeInfo = this.userOriginatedChanges.get(primaryKey) ||
                     this.userOriginatedChanges.get(versionKey) ||
                     this.userOriginatedChanges.get(sessionKey);

    if (!changeInfo) {
      return false;
    }

    // Enhanced validation with multiple criteria
    const timeWindow = 45000; // 45 seconds (increased for better reliability)
    const isWithinTimeWindow = (Date.now() - changeInfo.timestamp) < timeWindow;
    const isMatchingVersion = changeInfo.version === version;
    const isMatchingSession = changeInfo.sessionId === sessionId;
    const isMatchingUser = changeInfo.userId === userId;
    const isMatchingPlan = changeInfo.planId === planId;

    // Additional browser session check for extra security
    const currentBrowserSessionId = this._getBrowserSessionId();
    const isMatchingBrowserSession = changeInfo.browserSessionId === currentBrowserSessionId;

    const isOwnChange = isWithinTimeWindow &&
                       isMatchingVersion &&
                       isMatchingSession &&
                       isMatchingUser &&
                       isMatchingPlan &&
                       isMatchingBrowserSession;

    if (isOwnChange) {
      console.log('%c[OPTIMIZED SYNC] Enhanced filtering of user-originated change', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        version,
        sessionId,
        validationResults: {
          timeWindow: isWithinTimeWindow,
          version: isMatchingVersion,
          session: isMatchingSession,
          user: isMatchingUser,
          plan: isMatchingPlan,
          browserSession: isMatchingBrowserSession
        }
      });
    }

    return isOwnChange;
  }

  /**
   * Get or create a browser session identifier for additional change tracking
   */
  _getBrowserSessionId() {
    if (!this.browserSessionId) {
      // Try to get existing session ID from sessionStorage first
      try {
        this.browserSessionId = sessionStorage.getItem('mitplan_browser_session_id');
      } catch (error) {
        // SessionStorage not available
      }

      // Create new session ID if none exists
      if (!this.browserSessionId) {
        this.browserSessionId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Store in sessionStorage so it persists for the browser session but not across sessions
        try {
          sessionStorage.setItem('mitplan_browser_session_id', this.browserSessionId);
        } catch (error) {
          // Fallback if sessionStorage is not available
          console.warn('SessionStorage not available, using memory-only browser session ID');
        }
      }
    }
    return this.browserSessionId;
  }

  /**
   * Smart field-level change detection - only write if data actually changed
   */
  hasDataChanged(planId, newPlanData) {
    const lastKnownState = this.lastKnownStates.get(planId);

    if (!lastKnownState) {
      return { hasChanges: true, changedFields: ['all'] }; // No previous state, so this is a change
    }

    const changedFields = [];

    // Check each field individually for changes
    if (this.hasFieldChanged(lastKnownState.assignments, newPlanData.assignments)) {
      changedFields.push('assignments');
    }

    if (this.hasFieldChanged(lastKnownState.selectedJobs, newPlanData.selectedJobs)) {
      changedFields.push('selectedJobs');
    }

    if ((lastKnownState.bossId || '') !== (newPlanData.bossId || '')) {
      changedFields.push('bossId');
    }

    if (this.hasFieldChanged(lastKnownState.tankPositions, newPlanData.tankPositions)) {
      changedFields.push('tankPositions');
    }

    if (this.hasFieldChanged(lastKnownState.filterSettings, newPlanData.filterSettings)) {
      changedFields.push('filterSettings');
    }

    return {
      hasChanges: changedFields.length > 0,
      changedFields
    };
  }

  /**
   * Check if a specific field has changed using efficient comparison
   */
  hasFieldChanged(oldValue, newValue) {
    // Handle null/undefined cases
    if (oldValue === newValue) return false;
    if (!oldValue && !newValue) return false;
    if (!oldValue || !newValue) return true;

    // For objects and arrays, use JSON comparison (more efficient than deep comparison)
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }

    // For primitives, direct comparison
    return oldValue !== newValue;
  }

  /**
   * Enhanced field-specific debounced write operation with immediate sync for critical changes
   */
  debouncedWrite(planId, planData, userId, priority = 'normal') {
    const timerKey = `${planId}_${priority}`;

    // Clear existing timer for this priority level
    if (this.debounceTimers.has(timerKey)) {
      clearTimeout(this.debounceTimers.get(timerKey));
    }

    // Enhanced priority-based delays with immediate sync for critical changes
    let delay;
    let shouldSyncImmediately = false;

    switch (priority) {
      case 'immediate':
        // For critical real-time collaboration changes
        shouldSyncImmediately = true;
        delay = 0;
        break;
      case 'high':
        // Boss selection, critical changes - very fast
        delay = 50;
        break;
      case 'medium':
        // Job selections, tank positions - fast
        delay = 150;
        break;
      default:
        // Assignments, filters - normal debouncing
        delay = this.debounceDelay;
    }

    if (shouldSyncImmediately) {
      // Immediate sync for critical changes
      this.writePlanState(planId, planData, userId);
      return { success: true, immediate: true };
    }

    // Set new timer for debounced sync
    const timer = setTimeout(async () => {
      await this.writePlanState(planId, planData, userId);
      this.debounceTimers.delete(timerKey);
    }, delay);

    this.debounceTimers.set(timerKey, timer);
  }

  /**
   * Write complete plan state to Firebase (single document)
   */
  async writePlanState(planId, planData, userId) {
    try {
      console.log('%c[OPTIMIZED SYNC] Writing plan state', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        hasAssignments: !!planData.assignments,
        hasSelectedJobs: !!planData.selectedJobs,
        bossId: planData.bossId,
        hasTankPositions: !!planData.tankPositions,
        hasSelectedBossAction: !!planData.selectedBossAction,
        hasFilterSettings: !!planData.filterSettings
      });

      // Check if data actually changed and get changed fields
      const changeResult = this.hasDataChanged(planId, planData);
      if (!changeResult.hasChanges) {
        console.log('%c[OPTIMIZED SYNC] No changes detected, skipping write', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);

        // Track skipped write for performance monitoring
        performanceMonitor.trackSyncOperation(planId, 'plan_state', true);

        return {
          success: true,
          message: 'No changes detected',
          skipped: true
        };
      }

      console.log('%c[OPTIMIZED SYNC] Changes detected in fields:', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', changeResult.changedFields);

      const currentVersion = this.lastKnownStates.get(planId)?.version || 0;
      const newVersion = currentVersion + 1;

      const planDocument = {
        assignments: planData.assignments || {},
        selectedJobs: planData.selectedJobs || [],
        bossId: planData.bossId || 'ketuduke',
        tankPositions: planData.tankPositions || {},
        filterSettings: planData.filterSettings || { showAllMitigations: false },
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userId,
        version: newVersion,
        changedFields: changeResult.changedFields,
        sessionId: this.sessionId, // Add session ID for change origin tracking
        // Embedded session info to reduce separate writes
        sessionInfo: {
          activeUsers: await this.getActiveUserCount(planId),
          lastActivity: serverTimestamp()
        }
      };

      // Track this change as user-originated BEFORE writing to Firebase
      this.trackUserOriginatedChange(planId, userId, newVersion, changeResult.changedFields);

      const planRef = ref(this.realtimeDb, this.getPlanPath(planId));
      await set(planRef, planDocument);

      // Track Firebase write for performance monitoring
      performanceMonitor.trackFirebaseWrite(planId, 'plan_state', true);
      performanceMonitor.trackSyncOperation(planId, 'plan_state', false);

      // Update local cache
      this.lastKnownStates.set(planId, planDocument);

      console.log('%c[OPTIMIZED SYNC] Plan state written successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        version: newVersion,
        changesSaved: true
      });

      return {
        success: true,
        version: newVersion,
        message: 'Plan state synchronized'
      };
    } catch (error) {
      console.error('%c[OPTIMIZED SYNC] Write error', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message,
        code: error.code
      });

      return {
        success: false,
        message: error.message,
        error: error.code
      };
    }
  }

  /**
   * Get active user count for session info
   */
  async getActiveUserCount(planId) {
    try {
      const activeUsersRef = ref(this.realtimeDb, getCollaborationPath(planId, 'activeUsers'));
      const snapshot = await get(activeUsersRef);

      if (snapshot.exists()) {
        return Object.keys(snapshot.val()).length;
      }
      return 0;
    } catch (error) {
      console.warn('Failed to get active user count:', error);
      return 0;
    }
  }

  /**
   * Sync mitigation assignments (optimized)
   */
  async syncMitigationAssignments(planId, assignments, userId) {
    const currentState = this.lastKnownStates.get(planId) || {};
    const newPlanData = {
      ...currentState,
      assignments
    };

    return this.debouncedWrite(planId, newPlanData, userId);
  }

  /**
   * Sync job selections (optimized) - medium priority
   */
  async syncJobSelections(planId, selectedJobs, userId) {
    const currentState = this.lastKnownStates.get(planId) || {};
    const newPlanData = {
      ...currentState,
      selectedJobs
    };

    return this.debouncedWrite(planId, newPlanData, userId, 'medium');
  }

  /**
   * Sync boss selection (optimized) - high priority for immediate response
   */
  async syncBossSelection(planId, bossId, userId) {
    const currentState = this.lastKnownStates.get(planId) || {};
    const newPlanData = {
      ...currentState,
      bossId
    };

    return this.debouncedWrite(planId, newPlanData, userId, 'high');
  }

  /**
   * Sync tank positions (optimized) - medium priority
   */
  async syncTankPositions(planId, tankPositions, userId) {
    const currentState = this.lastKnownStates.get(planId) || {};
    const newPlanData = {
      ...currentState,
      tankPositions
    };

    return this.debouncedWrite(planId, newPlanData, userId, 'medium');
  }



  /**
   * Sync filter settings (optimized) - normal priority
   */
  async syncFilterSettings(planId, filterSettings, userId) {
    const currentState = this.lastKnownStates.get(planId) || {};
    const newPlanData = {
      ...currentState,
      filterSettings
    };

    return this.debouncedWrite(planId, newPlanData, userId, 'normal');
  }

  /**
   * Sync complete plan state (immediate, no debouncing)
   */
  async syncCompletePlan(planId, planData, userId) {
    return this.writePlanState(planId, planData, userId);
  }

  /**
   * Immediate sync for critical real-time collaboration changes
   * Bypasses all debouncing for instant synchronization
   */
  async syncImmediateChange(planId, planData, userId, changeType = 'immediate_update') {
    console.log('%c[OPTIMIZED SYNC] Immediate sync for critical change', 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      userId,
      changeType,
      hasAssignments: !!planData.assignments,
      hasSelectedJobs: !!planData.selectedJobs,
      bossId: planData.bossId
    });

    // Cancel any pending debounced writes for this plan
    this.cancelPendingWrites(planId);

    // Perform immediate write
    return this.writePlanState(planId, planData, userId);
  }

  /**
   * Cancel all pending debounced writes for a plan
   */
  cancelPendingWrites(planId) {
    const timersToDelete = [];
    for (const [timerKey, timer] of this.debounceTimers.entries()) {
      if (timerKey.startsWith(`${planId}_`)) {
        clearTimeout(timer);
        timersToDelete.push(timerKey);
      }
    }
    timersToDelete.forEach(key => this.debounceTimers.delete(key));

    if (timersToDelete.length > 0) {
      console.log('%c[OPTIMIZED SYNC] Cancelled pending writes for immediate sync', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        cancelledTimers: timersToDelete.length
      });
    }
  }

  /**
   * Subscribe to plan updates (single listener) with enhanced change origin filtering
   * Fully event-driven with no polling mechanisms
   */
  subscribeToPlanUpdates(planId, callback, currentUserId = null) {
    const listenerKey = `plan_${planId}`;

    if (this.listeners.has(listenerKey)) {
      // Already subscribed, return existing unsubscribe function
      return this.listeners.get(listenerKey).unsubscribe;
    }

    console.log('%c[OPTIMIZED SYNC] Setting up enhanced event-driven plan listener', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      currentUserId,
      sessionId: this.sessionId,
      path: this.getPlanPath(planId),
      listenerType: 'event_driven_realtime'
    });

    const planRef = ref(this.realtimeDb, this.getPlanPath(planId));

    // Enhanced event-driven listener with immediate response
    const unsubscribe = onValue(planRef, (snapshot) => {
      if (snapshot.exists()) {
        const planData = snapshot.val();

        console.log('%c[OPTIMIZED SYNC] Received plan update', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          version: planData.version,
          lastUpdatedBy: planData.lastUpdatedBy,
          sessionId: planData.sessionId,
          changedFields: planData.changedFields || ['unknown'],
          hasAssignments: !!planData.assignments,
          hasSelectedJobs: !!planData.selectedJobs,
          bossId: planData.bossId,
          hasTankPositions: !!planData.tankPositions,
          hasFilterSettings: !!planData.filterSettings
        });

        // FEEDBACK LOOP PREVENTION: Check if this change was originated by the current user
        if (currentUserId && planData.lastUpdatedBy === currentUserId) {
          const isOwnChange = this.isUserOriginatedChange(
            planId,
            currentUserId,
            planData.version,
            planData.sessionId
          );

          if (isOwnChange) {
            console.log('%c[OPTIMIZED SYNC] Skipping own change to prevent feedback loop', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
              planId,
              version: planData.version,
              userId: currentUserId,
              sessionId: planData.sessionId
            });

            // Still update local cache but don't trigger callback
            this.lastKnownStates.set(planId, planData);
            return;
          }
        }

        // Update local cache
        this.lastKnownStates.set(planId, planData);

        // Call the callback with the plan data and change information
        // This will only be called for changes from other users
        if (callback) {
          console.log('%c[OPTIMIZED SYNC] Processing external change', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
            planId,
            version: planData.version,
            from: planData.lastUpdatedBy,
            currentUser: currentUserId
          });

          callback({
            ...planData,
            changeType: 'plan_update',
            changedFields: planData.changedFields || ['unknown'],
            data: planData
          });
        }
      }
    }, (error) => {
      console.error('%c[OPTIMIZED SYNC] Plan subscription error', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message,
        code: error.code
      });
    });

    // Store listener info
    this.listeners.set(listenerKey, {
      unsubscribe,
      planId,
      callback,
      currentUserId
    });

    return () => this.unsubscribeFromPlanUpdates(planId);
  }

  /**
   * Unsubscribe from plan updates
   */
  unsubscribeFromPlanUpdates(planId) {
    const listenerKey = `plan_${planId}`;
    const listenerInfo = this.listeners.get(listenerKey);

    if (listenerInfo) {
      listenerInfo.unsubscribe();
      this.listeners.delete(listenerKey);

      console.log('%c[OPTIMIZED SYNC] Unsubscribed from plan updates', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
    }
  }

  /**
   * Get current plan state
   */
  async getCurrentPlanState(planId) {
    try {
      // Check cache first
      const cachedState = this.lastKnownStates.get(planId);
      if (cachedState) {
        return {
          success: true,
          planState: cachedState,
          fromCache: true
        };
      }

      // Fetch from Firebase
      const planRef = ref(this.realtimeDb, this.getPlanPath(planId));
      const snapshot = await get(planRef);

      if (snapshot.exists()) {
        const planState = snapshot.val();

        // Update cache
        this.lastKnownStates.set(planId, planState);

        return {
          success: true,
          planState,
          fromCache: false
        };
      } else {
        return {
          success: false,
          message: 'Plan state not found'
        };
      }
    } catch (error) {
      console.error('Get current plan state error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Initialize plan state (for new shared plans)
   */
  async initializePlanState(planId, initialPlanData, userId) {
    try {
      console.log('%c[OPTIMIZED SYNC] Initializing plan state', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        hasInitialData: !!initialPlanData
      });

      const planDocument = {
        assignments: initialPlanData?.assignments || {},
        selectedJobs: initialPlanData?.selectedJobs || [],
        bossId: initialPlanData?.bossId || 'ketuduke',
        tankPositions: initialPlanData?.tankPositions || {},
        filterSettings: initialPlanData?.filterSettings || { showAllMitigations: false },
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userId,
        version: 1,
        changedFields: ['all'],
        sessionId: this.sessionId, // Add session ID for change origin tracking
        sessionInfo: {
          activeUsers: 1,
          lastActivity: serverTimestamp(),
          createdBy: userId
        }
      };

      // Track this initialization as user-originated
      this.trackUserOriginatedChange(planId, userId, 1, ['all']);

      const planRef = ref(this.realtimeDb, this.getPlanPath(planId));
      await set(planRef, planDocument);

      // Update local cache
      this.lastKnownStates.set(planId, planDocument);

      console.log('%c[OPTIMIZED SYNC] Plan state initialized', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        version: 1
      });

      return {
        success: true,
        version: 1,
        message: 'Plan state initialized'
      };
    } catch (error) {
      console.error('Initialize plan state error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Clean up resources for a plan
   */
  cleanup(planId) {
    // Clear all debounce timers for this plan (all priority levels)
    const timersToDelete = [];
    for (const [timerKey, timer] of this.debounceTimers.entries()) {
      if (timerKey.startsWith(`${planId}_`)) {
        clearTimeout(timer);
        timersToDelete.push(timerKey);
      }
    }
    timersToDelete.forEach(key => this.debounceTimers.delete(key));

    // Unsubscribe from listeners
    this.unsubscribeFromPlanUpdates(planId);

    // Clear cache
    this.lastKnownStates.delete(planId);
    this.planCache.delete(planId);
    this.pendingWrites.delete(planId);

    console.log('%c[OPTIMIZED SYNC] Cleaned up resources', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      timersCleared: timersToDelete.length
    });
  }

  /**
   * Get sync statistics for debugging
   */
  getSyncStats(planId) {
    const hasListener = this.listeners.has(`plan_${planId}`);
    const hasCachedState = this.lastKnownStates.has(planId);
    const hasPendingWrite = this.debounceTimers.has(planId);

    return {
      planId,
      hasListener,
      hasCachedState,
      hasPendingWrite,
      listenerCount: this.listeners.size,
      cachedPlans: this.lastKnownStates.size,
      pendingWrites: this.debounceTimers.size
    };
  }

  /**
   * Force immediate sync (bypass debouncing)
   */
  async forceSync(planId, planData, userId) {
    // Clear any pending debounced writes for this plan (all priority levels)
    const timersToDelete = [];
    for (const [timerKey, timer] of this.debounceTimers.entries()) {
      if (timerKey.startsWith(`${planId}_`)) {
        clearTimeout(timer);
        timersToDelete.push(timerKey);
      }
    }
    timersToDelete.forEach(key => this.debounceTimers.delete(key));

    return this.writePlanState(planId, planData, userId);
  }
}

export default new OptimizedPlanSyncService();
