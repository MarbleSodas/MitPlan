export {
  detectMultiHitClusters,
  consolidateMultiHitActions,
  isKnownMultiHitAbility,
} from './multiHitDetector.js';

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
