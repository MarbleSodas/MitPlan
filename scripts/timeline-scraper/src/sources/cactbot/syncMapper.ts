import type { BossAction, FFLogsEvent } from '../../types/index.js';
import { determineDamageType } from '../../utils/damage.js';
import { getBaseActionName, getNameVariations } from './parser.js';

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
  matchedAbilityName?: string;
  targetCount?: number;
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

  const targetVariations = getNameVariations(referenceAction.name);

  for (const event of fflogsEvents) {
    const eventAbilityName = event.ability?.name || '';
    if (!eventAbilityName) continue;

    const eventVariations = getNameVariations(eventAbilityName);

    const isMatch = checkNameMatch(eventVariations, targetVariations, cfg.fuzzyNameMatch);

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

function checkNameMatch(
  eventVariations: string[],
  targetVariations: string[],
  fuzzyMatch: boolean
): boolean {
  for (const ev of eventVariations) {
    for (const tv of targetVariations) {
      if (ev === tv) return true;
      if (fuzzyMatch && fuzzyMatchAbilities(ev, tv)) return true;
    }
  }
  return false;
}

function normalizeForMatching(name: string): string {
  return getBaseActionName(name).replace(/[^a-z0-9]/g, '');
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

  const eventsByNormalizedName = groupEventsByAllVariations(fflogsEvents);
  const usedOccurrenceIndices = new Map<string, Set<number>>();

  for (const [actionKey, cactbotAction] of occurrenceMap) {
    const nameVariations = getNameVariations(cactbotAction.name);
    const expectedFFLogsTime = cactbotAction.time - syncOffset;

    let matchedEvents: FFLogsEvent[] = [];
    let matchedAbilityName: string | undefined;

    for (const variation of nameVariations) {
      const normalizedVariation = variation.replace(/[^a-z0-9]/g, '');
      const events = eventsByNormalizedName.get(normalizedVariation);
      if (events && events.length > 0) {
        matchedEvents = events;
        matchedAbilityName = events[0].ability?.name;
        break;
      }
    }

    if (matchedEvents.length === 0 && cfg.fuzzyNameMatch) {
      for (const [eventName, events] of eventsByNormalizedName) {
        for (const variation of nameVariations) {
          if (fuzzyMatchAbilities(eventName, variation)) {
            matchedEvents = events;
            matchedAbilityName = events[0].ability?.name;
            break;
          }
        }
        if (matchedEvents.length > 0) break;
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

    const normalizedName = normalizeForMatching(cactbotAction.name);
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

      // Only use unmitigatedAmount for accurate damage values - skip events without it
      const eventsWithUnmitigated = bestMatch.events.filter(e => e.event.unmitigatedAmount !== undefined);
      
      const totalDamage = eventsWithUnmitigated.length > 0
        ? eventsWithUnmitigated.reduce((sum, e) => sum + e.event.unmitigatedAmount!, 0)
        : 0;

      // Use events with unmitigated damage for target count, fallback to all events
      const eventsForTargetCount = eventsWithUnmitigated.length > 0 ? eventsWithUnmitigated : bestMatch.events;
      const uniqueTargets = new Set(eventsForTargetCount.map(e => e.event.targetID).filter(Boolean));
      const damageType = determineDamageType(bestMatch.events[0].event);

      mappings.push({
        actionKey,
        cactbotAction,
        fflogsDamage: totalDamage,
        fflogsHitCount: bestMatch.events.length,
        fflogsTime: bestMatch.medianTime,
        damageType,
        matched: true,
        matchedAbilityName,
        targetCount: uniqueTargets.size,
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
    const nameKey = getBaseActionName(action.name);
    const currentOccurrence = (occurrenceCounts.get(nameKey) || 0) + 1;
    occurrenceCounts.set(nameKey, currentOccurrence);

    const key = `${nameKey}_${currentOccurrence}`;
    map.set(key, { ...action, occurrence: currentOccurrence });
  }

  return map;
}

function groupEventsByAllVariations(events: FFLogsEvent[]): Map<string, FFLogsEvent[]> {
  const map = new Map<string, FFLogsEvent[]>();

  for (const event of events) {
    if (event.type !== 'damage') continue;

    const name = event.ability?.name || '';
    if (!name) continue;

    const variations = getNameVariations(name);
    for (const variation of variations) {
      const normalized = variation.replace(/[^a-z0-9]/g, '');
      if (!map.has(normalized)) {
        map.set(normalized, []);
      }
      if (!map.get(normalized)!.includes(event)) {
        map.get(normalized)!.push(event);
      }
    }
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
  return `${getBaseActionName(name)}_${occurrence}`;
}

export function parseActionKey(key: string): { name: string; occurrence: number } {
  const lastUnderscoreIndex = key.lastIndexOf('_');
  const name = key.substring(0, lastUnderscoreIndex);
  const occurrence = parseInt(key.substring(lastUnderscoreIndex + 1), 10);
  return { name, occurrence };
}
