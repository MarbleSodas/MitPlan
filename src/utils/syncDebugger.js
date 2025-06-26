/**
 * Sync Debugger Utility
 * 
 * Provides debugging tools for real-time synchronization issues.
 * Helps track sync attempts, failures, and Firebase connectivity.
 */

class SyncDebugger {
  constructor() {
    this.syncAttempts = new Map();
    this.syncHistory = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
    this.maxHistorySize = 100;
  }

  /**
   * Enable or disable debugging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      console.log('%c[SYNC DEBUGGER] Debugging enabled', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    }
  }

  /**
   * Track a sync attempt
   */
  trackSyncAttempt(planId, dataType, data, userId) {
    if (!this.isEnabled) return null;

    const attemptId = `${planId}_${dataType}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const attempt = {
      id: attemptId,
      planId,
      dataType,
      userId,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      status: 'pending',
      error: null,
      result: null
    };

    this.syncAttempts.set(attemptId, attempt);
    this.addToHistory('sync_attempt', attempt);

    console.log('%c[SYNC DEBUGGER] Tracking sync attempt', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      attemptId,
      planId,
      dataType,
      userId,
      dataSize: this.getDataSize(data)
    });

    return attemptId;
  }

  /**
   * Mark sync attempt as successful
   */
  markSyncSuccess(attemptId, result) {
    if (!this.isEnabled || !attemptId) return;

    const attempt = this.syncAttempts.get(attemptId);
    if (attempt) {
      attempt.status = 'success';
      attempt.result = result;
      attempt.completedAt = Date.now();
      attempt.duration = attempt.completedAt - attempt.timestamp;

      this.addToHistory('sync_success', attempt);

      console.log('%c[SYNC DEBUGGER] Sync successful', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        attemptId,
        duration: `${attempt.duration}ms`,
        version: result.version
      });
    }
  }

  /**
   * Mark sync attempt as failed
   */
  markSyncFailure(attemptId, error) {
    if (!this.isEnabled || !attemptId) return;

    const attempt = this.syncAttempts.get(attemptId);
    if (attempt) {
      attempt.status = 'failed';
      attempt.error = {
        message: error.message,
        stack: error.stack,
        code: error.code
      };
      attempt.completedAt = Date.now();
      attempt.duration = attempt.completedAt - attempt.timestamp;

      this.addToHistory('sync_failure', attempt);

      console.error('%c[SYNC DEBUGGER] Sync failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        attemptId,
        duration: `${attempt.duration}ms`,
        error: error.message
      });
    }
  }

  /**
   * Track Firebase connectivity issues
   */
  trackConnectivityIssue(planId, error, context) {
    if (!this.isEnabled) return;

    const issue = {
      planId,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context,
      timestamp: Date.now()
    };

    this.addToHistory('connectivity_issue', issue);

    console.error('%c[SYNC DEBUGGER] Connectivity issue', 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      context,
      error: error.message
    });
  }

  /**
   * Track user ID issues
   */
  trackUserIdIssue(planId, userId, issue, context) {
    if (!this.isEnabled) return;

    const userIdIssue = {
      planId,
      userId,
      issue,
      context,
      timestamp: Date.now()
    };

    this.addToHistory('user_id_issue', userIdIssue);

    console.warn('%c[SYNC DEBUGGER] User ID issue', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      userId,
      issue,
      context
    });
  }

  /**
   * Get sync statistics for a plan
   */
  getSyncStats(planId) {
    if (!this.isEnabled) return null;

    const planAttempts = Array.from(this.syncAttempts.values()).filter(attempt => attempt.planId === planId);
    
    const stats = {
      totalAttempts: planAttempts.length,
      successful: planAttempts.filter(a => a.status === 'success').length,
      failed: planAttempts.filter(a => a.status === 'failed').length,
      pending: planAttempts.filter(a => a.status === 'pending').length,
      averageDuration: 0,
      dataTypes: {}
    };

    // Calculate average duration for completed attempts
    const completedAttempts = planAttempts.filter(a => a.duration);
    if (completedAttempts.length > 0) {
      stats.averageDuration = Math.round(
        completedAttempts.reduce((sum, a) => sum + a.duration, 0) / completedAttempts.length
      );
    }

    // Group by data type
    planAttempts.forEach(attempt => {
      if (!stats.dataTypes[attempt.dataType]) {
        stats.dataTypes[attempt.dataType] = { total: 0, successful: 0, failed: 0 };
      }
      stats.dataTypes[attempt.dataType].total++;
      if (attempt.status === 'success') {
        stats.dataTypes[attempt.dataType].successful++;
      } else if (attempt.status === 'failed') {
        stats.dataTypes[attempt.dataType].failed++;
      }
    });

    return stats;
  }

  /**
   * Get recent sync history
   */
  getRecentHistory(limit = 20) {
    if (!this.isEnabled) return [];

    return this.syncHistory
      .slice(-limit)
      .map(entry => ({
        ...entry,
        timeAgo: this.getTimeAgo(entry.timestamp)
      }));
  }

  /**
   * Generate a debug report
   */
  generateDebugReport(planId) {
    if (!this.isEnabled) return null;

    const stats = this.getSyncStats(planId);
    const recentHistory = this.getRecentHistory(10);
    const connectivityIssues = this.syncHistory
      .filter(entry => entry.type === 'connectivity_issue' && entry.data.planId === planId)
      .slice(-5);

    const report = {
      planId,
      timestamp: new Date().toISOString(),
      stats,
      recentHistory,
      connectivityIssues,
      recommendations: this.generateRecommendations(stats, connectivityIssues)
    };

    console.log('%c[SYNC DEBUGGER] Debug Report Generated', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', report);

    return report;
  }

  /**
   * Generate recommendations based on sync patterns
   */
  generateRecommendations(stats, connectivityIssues) {
    const recommendations = [];

    if (stats.failed > stats.successful) {
      recommendations.push('High failure rate detected. Check Firebase connectivity and user authentication.');
    }

    if (stats.averageDuration > 5000) {
      recommendations.push('Slow sync operations detected. Consider optimizing data size or checking network conditions.');
    }

    if (connectivityIssues.length > 3) {
      recommendations.push('Multiple connectivity issues detected. Check Firebase configuration and network stability.');
    }

    if (stats.pending > 5) {
      recommendations.push('Many pending sync operations. Check for stuck operations or timeout issues.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Sync operations appear to be functioning normally.');
    }

    return recommendations;
  }

  /**
   * Clear debug data
   */
  clearDebugData() {
    if (!this.isEnabled) return;

    this.syncAttempts.clear();
    this.syncHistory = [];

    console.log('%c[SYNC DEBUGGER] Debug data cleared', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
  }

  /**
   * Export debug data for analysis
   */
  exportDebugData() {
    if (!this.isEnabled) return null;

    const data = {
      syncAttempts: Array.from(this.syncAttempts.values()),
      syncHistory: this.syncHistory,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('%c[SYNC DEBUGGER] Debug data exported', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');

    return data;
  }

  /**
   * Add entry to history
   */
  addToHistory(type, data) {
    this.syncHistory.push({
      type,
      data,
      timestamp: Date.now()
    });

    // Keep history size manageable
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory = this.syncHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Sanitize data for logging (remove sensitive info, limit size)
   */
  sanitizeData(data) {
    if (!data) return null;

    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      
      // Limit object size for logging
      const str = JSON.stringify(sanitized);
      if (str.length > 1000) {
        return `[Large object: ${str.length} chars]`;
      }
      
      return sanitized;
    } catch (error) {
      return '[Unserializable data]';
    }
  }

  /**
   * Get data size for logging
   */
  getDataSize(data) {
    if (!data) return 0;
    
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get human-readable time ago
   */
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }
}

// Create singleton instance
const syncDebugger = new SyncDebugger();

// Expose to window for manual debugging
if (typeof window !== 'undefined') {
  window.syncDebugger = syncDebugger;
}

export default syncDebugger;
