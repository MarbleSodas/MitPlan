/**
 * Timeline Normalization
 *
 * Normalizes timelines from different reports to enable accurate aggregation.
 *
 * Key concepts:
 * - Reference action: The first meaningful action becomes time=0
 * - Phase detection: Boss fights have phases separated by time gaps
 * - Phase-normalized aggregation: Each phase is aggregated separately
 */

import type {
  BossAction,
  NormalizationOptions,
  NormalizedTimeline,
  Phase,
} from '../types/index.js';

// Keywords that indicate phase transitions
const PHASE_TRANSITION_KEYWORDS = [
  'phase transition',
  'enrage',
  'transition',
  'phase change',
  'form change',
  'limit break',
];

// Actions to skip when finding reference (non-damaging, pull-related)
const SKIP_FOR_REFERENCE = [
  'pull',
  'engage',
  'combat start',
  'battle start',
  'encounter start',
];

/**
 * Normalize a timeline to establish consistent timing across reports
 *
 * @param actions - Raw actions from FFLogs parsing
 * @param fightStartTime - Absolute start time of the fight
 * @param options - Normalization options
 * @returns Normalized timeline with phase information
 */
export function normalizeTimeline(
  actions: BossAction[],
  fightStartTime: number,
  options: NormalizationOptions = {}
): NormalizedTimeline {
  const {
    referenceAction: preferredReference,
    detectPhases = true,
    phaseGapThreshold = 30,
  } = options;

  if (actions.length === 0) {
    return {
      actions: [],
      phases: [],
      referenceAction: '',
      referenceTime: 0,
    };
  }

  // Find the reference action (time=0)
  const referenceInfo = findReferenceAction(actions, preferredReference);
  const referenceTime = referenceInfo.timestamp;

  console.log(`  Reference action: ${referenceInfo.action.name} at time=${referenceInfo.relativeTime}s`);

  // Detect phases if enabled
  const phases = detectPhases
    ? detectPhasesInTimeline(actions, referenceTime, phaseGapThreshold)
    : [{
        phaseIndex: 0,
        startTime: referenceTime,
        normalizedStart: 0,
        endTime: actions[actions.length - 1]?.time || 0,
        actions,
      }];

  console.log(`  Detected ${phases.length} phase(s)`);

  // Normalize actions within each phase
  const normalizedActions = normalizeActionsInPhases(actions, phases, referenceTime);

  return {
    actions: normalizedActions,
    phases,
    referenceAction: referenceInfo.action.name,
    referenceTime,
  };
}

/**
 * Find the reference action to use as time=0
 *
 * Prefers the first meaningful damaging action.
 * Can also use a user-specified action name.
 */
function findReferenceAction(
  actions: BossAction[],
  preferredReference?: string
): { action: BossAction; timestamp: number; relativeTime: number } {
  let reference: BossAction | undefined;

  if (preferredReference) {
    // Find the user-specified action
    reference = actions.find(a =>
      a.name.toLowerCase().includes(preferredReference.toLowerCase())
    );
  }

  if (!reference) {
    // Find the first meaningful damaging action
    reference = actions.find(a => {
      const lowerName = a.name.toLowerCase();
      // Skip pull/engage actions
      if (SKIP_FOR_REFERENCE.some(skip => lowerName.includes(skip))) {
        return false;
      }
      // Skip actions with no damage (pure mechanics)
      if (!a.unmitigatedDamage && !a.isTankBuster) {
        return false;
      }
      return true;
    });
  }

  // Fall back to first action if nothing else found
  if (!reference) {
    reference = actions[0];
  }

  const timestamp = reference.time;
  const relativeTime = timestamp; // Already relative to fight start

  return { action: reference, timestamp, relativeTime };
}

/**
 * Detect phase boundaries in a timeline
 *
 * Phases are detected by:
 * 1. Large time gaps between actions (> phaseGapThreshold)
 * 2. Phase transition keywords in action names
 */
function detectPhasesInTimeline(
  actions: BossAction[],
  referenceTime: number,
  phaseGapThreshold: number
): Phase[] {
  if (actions.length === 0) {
    return [];
  }

  const phases: Phase[] = [];
  let currentPhaseActions: BossAction[] = [];
  let phaseIndex = 0;
  let lastActionTime = referenceTime;

  // Initialize first phase
  let phaseStartTime = referenceTime;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionTime = action.time;

    // Check for phase transition indicators
    const isPhaseTransition = PHASE_TRANSITION_KEYWORDS.some(keyword =>
      action.name.toLowerCase().includes(keyword)
    );

    const timeGap = actionTime - lastActionTime;
    const isLargeGap = timeGap > phaseGapThreshold && currentPhaseActions.length > 0;

    if (isPhaseTransition || isLargeGap) {
      // End current phase and start new one
      phases.push({
        phaseIndex,
        startTime: phaseStartTime,
        normalizedStart: 0,
        endTime: lastActionTime,
        actions: [...currentPhaseActions],
      });

      phaseIndex++;
      phaseStartTime = actionTime;
      currentPhaseActions = [action];
    } else {
      currentPhaseActions.push(action);
    }

    lastActionTime = actionTime;
  }

  // Add final phase
  if (currentPhaseActions.length > 0) {
    phases.push({
      phaseIndex,
      startTime: phaseStartTime,
      normalizedStart: 0,
      endTime: lastActionTime,
      actions: currentPhaseActions,
    });
  }

  return phases;
}

/**
 * Normalize action times within phases
 *
 * Each action's time is adjusted relative to its phase start.
 * This enables phase-aware aggregation.
 */
