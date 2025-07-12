/**
 * Enhanced Aetherflow Tracking System
 * 
 * This module provides specialized tracking for Scholar's Aetherflow stacks,
 * integrating with the enhanced charges tracking system.
 */

import { mitigationAbilities } from '../../data';
import { ChargeState } from './chargesTracker';

/**
 * Represents the state of Aetherflow stacks
 */
export class AetherflowState extends ChargeState {
  constructor({
    abilityId = 'aetherflow',
    totalStacks = 3,
    availableStacks = 3,
    stacksOnCooldown = 0,
    nextRefreshAvailableAt = null,
    lastRefreshTime = null,
    lastStackUsedTime = null,
    stackUsageHistory = [],
    refreshHistory = []
  }) {
    super({
      abilityId,
      totalCharges: totalStacks,
      availableCharges: availableStacks,
      chargesOnCooldown: stacksOnCooldown,
      nextChargeAvailableAt: nextRefreshAvailableAt,
      lastUsedTime: lastStackUsedTime,
      chargeHistory: stackUsageHistory
    });

    // Aetherflow-specific properties
    this.totalStacks = totalStacks;
    this.availableStacks = availableStacks;
    this.stacksOnCooldown = stacksOnCooldown;
    this.nextRefreshAvailableAt = nextRefreshAvailableAt;
    this.lastRefreshTime = lastRefreshTime;
    this.lastStackUsedTime = lastStackUsedTime;
    this.stackUsageHistory = stackUsageHistory;
    this.refreshHistory = refreshHistory;
  }

  /**
   * Check if any stacks are available
   */
  hasStacksAvailable() {
    return this.availableStacks > 0;
  }

  /**
   * Check if Aetherflow refresh is available
   */
  canRefresh(currentTime, aetherflowCooldown = 60) {
    if (!this.lastRefreshTime) return true;
    return (currentTime - this.lastRefreshTime) >= aetherflowCooldown;
  }

  /**
   * Get time until next automatic Aetherflow refresh
   */
  getTimeUntilRefresh(currentTime, aetherflowCooldown = 60) {
    if (this.lastRefreshTime === null || this.lastRefreshTime === undefined) return 0;
    const timeSinceRefresh = currentTime - this.lastRefreshTime;
    return Math.max(0, aetherflowCooldown - timeSinceRefresh);
  }

  /**
   * Get the exact time when the next automatic refresh will occur
   */
  getNextRefreshTime(aetherflowCooldown = 60) {
    if (this.lastRefreshTime === null || this.lastRefreshTime === undefined) return 0;
    return this.lastRefreshTime + aetherflowCooldown;
  }

  /**
   * Check if should auto-refresh (when stacks are low and refresh is available)
   */
  shouldAutoRefresh(currentTime, aetherflowCooldown = 60, threshold = 1) {
    return this.availableStacks <= threshold && this.canRefresh(currentTime, aetherflowCooldown);
  }

