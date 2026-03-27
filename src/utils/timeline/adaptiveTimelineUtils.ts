import type {
  AdaptiveTimelineBranch,
  AdaptiveTimelineEvent,
  AdaptiveTimelineModel,
  BossAction,
  TimelinePhase,
  Timeline,
  TimelineFormat,
  TimelineResolution,
} from '../../types';
import { syncBossActionMetadataWithClassification } from '../boss/bossActionUtils';
import { processMultiHitTankBusterSequences } from './multiHitSequenceUtils';

const LEGACY_DEFAULT_BRANCH_ID = 'legacy-default-branch';
const ADAPTIVE_SCHEMA_VERSION = 1;
const PHASE_AWARE_SCHEMA_VERSION = 2;

type TimelineLike = Partial<Timeline> & {
  actions?: BossAction[];
  adaptiveModel?: AdaptiveTimelineModel | null;
  resolution?: TimelineResolution | null;
  format?: TimelineFormat;
  schemaVersion?: number;
};

function cloneBossAction(action: BossAction, overrides: Partial<BossAction> = {}): BossAction {
  return syncBossActionMetadataWithClassification({
    ...action,
    ...overrides,
    sourceAbilities: [...(overrides.sourceAbilities || action.sourceAbilities || [])],
  });
}

function sortActions(actions: BossAction[]): BossAction[] {
  return [...actions].sort((left, right) => {
    if (left.time !== right.time) {
      return left.time - right.time;
    }

    return left.name.localeCompare(right.name);
  });
}

function getNearestKnownPhaseId(
  actions: BossAction[],
  index: number,
  fallbackPhaseId?: string
): string | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (actions[cursor]?.phaseId) {
      return actions[cursor]?.phaseId;
    }
  }

  for (let cursor = index + 1; cursor < actions.length; cursor += 1) {
    if (actions[cursor]?.phaseId) {
      return actions[cursor]?.phaseId;
    }
  }

  return fallbackPhaseId;
}

function inferMissingPhaseIds(
  actions: BossAction[],
  phases: TimelinePhase[]
): BossAction[] {
  if (!phases.length) {
    return actions;
  }

  const fallbackPhaseId = phases[0]?.id;
  return actions.map((action, index) => {
    if (action.phaseId) {
      return action;
    }

    const inferredPhaseId = getNearestKnownPhaseId(actions, index, fallbackPhaseId);
    if (!inferredPhaseId) {
      return action;
    }

    return cloneBossAction(action, {
      phaseId: inferredPhaseId,
    });
  });
}

function reconcilePhaseAnchors(
  phases: TimelinePhase[],
  actions: BossAction[],
  defaultBranchId: string
): TimelinePhase[] {
  if (!phases.length) {
    return [];
  }

  const actionIds = new Set(actions.map((action) => action.id));
  const actionsByPhaseId = actions.reduce<Map<string, BossAction[]>>((accumulator, action) => {
    if (!action.phaseId) {
      return accumulator;
    }

    const existing = accumulator.get(action.phaseId) || [];
    existing.push(action);
    accumulator.set(action.phaseId, existing);
    return accumulator;
  }, new Map());

  return phases
    .map((phase, index) => {
      const fallbackAnchorId = actionsByPhaseId.get(phase.id)?.[0]?.id;
      const anchorActionId = actionIds.has(phase.anchorActionId)
        ? phase.anchorActionId
        : fallbackAnchorId;

      if (!anchorActionId) {
        return null;
      }

      return {
        ...phase,
        order: typeof phase.order === 'number' ? phase.order : index,
        anchorActionId,
        branchIds: Array.isArray(phase.branchIds) && phase.branchIds.length > 0
          ? [...phase.branchIds]
          : [defaultBranchId],
      };
    })
    .filter((phase): phase is TimelinePhase => phase !== null)
    .sort((left, right) => left.order - right.order);
}

function toLegacyBranchId(timeline: TimelineLike): string {
  const bossId = String(timeline.bossId || 'custom');
  return `${LEGACY_DEFAULT_BRANCH_ID}-${bossId}`;
}

