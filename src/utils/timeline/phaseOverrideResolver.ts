import type {
  BossAction,
  PhaseOverride,
  ResolvedTimelinePhaseSummary,
  Timeline,
  TimelinePhase,
} from '../../types';
import { syncBossActionMetadataWithClassification } from '../boss/bossActionUtils';
import { normalizeTimelineRecord } from './adaptiveTimelineUtils';

type TimelineLike = Partial<Timeline> & {
  actions?: BossAction[];
};

export interface ResolvedPhaseAwareTimeline {
  actions: BossAction[];
  skippedActions: BossAction[];
  phaseSummaries: ResolvedTimelinePhaseSummary[];
  phases: TimelinePhase[];
  hasOverrideSupport: boolean;
  hasOverrides: boolean;
}

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

function isFiniteTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toRoundedTime(value: number): number {
  return Number(value.toFixed(3));
}

function normalizePhases(
  timeline: Timeline,
  canonicalActions: BossAction[]
): TimelinePhase[] {
  const fallbackBranchId = timeline.resolution?.defaultBranchId;
  const validActionIds = new Set(canonicalActions.map((action) => action.id));

  return [...(timeline.phases || [])]
    .filter((phase) => phase && validActionIds.has(phase.anchorActionId))
    .map((phase, index) => ({
      ...phase,
      order: typeof phase.order === 'number' ? phase.order : index,
      branchIds: Array.isArray(phase.branchIds) && phase.branchIds.length > 0
        ? phase.branchIds
        : fallbackBranchId
          ? [fallbackBranchId]
          : [],
      source: phase.source || 'manual',
      skipWindowMode: phase.skipWindowMode || 'hide_pre_anchor',
    }))
    .sort((left, right) => left.order - right.order);
}

export function resolvePhaseAwareTimeline(
  timeline: TimelineLike,
  phaseOverrides: Record<string, PhaseOverride> | null | undefined = null
): ResolvedPhaseAwareTimeline {
  const normalizedTimeline = normalizeTimelineRecord(timeline as Timeline);
  const canonicalActions = sortActions(
    (normalizedTimeline.actions || []).map((action) =>
      cloneBossAction(action, { hiddenByPhaseOverride: false })
    )
  );
  const phases = normalizePhases(normalizedTimeline, canonicalActions);
  const hasOverrideSupport = phases.length > 0;
  const hasOverrides = Boolean(phaseOverrides && Object.keys(phaseOverrides).length > 0);

  if (!hasOverrideSupport) {
    return {
      actions: canonicalActions,
      skippedActions: [],
      phaseSummaries: [],
      phases: [],
      hasOverrideSupport,
      hasOverrides,
    };
  }

  const canonicalActionById = new Map(canonicalActions.map((action) => [action.id, action]));
  const phaseIndexById = new Map(phases.map((phase, index) => [phase.id, index]));
  const effectiveOffsetByPhaseId = new Map<string, number>();
  const phaseSummaries: ResolvedTimelinePhaseSummary[] = [];

  let inheritedOffset = 0;
  for (const phase of phases) {
    const anchorAction = canonicalActionById.get(phase.anchorActionId);
    const canonicalStartTime = anchorAction?.time ?? null;
    const overrideStartTime = phaseOverrides?.[phase.id]?.startTime;
    const overrideIsValid = canonicalStartTime !== null && isFiniteTime(overrideStartTime);
    const effectiveOffset = overrideIsValid
      ? toRoundedTime(overrideStartTime - canonicalStartTime)
      : inheritedOffset;
    const effectiveStartTime =
      canonicalStartTime === null ? null : toRoundedTime(canonicalStartTime + effectiveOffset);

    effectiveOffsetByPhaseId.set(phase.id, effectiveOffset);
    phaseSummaries.push({
      phaseId: phase.id,
      phaseName: phase.name,
      order: phase.order,
      anchorActionId: phase.anchorActionId,
      canonicalStartTime,
      effectiveStartTime,
      inheritedOffset,
      effectiveOffset,
      overrideStartTime: overrideIsValid ? overrideStartTime : null,
      hiddenActionCount: 0,
    });
    inheritedOffset = effectiveOffset;
  }

  const shiftedActions = sortActions(
    canonicalActions.map((action) => {
      const actionPhaseId = action.phaseId;
      const phaseOffset = actionPhaseId
        ? effectiveOffsetByPhaseId.get(actionPhaseId)
        : undefined;

      if (phaseOffset === undefined) {
        return cloneBossAction(action, { hiddenByPhaseOverride: false });
      }

      return cloneBossAction(action, {
        time: toRoundedTime(action.time + phaseOffset),
        hiddenByPhaseOverride: false,
      });
    })
  );

  const hiddenActionIds = new Set<string>();

  phaseSummaries.forEach((summary, index) => {
    const phase = phases[index];
    if (!phase || summary.effectiveStartTime === null) {
      return;
    }

    const movedEarlier = summary.effectiveOffset < summary.inheritedOffset;
    if (!movedEarlier || phase.skipWindowMode !== 'hide_pre_anchor') {
      return;
    }

    let hiddenCount = 0;

    shiftedActions.forEach((action) => {
      const actionPhaseIndex =
        action.phaseId === undefined ? undefined : phaseIndexById.get(action.phaseId);

      if (actionPhaseIndex === undefined || actionPhaseIndex >= index) {
        return;
      }

      if (!action.skipEligible || action.time < summary.effectiveStartTime) {
        return;
      }

      hiddenActionIds.add(action.id);
      hiddenCount += 1;
    });

    summary.hiddenActionCount = hiddenCount;
  });

  const visibleActions = sortActions(
    shiftedActions
      .filter((action) => !hiddenActionIds.has(action.id))
      .map((action) => cloneBossAction(action, { hiddenByPhaseOverride: false }))
  );

  const skippedActions = sortActions(
    shiftedActions
      .filter((action) => hiddenActionIds.has(action.id))
      .map((action) => cloneBossAction(action, { hiddenByPhaseOverride: true }))
  );

  return {
    actions: visibleActions,
    skippedActions,
    phaseSummaries,
    phases,
    hasOverrideSupport,
    hasOverrides,
  };
}
