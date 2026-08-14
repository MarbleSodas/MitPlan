export type Role = 'tank' | 'healer' | 'melee' | 'ranged' | 'caster';

export type AbilityMode = 'CURRENT' | 'REBORN' | 'EVOLVED' | 'ALL';
export type PlanAbilityMode = Exclude<AbilityMode, 'ALL'>;

export type JobId =
  | 'PLD' | 'WAR' | 'DRK' | 'GNB'
  | 'WHM' | 'SCH' | 'AST' | 'SGE'
  | 'MNK' | 'DRG' | 'NIN' | 'SAM' | 'RPR' | 'VPR'
  | 'BRD' | 'MCH' | 'DNC'
  | 'BLM' | 'SMN' | 'RDM' | 'PCT';

export interface Job {
  id: JobId;
  name: string;
  icon: string;
  selected: boolean;
  availableModes?: PlanAbilityMode[];
  evolvedOnly?: boolean;
}

export type JobsByRole = Record<Role, Job[]>;

export type DamageType = 'physical' | 'magical' | 'both';
export type BossActionImportance = 'critical' | 'high' | 'medium' | 'low';
export type BossActionClassification =
  | 'raidwide'
  | 'tankbuster'
  | 'dual_tankbuster'
  | 'small_parties'
  | 'mechanic';

export type AbilityType =
  | 'invulnerability'
  | 'mitigation'
  | 'barrier'
  | 'healing'
  | 'buff';

export type AbilityTarget = 'self' | 'single' | 'party' | 'area';

export interface LevelMitigationValue {
  [level: number]: number | { physical: number; magical: number };
}

export interface LevelDuration {
  [level: number]: number;
}

export interface LevelCooldown {
  [level: number]: number;
}

export interface LevelHealingReceivedBonus {
  [level: number]: number;
}

// New type for abilities that scale potency based on target's HP
export interface HpBasedPotencyScaling {
  minPotency: number;      // Potency at 100% HP
  maxPotency: number;      // Potency at threshold HP
  thresholdPercent: number; // HP threshold for max potency (e.g., 30)
  scalingType: 'linear' | 'step'; // How potency scales with HP
}

// New type for stack-based barriers (Haima, Panhaima)
export interface StackBarrierEffect {
  initialBarrierPotency: number; // Initial barrier potency
  stackCount: number;           // Number of stacks granted
  barrierRefreshOnBreak: boolean; // Whether barrier refreshes when consumed
  healingOnExpire: {
    enabled: boolean;
    potencyPerStack: number; // Healing per remaining stack
  };
  stackConsumptionPerHit: number; // How many stacks consumed per hit (usually 1)
}

// New type for low HP triggered healing (Excogitation)
export interface LowHpTrigger {
  thresholdPercent: number; // HP threshold to trigger (e.g., 50)
  triggerOnExpire: boolean; // Also trigger when effect expires
  healingPotency: number;  // Potency of healing when triggered
}

// New type for conditional barrier on critical heal
export interface ConditionalBarrierOnCrit {
  additionalBarrierMultiplier: number; // Additional barrier (e.g., 1.8 = 180%)
  stackingRule: 'override' | 'add' | 'none';
  incompatibleWith: string[]; // Ability IDs that cannot stack
}

export interface ConditionalBarrierModifier {
  value: number; // Additional max HP barrier value, e.g. 0.02 = 2%
  conditionAbilityIds: string[];
  maxStacks?: number;
  description?: string;
}

// New type for mitigation layers that ride on top of an ability's base value
export interface LayeredMitigationEffect {
  value: number | { physical: number; magical: number };
  duration: number;
  conditionAbilityIds?: string[];
  description?: string;
}

export type AbilityAvailabilityStatus = 'active' | 'retired' | 'unavailable';

export interface AbilityProvenance {
  source: 'ffxiv-job-guide' | 'manual-override';
  patch: string;
  url: string;
  sourceActionId?: string;
  semanticHash?: string;
  notes?: string;
}

