import type { BossAction, FFLogsEvent } from '../../types/index.js';
import { determineDamageType } from '../../utils/damage.js';

export interface SyncResult {
  found: boolean;
  offset: number;
  referenceAction: string;
  matchedFFLogsTime?: number;
  cactbotTime?: number;
}

export interface DamageMapping {
  actionKey: string;
  cactbotAction: BossAction;
  fflogsDamage?: number;
  fflogsHitCount?: number;
  fflogsTime?: number;
  damageType?: 'physical' | 'magical' | 'mixed';
  matched: boolean;
}

export interface SyncConfig {
  matchWindowSec: number;
  fuzzyNameMatch: boolean;
  preferredReferenceAction?: string;
}

const DEFAULT_CONFIG: SyncConfig = {
  matchWindowSec: 20,
  fuzzyNameMatch: true,
};

export function findSyncReference(
  cactbotActions: BossAction[],
  fflogsEvents: FFLogsEvent[],
  fightStartTime: number,
  config: Partial<SyncConfig> = {}
): SyncResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (cactbotActions.length === 0) {
    return { found: false, offset: 0, referenceAction: '' };
  }

  const referenceAction = cfg.preferredReferenceAction
    ? cactbotActions.find(
        (a) => normalizeForMatching(a.name) === normalizeForMatching(cfg.preferredReferenceAction!)
      ) || cactbotActions[0]
    : cactbotActions[0];

  const targetName = referenceAction.name.toLowerCase();
  const normalizedTarget = normalizeForMatching(targetName);

  for (const event of fflogsEvents) {
    const eventAbilityName = event.ability?.name?.toLowerCase() || '';
    const normalizedEvent = normalizeForMatching(eventAbilityName);

    const isMatch = cfg.fuzzyNameMatch
      ? fuzzyMatchAbilities(normalizedEvent, normalizedTarget)
      : normalizedEvent === normalizedTarget;

    if (isMatch) {
      const eventRelativeTime = (event.timestamp - fightStartTime) / 1000;
      const offset = referenceAction.time - eventRelativeTime;

      return {
        found: true,
        offset: Math.round(offset * 100) / 100,
        referenceAction: referenceAction.name,
        matchedFFLogsTime: eventRelativeTime,
        cactbotTime: referenceAction.time,
      };
    }
  }

  return { found: false, offset: 0, referenceAction: referenceAction.name };
}

function normalizeAbilityName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*x\d+$/i, '')
    .replace(/\s*\d+$/, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractBaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*x\d+$/i, '')
    .replace(/\s*\d+$/, '')
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (shorter.length < 3) return false;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return matches / longer.length > 0.8;
}

