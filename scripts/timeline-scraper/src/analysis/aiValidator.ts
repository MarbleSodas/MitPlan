import { spawn } from 'child_process';
import type { BossAction } from '../types/index.js';
import type { TimelinePatternAnalysis, RepeatPattern } from './timelinePatternAnalyzer.js';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  category: 'timing' | 'occurrence' | 'merge' | 'split' | 'missing' | 'duplicate' | 'anomaly';
  message: string;
  affectedActions: string[];
  suggestedFix?: string;
  confidence: number;
}

export interface MergeSuggestion {
  sourceActions: string[];
  targetName: string;
  reason: string;
  confidence: number;
}

export interface SplitSuggestion {
  sourceAction: string;
  splitInto: string[];
  reason: string;
  confidence: number;
}

export interface AIValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  mergeSuggestions: MergeSuggestion[];
  splitSuggestions: SplitSuggestion[];
  missingMechanics: string[];
  anomalies: string[];
  correctedActions?: BossAction[];
  summary: string;
}

export interface AIValidatorConfig {
  enabled: boolean;
  timeout: number;
  autoCorrect: boolean;
  minConfidenceForCorrection: number;
}

const DEFAULT_CONFIG: AIValidatorConfig = {
  enabled: true,
  timeout: 45000,
  autoCorrect: false,
  minConfidenceForCorrection: 0.8,
};

export async function validateTimelineWithAI(
  actions: BossAction[],
  bossName: string,
  patternAnalysis: TimelinePatternAnalysis | null,
  config: Partial<AIValidatorConfig> = {}
): Promise<AIValidationResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const ruleBasedIssues = runRuleBasedValidation(actions, patternAnalysis);

  if (!cfg.enabled) {
    return {
      isValid: ruleBasedIssues.filter(i => i.type === 'error').length === 0,
      score: calculateScore(ruleBasedIssues),
      issues: ruleBasedIssues,
      mergeSuggestions: [],
      splitSuggestions: [],
      missingMechanics: [],
      anomalies: [],
      summary: 'Rule-based validation only (AI disabled)',
    };
  }

  try {
    const prompt = buildValidationPrompt(actions, bossName, patternAnalysis, ruleBasedIssues);
    const aiResult = await runGeminiValidation(prompt, cfg.timeout);

    if (aiResult) {
      const mergedIssues = mergeValidationIssues(ruleBasedIssues, aiResult.issues);

      let correctedActions: BossAction[] | undefined;
      if (cfg.autoCorrect && aiResult.mergeSuggestions.length > 0) {
        correctedActions = applyCorrections(actions, aiResult, cfg.minConfidenceForCorrection);
      }

      return {
        isValid: mergedIssues.filter(i => i.type === 'error').length === 0,
        score: calculateScore(mergedIssues),
        issues: mergedIssues,
        mergeSuggestions: aiResult.mergeSuggestions,
        splitSuggestions: aiResult.splitSuggestions,
        missingMechanics: aiResult.missingMechanics,
        anomalies: aiResult.anomalies,
        correctedActions,
        summary: aiResult.summary,
      };
    }
  } catch (error) {
    console.warn(`AI validation failed: ${(error as Error).message}`);
  }

  return {
    isValid: ruleBasedIssues.filter(i => i.type === 'error').length === 0,
    score: calculateScore(ruleBasedIssues),
    issues: ruleBasedIssues,
    mergeSuggestions: [],
    splitSuggestions: [],
    missingMechanics: [],
    anomalies: [],
    summary: 'Fallback to rule-based validation',
  };
}

function runRuleBasedValidation(
  actions: BossAction[],
  patternAnalysis: TimelinePatternAnalysis | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...checkTimingConsistency(actions));
  issues.push(...checkOccurrenceConsistency(actions, patternAnalysis));
  issues.push(...checkSuspiciousPatterns(actions));
  issues.push(...checkMultiHitConsistency(actions));

  return issues;
}