  /**
   * Format time for display (converts seconds to mm:ss format)
   */
  static formatTime(seconds) {
    if (seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Enhanced Aetherflow tracker
 */
export class AetherflowTracker {
  constructor(bossActions = [], bossLevel = 90, assignments = {}, selectedJobs = {}) {
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.assignments = assignments;
    this.selectedJobs = selectedJobs;
    
    // Aetherflow ability reference
    this.aetherflowAbility = mitigationAbilities.find(m => m.id === 'aetherflow');
    this.aetherflowCooldown = this.aetherflowAbility?.cooldown || 60;
    
    // Abilities that consume Aetherflow
    this.aetherflowConsumers = mitigationAbilities.filter(m => m.consumesAetherflow);
    
    // Abilities that provide Aetherflow
    this.aetherflowProviders = mitigationAbilities.filter(m => m.isAetherflowProvider);
    
    // Cache for states
    this.stateCache = new Map();
    this.lastCacheUpdate = 0;
  }

  /**
   * Update tracker with new data
   */
  update({ bossActions, bossLevel, assignments, selectedJobs }) {
    let needsUpdate = false;
    
    if (bossActions !== this.bossActions) {
      this.bossActions = bossActions;
      needsUpdate = true;
    }
    
    if (bossLevel !== this.bossLevel) {
      this.bossLevel = bossLevel;
      needsUpdate = true;
    }
    
    if (assignments !== this.assignments) {
      this.assignments = assignments;
      needsUpdate = true;
    }
    
    if (selectedJobs !== this.selectedJobs) {
      this.selectedJobs = selectedJobs;
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
    this.stateCache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Check if Scholar is selected (handles multiple data formats)
   */
  isScholarSelected() {
    if (!this.selectedJobs) return false;

    // Direct format: selectedJobs['SCH']
    if (this.selectedJobs['SCH']) return true;

    // Check healer array for Scholar
    if (this.selectedJobs.healer && Array.isArray(this.selectedJobs.healer)) {
      // Optimized format: ["SCH", "WHM"]
      if (typeof this.selectedJobs.healer[0] === 'string' && this.selectedJobs.healer.includes('SCH')) {
        return true;
      }
      // Legacy format: [{ id: "SCH", selected: true }]
      if (typeof this.selectedJobs.healer[0] === 'object' &&
          this.selectedJobs.healer.some(job => job && job.id === 'SCH' && job.selected)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get Aetherflow state at a specific time
   */
  getAetherflowState(targetTime) {
    if (!this.isScholarSelected()) {
      return new AetherflowState({
        availableStacks: 0,
        totalStacks: 0
      });
    }

    const cacheKey = `aetherflow_${targetTime}`;
    
    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey);
    }

    const state = this._calculateAetherflowState(targetTime);
    this.stateCache.set(cacheKey, state);
    return state;
  }

  /**
   * Calculate Aetherflow state at a specific time
   */
  _calculateAetherflowState(targetTime) {
    // Get all boss actions up to the target time, sorted by time
    const relevantActions = this.bossActions
      .filter(action => action.time <= targetTime)
      .sort((a, b) => a.time - b.time);

    let currentStacks = 3; // Start with full stacks
    let lastRefreshTime = 0;
    const stackUsageHistory = [];
    const refreshHistory = [];

    // Process each boss action chronologically
    for (const action of relevantActions) {
      const actionAssignments = this.assignments[action.id] || [];

      // Check for manual Aetherflow refresh (when the ability is explicitly assigned)
      const hasManualAetherflowRefresh = actionAssignments.some(assignment =>
        this.aetherflowProviders.some(provider => provider.id === assignment.id)
      );

      if (hasManualAetherflowRefresh) {
        // Check if enough time has passed since last refresh
        const timeSinceLastRefresh = action.time - lastRefreshTime;
        if (timeSinceLastRefresh >= this.aetherflowCooldown) {
          currentStacks = 3; // Refresh to full stacks
          lastRefreshTime = action.time;
          refreshHistory.push({
            time: action.time,
            actionId: action.id,
            actionName: action.name,
            manual: true
          });
        }
      }

      // Check for automatic refresh every 60 seconds
      const timeSinceLastRefresh = action.time - lastRefreshTime;
      if (timeSinceLastRefresh >= this.aetherflowCooldown && currentStacks < 3) {
        currentStacks = 3; // Refresh to full stacks
        lastRefreshTime = action.time;
        refreshHistory.push({
          time: action.time,
          actionId: action.id,
          actionName: action.name,
          automatic: true
        });
      }
      
      // Check for Aetherflow consumption
      const consumingAbilities = actionAssignments.filter(assignment =>
        this.aetherflowConsumers.some(consumer => consumer.id === assignment.id)
      );
      
      // Consume stacks for each consuming ability
      for (const consumingAbility of consumingAbilities) {
        if (currentStacks > 0) {
          currentStacks--;
          stackUsageHistory.push({
            time: action.time,
            actionId: action.id,
            actionName: action.name,
            abilityId: consumingAbility.id,
            abilityName: consumingAbility.name
          });
        }
      }
    }

    // Check for automatic refresh at the target time if no recent refresh
    const timeSinceLastRefreshAtTarget = targetTime - lastRefreshTime;
    if (timeSinceLastRefreshAtTarget >= this.aetherflowCooldown && currentStacks < 3) {
      // Calculate the exact time when the next automatic refresh would occur
      const nextAutoRefreshTime = lastRefreshTime + this.aetherflowCooldown;
      if (nextAutoRefreshTime <= targetTime) {
        currentStacks = 3;
        lastRefreshTime = nextAutoRefreshTime;
        refreshHistory.push({
          time: nextAutoRefreshTime,
          actionId: null,
          actionName: 'Automatic Refresh',
          automatic: true
        });
      }
    }

    // Calculate next automatic refresh time
    let nextRefreshAvailableAt = null;
    if (lastRefreshTime >= 0) {
      const nextRefreshTime = lastRefreshTime + this.aetherflowCooldown;
      if (nextRefreshTime > targetTime) {
        nextRefreshAvailableAt = nextRefreshTime;
      }
    }

    // Get last stack usage time
    const lastStackUsedTime = stackUsageHistory.length > 0 
      ? stackUsageHistory[stackUsageHistory.length - 1].time 
      : null;

    return new AetherflowState({
      availableStacks: currentStacks,
      totalStacks: 3,
      stacksOnCooldown: 0, // Aetherflow stacks don't have individual cooldowns
      nextRefreshAvailableAt,
      lastRefreshTime,
      lastStackUsedTime,
      stackUsageHistory,
      refreshHistory
    });
  }

  /**
   * Check if an Aetherflow-consuming ability can be used at a specific time
   */
  canUseAetherflowAbility(abilityId, targetTime) {
    const ability = this.aetherflowConsumers.find(m => m.id === abilityId);
    if (!ability) return false;

    const aetherflowState = this.getAetherflowState(targetTime);
    return aetherflowState.hasStacksAvailable();
  }

  /**
   * Simulate using an Aetherflow stack and get the resulting state
   */
  simulateStackUsage(abilityId, targetTime, bossActionId) {
    const currentState = this.getAetherflowState(targetTime);
    
    if (!currentState.hasStacksAvailable()) {
      return currentState;
    }

    const newStackUsageHistory = [...currentState.stackUsageHistory, {
      time: targetTime,
      actionId: bossActionId,
      actionName: this.bossActions.find(a => a.id === bossActionId)?.name || 'Unknown',
      abilityId,
      abilityName: this.aetherflowConsumers.find(m => m.id === abilityId)?.name || 'Unknown'
    }];

    return new AetherflowState({
      availableStacks: currentState.availableStacks - 1,
      totalStacks: currentState.totalStacks,
      stacksOnCooldown: currentState.stacksOnCooldown,
      nextRefreshAvailableAt: currentState.nextRefreshAvailableAt,
      lastRefreshTime: currentState.lastRefreshTime,
      lastStackUsedTime: targetTime,
      stackUsageHistory: newStackUsageHistory,
      refreshHistory: currentState.refreshHistory
    });
  }

  /**
   * Get Aetherflow timeline
   */
  getAetherflowTimeline(startTime = 0, endTime = 600, interval = 1) {
    const timeline = [];
    
    for (let time = startTime; time <= endTime; time += interval) {
      const state = this.getAetherflowState(time);
      timeline.push({
        time,
        availableStacks: state.availableStacks,
        totalStacks: state.totalStacks,
        canRefresh: state.canRefresh(time, this.aetherflowCooldown),
        timeUntilRefresh: state.getTimeUntilRefresh(time, this.aetherflowCooldown)
      });
    }
    
    return timeline;
  }

  /**
   * Get optimal Aetherflow usage recommendations
   */
  getOptimalUsageRecommendations(startTime = 0, endTime = 600) {
    const recommendations = [];
    
    // Find all potential Aetherflow consumption points
    const consumptionPoints = [];
    
    Object.entries(this.assignments).forEach(([bossActionId, mitigations]) => {
      const bossAction = this.bossActions.find(a => a.id === bossActionId);
      if (!bossAction || bossAction.time < startTime || bossAction.time > endTime) return;
      
      const aetherflowConsumption = mitigations.filter(m =>
        this.aetherflowConsumers.some(consumer => consumer.id === m.id)
      );
      
      if (aetherflowConsumption.length > 0) {
        consumptionPoints.push({
          time: bossAction.time,
          actionId: bossAction.id,
          actionName: bossAction.name,
          consumption: aetherflowConsumption.length
        });
      }
    });

    // Analyze consumption patterns and recommend refresh timings
    let currentTime = startTime;
    let currentStacks = 3;
    let lastRefreshTime = 0;

    for (const point of consumptionPoints.sort((a, b) => a.time - b.time)) {
      // Check if we need to refresh before this consumption
      const stacksNeeded = point.consumption;
      
      if (currentStacks < stacksNeeded) {
        // Recommend refresh
        const refreshTime = Math.max(currentTime, lastRefreshTime + this.aetherflowCooldown);
        
        if (refreshTime <= point.time) {
          recommendations.push({
            type: 'refresh',
            time: refreshTime,
            reason: `Refresh needed for ${point.actionName} (needs ${stacksNeeded} stacks, have ${currentStacks})`
          });
          
          currentStacks = 3;
          lastRefreshTime = refreshTime;
        }
      }
      
      // Consume stacks
      currentStacks = Math.max(0, currentStacks - stacksNeeded);
      currentTime = point.time;
    }

    return recommendations;
  }
}

/**
 * Create a singleton instance for global use
 */
let globalAetherflowTracker = null;

/**
 * Get or create the global Aetherflow tracker instance
 */
export const getAetherflowTracker = () => {
  if (!globalAetherflowTracker) {
    globalAetherflowTracker = new AetherflowTracker();
  }
  return globalAetherflowTracker;
};

/**
 * Update the global Aetherflow tracker
 */
export const updateAetherflowTracker = (data) => {
  const tracker = getAetherflowTracker();
  tracker.update(data);
  return tracker;
};

export default AetherflowTracker;
