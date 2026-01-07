import { mkdir, writeFile } from 'node:fs/promises';
import type { BossAction } from '../types/index.js';
import { FFLogsClient } from '../sources/fflogs/client.js';
import { getAccessToken } from '../sources/fflogs/auth.js';
import { extractBossActorIds, createAbilityLookup } from '../sources/fflogs/parser.js';
import { loadCactbotTimelineSafe, parseCactbotTimelineExtended, type ParsedCactbotEntry } from '../sources/cactbot/parser.js';
import { findSyncReference, mapDamageToActions, type DamageMapping } from '../sources/cactbot/syncMapper.js';
import {
  analyzeHitRates,
  filterByDodgeability,
  generateHitRateSummary,
  type HitRateResult,
  type ReportHitData,
  type ActionHitInfo,
} from '../analysis/hitRateAnalyzer.js';
import { discoverAndValidateReports, type ValidatedReport } from '../sources/fflogs/discover.js';
import { getBossMapping, createConfig, getBossMultiHitAbilities } from '../config/index.js';
import { formatDamageValue } from '../utils/damage.js';
import { median } from '../utils/statistics.js';

export interface CactbotSyncOptions {
  bossId: string;
  reportCodes?: string[];
  count?: number;
  output?: string;
  dryRun?: boolean;
  minFightDuration?: number;
  dodgeableThreshold?: number;
  includeDodgeable?: boolean;
  onProgress?: (message: string) => void;
}

export interface CactbotSyncResult {
  success: boolean;
  bossId: string;
  actions: BossAction[];
  reportsUsed: string[];
  cactbotActionCount: number;
  matchedActionCount: number;
  dodgeableActionCount: number;
  outputPath?: string;
  errors: string[];
  hitRateSummary?: string;
}

interface DamageAggregation {
  values: number[];
  damageTypes: string[];
  targetCounts: number[];
  hitCounts: number[];
}

