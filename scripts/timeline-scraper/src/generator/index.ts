/**
 * Timeline Generator
 *
 * Main orchestration for generating MitPlan timelines from:
 * - FFLogs reports (for damage data)
 * - Cactbot timelines (for timing and mechanic identification)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FFLogsClient } from '../sources/fflogs/client.js';
import { getAccessToken, clearCachedToken } from '../sources/fflogs/auth.js';
import { parseFFLogsEvents, extractBossEnemy } from '../sources/fflogs/parser.js';
import {
  loadCactbotTimeline,
  mergeCactbotWithFFLogs,
} from '../sources/cactbot/parser.js';
import { getBossMapping, createConfig } from '../config/index.js';
import type {
  BossAction,
  TimelineData,
  FFLogsEnemy,
  TimelineReport,
  AggregationStrategy,
} from '../types/index.js';
import { dedupeAoEActions } from '../utils/damage.js';
import { discoverRecentReports } from '../sources/fflogs/discover.js';
import { normalizeTimeline, alignWithCactbot } from './normalizer.js';
import { aggregateTimelines, aggregateWithCactbot } from './aggregator.js';

export interface GenerateOptions {
  bossId: string;
  reportCodes: string[];
  output?: string;
  useCactbot?: boolean;
  includeDodgeable?: boolean;
  dedupeAoE?: boolean;
  dryRun?: boolean;
  minFightDuration?: number; // Minimum fight duration in seconds
}

export interface AutoGenerateOptions {
  bossId: string;
  reportCodes?: string[]; // Optional: specific report codes to use (if omitted, auto-discovers)
  count?: number; // Number of recent reports to fetch when auto-discovering
  output?: string;
  useCactbot?: boolean;
  includeDodgeable?: boolean;
  dedupeAoE?: boolean;
  dryRun?: boolean;
  minFightDuration?: number;
  aggregate?: AggregationStrategy; // Aggregation strategy
  referenceAction?: string; // Reference action for time=0
  phaseGap?: number; // Phase gap threshold in seconds
  detectPhases?: boolean; // Enable/disable phase detection
}

export interface GenerateResult {
  success: boolean;
  bossId: string;
  actions: BossAction[];
  reportsUsed: string[];
  cactbotUsed: boolean;
  outputPath?: string;
  errors: string[];
}

/**
 * Generate a timeline from FFLogs reports
 */
