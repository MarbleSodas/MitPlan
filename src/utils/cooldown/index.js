/**
 * Enhanced Cooldown Management System
 * 
 * This module provides a comprehensive cooldown management system for
 * mitigation abilities in the MitPlan application.
 * 
 * Features:
 * - Cooldown-based disabling of abilities
 * - Multi-charge ability tracking (like Scholar's Aetherflow)
 * - Role-shared ability instance tracking
 * - Real-time collaboration support
 * - Performance optimization with caching
 * - Comprehensive validation and testing
 */

// Core cooldown management
export {
  CooldownManager,
  AbilityAvailability,
  AbilityUsage,
  getCooldownManager,
  updateCooldownManager,
  checkAbilityAvailability,
  checkMultipleAbilities
} from './cooldownManager';

// Import for local use in this file
import {
  getCooldownManager as _getCooldownManager
} from './cooldownManager';
import {
  getChargesTracker as _getChargesTracker
} from './chargesTracker';
import {
  getInstancesTracker as _getInstancesTracker
} from './instancesTracker';
import {
  getAetherflowTracker as _getAetherflowTracker
} from './aetherflowTracker';
import {
  getRealtimeCooldownSync as _getRealtimeCooldownSync
} from './realtimeSync';
import {
  validateCooldownSystem as _validateCooldownSystem,
  CooldownValidator as _CooldownValidator
} from './validation';

// Charges tracking for multi-charge abilities
export {
  ChargesTracker,
  ChargeState,
  getChargesTracker,
  updateChargesTracker
} from './chargesTracker';

// Instances tracking for role-shared abilities
export {
  InstancesTracker,
  InstancesState,
  AbilityInstance,
  getInstancesTracker,
  updateInstancesTracker
} from './instancesTracker';

// Aetherflow tracking for Scholar abilities
export {
  AetherflowTracker,
  AetherflowState,
  getAetherflowTracker,
  updateAetherflowTracker
} from './aetherflowTracker';

// Real-time synchronization
export {
  RealtimeCooldownSync,
  CooldownSnapshot,
  getRealtimeCooldownSync,
  processRealtimeUpdate,
  createOutgoingSnapshot
} from './realtimeSync';

// Validation and testing
export {
  CooldownValidator,
  ValidationResult,
  ContinuousValidator,
  validateCooldownSystem
} from './validation';

/**
 * Initialize the enhanced cooldown system
 * 
 * @param {Object} config - Configuration options
 * @param {Array} config.bossActions - Array of boss actions
 * @param {number} config.bossLevel - Boss level (default: 90)
 * @param {Object} config.selectedJobs - Selected jobs object
 * @param {Object} config.tankPositions - Tank positions object
 * @param {Object} config.assignments - Current mitigation assignments
 * @param {boolean} config.enableValidation - Enable continuous validation (default: false)
 * @param {boolean} config.enableRealtimeSync - Enable real-time synchronization (default: true)
 * @returns {Object} - Initialized cooldown system components
 */