export async function processCactbotFirst(options: CactbotSyncOptions): Promise<CactbotSyncResult> {
  const result: CactbotSyncResult = {
    success: false,
    bossId: options.bossId,
    actions: [],
    reportsUsed: [],
    cactbotActionCount: 0,
    matchedActionCount: 0,
    dodgeableActionCount: 0,
    errors: [],
  };

  const log = options.onProgress || console.log;

  try {
    const config = createConfig();
    const bossMapping = getBossMapping(options.bossId);

    if (!bossMapping) {
      result.errors.push(`Unknown boss ID: ${options.bossId}`);
      return result;
    }

    log(`\n=== Step 1: Loading Cactbot Timeline for ${bossMapping.name} ===`);

    const cactbotResult = await loadCactbotTimelineSafe(
      options.bossId,
      bossMapping.timelinePath,
      config.cactbot.baseUrl
    );

    if (!cactbotResult.available || cactbotResult.actions.length === 0) {
      result.errors.push(
        cactbotResult.error || `No Cactbot timeline available for ${options.bossId}`
      );
      return result;
    }

    const cactbotActions = cactbotResult.actions;
    result.cactbotActionCount = cactbotActions.length;
    log(`  Loaded ${cactbotActions.length} actions from Cactbot timeline`);

    const firstAction = cactbotActions[0];
    log(`  Reference action: "${firstAction.name}" at time ${firstAction.time}s`);

    log(`\n=== Step 2: Authenticating with FFLogs ===`);
    const accessToken = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret);
    const client = new FFLogsClient({ accessToken });

    log(`\n=== Step 3: Discovering FFLogs Reports ===`);

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
      const count = options.count || 10;
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

    log(`\n=== Step 4: Processing Reports with Cactbot Sync ===`);

    const allReportHitData: ReportHitData[] = [];
    const allDamageMappings: Map<string, DamageMapping[]> = new Map();
    const damageByAction = new Map<string, DamageAggregation>();

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

        let enrichedCount = 0;
        for (const event of events) {
          const gameID = event.abilityGameID ?? event.ability?.guid;
          if (gameID) {
            const name = abilityLookup.get(gameID);
            if (name) {
              if (!event.ability) {
                event.ability = { name, guid: gameID, type: 0, abilityIcon: "" };
                enrichedCount++;
              } else if (!event.ability.name) {
                event.ability.name = name;
                enrichedCount++;
              }
            }
          }
        }
        if (enrichedCount > 0) {
          log(`  Enriched ${enrichedCount} events with ability names`);

          const uniqueAbilities = new Set(events.map(e => e.ability?.name).filter(Boolean));
          log(`  Found ${uniqueAbilities.size} unique abilities in report`);
        }

        const syncResult = findSyncReference(cactbotActions, events, fight.startTime, {
          preferredReferenceAction: bossMapping.firstAction,
        });

        if (!syncResult.found) {
          log(`  Could not sync report - reference action not found`);
          result.errors.push(`Report ${report.code}: sync failed`);
          continue;
        }

        log(`  Synced: offset ${syncResult.offset}s (matched at ${syncResult.matchedFFLogsTime}s)`);

        const damageMappings = mapDamageToActions(
          cactbotActions,
          events,
          fight.startTime,
          syncResult.offset
        );

        allDamageMappings.set(report.code, damageMappings);

        for (const mapping of damageMappings) {
          if (mapping.matched && mapping.fflogsDamage && mapping.fflogsDamage > 0) {
            if (!damageByAction.has(mapping.actionKey)) {
              damageByAction.set(mapping.actionKey, {
                values: [],
                damageTypes: [],
                targetCounts: [],
                hitCounts: [],
              });
            }
            const agg = damageByAction.get(mapping.actionKey)!;
            agg.values.push(mapping.fflogsDamage);
            if (mapping.damageType) agg.damageTypes.push(mapping.damageType);
            if (mapping.targetCount) agg.targetCounts.push(mapping.targetCount);
            if (mapping.fflogsHitCount) agg.hitCounts.push(mapping.fflogsHitCount);
          }
        }

        const actionHits = new Map<string, ActionHitInfo>();
        for (const mapping of damageMappings) {
          actionHits.set(mapping.actionKey, {
            didHit: mapping.matched,
            damage: mapping.fflogsDamage,
            rawTime: mapping.fflogsTime,
            syncedTime: mapping.fflogsTime ? mapping.fflogsTime + syncResult.offset : undefined,
          });
        }

        allReportHitData.push({
          reportCode: report.code,
          actionHits,
          timeOffset: syncResult.offset,
        });

        result.reportsUsed.push(report.code);

        const matchedCount = damageMappings.filter((m) => m.matched).length;
        log(`  Matched ${matchedCount}/${damageMappings.length} actions`);
      } catch (error) {
        log(`  Error: ${(error as Error).message}`);
        result.errors.push(`Report ${report.code}: ${(error as Error).message}`);
      }
    }

    if (allReportHitData.length === 0) {
      result.errors.push('No reports were successfully processed');
      return result;
    }

    log(`\n=== Step 5: Analyzing Hit Rates ===`);

    const multiHitAbilities = getBossMultiHitAbilities(options.bossId);
    const hitRates = analyzeHitRates(cactbotActions, allReportHitData, {
      dodgeableThreshold: options.dodgeableThreshold || 0.7,
      minReportsForConfidence: Math.min(3, allReportHitData.length),
      neverDodgeableAbilities: multiHitAbilities,
    });

    const filteredHitRates = filterByDodgeability(hitRates, options.includeDodgeable || false);
    result.dodgeableActionCount = hitRates.filter((r) => r.isDodgeable).length;
    result.matchedActionCount = hitRates.filter((r) => r.hitCount > 0).length;

    log(generateHitRateSummary(hitRates));
    result.hitRateSummary = generateHitRateSummary(hitRates);

    log(`\n=== Step 6: Generating Timeline ===`);

    const finalActions = buildFinalTimeline(
      cactbotActions,
      filteredHitRates,
      damageByAction,
      options.bossId,
      multiHitAbilities
    );

    log(`\n=== Step 7: Filling Missing Damage Values ===`);
    const filledActions = fillMissingDamageValues(finalActions);
    const filledCount = filledActions.filter(a => a.unmitigatedDamage && !finalActions.find(f => f.id === a.id && f.unmitigatedDamage)).length;
    if (filledCount > 0) {
      log(`  Filled ${filledCount} missing damage values from similar abilities`);
    }

    result.actions = filledActions;
    log(`  Generated ${filledActions.length} actions for timeline`);

    if (!options.dryRun) {
      const outputPath = options.output || getDefaultOutputPath(options.bossId);
      await writeTimelineFile(filledActions, outputPath);
      result.outputPath = outputPath;
      log(`\n  Timeline written to: ${outputPath}`);
    } else {
      log(`\n  Dry run - skipping file write`);
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

function buildFinalTimeline(
  cactbotActions: BossAction[],
  hitRates: HitRateResult[],
  damageByAction: Map<string, DamageAggregation>,
  bossId: string,
  multiHitAbilities: string[]
): BossAction[] {
  const hitRateMap = new Map<string, HitRateResult>();
  for (const hr of hitRates) {
    // Use getBaseActionName to match how occurrenceMap was built in hitRateAnalyzer
    const baseName = hr.actionName.toLowerCase()
      .replace(/\s+x\d+$/i, '')
      .replace(/\s*\([^)]+\)$/i, '')
      .replace(/\s+\d+$/i, '')
      .trim()
      .replace(/\s+/g, ' ');
    const key = `${baseName}_${hr.occurrence}`;
    hitRateMap.set(key, hr);
  }

  const actions: BossAction[] = [];
  const occurrenceCounts = new Map<string, number>();
  const multiHitPatterns = multiHitAbilities.map(name => name.toLowerCase());

  for (const cactbotAction of cactbotActions) {
    const baseName = cactbotAction.name.toLowerCase()
      .replace(/\s+x\d+$/i, '')
      .replace(/\s*\([^)]+\)$/i, '')
      .replace(/\s+\d+$/i, '')
      .trim();
    
    const occurrence = (occurrenceCounts.get(baseName) || 0) + 1;
    occurrenceCounts.set(baseName, occurrence);

    const actionKey = `${baseName}_${occurrence}`;
    const hitRate = hitRateMap.get(actionKey);

    if (!hitRate) continue;

    const agg = damageByAction.get(actionKey);
    let unmitigatedDamage: string | undefined;
    let damageType: 'physical' | 'magical' | 'mixed' | undefined;
    let perHitDamage: string | undefined;

    const hitCountMatch = cactbotAction.name.match(/\s+x(\d+)$/i);
    const isMultiHit = hitCountMatch || multiHitPatterns.some(p => baseName.includes(p));
    const hitCount = hitCountMatch ? parseInt(hitCountMatch[1], 10) : undefined;

    if (agg && agg.values.length > 0) {
      const medianTotalDamage = median(agg.values);
      const medianTargetCount = agg.targetCounts.length > 0 ? median(agg.targetCounts) : 8;
      
      const perPlayerDamage = Math.round(medianTotalDamage / medianTargetCount);
      
      if (isMultiHit && hitCount) {
        const perHit = Math.round(perPlayerDamage / hitCount);
        perHitDamage = formatDamageValue(perHit);
        unmitigatedDamage = formatDamageValue(perPlayerDamage);
      } else {
        unmitigatedDamage = formatDamageValue(perPlayerDamage);
      }

      if (agg.damageTypes.length > 0) {
        const counts: Record<string, number> = {};
        for (const t of agg.damageTypes) {
          counts[t] = (counts[t] || 0) + 1;
        }
        damageType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'physical' | 'magical' | 'mixed';
      }
    }

    const medianTargetCount = agg && agg.targetCounts.length > 0 
      ? median(agg.targetCounts) 
      : 8;

    const isTankBuster = detectTankBuster(cactbotAction.name, medianTargetCount, hitRate);
    const importance = determineImportance(hitRate, isTankBuster, agg);
    const icon = getIconForAction(cactbotAction.name, isTankBuster);
    const description = generateDescription(cactbotAction.name, hitRate, isTankBuster, damageType, hitCount);

    const sanitizedName = cactbotAction.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const action: BossAction = {
      id: `${sanitizedName}_${occurrence}`,
      name: cactbotAction.name,
      time: cactbotAction.time,
      description,
      damageType,
      importance,
      icon,
    };

    if (unmitigatedDamage) {
      action.unmitigatedDamage = unmitigatedDamage;
    }

    if (perHitDamage) {
      action.perHitDamage = perHitDamage;
    }

    if (hitCount) {
      action.hitCount = hitCount;
    }

    if (isTankBuster) {
      action.isTankBuster = true;
      if (detectDualTankBuster(cactbotAction.name, medianTargetCount)) {
        action.isDualTankBuster = true;
      }
    }

    actions.push(action);
  }

  return actions.sort((a, b) => a.time - b.time);
}