export async function generateTimeline(options: GenerateOptions): Promise<GenerateResult> {
  const result: GenerateResult = {
    success: false,
    bossId: options.bossId,
    actions: [],
    reportsUsed: [],
    cactbotUsed: false,
    errors: [],
  };

  try {
    const config = createConfig();
    const bossMapping = getBossMapping(options.bossId);

    if (!bossMapping) {
      result.errors.push(`Unknown boss ID: ${options.bossId}`);
      return result;
    }

    // Authenticate with FFLogs
    console.log('Authenticating with FFLogs...');
    const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
    const client = new FFLogsClient({ accessToken });

    // Parse each report
    let allFFLogsActions: BossAction[] = [];

    for (const reportCode of options.reportCodes) {
      try {
        console.log(`Fetching report: ${reportCode}`);
        const report = await client.getReport(reportCode);

        // Find the appropriate fight
        const fights = client.findFightsByBoss(report.fights, bossMapping.zoneId || 0);
        const killFights = client.findKillFights(fights);

        if (killFights.length === 0) {
          result.errors.push(`No kill fights found for ${options.bossId} in report ${reportCode}`);
          continue;
        }

        // Use the longest kill fight
        const fight = killFights.sort((a, b) =>
          (b.endTime - b.startTime) - (a.endTime - a.startTime)
        )[0];

        // Check minimum duration
        const fightDuration = (fight.endTime - fight.startTime) / 1000;
        if (options.minFightDuration && fightDuration < options.minFightDuration) {
          result.errors.push(
            `Fight duration (${Math.round(fightDuration)}s) below minimum (${options.minFightDuration}s)`
          );
          continue;
        }

        console.log(`  Using fight ${fight.id} (${fight.name}, ${Math.round(fightDuration)}s)`);

        // Get boss enemy
        const bossEnemy = extractBossEnemy(report.enemies, fight);
        console.log(`  Boss: ${bossEnemy?.name || 'Unknown'}`);

        // Fetch events
        console.log(`  Fetching events...`);
        const events = await client.getAllEvents(reportCode, fight.id, {
          startTime: fight.startTime,
          endTime: fight.endTime,
          onProgress: (count) => {
            if (count % 10000 === 0) {
              console.log(`    ${count} events...`);
            }
          },
        });

        console.log(`  Fetched ${events.length} events`);

        // Parse into actions
        const actions = parseFFLogsEvents(events, fight, bossEnemy, {
          includeDodgeable: options.includeDodgeable ?? false,
          dedupeAoE: options.dedupeAoE ?? true,
        });

        console.log(`  Parsed ${actions.length} actions`);
        allFFLogsActions.push(...actions);
        result.reportsUsed.push(reportCode);

      } catch (error) {
        const errorMsg = `Error processing report ${reportCode}: ${(error as Error).message}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Deduplicate actions across multiple reports
    if (options.dedupeAoE && allFFLogsActions.length > 0) {
      console.log('Deduplicating AoE actions...');
      allFFLogsActions = dedupeAoEActions(allFFLogsActions);
      console.log(`  ${allFFLogsActions.length} actions after deduplication`);
    }

    let finalActions = allFFLogsActions;

    // Optionally merge with Cactbot data
    if (options.useCactbot && bossMapping.timelinePath) {
      try {
        console.log('Fetching Cactbot timeline...');
        const cactbotActions = await loadCactbotTimeline(
          options.bossId,
          bossMapping.timelinePath,
          config.cactbot.baseUrl
        );
        console.log(`  Loaded ${cactbotActions.length} Cactbot actions`);

        result.cactbotUsed = true;
        finalActions = mergeCactbotWithFFLogs(cactbotActions, allFFLogsActions);
        console.log(`  Merged to ${finalActions.length} total actions`);
      } catch (error) {
        const errorMsg = `Warning: Failed to load Cactbot timeline: ${(error as Error).message}`;
        console.warn(errorMsg);
        result.errors.push(errorMsg);
        // Continue with FFLogs data only
      }
    }

    result.actions = finalActions;

    // Write output if not dry run
    if (!options.dryRun) {
      const outputPath = options.output || getDefaultOutputPath(options.bossId);
      await writeTimeline(finalActions, options.bossId, bossMapping, outputPath);
      result.outputPath = outputPath;
      console.log(`\nTimeline written to: ${outputPath}`);
    } else {
      console.log('\nDry run - skipping output file generation');
    }

    result.success = result.actions.length > 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${(error as Error).message}`);
    console.error('Fatal error:', error);
  }

  return result;
}

/**
 * Auto-generate a timeline by discovering recent reports
 *
 * This function:
 * 1. Discovers recent clear reports for the specified boss (if reportCodes not provided)
 * 2. Fetches and parses timeline data from each report
 * 3. Normalizes timelines based on reference action
 * 4. Aggregates timelines using the specified strategy
 * 5. Merges with Cactbot timeline if enabled
 */
export async function autoGenerateTimeline(options: AutoGenerateOptions): Promise<GenerateResult> {
  const result: GenerateResult = {
    success: false,
    bossId: options.bossId,
    actions: [],
    reportsUsed: [],
    cactbotUsed: false,
    errors: [],
  };

  try {
    const config = createConfig();
    const bossMapping = getBossMapping(options.bossId);

    if (!bossMapping) {
      result.errors.push(`Unknown boss ID: ${options.bossId}`);
      return result;
    }

    // Authenticate with FFLogs
    console.log('Authenticating with FFLogs...');
    const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
    const client = new FFLogsClient({ accessToken });

    let discoveredReports: { code: string; title: string; startTime: number; kill: boolean }[];

    // If reportCodes are provided, use them directly; otherwise auto-discover
    if (options.reportCodes && options.reportCodes.length > 0) {
      console.log(`\n=== Processing ${options.reportCodes.length} provided report codes ===`);
      discoveredReports = options.reportCodes.map(code => ({
        code,
        title: `Report ${code}`,
        startTime: Date.now(),
        kill: true,
      }));
    } else {
      // Auto-discover reports
      const count = options.count || 30;
      console.log(`\n=== Auto-Discovery for ${bossMapping.name} ===`);
      console.log(`Searching for ${count} recent reports...`);

      discoveredReports = await discoverRecentReports(options.bossId, client, {
        limit: count,
        requireKill: true,
        minDuration: options.minFightDuration || 120,
      });

      if (discoveredReports.length === 0) {
        result.errors.push('No reports discovered. The boss may not have encounterId configured.');
        console.log('\nHint: Try providing report codes manually with --reports option.');
        console.log('Example: npm run timeline -- auto --boss m7s --reports abc123def');
        return result;
      }

      console.log(`Found ${discoveredReports.length} reports to process`);
    }

    // Process each report
    const timelineReports: TimelineReport[] = [];
    let processedCount = 0;

    for (const report of discoveredReports) {
      try {
        console.log(`\n[${processedCount + 1}/${discoveredReports.length}] Processing: ${report.code}`);

        const reportData = await client.getReport(report.code);

        // Find the appropriate fight
        const fights = client.findFightsByBoss(reportData.fights, bossMapping.zoneId || 0);
        const killFights = client.findKillFights(fights);

        if (killFights.length === 0) {
          console.log(`  No kill fights found, skipping`);
          continue;
        }

        // Use the longest kill fight
        const fight = killFights.sort((a, b) =>
          (b.endTime - b.startTime) - (a.endTime - a.startTime)
        )[0];

        const fightDuration = (fight.endTime - fight.startTime) / 1000;
        console.log(`  Fight ${fight.id}: ${Math.round(fightDuration)}s`);

        // Get boss enemy
        const bossEnemy = extractBossEnemy(reportData.enemies, fight);

        // Fetch events
        const events = await client.getAllEvents(report.code, fight.id, {
          startTime: fight.startTime,
          endTime: fight.endTime,
          onProgress: (count) => {
            if (count % 10000 === 0) {
              console.log(`    ${count} events...`);
            }
          },
        });

        console.log(`  Fetched ${events.length} events`);

        // Parse into actions
        const actions = parseFFLogsEvents(events, fight, bossEnemy, {
          includeDodgeable: options.includeDodgeable ?? false,
          dedupeAoE: options.dedupeAoE ?? true,
        });

        console.log(`  Parsed ${actions.length} actions`);

        // Normalize timeline
        const normalized = normalizeTimeline(actions, fight.startTime, {
          referenceAction: options.referenceAction,
          detectPhases: options.detectPhases ?? true,
          phaseGapThreshold: options.phaseGap || 30,
        });

        timelineReports.push({
          actions: normalized.actions,
          reportCode: report.code,
          normalized,
        });

        result.reportsUsed.push(report.code);
        processedCount++;

      } catch (error) {
        const errorMsg = `Error processing report ${report.code}: ${(error as Error).message}`;
        console.error(`  ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    if (timelineReports.length === 0) {
      result.errors.push('No reports were successfully processed');
      return result;
    }

    console.log(`\n=== Aggregating ${timelineReports.length} timelines ===`);

    // Aggregate timelines
    let finalActions = aggregateTimelines(timelineReports, {
      strategy: options.aggregate || 'median',
      phaseAware: options.detectPhases ?? true,
    });

    // Merge with Cactbot if enabled
    if (options.useCactbot && bossMapping.timelinePath) {
      try {
        console.log('\nFetching Cactbot timeline...');
        const cactbotActions = await loadCactbotTimeline(
          options.bossId,
          bossMapping.timelinePath,
          config.cactbot.baseUrl
        );
        console.log(`  Loaded ${cactbotActions.length} Cactbot actions`);

        result.cactbotUsed = true;
        finalActions = aggregateWithCactbot(finalActions, cactbotActions, {
          strategy: options.aggregate || 'median',
        });
      } catch (error) {
        const errorMsg = `Warning: Failed to load Cactbot timeline: ${(error as Error).message}`;
        console.warn(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.actions = finalActions;

    // Write output if not dry run
    if (!options.dryRun) {
      const outputPath = options.output || getDefaultOutputPath(options.bossId);
      await writeTimeline(finalActions, options.bossId, bossMapping, outputPath);
      result.outputPath = outputPath;
      console.log(`\nTimeline written to: ${outputPath}`);
    } else {
      console.log('\nDry run - skipping output file generation');
    }

    result.success = result.actions.length > 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${(error as Error).message}`);
    console.error('Fatal error:', error);
  }

  return result;
}

/**
 * Get the default output path for a boss timeline
 */
function getDefaultOutputPath(bossId: string): string {
  const bossMapping = getBossMapping(bossId);
  const filename = bossMapping?.mitPlanId
    ? `${bossMapping.mitPlanId}_actions.json`
    : `${bossId}_actions.json`;
  return join(process.cwd(), 'src', 'data', 'bosses', filename);
}

/**
 * Write timeline data to a JSON file
 */
async function writeTimeline(
  actions: BossAction[],
  bossId: string,
  bossMapping: { name: string; mitPlanId: string },
  outputPath: string
): Promise<void> {
  // Ensure output directory exists
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  await mkdir(dir, { recursive: true });

  const timeline: TimelineData = {
    name: bossMapping.name,
    description: `Generated from FFLogs data`,
    bossId: bossMapping.mitPlanId,
    bossTags: [bossId],
    actions,
    version: 3.0,
    source: 'hybrid',
    generatedAt: Date.now(),
  };

  await writeFile(outputPath, JSON.stringify(actions, null, 2), 'utf-8');
}

/**
 * Update an existing timeline with new data
 */
export async function updateTimeline(
  existingPath: string,
  reportCodes: string[],
  options: {
    merge?: boolean;
    includeDodgeable?: boolean;
    dedupeAoE?: boolean;
  } = {}
): Promise<GenerateResult> {
  const result: GenerateResult = {
    success: false,
    bossId: '',
    actions: [],
    reportsUsed: [],
    cactbotUsed: false,
    errors: [],
  };

  try {
    // Import the existing timeline
    const { readFile } = await import('node:fs/promises');
    const existingContent = await readFile(existingPath, 'utf-8');
    const existingActions = JSON.parse(existingContent) as BossAction[];

    console.log(`Loaded ${existingActions.length} existing actions from ${existingPath}`);

    // Generate new timeline from FFLogs
    const generateResult = await generateTimeline({
      bossId: options.merge ? 'unknown' : reportCodes[0] || 'unknown',
      reportCodes,
      dryRun: true,
      includeDodgeable: options.includeDodgeable ?? false,
      dedupeAoE: options.dedupeAoE ?? true,
    });

    if (!generateResult.success) {
      result.errors.push(...generateResult.errors);
      return result;
    }

    // Merge existing with new
    const merged = mergeTimelines(existingActions, generateResult.actions);

    // Write merged timeline
    await writeFile(existingPath, JSON.stringify(merged, null, 2), 'utf-8');

    result.success = true;
    result.actions = merged;
    result.reportsUsed = generateResult.reportsUsed;

    console.log(`Updated timeline with ${merged.length} total actions`);

  } catch (error) {
    result.errors.push(`Error updating timeline: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Merge existing timeline with new data
 */
function mergeTimelines(
  existing: BossAction[],
  newActions: BossAction[]
): BossAction[] {
  const merged = new Map<string, BossAction>();

  // Add all existing actions
  for (const action of existing) {
    merged.set(`${action.name}_${action.time}`, { ...action });
  }

  // Add or update with new actions
  for (const action of newActions) {
    const key = `${action.name}_${action.time}`;
    const existingAction = merged.get(key);

    if (existingAction) {
      // Update with new data if available
      if (action.unmitigatedDamage && !existingAction.unmitigatedDamage) {
        existingAction.unmitigatedDamage = action.unmitigatedDamage;
      }
      if (action.damageType && !existingAction.damageType) {
        existingAction.damageType = action.damageType;
      }
      if (action.isTankBuster) {
        existingAction.isTankBuster = true;
      }
      if (action.isDualTankBuster) {
        existingAction.isDualTankBuster = true;
      }
    } else {
      merged.set(key, action);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.time - b.time);
}

/**
 * Clear stored FFLogs credentials
 */
export async function clearCredentials(): Promise<void> {
  await clearCachedToken();
  console.log('Cleared stored FFLogs credentials');
}

/**
 * List all available bosses
 */
export function listAvailableBosses(): Array<{ id: string; name: string }> {
  const config = createConfig();
  return Object.entries(config.cactbot.bossMapping).map(([id, info]) => ({
    id,
    name: info.name,
  }));
}

/**
 * Analyze an FFLogs report without generating a timeline
 */
export async function analyzeReport(
  reportCode: string,
  options: {
    fightId?: number;
    verbose?: boolean;
  } = {}
): Promise<void> {
  const config = createConfig();

  // Authenticate
  console.log('Authenticating with FFLogs...');
  const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
  const client = new FFLogsClient({ accessToken });

  // Get report data
  console.log(`Fetching report: ${reportCode}`);
  const report = await client.getReport(reportCode);

  console.log(`\n=== Report: ${report.title} ===`);
  console.log(`Owner: ${report.owner.name}`);
  console.log(`Zone: ${report.zone.name} (ID: ${report.zone.id})`);
  console.log(`Start: ${new Date(report.startTime).toISOString()}`);
  console.log(`Duration: ${Math.round((report.endTime - report.startTime) / 1000)}s`);

  // List fights
  console.log(`\n=== Fights (${report.fights.length}) ===`);
  for (const fight of report.fights) {
    const duration = Math.round((fight.endTime - fight.startTime) / 1000);
    const kill = fight.kill ? ' [KILL]' : '';
    console.log(`  ${fight.id}: ${fight.name}${kill} - ${duration}s`);
  }

  // List enemies
  console.log(`\n=== Enemies (${report.enemies.length}) ===`);
  const uniqueEnemies = new Map<string, FFLogsEnemy>();
  for (const enemy of report.enemies) {
    const key = `${enemy.name} (${enemy.type})`;
    if (!uniqueEnemies.has(key)) {
      uniqueEnemies.set(key, enemy);
    }
  }
  for (const [name, enemy] of uniqueEnemies) {
    console.log(`  ${enemy.id}: ${name}`);
  }

  // Get event count for a specific fight if requested
  if (options.fightId) {
    const fight = report.fights.find(f => f.id === options.fightId);
    if (fight) {
      console.log(`\n=== Events for fight ${options.fightId} ===`);
      const events = await client.getAllEvents(reportCode, fight.id, {
        startTime: fight.startTime,
        endTime: fight.endTime,
        onProgress: (count) => {
          if (count % 10000 === 0) {
            console.log(`  Fetched ${count} events...`);
          }
        },
      });

      console.log(`Total events: ${events.length}`);

      // Categorize events
      const byType = new Map<string, number>();
      for (const event of events) {
        const type = event.type || 'unknown';
        byType.set(type, (byType.get(type) || 0) + 1);
      }

      console.log('\nEvents by type:');
      for (const [type, count] of byType) {
        console.log(`  ${type}: ${count}`);
      }
    }
  }
}
