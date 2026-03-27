import { describe, expect, it, vi } from 'vitest';
import {
  HEAVYWEIGHT_BOSS_IDS,
  applyHeavyweightOfficialMigrationPlan,
  buildHeavyweightOfficialMigrationPlan,
  buildLocalHeavyweightOfficialMap,
} from './heavyweightOfficialTimelineMigrationUtils.js';

describe('migrateHeavyweightOfficialTimelines', () => {
  it('rewrites plans from remote official ids to stable local official ids', () => {
    const localOfficialMap = buildLocalHeavyweightOfficialMap(
      [
        { id: 'vamp-fatale-m9s', name: 'Vamp Fatale (M9S)' },
        { id: 'red-hot-deep-blue-m10s', name: 'Red Hot & Deep Blue (M10S)' },
        { id: 'the-tyrant-m11s', name: 'The Tyrant (M11S)' },
      ],
      (boss) => ({ name: `${boss.name} - Official Adaptive Timeline` })
    );

    const migrationPlan = buildHeavyweightOfficialMigrationPlan(
      [
        { id: 'remote-m9', official: true, bossId: 'vamp-fatale-m9s', name: 'Old M9 Official' },
        {
          id: 'remote-m10',
          official: true,
          bossId: 'red-hot-deep-blue-m10s',
          name: 'Old M10 Official',
        },
        { id: 'remote-m12', official: true, bossId: 'lindwurm-m12s', name: 'Old M12 Official' },
        { id: 'community', official: false, bossId: 'vamp-fatale-m9s', name: 'Community Route' },
      ],
      [
        { id: 'plan-1', sourceTimelineId: 'remote-m9' },
        { id: 'plan-2', sourceTimelineId: 'remote-m10' },
        { id: 'plan-4', sourceTimelineId: 'remote-m12' },
        { id: 'plan-3', sourceTimelineId: 'official-the-tyrant-m11s' },
      ],
      localOfficialMap
    );

    expect(HEAVYWEIGHT_BOSS_IDS).toEqual([
      'vamp-fatale-m9s',
      'red-hot-deep-blue-m10s',
      'the-tyrant-m11s',
    ]);
    expect(migrationPlan.planRewrites).toEqual([
      {
        planId: 'plan-1',
        bossId: 'vamp-fatale-m9s',
        fromTimelineId: 'remote-m9',
        toTimelineId: 'official-vamp-fatale-m9s',
        toTimelineName: 'Vamp Fatale (M9S) - Official Adaptive Timeline',
      },
      {
        planId: 'plan-2',
        bossId: 'red-hot-deep-blue-m10s',
        fromTimelineId: 'remote-m10',
        toTimelineId: 'official-red-hot-deep-blue-m10s',
        toTimelineName: 'Red Hot & Deep Blue (M10S) - Official Adaptive Timeline',
      },
    ]);
    expect(migrationPlan.timelineDeletes).toEqual([
      {
        timelineId: 'remote-m9',
        bossId: 'vamp-fatale-m9s',
        name: 'Old M9 Official',
      },
      {
        timelineId: 'remote-m10',
        bossId: 'red-hot-deep-blue-m10s',
        name: 'Old M10 Official',
      },
    ]);
    expect(migrationPlan.planRewrites.some((rewrite) => rewrite.planId === 'plan-4')).toBe(false);
    expect(migrationPlan.timelineDeletes.some((timeline) => timeline.timelineId === 'remote-m12')).toBe(false);
  });

  it('does not mutate records in dry-run mode', async () => {
    const updatePlanRecord = vi.fn();
    const deleteTimelineRecord = vi.fn();

    const summary = await applyHeavyweightOfficialMigrationPlan(
      {
        planRewrites: [
          {
            planId: 'plan-1',
            bossId: 'vamp-fatale-m9s',
            fromTimelineId: 'remote-m9',
            toTimelineId: 'official-vamp-fatale-m9s',
            toTimelineName: 'Vamp Fatale (M9S) - Official Adaptive Timeline',
          },
        ],
        timelineDeletes: [
          {
            timelineId: 'remote-m9',
            bossId: 'vamp-fatale-m9s',
            name: 'Old M9 Official',
          },
        ],
      },
      {
        dryRun: true,
        updatePlanRecord,
        deleteTimelineRecord,
        logger: { log: vi.fn() },
      }
    );

    expect(summary).toMatchObject({
      planRewrites: 1,
      timelineDeletes: 1,
      updatedPlans: 0,
      deletedTimelines: 0,
      dryRun: true,
    });
    expect(updatePlanRecord).not.toHaveBeenCalled();
    expect(deleteTimelineRecord).not.toHaveBeenCalled();
  });
});
