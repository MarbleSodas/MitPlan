/**
 * Centralized Cooldown Management System
 * 
 * This module provides a unified system for managing mitigation ability cooldowns,
 * charges, and instances across the entire application.
 */

import { mitigationAbilities } from '../../data';
import {
  getAbilityCooldownForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount,
  getAbilityDurationForLevel
} from '../abilities/abilityUtils';
import { ChargesTracker, getChargesTracker, updateChargesTracker } from './chargesTracker';
import { InstancesTracker, getInstancesTracker, updateInstancesTracker } from './instancesTracker';
import { AetherflowTracker, getAetherflowTracker, updateAetherflowTracker } from './aetherflowTracker';

/**
 * Represents the availability status of a mitigation ability
 */
export class AbilityAvailability {
  constructor({
    abilityId,
    isAvailable = true,
    reason = null,
    availableCharges = 1,
    totalCharges = 1,
    availableInstances = 1,
    totalInstances = 1,
    nextAvailableTime = null,
    lastUsedTime = null,
    lastUsedActionId = null,
    lastUsedActionName = null,
    isRoleShared = false,
    tankSpecific = false,
    tankPosition = null,
    sharedCooldownGroup = null
  }) {
    this.abilityId = abilityId;
    this.isAvailable = isAvailable;
    this.reason = reason;
    this.availableCharges = availableCharges;
    this.totalCharges = totalCharges;
    this.availableInstances = availableInstances;
    this.totalInstances = totalInstances;
    this.nextAvailableTime = nextAvailableTime;
    this.lastUsedTime = lastUsedTime;
    this.lastUsedActionId = lastUsedActionId;
    this.lastUsedActionName = lastUsedActionName;
    this.isRoleShared = isRoleShared;
    this.tankSpecific = tankSpecific;
    this.tankPosition = tankPosition;
    this.sharedCooldownGroup = sharedCooldownGroup;
  }

  /**
   * Check if the ability can be assigned to a boss action
   */
  canAssign() {
    return this.isAvailable && (this.availableCharges > 0 || this.availableInstances > 0);
  }

  /**
   * Get a human-readable reason why the ability is unavailable
   */
  getUnavailabilityReason() {
    if (this.isAvailable) return null;

    switch (this.reason) {
      case 'on_cooldown':
        return `On cooldown until ${this.nextAvailableTime}s`;
      case 'shared_cooldown':
        return `Shared cooldown until ${this.nextAvailableTime}s`;
      case 'no_charges':
        return 'No charges available';
      case 'no_instances':
        return 'No instances available';
      case 'already_assigned':
        return `Already assigned to ${this.lastUsedActionName}`;
      case 'tank_mismatch':
        return 'Wrong tank position';
      default:
        return 'Unavailable';
    }
  }
}

/**
 * Represents a usage instance of an ability
 */
export class AbilityUsage {
  constructor({
    abilityId,
    bossActionId,
    time,
    actionName,
    tankPosition = null,
    instanceId = null,
    chargeIndex = null
  }) {
    this.abilityId = abilityId;
    this.bossActionId = bossActionId;
    this.time = time;
    this.actionName = actionName;
    this.tankPosition = tankPosition;
    this.instanceId = instanceId; // For role-shared abilities
    this.chargeIndex = chargeIndex; // For multi-charge abilities
    this.timestamp = Date.now(); // For ordering
  }
}

/**
 * Main cooldown manager class
 */
export class CooldownManager {
  constructor(bossActions = [], bossLevel = 90, selectedJobs = {}, tankPositions = {}) {
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.selectedJobs = selectedJobs;
    this.tankPositions = tankPositions;

    // Cache for performance
    this.availabilityCache = new Map();
    this.usageHistoryCache = new Map();

    // Track when cache was last updated
    this.lastCacheUpdate = 0;

    // Initialize specialized trackers
    this.chargesTracker = getChargesTracker();
    this.instancesTracker = getInstancesTracker();
    this.aetherflowTracker = getAetherflowTracker();
  }

