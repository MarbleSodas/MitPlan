/**
 * Enhanced Instances Tracking System
 * 
 * This module provides specialized tracking for role-shared mitigation abilities,
 * managing separate cooldown timers for each instance/user.
 */

import { mitigationAbilities } from '../../data';
import { getRoleSharedAbilityCount, getAbilityCooldownForLevel } from '../abilities/abilityUtils';

/**
 * Represents a single instance of a role-shared ability
 */
export class AbilityInstance {
  constructor({
    instanceId,
    abilityId,
    jobId = null,
    playerName = null,
    isOnCooldown = false,
    lastUsedTime = null,
    lastUsedActionId = null,
    lastUsedActionName = null,
    nextAvailableTime = null,
    usageHistory = []
  }) {
    this.instanceId = instanceId;
    this.abilityId = abilityId;
    this.jobId = jobId;
    this.playerName = playerName;
    this.isOnCooldown = isOnCooldown;
    this.lastUsedTime = lastUsedTime;
    this.lastUsedActionId = lastUsedActionId;
    this.lastUsedActionName = lastUsedActionName;
    this.nextAvailableTime = nextAvailableTime;
    this.usageHistory = usageHistory; // Array of { time, actionId, actionName }
  }

  /**
   * Check if this instance is available at a specific time
   */
  isAvailableAt(time) {
    return !this.isOnCooldown || (this.nextAvailableTime && time >= this.nextAvailableTime);
  }

  /**
   * Get time until this instance is available
   */
  getTimeUntilAvailable(currentTime) {
    if (!this.isOnCooldown || !this.nextAvailableTime) return 0;
    return Math.max(0, this.nextAvailableTime - currentTime);
  }

  /**
   * Update instance state after usage
   */
  useAt(time, actionId, actionName, cooldownDuration) {
    this.lastUsedTime = time;
    this.lastUsedActionId = actionId;
    this.lastUsedActionName = actionName;
    this.nextAvailableTime = time + cooldownDuration;
    this.isOnCooldown = true;
    
    this.usageHistory.push({
      time,
      actionId,
      actionName
    });
  }

  /**
   * Update cooldown status based on current time
   */
  updateCooldownStatus(currentTime) {
    if (this.isOnCooldown && this.nextAvailableTime && currentTime >= this.nextAvailableTime) {
      this.isOnCooldown = false;
    }
  }
}

/**
 * Represents the state of all instances for a role-shared ability
 */
export class InstancesState {
  constructor({
    abilityId,
    totalInstances = 1,
    availableInstances = 1,
    instancesOnCooldown = 0,
    instances = [],
    nextInstanceAvailableAt = null,
    isRoleShared = false
  }) {
    this.abilityId = abilityId;
    this.totalInstances = totalInstances;
    this.availableInstances = availableInstances;
    this.instancesOnCooldown = instancesOnCooldown;
    this.instances = instances; // Array of AbilityInstance objects
    this.nextInstanceAvailableAt = nextInstanceAvailableAt;
    this.isRoleShared = isRoleShared;
  }

  /**
   * Check if any instances are available
   */
  hasInstancesAvailable() {
    return this.availableInstances > 0;
  }

  /**
   * Get the next available instance
   */
  getNextAvailableInstance(currentTime) {
    return this.instances.find(instance => instance.isAvailableAt(currentTime));
  }

  /**
   * Get all available instances
   */
  getAvailableInstances(currentTime) {
    return this.instances.filter(instance => instance.isAvailableAt(currentTime));
  }

  /**
   * Get all instances on cooldown
   */
  getInstancesOnCooldown(currentTime) {
    return this.instances.filter(instance => !instance.isAvailableAt(currentTime));
  }

  /**
   * Get time until next instance is available
   */
  getTimeUntilNextInstance(currentTime) {
    if (this.availableInstances > 0) return 0;
    
    const instancesOnCooldown = this.getInstancesOnCooldown(currentTime);
    if (instancesOnCooldown.length === 0) return 0;
    
    const nextAvailableTimes = instancesOnCooldown
      .map(instance => instance.getTimeUntilAvailable(currentTime))
      .filter(time => time > 0);
    
    return nextAvailableTimes.length > 0 ? Math.min(...nextAvailableTimes) : 0;
  }
}

/**
 * Enhanced instances tracker for role-shared abilities
 */
export class InstancesTracker {
  constructor(bossActions = [], bossLevel = 90, selectedJobs = {}, assignments = {}) {
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.selectedJobs = selectedJobs;
    this.assignments = assignments;
    
    // Cache for instances states
    this.instancesStatesCache = new Map();
    this.lastCacheUpdate = 0;
  }