function checkTimingConsistency(actions: BossAction[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (actions.length > 0 && actions[0].time < 0) {
    issues.push({
      type: 'error',
      category: 'timing',
      message: `First action has negative time (${actions[0].time}s)`,
      affectedActions: [actions[0].id],
      suggestedFix: 'Re-align timeline to start at 0',
      confidence: 1.0,
    });
  }

  for (let i = 1; i < actions.length; i++) {
    if (actions[i].time < actions[i - 1].time) {
      issues.push({
        type: 'error',
        category: 'timing',
        message: `Actions out of order: ${actions[i - 1].name} (${actions[i - 1].time}s) before ${actions[i].name} (${actions[i].time}s)`,
        affectedActions: [actions[i - 1].id, actions[i].id],
        confidence: 1.0,
      });
    }
  }

  for (let i = 1; i < actions.length; i++) {
    if (
      actions[i].name.toLowerCase() === actions[i - 1].name.toLowerCase() &&
      actions[i].time - actions[i - 1].time <= 2 &&
      !actions[i].hitCount
    ) {
      issues.push({
        type: 'suggestion',
        category: 'merge',
        message: `"${actions[i].name}" at ${actions[i - 1].time}s and ${actions[i].time}s may be multi-hit`,
        affectedActions: [actions[i - 1].id, actions[i].id],
        suggestedFix: 'Consider merging as multi-hit ability',
        confidence: 0.7,
      });
    }
  }

  return issues;
}

function checkOccurrenceConsistency(
  actions: BossAction[],
  patternAnalysis: TimelinePatternAnalysis | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!patternAnalysis) return issues;

  for (const pattern of patternAnalysis.repeatPatterns) {
    if (pattern.isRegular && pattern.intervalVariance > 5) {
      const expectedInterval = pattern.intervalMs / 1000;
      const occurrences = pattern.occurrences;

      for (let i = 1; i < occurrences.length; i++) {
        const actualInterval = occurrences[i] - occurrences[i - 1];
        const deviation = Math.abs(actualInterval - expectedInterval);

        if (deviation > expectedInterval * 0.3) {
          issues.push({
            type: 'warning',
            category: 'occurrence',
            message: `"${pattern.abilityName}" occurrence ${i + 1} deviates ${Math.round(deviation)}s from expected interval`,
            affectedActions: [],
            suggestedFix: `Expected at ~${Math.round(occurrences[i - 1] + expectedInterval)}s, found at ${occurrences[i]}s`,
            confidence: 0.6,
          });
        }
      }
    }
  }

  return issues;
}

