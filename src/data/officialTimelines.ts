import type { BossAction, Timeline } from '../types';
import { bosses } from './bosses/bossData';
import { bossActionsMap } from './bosses/bossActions';
import { getOfficialAdaptiveTimeline } from './timelines';
import { normalizeTimelineRecord } from '../utils/timeline/adaptiveTimelineUtils';

const OFFICIAL_TIMELINE_ID_PREFIX = 'official-';
const OFFICIAL_TIMELINE_PUBLISHED_AT = Date.UTC(2026, 2, 22, 0, 0, 0);

function cloneBossActions(actions: BossAction[] = []): BossAction[] {
  return actions.map((action) => ({
    ...action,
    sourceAbilities: [...(action.sourceAbilities || [])],
  }));
}

export function buildOfficialTimelineId(bossId: string): string {
  return `${OFFICIAL_TIMELINE_ID_PREFIX}${bossId}`;
}

function buildLegacyOfficialTimeline(bossId: string): Timeline | null {
  const boss = bosses.find((entry) => entry.id === bossId);
  const actions = cloneBossActions(bossActionsMap[bossId] || []);

  if (!boss || actions.length === 0) {
    return null;
  }

  return normalizeTimelineRecord({
    id: buildOfficialTimelineId(boss.id),
    name: `${boss.name} - Official Timeline`,
    description: `Official local timeline for ${boss.name}.`,
    bossId: boss.id,
    bossTags: [boss.id],
    bossMetadata: {
      level: boss.level,
      name: boss.name,
      icon: boss.icon,
      description: boss.description,
      baseHealth: boss.baseHealth,
    },
    userId: 'system',
    ownerId: 'system',
    actions,
    isPublic: true,
    official: true,
    createdAt: OFFICIAL_TIMELINE_PUBLISHED_AT,
    updatedAt: OFFICIAL_TIMELINE_PUBLISHED_AT,
    version: 2.1,
    likeCount: 0,
    likedBy: {},
    format: 'legacy_flat',
    schemaVersion: 1,
  });
}

function buildOfficialTimelineForBoss(bossId: string): Timeline | null {
  const adaptiveTimeline = getOfficialAdaptiveTimeline(bossId);
  if (adaptiveTimeline) {
    return normalizeTimelineRecord({
      ...adaptiveTimeline,
      id: buildOfficialTimelineId(bossId),
      userId: 'system',
      ownerId: 'system',
      isPublic: true,
      official: true,
      createdAt: OFFICIAL_TIMELINE_PUBLISHED_AT,
      updatedAt: OFFICIAL_TIMELINE_PUBLISHED_AT,
      likeCount: 0,
      likedBy: {},
      version: adaptiveTimeline.format === 'adaptive_damage' ? 3.0 : 2.1,
    });
  }

  return buildLegacyOfficialTimeline(bossId);
}

const officialLocalTimelineEntries = bosses
  .map((boss) => {
    const timeline = buildOfficialTimelineForBoss(boss.id);
    return timeline ? ([boss.id, timeline] as const) : null;
  })
  .filter((entry): entry is readonly [string, Timeline] => entry !== null);

export const officialLocalTimelinesByBossId = Object.fromEntries(
  officialLocalTimelineEntries
) as Record<string, Timeline>;

export const officialLocalTimelinesById = Object.fromEntries(
  officialLocalTimelineEntries.map(([, timeline]) => [timeline.id, timeline])
) as Record<string, Timeline>;

export const officialLocalTimelines = Object.values(officialLocalTimelinesById).sort((left, right) =>
  (left.name || '').localeCompare(right.name || '')
);

export function getOfficialLocalTimelineById(timelineId: string): Timeline | null {
  return officialLocalTimelinesById[timelineId] || null;
}

export function getOfficialLocalTimelineByBossId(bossId: string): Timeline | null {
  return officialLocalTimelinesByBossId[bossId] || null;
}

export function isOfficialLocalTimelineId(timelineId: string): boolean {
  return Boolean(getOfficialLocalTimelineById(timelineId));
}
