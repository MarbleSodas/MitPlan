import type {
  AdaptiveTimelineBranch,
  BossAction,
  PhaseOverride,
  ResolvedTimelinePhaseSummary,
  Timeline,
  TimelinePhase,
} from '../../types';
import { normalizeTimelineRecord } from './adaptiveTimelineUtils';
import { resolvePhaseAwareTimeline } from './phaseOverrideResolver';

type TimelineLike = Partial<Timeline> & { actions?: BossAction[] };

export interface ComposedPlanTimeline {
  actions: BossAction[];
  skippedActions: BossAction[];
  phaseSummaries: ResolvedTimelinePhaseSummary[];
  phases: TimelinePhase[];
  hasOverrideSupport: boolean;
  hasOverrides: boolean;
  routeId: string;
  requestedRouteId: string | null;
  usedRouteFallback: boolean;
}

function selectRoute(
  timeline: Timeline,
  requestedRouteId?: string | null
): { branch: AdaptiveTimelineBranch | null; routeId: string; usedRouteFallback: boolean } {
  const branches = timeline.adaptiveModel?.branches || [];
  const requested = requestedRouteId || null;
  const requestedBranch = requested
    ? branches.find((branch) => branch.id === requested) || null
    : null;
  const defaultBranch = branches.find(
    (branch) => branch.id === timeline.resolution?.defaultBranchId
  ) || branches[0] || null;
  const branch = requestedBranch || defaultBranch;

  return {
    branch,
    routeId: branch?.id || timeline.resolution?.defaultBranchId || requested || 'default',
    usedRouteFallback: Boolean(requested && !requestedBranch),
  };
}

function mergeCustomEvents(
  branch: AdaptiveTimelineBranch,
  customEvents: BossAction[]
): AdaptiveTimelineBranch {
  const events = new Map<string, BossAction>();
  branch.events.forEach((event) => events.set(event.id, { ...event }));
  customEvents.forEach((event) => {
    events.set(event.id, {
      ...event,
      isCustom: true,
      branchId: event.branchId || branch.id,
      sourceKind: event.sourceKind || 'plan_custom',
    });
  });

  const mergedEvents = [...events.values()].sort((left, right) => (
    left.time === right.time
      ? left.name.localeCompare(right.name)
      : left.time - right.time
  ));

  return {
    ...branch,
    events: mergedEvents,
    eventCount: mergedEvents.length,
  };
}

/**
 * Composes a plan's immutable timeline version with its selected route and
 * plan-owned overlays. Legacy flat timelines are normalized into a single
 * route first, so old and new plans share one runtime path.
 */
export function composePlanTimeline(
  timeline: TimelineLike,
  {
    routeId,
    phaseOverrides = {},
    customEvents = [],
  }: {
    routeId?: string | null;
    phaseOverrides?: Record<string, PhaseOverride> | null;
    customEvents?: BossAction[] | null;
  } = {}
): ComposedPlanTimeline {
  const normalized = normalizeTimelineRecord(timeline as Timeline);
  const selected = selectRoute(normalized, routeId);
  const branches = normalized.adaptiveModel?.branches || [];
  const composedBranches = selected.branch
    ? branches.map((branch) => (
      branch.id === selected.branch?.id
        ? mergeCustomEvents(branch, customEvents || [])
        : branch
    ))
    : branches;
  const resolved = resolvePhaseAwareTimeline({
    ...normalized,
    adaptiveModel: { branches: composedBranches },
    resolution: { defaultBranchId: selected.routeId },
  }, phaseOverrides);

  return {
    ...resolved,
    routeId: selected.routeId,
    requestedRouteId: routeId || null,
    usedRouteFallback: selected.usedRouteFallback,
  };
}
