import { mkdir, writeFile } from 'node:fs/promises';
import type { BossAction, FFLogsEvent } from '../types/index.js';
import { FFLogsClient } from '../sources/fflogs/client.js';
import { getAccessToken } from '../sources/fflogs/auth.js';
import { extractBossActorIds, createAbilityLookup } from '../sources/fflogs/parser.js';
import { discoverAndValidateReports, type ValidatedReport } from '../sources/fflogs/discover.js';
import { getBossMapping, createConfig } from '../config/index.js';
import { formatDamageValue, determineDamageType } from '../utils/damage.js';
import { median, filterOutliersIQR, clusterByProximity } from '../utils/statistics.js';

export interface DamageExtractorOptions {
  bossId: string;
  reportCodes?: string[];
  count?: number;
  output?: string;
  dryRun?: boolean;
  minFightDuration?: number;
  iqrMultiplier?: number;
  occurrenceGapSec?: number;
  minDamageThreshold?: number;
  onProgress?: (message: string) => void;
}

export interface DamageExtractorResult {
  success: boolean;
  bossId: string;
  actions: BossAction[];
  reportsUsed: string[];
  uniqueAbilities: number;
  totalEventsProcessed: number;
  outliersRemoved: number;
  outputPath?: string;
  errors: string[];
}

interface DamageOccurrence {
  abilityName: string;
  abilityId: number;
  occurrenceIndex: number;
  medianTime: number;
  damages: number[];
  filteredDamages: number[];
  medianDamage: number;
  hitCount: number;
  damageType: 'physical' | 'magical' | 'mixed';
  outliersRemoved: number;
}

interface AbilityDamageData {
  abilityName: string;
  abilityId: number;
  events: Array<{
    relativeTime: number;
    damage: number;
    damageType: 'physical' | 'magical' | 'mixed';
    reportCode: string;
  }>;
}

