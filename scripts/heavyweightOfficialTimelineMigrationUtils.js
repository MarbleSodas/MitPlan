import { bosses } from '../src/data/bosses/bossData.js';
import { loadCanonicalTimelineForBoss } from './officialTimelineUtils.js';

export const HEAVYWEIGHT_BOSS_IDS = [
  'vamp-fatale-m9s',
  'red-hot-deep-blue-m10s',
  'the-tyrant-m11s',
];

export function buildLocalHeavyweightOfficialMap(
  bossDefinitions = bosses,
  loadTimeline = loadCanonicalTimelineForBoss
) {
  return Object.fromEntries(
    bossDefinitions
      .filter((boss) => HEAVYWEIGHT_BOSS_IDS.includes(boss.id))
      .map((boss) => {
        const timeline = loadTimeline(boss);
        return [
          boss.id,
          {
            bossId: boss.id,
            timelineId: `official-${boss.id}`,
            timelineName: timeline.name || `${boss.name} - Official Timeline`,
          },
        ];
      })
  );
}

export function collectRemoteHeavyweightOfficialTimelines(
  timelines,
  heavyweightBossIds = HEAVYWEIGHT_BOSS_IDS
) {
  const bossIdSet = new Set(heavyweightBossIds);

  return timelines.filter(
    (timeline) => timeline?.official === true && bossIdSet.has(timeline.bossId)
  );
}

export function buildHeavyweightPlanRewrites(plans, remoteOfficialTimelines, localOfficialMap) {
  const remoteOfficialById = new Map(
    remoteOfficialTimelines.map((timeline) => [timeline.id || timeline.key, timeline])
  );

  return plans.flatMap((plan) => {
    const sourceTimelineId = plan?.sourceTimelineId;
    if (!sourceTimelineId || !remoteOfficialById.has(sourceTimelineId)) {
      return [];
    }

    const remoteTimeline = remoteOfficialById.get(sourceTimelineId);
    const localOfficial = localOfficialMap[remoteTimeline.bossId];
    if (!localOfficial) {
      return [];
    }

    if (sourceTimelineId === localOfficial.timelineId) {
      return [];
    }

    return [
      {
        planId: plan.id || plan.key,
        bossId: remoteTimeline.bossId,
        fromTimelineId: sourceTimelineId,
        toTimelineId: localOfficial.timelineId,
        toTimelineName: localOfficial.timelineName,
      },
    ];
  });
}

export function buildHeavyweightOfficialMigrationPlan(
  timelines,
  plans,
  localOfficialMap
) {
  const remoteOfficialTimelines = collectRemoteHeavyweightOfficialTimelines(timelines);
  const planRewrites = buildHeavyweightPlanRewrites(
    plans,
    remoteOfficialTimelines,
    localOfficialMap
  );

  return {
    remoteOfficialTimelines,
    planRewrites,
    timelineDeletes: remoteOfficialTimelines.map((timeline) => ({
      timelineId: timeline.id || timeline.key,
      bossId: timeline.bossId,
      name: timeline.name || '',
    })),
  };
}

export async function applyHeavyweightOfficialMigrationPlan(
  migrationPlan,
  {
    dryRun = true,
    updatePlanRecord,
    deleteTimelineRecord,
    logger = console,
  }
) {
  const summary = {
    planRewrites: migrationPlan.planRewrites.length,
    timelineDeletes: migrationPlan.timelineDeletes.length,
    updatedPlans: 0,
    deletedTimelines: 0,
    dryRun,
  };

  logger.log(`Heavyweight official migration (${dryRun ? 'dry run' : 'apply'})`);
  logger.log(`  - Plans to rewrite: ${summary.planRewrites}`);
  logger.log(`  - Remote officials to delete: ${summary.timelineDeletes}`);

  migrationPlan.planRewrites.forEach((rewrite) => {
    logger.log(
      `  - Plan ${rewrite.planId}: ${rewrite.fromTimelineId} -> ${rewrite.toTimelineId}`
    );
  });

  migrationPlan.timelineDeletes.forEach((timeline) => {
    logger.log(`  - Delete remote official ${timeline.timelineId} (${timeline.bossId})`);
  });

  if (dryRun) {
    return summary;
  }

  if (!updatePlanRecord || !deleteTimelineRecord) {
    throw new Error('Apply mode requires updatePlanRecord and deleteTimelineRecord handlers.');
  }

  for (const rewrite of migrationPlan.planRewrites) {
    await updatePlanRecord(rewrite);
    summary.updatedPlans += 1;
  }

  for (const timeline of migrationPlan.timelineDeletes) {
    await deleteTimelineRecord(timeline);
    summary.deletedTimelines += 1;
  }

  return summary;
}
