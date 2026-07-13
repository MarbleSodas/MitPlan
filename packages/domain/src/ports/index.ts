/**
 * Port interfaces. See architecture §10.
 * The composition root (apps/server/src/composition.ts) is the only
 * file that imports concrete classes; everything else imports from here.
 *
 * Liskov Substitution (architecture §10.5, Appendix A example 3):
 * tests substitute InMemory* implementations without touching production.
 */
import type {
  Ability,
  Job,
  Role_,
  Encounter,
  Raid,
  Expansion,
} from '../catalog/index.js';
import type {
  AbilityId,
  EncounterId,
  JobId,
  RaidId,
  ExpansionId,
  RoleId,
  UserId,
  PlanId,
  AssignmentId,
  TimelineId,
} from '../ids/index.js';
import type { Timeline, MergeResult, MergeConflict, TimelineEvent } from '../timeline/index.js';
import type { PlanMeta, Plan, NewPlan, PlanSnapshot, Assignment, TankState } from '../plan/index.js';
import type { Result } from '@xivmitplan/shared/result';
import type { DomainError } from '../errors/index.js';

// --- Reference catalog ports (architecture §10.1) ---------------------------

export interface AbilityCatalog {
  byId(id: AbilityId): Promise<Result<Ability, DomainError>>;
  byJobAndMode(
    jobId: JobId,
    mode: 'REBORN' | 'EVOLVED' | 'CURRENT' | 'ALL',
  ): Promise<Result<ReadonlyArray<Ability>, DomainError>>;
  /** Free-text search. */
  search(q: string, limit?: number): Promise<Result<ReadonlyArray<Ability>, DomainError>>;
}

export interface JobCatalog {
  byId(id: JobId): Promise<Result<Job, DomainError>>;
  all(): Promise<Result<ReadonlyArray<Job>, DomainError>>;
}

export interface RoleCatalog {
  byId(id: RoleId): Promise<Result<Role_, DomainError>>;
  all(): Promise<Result<ReadonlyArray<Role_>, DomainError>>;
}

export interface EncounterCatalog {
  byId(id: EncounterId): Promise<Result<Encounter, DomainError>>;
  byRaid(raidId: RaidId): Promise<Result<ReadonlyArray<Encounter>, DomainError>>;
  byPatch(patch: string): Promise<Result<ReadonlyArray<Encounter>, DomainError>>;
}

export interface RaidCatalog {
  byId(id: RaidId): Promise<Result<Raid, DomainError>>;
  byExpansion(expansionId: ExpansionId): Promise<Result<ReadonlyArray<Raid>, DomainError>>;
}

export interface ExpansionCatalog {
  byId(id: ExpansionId): Promise<Result<Expansion, DomainError>>;
  all(): Promise<Result<ReadonlyArray<Expansion>, DomainError>>;
}

// --- Timeline ports (architecture §10.2) ------------------------------------

/** Raw input to a parser. Source-agnostic shape that all three parsers accept. */
export type RawTimeline =
  | { kind: 'CACTBOT'; raw: string; encounterId: EncounterId; patchVersion: string }
  | { kind: 'TRIGGERNOMETRY'; xml: string; encounterId: EncounterId; patchVersion: string }
  | { kind: 'FFLOGS'; reportCode: string; bossSourceId: number; encounterId: EncounterId; oauthToken: string };

export interface ParseOptions {
  /** Patch version to stamp on parsed events. */
  patchVersion: string;
  /** Encounter ID to stamp on parsed events. */
  encounterId: EncounterId;
}

export interface TimelineParser {
  /** Discriminator-friendly name. */
  readonly source: 'CACTBOT' | 'TRIGGERNOMETRY' | 'FFLOGS';
  parse(raw: RawTimeline, options: ParseOptions): Promise<Result<ReadonlyArray<TimelineEvent>, DomainError>>;
}

/** The merger (architecture §12.3). */
export interface TimelineMerger {
  merge(input: {
    encounterId: EncounterId;
    patchVersion: string;
    cactbot?: ReadonlyArray<TimelineEvent>;
    triggernometry?: ReadonlyArray<TimelineEvent>;
    fflogs?: ReadonlyArray<TimelineEvent>;
  }): Result<MergeResult, DomainError>;
}

export interface TimelineRepository {
  upsert(timeline: Timeline): Promise<Result<Timeline, DomainError>>;
  byEncounter(encounterId: EncounterId): Promise<Result<ReadonlyArray<Timeline>, DomainError>>;
  byId(id: TimelineId): Promise<Result<Timeline, DomainError>>;
  /** Find merge conflicts across the latest timeline of an encounter. */
  conflictsForEncounter(encounterId: EncounterId): Promise<Result<ReadonlyArray<MergeConflict>, DomainError>>;
}

// --- Plan ports (architecture §10.3) ----------------------------------------