  /**
   * Update the manager with new data
   */
  update({ bossActions, bossLevel, selectedJobs, tankPositions, assignments }) {
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
    
    if (tankPositions !== this.tankPositions) {
      this.tankPositions = tankPositions;
      needsUpdate = true;
    }
    
    if (assignments !== this.assignments) {
      this.assignments = assignments;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      this.clearCache();

      // Update specialized trackers
      const trackerData = { bossActions, bossLevel, selectedJobs, assignments };
      updateChargesTracker(trackerData);
      updateInstancesTracker(trackerData);
      updateAetherflowTracker(trackerData);
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.availabilityCache.clear();
    this.usageHistoryCache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Get the usage history for an ability
   */
  getAbilityUsageHistory(abilityId) {
    const cacheKey = `usage_${abilityId}`;

    if (this.usageHistoryCache.has(cacheKey)) {
      return this.usageHistoryCache.get(cacheKey);
    }

    const usages = [];

    if (!this.assignments || !this.bossActions) {
      this.usageHistoryCache.set(cacheKey, usages);
      return usages;
    }

    // Find all assignments of this ability
    Object.entries(this.assignments).forEach(([bossActionId, mitigations]) => {
      if (!mitigations || !Array.isArray(mitigations)) return;

      const bossAction = this.bossActions.find(action => action.id === bossActionId);
      if (!bossAction) return;

      mitigations.forEach((mitigation, index) => {
        if (mitigation.id === abilityId) {
          let precast = Number(mitigation.precastSeconds);
          if (!Number.isFinite(precast) || precast < 0) precast = 0;
          const usageTime = Math.max(0, bossAction.time - precast);
          usages.push(new AbilityUsage({
            abilityId,
            bossActionId,
            time: usageTime,
            actionName: bossAction.name,
            tankPosition: mitigation.tankPosition || null,
            instanceId: mitigation.instanceId || index,
            chargeIndex: mitigation.chargeIndex || 0
          }));
        }
      });
    });

    // Sort by time
    usages.sort((a, b) => a.time - b.time);

    this.usageHistoryCache.set(cacheKey, usages);
    return usages;
  }

  /**
   * Get all abilities that share a cooldown group
   */
  getAbilitiesInSharedCooldownGroup(groupId) {
    return mitigationAbilities.filter(ability => ability.sharedCooldownGroup === groupId);
  }

  /**
   * Get aggregated usage history for all abilities in a shared cooldown group
   */
  _getSharedCooldownUsageHistory(ability, targetTime) {
    if (!ability.sharedCooldownGroup) {
      return this.getAbilityUsageHistory(ability.id);
    }

    const groupAbilities = this.getAbilitiesInSharedCooldownGroup(ability.sharedCooldownGroup);
    const allUsages = [];

    for (const groupAbility of groupAbilities) {
      const usages = this.getAbilityUsageHistory(groupAbility.id);
      // Filter usages up to target time
      const relevantUsages = usages.filter(usage => usage.time <= targetTime);
      allUsages.push(...relevantUsages);
    }

    // Sort by time to get chronological order
    allUsages.sort((a, b) => a.time - b.time);

    return allUsages;
  }

  /**
   * Check if an ability is available at a specific time
   */
  checkAbilityAvailability(abilityId, targetTime, targetBossActionId = null, options = {}) {
    const {
      excludeCurrentAssignment = false,
      tankPosition = null,
      isBeingAssigned = false
    } = options;

    // Find the ability definition
    const ability = mitigationAbilities.find(m => m.id === abilityId);
    if (!ability) {
      return new AbilityAvailability({
        abilityId,
        isAvailable: false,
        reason: 'ability_not_found',
        sharedCooldownGroup: null
      });
    }

    // Special handling for Aetherflow-consuming abilities
    if (ability.consumesAetherflow) {
      return this._checkAetherflowAbilityAvailability(ability, targetTime, targetBossActionId, options);
    }

    // Get ability properties
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);
    const totalCharges = getAbilityChargeCount(ability, this.bossLevel);
    const roleSharedCount = getRoleSharedAbilityCount(ability, this.selectedJobs);
    const isRoleShared = ability.isRoleShared || false;
    const totalInstances = isRoleShared ? roleSharedCount : 1;

    // Check if already assigned to this specific boss action
    if (targetBossActionId && !excludeCurrentAssignment) {
      const usageHistory = this.getAbilityUsageHistory(abilityId);
      const relevantUsages = usageHistory.filter(usage => usage.time <= targetTime);

      // For single-target mitigations, check tank position specificity
      const { tankPosition } = options;
      let alreadyAssigned = false;

      if (ability.target === 'single' && tankPosition && tankPosition !== 'shared') {
        // For single-target mitigations with specific tank positions, only consider it assigned
        // if there's already an assignment to the same tank position
        alreadyAssigned = relevantUsages.some(usage =>
          usage.bossActionId === targetBossActionId &&
          usage.tankPosition === tankPosition
        );
      } else {
        // For other mitigations, use the original logic
        alreadyAssigned = relevantUsages.some(usage => usage.bossActionId === targetBossActionId);
      }

      if (alreadyAssigned) {
        // For tank busters with multiple charges/instances, allow multiple assignments
        const targetAction = this.bossActions.find(action => action.id === targetBossActionId);
        const isTankBuster = targetAction?.isTankBuster || false;
        const isTankBusterMitigation = ability.forTankBusters && !ability.forRaidWide;

        if (!(isTankBuster && isTankBusterMitigation && (totalCharges > 1 || totalInstances > 1))) {
          return new AbilityAvailability({
            abilityId,
            isAvailable: false,
            reason: 'already_assigned',
            lastUsedActionName: targetAction?.name,
            totalCharges,
            totalInstances,
            isRoleShared,
            sharedCooldownGroup: ability.sharedCooldownGroup || null
          });
        }
      }
    }

    // If this ability requires an active window from another ability (e.g., Consolation → Summon Seraph), enforce it
    if (ability.requiresActiveWindow && ability.requiresActiveWindow.abilityId) {
      const windowAbilityId = ability.requiresActiveWindow.abilityId;
      const windowAbility = mitigationAbilities.find(m => m.id === windowAbilityId);
      if (!windowAbility) {
        return new AbilityAvailability({ abilityId: ability.id, isAvailable: false, reason: 'window_ability_missing' });
      }
      // Find a usage of the window ability whose duration covers targetTime
      const windowDuration = getAbilityDurationForLevel(windowAbility, this.bossLevel) || windowAbility.duration || 0;
      const isWithinWindow = this.getAbilityUsageHistory(windowAbilityId).some(u => (
        u.time <= targetTime && (u.time + windowDuration) >= targetTime
      ));
      if (!isWithinWindow) {
        return new AbilityAvailability({ abilityId: ability.id, isAvailable: false, reason: 'requires_active_window' });
      }
    }

    // Use specialized trackers for enhanced functionality
    if (isRoleShared) {
      return this._checkRoleSharedAvailabilityEnhanced(ability, targetTime, targetBossActionId, options);
    } else if (totalCharges > 1) {
      return this._checkMultiChargeAvailabilityEnhanced(ability, targetTime, targetBossActionId, options);
    } else {
      return this._checkSingleChargeAvailabilityEnhanced(ability, targetTime, targetBossActionId, options);
    }
  }

  /**
   * Check availability for role-shared abilities
   */
  _checkRoleSharedAvailability(ability, usages, targetTime, cooldownDuration, totalInstances, tankPosition) {
    // Group usages by instance (based on timing and tank position)
    const instanceUsages = this._groupUsagesByInstance(usages, cooldownDuration, tankPosition);

    // Count how many instances are on cooldown
    let instancesOnCooldown = 0;
    let nextAvailableTime = null;

    instanceUsages.forEach(instanceGroup => {
      const lastUsage = instanceGroup[instanceGroup.length - 1];
      const timeSinceLastUse = targetTime - lastUsage.time;

      if (timeSinceLastUse < cooldownDuration) {
        instancesOnCooldown++;
        const readyTime = lastUsage.time + cooldownDuration;
        if (!nextAvailableTime || readyTime < nextAvailableTime) {
          nextAvailableTime = readyTime;
        }
      }
    });

    const availableInstances = Math.max(0, totalInstances - instancesOnCooldown);

    return new AbilityAvailability({
      abilityId: ability.id,
      isAvailable: availableInstances > 0,
      reason: availableInstances === 0 ? 'no_instances' : null,
      availableCharges: 1,
      totalCharges: 1,
      availableInstances,
      totalInstances,
      nextAvailableTime,
      isRoleShared: true,
      sharedCooldownGroup: ability.sharedCooldownGroup || null
    });
  }

  /**
   * Check availability for multi-charge abilities
   */
  _checkMultiChargeAvailability(ability, usages, targetTime, cooldownDuration, totalCharges) {
    // Count charges on cooldown
    let chargesOnCooldown = 0;
    let nextAvailableTime = null;

    // Sort usages by time (most recent first for cooldown checking)
    const sortedUsages = [...usages].sort((a, b) => b.time - a.time);

    for (const usage of sortedUsages) {
      const timeSinceUse = targetTime - usage.time;

      if (timeSinceUse < cooldownDuration) {
        chargesOnCooldown++;
        const readyTime = usage.time + cooldownDuration;
        if (!nextAvailableTime || readyTime < nextAvailableTime) {
          nextAvailableTime = readyTime;
        }
      }

      // Stop counting once we've checked all possible charges
      if (chargesOnCooldown >= totalCharges) break;
    }

    const availableCharges = Math.max(0, totalCharges - chargesOnCooldown);

    return new AbilityAvailability({
      abilityId: ability.id,
      isAvailable: availableCharges > 0,
      reason: availableCharges === 0 ? 'no_charges' : null,
      availableCharges,
      totalCharges,
      availableInstances: 1,
      totalInstances: 1,
      nextAvailableTime,
      isRoleShared: false,
      sharedCooldownGroup: ability.sharedCooldownGroup || null
    });
  }

  /**
   * Check availability for single-charge abilities
   */
  _checkSingleChargeAvailability(ability, usages, targetTime, cooldownDuration) {
    if (usages.length === 0) {
      return new AbilityAvailability({
        abilityId: ability.id,
        isAvailable: true,
        availableCharges: 1,
        totalCharges: 1,
        availableInstances: 1,
        totalInstances: 1,
        isRoleShared: false,
        sharedCooldownGroup: ability.sharedCooldownGroup || null
      });
    }

    // Check the most recent usage
    const lastUsage = usages[usages.length - 1];
    const timeSinceLastUse = targetTime - lastUsage.time;
    const isOnCooldown = timeSinceLastUse < cooldownDuration;

    return new AbilityAvailability({
      abilityId: ability.id,
      isAvailable: !isOnCooldown,
      reason: isOnCooldown ? 'on_cooldown' : null,
      availableCharges: isOnCooldown ? 0 : 1,
      totalCharges: 1,
      availableInstances: 1,
      totalInstances: 1,
      nextAvailableTime: isOnCooldown ? lastUsage.time + cooldownDuration : null,
      lastUsedTime: lastUsage.time,
      lastUsedActionId: lastUsage.bossActionId,
      lastUsedActionName: lastUsage.actionName,
      isRoleShared: false,
      sharedCooldownGroup: ability.sharedCooldownGroup || null
    });
  }

  /**
   * Check availability for Aetherflow-consuming abilities
   */
  _checkAetherflowAbilityAvailability(ability, targetTime, targetBossActionId, options) {
    const aetherflowState = this.aetherflowTracker.getAetherflowState(targetTime);

    // Check if Scholar is selected
    if (!this.aetherflowTracker.isScholarSelected()) {
      return new AbilityAvailability({
        abilityId: ability.id,
        isAvailable: false,
        reason: 'job_not_selected',
        availableCharges: 0,
        totalCharges: 1,
        availableInstances: 0,
        totalInstances: 1,
        isRoleShared: false,
        sharedCooldownGroup: ability.sharedCooldownGroup || null
      });
    }

    // Check if Aetherflow stacks are available
    if (!aetherflowState.hasStacksAvailable()) {
      return new AbilityAvailability({
        abilityId: ability.id,
        isAvailable: false,
        reason: 'no_aetherflow_stacks',
        availableCharges: 0,
        totalCharges: 1,
        availableInstances: 0,
        totalInstances: 1,
        nextAvailableTime: aetherflowState.nextRefreshAvailableAt,
        isRoleShared: false,
        sharedCooldownGroup: ability.sharedCooldownGroup || null
      });
    }

    // If stacks are available, check normal cooldown
    const usages = this.getAbilityUsageHistory(ability.id).filter(u => u.time <= targetTime);
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);
    return this._checkSingleChargeAvailability(ability, usages, targetTime, cooldownDuration);
  }