export interface MitigationAbility {
  id: string;
  name: string;
  aliases?: string[];
  description: string;
  levelRequirement: number;
  levelDescriptions?: Record<number, string>;
  duration: number;
  levelDurations?: LevelDuration;
  cooldown: number;
  levelCooldowns?: LevelCooldown;
  jobs: JobId[];
  icon: string;
  type: AbilityType | 'utility';
  mitigationValue?: number | { physical: number; magical: number };
  levelMitigationValues?: LevelMitigationValue;
  damageType?: DamageType;
  target: AbilityTarget;
  forTankBusters: boolean;
  forRaidWide: boolean;
  count?: number;
  levelCharges?: Record<number, number>;
  isRoleShared?: boolean;
  consumesAetherflow?: boolean;
  isAetherflowProvider?: boolean;
  sharedCooldownGroup?: string;
  healingPotency?: number;
  regenPotency?: number;
  regenDuration?: number;
  barrierPotency?: number;
  barrierFlatPotency?: number;
  healingType?: 'instant' | 'regen' | 'fullHeal' | 'boost' | 'triggered';
  healingPotencyBonus?: number | { value: number; stackMode: 'additive' | 'multiplicative' };
  maxHpIncrease?: number;
  isSpell?: boolean;
  upgradedBy?: string;
  targetsTank?: boolean;
  isFullHeal?: boolean;
  consumesLily?: boolean;
  lilyStacks?: number;
  providesLily?: boolean;
  scaleBarrierWithHealing?: boolean;
  consumesAddersgall?: boolean;
  providesAddersgall?: boolean;
  providesAddersting?: boolean;
  adderstingCost?: number;
  requiresActiveWindow?: { abilityId: string; windowDuration?: number };
  provenance?: AbilityProvenance[];
  availability?: AbilityAvailabilityStatus;
  effectiveFromPatch?: string;
  effectiveToPatch?: string;
  /**
   * Modes in which this definition is assignable. Untagged pre-Evercold
   * records are treated as CURRENT + REBORN for backward compatibility.
   */
  modes?: AbilityMode[];

  // NEW FIELDS FOR EXPANDED MECHANICS:

  // HP-based potency scaling (Essential Dignity)
  hpBasedPotencyScaling?: HpBasedPotencyScaling;

  // Stack-based barriers (Haima, Panhaima)
  stackBarrierEffect?: StackBarrierEffect;

  // Low HP triggered healing (Excogitation)
  lowHpTrigger?: LowHpTrigger;

  // Conditional barrier on critical heal (Eukrasian Diagnosis)
  conditionalBarrierOnCrit?: ConditionalBarrierOnCrit;

  // Deterministic barrier bonus from other active abilities (Shake It Off)
  conditionalBarrierModifiers?: ConditionalBarrierModifier[];

  // Additional mitigation layers (e.g., Knight's Resolve on Holy Sheltron)
  layeredMitigation?: LayeredMitigationEffect[];

  // Healing received bonus (Krasis, Physis II)
  healingReceivedBonus?: number; // e.g., 0.10 = 10% increase
  levelHealingReceivedBonuses?: LevelHealingReceivedBonus;
}

export interface BossAction {
  id: string;
  name: string;
  time: number;
  description?: string;
  damageType?: DamageType;
  isTankBuster?: boolean;
  isDualTankBuster?: boolean;
  isRaidwide?: boolean;
  unmitigatedDamage?: number | string;
  targetTank?: 'mainTank' | 'offTank' | 'both' | 'shared';
  mechanic?: string;
  notes?: string;
  importance?: BossActionImportance;
  icon?: string;
  timeRange?: string | number[];
  isCustom?: boolean;
  source?: string;
  sourceBoss?: string;
  libraryId?: string;
  phaseId?: string;
  branchId?: string;
  sourceAbilities?: string[];
  isMultiHit?: boolean;
  hitCount?: number;
  hitIntervalMs?: number;
  hasDot?: boolean;
  classification?: BossActionClassification;
  sourceKind?: string;
  originalDamagePerHit?: number | string;
  isPhaseAnchor?: boolean;
  skipEligible?: boolean;
  hiddenByPhaseOverride?: boolean;
}

export interface BossActionTemplate extends Omit<BossAction, 'time'> {
  time?: never;
  sourceBoss: string;
  libraryId: string;
  occurrenceCount: number;
}

export interface BossMetadata {
  level: number;
  name?: string;
  icon?: string;
  description?: string;
  baseHealth?: {
    party: number;
    tank: number;
  };
}

export type TimelineFormat = 'legacy_flat' | 'adaptive_damage';

export interface AdaptiveTimelineEvent extends BossAction {}

export interface AdaptiveTimelineBranch {
  id: string;
  label?: string;
  description?: string;
  fightIndex?: number;
  branchIndex?: number;
  sampleCount?: number;
  sampleRatio?: number;
  isPrimaryBranch?: boolean;
  firstDivergenceTimestampMs?: number | null;
  firstDivergenceTimestamp?: string | null;
  eventCount?: number;
  events: AdaptiveTimelineEvent[];
}

export interface AdaptiveTimelineModel {
  branches: AdaptiveTimelineBranch[];
}

export interface TimelineResolution {
  defaultBranchId: string;
}

export type TimelinePhaseSource = 'cactbot' | 'fflogs' | 'manual';
export type TimelinePhaseSkipWindowMode = 'hide_pre_anchor' | 'keep_visible';

