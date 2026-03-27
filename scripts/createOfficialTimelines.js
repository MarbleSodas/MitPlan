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
import {
  buildOfficialTimelineData,
  loadCanonicalTimelineForBoss,
} from './officialTimelineUtils.js';




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

      const timelineDefinition = loadCanonicalTimelineForBoss(boss);
      const resolvedActions = Array.isArray(timelineDefinition.actions) ? timelineDefinition.actions : [];
      console.log(`  - Loaded ${resolvedActions.length} resolved actions`);

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
      const timelineData = buildOfficialTimelineData(boss, timelineDefinition);

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