function checkSuspiciousPatterns(actions: BossAction[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const byName = new Map<string, BossAction[]>();
  for (const action of actions) {
    const key = action.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(action);
  }

  for (const [name, nameActions] of byName) {
    if (nameActions.length === 1 && nameActions[0].confidence && nameActions[0].confidence < 0.5) {
      issues.push({
        type: 'warning',
        category: 'anomaly',
        message: `"${nameActions[0].name}" appears only once with low confidence (${Math.round(nameActions[0].confidence * 100)}%)`,
        affectedActions: [nameActions[0].id],
        suggestedFix: 'May be a misidentified ability or rare mechanic',
        confidence: 0.5,
      });
    }

    const sorted = nameActions.sort((a, b) => a.time - b.time);
    let clusterStart = 0;
    for (let i = 1; i <= sorted.length; i++) {
      const isClusterEnd = i === sorted.length || sorted[i].time - sorted[i - 1].time > 5;
      if (isClusterEnd) {
        const clusterSize = i - clusterStart;
        if (clusterSize >= 4 && !sorted[clusterStart].hitCount) {
          issues.push({
            type: 'suggestion',
            category: 'merge',
            message: `"${sorted[clusterStart].name}" appears ${clusterSize} times within 5s - likely unconsolidated multi-hit`,
            affectedActions: sorted.slice(clusterStart, i).map(a => a.id),
            suggestedFix: `Merge into single ${clusterSize}-hit ability`,
            confidence: 0.8,
          });
        }
        clusterStart = i;
      }
    }
  }

  return issues;
}

function checkMultiHitConsistency(actions: BossAction[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const multiHitActions = actions.filter(a => a.hitCount && a.hitCount > 1);

  const byName = new Map<string, BossAction[]>();
  for (const action of multiHitActions) {
    const key = action.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(action);
  }

  for (const [name, nameActions] of byName) {
    const hitCounts = nameActions.map(a => a.hitCount!);
    const uniqueHitCounts = [...new Set(hitCounts)];

    if (uniqueHitCounts.length > 1) {
      issues.push({
        type: 'warning',
        category: 'anomaly',
        message: `"${nameActions[0].name}" has inconsistent hit counts: ${uniqueHitCounts.join(', ')}`,
        affectedActions: nameActions.map(a => a.id),
        suggestedFix: 'May indicate different variations or data quality issues',
        confidence: 0.6,
      });
    }
  }

  return issues;
}

function buildValidationPrompt(
  actions: BossAction[],
  bossName: string,
  patternAnalysis: TimelinePatternAnalysis | null,
  ruleBasedIssues: ValidationIssue[]
): string {
  const actionSummary = actions.slice(0, 50).map(a => {
    const parts = [`${a.time}s: ${a.name}`];
    if (a.occurrence) parts.push(`#${a.occurrence}`);
    if (a.hitCount && a.hitCount > 1) parts.push(`[${a.hitCount}x]`);
    if (a.confidence) parts.push(`(${Math.round(a.confidence * 100)}%)`);
    return parts.join(' ');
  });

  const existingIssues = ruleBasedIssues.slice(0, 10).map(i => `- ${i.message}`);

  const patternContext = patternAnalysis
    ? `Detected patterns: ${patternAnalysis.summary}`
    : 'No pattern analysis available';

  return `Validate this FFXIV boss timeline and respond with ONLY a JSON object.

Boss: ${bossName}
Total actions: ${actions.length}
${patternContext}

Timeline (first 50):
${actionSummary.join('\n')}

Pre-detected issues:
${existingIssues.length > 0 ? existingIssues.join('\n') : 'None'}

Analyze for:
1. Actions that should be merged (same ability appearing multiple times in quick succession)
2. Actions that might need splitting (consolidated actions that are actually separate mechanics)
3. Missing expected mechanics for this boss
4. Anomalies or suspicious patterns
5. Timing issues

Respond with JSON:
{
  "issues": [
    {
      "type": "warning",
      "category": "merge",
      "message": "Description of issue",
      "affectedActions": ["action_id_1"],
      "suggestedFix": "How to fix",
      "confidence": 0.8
    }
  ],
  "mergeSuggestions": [
    {
      "sourceActions": ["Action Name 1", "Action Name 2"],
      "targetName": "Merged Action Name",
      "reason": "Why these should be merged",
      "confidence": 0.9
    }
  ],
  "splitSuggestions": [],
  "missingMechanics": ["Expected mechanic that seems missing"],
  "anomalies": ["Unusual pattern detected"],
  "summary": "Overall assessment"
}`;
}

async function runGeminiValidation(
  prompt: string,
  timeout: number
): Promise<ParsedAIValidation | null> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(null), timeout);

    try {
      const gemini = spawn('gemini', ['-p', prompt], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';

      gemini.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      gemini.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code !== 0 || !stdout) {
          resolve(null);
          return;
        }
        resolve(parseGeminiValidationResponse(stdout));
      });

      gemini.on('error', () => {
        clearTimeout(timeoutId);
        resolve(null);
      });
    } catch {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

interface ParsedAIValidation {
  issues: ValidationIssue[];
  mergeSuggestions: MergeSuggestion[];
  splitSuggestions: SplitSuggestion[];
  missingMechanics: string[];
  anomalies: string[];
  summary: string;
}

function parseGeminiValidationResponse(response: string): ParsedAIValidation | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.map((i: Record<string, unknown>) => ({
            type: validateIssueType(String(i.type)),
            category: validateCategory(String(i.category)),
            message: String(i.message || ''),
            affectedActions: Array.isArray(i.affectedActions) ? i.affectedActions.map(String) : [],
            suggestedFix: i.suggestedFix ? String(i.suggestedFix) : undefined,
            confidence: Number(i.confidence) || 0.5,
          }))
        : [],
      mergeSuggestions: Array.isArray(parsed.mergeSuggestions)
        ? parsed.mergeSuggestions.map((m: Record<string, unknown>) => ({
            sourceActions: Array.isArray(m.sourceActions) ? m.sourceActions.map(String) : [],
            targetName: String(m.targetName || ''),
            reason: String(m.reason || ''),
            confidence: Number(m.confidence) || 0.5,
          }))
        : [],
      splitSuggestions: Array.isArray(parsed.splitSuggestions)
        ? parsed.splitSuggestions.map((s: Record<string, unknown>) => ({
            sourceAction: String(s.sourceAction || ''),
            splitInto: Array.isArray(s.splitInto) ? s.splitInto.map(String) : [],
            reason: String(s.reason || ''),
            confidence: Number(s.confidence) || 0.5,
          }))
        : [],
      missingMechanics: Array.isArray(parsed.missingMechanics)
        ? parsed.missingMechanics.map(String)
        : [],
      anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies.map(String) : [],
      summary: String(parsed.summary || 'AI validation complete'),
    };
  } catch {
    return null;
  }
}

