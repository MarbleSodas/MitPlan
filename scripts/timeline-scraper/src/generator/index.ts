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
import { parseFFLogsEvents, extractBossActorIds, getBossName, createAbilityLookup, parseFFLogsEventsWithOccurrences } from '../sources/fflogs/parser.js';
import {
  loadCactbotTimeline,
  mergeCactbotWithFFLogs,
  loadCactbotTimelineSafe,
} from '../sources/cactbot/parser.js';
import { getBossMapping, createConfig } from '../config/index.js';
import type {
  BossAction,
  TimelineData,
  TimelineReport,
  AggregationStrategy,
} from '../types/index.js';
import { dedupeAoEActions } from '../utils/damage.js';
import { discoverRecentReports, discoverAndValidateReports, ValidatedReport } from '../sources/fflogs/discover.js';
import { normalizeTimeline, alignWithCactbot } from './normalizer.js';
import { aggregateTimelines, aggregateWithCactbot, aggregateByOccurrence, mergeWithCactbotTiming } from './aggregator.js';
import {
  analyzeTimelinePatterns,
  validateTimelineWithAI,
  formatPatternAnalysisReport,
  formatAIValidationReport,
} from '../analysis/index.js';
export { extractDamageTimeline, type DamageExtractorOptions, type DamageExtractorResult } from './damageExtractor.js';

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

export interface ScrapeOptions {
  bossId: string;
  count?: number;
  output?: string;
  useCactbot?: boolean;
  dryRun?: boolean;
  minFightDuration?: number;
  minConfidence?: number;
  usePatternAnalysis?: boolean;
  useAiValidation?: boolean;
  autoCorrectTimeline?: boolean;
  onProgress?: (message: string) => void;
}

export interface ScrapeResult extends GenerateResult {
  reportsDiscovered: number;
  reportsValidated: number;
  cactbotAvailable: boolean;
  uniqueActions: number;
  aggregationStats: {
    totalOccurrenceGroups: number;
    filteredByConfidence: number;
  };
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

        // Find the appropriate fight by encounter ID
        const fights = client.findFightsByEncounter(report.fights, bossMapping.encounterId || 0);
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

        // Get boss actor IDs for filtering events
        const bossActorIds = extractBossActorIds(fight, report.masterData?.actors);
        const bossName = getBossName(fight, report.masterData?.actors);
        const abilityLookup = createAbilityLookup(report.masterData?.abilities || []);
        console.log(`  Boss: ${bossName}`);

        // Fetch events - use DamageTaken to get boss damage on players
        console.log(`  Fetching events...`);
        const events = await client.getAllEvents(reportCode, fight.id, {
          startTime: fight.startTime,
          endTime: fight.endTime,
          dataType: 'DamageTaken',
          onProgress: (count) => {
            if (count % 10000 === 0) {
              console.log(`    ${count} events...`);
            }
          },
        });

        console.log(`  Fetched ${events.length} events`);

