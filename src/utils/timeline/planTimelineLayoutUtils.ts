import { baseHealthValues, bosses } from '../../data';
import type {
  BaseHealthValues,
} from '../../data';
import type {
  BossMetadata,
  Plan,
  PlanTimelineHealthConfig,
  PlanTimelineLayout,
  Timeline,
} from '../../types';
import { normalizeTimelineRecord } from './adaptiveTimelineUtils';

const DEFAULT_BASE_HEALTH: BaseHealthValues = {
  party: 143000,
  tank: 225000,
};

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getTimelineBaseHealthDefaults({
  bossId,
  bossMetadata,
}: {
  bossId?: string | null;
  bossMetadata?: BossMetadata | null;
}): BaseHealthValues {
  if (bossMetadata?.baseHealth?.party && bossMetadata?.baseHealth?.tank) {
    return bossMetadata.baseHealth;
  }

  const currentBoss = bossId
    ? bosses.find((boss) => boss.id === bossId) || null
    : null;
  if (currentBoss?.baseHealth) {
    return currentBoss.baseHealth;
  }

  const bossLevel = bossMetadata?.level;
  if (bossLevel && baseHealthValues[bossLevel]) {
    return baseHealthValues[bossLevel];
  }

  return DEFAULT_BASE_HEALTH;
}

function normalizeHealthConfig(
  layout: Partial<PlanTimelineLayout> & { bossId?: string | null; bossMetadata?: BossMetadata | null }
): PlanTimelineHealthConfig {
  const baseHealth = getTimelineBaseHealthDefaults({
    bossId: layout.bossId,
    bossMetadata: layout.bossMetadata,
  });
  const defaultTank = toPositiveNumber(layout.healthConfig?.defaultTank) ?? baseHealth.tank;

  return {
    party: toPositiveNumber(layout.healthConfig?.party) ?? baseHealth.party,
    defaultTank,
    mainTank: toPositiveNumber(layout.healthConfig?.mainTank) ?? defaultTank,
    offTank: toPositiveNumber(layout.healthConfig?.offTank) ?? defaultTank,
  };
}

export function normalizePlanTimelineLayout(
  timelineLayout: Partial<PlanTimelineLayout> | null | undefined
): PlanTimelineLayout | null {
  if (!timelineLayout) {
    return null;
  }

  const normalizedTimeline = normalizeTimelineRecord(
    timelineLayout as Partial<Timeline> & { healthConfig?: PlanTimelineHealthConfig }
  );
  const healthConfig = normalizeHealthConfig(normalizedTimeline);

  return {
    bossId: normalizedTimeline.bossId || null,
    bossTags: normalizedTimeline.bossTags || (normalizedTimeline.bossId ? [normalizedTimeline.bossId] : []),
    bossMetadata: normalizedTimeline.bossMetadata || null,
    actions: normalizedTimeline.actions || [],
    adaptiveModel: normalizedTimeline.adaptiveModel || null,
    resolution: normalizedTimeline.resolution || null,
    phases: normalizedTimeline.phases || [],
    analysisSources: normalizedTimeline.analysisSources || [],
    schemaVersion: normalizedTimeline.schemaVersion,
    format: normalizedTimeline.format,
    description: normalizedTimeline.description || '',
    guideSources: normalizedTimeline.guideSources || [],
    healthConfig,
  };
}

export function createPlanTimelineLayoutFromTimeline(
  timeline: Partial<Timeline>,
  overrides: Partial<Pick<PlanTimelineHealthConfig, 'party' | 'mainTank' | 'offTank'>> = {}
): PlanTimelineLayout {
  const normalizedTimeline = normalizeTimelineRecord(timeline);
  const baseHealth = getTimelineBaseHealthDefaults({
    bossId: normalizedTimeline.bossId,
    bossMetadata: normalizedTimeline.bossMetadata,
  });

  return normalizePlanTimelineLayout({
    ...normalizedTimeline,
    healthConfig: {
      party: overrides.party ?? baseHealth.party,
      defaultTank: baseHealth.tank,
      mainTank: overrides.mainTank ?? baseHealth.tank,
      offTank: overrides.offTank ?? baseHealth.tank,
    },
  }) as PlanTimelineLayout;
}

export function createPlanTimelineLayoutFromLegacyPlan(
  timeline: Partial<Timeline>,
  legacyHealthSettings: Record<string, unknown> | null | undefined
): PlanTimelineLayout {
  const tankMaxHealth = (legacyHealthSettings?.tankMaxHealth || {}) as Record<string, unknown>;

  return createPlanTimelineLayoutFromTimeline(timeline, {
    party: toPositiveNumber(legacyHealthSettings?.partyMinHealth),
    mainTank: toPositiveNumber(tankMaxHealth.mainTank),
    offTank: toPositiveNumber(tankMaxHealth.offTank),
  });
}

export function getPlanTimelineMirrorFields(timelineLayout: PlanTimelineLayout | null) {
  if (!timelineLayout) {
    return {
      timelineLayout: null,
      bossId: null,
      bossTags: [],
      bossMetadata: null,
    };
  }

  return {
    timelineLayout,
    bossId: timelineLayout.bossId || null,
    bossTags: timelineLayout.bossTags || (timelineLayout.bossId ? [timelineLayout.bossId] : []),
    bossMetadata: timelineLayout.bossMetadata || null,
  };
}

export function getPlanTimelineLayout(plan: Partial<Plan> | null | undefined): PlanTimelineLayout | null {
  return normalizePlanTimelineLayout(plan?.timelineLayout || null);
}
