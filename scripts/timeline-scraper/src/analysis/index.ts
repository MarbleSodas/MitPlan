export {
  detectMultiHitClusters,
  consolidateMultiHitActions,
  isKnownMultiHitAbility,
} from './multiHitDetector.js';

export {
  analyzeAbilityWithAI,
  batchAnalyzeAbilities,
  clearAnalysisCache,
} from './aiAnalyzer.js';

export {
  searchAbilityInfo,
  enrichActionsWithWebData,
  clearSearchCache,
  buildBossGuideUrl,
  buildFFLogsUrl,
} from './webSearch.js';

export {
  trackOccurrences,
  groupByOccurrence,
  validateOccurrenceGroups,
  mergeOccurrenceGroups,
  detectDuplicateOccurrences,
  consolidateDuplicates,
} from './occurrenceTracker.js';

export type { OccurrenceGroup } from './occurrenceTracker.js';

export {
  alignTimelines,
  normalizeToZero,
  detectTimelinePhases,
  calculateAlignmentQuality,
} from './timelineAligner.js';

export type { AlignmentResult } from './timelineAligner.js';

export {
  validateTimeline,
  formatValidationReport,
} from './validator.js';

export type { ValidationResult, ValidationIssue } from './validator.js';

export {
  analyzeTimelinePatterns,
  formatPatternAnalysisReport,
} from './timelinePatternAnalyzer.js';

export type {
  TimelinePatternAnalysis,
  RepeatPattern,
  MechanicSequence,
  PhasePattern,
  RotationCycle,
  PatternAnalyzerConfig,
} from './timelinePatternAnalyzer.js';

export {
  validateTimelineWithAI,
  formatValidationReport as formatAIValidationReport,
} from './aiValidator.js';

export type {
  AIValidationResult,
  AIValidatorConfig,
  MergeSuggestion,
  SplitSuggestion,
  ValidationIssue as AIValidationIssue,
} from './aiValidator.js';
