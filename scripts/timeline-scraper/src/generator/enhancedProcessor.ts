import type {
  BossAction,
  EnhancedScrapeOptions,
  MultiHitConfig,
  OccurrenceConfig,
  AlignmentConfig,
} from '../types/index.js';

import {
  consolidateMultiHitActions,
  trackOccurrences,
  groupByOccurrence,
  validateOccurrenceGroups,
  mergeOccurrenceGroups,
  consolidateDuplicates,
  alignTimelines,
  batchAnalyzeAbilities,
  enrichActionsWithWebData,
  analyzeTimelinePatterns,
  validateTimelineWithAI,
  formatPatternAnalysisReport,
  formatAIValidationReport,
} from '../analysis/index.js';

import type {
  TimelinePatternAnalysis,
  AIValidationResult,
} from '../analysis/index.js';

const DEFAULT_MULTI_HIT_CONFIG: MultiHitConfig = {
  windowMs: 2000,
  minHitsForMultiHit: 2,
  knownMultiHitAbilities: [],
};

const DEFAULT_OCCURRENCE_CONFIG: OccurrenceConfig = {
  sameOccurrenceWindowSec: 5,
  newOccurrenceGapSec: 30,
};

const DEFAULT_ALIGNMENT_CONFIG: AlignmentConfig = {
  autoDetectReference: true,
  minReportPresence: 0.8,
};

export interface ProcessingResult {
  actions: BossAction[];
  stats: ProcessingStats;
  warnings: string[];
  patternAnalysis?: TimelinePatternAnalysis;
  validationResult?: AIValidationResult;
}

export interface ProcessingStats {
  inputTimelines: number;
  inputActions: number;
  multiHitConsolidated: number;
  occurrenceGroups: number;
  suspiciousGroups: number;
  finalActions: number;
  alignmentQuality: number;
}

export async function processTimelines(
  timelines: BossAction[][],
  bossName: string,
  options: Partial<EnhancedScrapeOptions> = {}
): Promise<ProcessingResult> {
  const multiHitConfig = { ...DEFAULT_MULTI_HIT_CONFIG, ...options.multiHitConfig };
  const occurrenceConfig = { ...DEFAULT_OCCURRENCE_CONFIG, ...options.occurrenceConfig };
  const alignmentConfig = { ...DEFAULT_ALIGNMENT_CONFIG, ...options.alignmentConfig };
  
  const warnings: string[] = [];
  const stats: ProcessingStats = {
    inputTimelines: timelines.length,
    inputActions: timelines.reduce((sum, t) => sum + t.length, 0),
    multiHitConsolidated: 0,
    occurrenceGroups: 0,
    suspiciousGroups: 0,
    finalActions: 0,
    alignmentQuality: 0,
  };
  
  if (timelines.length === 0) {
    return { actions: [], stats, warnings: ['No timelines provided'] };
  }
  
  let processedTimelines = timelines.map(timeline => [...timeline]);
  
  const preConsolidationCount = processedTimelines.reduce((sum, t) => sum + t.length, 0);
  processedTimelines = processedTimelines.map(timeline =>
    consolidateMultiHitActions(timeline, multiHitConfig)
  );
  const postConsolidationCount = processedTimelines.reduce((sum, t) => sum + t.length, 0);
  stats.multiHitConsolidated = preConsolidationCount - postConsolidationCount;
  
  const alignmentResult = alignTimelines(processedTimelines, alignmentConfig);
  processedTimelines = alignmentResult.alignedTimelines;
  stats.alignmentQuality = calculateAlignmentQuality(alignmentResult);
  
  if (alignmentResult.referenceAction) {
    console.log(`  Aligned on "${alignmentResult.referenceAction}" at t=${alignmentResult.referenceTime}s`);
  }
  
  processedTimelines = processedTimelines.map(timeline =>
    trackOccurrences(timeline, occurrenceConfig)
  );
  
  const allActions = processedTimelines.flat();
  let occurrenceGroups = groupByOccurrence(allActions, occurrenceConfig);
  stats.occurrenceGroups = occurrenceGroups.length;
  
  const { valid, suspicious } = validateOccurrenceGroups(
    occurrenceGroups,
    timelines.length,
    options.minConfidence || 0.3
  );
  
  stats.suspiciousGroups = suspicious.length;
  
  for (const group of suspicious) {
    warnings.push(
      `Low confidence (${group.confidence}) for "${group.name}" occurrence ${group.occurrence}`
    );
  }
  
  occurrenceGroups = consolidateDuplicates(valid);
  
  let finalActions = mergeOccurrenceGroups(occurrenceGroups, timelines.length);
  
  if (options.useAiAnalysis) {
    console.log('  Running AI analysis on abilities...');
    const analysisResults = await batchAnalyzeAbilities(finalActions, bossName, {
      enabled: true,
      timeout: 15000,
    });
    
    finalActions = finalActions.map(action => {
      const analysis = analysisResults.get(action.name.toLowerCase());
      if (analysis) {
        return {
          ...action,
          description: analysis.description,
          importance: analysis.importance,
          isTankBuster: analysis.isTankBuster || action.isTankBuster,
          isDualTankBuster: analysis.isDualTankBuster || action.isDualTankBuster,
          analysisSource: 'ai' as const,
        };
      }
      return action;
    });
  }
  
  if (options.useWebSearch) {
    console.log('  Enriching with web data...');
    finalActions = await enrichActionsWithWebData(finalActions, bossName, {
      enabled: true,
      timeout: 5000,
    });
  }
  
  let patternAnalysis: TimelinePatternAnalysis | undefined;
  let validationResult: AIValidationResult | undefined;
  
  if (options.usePatternAnalysis) {
    console.log('  Running timeline pattern analysis...');
    const analysis = await analyzeTimelinePatterns(finalActions, bossName, {
      enabled: true,
      timeout: 60000,
      minOccurrencesForPattern: 2,
      maxActionsToAnalyze: 100,
    });
    
    if (analysis) {
      patternAnalysis = analysis;
      console.log(`    ${analysis.summary}`);
      
      if (analysis.repeatPatterns.filter(p => p.isRegular).length > 0) {
        console.log(`    Found ${analysis.repeatPatterns.filter(p => p.isRegular).length} regular patterns`);
      }
      if (analysis.phasePatterns.length > 1) {
        console.log(`    Detected ${analysis.phasePatterns.length} phases`);
      }
    }
  }
  
  if (options.useAiValidation) {
    console.log('  Running AI validation...');
    const validation = await validateTimelineWithAI(
      finalActions,
      bossName,
      patternAnalysis || null,
      {
        enabled: true,
        timeout: 45000,
        autoCorrect: options.autoCorrectTimeline || false,
        minConfidenceForCorrection: 0.8,
      }
    );
    
    validationResult = validation;
    console.log(`    Validation score: ${validation.score}/100`);
    
    if (validation.issues.filter(i => i.type === 'error').length > 0) {
      console.log(`    Errors: ${validation.issues.filter(i => i.type === 'error').length}`);
    }
    if (validation.mergeSuggestions.length > 0) {
      console.log(`    Merge suggestions: ${validation.mergeSuggestions.length}`);
    }
    
    if (validation.correctedActions) {
      console.log('    Auto-corrections applied');
      finalActions = validation.correctedActions;
    }
  }
  
  stats.finalActions = finalActions.length;
  
  return {
    actions: finalActions.sort((a, b) => a.time - b.time),
    stats,
    warnings,
    patternAnalysis,
    validationResult,
  };
}

