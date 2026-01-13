/**
 * Enhanced Charges Tracking System
 * 
 * This module provides specialized tracking for abilities with multiple charges,
 * including Scholar's Aetherflow stacks and other multi-charge abilities.
 */

import { mitigationAbilities } from '../../data';
import { getAbilityChargeCount, getAbilityCooldownForLevel } from '../abilities/abilityUtils';

/**
 * Represents the charge state of an ability
 */
export class ChargeState {
  constructor({
    abilityId,
    totalCharges = 1,
    availableCharges = 1,
    chargesOnCooldown = 0,
    nextChargeAvailableAt = null,
    lastUsedTime = null,
    chargeHistory = []
  }) {
    this.abilityId = abilityId;
    this.totalCharges = totalCharges;
    this.availableCharges = availableCharges;
    this.chargesOnCooldown = chargesOnCooldown;
    this.nextChargeAvailableAt = nextChargeAvailableAt;
    this.lastUsedTime = lastUsedTime;
    this.chargeHistory = chargeHistory; // Array of { time, actionId, actionName }
  }

  /**
   * Check if any charges are available
   */
  hasChargesAvailable() {
    return this.availableCharges > 0;
  }

  /**
   * Get the percentage of charges available
   */
  getChargePercentage() {
    return this.totalCharges > 0 ? (this.availableCharges / this.totalCharges) : 0;
  }

  /**
   * Check if the ability is at full charges
   */
  isAtFullCharges() {
    return this.availableCharges === this.totalCharges;
  }

  /**
   * Get time until next charge is available
   */
  getTimeUntilNextCharge(currentTime) {
    if (!this.nextChargeAvailableAt || this.nextChargeAvailableAt <= currentTime) {
      return 0;
    }
    return this.nextChargeAvailableAt - currentTime;
  }
}

/**
 * Enhanced charges tracker for multi-charge abilities
 */
export class ChargesTracker {
  constructor(bossActions = [], bossLevel = 90, assignments = {}) {
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.assignments = assignments;
    
    // Cache for charge states
    this.chargeStatesCache = new Map();
    this.lastCacheUpdate = 0;
  }

