import { z } from 'zod';
import { AbilityMode } from '../ability/index.js';

/** Assignment target type. COVER is the PLD cover edge case (§23.2). */
export const AssignmentTargetType = z.enum([
  'MAIN_TANK',
  'OFF_TANK',
  'PLAYER',
  'PARTY',
  'COVER',
]);
export type AssignmentTargetType = z.infer<typeof AssignmentTargetType>;

/** Tank position enum for assignment targeting. */
export const TankPosition = z.enum(['MAIN', 'OFF', 'NEITHER']);
export type TankPosition = z.infer<typeof TankPosition>;

/**
 * A single mit assignment (one ability applied to one target at one event).
 * Extended with caster/tank/precast fields for main-branch parity.
 * All new fields are optional for backward compatibility with existing snapshots.
 */
export const Assignment = z.object({
  id: z.string().uuid(),
  abilityId: z.string().uuid(),
  targetUserId: z.string().uuid().nullable(),
  targetType: AssignmentTargetType,
  eventId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Optimistic lock token. The realtime layer increments on every edit. */
  revision: z.number().int().nonnegative(),
  /**
   * Optional provenance for assignments imported from MitPlan v1 (§17.7).
   * Present only on legacy plans; lets the editor display the original
   * v1 ability/event names even when no catalog entity matched.
   */
  legacyMitigationId: z.string().nullable().optional(),
  legacyMitigationName: z.string().nullable().optional(),
  legacyBossActionId: z.string().nullable().optional(),
  // ── Main-branch parity fields ──
  /** Job id of the caster who applies this mitigation. */
  casterJobId: z.string().uuid().nullable().optional(),
  /** User id of the caster (when assigned to a specific person). */
  casterUserId: z.string().uuid().nullable().optional(),
  casterDisplayName: z.string().nullable().optional(),
  casterColor: z.string().nullable().optional(),
  /** Tank position this assignment targets. */
  tankPosition: TankPosition.nullable().optional(),
  /** Seconds before the event to start the ability window. */
  precastSeconds: z.number().int().nonnegative().nullable().optional(),
  /** Instance id for multi-instance abilities (charges). */
  instanceId: z.number().int().nonnegative().nullable().optional(),
});
export type Assignment = z.infer<typeof Assignment>;

/** A job claim — which job a user has selected for the plan session. */
export const JobClaim = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  color: z.string().nullable(),
});
export type JobClaim = z.infer<typeof JobClaim>;

/** Plan party state: selected jobs, tank positions, and active claims. */
export const PlanPartyState = z.object({
  /** Map of userId → jobId for each member's selected job. */
  selectedJobs: z.record(z.string(), z.string()).default({}),
  /** Map of userId → tank position. */
  tankPositions: z.record(z.string(), TankPosition).default({}),
  /** Active job claims (who's playing what). */
  claims: z.array(JobClaim).default([]),
});
export type PlanPartyState = z.infer<typeof PlanPartyState>;

/** Timeline settings for a plan — health config, description, tags. */
export const TimelineSettings = z.object({
  tankHp: z.number().int().nonnegative().nullable().optional(),
  tankDefense: z.enum(['MIN_ILVL', 'BIS', 'CUSTOM']).nullable().optional(),
  healerHp: z.number().int().nonnegative().nullable().optional(),
  partyHp: z.number().int().nonnegative().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  level: z.enum(['MINIMUM', 'SAFE', 'AGGRESSIVE']).nullable().optional(),
});
export type TimelineSettings = z.infer<typeof TimelineSettings>;

/** Plan-local timeline action — a custom or template-derived event edit. */
export const PlanTimelineAction = z.object({
  id: z.string().uuid(),
  /** Position in the plan-local timeline order. */
  position: z.number().int().nonnegative(),
  /** Milliseconds from t=0 (encounter start). */
  timestampMs: z.number().int().nonnegative(),
  type: z.enum(['MECHANIC', 'BUSTER', 'RAIDWIDE', 'MECHANIC_START', 'MECHANIC_END', 'CUSTOM']),
  name: z.string().min(1).max(256),
  durationMs: z.number().int().positive().nullable(),
  hitTimesMs: z.array(z.number().int().nonnegative()),
  /** Target kind for this action. */
  targetKind: z.enum(['MAIN_TANK', 'OFF_TANK', 'PARTY', 'HEALER', 'TARGETED', 'ALL']),
  /** Source event id when this action was originally derived from a canonical event. */
  sourceEventId: z.string().nullable(),
  /** True when this action is user-created (not from the canonical timeline). */
  isCustom: z.boolean(),
  notes: z.string().nullable(),
  /** Ability id when this action represents a specific ability (e.g. a mit check). */
  linkedAbilityId: z.string().uuid().nullable(),
  /** Classification for damage type filtering. */
  damageType: z.enum(['physical', 'magical', 'both']).nullable(),
  /** Hit count for multi-hit mechanics. */
  hitCount: z.number().int().nonnegative().nullable(),
  /** True when this is a DoT event. */
  isDot: z.boolean(),
  /** Tank target indicator. */
  targetsTank: z.enum(['MAIN', 'OFF', 'BOTH', 'RANDOM', 'NONE']),
});
export type PlanTimelineAction = z.infer<typeof PlanTimelineAction>;

