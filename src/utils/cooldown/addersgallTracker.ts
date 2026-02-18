import { mitigationAbilities } from '../../data';

interface AddersgallUsageEntry {
  time: number;
  actionId: string;
  actionName: string;
  abilityId: string;
  abilityName: string;
}

interface AddersgallRefreshEntry {
  time: number;
  actionId: string | null;
  actionName: string;
  manual?: boolean;
  automatic?: boolean;
}

export class AddersgallState {
  constructor({
    availableStacks = 3,
    totalStacks = 3,
    lastRefreshTime = 0,
    nextRefreshAvailableAt = null,
    usageHistory = [],
    refreshHistory = []
  } = {}) {
    this.availableStacks = availableStacks;
    this.totalStacks = totalStacks;
    this.lastRefreshTime = lastRefreshTime;
    this.nextRefreshAvailableAt = nextRefreshAvailableAt;
    this.usageHistory = usageHistory;
    this.refreshHistory = refreshHistory;
  }

  hasStacksAvailable() {
    return this.availableStacks > 0;
  }

  canRefresh(currentTime, refreshInterval = 20) {
    if (!this.lastRefreshTime) return true;
    return (currentTime - this.lastRefreshTime) >= refreshInterval;
  }

  getTimeUntilRefresh(currentTime, refreshInterval = 20) {
    if (this.lastRefreshTime === null || this.lastRefreshTime === undefined) return 0;
    const timeSinceRefresh = currentTime - this.lastRefreshTime;
    return Math.max(0, refreshInterval - timeSinceRefresh);
  }

  getNextRefreshTime(refreshInterval = 20) {
    if (this.lastRefreshTime === null || this.lastRefreshTime === undefined) return 0;
    return this.lastRefreshTime + refreshInterval;
  }

  static formatTime(seconds) {
    if (seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export class AddersgallTracker {
  constructor(bossActions = [], bossLevel = 90, assignments = {}, selectedJobs = {}) {
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.assignments = assignments;
    this.selectedJobs = selectedJobs;
    
    this.refreshInterval = 20;
    
    this.addersgallConsumers = mitigationAbilities.filter(m => m.consumesAddersgall);
    this.addersgallProviders = mitigationAbilities.filter(m => m.providesAddersgall);
    
    this.stateCache = new Map();
    this.lastCacheUpdate = 0;
  }

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

  clearCache() {
    this.stateCache.clear();
    this.lastCacheUpdate = Date.now();
  }

  isSageSelected() {
    if (!this.selectedJobs) return false;
    if (this.selectedJobs['SGE']) return true;
    if (this.selectedJobs.healer && Array.isArray(this.selectedJobs.healer)) {
      if (typeof this.selectedJobs.healer[0] === 'string' && this.selectedJobs.healer.includes('SGE')) {
        return true;
      }
      if (typeof this.selectedJobs.healer[0] === 'object' &&
          this.selectedJobs.healer.some(job => job && job.id === 'SGE' && job.selected)) {
        return true;
      }
    }
    return false;
  }

  getAddersgallState(targetTime) {
    if (!this.isSageSelected()) {
      return new AddersgallState({
        availableStacks: 0,
        totalStacks: 0
      });
    }

    const cacheKey = `addersgall_${targetTime}`;
    
    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey);
    }

    const state = this._calculateAddersgallState(targetTime);
    this.stateCache.set(cacheKey, state);
    return state;
  }

  _calculateAddersgallState(targetTime) {
    const relevantActions = this.bossActions
      .filter(action => action.time <= targetTime)
      .sort((a, b) => a.time - b.time);

    let currentStacks = 3;
    let lastRefreshTime = 0;
    const usageHistory = [];
    const refreshHistory = [];

    for (const action of relevantActions) {
      const actionAssignments = this.assignments[action.id] || [];

      const hasManualRefresh = actionAssignments.some(assignment =>
        this.addersgallProviders.some(provider => provider.id === assignment.id)
      );

      if (hasManualRefresh) {
        const timeSinceLastRefresh = action.time - lastRefreshTime;
        if (timeSinceLastRefresh >= this.refreshInterval) {
          currentStacks = Math.min(3, currentStacks + 1);
          lastRefreshTime = action.time;
          refreshHistory.push({
            time: action.time,
            actionId: action.id,
            actionName: action.name,
            manual: true
          });
        }
      }

      const timeSinceLastRefresh = action.time - lastRefreshTime;
      if (timeSinceLastRefresh >= this.refreshInterval && currentStacks < 3) {
        currentStacks = Math.min(3, currentStacks + 1);
        lastRefreshTime = action.time;
        refreshHistory.push({
          time: action.time,
          actionId: action.id,
          actionName: action.name,
          automatic: true
        });
      }
      
      const consumingAbilities = actionAssignments.filter(assignment =>
        this.addersgallConsumers.some(consumer => consumer.id === assignment.id)
      );
      
      for (const consumingAbility of consumingAbilities) {
        if (currentStacks > 0) {
          currentStacks--;
          usageHistory.push({
            time: action.time,
            actionId: action.id,
            actionName: action.name,
            abilityId: consumingAbility.id,
            abilityName: consumingAbility.name
          });
        }
      }
    }

    const timeSinceLastRefreshAtTarget = targetTime - lastRefreshTime;
    if (timeSinceLastRefreshAtTarget >= this.refreshInterval && currentStacks < 3) {
      const nextAutoRefreshTime = lastRefreshTime + this.refreshInterval;
      if (nextAutoRefreshTime <= targetTime) {
        currentStacks = Math.min(3, currentStacks + 1);
        lastRefreshTime = nextAutoRefreshTime;
        refreshHistory.push({
          time: nextAutoRefreshTime,
          actionId: null,
          actionName: 'Automatic Refresh',
          automatic: true
        });
      }
    }

    let nextRefreshAvailableAt = null;
    if (lastRefreshTime >= 0) {
      const nextRefreshTime = lastRefreshTime + this.refreshInterval;
      if (nextRefreshTime > targetTime) {
        nextRefreshAvailableAt = nextRefreshTime;
      }
    }

    const lastStackUsedTime = usageHistory.length > 0 
      ? usageHistory[usageHistory.length - 1].time 
      : null;

    return new AddersgallState({
      availableStacks: currentStacks,
      totalStacks: 3,
      lastRefreshTime,
      nextRefreshAvailableAt,
      usageHistory,
      refreshHistory
    });
  }

  canUseAddersgallAbility(abilityId, targetTime) {
    const ability = this.addersgallConsumers.find(m => m.id === abilityId);
    if (!ability) return false;

    const addersgallState = this.getAddersgallState(targetTime);
    return addersgallState.hasStacksAvailable();
  }

  getAddersgallTimeline(startTime = 0, endTime = 600, interval = 1) {
    const timeline = [];
    
    for (let time = startTime; time <= endTime; time += interval) {
      const state = this.getAddersgallState(time);
      timeline.push({
        time,
        availableStacks: state.availableStacks,
        totalStacks: state.totalStacks,
        canRefresh: state.canRefresh(time, this.refreshInterval),
        timeUntilRefresh: state.getTimeUntilRefresh(time, this.refreshInterval)
      });
    }
    
    return timeline;
  }
}

let globalAddersgallTracker = null;

export const getAddersgallTracker = () => {
  if (!globalAddersgallTracker) {
    globalAddersgallTracker = new AddersgallTracker();
  }
  return globalAddersgallTracker;
};

export const updateAddersgallTracker = (data) => {
  const tracker = getAddersgallTracker();
  tracker.update(data);
  return tracker;
};

export default AddersgallTracker;
