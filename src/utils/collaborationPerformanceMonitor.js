/**
 * Collaboration Performance Monitor
 * 
 * Monitors and tracks Firebase Realtime Database operations
 * to measure the effectiveness of collaboration optimizations.
 */

import { PERFORMANCE_CONFIG, logOptimizationMetrics } from '../config/collaborationOptimization';

class CollaborationPerformanceMonitor {
  constructor() {
    this.metrics = {
      firebaseWrites: 0,
      firebaseReads: 0,
      syncOperations: 0,
      skippedWrites: 0,
      optimizedOperations: 0,
      startTime: Date.now(),
      lastReset: Date.now()
    };

    this.operationHistory = [];
    this.performanceIntervals = new Map();

    // Start monitoring if enabled
    if (PERFORMANCE_CONFIG.TRACK_FIREBASE_OPERATIONS) {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    console.log('%c[PERFORMANCE MONITOR] Starting collaboration performance monitoring', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

    // Log metrics every minute
    const metricsInterval = setInterval(() => {
      this.logCurrentMetrics();
    }, 60000);

    this.performanceIntervals.set('metrics', metricsInterval);

    // Check for performance alerts every 30 seconds
    const alertInterval = setInterval(() => {
      this.checkPerformanceAlerts();
    }, 30000);

    this.performanceIntervals.set('alerts', alertInterval);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    console.log('%c[PERFORMANCE MONITOR] Stopping collaboration performance monitoring', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');

    for (const [name, interval] of this.performanceIntervals) {
      clearInterval(interval);
    }
    this.performanceIntervals.clear();
  }

  /**
   * Track a Firebase write operation
   */
  trackFirebaseWrite(planId, operation, optimized = false) {
    this.metrics.firebaseWrites++;
    
    if (optimized) {
      this.metrics.optimizedOperations++;
    }

    this.recordOperation('write', planId, operation, optimized);

    if (PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
      console.log('%c[PERFORMANCE] Firebase write tracked', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        operation,
        optimized,
        totalWrites: this.metrics.firebaseWrites
      });
    }
  }

  /**
   * Track a Firebase read operation
   */
  trackFirebaseRead(planId, operation, optimized = false) {
    this.metrics.firebaseReads++;
    
    if (optimized) {
      this.metrics.optimizedOperations++;
    }

    this.recordOperation('read', planId, operation, optimized);

    if (PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
      console.log('%c[PERFORMANCE] Firebase read tracked', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        operation,
        optimized,
        totalReads: this.metrics.firebaseReads
      });
    }
  }

  /**
   * Track a sync operation
   */
  trackSyncOperation(planId, dataType, skipped = false) {
    this.metrics.syncOperations++;
    
    if (skipped) {
      this.metrics.skippedWrites++;
    }

    this.recordOperation('sync', planId, dataType, !skipped);

    if (PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
      console.log('%c[PERFORMANCE] Sync operation tracked', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        dataType,
        skipped,
        totalSyncs: this.metrics.syncOperations,
        skippedWrites: this.metrics.skippedWrites
      });
    }
  }

  /**
   * Record operation in history
   */
  recordOperation(type, planId, operation, optimized) {
    const record = {
      timestamp: Date.now(),
      type,
      planId,
      operation,
      optimized
    };

    this.operationHistory.push(record);

    // Keep only last 1000 operations
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-1000);
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics() {
    const now = Date.now();
    const uptimeMinutes = (now - this.metrics.startTime) / 60000;
    const timeSinceReset = (now - this.metrics.lastReset) / 60000;

    return {
      ...this.metrics,
      uptimeMinutes: Math.round(uptimeMinutes * 100) / 100,
      timeSinceResetMinutes: Math.round(timeSinceReset * 100) / 100,
      writesPerMinute: Math.round((this.metrics.firebaseWrites / timeSinceReset) * 100) / 100,
      readsPerMinute: Math.round((this.metrics.firebaseReads / timeSinceReset) * 100) / 100,
      optimizationRate: this.metrics.syncOperations > 0 
        ? Math.round((this.metrics.optimizedOperations / this.metrics.syncOperations) * 100)
        : 0,
      skipRate: this.metrics.syncOperations > 0
        ? Math.round((this.metrics.skippedWrites / this.metrics.syncOperations) * 100)
        : 0
    };
  }