export interface TimelinePhase {
  id: string;
  name: string;
  order: number;
  anchorActionId: string;
  branchIds: string[];
  source: TimelinePhaseSource;
  skipWindowMode: TimelinePhaseSkipWindowMode;
}

export interface TimelineSource {
  site: string;
  url: string;
  title?: string;
  lastVerifiedAt?: string;
}

export interface TimelineAnalysisSource {
  kind: 'cactbot' | 'fflogs' | 'manual';
  url?: string;
  title?: string;
  lastVerifiedAt?: string;
  notes?: string;
}

export interface PhaseOverride {
  startTime: number;
}

export interface ResolvedTimelinePhaseSummary {
  phaseId: string;
  phaseName: string;
  order: number;
  anchorActionId: string;
  canonicalStartTime: number | null;
  effectiveStartTime: number | null;
  inheritedOffset: number;
  effectiveOffset: number;
  overrideStartTime: number | null;
  hiddenActionCount: number;
}

export interface Timeline {
  id: string;
  name: string;
  bossTags?: string[];
  bossId?: string | null;
  bossMetadata?: BossMetadata | null;
  userId?: string;
  ownerId?: string;
  actions: BossAction[];
  adaptiveModel?: AdaptiveTimelineModel | null;
  resolution?: TimelineResolution | null;
  phases?: TimelinePhase[];
  analysisSources?: TimelineAnalysisSource[];
  schemaVersion?: number;
  format?: TimelineFormat;
  description?: string;
  isPublic?: boolean;
  official?: boolean;
  createdAt?: number;
  updatedAt?: number;
  version?: number;
  likeCount?: number;
  likedBy?: Record<string, unknown>;
  guideSources?: TimelineSource[];
  [key: string]: unknown;
}

export interface PlanTimelineHealthConfig {
  party: number;
  defaultTank: number;
  mainTank: number;
  offTank: number;
}

export interface PlanTimelineLayout {
  bossId?: string | null;
  bossTags?: string[];
  bossMetadata?: BossMetadata | null;
  actions: BossAction[];
  adaptiveModel?: AdaptiveTimelineModel | null;
  resolution?: TimelineResolution | null;
  phases?: TimelinePhase[];
  analysisSources?: TimelineAnalysisSource[];
  schemaVersion?: number;
  format?: TimelineFormat;
  description?: string;
  guideSources?: TimelineSource[];
  healthConfig: PlanTimelineHealthConfig;
}

export interface ResolvedTimeline {
  branchId: string;
  actions: BossAction[];
}

export interface Boss {
  id: string;
  name: string;
  level: number;
  icon?: string;
  actions: BossAction[];
  description?: string;
  raidTier?: string;
}

export interface AssignedMitigation {
  id: string;
  name?: string;
  instanceId?: string;
  tankPosition?: 'mainTank' | 'offTank' | 'shared';
  precastSeconds?: number;
  casterJobId?: JobId;
  casterUserId?: string;
  casterDisplayName?: string;
  casterColor?: string;
}

export type MitigationAssignments = Record<string, AssignedMitigation[]>;

export interface TankPositions {
  mainTank: JobId | null;
  offTank: JobId | null;
}

export type SelectedJobs = Record<Role, Job[] | JobId[]>;

export type PlanAccessLevel = 'owner' | 'editor' | 'viewer';
export type PlanShareMode = 'owned' | 'edit' | 'view';

export interface PlanCollaborator {
  role: 'editor';
  addedAt: number;
  addedBy: string;
}

export interface PlanShareSettings {
  viewToken: string | null;
  viewEnabled: boolean;
  viewUpdatedAt?: number;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  bossId: string;
  mode?: PlanAbilityMode;
  selectedJobs: SelectedJobs;
  assignments: MitigationAssignments;
  tankPositions: TankPositions;
  jobAssignments?: JobAssignments;
  healthSettings?: Record<string, unknown>;
  maxTankHP?: number;
  partyMinHP?: number;
  maxPartyHP?: number;
  isPublic?: boolean;
  userId?: string;
  ownerId?: string;
  accessedBy?: Record<string, { firstAccess: number; lastAccess: number; accessCount: number }>;
  createdAt?: number;
  updatedAt?: number;
  lastAccessedAt?: number;
  version?: number;
  schemaVersion?: number;
  revision?: number;
  timelineVersionId?: string | null;
  timelineVersionLabel?: string | null;
  timelineStatus?: 'draft' | 'candidate' | 'published' | 'deprecated' | null;
  routeId?: string;
  lastModifiedBy?: string;
  lastChangeOrigin?: string;
  sourceTimelineId?: string | null;
  sourceTimelineName?: string | null;
  phaseOverrides?: Record<string, PhaseOverride>;
  customEvents?: BossAction[];
  bossTags?: string[];
  bossMetadata?: BossMetadata | null;
  timelineLayout?: PlanTimelineLayout | null;
  collaborators?: Record<string, PlanCollaborator>;
  shareSettings?: PlanShareSettings | null;
  accessLevel?: PlanAccessLevel;
  shareMode?: PlanShareMode;
  viewToken?: string | null;
  snapshotCreatedAt?: number | null;
  sourcePlanUpdatedAt?: number | null;
  isLocal?: boolean;
}

