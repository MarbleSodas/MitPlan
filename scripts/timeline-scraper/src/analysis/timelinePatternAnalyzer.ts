/**
 * Timeline Pattern Analyzer
 *
 * Uses Gemini AI to analyze the entire standardized timeline to:
 * - Identify repeating sequences/rotations
 * - Detect phase loops
 * - Correlate mechanics that appear together
 * - Estimate boss rotation cadence
 */

import { spawn } from 'child_process';
import type { BossAction } from '../types/index.js';

export interface RepeatPattern {
  abilityName: string;
  occurrences: number[];
  intervalMs: number;
  intervalVariance: number;
  confidence: number;
  isRegular: boolean;
}

export interface MechanicSequence {
  abilities: string[];
  startTimes: number[];
  description: string;
  confidence: number;
}

export interface PhasePattern {
  phaseNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  signature: string[];
  repeatsPhase?: number;
}

export interface RotationCycle {
  cycleNumber: number;
  startTime: number;
  endTime: number;
  abilities: string[];
  isComplete: boolean;
}

export interface TimelinePatternAnalysis {
  repeatPatterns: RepeatPattern[];
  mechanicSequences: MechanicSequence[];
  phasePatterns: PhasePattern[];
  rotationCycles: RotationCycle[];
  bossRotationCadence: number | null;
  summary: string;
  rawAnalysis?: string;
}

export interface PatternAnalyzerConfig {
  enabled: boolean;
  timeout: number;
  minOccurrencesForPattern: number;
  maxActionsToAnalyze: number;
}

const DEFAULT_CONFIG: PatternAnalyzerConfig = {
  enabled: true,
  timeout: 60000,
  minOccurrencesForPattern: 2,
  maxActionsToAnalyze: 100,
};

/**
 * Analyze timeline patterns using Gemini AI
 */
export async function analyzeTimelinePatterns(
  actions: BossAction[],
  bossName: string,
  config: Partial<PatternAnalyzerConfig> = {}
): Promise<TimelinePatternAnalysis | null> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.enabled || actions.length === 0) {
    return null;
  }

  // Pre-compute statistical patterns before AI analysis
  const statisticalPatterns = computeStatisticalPatterns(actions, cfg);

  // Build context for AI analysis
  const timelineContext = buildTimelineContext(actions, bossName, cfg.maxActionsToAnalyze);
  const prompt = buildPatternAnalysisPrompt(timelineContext, statisticalPatterns);

  try {
    const aiAnalysis = await runGeminiPatternAnalysis(prompt, cfg.timeout);

    if (aiAnalysis) {
      // Merge statistical patterns with AI insights
      return mergeAnalysisResults(statisticalPatterns, aiAnalysis);
    }

    // Fallback to statistical-only analysis
    return statisticalPatterns;
  } catch (error) {
    console.warn(`Pattern analysis failed: ${(error as Error).message}`);
    return statisticalPatterns;
  }
}

/**
 * Compute statistical patterns from the timeline without AI
 */
function computeStatisticalPatterns(
  actions: BossAction[],
  config: PatternAnalyzerConfig
): TimelinePatternAnalysis {
  const repeatPatterns = detectRepeatPatterns(actions, config.minOccurrencesForPattern);
  const phasePatterns = detectPhasePatterns(actions);
  const rotationCycles = detectRotationCycles(actions, repeatPatterns);

  return {
    repeatPatterns,
    mechanicSequences: [],
    phasePatterns,
    rotationCycles,
    bossRotationCadence: estimateRotationCadence(repeatPatterns),
    summary: generateStatisticalSummary(repeatPatterns, phasePatterns, rotationCycles),
  };
}

/**
 * Detect abilities that repeat at regular intervals
 */
