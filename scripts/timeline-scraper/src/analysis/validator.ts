import type { BossAction } from '../types/index.js';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  actionIds?: string[];
  timing?: number;
}

export function validateTimeline(
  actions: BossAction[],
  options: {
    minActions?: number;
    maxGapSec?: number;
    minConfidence?: number;
  } = {}
): ValidationResult {
  const {
    minActions = 10,
    maxGapSec = 60,
    minConfidence = 0.3,
  } = options;
  
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  
  if (actions.length < minActions) {
    issues.push({
      type: 'warning',
      message: `Timeline has only ${actions.length} actions (expected at least ${minActions})`,
    });
    suggestions.push('Consider processing more reports to increase coverage');
  }
  
  const duplicateIssues = checkForDuplicates(actions);
  issues.push(...duplicateIssues);
  
  const gapIssues = checkForLargeGaps(actions, maxGapSec);
  issues.push(...gapIssues);
  
  const confidenceIssues = checkLowConfidence(actions, minConfidence);
  issues.push(...confidenceIssues);
  
  const multiHitIssues = checkSuspiciousMultiHit(actions);
  issues.push(...multiHitIssues);
  
  const timingIssues = checkTimingConsistency(actions);
  issues.push(...timingIssues);
  
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  
  const score = calculateScore(actions.length, errorCount, warningCount);
  const isValid = errorCount === 0 && actions.length >= minActions;
  
  if (warningCount > 5) {
    suggestions.push('Many warnings detected - consider reviewing the timeline manually');
  }
  
  if (actions.some(a => !a.description)) {
    suggestions.push('Some actions lack descriptions - consider enabling AI or web analysis');
  }
  
  return {
    isValid,
    score,
    issues,
    suggestions,
  };
}

