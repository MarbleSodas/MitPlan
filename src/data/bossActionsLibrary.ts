import type {
  BossAction,
  BossActionClassification,
  BossActionTemplate,
  DamageType,
} from '../types';
import { bossActionsMap } from './bosses/bossActions';
import {
  deriveBossActionClassification,
  isRaidwideClassification,
  isTankBusterClassification,
  syncBossActionMetadataWithClassification,
} from '../utils/boss/bossActionUtils';

type BossActionTemplateCategory = 'tankBusters' | 'raidwide' | 'mechanics' | 'all';
type TemplateAccumulator = BossActionTemplate & { sourceAbilitySet: Set<string> };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function buildTemplateKey(bossId: string, action: BossAction): string {
  const normalized = syncBossActionMetadataWithClassification(action);
  const classification = normalized.classification || deriveBossActionClassification(normalized);
  const damageKey = String(normalized.unmitigatedDamage ?? '').trim().toLowerCase() || 'none';

  return [
    bossId,
    normalized.name.trim().toLowerCase(),
    classification,
    normalized.damageType || 'none',
    normalized.importance || 'none',
    normalized.icon || 'none',
    normalized.targetTank || 'none',
    normalized.isMultiHit ? `multihit:${normalized.hitCount || 'yes'}` : 'multihit:none',
    normalized.hasDot ? 'dot:yes' : 'dot:no',
    damageKey,
  ].join('::');
}

function buildLibraryId(bossId: string, action: BossAction): string {
  const normalized = syncBossActionMetadataWithClassification(action);
  const classification = normalized.classification || deriveBossActionClassification(normalized);

  return [
    bossId,
    slugify(normalized.name),
    slugify(classification),
    slugify(normalized.damageType || 'none'),
    slugify(normalized.importance || 'none'),
    slugify(String(normalized.targetTank || 'none')),
    slugify(normalized.isMultiHit ? `multihit_${normalized.hitCount || 'yes'}` : 'multihit_none'),
    slugify(normalized.hasDot ? 'dot_yes' : 'dot_no'),
    slugify(String(normalized.unmitigatedDamage || 'none')),
  ]
    .filter(Boolean)
    .join('_');
}

function createTemplateAccumulator(bossId: string, action: BossAction): TemplateAccumulator {
  const normalized = syncBossActionMetadataWithClassification(action);
  const {
    time: _time,
    branchId: _branchId,
    phaseId: _phaseId,
    timeRange: _timeRange,
    ...rest
  } = normalized;

  const sourceAbilities = Array.from(
    new Set((normalized.sourceAbilities || [normalized.name]).filter(Boolean))
  );

  return {
    ...rest,
    id: buildLibraryId(bossId, normalized),
    libraryId: buildLibraryId(bossId, normalized),
    classification: normalized.classification || deriveBossActionClassification(normalized),
    sourceBoss: bossId,
    source: normalized.source || 'boss',
    sourceKind: normalized.sourceKind || 'legacy_action',
    isCustom: false,
    occurrenceCount: 1,
    sourceAbilities,
    sourceAbilitySet: new Set(sourceAbilities),
  };
}

function extractAllActions(): BossActionTemplate[] {
  const templatesByKey = new Map<string, TemplateAccumulator>();

  Object.entries(bossActionsMap).forEach(([bossId, actions]) => {
    actions.forEach((action) => {
      const key = buildTemplateKey(bossId, action);
      const existing = templatesByKey.get(key);

      if (!existing) {
        templatesByKey.set(key, createTemplateAccumulator(bossId, action));
        return;
      }

      const nextSourceAbilities = [
        ...existing.sourceAbilitySet,
        ...(action.sourceAbilities || [action.name]).filter(Boolean),
      ];

      nextSourceAbilities.forEach((ability) => existing.sourceAbilitySet.add(ability));
      existing.sourceAbilities = Array.from(existing.sourceAbilitySet);
      existing.occurrenceCount += 1;

      if (!existing.description && action.description) {
        existing.description = action.description;
      }

      if (!existing.notes && action.notes) {
        existing.notes = action.notes;
      }

      if (!existing.icon && action.icon) {
        existing.icon = action.icon;
      }
    });
  });

  return Array.from(templatesByKey.values())
    .map(({ sourceAbilitySet: _sourceAbilitySet, ...template }) => template)
    .sort((left, right) => {
      if (left.sourceBoss !== right.sourceBoss) {
        return left.sourceBoss.localeCompare(right.sourceBoss);
      }

      return left.name.localeCompare(right.name);
    });
}