  /**
   * Check availability for role-shared abilities using enhanced tracker
   */
  _checkRoleSharedAvailabilityEnhanced(ability, targetTime, targetBossActionId, options) {
    const instancesState = this.instancesTracker.getInstancesState(ability.id, targetTime);

    // If a specific caster is requested, evaluate availability for that caster's instance only
    const casterJobId = options?.casterJobId || null;
    if (casterJobId) {
      const casterInstance = instancesState.instances.find(inst => inst.jobId === casterJobId);
      if (casterInstance) {
        const isAvailable = casterInstance.isAvailableAt(targetTime);
        return new AbilityAvailability({
          abilityId: ability.id,
          isAvailable,
          reason: isAvailable ? null : 'no_instances',
          availableCharges: 1,
          totalCharges: 1,
          availableInstances: isAvailable ? 1 : 0,
          totalInstances: 1,
          nextAvailableTime: isAvailable ? null : casterInstance.nextAvailableTime,
          isRoleShared: true,
          sharedCooldownGroup: ability.sharedCooldownGroup || null
        });
      }
      // If the caster isn't part of the selected jobs/instances, treat as unavailable
      return new AbilityAvailability({
        abilityId: ability.id,
        isAvailable: false,
        reason: 'no_instances',
        availableCharges: 0,
        totalCharges: 1,
        availableInstances: 0,
        totalInstances: 1,
        nextAvailableTime: null,
        isRoleShared: true,
        sharedCooldownGroup: ability.sharedCooldownGroup || null
      });
    }

    // Default behavior: evaluate across all instances
    return new AbilityAvailability({
      abilityId: ability.id,
      isAvailable: instancesState.hasInstancesAvailable(),
      reason: instancesState.hasInstancesAvailable() ? null : 'no_instances',
      availableCharges: 1,
      totalCharges: 1,
      availableInstances: instancesState.availableInstances,
      totalInstances: instancesState.totalInstances,
      nextAvailableTime: instancesState.nextInstanceAvailableAt,
      isRoleShared: true,
      sharedCooldownGroup: ability.sharedCooldownGroup || null
    });
  }