  /**
   * Update tracker with new data
   */
  update({ bossActions, bossLevel, assignments }) {
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
    
    if (needsUpdate) {
      this.clearCache();
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.chargeStatesCache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Get charge state for an ability at a specific time
   */
  getChargeState(abilityId, targetTime) {
    const cacheKey = `${abilityId}_${targetTime}`;
    
    if (this.chargeStatesCache.has(cacheKey)) {
      return this.chargeStatesCache.get(cacheKey);
    }

    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) {
      return new ChargeState({ abilityId });
    }

    const totalCharges = getAbilityChargeCount(ability, this.bossLevel);
    
    // For single-charge abilities, return simple state
    if (totalCharges <= 1) {
      const chargeState = new ChargeState({
        abilityId,
        totalCharges: 1,
        availableCharges: 1,
        chargesOnCooldown: 0
      });
      
      this.chargeStatesCache.set(cacheKey, chargeState);
      return chargeState;
    }

    // Calculate charge state for multi-charge abilities
    const chargeState = this._calculateMultiChargeState(ability, targetTime, totalCharges);
    
    this.chargeStatesCache.set(cacheKey, chargeState);
    return chargeState;
  }

  /**
   * Calculate charge state for multi-charge abilities
   */
  _calculateMultiChargeState(ability, targetTime, totalCharges) {
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);
    const usageHistory = this._getAbilityUsageHistory(ability.id);
    
    // Filter usages that occur before the target time
    const relevantUsages = usageHistory.filter(usage => usage.time <= targetTime);
    
    // Sort by time (most recent first for cooldown checking)
    const sortedUsages = [...relevantUsages].sort((a, b) => b.time - a.time);
    
    let chargesOnCooldown = 0;
    let nextChargeAvailableAt = null;
    const chargeHistory = [];
    
    // Check each usage to see if it's still on cooldown
    for (let i = 0; i < sortedUsages.length && i < totalCharges; i++) {
      const usage = sortedUsages[i];
      const timeSinceUse = targetTime - usage.time;
      
      chargeHistory.push({
        time: usage.time,
        actionId: usage.bossActionId,
        actionName: usage.actionName
      });
      
      if (timeSinceUse < cooldownDuration) {
        chargesOnCooldown++;
        const chargeAvailableAt = usage.time + cooldownDuration;
        
        if (!nextChargeAvailableAt || chargeAvailableAt < nextChargeAvailableAt) {
          nextChargeAvailableAt = chargeAvailableAt;
        }
      }
    }
    
    const availableCharges = Math.max(0, totalCharges - chargesOnCooldown);
    const lastUsedTime = sortedUsages.length > 0 ? sortedUsages[0].time : null;
    
    return new ChargeState({
      abilityId: ability.id,
      totalCharges,
      availableCharges,
      chargesOnCooldown,
      nextChargeAvailableAt,
      lastUsedTime,
      chargeHistory: chargeHistory.reverse() // Reverse to get chronological order
    });
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
            actionName: bossAction.name
          });
        }
      });
    });
    
    return usages.sort((a, b) => a.time - b.time);
  }

  /**
   * Get charge states for multiple abilities
   */
  getMultipleChargeStates(abilityIds, targetTime) {
    const states = {};
    
    for (const abilityId of abilityIds) {
      states[abilityId] = this.getChargeState(abilityId, targetTime);
    }
    
    return states;
  }

  /**
   * Get all abilities with multiple charges and their states
   */
  getAllMultiChargeStates(targetTime) {
    const multiChargeAbilities = mitigationAbilities.filter(ability => 
      getAbilityChargeCount(ability, this.bossLevel) > 1
    );
    
    const states = {};
    
    for (const ability of multiChargeAbilities) {
      states[ability.id] = this.getChargeState(ability.id, targetTime);
    }
    
    return states;
  }

  /**
   * Simulate using a charge and get the resulting state
   */
  simulateChargeUsage(abilityId, targetTime, bossActionId) {
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) return null;

    const totalCharges = getAbilityChargeCount(ability, this.bossLevel);
    if (totalCharges <= 1) return null;

    // Get current state
    const currentState = this.getChargeState(abilityId, targetTime);
    
    // If no charges available, return current state
    if (!currentState.hasChargesAvailable()) {
      return currentState;
    }

    // Simulate the usage
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);
    const newChargeHistory = [...currentState.chargeHistory, {
      time: targetTime,
      actionId: bossActionId,
      actionName: this.bossActions.find(a => a.id === bossActionId)?.name || 'Unknown'
    }];

    // Calculate new state after usage
    const newAvailableCharges = Math.max(0, currentState.availableCharges - 1);
    const newChargesOnCooldown = currentState.chargesOnCooldown + 1;
    const newNextChargeAvailableAt = targetTime + cooldownDuration;

    return new ChargeState({
      abilityId,
      totalCharges,
      availableCharges: newAvailableCharges,
      chargesOnCooldown: newChargesOnCooldown,
      nextChargeAvailableAt: newNextChargeAvailableAt,
      lastUsedTime: targetTime,
      chargeHistory: newChargeHistory
    });
  }

  /**
   * Get charge timeline for an ability
   */
  getChargeTimeline(abilityId, startTime = 0, endTime = 600, interval = 1) {
    const timeline = [];
    
    for (let time = startTime; time <= endTime; time += interval) {
      const chargeState = this.getChargeState(abilityId, time);
      timeline.push({
        time,
        availableCharges: chargeState.availableCharges,
        totalCharges: chargeState.totalCharges,
        chargesOnCooldown: chargeState.chargesOnCooldown,
        nextChargeAvailableAt: chargeState.nextChargeAvailableAt
      });
    }
    
    return timeline;
  }
}

/**
 * Create a singleton instance for global use
 */
let globalChargesTracker = null;

/**
 * Get or create the global charges tracker instance
 */
export const getChargesTracker = () => {
  if (!globalChargesTracker) {
    globalChargesTracker = new ChargesTracker();
  }
  return globalChargesTracker;
};

/**
 * Update the global charges tracker
 */
export const updateChargesTracker = (data) => {
  const tracker = getChargesTracker();
  tracker.update(data);
  return tracker;
};

export default ChargesTracker;
