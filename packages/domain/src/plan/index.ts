/**
 * Plan aggregates. See architecture §9 and §10.3.
 * The v1.0 surface ships the data model and the live Yjs editor;
 * the dual-pane graph editor and the path-lock UI are v2.1.
 */
import type {
  PartyId,
  UserId,
  AbilityId,
  TimelineEventId,
  EncounterId,
} from '../ids/index.js';
import type { AbilityMode } from '@xivmitplan/validation/ability';
import type {
  Assignment as ValidationAssignment,
  TankState as ValidationTankState,
  PlanMeta as ValidationPlanMeta,
  PlanAccess as ValidationPlanAccess,
  PlanSnapshot as ValidationPlanSnapshot,
  Plan as ValidationPlan,
  AssignmentTargetType,
} from '@xivmitplan/validation/plan';

export type Assignment = ValidationAssignment;
export type TankState = ValidationTankState;
export type PlanMeta = ValidationPlanMeta;
export type PlanAccess = ValidationPlanAccess;
export type PlanSnapshot = ValidationPlanSnapshot;
export type Plan = ValidationPlan;
export type { AssignmentTargetType };

/** A party (the 8-player composition a plan is for). */
export interface Party {
  readonly id: PartyId;
  readonly ownerId: UserId;
  readonly name: string;
  /** 8 player IDs, indexed by slot (0 = MT, 1 = OT, 2-4 = melee, etc.). */
  readonly slotUserIds: ReadonlyArray<UserId | null>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Assignment creation input. The realtime layer creates Assignments with a fresh UUID. */
export interface NewAssignment {
  readonly abilityId: AbilityId;
  readonly targetUserId: UserId | null;
  readonly targetType: AssignmentTargetType;
  readonly eventId: TimelineEventId;
  readonly notes?: string;
}

/** Plan creation input. */
export interface NewPlan {
  readonly name: string;
  readonly encounterId: EncounterId;
  readonly partyId: PartyId;
  readonly mode: AbilityMode;
}