export interface PlanService {
  create(ownerId: UserId, input: NewPlan): Promise<Result<Plan, DomainError>>;
  get(planId: PlanId, viewerId: UserId): Promise<Result<Plan, DomainError>>;
  list(ownerId: UserId): Promise<Result<ReadonlyArray<PlanMeta>, DomainError>>;
  /** Re-validate the plan's assignments against the current encounter data. */
  revalidate(planId: PlanId): Promise<Result<ReadonlyArray<DomainError>, DomainError>>;
  snapshot(planId: PlanId, reason: PlanSnapshot['reason']): Promise<Result<PlanSnapshot, DomainError>>;
  listSnapshots(planId: PlanId): Promise<Result<ReadonlyArray<PlanSnapshot>, DomainError>>;
  revertToSnapshot(planId: PlanId, snapshotId: string): Promise<Result<Plan, DomainError>>;
  addAssignment(planId: PlanId, assignment: Assignment): Promise<Result<Assignment, DomainError>>;
  removeAssignment(planId: PlanId, assignmentId: AssignmentId): Promise<Result<void, DomainError>>;
  setTankState(planId: PlanId, tankState: TankState): Promise<Result<TankState, DomainError>>;
}

// --- Mit stack evaluator (architecture §2.1 #6, §10.3) ----------------------

export interface MitStackEvaluator {
  /**
   * Compute the residual damage percentage after a mit stack applies.
   * Uses the FFXIV formula:
   *   1.0 × ∏(1 - effectPct/100)   for percent mits
   *   then additive shield after mit.
   * See architecture §2.1 #6, §10.3 (Open/Closed), Appendix A example 5.
   */
  evaluate(input: MitStackInput): MitStackResult;
}

export interface MitStackInput {
  readonly eventId: string;
  readonly targetUserId: UserId | null;
  readonly activeAssignments: ReadonlyArray<Assignment>;
  /** Resolved ability metadata for each assignment. */
  readonly abilityById: ReadonlyMap<AbilityId, Ability>;
  /** True if the target has a tank invuln active. */
  readonly hasInvuln: boolean;
}

export interface MitStackResult {
  readonly residualMultiplier: number;
  readonly residualPct: number;
  readonly entries: ReadonlyArray<{
    abilityId: AbilityId;
    abilityName: string;
    effectPct: number;
    isInvuln: boolean;
  }>;
  readonly conflicts: ReadonlyArray<DomainError>;
}

// --- Auth port (architecture §7.7) -----------------------------------------

export interface AuthService {
  /**
   * Mint a share-link JWT (§7.7.5). The token is signed with our own
   * key, not Supabase's, and has a `plan_access` claim.
   */
  mintShareToken(input: {
    planId: PlanId;
    grantedTo: UserId | null;
    role: 'read' | 'edit';
    expiresInDays: number;
  }): Promise<Result<string, DomainError>>;

  /**
   * Validate a Supabase Auth JWT. The realtime DO calls this on connect
   * (§14.4). The API Worker calls this on every protected request.
   */
  validateJwt(jwt: string): Promise<Result<UserId, DomainError>>;

  /**
   * Mint a one-time account-link candidate. Used by the
   * `linkIfPossible` client flow (§7.7.4).
   */
  findLinkCandidate(input: {
    currentUserId: UserId;
    email: string;
    provider: 'discord' | 'google' | 'email' | 'magic_link';
  }): Promise<Result<UserId | null, DomainError>>;

  mergeAuthUsers(input: {
    source: UserId;
    target: UserId;
    actor: UserId;
  }): Promise<Result<{ movedPlans: number; movedAccess: number }, DomainError>>;

  /**
   * Claim MitPlan v1 plans for a freshly signed-in user
   * (§17.7.4, §22.7).
   */
  claimLegacyPlans(input: {
    userId: UserId;
    planIds: ReadonlyArray<PlanId>;
  }): Promise<Result<number, DomainError>>;
}

// --- Yjs document port (architecture §14.1) ---------------------------------

/**
 * The single interface that knows Yjs is the CRDT. Used by:
 *   - apps/realtime (Hocuspocus) — the live in-memory Y.Doc
 *   - apps/server — the snapshot persistence target
 *   - apps/web — the editor's local Y.Doc
 * Per architecture §14, the rest of the system uses PlanService
 * (Postgres-shaped) and is unaware of the CRDT.
 */
export interface PlanDocument {
  /** The underlying Y.Doc (only the realtime layer and the web editor use this). */
  readonly doc: unknown; // Y.Doc; typed loosely to avoid a Yjs import in domain
  toJSON(): Plan;
  applyUpdate(update: Uint8Array): void;
  encodeStateAsUpdate(): Uint8Array;
  /** Returns the Awareness instance for presence. */
  awareness(): unknown;
}