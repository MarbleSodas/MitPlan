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

/** A single mit assignment (one ability applied to one target at one event). */
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
});
export type Assignment = z.infer<typeof Assignment>;

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
});
export type Plan = z.infer<typeof Plan>;

/** JSON import/export shape (§18.1). */
export const PlanExport = z.object({
  version: z.literal(1),
  meta: PlanMeta,
  assignments: z.array(Assignment),
  tankStates: z.array(TankState),
  locks: z.record(z.string(), z.string()),
  exportedAt: z.string().datetime(),
});
export type PlanExport = z.infer<typeof PlanExport>;

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
