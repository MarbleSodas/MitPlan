/**
 * Rewrite heavyweight plans off stale Firebase official timeline IDs and remove
 * the remote official documents after local canonical timelines take over.
 *
 * Usage:
 *   node scripts/migrateHeavyweightOfficialTimelines.js        # dry run
 *   node scripts/migrateHeavyweightOfficialTimelines.js --apply
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, get, ref, remove, update } from 'firebase/database';
import { firebaseConfig } from './firebase-config.js';
import {
  applyHeavyweightOfficialMigrationPlan,
  buildHeavyweightOfficialMigrationPlan,
  buildLocalHeavyweightOfficialMap,
} from './heavyweightOfficialTimelineMigrationUtils.js';

async function readCollection(database, path) {
  const snapshot = await get(ref(database, path));
  if (!snapshot.exists()) {
    return [];
  }

  const records = [];
  snapshot.forEach((child) => {
    records.push({
      key: child.key,
      id: child.key,
      ...child.val(),
    });
  });
  return records;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  const [timelines, plans] = await Promise.all([
    readCollection(database, 'timelines'),
    readCollection(database, 'plans'),
  ]);

  const localOfficialMap = buildLocalHeavyweightOfficialMap();
  const migrationPlan = buildHeavyweightOfficialMigrationPlan(
    timelines,
    plans,
    localOfficialMap
  );

  const summary = await applyHeavyweightOfficialMigrationPlan(migrationPlan, {
    dryRun,
    logger: console,
    updatePlanRecord: async (rewrite) => {
      await update(ref(database, `plans/${rewrite.planId}`), {
        sourceTimelineId: rewrite.toTimelineId,
        sourceTimelineName: rewrite.toTimelineName,
        updatedAt: Date.now(),
      });
    },
    deleteTimelineRecord: async (timeline) => {
      await remove(ref(database, `timelines/${timeline.timelineId}`));
    },
  });

  console.log('\nSummary');
  console.log(`  Updated plans: ${summary.updatedPlans}/${summary.planRewrites}`);
  console.log(`  Deleted timelines: ${summary.deletedTimelines}/${summary.timelineDeletes}`);
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch((error) => {
    console.error('Heavyweight official migration failed:', error);
    process.exit(1);
  });
}
