import type { FFLogsEvent, MultiHitCluster, MultiHitConfig, BossAction } from '../types/index.js';

const DEFAULT_CONFIG: MultiHitConfig = {
  windowMs: 2000,
  minHitsForMultiHit: 2,
  knownMultiHitAbilities: [],
};

export function detectMultiHitClusters(
  events: FFLogsEvent[],
  config: Partial<MultiHitConfig> = {}
): MultiHitCluster[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const clusters: MultiHitCluster[] = [];
  
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const eventsByAbility = groupEventsByAbility(sortedEvents);
  
  for (const [abilityId, abilityEvents] of eventsByAbility) {
    const abilityClusters = findClustersForAbility(abilityEvents, abilityId, cfg);
    clusters.push(...abilityClusters);
  }
  
  return clusters.sort((a, b) => a.startTime - b.startTime);
}

function groupEventsByAbility(events: FFLogsEvent[]): Map<number, FFLogsEvent[]> {
  const groups = new Map<number, FFLogsEvent[]>();
  
  for (const event of events) {
    const abilityId = event.abilityGameID ?? event.ability?.guid;
    if (!abilityId) continue;
    
    if (!groups.has(abilityId)) {
      groups.set(abilityId, []);
    }
    groups.get(abilityId)!.push(event);
  }
  
  return groups;
}

function findClustersForAbility(
  events: FFLogsEvent[],
  abilityId: number,
  config: MultiHitConfig
): MultiHitCluster[] {
  const clusters: MultiHitCluster[] = [];
  let currentCluster: FFLogsEvent[] = [];
  let clusterStartTime = 0;
  
  for (const event of events) {
    if (currentCluster.length === 0) {
      currentCluster = [event];
      clusterStartTime = event.timestamp;
      continue;
    }
    
    const timeSinceClusterStart = event.timestamp - clusterStartTime;
    
    if (timeSinceClusterStart <= config.windowMs) {
      currentCluster.push(event);
    } else {
      if (currentCluster.length >= config.minHitsForMultiHit) {
        clusters.push(createCluster(currentCluster, abilityId));
      }
      currentCluster = [event];
      clusterStartTime = event.timestamp;
    }
  }
  
  if (currentCluster.length >= config.minHitsForMultiHit) {
    clusters.push(createCluster(currentCluster, abilityId));
  }
  
  return clusters;
}

function createCluster(events: FFLogsEvent[], abilityId: number): MultiHitCluster {
  const totalDamage = events.reduce((sum, e) => {
    return sum + (e.unmitigatedAmount ?? e.amount ?? e.damage ?? 0);
  }, 0);
  
  const abilityName = events[0].ability?.name ?? `Ability ${abilityId}`;
  
  return {
    abilityId,
    abilityName,
    events,
    startTime: events[0].timestamp,
    endTime: events[events.length - 1].timestamp,
    hitCount: events.length,
    totalDamage,
    perHitDamage: Math.round(totalDamage / events.length),
  };
}

export function consolidateMultiHitActions(
  actions: BossAction[],
  config: Partial<MultiHitConfig> = {}
): BossAction[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const consolidated: BossAction[] = [];
  const processed = new Set<string>();
  
  const sortedActions = [...actions].sort((a, b) => a.time - b.time);
  const actionsByName = new Map<string, BossAction[]>();
  
  for (const action of sortedActions) {
    const key = action.name.toLowerCase();
    if (!actionsByName.has(key)) {
      actionsByName.set(key, []);
    }
    actionsByName.get(key)!.push(action);
  }
  
  for (const [name, nameActions] of actionsByName) {
    const clusters = findActionClusters(nameActions, cfg.windowMs / 1000);
    
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        consolidated.push(cluster[0]);
        continue;
      }
      
      const mergedAction = mergeActionsIntoMultiHit(cluster);
      consolidated.push(mergedAction);
    }
  }
  
  return consolidated.sort((a, b) => a.time - b.time);
}

function findActionClusters(actions: BossAction[], windowSec: number): BossAction[][] {
  const clusters: BossAction[][] = [];
  let currentCluster: BossAction[] = [];
  
  for (const action of actions) {
    if (currentCluster.length === 0) {
      currentCluster = [action];
      continue;
    }
    
    const lastAction = currentCluster[currentCluster.length - 1];
    const timeDiff = action.time - lastAction.time;
    
    if (timeDiff <= windowSec) {
      currentCluster.push(action);
    } else {
      clusters.push(currentCluster);
      currentCluster = [action];
    }
  }
  
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }
  
  return clusters;
}

function mergeActionsIntoMultiHit(actions: BossAction[]): BossAction {
  const firstAction = actions[0];
  const hitCount = actions.length;
  
  const damages = actions
    .map(a => parseDamageValue(a.unmitigatedDamage || '0'))
    .filter(d => d > 0);
  
  const totalDamage = damages.reduce((sum, d) => sum + d, 0);
  const perHitDamage = damages.length > 0 ? Math.round(totalDamage / damages.length) : 0;
  
  const maxImportance = actions.reduce((max, a) => {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    const current = levels[a.importance || 'medium'] || 2;
    return Math.max(max, current);
  }, 0);
  
  const importanceMap: Record<number, BossAction['importance']> = {
    1: 'low',
    2: 'medium',
    3: 'high',
    4: 'critical',
  };
  
  return {
    ...firstAction,
    id: `${firstAction.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${firstAction.time}`,
    hitCount,
    perHitDamage: perHitDamage > 0 ? `~${perHitDamage.toLocaleString()}` : undefined,
    unmitigatedDamage: perHitDamage > 0 
      ? `~${perHitDamage.toLocaleString()} per hit (${hitCount} hits)`
      : firstAction.unmitigatedDamage,
    importance: importanceMap[maxImportance] || 'medium',
    isTankBuster: actions.some(a => a.isTankBuster),
    isDualTankBuster: actions.some(a => a.isDualTankBuster),
  };
}

function parseDamageValue(damageStr: string): number {
  const match = damageStr.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ''), 10);
  }
  return 0;
}

export function isKnownMultiHitAbility(
  abilityName: string, 
  knownAbilities: string[]
): boolean {
  const normalized = abilityName.toLowerCase();
  return knownAbilities.some(known => normalized.includes(known.toLowerCase()));
}