  /**
   * Log current metrics
   */
  logCurrentMetrics() {
    const metrics = this.getCurrentMetrics();
    
    logOptimizationMetrics({
      firebaseOperations: {
        writes: metrics.firebaseWrites,
        reads: metrics.firebaseReads,
        writesPerMinute: metrics.writesPerMinute,
        readsPerMinute: metrics.readsPerMinute
      },
      syncOperations: {
        total: metrics.syncOperations,
        optimized: metrics.optimizedOperations,
        skipped: metrics.skippedWrites,
        optimizationRate: `${metrics.optimizationRate}%`,
        skipRate: `${metrics.skipRate}%`
      },
      performance: {
        uptimeMinutes: metrics.uptimeMinutes,
        timeSinceResetMinutes: metrics.timeSinceResetMinutes
      }
    });
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts() {
    const metrics = this.getCurrentMetrics();

    if (metrics.writesPerMinute > PERFORMANCE_CONFIG.MAX_WRITES_PER_MINUTE) {
      console.warn('%c[PERFORMANCE ALERT] High write rate detected', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        current: metrics.writesPerMinute,
        threshold: PERFORMANCE_CONFIG.MAX_WRITES_PER_MINUTE,
        recommendation: 'Consider enabling more optimizations'
      });
    }

    if (metrics.readsPerMinute > PERFORMANCE_CONFIG.MAX_READS_PER_MINUTE) {
      console.warn('%c[PERFORMANCE ALERT] High read rate detected', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        current: metrics.readsPerMinute,
        threshold: PERFORMANCE_CONFIG.MAX_READS_PER_MINUTE,
        recommendation: 'Check for unnecessary listeners or polling'
      });
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    console.log('%c[PERFORMANCE MONITOR] Resetting metrics', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');

    this.metrics = {
      firebaseWrites: 0,
      firebaseReads: 0,
      syncOperations: 0,
      skippedWrites: 0,
      optimizedOperations: 0,
      startTime: this.metrics.startTime, // Keep original start time
      lastReset: Date.now()
    };

    this.operationHistory = [];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const metrics = this.getCurrentMetrics();
    const recentOperations = this.operationHistory.slice(-100);
    
    const operationsByType = recentOperations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {});

    const optimizedOperations = recentOperations.filter(op => op.optimized).length;

    return {
      totalOperations: this.metrics.firebaseWrites + this.metrics.firebaseReads,
      operationBreakdown: {
        writes: this.metrics.firebaseWrites,
        reads: this.metrics.firebaseReads,
        syncs: this.metrics.syncOperations
      },
      optimizationMetrics: {
        optimizedOperations: this.metrics.optimizedOperations,
        skippedWrites: this.metrics.skippedWrites,
        optimizationRate: `${metrics.optimizationRate}%`,
        skipRate: `${metrics.skipRate}%`
      },
      performanceRates: {
        writesPerMinute: metrics.writesPerMinute,
        readsPerMinute: metrics.readsPerMinute
      },
      recentActivity: {
        last100Operations: operationsByType,
        recentOptimizedOperations: optimizedOperations
      },
      uptime: {
        totalMinutes: metrics.uptimeMinutes,
        sinceLastReset: metrics.timeSinceResetMinutes
      }
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      metrics: this.getCurrentMetrics(),
      operationHistory: this.operationHistory,
      summary: this.getPerformanceSummary(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Create singleton instance
const performanceMonitor = new CollaborationPerformanceMonitor();

export default performanceMonitor;