function buildLegacyAdaptiveModel(timeline: TimelineLike): AdaptiveTimelineModel {
  const branchId = toLegacyBranchId(timeline);
  const actions = sortActions(
    (timeline.actions || []).map((action) =>
      cloneBossAction(action, {
        branchId: action.branchId || branchId,
        sourceKind: action.sourceKind || 'legacy_action',
        phaseId: action.phaseId || 'legacy',
      })
    )
  );

  return {
    branches: [
      {
        id: branchId,
        label: 'Legacy Timeline',
        description: 'Auto-wrapped legacy flat timeline.',
        sampleCount: 1,
        sampleRatio: 1,
        isPrimaryBranch: true,
        firstDivergenceTimestampMs: null,
        firstDivergenceTimestamp: null,
        eventCount: actions.length,
        events: actions,
      },
    ],
  };
}

function normalizeBranchEvent(event: AdaptiveTimelineEvent, branchId: string): AdaptiveTimelineEvent {
  return syncBossActionMetadataWithClassification({
    ...event,
    branchId: event.branchId || branchId,
    phaseId: event.phaseId || 'unknown-phase',
    sourceAbilities: [...(event.sourceAbilities || [])],
    sourceKind: event.sourceKind || 'guide_curated',
  });
}

function normalizeAdaptiveModel(timeline: TimelineLike): AdaptiveTimelineModel {
  if (!timeline.adaptiveModel?.branches?.length) {
    return buildLegacyAdaptiveModel(timeline);
  }

  return {
    branches: timeline.adaptiveModel.branches.map((branch) => ({
      ...branch,
      events: sortActions(
        (branch.events || []).map((event) => normalizeBranchEvent(event, branch.id))
      ),
      eventCount: branch.eventCount ?? branch.events?.length ?? 0,
    })),
  };
}

function getDefaultBranchId(timeline: TimelineLike, adaptiveModel: AdaptiveTimelineModel): string {
  const configuredBranchId = timeline.resolution?.defaultBranchId;
  if (configuredBranchId && adaptiveModel.branches.some((branch) => branch.id === configuredBranchId)) {
    return configuredBranchId;
  }

  return adaptiveModel.branches[0]?.id || toLegacyBranchId(timeline);
}

function getBranchById(
  adaptiveModel: AdaptiveTimelineModel,
  branchId: string
): AdaptiveTimelineBranch | undefined {
  return adaptiveModel.branches.find((branch) => branch.id === branchId);
}

function resolveBranchEvents(branch: AdaptiveTimelineBranch): BossAction[] {
  return sortActions(
    (branch.events || []).map((event) =>
      cloneBossAction(event, {
        branchId: event.branchId || branch.id,
        sourceKind: event.sourceKind || 'guide_curated',
      })
    )
  );
}

export function resolveTimelineActions(timeline: TimelineLike): BossAction[] {
  const adaptiveModel = normalizeAdaptiveModel(timeline);
  const defaultBranchId = getDefaultBranchId(timeline, adaptiveModel);
  const branch =
    getBranchById(adaptiveModel, defaultBranchId) || adaptiveModel.branches[0];

  if (!branch) {
    return sortActions((timeline.actions || []).map((action) => cloneBossAction(action)));
  }

  return resolveBranchEvents(branch);
}

export function normalizeTimelineRecord<T extends TimelineLike>(timeline: T): T & Timeline {
  const adaptiveModel = normalizeAdaptiveModel(timeline);
  const defaultBranchId = getDefaultBranchId(timeline, adaptiveModel);
  const hasPhaseModel = Array.isArray(timeline.phases) && timeline.phases.length > 0;

  return {
    ...timeline,
    actions: resolveTimelineActions({
      ...timeline,
      adaptiveModel,
      resolution: {
        defaultBranchId,
      },
    }),
    adaptiveModel,
    resolution: {
      defaultBranchId,
    },
    phases: Array.isArray(timeline.phases)
      ? timeline.phases
        .map((phase, index) => ({
          ...phase,
          order: typeof phase.order === 'number' ? phase.order : index,
          branchIds: Array.isArray(phase.branchIds) ? [...phase.branchIds] : [],
        }))
        .sort((left, right) => left.order - right.order)
      : [],
    analysisSources: Array.isArray(timeline.analysisSources)
      ? timeline.analysisSources.map((source) => ({ ...source }))
      : [],
    format: timeline.format || (timeline.adaptiveModel ? 'adaptive_damage' : 'legacy_flat'),
    schemaVersion: timeline.schemaVersion || (hasPhaseModel ? PHASE_AWARE_SCHEMA_VERSION : ADAPTIVE_SCHEMA_VERSION),
  } as T & Timeline;
}

