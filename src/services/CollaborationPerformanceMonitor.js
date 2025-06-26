/**
 * Collaboration Performance Monitor
 * 
 * Monitors and optimizes the performance of the enhanced real-time collaboration system.
 * Tracks metrics, identifies bottlenecks, and provides optimization recommendations.
 */

class CollaborationPerformanceMonitor {
  constructor() {
    this.metrics = {
      stateApplications: [],
      realtimeUpdates: [],
      conflictResolutions: [],
      networkOperations: [],
      memoryUsage: []
    };
    
    this.thresholds = {
      stateApplicationTime: 100, // ms
      updateFrequency: 10, // updates per second
      memoryUsage: 50, // MB
      networkLatency: 200 // ms
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.performanceObserver = null;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    console.log('%c[COLLAB PERF] Starting performance monitoring', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    
    this.isMonitoring = true;
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this._collectMetrics();
      this._analyzePerformance();
      this._cleanupOldMetrics();
    }, 5000); // Every 5 seconds

    // Set up Performance Observer for detailed timing
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('collaboration')) {
            this._recordPerformanceEntry(entry);
          }
        }
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('%c[COLLAB PERF] Stopping performance monitoring', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;');
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }

  /**
   * Record state application performance
   */
  recordStateApplication(planId, duration, success, dataSize = 0) {
    const metric = {
      timestamp: Date.now(),
      planId,
      duration,
      success,
      dataSize,
      type: 'state_application'
    };

    this.metrics.stateApplications.push(metric);

    // Mark performance entry for detailed tracking
    if (typeof performance !== 'undefined') {
      performance.mark(`collaboration-state-application-${planId}-${Date.now()}`);
    }

    // Check for performance issues
    if (duration > this.thresholds.stateApplicationTime) {
      console.warn('%c[COLLAB PERF] Slow state application detected', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        duration,
        threshold: this.thresholds.stateApplicationTime
      });
    }

    return metric;
  }

  /**
   * Record real-time update performance
   */
  recordRealtimeUpdate(planId, updateType, processingTime, success) {
    const metric = {
      timestamp: Date.now(),
      planId,
      updateType,
      processingTime,
      success,
      type: 'realtime_update'
    };

    this.metrics.realtimeUpdates.push(metric);

    // Check update frequency
    const recentUpdates = this.metrics.realtimeUpdates.filter(
      m => m.timestamp > Date.now() - 1000 && m.planId === planId
    );

    if (recentUpdates.length > this.thresholds.updateFrequency) {
      console.warn('%c[COLLAB PERF] High update frequency detected', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        updatesPerSecond: recentUpdates.length,
        threshold: this.thresholds.updateFrequency
      });
    }

    return metric;
  }

  /**
   * Record conflict resolution performance
   */
  recordConflictResolution(planId, strategy, duration, success) {
    const metric = {
      timestamp: Date.now(),
      planId,
      strategy,
      duration,
      success,
      type: 'conflict_resolution'
    };

    this.metrics.conflictResolutions.push(metric);
    return metric;
  }

  /**
   * Record network operation performance
   */
  recordNetworkOperation(operation, duration, success, dataSize = 0) {
    const metric = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      dataSize,
      type: 'network_operation'
    };

    this.metrics.networkOperations.push(metric);

    // Check for high latency
    if (duration > this.thresholds.networkLatency) {
      console.warn('%c[COLLAB PERF] High network latency detected', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        operation,
        duration,
        threshold: this.thresholds.networkLatency
      });
    }

    return metric;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeWindow = 60000) { // Default: last minute
    const cutoff = Date.now() - timeWindow;
    
    const recentStateApplications = this.metrics.stateApplications.filter(m => m.timestamp > cutoff);
    const recentUpdates = this.metrics.realtimeUpdates.filter(m => m.timestamp > cutoff);
    const recentConflicts = this.metrics.conflictResolutions.filter(m => m.timestamp > cutoff);
    const recentNetwork = this.metrics.networkOperations.filter(m => m.timestamp > cutoff);

    return {
      stateApplications: {
        count: recentStateApplications.length,
        averageDuration: this._calculateAverage(recentStateApplications, 'duration'),
        successRate: this._calculateSuccessRate(recentStateApplications),
        slowOperations: recentStateApplications.filter(m => m.duration > this.thresholds.stateApplicationTime).length
      },
      realtimeUpdates: {
        count: recentUpdates.length,
        averageProcessingTime: this._calculateAverage(recentUpdates, 'processingTime'),
        successRate: this._calculateSuccessRate(recentUpdates),
        updateFrequency: recentUpdates.length / (timeWindow / 1000)
      },
      conflictResolutions: {
        count: recentConflicts.length,
        averageDuration: this._calculateAverage(recentConflicts, 'duration'),
        successRate: this._calculateSuccessRate(recentConflicts),
        strategies: this._groupBy(recentConflicts, 'strategy')
      },
      networkOperations: {
        count: recentNetwork.length,
        averageDuration: this._calculateAverage(recentNetwork, 'duration'),
        successRate: this._calculateSuccessRate(recentNetwork),
        highLatencyOperations: recentNetwork.filter(m => m.duration > this.thresholds.networkLatency).length
      },
      memoryUsage: this._getMemoryUsage(),
      recommendations: this._generateRecommendations()
    };
  }

  /**
   * Generate performance optimization recommendations
   */
  _generateRecommendations() {
    const recommendations = [];
    const stats = this.getPerformanceStats();

    // State application recommendations
    if (stats.stateApplications.averageDuration > this.thresholds.stateApplicationTime) {
      recommendations.push({
        type: 'performance',
        category: 'state_application',
        message: 'State application is slow. Consider optimizing data structures or reducing state size.',
        priority: 'high'
      });
    }

    // Update frequency recommendations
    if (stats.realtimeUpdates.updateFrequency > this.thresholds.updateFrequency) {
      recommendations.push({
        type: 'performance',
        category: 'update_frequency',
        message: 'High update frequency detected. Consider implementing better debouncing or batching.',
        priority: 'medium'
      });
    }

    // Network latency recommendations
    if (stats.networkOperations.averageDuration > this.thresholds.networkLatency) {
      recommendations.push({
        type: 'performance',
        category: 'network',
        message: 'High network latency detected. Check connection quality or optimize data payloads.',
        priority: 'medium'
      });
    }

    // Memory usage recommendations
    if (stats.memoryUsage.used > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'performance',
        category: 'memory',
        message: 'High memory usage detected. Consider implementing data cleanup or optimization.',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Collect system metrics
   */
  _collectMetrics() {
    // Record memory usage
    const memoryUsage = this._getMemoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      ...memoryUsage
    });
  }

  /**
   * Analyze performance and log warnings
   */
  _analyzePerformance() {
    const stats = this.getPerformanceStats();
    const recommendations = stats.recommendations;

    if (recommendations.length > 0) {
      console.group('%c[COLLAB PERF] Performance Analysis', 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;');
      recommendations.forEach(rec => {
        const style = rec.priority === 'high' ? 'background: #f44336; color: white;' : 'background: #FF9800; color: white;';
        console.warn(`%c[${rec.category.toUpperCase()}] ${rec.message}`, style + ' padding: 2px 5px; border-radius: 3px;');
      });
      console.groupEnd();
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  _cleanupOldMetrics() {
    const cutoff = Date.now() - 300000; // Keep last 5 minutes
    
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = this.metrics[key].filter(metric => metric.timestamp > cutoff);
    });
  }

  /**
   * Record performance entry from Performance Observer
   */
  _recordPerformanceEntry(entry) {
    // Process performance entries for detailed analysis
    console.log('%c[COLLAB PERF] Performance entry recorded', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime
    });
  }

  /**
   * Get memory usage information
   */
  _getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  /**
   * Calculate average of a numeric property
   */
  _calculateAverage(array, property) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + (item[property] || 0), 0);
    return Math.round(sum / array.length);
  }

  /**
   * Calculate success rate
   */
  _calculateSuccessRate(array) {
    if (array.length === 0) return 100;
    const successful = array.filter(item => item.success).length;
    return Math.round((successful / array.length) * 100);
  }

  /**
   * Group array by property
   */
  _groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Reset all metrics
   */
  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    console.log('%c[COLLAB PERF] Metrics reset', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;');
  }
}

// Export singleton instance
const collaborationPerformanceMonitor = new CollaborationPerformanceMonitor();
export default collaborationPerformanceMonitor;
