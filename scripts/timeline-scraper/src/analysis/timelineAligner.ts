import type { BossAction, AlignmentConfig } from '../types/index.js';

const DEFAULT_CONFIG: AlignmentConfig = {
  autoDetectReference: true,
  minReportPresence: 0.8,
};

export interface AlignmentResult {
  alignedTimelines: BossAction[][];
  referenceAction: string;
  referenceTime: number;
  offsets: number[];
}

export function alignTimelines(
  timelines: BossAction[][],
  config: Partial<AlignmentConfig> = {}
): AlignmentResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (timelines.length === 0) {
    return {
      alignedTimelines: [],
      referenceAction: '',
      referenceTime: 0,
      offsets: [],
    };
  }
  
  if (timelines.length === 1) {
    return {
      alignedTimelines: timelines,
      referenceAction: timelines[0][0]?.name || '',
      referenceTime: 0,
      offsets: [0],
    };
  }
  
  const referenceAction = cfg.referenceAction || 
    (cfg.autoDetectReference ? detectReferenceAction(timelines, cfg.minReportPresence) : '');
  
  if (!referenceAction) {
    return {
      alignedTimelines: timelines,
      referenceAction: '',
      referenceTime: 0,
      offsets: new Array(timelines.length).fill(0),
    };
  }
  
  const referenceTimes = timelines.map(timeline => 
    findFirstActionTime(timeline, referenceAction)
  );
  
  const validTimes = referenceTimes.filter(t => t !== null) as number[];
  if (validTimes.length === 0) {
    return {
      alignedTimelines: timelines,
      referenceAction,
      referenceTime: 0,
      offsets: new Array(timelines.length).fill(0),
    };
  }
  
  const medianReferenceTime = calculateMedian(validTimes);
  
  const offsets: number[] = [];
  const alignedTimelines: BossAction[][] = [];
  
  for (let i = 0; i < timelines.length; i++) {
    const refTime = referenceTimes[i];
    
    if (refTime === null) {
      offsets.push(0);
      alignedTimelines.push(timelines[i]);
      continue;
    }
    
    const offset = medianReferenceTime - refTime;
    offsets.push(offset);
    
    const aligned = timelines[i].map(action => ({
      ...action,
      time: Math.round((action.time + offset) * 100) / 100,
    }));
    
    alignedTimelines.push(aligned);
  }
  
  return {
    alignedTimelines,
    referenceAction,
    referenceTime: medianReferenceTime,
    offsets,
  };
}

function detectReferenceAction(
  timelines: BossAction[][],
  minPresence: number
): string {
  const actionPresence = new Map<string, { count: number; times: number[] }>();
  
  for (const timeline of timelines) {
    const seenInTimeline = new Set<string>();
    
    for (const action of timeline) {
      const key = action.name.toLowerCase();
      
      if (!seenInTimeline.has(key)) {
        seenInTimeline.add(key);
        
        if (!actionPresence.has(key)) {
          actionPresence.set(key, { count: 0, times: [] });
        }
        
        const entry = actionPresence.get(key)!;
        entry.count++;
        entry.times.push(action.time);
      }
    }
  }
  
  const minCount = Math.floor(timelines.length * minPresence);
  const candidates: { name: string; avgTime: number; variance: number }[] = [];
  
  for (const [name, data] of actionPresence) {
    if (data.count >= minCount) {
      const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
      const variance = data.times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / data.times.length;
      
      candidates.push({ name, avgTime, variance });
    }
  }
  
  candidates.sort((a, b) => {
    if (Math.abs(a.avgTime - b.avgTime) > 30) {
      return a.avgTime - b.avgTime;
    }
    return a.variance - b.variance;
  });
  
  const originalName = timelines[0]?.find(a => 
    a.name.toLowerCase() === candidates[0]?.name
  )?.name;
  
  return originalName || candidates[0]?.name || '';
}

function findFirstActionTime(
  timeline: BossAction[],
  actionName: string
): number | null {
  const normalized = actionName.toLowerCase();
  
  for (const action of timeline) {
    if (action.name.toLowerCase() === normalized) {
      return action.time;
    }
  }
  
  return null;
}

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}

export function normalizeToZero(
  timeline: BossAction[],
  referenceAction?: string
): BossAction[] {
  if (timeline.length === 0) return [];
  
  let referenceTime: number;
  
  if (referenceAction) {
    const found = timeline.find(a => 
      a.name.toLowerCase() === referenceAction.toLowerCase()
    );
    referenceTime = found?.time || timeline[0].time;
  } else {
    referenceTime = timeline[0].time;
  }
  
  return timeline.map(action => ({
    ...action,
    time: Math.round((action.time - referenceTime) * 100) / 100,
  }));
}

export function detectTimelinePhases(
  timeline: BossAction[],
  gapThresholdSec: number = 30
): { phaseIndex: number; startTime: number; actions: BossAction[] }[] {
  const phases: { phaseIndex: number; startTime: number; actions: BossAction[] }[] = [];
  let currentPhase: BossAction[] = [];
  let phaseIndex = 0;
  let phaseStart = 0;
  let lastTime = -Infinity;
  
  for (const action of timeline) {
    if (currentPhase.length === 0) {
      currentPhase = [action];
      phaseStart = action.time;
      lastTime = action.time;
      continue;
    }
    
    if (action.time - lastTime > gapThresholdSec) {
      phases.push({
        phaseIndex,
        startTime: phaseStart,
        actions: currentPhase,
      });
      
      phaseIndex++;
      currentPhase = [action];
      phaseStart = action.time;
    } else {
      currentPhase.push(action);
    }
    
    lastTime = action.time;
  }
  
  if (currentPhase.length > 0) {
    phases.push({
      phaseIndex,
      startTime: phaseStart,
      actions: currentPhase,
    });
  }
  
  return phases;
}

export function calculateAlignmentQuality(
  alignedTimelines: BossAction[][],
  referenceAction: string
): number {
  const referenceTimes: number[] = [];
  
  for (const timeline of alignedTimelines) {
    const action = timeline.find(a => 
      a.name.toLowerCase() === referenceAction.toLowerCase()
    );
    if (action) {
      referenceTimes.push(action.time);
    }
  }
  
  if (referenceTimes.length < 2) return 1;
  
  const mean = referenceTimes.reduce((a, b) => a + b, 0) / referenceTimes.length;
  const variance = referenceTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / referenceTimes.length;
  const stdDev = Math.sqrt(variance);
  
  const quality = Math.max(0, 1 - (stdDev / 5));
  return Math.round(quality * 100) / 100;
}
