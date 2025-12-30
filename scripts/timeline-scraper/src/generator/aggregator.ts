/**
 * Timeline Aggregation
 *
 * Aggregates timeline data from multiple reports into a single timeline.
 * Supports multiple aggregation strategies:
 * - median: Use median timing (default, most robust)
 * - average: Use mean timing
 * - earliest: Use earliest occurrence (conservative)
 * - latest: Use latest occurrence (liberal)
 * - merge: Combine all unique actions with median timing
 */

import type {
  BossAction,
  AggregationOptions,
  AggregationStrategy,
  TimelineReport,
  NormalizedTimeline,
} from '../types/index.js';
import { dedupeAoEActions } from '../utils/damage.js';

export interface OccurrenceGroup {
  name: string;
  occurrence: number;
  times: number[];
  actions: BossAction[];
}

export interface AggregatedAction extends BossAction {
  confidence: number;
  sourceReports: number;
  timeRange: { min: number; max: number; stdDev: number };
}

/**
 * Aggregate timelines from multiple reports
 *
 * @param timelines - Array of timeline data from multiple reports
 * @param options - Aggregation options
 * @returns Aggregated timeline
 */
export function aggregateTimelines(
  timelines: TimelineReport[],
  options: Partial<AggregationOptions> = {}
): BossAction[] {
  const { strategy = 'median', phaseAware = false } = options;

  if (timelines.length === 0) {
    return [];
  }

  if (timelines.length === 1) {
    return timelines[0].actions;
  }

  console.log(`Aggregating ${timelines.length} timelines using '${strategy}' strategy...`);

  if (phaseAware) {
    return aggregatePhaseAware(timelines, strategy);
  }

  return aggregateSimple(timelines, strategy);
}

/**
 * Simple aggregation (not phase-aware)
 *
 * Groups actions by name and calculates timing statistics.
 */
function aggregateSimple(
  timelines: TimelineReport[],
  strategy: AggregationStrategy
): BossAction[] {
  // Extract all actions
  const allActions = timelines.flatMap(t => t.actions);

  // Group by action name
  const actionGroups = groupActionsByName(allActions);

  // Aggregate each group
  const aggregated: BossAction[] = [];

  for (const [name, actions] of actionGroups) {
    const time = calculateAggregateTime(actions, strategy);
    const merged = mergeActionData(actions, time);
    aggregated.push(merged);
  }

  // Sort by time
  aggregated.sort((a, b) => a.time - b.time);

  console.log(`  Aggregated to ${aggregated.length} unique actions`);

  return aggregated;
}

/**
 * Phase-aware aggregation
 *
 * Aggregates each phase separately, then combines.
 * This is more accurate for multi-phase fights.
 */
function aggregatePhaseAware(
  timelines: TimelineReport[],
  strategy: AggregationStrategy
): BossAction[] {
  // Check if timelines have phase information
  const hasPhaseInfo = timelines.every(t => t.normalized && t.normalized.phases.length > 0);

  if (!hasPhaseInfo) {
    console.log('  Phase info not available, falling back to simple aggregation');
    return aggregateSimple(timelines, strategy);
  }

  const aggregated: BossAction[] = [];
  const maxPhases = Math.max(...timelines.map(t => t.normalized?.phases.length || 0));

  console.log(`  Processing ${maxPhases} phase(s)`);

  // Aggregate each phase
  for (let phaseIndex = 0; phaseIndex < maxPhases; phaseIndex++) {
    const phaseActions: BossAction[] = [];

    for (const timeline of timelines) {
      const phase = timeline.normalized?.phases[phaseIndex];
      if (phase) {
        // Adjust times to be relative to overall timeline start
        const phaseOffset = phaseIndex > 0 ? calculatePhaseOffset(timeline.normalized!, phaseIndex) : 0;
        const adjusted = phase.actions.map(a => ({
          ...a,
          time: a.time + phaseOffset,
        }));
        phaseActions.push(...adjusted);
      }
    }

    // Group by name and aggregate
    const actionGroups = groupActionsByName(phaseActions);

    for (const [name, actions] of actionGroups) {
      const time = calculateAggregateTime(actions, strategy);
      const merged = mergeActionData(actions, time);
      aggregated.push(merged);
    }
  }

  // Sort by time
  aggregated.sort((a, b) => a.time - b.time);

  console.log(`  Aggregated to ${aggregated.length} unique actions across ${maxPhases} phase(s)`);

  return aggregated;
}

/**
 * Calculate phase offset for phase-aware aggregation
 */
function calculatePhaseOffset(normalized: NormalizedTimeline, phaseIndex: number): number {
  let offset = 0;
  for (let i = 0; i < phaseIndex; i++) {
    const phase = normalized.phases[i];
    offset += phase.endTime - phase.startTime;
  }
  return offset;
}

/**
 * Group actions by name (case-insensitive)
 */