function detectRepeatPatterns(
  actions: BossAction[],
  minOccurrences: number
): RepeatPattern[] {
  const byName = new Map<string, BossAction[]>();

  for (const action of actions) {
    const key = action.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, []);
    }
    byName.get(key)!.push(action);
  }

  const patterns: RepeatPattern[] = [];

  for (const [name, occurrences] of byName) {
    if (occurrences.length < minOccurrences) continue;

    const times = occurrences.map(a => a.time).sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }

    if (intervals.length === 0) continue;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = avgInterval > 0 ? stdDev / avgInterval : 1;

    // Consider "regular" if coefficient of variation is < 20%
    const isRegular = coeffOfVariation < 0.2;
    const confidence = Math.max(0, Math.min(1, 1 - coeffOfVariation));

    patterns.push({
      abilityName: occurrences[0].name,
      occurrences: times,
      intervalMs: Math.round(avgInterval * 1000),
      intervalVariance: Math.round(stdDev * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      isRegular,
    });
  }

  // Sort by regularity and occurrence count
  return patterns.sort((a, b) => {
    if (a.isRegular !== b.isRegular) return a.isRegular ? -1 : 1;
    return b.occurrences.length - a.occurrences.length;
  });
}

/**
 * Detect phase transitions based on gaps and ability patterns
 */
function detectPhasePatterns(actions: BossAction[]): PhasePattern[] {
  if (actions.length === 0) return [];

  const phases: PhasePattern[] = [];
  const PHASE_GAP_THRESHOLD = 15; // seconds

  let phaseStart = actions[0].time;
  let phaseActions: BossAction[] = [];
  let phaseNumber = 1;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const prevAction = actions[i - 1];

    if (prevAction && action.time - prevAction.time > PHASE_GAP_THRESHOLD) {
      // Phase boundary detected
      phases.push({
        phaseNumber,
        startTime: phaseStart,
        endTime: prevAction.time,
        duration: prevAction.time - phaseStart,
        signature: extractPhaseSignature(phaseActions),
      });

      phaseNumber++;
      phaseStart = action.time;
      phaseActions = [];
    }

    phaseActions.push(action);
  }

  // Add final phase
  if (phaseActions.length > 0) {
    const lastAction = phaseActions[phaseActions.length - 1];
    phases.push({
      phaseNumber,
      startTime: phaseStart,
      endTime: lastAction.time,
      duration: lastAction.time - phaseStart,
      signature: extractPhaseSignature(phaseActions),
    });
  }

  // Detect repeated phases
  for (let i = 1; i < phases.length; i++) {
    for (let j = 0; j < i; j++) {
      if (signaturesMatch(phases[i].signature, phases[j].signature)) {
        phases[i].repeatsPhase = phases[j].phaseNumber;
        break;
      }
    }
  }

  return phases;
}

/**
 * Extract a signature (first N unique abilities) for a phase
 */
function extractPhaseSignature(actions: BossAction[]): string[] {
  const seen = new Set<string>();
  const signature: string[] = [];

  for (const action of actions) {
    const name = action.name.toLowerCase();
    if (!seen.has(name)) {
      seen.add(name);
      signature.push(action.name);
      if (signature.length >= 5) break;
    }
  }

  return signature;
}

/**
 * Check if two phase signatures match
 */
function signaturesMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return a.every((name, i) => normalize(name) === normalize(b[i]));
}

/**
 * Detect rotation cycles based on repeat patterns
 */
function detectRotationCycles(
  actions: BossAction[],
  repeatPatterns: RepeatPattern[]
): RotationCycle[] {
  if (actions.length === 0 || repeatPatterns.length === 0) return [];

  // Find the most regular, frequently occurring ability as rotation anchor
  const anchor = repeatPatterns.find(p => p.isRegular && p.occurrences.length >= 3);
  if (!anchor) return [];

  const cycles: RotationCycle[] = [];

  for (let i = 0; i < anchor.occurrences.length; i++) {
    const cycleStart = anchor.occurrences[i];
    const cycleEnd = anchor.occurrences[i + 1] ?? actions[actions.length - 1].time + 1;

    const cycleActions = actions.filter(a => a.time >= cycleStart && a.time < cycleEnd);
    const abilities = [...new Set(cycleActions.map(a => a.name))];

    cycles.push({
      cycleNumber: i + 1,
      startTime: cycleStart,
      endTime: cycleEnd,
      abilities,
      isComplete: i < anchor.occurrences.length - 1,
    });
  }

  return cycles;
}

/**
 * Estimate the overall boss rotation cadence
 */
