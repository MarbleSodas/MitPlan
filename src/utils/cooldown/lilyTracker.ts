import { mitigationAbilities } from '../../data';

export class LilyState {
  constructor({
    availableLilies = 0,
    lastLilyGeneratedTime = 0,
    lilyUsageHistory = []
  } = {}) {
    this.availableLilies = availableLilies;
    this.lastLilyGeneratedTime = lastLilyGeneratedTime;
    this.lilyUsageHistory = lilyUsageHistory;
  }

  hasLiliesAvailable() {
    return this.availableLilies > 0;
  }

  canGenerateLily(currentTime, generationInterval = 20) {
    if (!this.lastLilyGeneratedTime) return true;
    return (currentTime - this.lastLilyGeneratedTime) >= generationInterval;
  }

  getTimeUntilNextLily(currentTime, generationInterval = 20) {
    if (this.lastLilyGeneratedTime === null || this.lastLilyGeneratedTime === undefined) return 0;
    const timeSinceLastLily = currentTime - this.lastLilyGeneratedTime;
    return Math.max(0, generationInterval - timeSinceLastLily);
  }

  getNextLilyGenerationTime(generationInterval = 20) {
    if (this.lastLilyGeneratedTime === null || this.lastLilyGeneratedTime === undefined) return 0;
    return this.lastLilyGeneratedTime + generationInterval;
  }

  static formatTime(seconds) {
    if (seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export class LilyTracker {
  constructor(bossActions = [], bossLevel = 90, assignments = {}, selectedJobs = {}) {
    this.bossActions = bossActions;
    this.bossLevel = bossLevel;
    this.assignments = assignments;
    this.selectedJobs = selectedJobs;
    
    this.lilyGenerationInterval = 20;
    this.maxLilies = 3;
    
    this.lilyConsumers = mitigationAbilities.filter(m => m.consumesLily);
    
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

  isWhiteMageSelected() {
    if (!this.selectedJobs) return false;
    // Check healer array for White Mage - handles both string array and object array formats
    if (this.selectedJobs.healer && Array.isArray(this.selectedJobs.healer)) {
      if (typeof this.selectedJobs.healer[0] === 'string' && this.selectedJobs.healer.includes('WHM')) {
        return true;
      }
      if (typeof this.selectedJobs.healer[0] === 'object' &&
          this.selectedJobs.healer.some(job => job && job.id === 'WHM' && job.selected)) {
        return true;
      }
    }
    return false;
  }

  getLilyState(targetTime) {
    if (!this.isWhiteMageSelected()) {
      return new LilyState({
        availableLilies: 0
      });
    }

    const cacheKey = `lily_${targetTime}`;
    
    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey);
    }

    const state = this._calculateLilyState(targetTime);
    this.stateCache.set(cacheKey, state);
    return state;
  }

  _calculateLilyState(targetTime) {
    const relevantActions = this.bossActions
      .filter(action => action.time <= targetTime)
      .sort((a, b) => a.time - b.time);

    let currentLilies = 3;
    let lastLilyGeneratedTime = 0;
    const lilyUsageHistory = [];

    for (const action of relevantActions) {
      let timeSinceLastLily = action.time - lastLilyGeneratedTime;
      while (timeSinceLastLily >= this.lilyGenerationInterval && currentLilies < this.maxLilies) {
        currentLilies++;
        lastLilyGeneratedTime += this.lilyGenerationInterval;
        timeSinceLastLily = action.time - lastLilyGeneratedTime;
      }

      const actionAssignments = this.assignments[action.id] || [];
      
      const consumingAbilities = actionAssignments.filter(assignment =>
        this.lilyConsumers.some(consumer => consumer.id === assignment.id)
      );
      
      for (const consumingAbility of consumingAbilities) {
        if (currentLilies > 0) {
          currentLilies--;
          lilyUsageHistory.push({
            time: action.time,
            actionId: action.id,
            actionName: action.name,
            abilityId: consumingAbility.id,
            abilityName: consumingAbility.name
          });
        }
      }
    }

    let timeSinceLastLilyAtTarget = targetTime - lastLilyGeneratedTime;
    while (timeSinceLastLilyAtTarget >= this.lilyGenerationInterval && currentLilies < this.maxLilies) {
      currentLilies++;
      lastLilyGeneratedTime += this.lilyGenerationInterval;
      timeSinceLastLilyAtTarget = targetTime - lastLilyGeneratedTime;
    }

    return new LilyState({
      availableLilies: currentLilies,
      lastLilyGeneratedTime,
      lilyUsageHistory
    });
  }

  canUseLilyAbility(abilityId, targetTime) {
    const ability = this.lilyConsumers.find(m => m.id === abilityId);
    if (!ability) return false;

    const lilyState = this.getLilyState(targetTime);
    return lilyState.hasLiliesAvailable();
  }

  getLilyTimeline(startTime = 0, endTime = 600, interval = 1) {
    const timeline = [];
    
    for (let time = startTime; time <= endTime; time += interval) {
      const state = this.getLilyState(time);
      timeline.push({
        time,
        availableLilies: state.availableLilies,
        canGenerate: state.canGenerateLily(time, this.lilyGenerationInterval),
        timeUntilNextLily: state.getTimeUntilNextLily(time, this.lilyGenerationInterval)
      });
    }
    
    return timeline;
  }
}

let globalLilyTracker = null;

export const getLilyTracker = () => {
  if (!globalLilyTracker) {
    globalLilyTracker = new LilyTracker();
  }
  return globalLilyTracker;
};

export const updateLilyTracker = (data) => {
  const tracker = getLilyTracker();
  tracker.update(data);
  return tracker;
};

export default LilyTracker;
