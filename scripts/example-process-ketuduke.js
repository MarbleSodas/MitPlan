#!/usr/bin/env node

/**
 * Example script to process Ketuduke logs and output the results
 */

import { processAndSaveBossLogs } from '../src/utils/logs/processLogFiles.js';

// Process Ketuduke logs
console.log('Processing Ketuduke logs...');
const bossActions = processAndSaveBossLogs(
  'Ketuduke',
  'ketuduke',
  'logs',
  'src/data/bosses/ketudukeActions.json'
);

// Print summary
console.log(`Processed ${bossActions.length} boss actions for Ketuduke`);
console.log('Output saved to src/data/bosses/ketudukeActions.json');

// Exit successfully
process.exit(0);