export async function extractDamageTimeline(
  options: DamageExtractorOptions
): Promise<DamageExtractorResult> {
  const result: DamageExtractorResult = {
    success: false,
    bossId: options.bossId,
    actions: [],
    reportsUsed: [],
    uniqueAbilities: 0,
    totalEventsProcessed: 0,
    outliersRemoved: 0,
    errors: [],
  };

  const log = options.onProgress || console.log;
  const iqrMultiplier = options.iqrMultiplier ?? 1.5;
  const occurrenceGapSec = options.occurrenceGapSec ?? 15;
  const minDamageThreshold = options.minDamageThreshold ?? 5000;

  try {
    const config = createConfig();
    const bossMapping = getBossMapping(options.bossId);

    if (!bossMapping) {
      result.errors.push(`Unknown boss ID: ${options.bossId}`);
      return result;
    }

    log(`\n=== Step 1: Authenticating with FFLogs ===`);
    const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
    const client = new FFLogsClient({ accessToken });

    log(`\n=== Step 2: Discovering FFLogs Reports ===`);

    let validatedReports: ValidatedReport[];

    if (options.reportCodes && options.reportCodes.length > 0) {
      log(`  Using ${options.reportCodes.length} provided report codes`);
      validatedReports = await validateProvidedReports(
        options.reportCodes,
        client,
        bossMapping.encounterId || 0,
        options.minFightDuration || 120
      );
    } else {
      const count = options.count || 30;
      log(`  Auto-discovering ${count} recent reports...`);

      validatedReports = await discoverAndValidateReports(options.bossId, client, {
        limit: count,
        requireKill: true,
        minDuration: options.minFightDuration || 120,
        onProgress: (current, total) => {
          log(`  Validating report ${current}/${total}...`);
        },
      });
    }

    if (validatedReports.length === 0) {
      result.errors.push('No valid reports found');
      return result;
    }

    log(`  Found ${validatedReports.length} valid reports`);

    log(`\n=== Step 3: Extracting DamageTaken Events ===`);

    const abilityDataMap = new Map<string, AbilityDamageData>();

    for (let i = 0; i < validatedReports.length; i++) {
      const report = validatedReports[i];
      log(`\n[${i + 1}/${validatedReports.length}] Processing ${report.code}`);

      try {
        const reportData = await client.getReport(report.code);
        const fight = reportData.fights.find((f) => f.id === report.fightId);

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

        log(`  Fetched ${events.length} damage events`);
        result.totalEventsProcessed += events.length;

        for (const event of events) {
          if (bossActorIds.size > 0 && event.sourceID && !bossActorIds.has(event.sourceID)) {
            continue;
          }

          const damage = event.unmitigatedAmount ?? event.amount ?? event.damage ?? 0;
          if (damage < minDamageThreshold) continue;

          const gameID = event.abilityGameID ?? event.ability?.guid;
          if (!gameID) continue;

          const abilityName =
            abilityLookup.get(gameID) ?? event.ability?.name ?? `Unknown_${gameID}`;

          if (isAutoAttack(abilityName)) continue;

          const relativeTime = (event.timestamp - fight.startTime) / 1000;
          if (relativeTime <= 0) continue;

          const key = abilityName.toLowerCase();

          if (!abilityDataMap.has(key)) {
            abilityDataMap.set(key, {
              abilityName,
              abilityId: gameID,
              events: [],
            });
          }

          abilityDataMap.get(key)!.events.push({
            relativeTime,
            damage,
            damageType: determineDamageType(event),
            reportCode: report.code,
          });
        }

        result.reportsUsed.push(report.code);
      } catch (error) {
        log(`  Error: ${(error as Error).message}`);
        result.errors.push(`Report ${report.code}: ${(error as Error).message}`);
      }
    }

    if (abilityDataMap.size === 0) {
      result.errors.push('No damage events extracted from any report');
      return result;
    }

    result.uniqueAbilities = abilityDataMap.size;
    log(`\n=== Step 4: Clustering and Filtering Occurrences ===`);
    log(`  Found ${abilityDataMap.size} unique damaging abilities`);

    const allOccurrences: DamageOccurrence[] = [];

    for (const [_, abilityData] of abilityDataMap) {
      const times = abilityData.events.map((e) => e.relativeTime);
      const clusters = clusterByProximity(times, occurrenceGapSec);

      for (let occIdx = 0; occIdx < clusters.length; occIdx++) {
        const cluster = clusters[occIdx];
        const clusterEvents = cluster.indices.map((i) => abilityData.events[i]);

        const damages = clusterEvents.map((e) => e.damage);
        const filterResult = filterOutliersIQR(damages, iqrMultiplier);
        result.outliersRemoved += filterResult.outliers.length;

        const damageTypes = clusterEvents.map((e) => e.damageType);
        const damageType = getMostCommonDamageType(damageTypes);

        allOccurrences.push({
          abilityName: abilityData.abilityName,
          abilityId: abilityData.abilityId,
          occurrenceIndex: occIdx + 1,
          medianTime: Math.round(cluster.median),
          damages,
          filteredDamages: filterResult.filtered,
          medianDamage: median(filterResult.filtered),
          hitCount: clusterEvents.length,
          damageType,
          outliersRemoved: filterResult.outliers.length,
        });
      }
    }

    allOccurrences.sort((a, b) => a.medianTime - b.medianTime);

    log(`  Generated ${allOccurrences.length} action occurrences`);
    log(`  Removed ${result.outliersRemoved} outlier damage values`);

    log(`\n=== Step 5: Building Timeline ===`);

    const actions = buildTimelineFromOccurrences(allOccurrences);
    result.actions = actions;

    log(`  Created ${actions.length} timeline actions`);

    if (!options.dryRun) {
      const outputPath = options.output || getDefaultOutputPath(options.bossId);
      await writeTimelineFile(actions, outputPath);
      result.outputPath = outputPath;
      log(`\n  Timeline written to: ${outputPath}`);
    } else {
      log(`\n  Dry run - skipping file write`);
      log(`\n  Preview of first 10 actions:`);
      for (const action of actions.slice(0, 10)) {
        log(
          `    ${action.time}s - ${action.name} (${action.unmitigatedDamage || 'N/A'}, ${action.damageType})`
        );
      }
    }

    result.success = true;
  } catch (error) {
    result.errors.push(`Fatal error: ${(error as Error).message}`);
    console.error('Fatal error:', error);
  }

  return result;
}

async function validateProvidedReports(
  reportCodes: string[],
  client: FFLogsClient,
  encounterId: number,
  minDuration: number
): Promise<ValidatedReport[]> {
  const validated: ValidatedReport[] = [];

  for (const code of reportCodes) {
    try {
      const report = await client.getReport(code);
      const fights = client.findFightsByEncounter(report.fights, encounterId);
      const killFights = client.findKillFights(fights);

      if (killFights.length === 0) continue;

      const fight = killFights.sort(
        (a, b) => b.endTime - b.startTime - (a.endTime - a.startTime)
      )[0];

      const duration = (fight.endTime - fight.startTime) / 1000;
      if (duration < minDuration) continue;

      validated.push({
        code,
        title: `Report ${code}`,
        startTime: Date.now(),
        kill: true,
        fightId: fight.id,
        fightDuration: Math.round(duration),
        validated: true,
        duration: Math.round(duration),
      });
    } catch {
      continue;
    }
  }

  return validated;
}

function isAutoAttack(abilityName: string): boolean {
  const autoAttackPatterns = [/^attack$/i, /^auto.?attack$/i, /^shot$/i];
  return autoAttackPatterns.some((p) => p.test(abilityName));
}

