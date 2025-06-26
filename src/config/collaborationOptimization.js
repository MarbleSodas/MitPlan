/**
 * Collaboration Optimization Configuration
 * 
 * Central configuration for collaboration system optimizations
 * to reduce Firebase Realtime Database usage and costs.
 */

/**
 * Feature flags for collaboration optimizations
 */
export const COLLABORATION_OPTIMIZATION = {
  // Use optimized single-document sync service
  USE_OPTIMIZED_SYNC: import.meta.env.VITE_USE_OPTIMIZED_SYNC === 'true' || false,
  
  // Disable redundant specific path broadcasting
  DISABLE_SPECIFIC_PATH_BROADCASTING: true,
  
  // Optimized heartbeat settings
  HEARTBEAT_INTERVAL: 60000, // 60 seconds (reduced from 30s)
  
  // Debounce settings for sync operations
  SYNC_DEBOUNCE_DELAY: 300, // 300ms (reduced from 500ms)
  
  // Change detection settings
  ENABLE_SMART_CHANGE_DETECTION: true,
  
  // Session management optimizations
  EMBED_SESSION_INFO_IN_PLAN: true,
  
  // Cleanup settings
  AUTO_CLEANUP_OLD_STRUCTURE: false, // Set to true after migration is complete
  
  // Debug settings
  ENABLE_OPTIMIZATION_LOGGING: true
};

/**
 * Firebase path optimization settings
 */
export const FIREBASE_PATH_CONFIG = {
  // Use single plan document path instead of multiple paths
  USE_UNIFIED_PLAN_PATH: true,
  
  // Legacy paths to migrate from
  LEGACY_PATHS: [
    'planState',
    'assignments',
    'jobSelections',
    'bossSelection', 
    'tankPositions',
    'planUpdates'
  ],
  
  // New optimized path structure
  OPTIMIZED_PATHS: {
    PLAN_DOCUMENT: 'plan',
    ACTIVE_USERS: 'activeUsers',
    USER_SELECTIONS: 'selections'
  }
};

/**
 * Performance monitoring configuration
 */
export const PERFORMANCE_CONFIG = {
  // Track Firebase operation counts
  TRACK_FIREBASE_OPERATIONS: true,
  
  // Monitor sync performance
  TRACK_SYNC_PERFORMANCE: true,
  
  // Alert thresholds
  MAX_WRITES_PER_MINUTE: 10,
  MAX_READS_PER_MINUTE: 30,
  
  // Performance logging
  LOG_PERFORMANCE_METRICS: true
};

/**
 * Migration configuration
 */
export const MIGRATION_CONFIG = {
  // Enable automatic migration detection
  AUTO_DETECT_MIGRATION_NEEDED: true,
  
  // Batch migration settings
  MIGRATION_BATCH_SIZE: 5,
  MIGRATION_DELAY_BETWEEN_BATCHES: 1000, // 1 second
  
  // Cleanup after migration
  CLEANUP_OLD_STRUCTURE_AFTER_MIGRATION: false,
  
  // Migration logging
  LOG_MIGRATION_PROGRESS: true
};

/**
 * Get current optimization status
 */
export function getOptimizationStatus() {
  return {
    optimizedSyncEnabled: COLLABORATION_OPTIMIZATION.USE_OPTIMIZED_SYNC,
    specificPathBroadcastingDisabled: COLLABORATION_OPTIMIZATION.DISABLE_SPECIFIC_PATH_BROADCASTING,
    heartbeatOptimized: COLLABORATION_OPTIMIZATION.HEARTBEAT_INTERVAL > 30000,
    changeDetectionEnabled: COLLABORATION_OPTIMIZATION.ENABLE_SMART_CHANGE_DETECTION,
    unifiedPathEnabled: FIREBASE_PATH_CONFIG.USE_UNIFIED_PLAN_PATH,
    performanceTrackingEnabled: PERFORMANCE_CONFIG.TRACK_FIREBASE_OPERATIONS
  };
}

/**
 * Get estimated Firebase operation reduction
 */
export function getEstimatedReduction() {
  const optimizations = getOptimizationStatus();
  let reductionPercentage = 0;

  if (optimizations.optimizedSyncEnabled) {
    reductionPercentage += 40; // Single document vs multiple paths
  }

  if (optimizations.specificPathBroadcastingDisabled) {
    reductionPercentage += 20; // No dual writes
  }

  if (optimizations.changeDetectionEnabled) {
    reductionPercentage += 15; // Skip unnecessary writes
  }

  if (optimizations.heartbeatOptimized) {
    reductionPercentage += 10; // Reduced heartbeat frequency
  }

  return Math.min(reductionPercentage, 70); // Cap at 70% reduction
}

/**
 * Log optimization metrics
 */
export function logOptimizationMetrics(metrics) {
  if (!COLLABORATION_OPTIMIZATION.ENABLE_OPTIMIZATION_LOGGING) {
    return;
  }

  console.log('%c[OPTIMIZATION METRICS]', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
    timestamp: new Date().toISOString(),
    estimatedReduction: `${getEstimatedReduction()}%`,
    optimizationStatus: getOptimizationStatus(),
    metrics
  });
}

/**
 * Validate optimization configuration
 */
export function validateOptimizationConfig() {
  const issues = [];

  if (COLLABORATION_OPTIMIZATION.USE_OPTIMIZED_SYNC && !FIREBASE_PATH_CONFIG.USE_UNIFIED_PLAN_PATH) {
    issues.push('Optimized sync requires unified plan path to be enabled');
  }

  if (COLLABORATION_OPTIMIZATION.HEARTBEAT_INTERVAL < 30000) {
    issues.push('Heartbeat interval should be at least 30 seconds for optimization');
  }

  if (COLLABORATION_OPTIMIZATION.SYNC_DEBOUNCE_DELAY < 100) {
    issues.push('Sync debounce delay should be at least 100ms');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get optimization recommendations
 */
export function getOptimizationRecommendations() {
  const status = getOptimizationStatus();
  const recommendations = [];

  if (!status.optimizedSyncEnabled) {
    recommendations.push({
      type: 'high',
      message: 'Enable optimized sync service for 40% reduction in Firebase operations',
      action: 'Set VITE_USE_OPTIMIZED_SYNC=true in environment variables'
    });
  }

  if (!status.changeDetectionEnabled) {
    recommendations.push({
      type: 'medium', 
      message: 'Enable smart change detection to prevent unnecessary writes',
      action: 'Set ENABLE_SMART_CHANGE_DETECTION=true in configuration'
    });
  }

  if (!status.heartbeatOptimized) {
    recommendations.push({
      type: 'low',
      message: 'Increase heartbeat interval to reduce connection overhead',
      action: 'Set HEARTBEAT_INTERVAL to 60000 or higher'
    });
  }

  return recommendations;
}