function detectTankBuster(name: string, targetCount: number, hitRate: HitRateResult): boolean {
  const tankBusterPatterns = [
    /buster/i,
    /smash\s*(here|there)/i,
    /cleave/i,
    /slam(?!inator)/i,
    /strike/i,
    /flare/i,
    /blink/i,
  ];

  if (tankBusterPatterns.some((p) => p.test(name))) return true;

  if (targetCount <= 2 && hitRate.avgDamage && hitRate.avgDamage > 80000) {
    return true;
  }

  return false;
}

function detectDualTankBuster(name: string, targetCount: number): boolean {
  const dualPatterns = [/dual/i, /both/i, /tanks/i, /shared/i, /split/i];
  if (dualPatterns.some((p) => p.test(name))) return true;
  
  return targetCount === 2;
}

function determineImportance(
  hitRate: HitRateResult,
  isTankBuster: boolean,
  agg?: DamageAggregation
): 'low' | 'medium' | 'high' | 'critical' {
  let perPlayerDamage: number | undefined;
  
  if (agg && agg.values.length > 0) {
    const medianTotalDamage = median(agg.values);
    const medianTargetCount = agg.targetCounts.length > 0 ? median(agg.targetCounts) : 8;
    perPlayerDamage = medianTotalDamage / medianTargetCount;
  } else {
    perPlayerDamage = hitRate.avgDamage;
  }
  
  if (perPlayerDamage && perPlayerDamage > 150000) return 'critical';
  if (isTankBuster) return 'high';
  if (perPlayerDamage && perPlayerDamage > 70000) return 'high';
  if (hitRate.hitRate < 0.5) return 'low';
  return 'medium';
}

