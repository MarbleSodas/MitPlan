/**
 * Cooldown System Validation Utilities
 * 
 * This module provides utilities for validating the cooldown system
 * in real application scenarios.
 */

import { getCooldownManager } from './cooldownManager';
import { getChargesTracker } from './chargesTracker';
import { getInstancesTracker } from './instancesTracker';
import { getAetherflowTracker } from './aetherflowTracker';
import { mitigationAbilities } from '../../data';

/**
 * Validation result class
 */
export class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(message, details = null) {
    this.isValid = false;
    this.errors.push({ message, details, timestamp: Date.now() });
  }

  addWarning(message, details = null) {
    this.warnings.push({ message, details, timestamp: Date.now() });
  }

  addInfo(message, details = null) {
    this.info.push({ message, details, timestamp: Date.now() });
  }

  getReport() {
    return {
      isValid: this.isValid,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info
    };
  }
}

/**
 * Cooldown system validator
 */
export class CooldownValidator {
  constructor() {
    this.cooldownManager = getCooldownManager();
    this.chargesTracker = getChargesTracker();
    this.instancesTracker = getInstancesTracker();
    this.aetherflowTracker = getAetherflowTracker();
  }

  /**
   * Validate the entire cooldown system
   */
  validateSystem(data) {
    const result = new ValidationResult();
    
    try {
      // Update all trackers with current data
      this.updateTrackers(data);
      
      // Run validation tests
      this.validateBasicFunctionality(result, data);
      this.validateChargesTracking(result, data);
      this.validateInstancesTracking(result, data);
      this.validateAetherflowTracking(result, data);
      this.validateAssignmentConsistency(result, data);
      this.validatePerformance(result, data);
      
      result.addInfo('Cooldown system validation completed');
      
    } catch (error) {
      result.addError('Validation failed with exception', { error: error.message, stack: error.stack });
    }
    
    return result;
  }

  /**
   * Update all trackers with current data
   */
  updateTrackers(data) {
    const { bossActions, bossLevel, selectedJobs, tankPositions, assignments } = data;
    
    this.cooldownManager.update({
      bossActions,
      bossLevel,
      selectedJobs,
      tankPositions,
      assignments
    });
  }

