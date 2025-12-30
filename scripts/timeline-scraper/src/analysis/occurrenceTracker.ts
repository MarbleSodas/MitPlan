import type { BossAction, OccurrenceConfig } from '../types/index.js';

const DEFAULT_CONFIG: OccurrenceConfig = {
  sameOccurrenceWindowSec: 5,
  newOccurrenceGapSec: 30,
};

export interface OccurrenceGroup {
  name: string;
  occurrence: number;
  actions: BossAction[];
  startTime: number;
  endTime: number;
  medianTime: number;
  confidence: number;
}

export function trackOccurrences(
  actions: BossAction[],
  config: Partial<OccurrenceConfig> = {}
): BossAction[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const sortedActions = [...actions].sort((a, b) => a.time - b.time);
  
  const actionsByName = groupByName(sortedActions);
  const result: BossAction[] = [];
  
  for (const [name, nameActions] of actionsByName) {
    const withOccurrences = assignOccurrences(nameActions, cfg);
    result.push(...withOccurrences);
  }
  
  return result.sort((a, b) => a.time - b.time);
}

function groupByName(actions: BossAction[]): Map<string, BossAction[]> {
  const groups = new Map<string, BossAction[]>();
  
  for (const action of actions) {
    const key = action.name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(action);
  }
  
  return groups;
}

function assignOccurrences(
  actions: BossAction[],
  config: OccurrenceConfig
): BossAction[] {
  if (actions.length === 0) return [];
  
  const result: BossAction[] = [];
  let currentOccurrence = 1;
  let lastOccurrenceTime = -Infinity;
  
  for (const action of actions) {
    const timeSinceLastOccurrence = action.time - lastOccurrenceTime;
    
    if (timeSinceLastOccurrence > config.newOccurrenceGapSec) {
      currentOccurrence++;
      lastOccurrenceTime = action.time;
    } else if (timeSinceLastOccurrence <= config.sameOccurrenceWindowSec) {
      // stays same occurrence - likely multi-hit
    } else {
      currentOccurrence++;
      lastOccurrenceTime = action.time;
    }
    
    if (result.length === 0) {
      currentOccurrence = 1;
      lastOccurrenceTime = action.time;
    }
    
    result.push({
      ...action,
      occurrence: currentOccurrence,
    });
  }
  
  return result;
}

export function groupByOccurrence(
  actions: BossAction[],
  config: Partial<OccurrenceConfig> = {}
): OccurrenceGroup[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tracked = trackOccurrences(actions, cfg);
  
  const groups = new Map<string, OccurrenceGroup>();
  
  for (const action of tracked) {
    const key = `${action.name.toLowerCase()}_${action.occurrence || 1}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        name: action.name,
        occurrence: action.occurrence || 1,
        actions: [],
        startTime: action.time,
        endTime: action.time,
        medianTime: action.time,
        confidence: 1,
      });
    }
    
    const group = groups.get(key)!;
    group.actions.push(action);
    group.startTime = Math.min(group.startTime, action.time);
    group.endTime = Math.max(group.endTime, action.time);
  }
  
  for (const group of groups.values()) {
    const times = group.actions.map(a => a.time).sort((a, b) => a - b);
    const mid = Math.floor(times.length / 2);
    group.medianTime = times.length % 2 === 0
      ? (times[mid - 1] + times[mid]) / 2
      : times[mid];
  }
  
  return Array.from(groups.values()).sort((a, b) => a.medianTime - b.medianTime);
}

export function validateOccurrenceGroups(
  groups: OccurrenceGroup[],
  totalReports: number,
  minConfidence: number = 0.3
): { valid: OccurrenceGroup[]; suspicious: OccurrenceGroup[] } {
  const valid: OccurrenceGroup[] = [];
  const suspicious: OccurrenceGroup[] = [];
  
  for (const group of groups) {
    const confidence = group.actions.length / totalReports;
    group.confidence = Math.round(confidence * 100) / 100;
    
    const timeSpread = group.endTime - group.startTime;
    const isHighVariance = timeSpread > 10;
    
    if (confidence >= minConfidence && !isHighVariance) {
      valid.push(group);
    } else {
      suspicious.push(group);
    }
  }
  
  return { valid, suspicious };
}

export function mergeOccurrenceGroups(
  groups: OccurrenceGroup[],
  totalReports: number
): BossAction[] {
  const merged: BossAction[] = [];
  
  for (const group of groups) {
    const representative = selectRepresentativeAction(group);
    const confidence = group.actions.length / totalReports;
    
    merged.push({
      ...representative,
      time: Math.round(group.medianTime),
      occurrence: group.occurrence,
      confidence: Math.round(confidence * 100) / 100,
      sourceReports: group.actions.length,
      id: generateActionId(group),
    });
  }
  
  return merged.sort((a, b) => a.time - b.time);
}

function selectRepresentativeAction(group: OccurrenceGroup): BossAction {
  const sorted = [...group.actions].sort((a, b) => {
    const impLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const aImp = impLevels[a.importance || 'medium'] || 2;
    const bImp = impLevels[b.importance || 'medium'] || 2;
    return bImp - aImp;
  });
  
  return sorted[0];
}

function generateActionId(group: OccurrenceGroup): string {
  const sanitized = group.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `${sanitized}_${group.occurrence}_${Math.round(group.medianTime)}`;
}

export function detectDuplicateOccurrences(
  groups: OccurrenceGroup[],
  windowSec: number = 5
): { original: OccurrenceGroup; duplicate: OccurrenceGroup }[] {
  const duplicates: { original: OccurrenceGroup; duplicate: OccurrenceGroup }[] = [];
  
  const byName = new Map<string, OccurrenceGroup[]>();
  for (const group of groups) {
    const key = group.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, []);
    }
    byName.get(key)!.push(group);
  }
  
  for (const [name, nameGroups] of byName) {
    const sorted = nameGroups.sort((a, b) => a.medianTime - b.medianTime);
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      if (curr.medianTime - prev.medianTime <= windowSec) {
        duplicates.push({ original: prev, duplicate: curr });
      }
    }
  }
  
  return duplicates;
}

export function consolidateDuplicates(
  groups: OccurrenceGroup[]
): OccurrenceGroup[] {
  const duplicates = detectDuplicateOccurrences(groups, 5);
  const toRemove = new Set(duplicates.map(d => d.duplicate));
  
  const consolidated: OccurrenceGroup[] = [];
  
  for (const group of groups) {
    if (toRemove.has(group)) {
      continue;
    }
    
    const relatedDups = duplicates.filter(d => d.original === group);
    if (relatedDups.length > 0) {
      const allActions = [
        ...group.actions,
        ...relatedDups.flatMap(d => d.duplicate.actions),
      ];
      
      consolidated.push({
        ...group,
        actions: allActions,
        startTime: Math.min(group.startTime, ...relatedDups.map(d => d.duplicate.startTime)),
        endTime: Math.max(group.endTime, ...relatedDups.map(d => d.duplicate.endTime)),
      });
    } else {
      consolidated.push(group);
    }
  }
  
  return consolidated;
}
