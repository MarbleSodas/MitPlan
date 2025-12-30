/**
 * FFLogs Event Parser
 *
 * Converts raw FFLogs event data into MitPlan boss action format.
 */

import type { FFLogsEvent, FFLogsFight, FFLogsEnemyNPC, FFLogsActor, FFLogsAbility, BossAction } from '../../types/index.js';
import { dedupeAoEActions, formatDamageValue, determineDamageType } from '../../utils/damage.js';

export interface ParseOptions {
  includeDodgeable?: boolean;
  dedupeAoE?: boolean;
  minDamageThreshold?: number;
  filterBuffs?: boolean;
  abilityLookup?: Map<number, string>;
}

/**
 * Filter dodgeable mechanics based on ability name patterns
 */
const DODGEABLE_PATTERNS = [
  /\b(dive|marker|charge|spread|stack|beam|laser|line|aoe|circle)\b/i,
  // Add more patterns as needed
];

/**
 * Non-damaging mechanic patterns that should be excluded
 */
const NON_DAMAGING_PATTERNS = [
  /\b(attack|auto|attack|strike)\b/i,
  /\b(repair|teleport|cutscene|transition)\b/i,
  /^Warden's$/,
  /^Squadron$/,
  /^Ally$/,
];

/**
 * Buff/debuff ability IDs that aren't damage mechanics
 */
const BUFF_ABILITY_IDS: Set<number> = new Set([
  // Add known buff/debuff IDs as needed
]);

/**
 * Parse FFLogs events into MitPlan boss actions
 */
export function parseFFLogsEvents(
  events: FFLogsEvent[],
  fight: FFLogsFight,
  bossActorIds: Set<number>,
  options: ParseOptions = {}
): BossAction[] {
  const {
    includeDodgeable = false,
    dedupeAoE = true,
    minDamageThreshold = 100,
    abilityLookup = new Map(),
  } = options;

  const abilityMap = new Map<string, BossAction>();
  const processedIds = new Set<string>();

  for (const event of events) {
    // Get ability info - FFLogs v2 uses abilityGameID, we look up name from masterData
    const abilityGameID = event.abilityGameID ?? event.ability?.guid;
    if (!abilityGameID) continue;

    // Look up ability name from masterData, fallback to ability object or generic name
    const abilityName = abilityLookup.get(abilityGameID) 
      ?? event.ability?.name 
      ?? `Ability ${abilityGameID}`;

    // Filter to only boss/enemy abilities (sourceID should be in bossActorIds)
    if (bossActorIds.size > 0 && event.sourceID && !bossActorIds.has(event.sourceID)) {
      continue;
    }

    // Skip non-damaging events if not filtering buffs
    const damage = event.unmitigatedAmount ?? event.amount ?? event.damage ?? 0;
    if (damage < minDamageThreshold && !options.filterBuffs) continue;

    // Skip known non-damaging abilities
    if (NON_DAMAGING_PATTERNS.some(p => p.test(abilityName))) {
      continue;
    }

    // Skip buff/debuff abilities
    if (BUFF_ABILITY_IDS.has(abilityGameID)) continue;

    // Calculate relative time in seconds from fight start
    const relativeTime = Math.round((event.timestamp - fight.startTime) / 1000);

    // Skip events at time 0 (usually pre-pull)
    if (relativeTime <= 0) continue;

    // Check if this is a dodgeable mechanic
    const isDodgeable = isDodgeableMechanic(abilityName, event);
    if (isDodgeable && !includeDodgeable) continue;

    // Create a unique ID for this ability usage
    const baseId = createActionId(abilityName, abilityGameID);
    const usageId = `${baseId}_${relativeTime}`;

    if (processedIds.has(usageId)) continue;
    processedIds.add(usageId);

    // Determine if this is a tank buster
    const isTankBuster = isTankBusterEvent(event, abilityName);

    // Get damage values for formatting
    const totalDamage = event.unmitigatedAmount ?? event.amount ?? event.damage ?? 0;
    const damageStr = formatDamageValue(totalDamage, event);

    // Create the action
    const action: BossAction = {
      id: usageId,
      name: abilityName,
      time: relativeTime,
      unmitigatedDamage: damageStr,
      damageType: determineDamageType(event),
      importance: determineImportance(isTankBuster, totalDamage, event),
      icon: getIconForAbility(abilityName, isTankBuster),
    };

    if (isTankBuster) {
      action.isTankBuster = true;
      if (isMultiTargetTankBuster(abilityName)) {
        action.isDualTankBuster = true;
      }
    }

    if (!abilityMap.has(usageId)) {
      abilityMap.set(usageId, action);
    }
  }

  const actions = Array.from(abilityMap.values()).sort((a, b) => a.time - b.time);

  if (dedupeAoE) {
    return dedupeAoEActions(actions);
  }

  return actions;
}

/**
 * Check if an ability is a dodgeable mechanic
 */
function isDodgeableMechanic(abilityName: string, event: FFLogsEvent): boolean {
  const hasDamage = (event.unmitigatedAmount ?? event.amount ?? 0) > 0 || (event.damage ?? 0) > 0;
  if (!hasDamage) return true;

  return DODGEABLE_PATTERNS.some(p => p.test(abilityName));
}