function normalizeActionsInPhases(
  actions: BossAction[],
  phases: Phase[],
  referenceTime: number
): BossAction[] {
  // Map action signature to its phase (more reliable than using time as key)
  const actionToPhase = new Map<string, Phase>();

  for (const phase of phases) {
    for (const action of phase.actions) {
      // Use unique signature as key for reliable lookup
      actionToPhase.set(
        `${action.name}_${action.time}_${action.id || ''}`,
        phase
      );
    }
  }

  // Create normalized actions
  return actions.map(action => {
    const key = `${action.name}_${action.time}_${action.id || ''}`;
    const phase = actionToPhase.get(key);
    if (!phase) {
      return action;
    }

    // Normalize time relative to phase start
    const normalizedTime = action.time - phase.startTime;

    return {
      ...action,
      time: Math.round(normalizedTime * 100) / 100, // Round to 2 decimal places
    };
  });
}

/**
 * Align normalized actions with Cactbot timeline
 *
 * Cactbot timelines use sync points and phase markers.
 * This function attempts to match normalized actions to Cactbot entries.
 */
export function alignWithCactbot(
  normalized: NormalizedTimeline,
  cactbotActions: BossAction[]
): BossAction[] {
  if (!cactbotActions || cactbotActions.length === 0) {
    return normalized.actions;
  }

  // Create a map of Cactbot actions by name for quick lookup
  const cactbotMap = new Map<string, BossAction[]>();
  for (const action of cactbotActions) {
    const key = action.name.toLowerCase();
    if (!cactbotMap.has(key)) {
      cactbotMap.set(key, []);
    }
    cactbotMap.get(key)!.push(action);
  }

  // Merge: Use Cactbot timing where available, FFLogs timing otherwise
  const merged: BossAction[] = [];

  for (const action of normalized.actions) {
    const key = action.name.toLowerCase();
    const cactbotMatches = cactbotMap.get(key);

    if (cactbotMatches && cactbotMatches.length > 0) {
      // Use Cactbot timing as reference
      const cactbotAction = cactbotMatches[0];
      merged.push({
        ...action,
        time: cactbotAction.time,
        // Preserve FFLogs damage data
        unmitigatedDamage: action.unmitigatedDamage,
        damageType: action.damageType,
      });
    } else {
      // No Cactbot match, use FFLogs timing
      merged.push(action);
    }
  }

  // Add any Cactbot actions not in FFLogs
  const fflogsNames = new Set(normalized.actions.map(a => a.name.toLowerCase()));
  for (const cactbotAction of cactbotActions) {
    if (!fflogsNames.has(cactbotAction.name.toLowerCase())) {
      merged.push(cactbotAction);
    }
  }

  // Sort by time
  merged.sort((a, b) => a.time - b.time);

  return merged;
}

/**
 * Reconstruct a timeline from normalized phases
 *
 * Converts phase-relative times back to absolute times
 * for a single continuous timeline.
 */
export function reconstructTimeline(
  normalized: NormalizedTimeline,
  phaseDurations?: number[]
): BossAction[] {
  if (normalized.phases.length === 0) {
    return normalized.actions;
  }

  const reconstructed: BossAction[] = [];
  const durations = phaseDurations || normalized.phases.map(p => p.endTime - p.startTime);

  // Map actions to their phases
  const actionPhases = new Map<BossAction, Phase>();
  for (const phase of normalized.phases) {
    for (const action of phase.actions) {
      actionPhases.set(action, phase);
    }
  }

  // Reconstruct each action with absolute time
  for (const action of normalized.actions) {
    const phase = actionPhases.get(action);
    if (!phase) {
      reconstructed.push(action);
      continue;
    }

    // Calculate phase start time (sum of previous phase durations)
    let phaseStartOffset = 0;
    for (let i = 0; i < phase.phaseIndex; i++) {
      phaseStartOffset += durations[i] || 0;
    }

    reconstructed.push({
      ...action,
      time: Math.round((phaseStartOffset + action.time) * 100) / 100,
    });
  }

  return reconstructed.sort((a, b) => a.time - b.time);
}

/**
 * Calculate timing statistics for an action across multiple reports
 */
export interface TimingStats {
  name: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
}

export function calculateTimingStats(
  timelines: BossAction[][],
  actionName: string
): TimingStats | null {
  const allTimes: number[] = [];

  for (const timeline of timelines) {
    const matches = timeline.filter(a => a.name.toLowerCase() === actionName.toLowerCase());
    for (const match of matches) {
      allTimes.push(match.time);
    }
  }

  if (allTimes.length === 0) {
    return null;
  }

  allTimes.sort((a, b) => a - b);

  const count = allTimes.length;
  const min = allTimes[0];
  const max = allTimes[count - 1];
  const sum = allTimes.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const median = count % 2 === 0
    ? (allTimes[count / 2 - 1] + allTimes[count / 2]) / 2
    : allTimes[Math.floor(count / 2)];

  // Mode (most common value, rounded to nearest second)
  const rounded = allTimes.map(t => Math.round(t));
  const frequency = new Map<number, number>();
  for (const r of rounded) {
    frequency.set(r, (frequency.get(r) || 0) + 1);
  }
  let maxFreq = 0;
  let mode = mean;
  for (const [value, freq] of frequency) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = value;
    }
  }

  // Standard deviation
  const squaredDiffs = allTimes.map(t => Math.pow(t - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const standardDeviation = Math.sqrt(variance);

  return {
    name: actionName,
    count,
    min,
    max,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    mode: Math.round(mode * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
  };
}
