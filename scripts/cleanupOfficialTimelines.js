/**
 * Script to cleanup and synchronize official timelines in Firebase
 *
 * This script ensures that:
 * 1. Each boss has exactly one official timeline.
 * 2. Official timelines match the local JSON definitions.
 * 3. Duplicate official timelines are removed.
 * 4. Non-official timelines are touched.
 *
 * Usage: node scripts/cleanupOfficialTimelines.js
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, remove, get, update } from 'firebase/database';
import { bosses } from '../src/data/bosses/bossData.js';

import { firebaseConfig } from './firebase-config.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const bossesDir = join(projectRoot, 'src', 'data', 'bosses');

// Map boss IDs to their corresponding actions JSON filenames
// Copied from createOfficialTimelines.js
const BOSS_JSON_MAP = {
  'sugar-riot': 'sugar-riot_actions.json',
  'dancing-green-m5s': 'dancing-green_actions.json',
  'lala': 'lala_actions.json',
  'statice': 'statice_actions.json',
  'brute-abominator-m7s': 'brute-abominator_actions.json',
  'howling-blade-m8s': 'howling-blade_actions.json',
  'necron': 'necron_actions.json',
  'ketuduke': 'ketudukeActions.json',
  'vamp-fatale-m9s': 'vamp-fatale_actions.json',
  'red-hot-deep-blue-m10s': 'red-hot-deep-blue_actions.json'
};

function loadActionsForBoss(bossId) {
  const filename = BOSS_JSON_MAP[bossId];
  if (!filename) {
    console.warn(`  [Warn] No JSON mapping found for bossId: ${bossId}, skipping content update`);
    return null;
  }
  const filePath = join(bossesDir, filename);
  if (!existsSync(filePath)) {
    console.warn(`  [Warn] JSON file not found: ${filePath}, skipping content update`);
    return null;
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    const actions = JSON.parse(content);
    if (!Array.isArray(actions)) {
      console.warn(`  [Warn] JSON did not contain an array for ${bossId}, got ${typeof actions}`);
      return null;
    }
    return actions;
  } catch (e) {
    console.warn(`  [Warn] Failed to load/parse actions for ${bossId}: ${e.message}`);
    return null;
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function cleanupOfficialTimelines() {
  console.log('Starting official timeline cleanup...');
  
  const timelinesRef = ref(database, 'timelines');
  
  // 1. Fetch all timelines
  console.log('Fetching all timelines from Firebase...');
  const snapshot = await get(timelinesRef);
  if (!snapshot.exists()) {
    console.log('No timelines found in database.');
    process.exit(0);
  }

  const allTimelines = [];
  snapshot.forEach(child => {
    allTimelines.push({
      key: child.key,
      ...child.val()
    });
  });
  console.log(`Found ${allTimelines.length} total timelines.`);

  // 2. Identify official timelines
  const officialTimelines = allTimelines.filter(t => t.official === true);
  console.log(`Found ${officialTimelines.length} official timelines.`);

  // 3. Group by bossId
  const officialByBossId = {};
  for (const t of officialTimelines) {
    const bId = t.bossId;
    if (!bId) {
      console.warn(`  [Warn] Official timeline ${t.key} has no bossId!`);
      continue; 
    }
    if (!officialByBossId[bId]) {
      officialByBossId[bId] = [];
    }
    officialByBossId[bId].push(t);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let errors = 0;

  // 4. Process each defined boss
  for (const boss of bosses) {
    console.log(`\nProcessing boss: ${boss.name} (${boss.id})`);
    
    // Load local actions
    const actions = loadActionsForBoss(boss.id);
    if (!actions) {
      console.log(`  - Skipping update for ${boss.id} due to missing/invalid local actions.`);
    }

    const existing = officialByBossId[boss.id] || [];
    console.log(`  - Found ${existing.length} existing official timelines for this boss.`);

    // Prepare the correct data object
    const timelineData = {
      name: `${boss.name} - Official Timeline`,
      description: `Official timeline for ${boss.name} encounter`,
      bossId: boss.id,
      bossTags: [boss.id],
      bossMetadata: {
        level: boss.level,
        name: boss.name,
        icon: boss.icon,
        description: boss.description,
        baseHealth: boss.baseHealth
      },
      actions: actions || [], // Use empty array if load failed but we still want to keep the timeline exist
      official: true,
      isPublic: true,
      userId: 'system',
      ownerId: 'system',
      updatedAt: Date.now(),
      version: 2.1
    };
    
    // If we loaded actions successfully, use them. If not, and we have existing data, we might want to preserve existing actions? 
    // The requirement is "accurate with the local official timelines". If local is missing, maybe we shouldn't wipe the DB actions?
    // Using `actions || []` means if local file is missing, we wipe the actions. 
    // Given the map check, `loadActionsForBoss` returns null if missing.
    // If `actions` is null, let's NOT update the actions field, to be safe.
    
    if (actions === null) {
        delete timelineData.actions;
    }

    if (existing.length === 0) {
      if (actions) {
        // CREATE NEW
        try {
          timelineData.createdAt = Date.now();
          const newRef = push(timelinesRef);
          await set(newRef, timelineData);
          console.log(`  ✓ Created new official timeline: ${newRef.key}`);
          createdCount++;
        } catch (e) {
          console.error(`  ✗ Error creating timeline: ${e.message}`);
          errors++;
        }
      } else {
        console.log(`  - No local actions and no existing timeline. Skipping creation.`);
      }
    } else {
      // HANDLE EXISTING (Single or Multiple)
      
      // Sort to keep the "oldest" or "first" one?
      // Let's keep the one with the earliest createdAt to preserve history if possible
      existing.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      const toKeep = existing[0];
      const toDelete = existing.slice(1);

      // Update the one to keep
      try {
        // We merge with existing createdAt if not present in new data (it isn't)
        const updatePayload = { ...timelineData };
        if (!updatePayload.createdAt) {
            // preserve original createdAt
            updatePayload.createdAt = toKeep.createdAt || Date.now();
        }

        await set(ref(database, `timelines/${toKeep.key}`), updatePayload);
        console.log(`  ✓ Updated timeline: ${toKeep.key}`);
        updatedCount++;
      } catch (e) {
        console.error(`  ✗ Error updating timeline ${toKeep.key}: ${e.message}`);
        errors++;
      }

      // Delete duplicates
      if (toDelete.length > 0) {
        console.log(`  - Deleting ${toDelete.length} duplicates...`);
        for (const dup of toDelete) {
          try {
            await remove(ref(database, `timelines/${dup.key}`));
            console.log(`    Deleted ${dup.key}`);
            deletedCount++;
          } catch (e) {
            console.error(`    ✗ Error deleting ${dup.key}: ${e.message}`);
            errors++;
          }
        }
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Deleted Duplicates: ${deletedCount}`);
  console.log(`Errors: ${errors}`);
  console.log('Done!');
  
  process.exit(errors > 0 ? 1 : 0);
}

cleanupOfficialTimelines().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
