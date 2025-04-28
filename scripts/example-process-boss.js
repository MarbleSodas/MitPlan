#!/usr/bin/env node

/**
 * Example script to process boss logs and output the results
 * 
 * Usage:
 *   node scripts/example-process-boss.js <boss-name> <boss-id>
 * 
 * Example:
 *   node scripts/example-process-boss.js Ketuduke ketuduke
 */

import { processAndSaveBossLogs } from '../src/utils/logs/processLogFiles.js';
import path from 'path';

// Get boss name and ID from command line arguments
const bossName = process.argv[2];
const bossId = process.argv[3];

if (!bossName || !bossId) {
  console.error('Error: Missing required arguments');
  console.log('Usage: node scripts/example-process-boss.js <boss-name> <boss-id>');
  console.log('Example: node scripts/example-process-boss.js Ketuduke ketuduke');
  process.exit(1);
}

// Define output path
const outputPath = path.join('src', 'data', 'bosses', `${bossId}Actions.json`);

// Process the logs
console.log(`Processing logs for ${bossName} (${bossId})...`);
const bossActions = processAndSaveBossLogs(
  bossName,
  bossId,
  'logs',
  outputPath
);

// Print summary
console.log(`Processed ${bossActions.length} boss actions for ${bossName}`);
console.log(`Output saved to ${outputPath}`);

// Exit successfully
process.exit(0);