function getMostCommonDamageType(
  types: Array<'physical' | 'magical' | 'mixed'>
): 'physical' | 'magical' | 'mixed' {
  const counts: Record<string, number> = { physical: 0, magical: 0, mixed: 0 };
  for (const t of types) {
    counts[t]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as
    | 'physical'
    | 'magical'
    | 'mixed';
}

function buildTimelineFromOccurrences(occurrences: DamageOccurrence[]): BossAction[] {
  const actions: BossAction[] = [];

  for (const occ of occurrences) {
    const sanitizedName = occ.abilityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const isTankBuster = detectTankBuster(occ.abilityName, occ.medianDamage);
    const importance = determineImportance(occ.medianDamage, isTankBuster);
    const icon = getIconForAction(occ.abilityName, isTankBuster);

    const action: BossAction = {
      id: `${sanitizedName}_${occ.occurrenceIndex}`,
      name: occ.abilityName,
      time: occ.medianTime,
      unmitigatedDamage: formatDamageValue(Math.round(occ.medianDamage)),
      damageType: occ.damageType,
      importance,
      icon,
    };

    if (isTankBuster) {
      action.isTankBuster = true;
      if (detectDualTankBuster(occ.abilityName)) {
        action.isDualTankBuster = true;
      }
    }

    actions.push(action);
  }

  return actions;
}

function detectTankBuster(name: string, damage: number): boolean {
  const tankBusterPatterns = [
    /buster/i,
    /smash/i,
    /cleave/i,
    /slam/i,
    /strike/i,
    /needle/i,
    /flare/i,
    /divide/i,
    /saber/i,
  ];

  if (tankBusterPatterns.some((p) => p.test(name))) return true;
  if (damage > 100000) return true;

  return false;
}

function detectDualTankBuster(name: string): boolean {
  const dualPatterns = [/dual/i, /both/i, /tanks/i, /shared/i, /split/i, /twin/i];
  return dualPatterns.some((p) => p.test(name));
}

function determineImportance(
  damage: number,
  isTankBuster: boolean
): 'low' | 'medium' | 'high' | 'critical' {
  if (damage > 150000) return 'critical';
  if (isTankBuster && damage > 100000) return 'critical';
  if (isTankBuster) return 'high';
  if (damage > 80000) return 'high';
  if (damage > 50000) return 'medium';
  return 'low';
}

function getIconForAction(name: string, isTankBuster: boolean): string {
  if (isTankBuster) return '🛡️';

  const lower = name.toLowerCase();
  if (/fire|flame|burn|heat/i.test(lower)) return '🔥';
  if (/ice|freeze|frost|cold/i.test(lower)) return '❄️';
  if (/lightning|thunder|volt|shock/i.test(lower)) return '⚡';
  if (/earth|quake|stone|rock/i.test(lower)) return '🌍';
  if (/wind|gale|aero/i.test(lower)) return '💨';
  if (/water|drown|wave|flood/i.test(lower)) return '🌊';
  if (/dark|shadow|umbra/i.test(lower)) return '🌑';
  if (/light|holy|lumina/i.test(lower)) return '✨';
  if (/explosion|blast|bomb|impact/i.test(lower)) return '💥';
  if (/seed|vine|plant|nature/i.test(lower)) return '🌱';
  if (/stack|party/i.test(lower)) return '🎯';
  if (/spread/i.test(lower)) return '💫';
  if (/enrage|special/i.test(lower)) return '💀';

  return '⚔️';
}

function getDefaultOutputPath(bossId: string): string {
  const bossMapping = getBossMapping(bossId);
  const filename = bossMapping?.mitPlanId
    ? `${bossMapping.mitPlanId}_actions.json`
    : `${bossId}_actions.json`;

  return `${process.cwd()}/src/data/bosses/${filename}`;
}

async function writeTimelineFile(actions: BossAction[], outputPath: string): Promise<void> {
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  await mkdir(dir, { recursive: true });

  const outputActions = actions.map((action) => {
    const output: Record<string, unknown> = {
      id: action.id,
      name: action.name,
      time: action.time,
    };

    if (action.unmitigatedDamage) {
      output.unmitigatedDamage = action.unmitigatedDamage;
    }
    if (action.damageType) {
      output.damageType = action.damageType;
    }
    if (action.importance) {
      output.importance = action.importance;
    }
    if (action.icon) {
      output.icon = action.icon;
    }
    if (action.isTankBuster) {
      output.isTankBuster = action.isTankBuster;
    }
    if (action.isDualTankBuster) {
      output.isDualTankBuster = action.isDualTankBuster;
    }

    return output;
  });

  await writeFile(outputPath, JSON.stringify(outputActions, null, 2), 'utf-8');
}