        // Parse into actions
        const actions = parseFFLogsEvents(events, fight, bossActorIds, {
          includeDodgeable: options.includeDodgeable ?? false,
          dedupeAoE: options.dedupeAoE ?? true,
          abilityLookup,
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

        // Find fights by encounter ID
        const fights = client.findFightsByEncounter(reportData.fights, bossMapping.encounterId || 0);
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

        // Get boss actor IDs for filtering
        const bossActorIds = extractBossActorIds(fight, reportData.masterData?.actors);
        const abilityLookup = createAbilityLookup(reportData.masterData?.abilities || []);

        const events = await client.getAllEvents(report.code, fight.id, {
          startTime: fight.startTime,
          endTime: fight.endTime,
          dataType: 'DamageTaken',
          onProgress: (count) => {
            if (count % 10000 === 0) {
              console.log(`    ${count} events...`);
            }
          },
        });

        console.log(`  Fetched ${events.length} events`);

        const actions = parseFFLogsEvents(events, fight, bossActorIds, {
          includeDodgeable: options.includeDodgeable ?? false,
          dedupeAoE: options.dedupeAoE ?? true,
          abilityLookup,
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

  console.log('Authenticating with FFLogs...');
  const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
  const client = new FFLogsClient({ accessToken });

  console.log(`Fetching report: ${reportCode}`);
  const report = await client.getReport(reportCode);

  console.log(`\n=== Report: ${report.title} ===`);
  console.log(`Owner: ${report.owner.name}`);
  console.log(`Zone: ${report.zone.name} (ID: ${report.zone.id})`);
  console.log(`Start: ${new Date(report.startTime).toISOString()}`);
  console.log(`Duration: ${Math.round((report.endTime - report.startTime) / 1000)}s`);

  console.log(`\n=== Fights (${report.fights.length}) ===`);
  for (const fight of report.fights) {
    const duration = Math.round((fight.endTime - fight.startTime) / 1000);
    const kill = fight.kill ? ' [KILL]' : '';
    const encounterInfo = fight.encounterID ? ` (Encounter: ${fight.encounterID})` : '';
    console.log(`  ${fight.id}: ${fight.name}${kill} - ${duration}s${encounterInfo}`);
  }

  const actors = report.masterData?.actors || [];
  const enemyActors = actors.filter(a => a.type === 'Boss' || a.type === 'NPC');
  console.log(`\n=== Enemies/NPCs (${enemyActors.length}) ===`);
  for (const actor of enemyActors) {
    console.log(`  ${actor.id}: ${actor.name} (${actor.type}${actor.subType ? '/' + actor.subType : ''})`);
  }

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

export async function scrapeTimeline(options: ScrapeOptions): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    success: false,
    bossId: options.bossId,
    actions: [],
    reportsUsed: [],
    cactbotUsed: false,
    cactbotAvailable: false,
    errors: [],
    reportsDiscovered: 0,
    reportsValidated: 0,
    uniqueActions: 0,
    aggregationStats: {
      totalOccurrenceGroups: 0,
      filteredByConfidence: 0,
    },
  };

  const log = options.onProgress || console.log;

  try {
    const config = createConfig();
    const bossMapping = getBossMapping(options.bossId);

    if (!bossMapping) {
      result.errors.push(`Unknown boss ID: ${options.bossId}`);
      return result;
    }

    log('Authenticating with FFLogs...');
    const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
    const client = new FFLogsClient({ accessToken });

    log(`\n=== Step 1: Discovering Reports for ${bossMapping.name} ===`);
    const count = options.count || 10;

    const validatedReports = await discoverAndValidateReports(options.bossId, client, {
      limit: count,
      requireKill: true,
      minDuration: options.minFightDuration || 120,
      onProgress: (current, total) => {
        log(`  Validating report ${current}/${total}...`);
      },
    });

    result.reportsDiscovered = count * 3;
    result.reportsValidated = validatedReports.length;

    if (validatedReports.length === 0) {
      result.errors.push('No valid reports found with kill fights');
      return result;
    }

    log(`\n=== Step 2: Fetching Cactbot Timeline ===`);
    let cactbotActions: BossAction[] = [];
    
    if (options.useCactbot !== false && bossMapping.timelinePath) {
      const cactbotResult = await loadCactbotTimelineSafe(
        options.bossId,
        bossMapping.timelinePath,
        config.cactbot.baseUrl
      );

      if (cactbotResult.available) {
        cactbotActions = cactbotResult.actions;
        result.cactbotAvailable = true;
        result.cactbotUsed = true;
        log(`  Loaded ${cactbotActions.length} Cactbot actions`);
      } else {
        log(`  ${cactbotResult.error}`);
        log(`  Continuing with FFLogs-only timing`);
      }
    } else {
      log(`  Cactbot integration disabled`);
    }

    log(`\n=== Step 3: Processing ${validatedReports.length} Reports ===`);
    const allTimelines: BossAction[][] = [];

    for (let i = 0; i < validatedReports.length; i++) {
      const report = validatedReports[i];
      log(`\n[${i + 1}/${validatedReports.length}] ${report.code} (${report.fightDuration}s)`);

      try {
        const reportData = await client.getReport(report.code);
        const fight = reportData.fights.find(f => f.id === report.fightId);

        if (!fight) {
          log(`  Fight ${report.fightId} not found, skipping`);
          continue;
        }

        const bossActorIds = extractBossActorIds(fight, reportData.masterData?.actors);
        const abilityLookup = createAbilityLookup(reportData.masterData?.abilities || []);

        const events = await client.getAllEvents(report.code, fight.id, {
          startTime: fight.startTime,
          endTime: fight.endTime,
          dataType: 'DamageTaken',
        });

        log(`  Fetched ${events.length} events`);

        const actions = parseFFLogsEventsWithOccurrences(events, fight, bossActorIds, {
          includeDodgeable: false,
          dedupeAoE: true,
          abilityLookup,
        });

        log(`  Parsed ${actions.length} actions`);
        allTimelines.push(actions);
        result.reportsUsed.push(report.code);

      } catch (error) {
        log(`  Error: ${(error as Error).message}`);
        result.errors.push(`Report ${report.code}: ${(error as Error).message}`);
      }
    }

    if (allTimelines.length === 0) {
      result.errors.push('No timelines were successfully parsed');
      return result;
    }

    log(`\n=== Step 4: Aggregating ${allTimelines.length} Timelines ===`);
    
    const aggregatedActions = aggregateByOccurrence(
      allTimelines,
      allTimelines.length,
      {
        strategy: 'median',
        minConfidence: options.minConfidence || 0.3,
      }
    );

    result.aggregationStats.totalOccurrenceGroups = aggregatedActions.length;

    log(`\n=== Step 5: Merging with Cactbot Timing ===`);
    
    let finalActions: BossAction[];
    if (cactbotActions.length > 0) {
      finalActions = mergeWithCactbotTiming(aggregatedActions, cactbotActions, {
        fuzzyMatch: true,
      });
      log(`  Merged ${aggregatedActions.length} FFLogs actions with ${cactbotActions.length} Cactbot actions`);
      log(`  Result: ${finalActions.length} actions`);
    } else {
      finalActions = aggregatedActions.map(a => {
        const { timeRange, ...rest } = a as any;
        return rest as BossAction;
      });
      log(`  Using FFLogs timing (no Cactbot available)`);
    }

    result.actions = finalActions;
    result.uniqueActions = finalActions.length;

    if (options.usePatternAnalysis) {
      log(`\n=== Step 6: AI Pattern Analysis ===`);
      const patternAnalysis = await analyzeTimelinePatterns(finalActions, bossMapping.name, {
        enabled: true,
        timeout: 60000,
        minOccurrencesForPattern: 2,
        maxActionsToAnalyze: 100,
      });

      if (patternAnalysis) {
        log(`  ${patternAnalysis.summary}`);
        if (patternAnalysis.repeatPatterns.filter(p => p.isRegular).length > 0) {
          log(`  Found ${patternAnalysis.repeatPatterns.filter(p => p.isRegular).length} regular repeat patterns`);
        }
        if (patternAnalysis.phasePatterns.length > 1) {
          log(`  Detected ${patternAnalysis.phasePatterns.length} phases`);
        }
        if (patternAnalysis.rotationCycles.length > 1) {
          log(`  Identified ${patternAnalysis.rotationCycles.length} rotation cycles`);
        }
        
        log(`\n${formatPatternAnalysisReport(patternAnalysis)}`);

        if (options.useAiValidation) {
          log(`\n=== Step 7: AI Validation ===`);
          const validation = await validateTimelineWithAI(
            finalActions,
            bossMapping.name,
            patternAnalysis,
            {
              enabled: true,
              timeout: 45000,
              autoCorrect: options.autoCorrectTimeline || false,
              minConfidenceForCorrection: 0.8,
            }
          );

          log(`  Validation score: ${validation.score}/100`);
          
          if (validation.issues.filter(i => i.type === 'error').length > 0) {
            log(`  Errors: ${validation.issues.filter(i => i.type === 'error').length}`);
          }
          if (validation.issues.filter(i => i.type === 'warning').length > 0) {
            log(`  Warnings: ${validation.issues.filter(i => i.type === 'warning').length}`);
          }
          if (validation.mergeSuggestions.length > 0) {
            log(`  Merge suggestions: ${validation.mergeSuggestions.length}`);
          }
          if (validation.missingMechanics.length > 0) {
            log(`  Potentially missing mechanics: ${validation.missingMechanics.length}`);
          }

          log(`\n${formatAIValidationReport(validation)}`);

          if (validation.correctedActions) {
            log(`  Applied ${validation.mergeSuggestions.length} auto-corrections`);
            finalActions = validation.correctedActions;
            result.actions = finalActions;
            result.uniqueActions = finalActions.length;
          }
        }
      }
    } else if (options.useAiValidation) {
      log(`\n=== Step 6: AI Validation ===`);
      const validation = await validateTimelineWithAI(
        finalActions,
        bossMapping.name,
        null,
        {
          enabled: true,
          timeout: 45000,
          autoCorrect: options.autoCorrectTimeline || false,
          minConfidenceForCorrection: 0.8,
        }
      );

      log(`  Validation score: ${validation.score}/100`);
      log(`\n${formatAIValidationReport(validation)}`);

      if (validation.correctedActions) {
        finalActions = validation.correctedActions;
        result.actions = finalActions;
        result.uniqueActions = finalActions.length;
      }
    }

    if (!options.dryRun) {
      const outputPath = options.output || getDefaultOutputPath(options.bossId);
      await writeTimeline(finalActions, options.bossId, bossMapping, outputPath);
      result.outputPath = outputPath;
      log(`\nTimeline written to: ${outputPath}`);
    } else {
      log(`\nDry run - skipping output file generation`);
    }

    result.success = finalActions.length > 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${(error as Error).message}`);
    console.error('Fatal error:', error);
  }

  return result;
}
