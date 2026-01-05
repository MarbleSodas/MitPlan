import type { BossAction, FFLogsEvent } from '../types/index.js';

export interface HitRateResult {
  actionName: string;
  occurrence: number;
  cactbotTime: number;
  hitCount: number;
  totalReports: number;
  hitRate: number;
  isDodgeable: boolean;
  avgDamage?: number;
  maxDamage?: number;
  minDamage?: number;
  timingStdDev?: number;
}

export interface HitRateConfig {
  dodgeableThreshold: number;
  matchWindowSec: number;
  minReportsForConfidence: number;
}

export interface ReportHitData {
  reportCode: string;
  actionHits: Map<string, ActionHitInfo>;
  timeOffset: number;
}

export interface ActionHitInfo {
  didHit: boolean;
  syncedTime?: number;
  rawTime?: number;
  damage?: number;
  playersHit?: number;
}

const DEFAULT_CONFIG: HitRateConfig = {
  dodgeableThreshold: 0.7,
  matchWindowSec: 20,
  minReportsForConfidence: 3,
};

function normalizeForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*x\d+$/i, '')
    .replace(/\s*\d+$/, '')
    .replace(/[^a-z0-9]/g, '');
}

function fuzzyMatchAbilities(fflogsName: string, cactbotName: string): boolean {
  const fflogsBase = normalizeForMatching(fflogsName);
  const cactbotBase = normalizeForMatching(cactbotName);

  if (fflogsBase === cactbotBase) return true;
  if (fflogsBase.includes(cactbotBase) || cactbotBase.includes(fflogsBase)) return true;

  const longer = fflogsBase.length > cactbotBase.length ? fflogsBase : cactbotBase;
  const shorter = fflogsBase.length > cactbotBase.length ? cactbotBase : fflogsBase;

  if (shorter.length < 3) return false;

  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  let shorterIdx = 0;

  for (let i = 0; i < longer.length && shorterIdx < shorter.length; i++) {
    if (longer[i] === shorter[shorterIdx]) {
      consecutiveMatches++;
      shorterIdx++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }

  return maxConsecutive >= shorter.length * 0.7 || shorterIdx >= shorter.length * 0.8;
}

export function analyzeHitRates(
  cactbotActions: BossAction[],
  reportHitData: ReportHitData[],
  config: Partial<HitRateConfig> = {}
): HitRateResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: HitRateResult[] = [];
  const occurrenceMap = buildOccurrenceMap(cactbotActions);

  for (const [actionKey, cactbotAction] of occurrenceMap) {
    const occurrence = cactbotAction.occurrence || 1;
    let hitCount = 0;
    const damages: number[] = [];
    const times: number[] = [];

    for (const report of reportHitData) {
      const hitInfo = report.actionHits.get(actionKey);
      if (hitInfo?.didHit) {
        hitCount++;
        if (hitInfo.damage !== undefined) {
          damages.push(hitInfo.damage);
        }
        if (hitInfo.syncedTime !== undefined) {
          times.push(hitInfo.syncedTime);
        }
      }
    }

    const totalReports = reportHitData.length;
    const hitRate = totalReports > 0 ? hitCount / totalReports : 0;

    let avgDamage: number | undefined;
    let maxDamage: number | undefined;
    let minDamage: number | undefined;

    if (damages.length > 0) {
      avgDamage = Math.round(damages.reduce((a, b) => a + b, 0) / damages.length);
      maxDamage = Math.max(...damages);
      minDamage = Math.min(...damages);
    }

    let timingStdDev: number | undefined;
    if (times.length > 1) {
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
      timingStdDev = Math.round(Math.sqrt(variance) * 100) / 100;
    }

    const isDodgeable =
      totalReports >= cfg.minReportsForConfidence && hitRate < cfg.dodgeableThreshold;

    results.push({
      actionName: cactbotAction.name,
      occurrence,
      cactbotTime: cactbotAction.time,
      hitCount,
      totalReports,
      hitRate: Math.round(hitRate * 100) / 100,
      isDodgeable,
      avgDamage,
      maxDamage,
      minDamage,
      timingStdDev,
    });
  }

  results.sort((a, b) => a.cactbotTime - b.cactbotTime);
  return results;
}

function buildOccurrenceMap(
  actions: BossAction[]
): Map<string, BossAction & { occurrence: number }> {
  const map = new Map<string, BossAction & { occurrence: number }>();
  const occurrenceCounts = new Map<string, number>();

  for (const action of actions) {
    const nameKey = action.name.toLowerCase();
    const currentOccurrence = (occurrenceCounts.get(nameKey) || 0) + 1;
    occurrenceCounts.set(nameKey, currentOccurrence);

    const key = `${nameKey}_${currentOccurrence}`;
    map.set(key, { ...action, occurrence: currentOccurrence });
  }

  return map;
}

