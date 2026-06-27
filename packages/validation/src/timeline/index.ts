import { z } from 'zod';
import { AbilityMode } from '../ability/index.js';

/** Source provenance (§12.3). */
export const TimelineSource = z.enum(['CACTBOT', 'TRIGGERNOMETRY', 'FFLOGS', 'MERGED']);
export type TimelineSource = z.infer<typeof TimelineSource>;

/** Which sources the canonical event was merged from. */
export const MergedFromSources = z.object({
  cactbot: z.boolean(),
  triggernometry: z.boolean(),
  fflogs: z.boolean(),
});
export type MergedFromSources = z.infer<typeof MergedFromSources>;

/** Per-event confidence after the merge (0-1). */
export const Confidence = z.number().min(0).max(1);

/** A canonical `TimelineEvent` (§12.3, Appendix B.4). */
export const TimelineEvent = z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  /** Milliseconds from t=0 (encounter start). */
  timestampMs: z.number().int().nonnegative(),
  type: z.enum(['MECHANIC', 'BUSTER', 'RAIDWIDE', 'MECHANIC_START', 'MECHANIC_END']),
  name: z.string().min(1),
  normalizedNames: z.array(z.string()),
  durationMs: z.number().int().positive().nullable(),
  /** Per-hit timestamps within the mechanic (for multi-hit AoE). */
  hitTimesMs: z.array(z.number().int().nonnegative()),
  targets: z.object({
    kind: z.enum(['MAIN_TANK', 'OFF_TANK', 'PARTY', 'HEALER', 'TARGETED', 'ALL']),
    jobIds: z.array(z.string().uuid()).optional(),
  }),
  mechanicId: z.string().nullable(),
  patchVersion: z.string(),
  confidence: Confidence,
  /** Spread across pulls (FFLogs only). */
  varianceMs: z.number().int().nonnegative().optional(),
  mergedFromSources: MergedFromSources,
  notes: z.string().nullable().optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

/** Branch condition types (§13). */
export const BranchCondition = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ALWAYS') }),
  z.object({
    type: z.literal('RNG'),
    distribution: z.array(
      z.object({
        outcomeId: z.string().uuid(),
        weight: z.number().min(0).max(1),
      }),
    ),
  }),
  z.object({
    type: z.literal('PARTY_ACTION'),
    preconditions: z.string(), // CompiledExpression (placeholder until v2.1)
  }),
  z.object({
    type: z.literal('ROLE_COMP'),
    required: z.array(z.string().uuid()),
  }),
  z.object({
    type: z.literal('HP_GATE'),
    thresholdPct: z.number().min(0).max(100),
  }),
]);
export type BranchCondition = z.infer<typeof BranchCondition>;

/** Branch outcomes. */
export const BranchOutcome = z.object({
  id: z.string().uuid(),
  label: z.string(),
  events: z.array(TimelineEvent),
});
export type BranchOutcome = z.infer<typeof BranchOutcome>;

/** A branch point in the timeline. */
export const Branch = z.object({
  id: z.string().uuid(),
  parentEventId: z.string().uuid(),
  label: z.string(),
  condition: BranchCondition,
  outcomes: z.array(BranchOutcome),
});
export type Branch = z.infer<typeof Branch>;

/** Where branched paths reconverge. */
export const JoinPoint = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  atEventId: z.string().uuid(),
});
export type JoinPoint = z.infer<typeof JoinPoint>;

/** A complete timeline graph (§13). */
export const TimelineGraph = z.object({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  version: z.string(),
  contentHash: z.string(),
  source: TimelineSource,
  events: z.array(TimelineEvent),
  branches: z.array(Branch),
  joins: z.array(JoinPoint),
  mergedFromSources: MergedFromSources,
  perEventConfidence: z.record(z.string(), Confidence).optional(),
  mode: AbilityMode,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TimelineGraph = z.infer<typeof TimelineGraph>;

/** Merge conflict record. */
export const MergeConflict = z.object({
  eventId: z.string().uuid(),
  kind: z.enum(['TIMESTAMP_DRIFT', 'MISSING_FROM_ONE', 'NAME_MISMATCH', 'VARIANCE_HIGH']),
  sources: z.array(TimelineSource),
  detail: z.string(),
  detectedAt: z.string().datetime(),
});
export type MergeConflict = z.infer<typeof MergeConflict>;

/** Merger result. */
export const MergeResult = z.object({
  timeline: TimelineGraph,
  conflicts: z.array(MergeConflict),
});
export type MergeResult = z.infer<typeof MergeResult>;