function getIconForAction(name: string, isTankBuster: boolean): string {
  if (isTankBuster) return '🛡️';

  const lower = name.toLowerCase();
  if (/fire|flame|burn|heat/i.test(lower)) return '🔥';
  if (/ice|freeze|frost|cold/i.test(lower)) return '❄️';
  if (/lightning|thunder|volt|shock|electro/i.test(lower)) return '⚡';
  if (/earth|quake|stone|rock/i.test(lower)) return '🌍';
  if (/wind|gale|aero/i.test(lower)) return '💨';
  if (/water|drown|wave|flood/i.test(lower)) return '🌊';
  if (/dark|shadow|umbra/i.test(lower)) return '🌑';
  if (/light|holy|lumina/i.test(lower)) return '✨';
  if (/explosion|blast|bomb|impact/i.test(lower)) return '💥';
  if (/seed|vine|plant|nature|tendril/i.test(lower)) return '🌱';
  if (/stack|party/i.test(lower)) return '🎯';
  if (/spread/i.test(lower)) return '💫';
  if (/enrage|special/i.test(lower)) return '💀';
  if (/revenge|vines/i.test(lower)) return '🌿';
  if (/glower|power/i.test(lower)) return '👁️';
  if (/spore/i.test(lower)) return '🍄';

  return '⚔️';
}