function categorizeActions(actions: BossActionTemplate[]): Record<BossActionTemplateCategory, BossActionTemplate[]> {
  const categories: Record<BossActionTemplateCategory, BossActionTemplate[]> = {
    tankBusters: [],
    raidwide: [],
    mechanics: [],
    all: actions,
  };

  actions.forEach((action) => {
    if (isTankBusterClassification(action.classification)) {
      categories.tankBusters.push(action);
    } else if (isRaidwideClassification(action.classification)) {
      categories.raidwide.push(action);
    } else {
      categories.mechanics.push(action);
    }
  });

  return categories;
}

function getActionsByDamageType(actions: BossActionTemplate[], damageType: DamageType) {
  return actions.filter((action) => action.damageType === damageType);
}

function getActionsByImportance(actions: BossActionTemplate[], importance: BossAction['importance']) {
  return actions.filter((action) => action.importance === importance);
}

function getActionsByClassification(
  actions: BossActionTemplate[],
  classification: BossActionClassification
) {
  return actions.filter((action) => action.classification === classification);
}

function searchActions(actions: BossActionTemplate[], searchTerm: string) {
  const term = searchTerm.toLowerCase();

  return actions.filter((action) =>
    action.name.toLowerCase().includes(term) ||
    (action.description && action.description.toLowerCase().includes(term)) ||
    action.sourceBoss.toLowerCase().includes(term) ||
    action.classification.toLowerCase().includes(term) ||
    (action.sourceAbilities || []).some((ability) => ability.toLowerCase().includes(term))
  );
}

function getUniqueActionNames(actions: BossActionTemplate[]) {
  const uniqueNames = new Set<string>();
  const uniqueActions: BossActionTemplate[] = [];

  actions.forEach((action) => {
    const key = `${action.sourceBoss}::${action.name}::${action.classification}`;
    if (!uniqueNames.has(key)) {
      uniqueNames.add(key);
      uniqueActions.push(action);
    }
  });

  return uniqueActions;
}

export const bossActionsLibrary = extractAllActions();
export const categorizedActions = categorizeActions(bossActionsLibrary);
export const uniqueActionTemplates = getUniqueActionNames(bossActionsLibrary);

export const libraryUtils = {
  getActionsByDamageType,
  getActionsByImportance,
  getActionsByClassification,
  searchActions,
  categorizeActions,
  getUniqueActionNames,
};

export const createCustomActionTemplate = (overrides: Partial<BossAction> = {}): BossAction => {
  const normalized = syncBossActionMetadataWithClassification({
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name: overrides.name || 'Custom Action',
    time: overrides.time || 0,
    description: overrides.description || '',
    icon: overrides.icon || '⚔️',
    damageType: overrides.damageType || 'magical',
    importance: overrides.importance || 'medium',
    unmitigatedDamage: overrides.unmitigatedDamage || '',
    isTankBuster: overrides.isTankBuster || false,
    isDualTankBuster: overrides.isDualTankBuster || false,
    isRaidwide: overrides.isRaidwide || false,
    targetTank: overrides.targetTank,
    classification: overrides.classification,
    isCustom: true,
    source: 'custom',
    ...overrides,
  });

  return normalized;
};

export const cloneActionFromLibrary = (
  libraryAction: BossActionTemplate,
  modifications: Partial<BossAction> = {}
): BossAction => {
  const { occurrenceCount: _occurrenceCount, libraryId: _libraryId, ...rest } = libraryAction;

  return syncBossActionMetadataWithClassification({
    ...rest,
    id: `cloned_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    time: modifications.time ?? 0,
    ...modifications,
  });
};

export default {
  bossActionsLibrary,
  categorizedActions,
  uniqueActionTemplates,
  bossActionsMap,
  libraryUtils,
  createCustomActionTemplate,
  cloneActionFromLibrary,
};