  /**
   * Update tracker with new data
   */
  update({ bossActions, bossLevel, selectedJobs, assignments }) {
    let needsUpdate = false;
    
    if (bossActions !== this.bossActions) {
      this.bossActions = bossActions;
      needsUpdate = true;
    }
    
    if (bossLevel !== this.bossLevel) {
      this.bossLevel = bossLevel;
      needsUpdate = true;
    }
    
    if (selectedJobs !== this.selectedJobs) {
      this.selectedJobs = selectedJobs;
      needsUpdate = true;
    }
    
    if (assignments !== this.assignments) {
      this.assignments = assignments;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      this.clearCache();
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.instancesStatesCache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Get instances state for an ability at a specific time
   */
  getInstancesState(abilityId, targetTime) {
    const cacheKey = `${abilityId}_${targetTime}`;
    
    if (this.instancesStatesCache.has(cacheKey)) {
      return this.instancesStatesCache.get(cacheKey);
    }

    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) {
      return new InstancesState({ abilityId });
    }

    // For non-role-shared abilities, return simple state
    if (!ability.isRoleShared) {
      const instancesState = new InstancesState({
        abilityId,
        totalInstances: 1,
        availableInstances: 1,
        instancesOnCooldown: 0,
        instances: [new AbilityInstance({
          instanceId: `${abilityId}_single`,
          abilityId
        })],
        isRoleShared: false
      });
      
      this.instancesStatesCache.set(cacheKey, instancesState);
      return instancesState;
    }

    // Calculate instances state for role-shared abilities
    const instancesState = this._calculateRoleSharedInstancesState(ability, targetTime);
    
    this.instancesStatesCache.set(cacheKey, instancesState);
    return instancesState;
  }

  /**
   * Calculate instances state for role-shared abilities
   */
  _calculateRoleSharedInstancesState(ability, targetTime) {
    const totalInstances = getRoleSharedAbilityCount(ability, this.selectedJobs);
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);
    const usageHistory = this._getAbilityUsageHistory(ability.id);

    // Filter usages that occur before the target time
    const relevantUsages = usageHistory.filter(usage => usage.time <= targetTime);
    
    // Create instances based on the number of selected jobs that can provide this ability
    const instances = [];
    const jobsWithAbility = this._getJobsWithAbility(ability);
    
    for (let i = 0; i < totalInstances; i++) {
      const jobId = jobsWithAbility[i] || null;
      const instanceId = `${ability.id}_${jobId || i}`;
      
      instances.push(new AbilityInstance({
        instanceId,
        abilityId: ability.id,
        jobId,
        playerName: jobId ? `Player ${i + 1} (${jobId})` : `Instance ${i + 1}`
      }));
    }

    // Assign usages to instances based on timing and cooldown constraints
    this._assignUsagesToInstances(instances, relevantUsages, cooldownDuration);
    
    // Update instance states based on target time
    instances.forEach(instance => instance.updateCooldownStatus(targetTime));
    
    // Calculate summary statistics
    const availableInstances = instances.filter(instance => instance.isAvailableAt(targetTime)).length;
    const instancesOnCooldown = totalInstances - availableInstances;
    
    // Find next instance available time
    let nextInstanceAvailableAt = null;
    if (availableInstances === 0) {
      const nextAvailableTimes = instances
        .map(instance => instance.nextAvailableTime)
        .filter(time => time && time > targetTime);
      
      if (nextAvailableTimes.length > 0) {
        nextInstanceAvailableAt = Math.min(...nextAvailableTimes);
      }
    }

    return new InstancesState({
      abilityId: ability.id,
      totalInstances,
      availableInstances,
      instancesOnCooldown,
      instances,
      nextInstanceAvailableAt,
      isRoleShared: true
    });
  }

  /**
   * Get jobs that can provide a specific ability
   */
  _getJobsWithAbility(ability) {
    const jobsWithAbility = [];

    if (ability.jobs && Array.isArray(ability.jobs)) {
      for (const jobId of ability.jobs) {
        // Check if this job is selected in any role
        let isJobSelected = false;

        // Handle direct job ID format (if it exists)
        if (this.selectedJobs[jobId]) {
          isJobSelected = true;
        } else {
          // Check in role-based structure
          for (const [, jobs] of Object.entries(this.selectedJobs)) {
            if (Array.isArray(jobs)) {
              // Handle both optimized format (array of job IDs) and legacy format (array of job objects)
              if (jobs.length > 0 && typeof jobs[0] === 'string') {
                // Optimized format: ["SCH", "WHM"]
                if (jobs.includes(jobId)) {
                  isJobSelected = true;
                  break;
                }
              } else if (jobs.length > 0 && typeof jobs[0] === 'object' && jobs[0] !== null) {
                // Legacy format: [{ id: "SCH", selected: true }]
                const job = jobs.find(j => j && j.id === jobId);
                if (job && job.selected) {
                  isJobSelected = true;
                  break;
                }
              }
            }
          }
        }

        if (isJobSelected) {
          jobsWithAbility.push(jobId);
        }
      }
    }

    return jobsWithAbility;
  }

