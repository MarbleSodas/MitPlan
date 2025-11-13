/**
 * Script to create official timelines in Firebase from boss data
 *
 * This script migrates the predefined boss timelines to Firebase as official timelines.
 * Run this script once to populate the database with official timelines.
 *
 * Usage: node scripts/createOfficialTimelines.js
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, query, orderByChild, equalTo, get } from 'firebase/database';
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
const BOSS_JSON_MAP = {
  'sugar-riot': 'sugar-riot_actions.json',
  'dancing-green-m5s': 'dancing-green_actions.json',
  'lala': 'lala_actions.json',
  'statice': 'statice_actions.json',
  'brute-abominator-m7s': 'brute-abominator_actions.json',
  'howling-blade-m8s': 'howling-blade_actions.json',
  'necron': 'necron_actions.json',
  'ketuduke': 'ketudukeActions.json'
};

function loadActionsForBoss(bossId) {
  const filename = BOSS_JSON_MAP[bossId];
  if (!filename) {
    console.warn(`  - No JSON mapping found for bossId: ${bossId}, skipping`);
    return [];
  }
  const filePath = join(bossesDir, filename);
  if (!existsSync(filePath)) {
    console.warn(`  - JSON file not found: ${filePath}, skipping`);
    return [];
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    const actions = JSON.parse(content);
    if (!Array.isArray(actions)) {
      console.warn(`  - JSON did not contain an array for ${bossId}, got ${typeof actions}`);
      return [];
    }
    return actions;
  } catch (e) {
    console.warn(`  - Failed to load/parse actions for ${bossId}: ${e.message}`);
    return [];
  }
}




// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Create official timelines for all bosses
 */
async function createOfficialTimelines() {
  console.log('Starting official timeline creation...');
  console.log(`Found ${bosses.length} bosses to process`);

  const timelinesRef = ref(database, 'timelines');
  let successCount = 0;
  let errorCount = 0;

  for (const boss of bosses) {
    try {
      console.log(`\nProcessing boss: ${boss.name} (${boss.id})`);

      // Load boss actions from JSON files
      const actions = loadActionsForBoss(boss.id);
      console.log(`  - Loaded ${actions.length} actions from JSON`);

      // Skip if an official timeline for this boss already exists
      try {
        const existingForBossQuery = query(timelinesRef, orderByChild('bossId'), equalTo(boss.id));
        const existingSnap = await get(existingForBossQuery);
        let alreadyExists = false;
        if (existingSnap.exists()) {
          existingSnap.forEach(childSnap => {
            const val = childSnap.val();
            if (val && val.official === true) {
              alreadyExists = true;
            }
          });
        }
        if (alreadyExists) {
          console.log('  - Official timeline already exists, skipping');
          continue;
        }
      } catch (e) {
        console.warn('  - Could not check for existing timeline, proceeding:', e.message);
      }

      // Create timeline data
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
        actions: actions,
        official: true,
        isPublic: true,
        userId: 'system',
        ownerId: 'system',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 2.1
      };

      // Create a new timeline with auto-generated ID
      const newTimelineRef = push(timelinesRef);
      await set(newTimelineRef, timelineData);

      console.log(`  ✓ Created official timeline: ${newTimelineRef.key}`);
      successCount++;

    } catch (error) {
      console.error(`  ✗ Error creating timeline for ${boss.name}:`, error);
      errorCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Successfully created: ${successCount} timelines`);
  console.log(`Errors: ${errorCount}`);
  console.log('Done!');

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run the script
createOfficialTimelines().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

