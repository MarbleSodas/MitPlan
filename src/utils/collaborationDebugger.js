/**
 * Collaboration Debugger Utility
 * 
 * Provides comprehensive debugging and monitoring for real-time collaboration
 * to ensure 100% reliable synchronization across all users.
 */

class CollaborationDebugger {
  constructor() {
    this.logs = [];
    this.syncAttempts = new Map();
    this.failedSyncs = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
    this.maxLogs = 500; // Reduced from 1000
  }

  /**
   * Log a collaboration event with detailed context
   */
  log(category, event, data = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      event,
      data,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with color coding
    const colors = {
      sync: '#2196F3',
      error: '#f44336',
      success: '#4CAF50',
      warning: '#FF9800',
      info: '#9C27B0'
    };

    const color = colors[category] || '#666';
    console.log(`%c[COLLAB DEBUG] ${event}`, `background: ${color}; color: white; padding: 2px 5px; border-radius: 3px;`, data);
  }

  /**
   * Track a sync attempt
   */
  trackSyncAttempt(planId, dataType, data, userId) {
    const attemptId = `${planId}_${dataType}_${Date.now()}`;
    
    this.syncAttempts.set(attemptId, {
      planId,
      dataType,
      data: typeof data === 'object' ? JSON.stringify(data).length : String(data).length,
      userId,
      startTime: Date.now(),
      status: 'pending'
    });

    this.log('sync', 'Sync attempt started', {
      attemptId,
      planId,
      dataType,
      userId,
      dataSize: typeof data === 'object' ? JSON.stringify(data).length : String(data).length
    });

    return attemptId;
  }

  /**
   * Mark a sync attempt as successful
   */
  markSyncSuccess(attemptId, result = {}) {
    const attempt = this.syncAttempts.get(attemptId);
    if (!attempt) return;

    attempt.status = 'success';
    attempt.endTime = Date.now();
    attempt.duration = attempt.endTime - attempt.startTime;
    attempt.result = result;

    this.log('success', 'Sync completed successfully', {
      attemptId,
      duration: attempt.duration,
      planId: attempt.planId,
      dataType: attempt.dataType,
      result
    });
  }

  /**
   * Mark a sync attempt as failed
   */
  markSyncFailure(attemptId, error) {
    const attempt = this.syncAttempts.get(attemptId);
    if (!attempt) return;

    attempt.status = 'failed';
    attempt.endTime = Date.now();
    attempt.duration = attempt.endTime - attempt.startTime;
    attempt.error = error.message || error;

    this.failedSyncs.push({
      ...attempt,
      error: error.message || error,
      stack: error.stack
    });

    this.log('error', 'Sync failed', {
      attemptId,
      duration: attempt.duration,
      planId: attempt.planId,
      dataType: attempt.dataType,
      error: error.message || error
    });
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    const attempts = Array.from(this.syncAttempts.values());
    const successful = attempts.filter(a => a.status === 'success');
    const failed = attempts.filter(a => a.status === 'failed');
    const pending = attempts.filter(a => a.status === 'pending');

    return {
      total: attempts.length,
      successful: successful.length,
      failed: failed.length,
      pending: pending.length,
      successRate: attempts.length > 0 ? (successful.length / attempts.length * 100).toFixed(2) : 0,
      averageDuration: successful.length > 0 ? 
        (successful.reduce((sum, a) => sum + (a.duration || 0), 0) / successful.length).toFixed(2) : 0
    };
  }

  /**
   * Get recent failed syncs
   */
  getRecentFailures(limit = 10) {
    return this.failedSyncs.slice(-limit);
  }

  /**
   * Check for potential issues
   */
  checkForIssues() {
    const stats = this.getSyncStats();
    const issues = [];

    // Check success rate
    if (stats.successRate < 95 && stats.total > 5) {
      issues.push({
        type: 'low_success_rate',
        message: `Low sync success rate: ${stats.successRate}%`,
        severity: 'high'
      });
    }

    // Check for slow syncs
    if (stats.averageDuration > 2000) {
      issues.push({
        type: 'slow_syncs',
        message: `Average sync duration is high: ${stats.averageDuration}ms`,
        severity: 'medium'
      });
    }

    // Check for pending syncs
    if (stats.pending > 5) {
      issues.push({
        type: 'many_pending',
        message: `Many pending syncs: ${stats.pending}`,
        severity: 'medium'
      });
    }

    return issues;
  }

  /**
   * Generate a debug report
   */
  generateReport() {
    const stats = this.getSyncStats();
    const issues = this.checkForIssues();
    const recentFailures = this.getRecentFailures();

    return {
      timestamp: new Date().toISOString(),
      stats,
      issues,
      recentFailures,
      totalLogs: this.logs.length,
      isEnabled: this.isEnabled
    };
  }

