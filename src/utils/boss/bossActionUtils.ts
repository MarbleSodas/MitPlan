import type { BossAction, BossActionClassification } from '../../types';
import { processMultiHitTankBusterSequences } from '../timeline/multiHitSequenceUtils';

type LegacyBossActionClassification =
  | 'multi_hit_raidwide'
  | 'shared_tankbuster'
  | 'pair_target'
  | 'pair_target_sequence'
  | 'spread_sequence'
  | 'stack_sequence'
  | 'tower_sequence'
  | 'phase_transition'
  | 'variable_party_damage'
  | 'mechanic_combo'
  | 'mechanic';

type BossActionLike = Partial<Omit<BossAction, 'classification'>> & {
  classification?: BossActionClassification | LegacyBossActionClassification | string | null;
};

export const BOSS_ACTION_CLASSIFICATIONS = [
  'raidwide',
  'tankbuster',
  'dual_tankbuster',
  'small_parties',
  'mechanic',
] as const satisfies readonly BossActionClassification[];

export const BOSS_ACTION_CLASSIFICATION_LABELS: Record<BossActionClassification, string> = {
  raidwide: 'Raidwide',
  tankbuster: 'Tankbuster',
  dual_tankbuster: 'Dual Tankbuster',
  small_parties: 'Small Parties',
  mechanic: 'Mechanic',
};

const RAIDWIDE_LIKE_CLASSIFICATIONS = new Set<BossActionClassification>([
  'raidwide',
  'small_parties',
]);

const SMALL_PARTY_CLASSIFICATIONS = new Set<BossActionClassification>([
  'small_parties',
]);

const LEGACY_MULTI_HIT_CLASSIFICATIONS = new Set<LegacyBossActionClassification>([
  'multi_hit_raidwide',
  'pair_target_sequence',
  'spread_sequence',
  'stack_sequence',
  'tower_sequence',
]);

const LEGACY_CLASSIFICATION_MAP: Record<LegacyBossActionClassification, BossActionClassification> = {
  multi_hit_raidwide: 'raidwide',
  shared_tankbuster: 'dual_tankbuster',
  pair_target: 'small_parties',
  pair_target_sequence: 'small_parties',
  spread_sequence: 'raidwide',
  stack_sequence: 'raidwide',
  tower_sequence: 'raidwide',
  phase_transition: 'raidwide',
  variable_party_damage: 'raidwide',
  mechanic_combo: 'raidwide',
  mechanic: 'mechanic',
};

const DUAL_TANKBUSTER_PATTERN = /\bdual tank ?buster\b|\bboth tanks\b|\bon both tanks\b/i;
const TANKBUSTER_PATTERN = /\btank ?buster\b/i;
const SMALL_PARTIES_PATTERN =
  /\bsmall parties\b|\bpair[- ]target\b|\bfour targeted players\b|\b(?:4|four) players\b|\btwo targeted pairs\b/i;
const RAIDWIDE_PATTERN =
  /\braidwide\b|\bparty[- ]wide\b|\ball players\b|\ball party members\b|\ball eight party members\b/i;
const DOT_PATTERN = /\bdots?\b|\bdamage over time\b|\bdropsy\b/i;
const MULTI_HIT_PATTERN =
  /\bmulti[- ]hit\b|\b\d+\s+(?:rapid\s+)?hits?\b|\bhits?\s+\d+\s+times?\b/i;

export function isDualTankBusterAction(action: BossAction): boolean {
  console.log('[DEBUG] isDualTankBusterAction check:', {
    action,
    isDualTankBusterProperty: action.isDualTankBuster,
    result: !!action.isDualTankBuster
  });
  return !!action.isDualTankBuster;
}

export function parseUnmitigatedDamage(value: BossAction['unmitigatedDamage']): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isSimpleClassification(
  classification: BossActionLike['classification']
): classification is BossActionClassification {
  return !!classification && BOSS_ACTION_CLASSIFICATIONS.includes(classification as BossActionClassification);
}

function isLegacyClassification(
  classification: BossActionLike['classification']
): classification is LegacyBossActionClassification {
  return typeof classification === 'string' && classification in LEGACY_CLASSIFICATION_MAP;
}

function buildSearchableBossActionText(action: BossActionLike): string {
  return [
    action.name,
    action.description,
    action.notes,
    ...(action.sourceAbilities || []),
  ]
    .filter(Boolean)
    .join(' ');
}

function inferHasDot(action: BossActionLike): boolean {
  if (typeof action.hasDot === 'boolean') {
    return action.hasDot;
  }

  return DOT_PATTERN.test(buildSearchableBossActionText(action));
}

function inferIsMultiHit(action: BossActionLike): boolean {
  if (action.isMultiHit === true) {
    return true;
  }

  if (typeof action.hitCount === 'number' && action.hitCount > 1) {
    return true;
  }

  if (isLegacyClassification(action.classification)) {
    return LEGACY_MULTI_HIT_CLASSIFICATIONS.has(action.classification);
  }

  return MULTI_HIT_PATTERN.test(buildSearchableBossActionText(action));
}

function normalizeLegacyClassification(action: BossActionLike): BossActionClassification | null {
  if (isSimpleClassification(action.classification)) {
    return action.classification;
  }

  if (isLegacyClassification(action.classification)) {
    return LEGACY_CLASSIFICATION_MAP[action.classification];
  }

  return null;
}

