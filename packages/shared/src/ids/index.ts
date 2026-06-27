/**
 * Branded ID types. See architecture §8.2 (shared package).
 *
 * A branded type is a string that the type system treats as a distinct
 * nominal type. This prevents accidentally passing a UserId where an
 * AbilityId is expected.
 */
declare const __brand: unique symbol;

export type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type AbilityId = Brand<string, 'AbilityId'>;
export type JobId = Brand<string, 'JobId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type EncounterId = Brand<string, 'EncounterId'>;
export type ExpansionId = Brand<string, 'ExpansionId'>;
export type RaidId = Brand<string, 'RaidId'>;
export type TimelineId = Brand<string, 'TimelineId'>;
export type TimelineEventId = Brand<string, 'TimelineEventId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type JoinPointId = Brand<string, 'JoinPointId'>;
export type OutcomeId = Brand<string, 'OutcomeId'>;
export type AssignmentId = Brand<string, 'AssignmentId'>;
export type PlanId = Brand<string, 'PlanId'>;
export type PartyId = Brand<string, 'PartyId'>;
export type PlanSnapshotId = Brand<string, 'PlanSnapshotId'>;

/**
 * Cast a plain string to a branded ID. Use only at trust boundaries
 * (DB reads, parser output, JWT claims). Never call this on user input
 * without prior validation through the relevant Zod schema.
 */
export const brandId = <B extends string>(s: string): Brand<string, B> =>
  s as Brand<string, B>;
