#!/usr/bin/env node

/**
 * Command-line script to process FFXIV log CSV files and extract boss action data
 * 
 * Usage:
 *   node scripts/process-logs.js --boss=Ketuduke --id=ketuduke --output=src/data/bosses/processedActions.json
 * 
 * Options:
 *   --boss     The name of the boss as it appears in the log files (e.g., 'Ketuduke')
 *   --id       The ID of the boss used in the application (e.g., 'ketuduke')
 *   --logs     The directory containing the log files (default: 'logs')
 *   --output   Path to save the JSON file (optional)
 */

import { processAndSaveBossLogs } from '../src/utils/logs/processLogFiles.js';
import fs from 'fs';
import path from 'path';

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key && value) {
    options[key.replace(/^--/, '')] = value;
  }
});

// Check for required arguments
if (!options.boss || !options.id) {
  console.error('Error: Missing required arguments');
  console.log('Usage: node scripts/process-logs.js --boss=Ketuduke --id=ketuduke --output=src/data/bosses/processedActions.json');
  process.exit(1);
}

// Set default values
const logsDir = options.logs || 'logs';
const outputPath = options.output || null;

// Create output directory if it doesn't exist
if (outputPath) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

// Process the logs
console.log(`Processing logs for ${options.boss} (${options.id})...`);
const bossActions = processAndSaveBossLogs(
  options.boss,
  options.id,
  logsDir,
  outputPath
);

// Print summary
console.log(`Processed ${bossActions.length} boss actions`);

if (!outputPath) {
  // If no output path was provided, print the JSON to stdout
  console.log(JSON.stringify(bossActions, null, 2));
}

// Exit successfully
process.exit(0);