  /**
   * Check availability for multi-charge abilities using enhanced tracker
   */
  _checkMultiChargeAvailabilityEnhanced(ability, targetTime, targetBossActionId, options) {
    const chargeState = this.chargesTracker.getChargeState(ability.id, targetTime);

    return new AbilityAvailability({
      abilityId: ability.id,
      isAvailable: chargeState.hasChargesAvailable(),
      reason: chargeState.hasChargesAvailable() ? null : 'no_charges',
      availableCharges: chargeState.availableCharges,
      totalCharges: chargeState.totalCharges,
      availableInstances: 1,
      totalInstances: 1,
      nextAvailableTime: chargeState.nextChargeAvailableAt,
      lastUsedTime: chargeState.lastUsedTime,
      isRoleShared: false,
      sharedCooldownGroup: ability.sharedCooldownGroup || null
    });
  }

  /**
   * Check availability for single-charge abilities
   */
  _checkSingleChargeAvailabilityEnhanced(ability, targetTime, targetBossActionId, options) {
    // Use shared cooldown usage history if the ability has a shared cooldown group
    const usageHistory = ability.sharedCooldownGroup
      ? this._getSharedCooldownUsageHistory(ability, targetTime)
      : this.getAbilityUsageHistory(ability.id).filter(usage => usage.time <= targetTime);

    if (usageHistory.length === 0) {
      return new AbilityAvailability({
        abilityId: ability.id,
        isAvailable: true,
        availableCharges: 1,
        totalCharges: 1,
        availableInstances: 1,
        totalInstances: 1,
        isRoleShared: false,
        sharedCooldownGroup: ability.sharedCooldownGroup || null
      });
    }

    // Check the most recent usage across all abilities in the shared cooldown group
    const lastUsage = usageHistory[usageHistory.length - 1];
    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);