export function createFlatTimelineCopy(timeline: TimelineLike): TimelineLike {
  const normalized = normalizeTimelineRecord(timeline);

  return {
    ...normalized,
    format: 'legacy_flat',
    adaptiveModel: null,
    resolution: null,
    actions: normalized.actions.map((action) =>
      cloneBossAction(action, {
        branchId: undefined,
        phaseId: action.phaseId,
        sourceKind: action.sourceKind || 'legacy_action',
      })
    ),
  };
}

export function prepareTimelineForStorage(timeline: TimelineLike): TimelineLike {
  const normalized = normalizeTimelineRecord(timeline);

  return {
    ...timeline,
    bossTags: timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []),
    bossId: timeline.bossId || timeline.bossTags?.[0] || null,
    actions: normalized.actions,
    adaptiveModel: normalized.adaptiveModel,
    resolution: normalized.resolution,
    phases: normalized.phases || [],
    analysisSources: normalized.analysisSources || [],
    format: normalized.format,
    schemaVersion: normalized.schemaVersion,
  };
}

export function applyEditedTimelineActions<T extends TimelineLike>(
  timeline: T,
  editedActions: BossAction[]
): T & Timeline {
  const normalized = normalizeTimelineRecord(timeline);
  const shouldPreserveAdaptiveModel =
    timeline.format === 'adaptive_damage'
    || Boolean(timeline.adaptiveModel?.branches?.length)
    || Boolean(timeline.phases?.length);
  const bossTags = normalized.bossTags || (normalized.bossId ? [normalized.bossId] : []);

  if (!shouldPreserveAdaptiveModel) {
    return normalizeTimelineRecord({
      ...normalized,
      bossTags,
      actions: sortActions(
        editedActions.map((action) =>
          cloneBossAction(action, {
            branchId: undefined,
            isPhaseAnchor: undefined,
          })
        )
      ),
      adaptiveModel: null,
      resolution: null,
      phases: [],
    } as T);
  }

  const defaultBranchId =
    normalized.resolution?.defaultBranchId
    || normalized.adaptiveModel?.branches?.[0]?.id
    || toLegacyBranchId(normalized);
  const baseActions = sortActions(
    editedActions.map((action) =>
      cloneBossAction(action, {
        branchId: defaultBranchId,
      })
    )
  );
  const actionsWithPhaseIds = inferMissingPhaseIds(baseActions, normalized.phases || []);
  const nextPhases = reconcilePhaseAnchors(normalized.phases || [], actionsWithPhaseIds, defaultBranchId);
  const phaseAnchorIds = new Set(nextPhases.map((phase) => phase.anchorActionId));
  const nextDefaultBranchEvents = sortActions(
    actionsWithPhaseIds.map((action) =>
      cloneBossAction(action, {
        branchId: defaultBranchId,
        isPhaseAnchor: phaseAnchorIds.has(action.id),
      })
    )
  );
  const existingBranches = normalized.adaptiveModel?.branches || [];
  const hasDefaultBranch = existingBranches.some((branch) => branch.id === defaultBranchId);
  const nextBranches = hasDefaultBranch
    ? existingBranches.map((branch) =>
        branch.id === defaultBranchId
          ? {
              ...branch,
              events: nextDefaultBranchEvents,
              eventCount: nextDefaultBranchEvents.length,
            }
          : branch
      )
    : [
        ...existingBranches,
        {
          id: defaultBranchId,
          label: 'Edited Route',
          description: 'User-edited default route.',
          isPrimaryBranch: true,
          eventCount: nextDefaultBranchEvents.length,
          events: nextDefaultBranchEvents,
        } as AdaptiveTimelineBranch,
      ];

  return normalizeTimelineRecord({
    ...normalized,
    bossTags,
    actions: nextDefaultBranchEvents,
    adaptiveModel: {
      ...(normalized.adaptiveModel || {}),
      branches: nextBranches,
    },
    resolution: {
      defaultBranchId,
    },
    phases: nextPhases,
  } as T);
}

export { processMultiHitTankBusterSequences };