function calculateAlignmentQuality(result: { offsets: number[] }): number {
  if (result.offsets.length < 2) return 1;
  
  const nonZeroOffsets = result.offsets.filter(o => o !== 0);
  if (nonZeroOffsets.length === 0) return 1;
  
  const maxOffset = Math.max(...nonZeroOffsets.map(Math.abs));
  const quality = Math.max(0, 1 - (maxOffset / 10));
  return Math.round(quality * 100) / 100;
}

export function createProcessingPipeline(
  options: Partial<EnhancedScrapeOptions>
): (timelines: BossAction[][], bossName: string) => Promise<ProcessingResult> {
  return (timelines, bossName) => processTimelines(timelines, bossName, options);
}

export function generateTimelineReport(result: ProcessingResult): string {
  const lines: string[] = [
    '=== Timeline Processing Report ===',
    '',
    'Statistics:',
    `  Input timelines: ${result.stats.inputTimelines}`,
    `  Input actions: ${result.stats.inputActions}`,
    `  Multi-hit consolidated: ${result.stats.multiHitConsolidated}`,
    `  Occurrence groups: ${result.stats.occurrenceGroups}`,
    `  Suspicious groups: ${result.stats.suspiciousGroups}`,
    `  Final actions: ${result.stats.finalActions}`,
    `  Alignment quality: ${(result.stats.alignmentQuality * 100).toFixed(0)}%`,
  ];
  
  if (result.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const warning of result.warnings.slice(0, 10)) {
      lines.push(`  - ${warning}`);
    }
    if (result.warnings.length > 10) {
      lines.push(`  ... and ${result.warnings.length - 10} more`);
    }
  }
  
  if (result.patternAnalysis) {
    lines.push('', formatPatternAnalysisReport(result.patternAnalysis));
  }
  
  if (result.validationResult) {
    lines.push('', formatAIValidationReport(result.validationResult));
  }
  
  lines.push('', 'Actions by time:');
  for (const action of result.actions.slice(0, 20)) {
    const conf = action.confidence !== undefined ? ` (${Math.round(action.confidence * 100)}%)` : '';
    const hits = action.hitCount && action.hitCount > 1 ? ` [${action.hitCount} hits]` : '';
    lines.push(`  ${action.time}s: ${action.name}${hits}${conf}`);
  }
  
  if (result.actions.length > 20) {
    lines.push(`  ... and ${result.actions.length - 20} more actions`);
  }
  
  return lines.join('\n');
}
