/**
 * Timeline script aggregates. See architecture §9 and §10.2.
 * The v1.0 surface ships the data model and the linear renderer;
 * the dual-pane graph editor is v2.1.
 */
import type { EncounterId } from '../ids/index.js';
import type { AbilityMode } from '@xivmitplan/validation/ability';
import type {
  TimelineEvent as ValidationTimelineEvent,
  Branch as ValidationBranch,
  JoinPoint as ValidationJoinPoint,
  MergeConflict as ValidationMergeConflict,
  MergeResult as ValidationMergeResult,
  BranchCondition,
  TimelineSource,
  MergedFromSources,
  Confidence,
} from '@xivmitplan/validation/timeline';

// Re-export the Zod-derived types as the canonical domain types.
// The validation package is the single source of truth; the domain
// re-exports them so consumers (parser, merger, repository) do not need
// to import both packages.
export type TimelineEvent = ValidationTimelineEvent;
export type Branch = ValidationBranch;
export type JoinPoint = ValidationJoinPoint;
export type MergeConflict = ValidationMergeConflict;
export type MergeResult = ValidationMergeResult;
export type { BranchCondition, TimelineSource, MergedFromSources };
export type Confidence = number; // 0-1 (already constrained in the Zod schema)

/** A canonical timeline (§12.4). The persisted representation. */
export interface Timeline {
  readonly id: string;
  readonly encounterId: EncounterId;
  readonly version: string;
  readonly contentHash: string;
  readonly source: TimelineSource;
  readonly events: ReadonlyArray<TimelineEvent>;
  readonly branches: ReadonlyArray<Branch>;
  readonly joins: ReadonlyArray<JoinPoint>;
  readonly mergedFromSources: MergedFromSources;
  readonly perEventConfidence: Readonly<Record<string, Confidence>>;
  readonly mode: AbilityMode;
  readonly createdAt: string;
  readonly updatedAt: string;
}