export const initializeCooldownSystem = (config = {}) => {
  const {
    bossActions = [],
    bossLevel = 90,
    selectedJobs = {},
    tankPositions = {},
    assignments = {},
    enableValidation = false,
    enableRealtimeSync = true
  } = config;

  // Initialize the main cooldown manager
  const cooldownManager = _getCooldownManager();
  cooldownManager.update({
    bossActions,
    bossLevel,
    selectedJobs,
    tankPositions,
    assignments
  });

  // Initialize real-time sync if enabled
  let realtimeSync = null;
  if (enableRealtimeSync) {
    realtimeSync = _getRealtimeCooldownSync();
  }

  // Initialize validation if enabled
  let validator = null;
  if (enableValidation) {
    validator = new _CooldownValidator();
    
    // Run initial validation
    const validationResult = validator.validateSystem({
      bossActions,
      bossLevel,
      selectedJobs,
      tankPositions,
      assignments
    });
    
    console.log('[CooldownSystem] Initial validation result:', validationResult.getReport());
  }

  return {
    cooldownManager,
    realtimeSync,
    validator,
    
    // Convenience methods
    checkAvailability: (abilityId, targetTime, targetBossActionId, options) => 
      cooldownManager.checkAbilityAvailability(abilityId, targetTime, targetBossActionId, options),
    
    updateSystem: (newData) => {
      cooldownManager.update(newData);
      
      if (validator) {
        const validationResult = validator.validateSystem(newData);
        if (!validationResult.isValid) {
          console.warn('[CooldownSystem] Validation failed after update:', validationResult.getReport());
        }
      }
    },
    
    getSystemStatus: () => ({
      cooldownManager: {
        lastCacheUpdate: cooldownManager.lastCacheUpdate,
        cacheSize: cooldownManager.availabilityCache.size
      },
      realtimeSync: realtimeSync ? realtimeSync.getSyncStatus() : null,
      validation: validator ? validator.validateSystem({
        bossActions: cooldownManager.bossActions,
        bossLevel: cooldownManager.bossLevel,
        selectedJobs: cooldownManager.selectedJobs,
        tankPositions: cooldownManager.tankPositions,
        assignments: cooldownManager.assignments
      }).getReport() : null
    })
  };
};

/**
 * Reset the entire cooldown system
 * 
 * This clears all caches and resets all trackers to their initial state.
 * Useful for testing or when switching between different boss encounters.
 */
export const resetCooldownSystem = () => {
  const cooldownManager = _getCooldownManager();
  cooldownManager.clearCache();

  const chargesTracker = _getChargesTracker();
  chargesTracker.clearCache();

  const instancesTracker = _getInstancesTracker();
  instancesTracker.clearCache();

  const aetherflowTracker = _getAetherflowTracker();
  aetherflowTracker.clearCache();
  
  console.log('[CooldownSystem] System reset completed');
};

/**
 * Get performance metrics for the cooldown system
 * 
 * @returns {Object} - Performance metrics
 */
export const getCooldownSystemMetrics = () => {
  const cooldownManager = _getCooldownManager();
  const chargesTracker = _getChargesTracker();
  const instancesTracker = _getInstancesTracker();
  const aetherflowTracker = _getAetherflowTracker();
  
  return {
    cooldownManager: {
      cacheSize: cooldownManager.availabilityCache.size,
      usageHistoryCacheSize: cooldownManager.usageHistoryCache.size,
      lastCacheUpdate: cooldownManager.lastCacheUpdate
    },
    chargesTracker: {
      cacheSize: chargesTracker.chargeStatesCache.size,
      lastCacheUpdate: chargesTracker.lastCacheUpdate
    },
    instancesTracker: {
      cacheSize: instancesTracker.instancesStatesCache.size,
      lastCacheUpdate: instancesTracker.lastCacheUpdate
    },
    aetherflowTracker: {
      cacheSize: aetherflowTracker.stateCache.size,
      lastCacheUpdate: aetherflowTracker.lastCacheUpdate
    }
  };
};

/**
 * Development utilities
 */
export const dev = {
  // Expose internal components for debugging
  getCooldownManager: _getCooldownManager,
  getChargesTracker: _getChargesTracker,
  getInstancesTracker: _getInstancesTracker,
  getAetherflowTracker: _getAetherflowTracker,
  getRealtimeCooldownSync: _getRealtimeCooldownSync,
  
  // Validation utilities
  validateSystem: _validateCooldownSystem,
  
  // Performance testing
  getMetrics: getCooldownSystemMetrics,
  
  // Reset utilities
  reset: resetCooldownSystem
};

// Default export for convenience
export default {
  initialize: initializeCooldownSystem,
  reset: resetCooldownSystem,
  validate: _validateCooldownSystem,
  getMetrics: getCooldownSystemMetrics,
  dev
};
