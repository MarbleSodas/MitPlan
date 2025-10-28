/**
 * Script to create official timelines in Firebase from boss data
 * 
 * This script migrates the predefined boss timelines to Firebase as official timelines.
 * Run this script once to populate the database with official timelines.
 * 
 * Usage: node scripts/createOfficialTimelines.js
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';
import { bosses } from '../src/data/bosses.js';
import { bossActionsMap } from '../src/data/bossActionsLibrary.js';

// Firebase configuration (use your actual config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

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

      // Get boss actions
      const actions = bossActionsMap[boss.id] || [];
      console.log(`  - Found ${actions.length} actions`);

      // Create timeline data
      const timelineData = {
        name: `${boss.name} - Official Timeline`,
        description: `Official timeline for ${boss.name} encounter`,
        bossId: boss.id,
        bossTags: [boss.id],
        actions: actions,
        official: true,
        isPublic: true,
        userId: 'system',
        ownerId: 'system',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 2.0
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