function checkForDuplicates(actions: BossAction[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, BossAction[]>();
  
  for (const action of actions) {
    const key = `${action.name.toLowerCase()}_${action.time}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(action);
  }
  
  for (const [key, duplicates] of seen) {
    if (duplicates.length > 1) {
      issues.push({
        type: 'warning',
        message: `Duplicate action detected: "${duplicates[0].name}" at t=${duplicates[0].time}s`,
        actionIds: duplicates.map(a => a.id),
        timing: duplicates[0].time,
      });
    }
  }
  
  for (let i = 1; i < actions.length; i++) {
    const prev = actions[i - 1];
    const curr = actions[i];
    
    if (
      prev.name.toLowerCase() === curr.name.toLowerCase() &&
      curr.time - prev.time <= 3 &&
      !curr.hitCount
    ) {
      issues.push({
        type: 'info',
        message: `Closely timed "${curr.name}" at t=${prev.time}s and t=${curr.time}s - might be multi-hit`,
        actionIds: [prev.id, curr.id],
        timing: curr.time,
      });
    }
  }
  
  return issues;
}

function checkForLargeGaps(actions: BossAction[], maxGapSec: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (let i = 1; i < actions.length; i++) {
    const gap = actions[i].time - actions[i - 1].time;
    
    if (gap > maxGapSec) {
      const isPhaseTransition = actions[i].name.toLowerCase().includes('transition') ||
                                 actions[i].name.toLowerCase().includes('phase') ||
                                 actions[i].name.toLowerCase().includes('special');
      
      if (!isPhaseTransition) {
        issues.push({
          type: 'info',
          message: `Large gap of ${gap}s between "${actions[i - 1].name}" and "${actions[i].name}"`,
          timing: actions[i].time,
        });
      }
    }
  }
  
  return issues;
}

function checkLowConfidence(actions: BossAction[], minConfidence: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  const lowConfActions = actions.filter(a => 
    a.confidence !== undefined && a.confidence < minConfidence
  );
  
  if (lowConfActions.length > 0) {
    issues.push({
      type: 'warning',
      message: `${lowConfActions.length} actions have low confidence (<${minConfidence * 100}%)`,
      actionIds: lowConfActions.map(a => a.id),
    });
  }
  
  return issues;
}

function checkSuspiciousMultiHit(actions: BossAction[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byName = new Map<string, BossAction[]>();
  
  for (const action of actions) {
    const key = action.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, []);
    }
    byName.get(key)!.push(action);
  }
  
  for (const [name, nameActions] of byName) {
    const sortedActions = nameActions.sort((a, b) => a.time - b.time);
    
    let cluster: BossAction[] = [];
    for (const action of sortedActions) {
      if (cluster.length === 0) {
        cluster = [action];
        continue;
      }
      
      const lastTime = cluster[cluster.length - 1].time;
      if (action.time - lastTime <= 5) {
        cluster.push(action);
      } else {
        if (cluster.length >= 3 && !cluster[0].hitCount) {
          issues.push({
            type: 'warning',
            message: `"${cluster[0].name}" appears ${cluster.length} times within 5s - likely unconsolidated multi-hit`,
            actionIds: cluster.map(a => a.id),
            timing: cluster[0].time,
          });
        }
        cluster = [action];
      }
    }
    
    if (cluster.length >= 3 && !cluster[0].hitCount) {
      issues.push({
        type: 'warning',
        message: `"${cluster[0].name}" appears ${cluster.length} times within 5s - likely unconsolidated multi-hit`,
        actionIds: cluster.map(a => a.id),
        timing: cluster[0].time,
      });
    }
  }
  
  return issues;
}

function checkTimingConsistency(actions: BossAction[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (actions.length > 0 && actions[0].time < 0) {
    issues.push({
      type: 'error',
      message: `First action has negative time (${actions[0].time}s) - timeline may not be properly aligned`,
      timing: actions[0].time,
    });
  }
  
  if (actions.length > 0 && actions[0].time > 30) {
    issues.push({
      type: 'warning',
      message: `First action at ${actions[0].time}s - timeline might be missing early mechanics`,
      timing: actions[0].time,
    });
  }
  
  for (let i = 1; i < actions.length; i++) {
    if (actions[i].time < actions[i - 1].time) {
      issues.push({
        type: 'error',
        message: `Actions out of order: "${actions[i - 1].name}" at ${actions[i - 1].time}s before "${actions[i].name}" at ${actions[i].time}s`,
        actionIds: [actions[i - 1].id, actions[i].id],
      });
    }
  }
  
  return issues;
}

function calculateScore(
  actionCount: number,
  errorCount: number,
  warningCount: number
): number {
  let score = 100;
  
  score -= errorCount * 20;
  score -= warningCount * 5;
  
  if (actionCount < 10) score -= 20;
  else if (actionCount < 20) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [
    '=== Timeline Validation Report ===',
    '',
    `Status: ${result.isValid ? 'VALID' : 'INVALID'}`,
    `Score: ${result.score}/100`,
    '',
  ];
  
  const errors = result.issues.filter(i => i.type === 'error');
  const warnings = result.issues.filter(i => i.type === 'warning');
  const infos = result.issues.filter(i => i.type === 'info');
  
  if (errors.length > 0) {
    lines.push('Errors:');
    for (const error of errors) {
      lines.push(`  ✗ ${error.message}`);
    }
    lines.push('');
  }
  
  if (warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of warnings.slice(0, 10)) {
      lines.push(`  ⚠ ${warning.message}`);
    }
    if (warnings.length > 10) {
      lines.push(`  ... and ${warnings.length - 10} more`);
    }
    lines.push('');
  }
  
  if (infos.length > 0 && infos.length <= 5) {
    lines.push('Info:');
    for (const info of infos) {
      lines.push(`  ℹ ${info.message}`);
    }
    lines.push('');
  }
  
  if (result.suggestions.length > 0) {
    lines.push('Suggestions:');
    for (const suggestion of result.suggestions) {
      lines.push(`  → ${suggestion}`);
    }
  }
  
  return lines.join('\n');
}
