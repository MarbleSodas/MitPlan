export type Role = 'tank' | 'healer' | 'melee' | 'ranged' | 'caster';

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

export interface MitigationAbility {
  id: string;
  name: string;
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
  
  // NEW FIELDS FOR EXPANDED MECHANICS:
  
  // HP-based potency scaling (Essential Dignity)
  hpBasedPotencyScaling?: HpBasedPotencyScaling;
  
  // Stack-based barriers (Haima, Panhaima)
  stackBarrierEffect?: StackBarrierEffect;
  
  // Low HP triggered healing (Excogitation)
  lowHpTrigger?: LowHpTrigger;
  
  // Conditional barrier on critical heal (Eukrasian Diagnosis)
  conditionalBarrierOnCrit?: ConditionalBarrierOnCrit;
  
  // Healing received bonus (Krasis, Physis II)
  healingReceivedBonus?: number; // e.g., 0.10 = 10% increase
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

export interface Plan {
  id: string;
  name: string;
  description?: string;
  bossId: string;
  selectedJobs: SelectedJobs;
  assignments: MitigationAssignments;
  tankPositions: TankPositions;
  jobAssignments?: JobAssignments;
  healthSettings?: Record<string, unknown>;
  isPublic?: boolean;
  userId?: string;
  ownerId?: string;
  accessedBy?: Record<string, { firstAccess: number; lastAccess: number; accessCount: number }>;
  createdAt?: number;
  updatedAt?: number;
  lastAccessedAt?: number;
  version?: number;
  lastModifiedBy?: string;
  lastChangeOrigin?: string;
  sourceTimelineId?: string | null;
  sourceTimelineName?: string | null;
  phaseOverrides?: Record<string, PhaseOverride>;
  bossTags?: string[];
  bossMetadata?: BossMetadata | null;
  timelineLayout?: PlanTimelineLayout | null;
  isLocal?: boolean;
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