function looksLikeSmallPartiesAction(action: BossActionLike): boolean {
  return SMALL_PARTIES_PATTERN.test(buildSearchableBossActionText(action));
}

function looksLikeRaidwideAction(action: BossActionLike): boolean {
  return RAIDWIDE_PATTERN.test(buildSearchableBossActionText(action));
}

function looksLikeTankbusterAction(action: BossActionLike): boolean {
  return TANKBUSTER_PATTERN.test(buildSearchableBossActionText(action));
}

function looksLikeDualTankbusterAction(action: BossActionLike): boolean {
  return DUAL_TANKBUSTER_PATTERN.test(buildSearchableBossActionText(action));
}

export function deriveBossActionClassification(action: BossActionLike): BossActionClassification {
  const normalizedClassification = normalizeLegacyClassification(action);
  if (normalizedClassification) {
    return normalizedClassification;
  }

  if (
    action.isDualTankBuster === true ||
    action.targetTank === 'both' ||
    action.targetTank === 'shared' ||
    looksLikeDualTankbusterAction(action)
  ) {
    return 'dual_tankbuster';
  }

  if (action.isTankBuster === true || looksLikeTankbusterAction(action)) {
    return 'tankbuster';
  }

  if (looksLikeSmallPartiesAction(action)) {
    return 'small_parties';
  }

  if (
    action.isRaidwide === true ||
    looksLikeRaidwideAction(action) ||
    action.importance === 'critical' ||
    action.importance === 'high'
  ) {
    return 'raidwide';
  }

  return 'mechanic';
}

export function isTankBusterClassification(
  classification: BossActionClassification | null | undefined
): boolean {
  return classification === 'tankbuster' || classification === 'dual_tankbuster';
}

export function isRaidwideClassification(
  classification: BossActionClassification | null | undefined
): boolean {
  if (!classification) {
    return false;
  }

  return RAIDWIDE_LIKE_CLASSIFICATIONS.has(classification);
}

export function isSmallPartyClassification(
  classification: BossActionClassification | null | undefined
): boolean {
  if (!classification) {
    return false;
  }

  return SMALL_PARTY_CLASSIFICATIONS.has(classification);
}

export function getBossActionTypeLabel(action: BossActionLike | null | undefined): string {
  if (!action) {
    return BOSS_ACTION_CLASSIFICATION_LABELS.mechanic;
  }

  return BOSS_ACTION_CLASSIFICATION_LABELS[deriveBossActionClassification(action)];
}

export function syncBossActionMetadataWithClassification<T extends BossActionLike>(action: T): T {
  const classification = deriveBossActionClassification(action);
  const isMultiHit = inferIsMultiHit(action);
  const hasDot = inferHasDot(action);
  const baseTarget =
    action.targetTank === 'mainTank' || action.targetTank === 'offTank'
      ? action.targetTank
      : undefined;

  let nextTargetTank: BossAction['targetTank'] | undefined;
  if (classification === 'dual_tankbuster') {
    nextTargetTank = 'both';
  } else if (classification === 'tankbuster') {
    nextTargetTank = baseTarget;
  }

  const normalizedAction = {
    ...action,
    classification,
    hasDot,
    isMultiHit,
    isTankBuster: isTankBusterClassification(classification),
    isDualTankBuster: classification === 'dual_tankbuster',
    isRaidwide: isRaidwideClassification(classification),
  } as T;

  if (nextTargetTank !== undefined) {
    return {
      ...normalizedAction,
      targetTank: nextTargetTank,
    } as T;
  }

  const actionWithoutTargetTank = {
    ...normalizedAction,
  } as T & { targetTank?: BossAction['targetTank'] };
  delete actionWithoutTargetTank.targetTank;

  return actionWithoutTargetTank as T;
}

export function isTargetedBossActionClassification(
  classification: BossActionClassification | null | undefined
): boolean {
  return isSmallPartyClassification(classification);
}

type TimelineWithBossActions = {
  actions?: BossAction[];
  adaptiveModel?: {
    branches?: Array<{
      events?: BossAction[];
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export function syncTimelineBossActionsWithClassification<T extends TimelineWithBossActions>(
  timeline: T
): T {
  return {
    ...timeline,
    actions: (timeline.actions || []).map((action) =>
      syncBossActionMetadataWithClassification(action)
    ),
    adaptiveModel: timeline.adaptiveModel
      ? {
          ...timeline.adaptiveModel,
          branches: (timeline.adaptiveModel.branches || []).map((branch) => ({
            ...branch,
            events: (branch.events || []).map((event) =>
              syncBossActionMetadataWithClassification(event)
            ),
          })),
        }
      : timeline.adaptiveModel,
  };
}

export function processMultiHitTankBusters(actions: BossAction[]): BossAction[] {
  return processMultiHitTankBusterSequences(
    actions.map((action) => syncBossActionMetadataWithClassification(action))
  ).map((action) => syncBossActionMetadataWithClassification(action));
}

export default {
  BOSS_ACTION_CLASSIFICATIONS,
  BOSS_ACTION_CLASSIFICATION_LABELS,
  deriveBossActionClassification,
  getBossActionTypeLabel,
  isDualTankBusterAction,
  isRaidwideClassification,
  isSmallPartyClassification,
  isTargetedBossActionClassification,
  isTankBusterClassification,
  parseUnmitigatedDamage,
  processMultiHitTankBusters,
  syncBossActionMetadataWithClassification,
  syncTimelineBossActionsWithClassification,
};