function estimateRotationCadence(patterns: RepeatPattern[]): number | null {
  const regularPatterns = patterns.filter(p => p.isRegular && p.confidence > 0.7);
  if (regularPatterns.length === 0) return null;

  // Find GCD of intervals
  const intervals = regularPatterns.map(p => p.intervalMs / 1000);
  if (intervals.length === 0) return null;

  // Simple approach: find the smallest common interval
  const sorted = intervals.sort((a, b) => a - b);
  return sorted[0];
}

/**
 * Generate a summary of statistical patterns
 */
function generateStatisticalSummary(
  repeatPatterns: RepeatPattern[],
  phasePatterns: PhasePattern[],
  rotationCycles: RotationCycle[]
): string {
  const lines: string[] = [];

  const regularCount = repeatPatterns.filter(p => p.isRegular).length;
  if (regularCount > 0) {
    lines.push(`${regularCount} abilities repeat at regular intervals`);
  }

  if (phasePatterns.length > 1) {
    lines.push(`${phasePatterns.length} distinct phases detected`);
    const repeatedPhases = phasePatterns.filter(p => p.repeatsPhase);
    if (repeatedPhases.length > 0) {
      lines.push(`${repeatedPhases.length} phases repeat earlier patterns`);
    }
  }

  if (rotationCycles.length > 1) {
    lines.push(`${rotationCycles.length} rotation cycles identified`);
  }

  return lines.join('. ') || 'No significant patterns detected';
}

/**
 * Build context string for AI analysis
 */
function buildTimelineContext(
  actions: BossAction[],
  bossName: string,
  maxActions: number
): string {
  const trimmedActions = actions.slice(0, maxActions);

  const actionLines = trimmedActions.map(a => {
    const parts = [`${a.time}s: ${a.name}`];
    if (a.occurrence && a.occurrence > 1) parts.push(`(#${a.occurrence})`);
    if (a.hitCount && a.hitCount > 1) parts.push(`[${a.hitCount} hits]`);
    if (a.isTankBuster) parts.push('[TB]');
    if (a.damageType) parts.push(`[${a.damageType}]`);
    return parts.join(' ');
  });

  return `Boss: ${bossName}
Total actions: ${actions.length}
Timeline:
${actionLines.join('\n')}`;
}

/**
 * Build the prompt for pattern analysis
 */
function buildPatternAnalysisPrompt(
  timelineContext: string,
  statisticalPatterns: TimelinePatternAnalysis
): string {
  const regularAbilities = statisticalPatterns.repeatPatterns
    .filter(p => p.isRegular)
    .map(p => `- ${p.abilityName}: every ~${Math.round(p.intervalMs / 1000)}s (${p.occurrences.length} times)`)
    .slice(0, 10);

  return `Analyze this FFXIV raid timeline for patterns and respond with ONLY a JSON object.

${timelineContext}

Pre-detected regular patterns:
${regularAbilities.length > 0 ? regularAbilities.join('\n') : 'None detected'}

Phases detected: ${statisticalPatterns.phasePatterns.length}

Analyze the timeline and identify:
1. Mechanic sequences (abilities that always appear together or in order)
2. Boss rotation patterns (repeated cycles of abilities)
3. Phase-specific mechanics
4. Any anomalies or missing expected mechanics

Respond with JSON:
{
  "mechanicSequences": [
    {
      "abilities": ["Ability1", "Ability2"],
      "description": "These always happen together as a combo",
      "confidence": 0.9
    }
  ],
  "rotationInsights": "Description of the boss rotation pattern",
  "phaseInsights": [
    "Phase 1: Opening burst with X, Y, Z",
    "Phase 2: Repeats phase 1 pattern"
  ],
  "anomalies": [
    "Ability X appears inconsistently - may be conditional"
  ],
  "suggestedMerges": [
    {
      "abilities": ["Hit1", "Hit2"],
      "reason": "Likely the same multi-hit ability"
    }
  ],
  "summary": "Brief overall analysis"
}`;
}

/**
 * Run Gemini pattern analysis
 */
async function runGeminiPatternAnalysis(
  prompt: string,
  timeout: number
): Promise<AIPatternAnalysis | null> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, timeout);

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

        const parsed = parseGeminiPatternResponse(stdout);
        resolve(parsed);
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

interface AIPatternAnalysis {
  mechanicSequences: Array<{
    abilities: string[];
    description: string;
    confidence: number;
  }>;
  rotationInsights: string;
  phaseInsights: string[];
  anomalies: string[];
  suggestedMerges: Array<{
    abilities: string[];
    reason: string;
  }>;
  summary: string;
}