function groupActionsByName(actions: BossAction[]): Map<string, BossAction[]> {
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

/**
 * Calculate aggregate time for a group of actions
 */
function calculateAggregateTime(
  actions: BossAction[],
  strategy: AggregationStrategy
): number {
  const times = actions.map(a => a.time).sort((a, b) => a - b);
  const count = times.length;

  switch (strategy) {
    case 'earliest':
      return times[0];

    case 'latest':
      return times[count - 1];

    case 'average': {
      const sum = times.reduce((a, b) => a + b, 0);
      return Math.round((sum / count) * 100) / 100;
    }

    case 'median':
    case 'merge':
    default: {
      if (count % 2 === 0) {
        return Math.round(((times[count / 2 - 1] + times[count / 2]) / 2) * 100) / 100;
      }
      return Math.round(times[Math.floor(count / 2)] * 100) / 100;
    }
  }
}

/**
 * Merge action data from multiple instances
 *
 * Combines damage data, tags, and metadata.
 */
function mergeActionData(actions: BossAction[], time: number): BossAction {
  const first = actions[0];

  // Collect all unique tags
  const allTags = new Set<string>();
  for (const action of actions) {
    if (action.tags) {
      for (const tag of action.tags) {
        allTags.add(tag);
      }
    }
  }

  // Determine damage type (prioritize 'mixed' if both exist)
  const damageTypes = new Set(actions.map(a => a.damageType).filter(Boolean) as string[]);
  const damageType: 'physical' | 'magical' | 'mixed' | undefined =
    damageTypes.has('mixed') ? 'mixed' :
    damageTypes.size > 1 ? 'mixed' :
    first.damageType;

  // Collect damage values
  const damageValues = actions
    .map(a => a.unmitigatedDamage)
    .filter(Boolean) as string[];

  let unmitigatedDamage: string | undefined;
  if (damageValues.length > 0) {
    // If multiple different values, show range
    const unique = [...new Set(damageValues)];
    if (unique.length === 1) {
      unmitigatedDamage = unique[0];
    } else if (unique.length > 1) {
      unmitigatedDamage = `${unique[0]} - ${unique[unique.length - 1]}`;
    }
  }

  // Check if any instance is a tank buster
  const isTankBuster = actions.some(a => a.isTankBuster);
  const isDualTankBuster = actions.some(a => a.isDualTankBuster);

  // Determine importance (highest priority)
  const importanceLevels = { low: 1, medium: 2, high: 3, critical: 4 };
  const highestImportance = actions
    .map(a => importanceLevels[a.importance || 'medium'] || 2)
    .reduce((a, b) => Math.max(a, b), 2);

  const importance: 'low' | 'medium' | 'high' | 'critical' =
    highestImportance >= 4 ? 'critical' :
    highestImportance >= 3 ? 'high' :
    highestImportance >= 2 ? 'medium' : 'low';

  return {
    ...first,
    id: `${first.id}_aggregated`,
    time,
    unmitigatedDamage,
    damageType,
    importance,
    tags: allTags.size > 0 ? Array.from(allTags) : undefined,
    isTankBuster,
    isDualTankBuster,
  };
}

/**
 * Aggregate with Cactbot alignment
 *
 * Merges FFLogs aggregated data with Cactbot timeline.
 */
export function aggregateWithCactbot(
  fflogsActions: BossAction[],
  cactbotActions: BossAction[],
  options: Partial<AggregationOptions> = {}
): BossAction[] {
  console.log('Merging with Cactbot timeline...');

  // Create a map of Cactbot actions by name
  const cactbotMap = new Map<string, BossAction>();
  for (const action of cactbotActions) {
    const key = action.name.toLowerCase();
    if (!cactbotMap.has(key)) {
      cactbotMap.set(key, action);
    }
  }

  // Merge: Prefer Cactbot timing, keep FFLogs damage data
  const merged: BossAction[] = [];
  const usedCactbotNames = new Set<string>();

  for (const fflogsAction of fflogsActions) {
    const key = fflogsAction.name.toLowerCase();
    const cactbotAction = cactbotMap.get(key);

    if (cactbotAction) {
      // Use Cactbot timing, FFLogs damage
      merged.push({
        ...fflogsAction,
        time: cactbotAction.time,
        id: `${fflogsAction.id}_cactbot`,
      });
      usedCactbotNames.add(key);
    } else {
      // No Cactbot match, use FFLogs timing
      merged.push(fflogsAction);
    }
  }

  // Add Cactbot-only actions (mechanics without damage)
  for (const [key, cactbotAction] of cactbotMap) {
    if (!usedCactbotNames.has(key)) {
      merged.push({
        ...cactbotAction,
        id: `${cactbotAction.id || 'cactbot'}_cactbot_only`,
      });
    }
  }

  // Sort by time
  merged.sort((a, b) => a.time - b.time);

  // Dedupe AoE actions
  const deduped = dedupeAoEActions(merged);

  console.log(`  Merged to ${deduped.length} total actions`);

  return deduped;
}

export function aggregateByOccurrence(
  timelines: BossAction[][],
  totalReports: number,
  options: { strategy?: AggregationStrategy; minConfidence?: number } = {}
): AggregatedAction[] {
  const { strategy = 'median', minConfidence = 0.3 } = options;

  const groups = new Map<string, OccurrenceGroup>();

  for (const timeline of timelines) {
    for (const action of timeline) {
      const occurrence = action.occurrence || 1;
      const key = `${action.name.toLowerCase()}_${occurrence}`;

      if (!groups.has(key)) {
        groups.set(key, {
          name: action.name,
          occurrence,
          times: [],
          actions: [],
        });
      }

      const group = groups.get(key)!;
      group.times.push(action.time);
      group.actions.push(action);
    }
  }

  const aggregated: AggregatedAction[] = [];

  for (const [_, group] of groups) {
    const confidence = group.actions.length / totalReports;
    if (confidence < minConfidence) continue;

    const times = group.times.sort((a, b) => a - b);
    const time = calculateAggregateTime(group.actions, strategy);

    const min = times[0];
    const max = times[times.length - 1];
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    const filteredActions = times.length >= 3
      ? group.actions.filter((_, i) => Math.abs(times[i] - mean) <= 2 * stdDev)
      : group.actions;

    const baseAction = filteredActions[0] || group.actions[0];

    const damageValues = group.actions
      .map(a => a.unmitigatedDamage)
      .filter(Boolean) as string[];
    const maxDamage = damageValues.length > 0 ? damageValues[damageValues.length - 1] : undefined;

    aggregated.push({
      ...baseAction,
      id: `${baseAction.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${group.occurrence}_${Math.round(time)}`,
      time: Math.round(time),
      occurrence: group.occurrence,
      confidence: Math.round(confidence * 100) / 100,
      sourceReports: group.actions.length,
      unmitigatedDamage: maxDamage,
      timeRange: {
        min: Math.round(min),
        max: Math.round(max),
        stdDev: Math.round(stdDev * 100) / 100,
      },
    });
  }

  aggregated.sort((a, b) => a.time - b.time);

  console.log(`  Aggregated ${groups.size} occurrence groups to ${aggregated.length} actions`);
  console.log(`  Filtered out ${groups.size - aggregated.length} low-confidence actions`);

  return aggregated;
}

export function mergeWithCactbotTiming(
  fflogsActions: AggregatedAction[],
  cactbotActions: BossAction[],
  options: { fuzzyMatch?: boolean } = {}
): BossAction[] {
  const { fuzzyMatch = true } = options;

  if (cactbotActions.length === 0) {
    return fflogsActions.map(a => {
      const { timeRange, ...rest } = a;
      return rest;
    });
  }

  const cactbotByName = new Map<string, BossAction[]>();
  for (const action of cactbotActions) {
    const key = action.name.toLowerCase();
    if (!cactbotByName.has(key)) {
      cactbotByName.set(key, []);
    }
    cactbotByName.get(key)!.push(action);
  }

  const merged: BossAction[] = [];
  const usedCactbot = new Set<string>();

  for (const ffAction of fflogsActions) {
    const key = ffAction.name.toLowerCase();
    const occurrence = ffAction.occurrence || 1;
    
    let cactbotMatch: BossAction | undefined;
    
    const exactMatches = cactbotByName.get(key);
    if (exactMatches && exactMatches.length >= occurrence) {
      cactbotMatch = exactMatches[occurrence - 1];
    }

    if (!cactbotMatch && fuzzyMatch) {
      for (const [cactKey, cactActions] of cactbotByName) {
        if (cactActions.length >= occurrence) {
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalize(key).includes(normalize(cactKey)) || normalize(cactKey).includes(normalize(key))) {
            cactbotMatch = cactActions[occurrence - 1];
            break;
          }
        }
      }
    }

    const { timeRange, ...baseAction } = ffAction;

    if (cactbotMatch) {
      usedCactbot.add(`${cactbotMatch.name.toLowerCase()}_${cactbotMatch.time}`);
      merged.push({
        ...baseAction,
        time: cactbotMatch.time,
        id: `${baseAction.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${occurrence}_${cactbotMatch.time}`,
      });
    } else {
      merged.push(baseAction);
    }
  }

  for (const cactAction of cactbotActions) {
    const key = `${cactAction.name.toLowerCase()}_${cactAction.time}`;
    if (!usedCactbot.has(key)) {
      const hasMatch = merged.some(m => 
        m.name.toLowerCase() === cactAction.name.toLowerCase() &&
        Math.abs(m.time - cactAction.time) < 5
      );
      if (!hasMatch) {
        merged.push({
          ...cactAction,
          importance: cactAction.importance || 'medium',
        });
      }
    }
  }

  merged.sort((a, b) => a.time - b.time);

  return merged;
}