  /**
   * Export logs for analysis
   */
  exportLogs() {
    return {
      logs: this.logs,
      syncAttempts: Array.from(this.syncAttempts.entries()),
      failedSyncs: this.failedSyncs,
      report: this.generateReport()
    };
  }

  /**
   * Clear all logs and data
   */
  clear() {
    this.logs = [];
    this.syncAttempts.clear();
    this.failedSyncs = [];
    this.log('info', 'Debug data cleared');
  }

  /**
   * Enable/disable debugging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.log('info', `Debugging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Test shared plan data loading completeness
   */
  async testSharedPlanLoading(planId, userId = null) {
    this.log('info', 'Starting shared plan loading test', { planId, userId });

    const testResult = {
      planId,
      userId,
      timestamp: new Date().toISOString(),
      tests: {},
      overall: { success: false, errors: [] }
    };

    try {
      // Import services dynamically to avoid circular dependencies
      const { default: enhancedPlanStateCoordinator } = await import('../services/EnhancedPlanStateCoordinator');

      // Test Enhanced Plan State Coordinator
      this.log('info', 'Testing Enhanced Plan State Coordinator');

      const coordinatorResult = await enhancedPlanStateCoordinator.loadSharedPlanState(planId, userId);
      testResult.tests.coordinator = {
        success: coordinatorResult.success,
        source: coordinatorResult.source,
        isCollaborative: coordinatorResult.isCollaborative,
        hasAssignments: !!coordinatorResult.planState?.assignments,
        hasSelectedJobs: !!coordinatorResult.planState?.selectedJobs,
        hasBossId: !!coordinatorResult.planState?.bossId,
        hasTankPositions: !!coordinatorResult.planState?.tankPositions,
        message: coordinatorResult.message
      };

      if (coordinatorResult.success) {
        this.log('success', 'Plan state loaded successfully', testResult.tests.coordinator);

        // Validate plan state completeness
        this.log('info', 'Testing Plan State Validation');

        const validation = this._validatePlanStateCompleteness(coordinatorResult.planState);
        testResult.tests.validation = validation;

        if (validation.isComplete) {
          this.log('success', 'Plan state validation passed', validation);
        } else {
          this.log('warning', 'Plan state validation issues found', validation);
        }

        testResult.overall.success = coordinatorResult.success && validation.isComplete;
      } else {
        this.log('error', 'Failed to load plan state', coordinatorResult);
        testResult.overall.errors.push('Failed to load plan state from coordinator');
      }

    } catch (error) {
      this.log('error', 'Test failed with error', { error: error.message, stack: error.stack });
      testResult.overall.errors.push(error.message);
    }

    this.log('info', 'Shared plan loading test completed', testResult);
    return testResult;
  }

  /**
   * Validate plan state completeness
   */
  _validatePlanStateCompleteness(planState) {
    const validation = {
      isComplete: true,
      missing: [],
      present: [],
      details: {}
    };

    // Check for essential fields
    const essentialFields = [
      { key: 'assignments', type: 'object', description: 'Mitigation assignments' },
      { key: 'selectedJobs', type: 'object', description: 'Selected job configurations' },
      { key: 'bossId', type: 'string', description: 'Boss selection' },
      { key: 'tankPositions', type: 'object', description: 'Tank position assignments' }
    ];

    essentialFields.forEach(field => {
      if (planState[field.key] !== undefined && planState[field.key] !== null) {
        if (typeof planState[field.key] === field.type) {
          validation.present.push(field.description);

          // Additional validation for objects
          if (field.type === 'object') {
            const hasData = Object.keys(planState[field.key]).length > 0;
            validation.details[field.key] = {
              hasData,
              keyCount: Object.keys(planState[field.key]).length,
              keys: Object.keys(planState[field.key])
            };
          } else {
            validation.details[field.key] = {
              value: planState[field.key],
              length: planState[field.key].length
            };
          }
        } else {
          validation.missing.push(`${field.description} (wrong type: expected ${field.type}, got ${typeof planState[field.key]})`);
          validation.isComplete = false;
        }
      } else {
        validation.missing.push(field.description);
        validation.isComplete = false;
      }
    });

    return validation;
  }
}

// Create singleton instance
const collaborationDebugger = new CollaborationDebugger();

// Expose to window for manual debugging
if (typeof window !== 'undefined') {
  window.collaborationDebugger = collaborationDebugger;
}

export default collaborationDebugger;