function generateDescription(
  name: string,
  hitRate: HitRateResult,
  isTankBuster: boolean,
  damageType?: 'physical' | 'magical' | 'mixed',
  hitCount?: number
): string {
  const parts: string[] = [];
  const lower = name.toLowerCase();

  if (hitCount) {
    parts.push(`${hitCount} hits of`);
  }

  if (isTankBuster) {
    if (/dual|both|tanks|shared|split/i.test(lower)) {
      parts.push('dual tank buster targeting both tanks.');
    } else if (/smash\s*here/i.test(lower)) {
      parts.push('tank buster on the closest player.');
    } else if (/smash\s*there/i.test(lower)) {
      parts.push('tank buster on the furthest player.');
    } else {
      parts.push('tank buster requiring mitigation.');
    }
  } else if (/raid|party|aoe/i.test(lower) || hitRate.hitRate >= 0.9) {
    parts.push('raidwide damage.');
  } else if (/stack/i.test(lower)) {
    parts.push('stack marker damage.');
  } else if (/spread/i.test(lower)) {
    parts.push('spread marker damage.');
  } else if (/impact/i.test(lower) && hitCount) {
    parts.push('multi-hit raidwide damage.');
  } else {
    parts.push('damage mechanic.');
  }

  if (damageType && parts.length > 0) {
    const lastIdx = parts.length - 1;
    parts[lastIdx] = `${damageType} ${parts[lastIdx]}`;
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function getAbilityBaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+x\d+$/i, '')
    .replace(/\s*\([^)]+\)$/i, '')
    .replace(/\s+\d+$/i, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseDamageNumber(damageStr: string): number | null {
  const match = damageStr.match(/~?([\d,]+)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return null;
}

function fillMissingDamageValues(actions: BossAction[]): BossAction[] {
  const damageByBaseName = new Map<string, number[]>();
  
  for (const action of actions) {
    if (!action.unmitigatedDamage) continue;
    
    const baseName = getAbilityBaseName(action.name);
    const damage = parseDamageNumber(action.unmitigatedDamage);
    
    if (damage === null) continue;
    
    let normalizedDamage = damage;
    if (action.hitCount && action.hitCount > 1) {
      normalizedDamage = damage * action.hitCount;
    }
    
    if (!damageByBaseName.has(baseName)) {
      damageByBaseName.set(baseName, []);
    }
    damageByBaseName.get(baseName)!.push(normalizedDamage);
  }

  const filledActions: BossAction[] = [];
  
  for (const action of actions) {
    if (action.unmitigatedDamage) {
      filledActions.push(action);
      continue;
    }
    
    const baseName = getAbilityBaseName(action.name);
    const damages = damageByBaseName.get(baseName);
    
    if (!damages || damages.length < 2) {
      filledActions.push(action);
      continue;
    }
    
    const sortedDamages = [...damages].sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedDamages.length / 2);
    const medianDamage = sortedDamages.length % 2 === 0
      ? (sortedDamages[medianIndex - 1] + sortedDamages[medianIndex]) / 2
      : sortedDamages[medianIndex];
    
    let finalDamage = Math.round(medianDamage);
    let perHitDamage: string | undefined;
    let unmitigatedDamage: string;
    
    if (action.hitCount && action.hitCount > 1) {
      const perHit = Math.round(finalDamage / action.hitCount);
      perHitDamage = formatDamageValue(perHit);
      unmitigatedDamage = formatDamageValue(finalDamage);
    } else {
      unmitigatedDamage = formatDamageValue(finalDamage);
    }
    
    const updatedAction: BossAction = {
      ...action,
      unmitigatedDamage,
      importance: action.importance === 'low' ? 'medium' : action.importance,
    };
    
    if (perHitDamage) {
      updatedAction.perHitDamage = perHitDamage;
    }
    
    filledActions.push(updatedAction);
  }
  
  return filledActions;
}

function getDefaultOutputPath(bossId: string): string {
  const bossMapping = getBossMapping(bossId);
  const filename = bossMapping?.mitPlanId
    ? `${bossMapping.mitPlanId}_actions.json`
    : `${bossId}_actions.json`;

  const scriptDir = decodeURIComponent(new URL('.', import.meta.url).pathname);
  const projectRoot = scriptDir.replace(/\/scripts\/timeline-scraper\/.*$/, '');
  return `${projectRoot}/src/data/bosses/${filename}`;
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

    if (action.description) {
      output.description = action.description;
    }
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
    if (action.hitCount) {
      output.hitCount = action.hitCount;
    }
    if (action.perHitDamage) {
      output.perHitDamage = action.perHitDamage;
    }

    return output;
  });

  await writeFile(outputPath, JSON.stringify(outputActions, null, 2), 'utf-8');
}