  /**
   * Validate basic cooldown functionality
   */
  validateBasicFunctionality(result, data) {
    const { bossActions, assignments } = data;
    
    // Test single charge abilities
    const singleChargeAbilities = mitigationAbilities.filter(ability => 
      !ability.isRoleShared && (!ability.count || ability.count <= 1)
    );
    
    for (const ability of singleChargeAbilities.slice(0, 5)) { // Test first 5 for performance
      try {
        const availability = this.cooldownManager.checkAbilityAvailability(
          ability.id,
          100,
          'test_action'
        );
        
        if (!availability) {
          result.addError(`Failed to get availability for ability: ${ability.name}`, { abilityId: ability.id });
          continue;
        }
        
        // Validate availability structure
        if (typeof availability.isAvailable !== 'boolean') {
          result.addError(`Invalid isAvailable value for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            value: availability.isAvailable 
          });
        }
        
        if (typeof availability.canAssign !== 'function') {
          result.addError(`Missing canAssign method for ability: ${ability.name}`, { abilityId: ability.id });
        }
        
      } catch (error) {
        result.addError(`Exception checking availability for ability: ${ability.name}`, { 
          abilityId: ability.id, 
          error: error.message 
        });
      }
    }
    
    result.addInfo('Basic functionality validation completed');
  }

  /**
   * Validate charges tracking
   */
  validateChargesTracking(result, data) {
    const multiChargeAbilities = mitigationAbilities.filter(ability => 
      ability.count && ability.count > 1
    );
    
    for (const ability of multiChargeAbilities) {
      try {
        const chargeState = this.chargesTracker.getChargeState(ability.id, 100);
        
        if (!chargeState) {
          result.addError(`Failed to get charge state for ability: ${ability.name}`, { abilityId: ability.id });
          continue;
        }
        
        // Validate charge state structure
        if (typeof chargeState.totalCharges !== 'number' || chargeState.totalCharges <= 0) {
          result.addError(`Invalid totalCharges for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            totalCharges: chargeState.totalCharges 
          });
        }
        
        if (typeof chargeState.availableCharges !== 'number' || chargeState.availableCharges < 0) {
          result.addError(`Invalid availableCharges for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            availableCharges: chargeState.availableCharges 
          });
        }
        
        if (chargeState.availableCharges > chargeState.totalCharges) {
          result.addError(`Available charges exceed total charges for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            available: chargeState.availableCharges,
            total: chargeState.totalCharges
          });
        }
        
      } catch (error) {
        result.addError(`Exception checking charge state for ability: ${ability.name}`, { 
          abilityId: ability.id, 
          error: error.message 
        });
      }
    }
    
    result.addInfo('Charges tracking validation completed');
  }

  /**
   * Validate instances tracking
   */
  validateInstancesTracking(result, data) {
    const { selectedJobs } = data;
    const roleSharedAbilities = mitigationAbilities.filter(ability => ability.isRoleShared);
    
    for (const ability of roleSharedAbilities) {
      try {
        const instancesState = this.instancesTracker.getInstancesState(ability.id, 100);
        
        if (!instancesState) {
          result.addError(`Failed to get instances state for ability: ${ability.name}`, { abilityId: ability.id });
          continue;
        }
        
        // Validate instances state structure
        if (typeof instancesState.totalInstances !== 'number' || instancesState.totalInstances < 0) {
          result.addError(`Invalid totalInstances for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            totalInstances: instancesState.totalInstances 
          });
        }
        
        if (typeof instancesState.availableInstances !== 'number' || instancesState.availableInstances < 0) {
          result.addError(`Invalid availableInstances for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            availableInstances: instancesState.availableInstances 
          });
        }
        
        if (instancesState.availableInstances > instancesState.totalInstances) {
          result.addError(`Available instances exceed total instances for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            available: instancesState.availableInstances,
            total: instancesState.totalInstances
          });
        }
        
        // Validate instances array
        if (!Array.isArray(instancesState.instances)) {
          result.addError(`Invalid instances array for ability: ${ability.name}`, { abilityId: ability.id });
        } else if (instancesState.instances.length !== instancesState.totalInstances) {
          result.addWarning(`Instances array length mismatch for ability: ${ability.name}`, { 
            abilityId: ability.id, 
            arrayLength: instancesState.instances.length,
            totalInstances: instancesState.totalInstances
          });
        }
        
      } catch (error) {
        result.addError(`Exception checking instances state for ability: ${ability.name}`, { 
          abilityId: ability.id, 
          error: error.message 
        });
      }
    }
    
    result.addInfo('Instances tracking validation completed');
  }

  /**
   * Validate Aetherflow tracking
   */
  validateAetherflowTracking(result, data) {
    const { selectedJobs } = data;
    
    try {
      const aetherflowState = this.aetherflowTracker.getAetherflowState(100);
      
      if (!aetherflowState) {
        result.addError('Failed to get Aetherflow state');
        return;
      }
      
      // If Scholar is selected, validate Aetherflow state
      if (selectedJobs && selectedJobs['SCH']) {
        if (typeof aetherflowState.totalStacks !== 'number' || aetherflowState.totalStacks !== 3) {
          result.addError('Invalid Aetherflow totalStacks', { totalStacks: aetherflowState.totalStacks });
        }
        
        if (typeof aetherflowState.availableStacks !== 'number' || 
            aetherflowState.availableStacks < 0 || 
            aetherflowState.availableStacks > aetherflowState.totalStacks) {
          result.addError('Invalid Aetherflow availableStacks', { 
            availableStacks: aetherflowState.availableStacks,
            totalStacks: aetherflowState.totalStacks
          });
        }
        
        // Test Aetherflow-consuming abilities
        const aetherflowAbilities = mitigationAbilities.filter(ability => ability.consumesAetherflow);
        
        for (const ability of aetherflowAbilities.slice(0, 3)) { // Test first 3
          const canUse = this.aetherflowTracker.canUseAetherflowAbility(ability.id, 100);
          
          if (typeof canUse !== 'boolean') {
            result.addError(`Invalid canUseAetherflowAbility result for ability: ${ability.name}`, { 
              abilityId: ability.id, 
              result: canUse 
            });
          }
        }
      }
      
    } catch (error) {
      result.addError('Exception checking Aetherflow state', { error: error.message });
    }
    
    result.addInfo('Aetherflow tracking validation completed');
  }

  /**
   * Validate assignment consistency
   */
  validateAssignmentConsistency(result, data) {
    const { bossActions, assignments } = data;
    
    if (!assignments || typeof assignments !== 'object') {
      result.addWarning('No assignments to validate');
      return;
    }
    
    // Check each assignment for consistency
    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      const bossAction = bossActions?.find(action => action.id === bossActionId);
      
      if (!bossAction) {
        result.addWarning(`Assignment references non-existent boss action: ${bossActionId}`);
        return;
      }
      
      if (!Array.isArray(mitigations)) {
        result.addError(`Invalid mitigations array for boss action: ${bossAction.name}`, { bossActionId });
        return;
      }
      
      mitigations.forEach((mitigation, index) => {
        if (!mitigation.id) {
          result.addError(`Missing mitigation ID in assignment`, { 
            bossActionId, 
            bossActionName: bossAction.name, 
            index 
          });
        }
        
        const ability = mitigationAbilities.find(a => a.id === mitigation.id);
        if (!ability) {
          result.addError(`Assignment references non-existent ability: ${mitigation.id}`, { 
            bossActionId, 
            bossActionName: bossAction.name 
          });
        }
      });
    });
    
    result.addInfo('Assignment consistency validation completed');
  }

  /**
   * Validate performance characteristics
   */
  validatePerformance(result, data) {
    const { bossActions } = data;
    
    if (!bossActions || bossActions.length === 0) {
      result.addWarning('No boss actions to test performance with');
      return;
    }
    
    // Test performance of availability checking
    const testAbilities = mitigationAbilities.slice(0, 10); // Test first 10 abilities
    const testTimes = [10, 50, 100, 200, 300];
    
    const startTime = performance.now();
    
    for (const ability of testAbilities) {
      for (const time of testTimes) {
        this.cooldownManager.checkAbilityAvailability(ability.id, time, 'test_action');
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / (testAbilities.length * testTimes.length);
    
    if (averageTime > 10) { // More than 10ms per check is concerning
      result.addWarning('Performance concern: Availability checking is slow', { 
        averageTime: averageTime.toFixed(2),
        totalTime: totalTime.toFixed(2),
        checksPerformed: testAbilities.length * testTimes.length
      });
    } else {
      result.addInfo('Performance validation passed', { 
        averageTime: averageTime.toFixed(2),
        totalTime: totalTime.toFixed(2),
        checksPerformed: testAbilities.length * testTimes.length
      });
    }
  }
}

/**
 * Quick validation function for use in development
 */
export const validateCooldownSystem = (data) => {
  const validator = new CooldownValidator();
  return validator.validateSystem(data);
};

/**
 * Continuous validation for real-time scenarios
 */
export class ContinuousValidator {
  constructor(intervalMs = 5000) {
    this.validator = new CooldownValidator();
    this.intervalMs = intervalMs;
    this.isRunning = false;
    this.intervalId = null;
    this.lastResult = null;
    this.listeners = new Set();
  }

  start(getData) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      try {
        const data = getData();
        const result = this.validator.validateSystem(data);
        this.lastResult = result;
        
        // Notify listeners
        this.listeners.forEach(listener => {
          try {
            listener(result);
          } catch (error) {
            console.error('[ContinuousValidator] Error in listener:', error);
          }
        });
        
      } catch (error) {
        console.error('[ContinuousValidator] Validation error:', error);
      }
    }, this.intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  getLastResult() {
    return this.lastResult;
  }
}

export default CooldownValidator;