    // For shared cooldown groups, use the maximum cooldown duration among all abilities in the group
    let effectiveCooldownDuration = cooldownDuration;
    if (ability.sharedCooldownGroup) {
      const groupAbilities = this.getAbilitiesInSharedCooldownGroup(ability.sharedCooldownGroup);
      effectiveCooldownDuration = Math.max(...groupAbilities.map(a => getAbilityCooldownForLevel(a, this.bossLevel)));
    }

    const timeSinceLastUse = targetTime - lastUsage.time;
    const isOnCooldown = timeSinceLastUse < effectiveCooldownDuration;

    return new AbilityAvailability({
      abilityId: ability.id,
      isAvailable: !isOnCooldown,
      reason: isOnCooldown ? (ability.sharedCooldownGroup ? 'shared_cooldown' : 'on_cooldown') : null,
      availableCharges: isOnCooldown ? 0 : 1,
      totalCharges: 1,
      availableInstances: 1,
      totalInstances: 1,
      nextAvailableTime: isOnCooldown ? lastUsage.time + effectiveCooldownDuration : null,
      lastUsedTime: lastUsage.time,
      lastUsedActionId: lastUsage.bossActionId,
      lastUsedActionName: lastUsage.actionName,
      isRoleShared: false,
      sharedCooldownGroup: ability.sharedCooldownGroup || null
    });
  }

  /**
   * Group usages by instance for role-shared abilities
   */
  _groupUsagesByInstance(usages, cooldownDuration, tankPosition) {
    const instances = [];

    for (const usage of usages) {
      // Find an existing instance this usage could belong to
      let assignedToInstance = false;

      for (const instance of instances) {
        const lastUsageInInstance = instance[instance.length - 1];
        const timeDiff = usage.time - lastUsageInInstance.time;

        // If enough time has passed, this could be the same instance
        if (timeDiff >= cooldownDuration) {
          // Also check tank position compatibility if relevant
          if (!tankPosition || !usage.tankPosition || usage.tankPosition === tankPosition) {
            instance.push(usage);
            assignedToInstance = true;
            break;
          }
        }
      }

      // If not assigned to existing instance, create new one
      if (!assignedToInstance) {
        instances.push([usage]);
      }
    }

    return instances;
  }

  /**
   * Get availability for multiple abilities at once
   */
  checkMultipleAbilities(abilityIds, targetTime, targetBossActionId = null, options = {}) {
    const results = {};

    for (const abilityId of abilityIds) {
      results[abilityId] = this.checkAbilityAvailability(abilityId, targetTime, targetBossActionId, options);
    }

    return results;
  }

  /**
   * Get all available abilities at a specific time
   */
  getAvailableAbilities(targetTime, targetBossActionId = null, options = {}) {
    const availableAbilities = [];

    for (const ability of mitigationAbilities) {
      const availability = this.checkAbilityAvailability(ability.id, targetTime, targetBossActionId, options);

      if (availability.canAssign()) {
        availableAbilities.push({
          ability,
          availability
        });
      }
    }

    return availableAbilities;
  }

  /**
   * Simulate adding an ability usage and check resulting availability
   */
  simulateAbilityUsage(abilityId, bossActionId, time, tankPosition = null) {
    // Create a temporary usage
    const simulatedUsage = new AbilityUsage({
      abilityId,
      bossActionId,
      time,
      actionName: this.bossActions.find(a => a.id === bossActionId)?.name || 'Unknown',
      tankPosition
    });

    // Temporarily add to cache
    const cacheKey = `usage_${abilityId}`;
    const originalUsages = this.usageHistoryCache.get(cacheKey) || this.getAbilityUsageHistory(abilityId);
    const simulatedUsages = [...originalUsages, simulatedUsage].sort((a, b) => a.time - b.time);

    // Temporarily update cache
    this.usageHistoryCache.set(cacheKey, simulatedUsages);

    // Check availability
    const availability = this.checkAbilityAvailability(abilityId, time + 0.1, null, { excludeCurrentAssignment: true });

    // Restore original cache
    this.usageHistoryCache.set(cacheKey, originalUsages);

    return availability;
  }

  /**
   * Get cooldown timeline for an ability
   */
  getAbilityCooldownTimeline(abilityId, startTime = 0, endTime = 600) {
    const timeline = [];
    const usages = this.getAbilityUsageHistory(abilityId);
    const ability = mitigationAbilities.find(m => m.id === abilityId);

    if (!ability) return timeline;

    const cooldownDuration = getAbilityCooldownForLevel(ability, this.bossLevel);

    for (let time = startTime; time <= endTime; time += 1) {
      const availability = this.checkAbilityAvailability(abilityId, time);
      timeline.push({
        time,
        isAvailable: availability.isAvailable,
        availableCharges: availability.availableCharges,
        availableInstances: availability.availableInstances,
        reason: availability.reason
      });
    }

    return timeline;
  }

  /**
   * Reset all caches and recalculate
   */
  refresh() {
    this.clearCache();
  }
}

/**
 * Create a singleton instance for global use
 */
let globalCooldownManager = null;

/**
 * Get or create the global cooldown manager instance
 */
export const getCooldownManager = () => {
  if (!globalCooldownManager) {
    globalCooldownManager = new CooldownManager();
  }
  return globalCooldownManager;
};

/**
 * Update the global cooldown manager
 */
export const updateCooldownManager = (data) => {
  const manager = getCooldownManager();
  manager.update(data);
  return manager;
};

/**
 * Convenience function to check ability availability
 */
export const checkAbilityAvailability = (abilityId, targetTime, targetBossActionId = null, options = {}) => {
  const manager = getCooldownManager();
  return manager.checkAbilityAvailability(abilityId, targetTime, targetBossActionId, options);
};

/**
 * Convenience function to check multiple abilities
 */
export const checkMultipleAbilities = (abilityIds, targetTime, targetBossActionId = null, options = {}) => {
  const manager = getCooldownManager();
  return manager.checkMultipleAbilities(abilityIds, targetTime, targetBossActionId, options);
};

export default CooldownManager;