  /**
   * Assign usages to instances based on timing and cooldown constraints
   */
  _assignUsagesToInstances(instances, usages, cooldownDuration) {
    // Sort usages by time
    const sortedUsages = [...usages].sort((a, b) => a.time - b.time);
    
    for (const usage of sortedUsages) {
      // Find an available instance for this usage
      let assignedInstance = null;
      
      // First, try to find an instance that's not on cooldown at this time
      for (const instance of instances) {
        if (instance.isAvailableAt(usage.time)) {
          assignedInstance = instance;
          break;
        }
      }
      
      // If no available instance found, assign to the instance that will be available soonest
      if (!assignedInstance) {
        const instancesByAvailability = instances
          .map(instance => ({
            instance,
            availableAt: instance.nextAvailableTime || 0
          }))
          .sort((a, b) => a.availableAt - b.availableAt);
        
        assignedInstance = instancesByAvailability[0].instance;
      }
      
      // Assign the usage to the selected instance
      if (assignedInstance) {
        assignedInstance.useAt(usage.time, usage.bossActionId, usage.actionName, cooldownDuration);
      }
    }
  }

  /**
   * Get usage history for an ability
   */
  _getAbilityUsageHistory(abilityId) {
    const usages = [];
    
    if (!this.assignments || !this.bossActions) {
      return usages;
    }
    
    // Find all assignments of this ability
    Object.entries(this.assignments).forEach(([bossActionId, mitigations]) => {
      if (!mitigations || !Array.isArray(mitigations)) return;
      
      const bossAction = this.bossActions.find(action => action.id === bossActionId);
      if (!bossAction) return;
      
      mitigations.forEach(mitigation => {
        if (mitigation.id === abilityId) {
          usages.push({
            abilityId,
            bossActionId,
            time: bossAction.time,
            actionName: bossAction.name,
            instanceId: mitigation.instanceId || null
          });
        }
      });
    });
    
    return usages.sort((a, b) => a.time - b.time);
  }

  /**
   * Get instances states for multiple abilities
   */
  getMultipleInstancesStates(abilityIds, targetTime) {
    const states = {};
    
    for (const abilityId of abilityIds) {
      states[abilityId] = this.getInstancesState(abilityId, targetTime);
    }
    
    return states;
  }

  /**
   * Get all role-shared abilities and their instances states
   */
  getAllRoleSharedInstancesStates(targetTime) {
    const roleSharedAbilities = mitigationAbilities.filter(ability => ability.isRoleShared);
    const states = {};
    
    for (const ability of roleSharedAbilities) {
      states[ability.id] = this.getInstancesState(ability.id, targetTime);
    }
    
    return states;
  }

  /**
   * Simulate using an instance and get the resulting state
   */
  simulateInstanceUsage(abilityId, targetTime, bossActionId, preferredInstanceId = null) {
    const currentState = this.getInstancesState(abilityId, targetTime);
    
    if (!currentState.hasInstancesAvailable()) {
      return currentState;
    }

    // Find the instance to use
    let instanceToUse = null;
    
    if (preferredInstanceId) {
      instanceToUse = currentState.instances.find(instance => 
        instance.instanceId === preferredInstanceId && instance.isAvailableAt(targetTime)
      );
    }
    
    if (!instanceToUse) {
      instanceToUse = currentState.getNextAvailableInstance(targetTime);
    }
    
    if (!instanceToUse) {
      return currentState;
    }

    // Create a copy of the state with the instance used
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);
    
    const newInstances = currentState.instances.map(instance => {
      if (instance.instanceId === instanceToUse.instanceId) {
        const newInstance = new AbilityInstance({ ...instance });
        newInstance.useAt(targetTime, bossActionId, 
          this.bossActions.find(a => a.id === bossActionId)?.name || 'Unknown', 
          cooldownDuration
        );
        return newInstance;
      }
      return instance;
    });

    const newAvailableInstances = newInstances.filter(instance => 
      instance.isAvailableAt(targetTime)
    ).length;

    return new InstancesState({
      abilityId,
      totalInstances: currentState.totalInstances,
      availableInstances: newAvailableInstances,
      instancesOnCooldown: currentState.totalInstances - newAvailableInstances,
      instances: newInstances,
      nextInstanceAvailableAt: targetTime + cooldownDuration,
      isRoleShared: currentState.isRoleShared
    });
  }

  /**
   * Get instances timeline for an ability
   */
  getInstancesTimeline(abilityId, startTime = 0, endTime = 600, interval = 1) {
    const timeline = [];
    
    for (let time = startTime; time <= endTime; time += interval) {
      const instancesState = this.getInstancesState(abilityId, time);
      timeline.push({
        time,
        availableInstances: instancesState.availableInstances,
        totalInstances: instancesState.totalInstances,
        instancesOnCooldown: instancesState.instancesOnCooldown,
        nextInstanceAvailableAt: instancesState.nextInstanceAvailableAt
      });
    }
    
    return timeline;
  }
}

/**
 * Create a singleton instance for global use
 */
let globalInstancesTracker = null;

/**
 * Get or create the global instances tracker instance
 */
export const getInstancesTracker = () => {
  if (!globalInstancesTracker) {
    globalInstancesTracker = new InstancesTracker();
  }
  return globalInstancesTracker;
};

/**
 * Update the global instances tracker
 */
export const updateInstancesTracker = (data) => {
  const tracker = getInstancesTracker();
  tracker.update(data);
  return tracker;
};

export default InstancesTracker;
