/**
 * Re-export branded ID types from @xivmitplan/shared.
 * See architecture §8.2 (shared package) and §9 (domain model).
 */
export type {
  UserId,
  AbilityId,
  JobId,
  RoleId,
  EncounterId,
  ExpansionId,
  RaidId,
  TimelineId,
  TimelineEventId,
  BranchId,
  JoinPointId,
  OutcomeId,
  AssignmentId,
  PlanId,
  PartyId,
  PlanSnapshotId,
} from '@xivmitplan/shared/ids';