function isTankBusterEvent(event: FFLogsEvent, abilityName: string): boolean {
  if (!event.targetID) return false;

  const damage = event.unmitigatedAmount ?? event.amount ?? event.damage ?? 0;
  const isHighDamage = damage > 50000;

  const hasTankBusterName = /\b(buster|fracture|needle|shot|blast|strike|blow)\b/i.test(abilityName);

  return isHighDamage || hasTankBusterName;
}

/**
 * Check if an ability is a multi-target tank buster
 */
function isMultiTargetTankBuster(abilityName: string): boolean {
  return /\b(spread|dual|both|tanks)\b/i.test(abilityName);
}

/**
 * Create a unique action ID from ability name and GUID
 */
function createActionId(name: string, guid: number): string {
  // Sanitize the name to create a valid ID
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return `${sanitized}_${guid}`;
}

/**
 * Determine importance level based on damage and mechanics
 */
function determineImportance(
  isTankBuster: boolean,
  damage: number,
  event: FFLogsEvent
): 'low' | 'medium' | 'high' | 'critical' {
  if (isTankBuster && damage > 100000) return 'critical';
  if (isTankBuster) return 'high';
  if (damage > 80000) return 'high';
  if (damage > 50000) return 'medium';
  return 'low';
}

/**
 * Get an appropriate icon for an ability
 */
function getIconForAbility(name: string, isTankBuster: boolean): string {
  if (isTankBuster) return '🛡️';
  if (/fire|flame|burn/i.test(name)) return '🔥';
  if (/ice|freeze|frost/i.test(name)) return '❄️';
  if (/lightning|thunder|volt/i.test(name)) return '⚡';
  if (/earth|quake|stone/i.test(name)) return '🌍';
  if (/wind|gale|aero/i.test(name)) return '💨';
  if (/water|drown|wave/i.test(name)) return '🌊';
  if (/dark|shadow|umbra/i.test(name)) return '🌑';
  if (/light|holy|lumina/i.test(name)) return '✨';
  if (/explosion|blast|bomb/i.test(name)) return '💥';
  if (/aoe|circle|donut/i.test(name)) return '⭕';
  if (/line|beam|laser/i.test(name)) return '➡️';
  if (/stack|mark/i.test(name)) return '🎯';
  return '⚔️';
}

/**
 * Extract boss actor IDs from fight enemyNPCs and report actors
 * Returns a Set of actor IDs that are boss/enemy NPCs for filtering events
 */
export function extractBossActorIds(
  fight: FFLogsFight,
  actors?: FFLogsActor[]
): Set<number> {
  const bossIds = new Set<number>();
  
  // Add all enemy NPC IDs from this fight
  if (fight.enemyNPCs) {
    for (const npc of fight.enemyNPCs) {
      bossIds.add(npc.id);
    }
  }
  
  // Also add actors that are type "Boss" or "NPC" (not players)
  if (actors) {
    for (const actor of actors) {
      if (actor.type === 'Boss' || (actor.type === 'NPC' && actor.subType !== 'Pet')) {
        bossIds.add(actor.id);
      }
    }
  }
  
  return bossIds;
}

/**
 * Get the primary boss name from fight data
 */
export function getBossName(
  fight: FFLogsFight,
  actors?: FFLogsActor[]
): string {
  if (actors) {
    const bossActor = actors.find(a => a.type === 'Boss');
    if (bossActor) return bossActor.name;
  }
  
  return fight.name;
}

export function createAbilityLookup(abilities: FFLogsAbility[]): Map<number, string> {
  const lookup = new Map<number, string>();
  for (const ability of abilities) {
    lookup.set(ability.gameID, ability.name);
  }
  return lookup;
}

export function parseFFLogsEventsWithOccurrences(
  events: FFLogsEvent[],
  fight: FFLogsFight,
  bossActorIds: Set<number>,
  options: ParseOptions = {}
): BossAction[] {
  const baseActions = parseFFLogsEvents(events, fight, bossActorIds, { ...options, dedupeAoE: false });
  
  const occurrenceCount = new Map<string, number>();
  const actionsWithOccurrences: BossAction[] = [];
  
  for (const action of baseActions) {
    const nameKey = action.name.toLowerCase();
    const currentOccurrence = (occurrenceCount.get(nameKey) || 0) + 1;
    occurrenceCount.set(nameKey, currentOccurrence);
    
    actionsWithOccurrences.push({
      ...action,
      occurrence: currentOccurrence,
      id: `${action.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${currentOccurrence}_${action.time}`,
    });
  }
  
  if (options.dedupeAoE !== false) {
    return dedupeAoEActions(actionsWithOccurrences);
  }
  
  return actionsWithOccurrences;
}

/**
 * Merge multiple parsed timelines from different reports
 */
export function mergeParsedTimelines(timelines: BossAction[][]): BossAction[] {
  const mergedMap = new Map<string, BossAction>();

  for (const timeline of timelines) {
    for (const action of timeline) {
      const key = `${action.name}_${action.time}`;
      const existing = mergedMap.get(key);

      if (!existing) {
        mergedMap.set(key, { ...action });
      } else {
        // Average the damage values if both have them
        if (action.unmitigatedDamage && existing.unmitigatedDamage) {
          // Keep the existing, could add smart merging here
        }
      }
    }
  }

  return Array.from(mergedMap.values()).sort((a, b) => a.time - b.time);
}