function validateIssueType(type: string): 'error' | 'warning' | 'suggestion' {
  if (['error', 'warning', 'suggestion'].includes(type)) {
    return type as 'error' | 'warning' | 'suggestion';
  }
  return 'warning';
}

function validateCategory(
  category: string
): 'timing' | 'occurrence' | 'merge' | 'split' | 'missing' | 'duplicate' | 'anomaly' {
  const valid = ['timing', 'occurrence', 'merge', 'split', 'missing', 'duplicate', 'anomaly'];
  if (valid.includes(category)) {
    return category as ValidationIssue['category'];
  }
  return 'anomaly';
}

function mergeValidationIssues(
  ruleBasedIssues: ValidationIssue[],
  aiIssues: ValidationIssue[]
): ValidationIssue[] {
  const merged = [...ruleBasedIssues];
  const existingMessages = new Set(ruleBasedIssues.map(i => i.message.toLowerCase()));

  for (const aiIssue of aiIssues) {
    const isDuplicate = existingMessages.has(aiIssue.message.toLowerCase());
    if (!isDuplicate) {
      merged.push(aiIssue);
    }
  }

  return merged.sort((a, b) => {
    const typeOrder = { error: 0, warning: 1, suggestion: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

function calculateScore(issues: ValidationIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.type) {
      case 'error':
        score -= 20;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'suggestion':
        score -= 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function applyCorrections(
  actions: BossAction[],
  validation: ParsedAIValidation,
  minConfidence: number
): BossAction[] {
  let corrected = [...actions];

  for (const merge of validation.mergeSuggestions) {
    if (merge.confidence < minConfidence) continue;

    const sourceNames = merge.sourceActions.map(s => s.toLowerCase());
    const toMerge = corrected.filter(a => sourceNames.includes(a.name.toLowerCase()));

    if (toMerge.length < 2) continue;

    const sorted = toMerge.sort((a, b) => a.time - b.time);
    const merged: BossAction = {
      ...sorted[0],
      name: merge.targetName || sorted[0].name,
      hitCount: toMerge.length,
      id: `${sorted[0].id}_merged`,
    };

    corrected = corrected.filter(a => !sourceNames.includes(a.name.toLowerCase()));
    corrected.push(merged);
  }

  return corrected.sort((a, b) => a.time - b.time);
}

export function formatValidationReport(result: AIValidationResult): string {
  const lines: string[] = [
    '=== AI Timeline Validation Report ===',
    '',
    `Status: ${result.isValid ? 'VALID' : 'NEEDS ATTENTION'}`,
    `Score: ${result.score}/100`,
    `Summary: ${result.summary}`,
    '',
  ];

  const errors = result.issues.filter(i => i.type === 'error');
  const warnings = result.issues.filter(i => i.type === 'warning');
  const suggestions = result.issues.filter(i => i.type === 'suggestion');

  if (errors.length > 0) {
    lines.push('Errors:');
    for (const e of errors) {
      lines.push(`  [x] ${e.message}`);
      if (e.suggestedFix) lines.push(`      Fix: ${e.suggestedFix}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('Warnings:');
    for (const w of warnings.slice(0, 10)) {
      lines.push(`  [!] ${w.message}`);
    }
    if (warnings.length > 10) lines.push(`  ... and ${warnings.length - 10} more`);
    lines.push('');
  }

  if (result.mergeSuggestions.length > 0) {
    lines.push('Merge Suggestions:');
    for (const m of result.mergeSuggestions.slice(0, 5)) {
      lines.push(`  -> Merge "${m.sourceActions.join('" + "')}" into "${m.targetName}"`);
      lines.push(`     Reason: ${m.reason} (${Math.round(m.confidence * 100)}% confidence)`);
    }
    lines.push('');
  }

  if (result.missingMechanics.length > 0) {
    lines.push('Potentially Missing Mechanics:');
    for (const m of result.missingMechanics) {
      lines.push(`  ? ${m}`);
    }
    lines.push('');
  }

  if (result.anomalies.length > 0) {
    lines.push('Anomalies:');
    for (const a of result.anomalies) {
      lines.push(`  ~ ${a}`);
    }
  }

  return lines.join('\n');
}