export type PlanConnectionState =
  | 'loading'
  | 'connecting'
  | 'saved'
  | 'saving'
  | 'reconnecting'
  | 'offline-queued'
  | 'error';

export interface TimelineVersionRecord {
  id: string;
  timelineKey: string;
  versionLabel: string;
  gamePatch?: string | null;
  schemaVersion: number;
  contentHash: string;
  status: 'draft' | 'candidate' | 'published' | 'deprecated';
  sourceType: 'official' | 'community' | 'custom' | 'legacy';
  routeIds: string[];
  document: PlanTimelineLayout;
  provenance: Record<string, unknown> | TimelineAnalysisSource[];
  validationReport: Record<string, unknown>;
}

export interface PlanWorkspacePermissions {
  canRead: boolean;
  canEdit: boolean;
  canAdmin: boolean;
}

export interface PlanPartySlot {
  id: string;
  slotIndex: number;
  roleKey: string;
  jobKey: string;
  jobData: Record<string, unknown>;
  playerUserId?: string | null;
  playerLabel?: string | null;
  tankPosition?: 'mainTank' | 'offTank' | null;
  entityRevision: number;
}

export interface PlanChange {
  id: string;
  operationId: string;
  revision: number;
  baseRevision?: number | null;
  actorId: string;
  operationKind: string;
  targetType: string;
  targetKey?: string | null;
  createdAt: string;
  undoEligible: boolean;
}

export interface UserPlanPreference {
  lastPhaseId?: string | null;
  lastEventKey?: string | null;
  filters: Record<string, unknown>;
  panelRatio: number;
  zoom: number;
  density: 'compact' | 'comfortable';
  lastOpenedAt?: string | null;
}

export interface PlanWorkspaceSnapshot {
  plan: Plan;
  timelineVersion: TimelineVersionRecord | null;
  partySlots: PlanPartySlot[];
  assignments: MitigationAssignments;
  revision: number;
  permissions: PlanWorkspacePermissions;
  preference: UserPlanPreference | null;
  changes: PlanChange[];
  changesSinceRevision?: Array<PlanChange & { afterData?: PlanWorkspaceSnapshot }>;
  committedChange?: {
    operationId: string;
    revision: number;
    actorId: string;
    operationKind: string;
  };
  idempotentReplay?: boolean;
}

export interface PlanOperation {
  kind:
    | 'patch_plan'
    | 'set_plan_meta'
    | 'set_health_settings'
    | 'set_party'
    | 'set_event_assignments'
    | 'set_assignment_target'
    | 'set_phase_overrides'
    | 'set_custom_events'
    | 'set_timeline_layout'
    | 'set_route'
    | 'upgrade_timeline';
  targetType?: string;
  targetKey?: string | null;
  payload: {
    name?: string;
    description?: string;
    healthSettings?: Record<string, unknown>;
    routeId?: string;
    metadata?: Record<string, unknown>;
    selectedJobs?: SelectedJobs | Record<string, unknown[]>;
    tankPositions?: TankPositions;
    assignmentEvents?: MitigationAssignments;
    phaseOverrides?: Record<string, PhaseOverride>;
    customEvents?: BossAction[];
    timelineLayout?: PlanTimelineLayout;
    sourceTimelineId?: string | null;
    sourceTimelineName?: string | null;
    timelineVersionId?: string;
    reviewApproved?: boolean;
    mode?: PlanAbilityMode;
  };
}

export interface AbilityAvailability {
  isAvailable: boolean;
  reason?: string;
  cooldownRemaining?: number;
  availableCharges?: number;
  totalCharges?: number;
  availableInstances?: number;
  totalInstances?: number;
  isRoleShared?: boolean;
  aetherflowStacks?: number;
  canAssign: () => boolean;
}

export interface AetherflowState {
  availableStacks: number;
  totalStacks: number;
  lastRefreshTime: number;
  canRefresh: (time: number) => boolean;
}

export interface AddersgallState {
  availableStacks: number;
  totalStacks: number;
  lastRefreshTime: number;
  refreshInterval: number;
  canRefresh: (time: number) => boolean;
}

export interface LilyState {
  availableLillies: number;
}

export interface UserJobAssignment {
  userId: string;
  displayName: string;
  color: string;
  assignedAt: number;
}

export type JobAssignments = Partial<Record<JobId, UserJobAssignment>>;
