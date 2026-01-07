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
  onProgress?: (message: string) => void;
}

export interface DamageExtractorResult {
  success: boolean;
  bossId: string;
  actions: BossAction[];
  reportsUsed: string[];
  uniqueAbilities: number;
  totalEventsProcessed: number;
  outputPath?: string;
  errors: string[];
}

interface DamageThresholds {
  p50: number;
  p75: number;
  p90: number;
  median: number;
}

interface DamageOccurrence {
  abilityName: string;
  abilityId: number;
  occurrenceIndex: number;
  medianTime: number;
  medianDamage: number;
  uniqueTargetCount: number;
  hitCount: number;
  damageType: 'physical' | 'magical' | 'mixed';
}

interface AbilityDamageEvent {
  relativeTime: number;
  damage: number;
  damageType: 'physical' | 'magical' | 'mixed';
  targetId: number;
  reportCode: string;
}

interface AbilityDamageData {
  abilityName: string;
  abilityId: number;
  events: AbilityDamageEvent[];
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
    errors: [],
  };

  const log = options.onProgress || console.log;
  const occurrenceGapSec = 15;
  const minDamageThreshold = 5000;
  const iqrMultiplier = 1.5;

  try {
    const config = createConfig();
    const bossMapping = getBossMapping(options.bossId);

    if (!bossMapping) {
      result.errors.push(`Unknown boss ID: ${options.bossId}`);
      return result;
    }

    log(`\n=== Authenticating with FFLogs ===`);
    const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
    const client = new FFLogsClient({ accessToken });

    log(`\n=== Discovering FFLogs Reports ===`);

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

    log(`\n=== Extracting Damage Events ===`);

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
          // Skip non-damage events (calculateddamage events are snapshots, not actual damage)
          if (event.type !== 'damage') continue;

          if (bossActorIds.size > 0 && event.sourceID && !bossActorIds.has(event.sourceID)) {
            continue;
          }

          const damage = event.unmitigatedAmount ?? 0;
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
            targetId: event.targetID ?? 0,
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
    log(`\n=== Clustering Occurrences ===`);
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

        const uniqueTargets = new Set(clusterEvents.map((e) => e.targetId));

        const damageTypes = clusterEvents.map((e) => e.damageType);
        const damageType = getMostCommonDamageType(damageTypes);

        allOccurrences.push({
          abilityName: abilityData.abilityName,
          abilityId: abilityData.abilityId,
          occurrenceIndex: occIdx + 1,
          medianTime: Math.round(cluster.median),
          medianDamage: median(filterResult.filtered),
          uniqueTargetCount: uniqueTargets.size,
          hitCount: clusterEvents.length,
          damageType,
        });
      }
    }

    allOccurrences.sort((a, b) => a.medianTime - b.medianTime);

    log(`  Generated ${allOccurrences.length} action occurrences`);

    log(`\n=== Calculating Damage Thresholds ===`);

    const thresholds = calculateDamageThresholds(allOccurrences);
    log(`  Median: ${Math.round(thresholds.median).toLocaleString()}`);
    log(`  P50: ${Math.round(thresholds.p50).toLocaleString()}`);
    log(`  P75: ${Math.round(thresholds.p75).toLocaleString()}`);
    log(`  P90: ${Math.round(thresholds.p90).toLocaleString()}`);

    log(`\n=== Building Timeline ===`);

    const actions = buildTimelineFromOccurrences(allOccurrences, thresholds);
    result.actions = actions;

    const tankBusterCount = actions.filter((a) => a.isTankBuster).length;
    const raidwideCount = actions.filter((a) => !a.isTankBuster).length;
    log(`  Created ${actions.length} timeline actions`);
    log(`  Tank busters: ${tankBusterCount}, Raidwides/other: ${raidwideCount}`);

    if (!options.dryRun) {
      const outputPath = options.output || getDefaultOutputPath(options.bossId);
      await writeTimelineFile(actions, outputPath);
      result.outputPath = outputPath;
      log(`\n=== Timeline written to: ${outputPath} ===`);
    } else {
      log(`\n=== Dry run - Preview ===`);
      for (const action of actions.slice(0, 15)) {
        const tbMarker = action.isTankBuster ? ' [TB]' : '';
        log(
          `  ${action.time}s - ${action.name}${tbMarker} (${action.unmitigatedDamage || 'N/A'})`
        );
      }
      if (actions.length > 15) {
        log(`  ... and ${actions.length - 15} more actions`);
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

function calculateDamageThresholds(occurrences: DamageOccurrence[]): DamageThresholds {
  const damages = occurrences.map((o) => o.medianDamage).filter((d) => d > 0);

  if (damages.length === 0) {
    return { p50: 0, p75: 0, p90: 0, median: 0 };
  }

  const sorted = [...damages].sort((a, b) => a - b);

  const percentile = (arr: number[], p: number): number => {
    const idx = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, idx)];
  };

  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    median: median(sorted),
  };
}

function buildTimelineFromOccurrences(
  occurrences: DamageOccurrence[],
  thresholds: DamageThresholds
): BossAction[] {
  const actions: BossAction[] = [];

  for (const occ of occurrences) {
    const sanitizedName = occ.abilityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const isTankBuster = detectTankBuster(
      occ.abilityName,
      occ.medianDamage,
      occ.uniqueTargetCount,
      thresholds
    );

    const isDualTankBuster = isTankBuster && occ.uniqueTargetCount === 2;

    const importance = determineImportance(occ.medianDamage, isTankBuster, thresholds);
    const icon = getIconForAction(occ.abilityName, isTankBuster, occ.uniqueTargetCount);

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
      if (isDualTankBuster) {
        action.isDualTankBuster = true;
      }
    }

    actions.push(action);
  }

  return actions;
}

function detectTankBuster(
  name: string,
  damage: number,
  uniqueTargetCount: number,
  thresholds: DamageThresholds
): boolean {
  const tankBusterPatterns = [/buster/i, /cleave/i, /divide/i, /saber/i];
  if (tankBusterPatterns.some((p) => p.test(name))) return true;

  const isHighDamage = damage >= thresholds.p75;
  const hitsOnlyTanks = uniqueTargetCount <= 2 && uniqueTargetCount > 0;

  return isHighDamage && hitsOnlyTanks;
}

function determineImportance(
  damage: number,
  isTankBuster: boolean,
  thresholds: DamageThresholds
): 'low' | 'medium' | 'high' | 'critical' {
  if (damage >= thresholds.p90) return 'critical';
  if (isTankBuster) return 'high';
  if (damage >= thresholds.p75) return 'high';
  if (damage >= thresholds.p50) return 'medium';
  return 'low';
}

function getIconForAction(name: string, isTankBuster: boolean, targetCount: number): string {
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
  if (/stack|party/i.test(lower)) return '🎯';
  if (/spread/i.test(lower)) return '💫';
  if (/enrage/i.test(lower)) return '💀';

  if (targetCount >= 6) return '⚔️';

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