function fuzzyMatchAbilities(fflogsName: string, cactbotName: string): boolean {
  if (fflogsName === cactbotName) return true;

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

export function mapDamageToActions(
  cactbotActions: BossAction[],
  fflogsEvents: FFLogsEvent[],
  fightStartTime: number,
  syncOffset: number,
  config: Partial<SyncConfig> = {}
): DamageMapping[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const mappings: DamageMapping[] = [];
  const occurrenceMap = buildOccurrenceMap(cactbotActions);

  const eventsByName = groupEventsByName(fflogsEvents);
  const eventsByNormalizedName = groupEventsByNormalizedName(fflogsEvents);

  const usedOccurrenceIndices = new Map<string, Set<number>>();

  for (const [actionKey, cactbotAction] of occurrenceMap) {
    const nameKey = cactbotAction.name.toLowerCase();
    const normalizedName = normalizeForMatching(nameKey);
    const expectedFFLogsTime = cactbotAction.time - syncOffset;

    let matchedEvents: FFLogsEvent[] = [];

    const exactMatch = eventsByName.get(nameKey);
    if (exactMatch) {
      matchedEvents = exactMatch;
    } else {
      const normalizedMatch = eventsByNormalizedName.get(normalizedName);
      if (normalizedMatch) {
        matchedEvents = normalizedMatch;
      } else if (cfg.fuzzyNameMatch) {
        for (const [eventName, events] of eventsByName) {
          if (fuzzyMatchAbilities(eventName, nameKey)) {
            matchedEvents = events;
            break;
          }
        }
      }
    }

    if (matchedEvents.length === 0) {
      mappings.push({
        actionKey,
        cactbotAction,
        matched: false,
      });
      continue;
    }

    const eventsWithTime = matchedEvents
      .map((e) => ({
        event: e,
        relativeTime: (e.timestamp - fightStartTime) / 1000,
      }))
      .sort((a, b) => a.relativeTime - b.relativeTime);

    const occurrenceEvents = groupIntoOccurrences(eventsWithTime, 5);

    let bestMatch: OccurrenceGroup | null = null;
    let minTimeDiff = cfg.matchWindowSec;
    let bestIndex = -1;

    const usedIndices = usedOccurrenceIndices.get(normalizedName) || new Set<number>();

    for (let i = 0; i < occurrenceEvents.length; i++) {
      if (usedIndices.has(i)) continue;

      const occ = occurrenceEvents[i];
      const timeDiff = Math.abs(occ.medianTime - expectedFFLogsTime);

      if (timeDiff <= minTimeDiff) {
        minTimeDiff = timeDiff;
        bestMatch = occ;
        bestIndex = i;
      }
    }

    if (bestMatch) {
      if (!usedOccurrenceIndices.has(normalizedName)) {
        usedOccurrenceIndices.set(normalizedName, new Set());
      }
      usedOccurrenceIndices.get(normalizedName)!.add(bestIndex);

      const totalDamage = bestMatch.events.reduce((sum, e) => {
        return sum + (e.event.unmitigatedAmount ?? e.event.amount ?? e.event.damage ?? 0);
      }, 0);

      const damageType = determineDamageType(bestMatch.events[0].event);

      mappings.push({
        actionKey,
        cactbotAction,
        fflogsDamage: totalDamage,
        fflogsHitCount: bestMatch.events.length,
        fflogsTime: bestMatch.medianTime,
        damageType,
        matched: true,
      });
    } else {
      mappings.push({
        actionKey,
        cactbotAction,
        matched: false,
      });
    }
  }

  return mappings;
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

function groupEventsByName(events: FFLogsEvent[]): Map<string, FFLogsEvent[]> {
  const map = new Map<string, FFLogsEvent[]>();

  for (const event of events) {
    const name = event.ability?.name?.toLowerCase() || '';
    if (!name) continue;

    if (!map.has(name)) {
      map.set(name, []);
    }
    map.get(name)!.push(event);
  }

  return map;
}

function groupEventsByNormalizedName(events: FFLogsEvent[]): Map<string, FFLogsEvent[]> {
  const map = new Map<string, FFLogsEvent[]>();

  for (const event of events) {
    const name = event.ability?.name || '';
    if (!name) continue;

    const normalized = normalizeForMatching(name);
    if (!map.has(normalized)) {
      map.set(normalized, []);
    }
    map.get(normalized)!.push(event);
  }

  return map;
}

interface EventWithTime {
  event: FFLogsEvent;
  relativeTime: number;
}

interface OccurrenceGroup {
  events: EventWithTime[];
  startTime: number;
  endTime: number;
  medianTime: number;
}

function groupIntoOccurrences(events: EventWithTime[], gapSec: number): OccurrenceGroup[] {
  if (events.length === 0) return [];

  const groups: OccurrenceGroup[] = [];
  let currentGroup: EventWithTime[] = [events[0]];

  for (let i = 1; i < events.length; i++) {
    const timeDiff = events[i].relativeTime - events[i - 1].relativeTime;

    if (timeDiff > gapSec) {
      groups.push(createOccurrenceGroup(currentGroup));
      currentGroup = [events[i]];
    } else {
      currentGroup.push(events[i]);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(createOccurrenceGroup(currentGroup));
  }

  return groups;
}

function createOccurrenceGroup(events: EventWithTime[]): OccurrenceGroup {
  const times = events.map((e) => e.relativeTime).sort((a, b) => a - b);
  const medianIndex = Math.floor(times.length / 2);
  const medianTime =
    times.length % 2 === 0 ? (times[medianIndex - 1] + times[medianIndex]) / 2 : times[medianIndex];

  return {
    events,
    startTime: times[0],
    endTime: times[times.length - 1],
    medianTime,
  };
}

export function buildActionKey(name: string, occurrence: number): string {
  return `${name.toLowerCase()}_${occurrence}`;
}

export function parseActionKey(key: string): { name: string; occurrence: number } {
  const lastUnderscoreIndex = key.lastIndexOf('_');
  const name = key.substring(0, lastUnderscoreIndex);
  const occurrence = parseInt(key.substring(lastUnderscoreIndex + 1), 10);
  return { name, occurrence };
}