/** Tank position state over a time interval. */
export const TankState = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  /** Inclusive start, exclusive end. */
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  role: z.enum(['MAIN_TANK', 'OFF_TANK']),
  notes: z.string().nullable(),
  revision: z.number().int().nonnegative(),
});
export type TankState = z.infer<typeof TankState>;

/** Plan meta (the plan-of-the-plan; the "what is this plan?" row). */
export const PlanMeta = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1).max(128),
  encounterId: z.string().uuid(),
  partyId: z.string().uuid(),
  mode: AbilityMode,
  /** True if this plan was imported from MitPlan v1 (§17.7). */
  isLegacy: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // ── Canonical timeline provenance ──
  /** The source timeline id this plan is pinned to. */
  sourceTimelineId: z.string().uuid().nullable().optional(),
  /** The source timeline version string. */
  sourceTimelineVersion: z.string().nullable().optional(),
  /** The source timeline content hash for drift detection. */
  sourceTimelineHash: z.string().nullable().optional(),
});
export type PlanMeta = z.infer<typeof PlanMeta>;

/** Plan access grant (collaborator on a plan). */
export const PlanAccess = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
  viaShareToken: z.boolean(),
  grantedAt: z.string().datetime(),
});
export type PlanAccess = z.infer<typeof PlanAccess>;

/** Snapshot of the Yjs plan doc at a point in time. */
export const PlanSnapshot = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  /** Base64-encoded Yjs state. */
  ydocB64: z.string(),
  byteSize: z.number().int().nonnegative(),
  reason: z.enum(['IDLE', 'USER_SAVE', 'ASSIGNMENT_DELETE', 'REBUILD']),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type PlanSnapshot = z.infer<typeof PlanSnapshot>;

/** Top-level Plan structure for the API. The Yjs live doc has more fields. */
export const Plan = z.object({
  meta: PlanMeta,
  assignments: z.array(Assignment),
  tankStates: z.array(TankState),
  /** Branch outcome locks (§13, v2.1; data model in v1). */
  locks: z.record(z.string(), z.string()),
  // ── Extended CRDT fields ──
  timelineActions: z.array(PlanTimelineAction).optional(),
  party: PlanPartyState.optional(),
  timelineSettings: TimelineSettings.optional(),
});
export type Plan = z.infer<typeof Plan>;

/** JSON import/export shape (§18.1). v2 includes timeline actions and party state. */
export const PlanExport = z.object({
  version: z.literal(2),
  meta: PlanMeta,
  assignments: z.array(Assignment),
  tankStates: z.array(TankState),
  locks: z.record(z.string(), z.string()),
  timelineActions: z.array(PlanTimelineAction).optional(),
  party: PlanPartyState.optional(),
  timelineSettings: TimelineSettings.optional(),
  exportedAt: z.string().datetime(),
});
export type PlanExport = z.infer<typeof PlanExport>;

/** v1 PlanExport for backward compatibility. */
export const PlanExportV1 = z.object({
  version: z.literal(1),
  meta: PlanMeta,
  assignments: z.array(Assignment),
  tankStates: z.array(TankState),
  locks: z.record(z.string(), z.string()),
  exportedAt: z.string().datetime(),
});
export type PlanExportV1 = z.infer<typeof PlanExportV1>;

/** Conflict detection result (§14.2). */
export const MitConflict = z.object({
  kind: z.enum(['DOUBLE_BOOKING', 'RECAST_OVERLAP', 'TANK_INVULN_DOT']),
  assignmentIds: z.array(z.string().uuid()),
  detail: z.string(),
});
export type MitConflict = z.infer<typeof MitConflict>;

/** Mit stack computation result. */
export const MitStackEntry = z.object({
  abilityId: z.string().uuid(),
  abilityName: z.string(),
  effectPct: z.number().min(0).max(100),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  /** True if the ability is a tank invuln. */
  isInvuln: z.boolean(),
});
export type MitStackEntry = z.infer<typeof MitStackEntry>;

export const MitStack = z.object({
  eventId: z.string().uuid(),
  targetUserId: z.string().uuid().nullable(),
  entries: z.array(MitStackEntry),
  /** 1.0 × ∏(1 - effectPct/100) (architecture §2.1 #6, §10.3). */
  residualMultiplier: z.number().min(0).max(1),
  /** Residual damage as a percentage. residualMultiplier * 100. */
  residualPct: z.number().min(0).max(100),
});
export type MitStack = z.infer<typeof MitStack>;