/**
 * Parse Gemini's pattern analysis response
 */
function parseGeminiPatternResponse(response: string): AIPatternAnalysis | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      mechanicSequences: Array.isArray(parsed.mechanicSequences)
        ? parsed.mechanicSequences.map((s: Record<string, unknown>) => ({
            abilities: Array.isArray(s.abilities) ? s.abilities : [],
            description: String(s.description || ''),
            confidence: Number(s.confidence) || 0.5,
          }))
        : [],
      rotationInsights: String(parsed.rotationInsights || ''),
      phaseInsights: Array.isArray(parsed.phaseInsights) ? parsed.phaseInsights.map(String) : [],
      anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies.map(String) : [],
      suggestedMerges: Array.isArray(parsed.suggestedMerges)
        ? parsed.suggestedMerges.map((m: Record<string, unknown>) => ({
            abilities: Array.isArray(m.abilities) ? m.abilities : [],
            reason: String(m.reason || ''),
          }))
        : [],
      summary: String(parsed.summary || ''),
    };
  } catch {
    return null;
  }
}

/**
 * Merge statistical patterns with AI analysis
 */
function mergeAnalysisResults(
  statistical: TimelinePatternAnalysis,
  ai: AIPatternAnalysis
): TimelinePatternAnalysis {
  const mechanicSequences: MechanicSequence[] = ai.mechanicSequences.map(s => ({
    abilities: s.abilities,
    startTimes: [],
    description: s.description,
    confidence: s.confidence,
  }));

  // Combine summaries
  const summaryParts = [statistical.summary];
  if (ai.summary) summaryParts.push(ai.summary);
  if (ai.rotationInsights) summaryParts.push(`Rotation: ${ai.rotationInsights}`);

  return {
    ...statistical,
    mechanicSequences,
    summary: summaryParts.join('. '),
    rawAnalysis: JSON.stringify(ai, null, 2),
  };
}

/**
 * Format pattern analysis as a human-readable report
 */
export function formatPatternAnalysisReport(analysis: TimelinePatternAnalysis): string {
  const lines: string[] = [
    '=== Timeline Pattern Analysis ===',
    '',
    `Summary: ${analysis.summary}`,
    '',
  ];

  if (analysis.bossRotationCadence) {
    lines.push(`Boss Rotation Cadence: ~${analysis.bossRotationCadence}s`);
    lines.push('');
  }

  if (analysis.repeatPatterns.length > 0) {
    lines.push('Regular Repeat Patterns:');
    for (const pattern of analysis.repeatPatterns.filter(p => p.isRegular).slice(0, 10)) {
      lines.push(`  ${pattern.abilityName}: every ${Math.round(pattern.intervalMs / 1000)}s (${pattern.occurrences.length}x, ${Math.round(pattern.confidence * 100)}% confidence)`);
    }
    lines.push('');
  }

  if (analysis.phasePatterns.length > 1) {
    lines.push('Phase Structure:');
    for (const phase of analysis.phasePatterns) {
      const repeat = phase.repeatsPhase ? ` (repeats P${phase.repeatsPhase})` : '';
      lines.push(`  Phase ${phase.phaseNumber}: ${phase.startTime}s - ${phase.endTime}s (${phase.duration}s)${repeat}`);
      lines.push(`    Signature: ${phase.signature.slice(0, 3).join(' -> ')}`);
    }
    lines.push('');
  }

  if (analysis.mechanicSequences.length > 0) {
    lines.push('Mechanic Sequences:');
    for (const seq of analysis.mechanicSequences.slice(0, 5)) {
      lines.push(`  ${seq.abilities.join(' -> ')}`);
      lines.push(`    ${seq.description}`);
    }
    lines.push('');
  }

  if (analysis.rotationCycles.length > 1) {
    lines.push(`Rotation Cycles: ${analysis.rotationCycles.length} identified`);
    for (const cycle of analysis.rotationCycles.slice(0, 3)) {
      lines.push(`  Cycle ${cycle.cycleNumber}: ${cycle.startTime}s - ${cycle.endTime}s (${cycle.abilities.length} abilities)`);
    }
  }

  return lines.join('\n');
}
