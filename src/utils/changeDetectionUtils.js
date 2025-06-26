/**
 * Change Detection Utilities
 * 
 * Advanced change detection system for real-time collaboration.
 * Provides smart comparison algorithms and change origin tracking
 * to prevent feedback loops and optimize sync operations.
 */

/**
 * Deep comparison for complex objects with optimization for common cases
 */
export function deepCompare(obj1, obj2) {
  // Fast path for identical references
  if (obj1 === obj2) return true;
  
  // Handle null/undefined cases
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  // Handle primitive types
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  // Handle arrays
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepCompare(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  // Handle objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepCompare(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Optimized change detection for plan state objects
 */
export function detectPlanStateChanges(oldState, newState) {
  const changes = {
    hasChanges: false,
    changedFields: [],
    fieldDetails: {}
  };

  // Define fields to check with their comparison strategies
  const fieldsToCheck = [
    { name: 'bossId', strategy: 'primitive' },
    { name: 'selectedJobs', strategy: 'array' },
    { name: 'tankPositions', strategy: 'object' },
    { name: 'assignments', strategy: 'deep' }
  ];

  for (const field of fieldsToCheck) {
    const oldValue = oldState?.[field.name];
    const newValue = newState?.[field.name];
    
    let hasChanged = false;
    
    switch (field.strategy) {
      case 'primitive':
        hasChanged = oldValue !== newValue;
        break;
        
      case 'array':
        hasChanged = !compareArrays(oldValue, newValue);
        break;
        
      case 'object':
        hasChanged = !compareObjects(oldValue, newValue);
        break;
        
      case 'deep':
        hasChanged = !deepCompare(oldValue, newValue);
        break;
    }
    
    if (hasChanged) {
      changes.hasChanges = true;
      changes.changedFields.push(field.name);
      changes.fieldDetails[field.name] = {
        oldValue: oldValue,
        newValue: newValue,
        strategy: field.strategy
      };
    }
  }

  return changes;
}

/**
 * Fast array comparison
 */
function compareArrays(arr1, arr2) {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2) return arr1 === arr2;
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  
  return true;
}

/**
 * Shallow object comparison for simple objects
 */
function compareObjects(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

/**
 * Change Origin Tracker
 * Tracks changes initiated by the current user to prevent feedback loops
 */
export class ChangeOriginTracker {
  constructor() {
    this.userChanges = new Map();
    this.sessionId = this._generateSessionId();
    this.browserSessionId = this._getBrowserSessionId();
    this.cleanupInterval = null;
    
    // Start periodic cleanup
    this._startCleanup();
  }

  /**
   * Generate unique session ID
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get or create browser session ID
   */
  _getBrowserSessionId() {
    try {
      let sessionId = sessionStorage.getItem('mitplan_browser_session_id');
      if (!sessionId) {
        sessionId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem('mitplan_browser_session_id', sessionId);
      }
      return sessionId;
    } catch (error) {
      return `browser_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  /**
   * Track a user-originated change
   */
  trackChange(planId, userId, version, changedFields) {
    const changeInfo = {
      planId,
      userId,
      version,
      changedFields,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      browserSessionId: this.browserSessionId
    };

    // Create multiple tracking keys for robust identification
    const keys = [
      `${planId}_${userId}`,
      `${planId}_${userId}_v${version}`,
      `${planId}_${this.sessionId}_${userId}`,
      `${planId}_${this.browserSessionId}_${userId}`,
      `${planId}_${this.sessionId}_v${version}`
    ];

    keys.forEach(key => {
      this.userChanges.set(key, changeInfo);
    });

    console.log('%c[CHANGE TRACKER] Tracked user change', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      userId,
      version,
      changedFields,
      trackingKeys: keys.length
    });

    return changeInfo;
  }

  /**
   * Check if a change was originated by the current user
   */
  isUserOriginatedChange(planId, userId, version, sessionId) {
    const keys = [
      `${planId}_${userId}`,
      `${planId}_${userId}_v${version}`,
      `${planId}_${sessionId}_${userId}`,
      `${planId}_${this.browserSessionId}_${userId}`,
      `${planId}_${sessionId}_v${version}`
    ];

    const matchedKeys = keys.filter(key => this.userChanges.has(key));
    const isOwnChange = matchedKeys.length > 0;

    if (isOwnChange) {
      console.log('%c[CHANGE TRACKER] Detected user-originated change', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        version,
        sessionId,
        matchedKeys: matchedKeys.length
      });
    }

    return isOwnChange;
  }

  /**
   * Start periodic cleanup of old change records
   */
  _startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this._cleanupOldChanges();
    }, 30000); // Clean up every 30 seconds
  }

  /**
   * Clean up old change records (older than 2 minutes)
   */
  _cleanupOldChanges() {
    const cutoffTime = Date.now() - (2 * 60 * 1000); // 2 minutes ago
    let cleanedCount = 0;

    for (const [key, changeInfo] of this.userChanges.entries()) {
      if (changeInfo.timestamp < cutoffTime) {
        this.userChanges.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log('%c[CHANGE TRACKER] Cleaned up old change records', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;', {
        cleanedCount,
        remainingCount: this.userChanges.size
      });
    }
  }

  /**
   * Get statistics about tracked changes
   */
  getStats() {
    return {
      totalTrackedChanges: this.userChanges.size,
      sessionId: this.sessionId,
      browserSessionId: this.browserSessionId
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.userChanges.clear();
  }
}

/**
 * Change Priority Calculator
 * Determines the priority level for different types of changes
 */
export class ChangePriorityCalculator {
  static getPriority(changedFields) {
    // Immediate priority for critical real-time changes
    if (changedFields.includes('emergency') || changedFields.includes('immediate')) {
      return 'immediate';
    }

    // High priority for boss selection (affects entire timeline)
    if (changedFields.includes('bossId')) {
      return 'high';
    }

    // Medium priority for job/tank changes (affects available mitigations)
    if (changedFields.includes('selectedJobs') || changedFields.includes('tankPositions')) {
      return 'medium';
    }

    // Normal priority for assignments and other changes
    return 'normal';
  }

  static getDebounceDelay(priority) {
    const delays = {
      immediate: 0,      // No delay for critical changes
      high: 50,          // Very fast for boss selection
      medium: 150,       // Fast for job/tank changes
      normal: 300        // Normal for assignments
    };

    return delays[priority] || delays.normal;
  }
}

/**
 * Conflict Resolution Utilities
 * Handles conflicts when multiple users make simultaneous changes
 */
export class ConflictResolver {
  /**
   * Resolve conflicts using server-side timestamps
   */
  static resolveByTimestamp(localChange, remoteChange) {
    // If remote change has a later timestamp, it wins
    if (remoteChange.lastUpdated > localChange.lastUpdated) {
      return {
        winner: 'remote',
        resolution: remoteChange,
        reason: 'Remote change has later timestamp'
      };
    }

    // If local change has a later timestamp, it wins
    if (localChange.lastUpdated > remoteChange.lastUpdated) {
      return {
        winner: 'local',
        resolution: localChange,
        reason: 'Local change has later timestamp'
      };
    }

    // If timestamps are equal, use version number
    if (remoteChange.version > localChange.version) {
      return {
        winner: 'remote',
        resolution: remoteChange,
        reason: 'Remote change has higher version'
      };
    }

    return {
      winner: 'local',
      resolution: localChange,
      reason: 'Local change wins on equal timestamps'
    };
  }

  /**
   * Merge non-conflicting changes
   */
  static mergeChanges(localState, remoteState, changedFields) {
    const merged = { ...localState };

    // Only apply remote changes for fields that weren't changed locally
    for (const field of changedFields) {
      if (remoteState[field] !== undefined) {
        merged[field] = remoteState[field];
      }
    }

    return merged;
  }
}

// Export singleton instances
export const changeOriginTracker = new ChangeOriginTracker();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    changeOriginTracker.cleanup();
  });
}
