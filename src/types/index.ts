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
  scaleBarrierWithHealing?: boolean;
  consumesAddersgall?: boolean;
  requiresActiveWindow?: { abilityId: string; windowDuration?: number };
}

export interface BossAction {
  id: string;
  name: string;
  time: number;
  description?: string;
  damageType?: string;
  isTankBuster?: boolean;
  isDualTankBuster?: boolean;
  isRaidwide?: boolean;
  unmitigatedDamage?: number | string;
  targetTank?: 'mainTank' | 'offTank' | 'both' | 'shared';
  mechanic?: string;
  notes?: string;
  importance?: string;
  icon?: string;
  timeRange?: string | number[];
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
  bossTags?: string[];
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

export interface UserJobAssignment {
  userId: string;
  displayName: string;
  color: string;
  assignedAt: number;
}

export type JobAssignments = Partial<Record<JobId, UserJobAssignment>>;