export function matchEventsToActions(
  fflogsEvents: FFLogsEvent[],
  cactbotActions: BossAction[],
  timeOffset: number, fightStartTime: number = 0,
  config: Partial<HitRateConfig> = {}
): Map<string, ActionHitInfo> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const result = new Map<string, ActionHitInfo>();
  const occurrenceMap = buildOccurrenceMap(cactbotActions);

  for (const [key] of occurrenceMap) {
    result.set(key, { didHit: false });
  }

  const eventsByName = new Map<string, FFLogsEvent[]>();
  const eventsByNormalizedName = new Map<string, FFLogsEvent[]>();

  for (const event of fflogsEvents) {
    const abilityName = event.ability?.name?.toLowerCase() || '';
    if (!abilityName) continue;

    if (!eventsByName.has(abilityName)) {
      eventsByName.set(abilityName, []);
    }
    eventsByName.get(abilityName)!.push(event);

    const normalizedName = normalizeForMatching(abilityName);
    if (!eventsByNormalizedName.has(normalizedName)) {
      eventsByNormalizedName.set(normalizedName, []);
    }
    eventsByNormalizedName.get(normalizedName)!.push(event);
  }

  for (const [actionKey, cactbotAction] of occurrenceMap) {
    const nameKey = cactbotAction.name.toLowerCase();
    const normalizedName = normalizeForMatching(nameKey);
    
    let events = eventsByName.get(nameKey) || [];
    if (events.length === 0) {
      events = eventsByNormalizedName.get(normalizedName) || [];
    }
    if (events.length === 0) {
      for (const [eventName, eventList] of eventsByName) {
        if (fuzzyMatchAbilities(eventName, nameKey)) {
          events = eventList;
          break;
        }
      }
    }

    const expectedEventTime = cactbotAction.time - timeOffset;
    const occurrence = cactbotAction.occurrence;

    const sortedEvents = events
      .map((e) => ({
        event: e,
        relativeTime: (e.timestamp - fightStartTime) / 1000,
      }))
      .sort((a, b) => a.relativeTime - b.relativeTime);

    let occurrenceCount = 0;
    let lastOccurrenceTime = -Infinity;
    const occurrenceGap = 5;

    for (const { event, relativeTime } of sortedEvents) {
      if (relativeTime - lastOccurrenceTime > occurrenceGap) {
        occurrenceCount++;
        lastOccurrenceTime = relativeTime;

        if (occurrenceCount === occurrence) {
          const timeDiff = Math.abs(relativeTime - expectedEventTime);

          if (timeDiff <= cfg.matchWindowSec) {
            const damage = event.unmitigatedAmount ?? event.amount ?? event.damage ?? 0;

            result.set(actionKey, {
              didHit: true,
              syncedTime: relativeTime + timeOffset,
              rawTime: relativeTime,
              damage,
              playersHit: 1,
            });
            break;
          }
        }
      }
    }
  }

  return result;
}

export function findSyncOffset(
  fflogsEvents: FFLogsEvent[],
  cactbotFirstAction: BossAction,
  fightStartTime: number
): { found: boolean; offset: number; matchedTime?: number } {
  const targetName = cactbotFirstAction.name.toLowerCase();

  for (const event of fflogsEvents) {
    const abilityName = event.ability?.name?.toLowerCase() || '';

    if (
      abilityName === targetName ||
      abilityName.includes(targetName) ||
      targetName.includes(abilityName)
    ) {
      const eventRelativeTime = (event.timestamp - fightStartTime) / 1000;
      const offset = cactbotFirstAction.time - eventRelativeTime;

      return {
        found: true,
        offset: Math.round(offset * 100) / 100,
        matchedTime: eventRelativeTime,
      };
    }
  }

  return { found: false, offset: 0 };
}

export function aggregateHitData(
  reportHitData: ReportHitData[],
  cactbotActions: BossAction[],
  config: Partial<HitRateConfig> = {}
): HitRateResult[] {
  return analyzeHitRates(cactbotActions, reportHitData, config);
}

export function filterByDodgeability(
  hitRates: HitRateResult[],
  includeDodgeable: boolean
): HitRateResult[] {
  if (includeDodgeable) {
    return hitRates;
  }
  return hitRates.filter((r) => !r.isDodgeable);
}

export function generateHitRateSummary(hitRates: HitRateResult[]): string {
  const total = hitRates.length;
  const dodgeable = hitRates.filter((r) => r.isDodgeable).length;
  const unavoidable = total - dodgeable;
  const avgHitRate = hitRates.reduce((sum, r) => sum + r.hitRate, 0) / total;

  const lines = [
    `\n=== Hit Rate Analysis Summary ===`,
    `Total actions analyzed: ${total}`,
    `Unavoidable (hit rate >= threshold): ${unavoidable}`,
    `Dodgeable (hit rate < threshold): ${dodgeable}`,
    `Average hit rate: ${Math.round(avgHitRate * 100)}%`,
    ``,
    `Actions by hit rate:`,
  ];

  const ranges = [
    { label: '100%', min: 1.0, max: 1.0 },
    { label: '80-99%', min: 0.8, max: 0.99 },
    { label: '50-79%', min: 0.5, max: 0.79 },
    { label: '20-49%', min: 0.2, max: 0.49 },
    { label: '<20%', min: 0, max: 0.19 },
  ];

  for (const range of ranges) {
    const count = hitRates.filter((r) => r.hitRate >= range.min && r.hitRate <= range.max).length;
    if (count > 0) {
      lines.push(`  ${range.label}: ${count} actions`);
    }
  }

  return lines.join('\n');
}
