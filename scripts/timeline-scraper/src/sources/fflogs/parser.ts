/**
 * FFLogs Event Parser
 *
 * Converts raw FFLogs event data into MitPlan boss action format.
 */

import type { FFLogsEvent, FFLogsFight, FFLogsEnemy, BossAction } from '../../types/index.js';
import { dedupeAoEActions, formatDamageValue, determineDamageType } from '../../utils/damage.js';

export interface ParseOptions {
  includeDodgeable?: boolean;
  dedupeAoE?: boolean;
  minDamageThreshold?: number;
  filterBuffs?: boolean;
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
  bossEnemy: FFLogsEnemy | undefined,
  options: ParseOptions = {}
): BossAction[] {
  const {
    includeDodgeable = false,
    dedupeAoE = true,
    minDamageThreshold = 100,
  } = options;

  // Group events by ability and time window
  const abilityMap = new Map<string, BossAction>();
  const processedIds = new Set<string>();

  for (const event of events) {
    // Skip events without ability info
    if (!event.ability) continue;

    // Skip non-damaging events if not filtering buffs
    const damage = event.amount ?? event.damage ?? 0;
    if (damage < minDamageThreshold && !options.filterBuffs) continue;

    const abilityName = event.ability.name.trim();
    const abilityGuid = event.ability.guid;

    // Skip known non-damaging abilities
    if (NON_DAMAGING_PATTERNS.some(p => p.test(abilityName))) {
      continue;
    }

    // Skip buff/debuff abilities
    if (BUFF_ABILITY_IDS.has(abilityGuid)) continue;

    // Calculate relative time in seconds from fight start
    const relativeTime = Math.round((event.timestamp - fight.startTime) / 1000);

    // Skip events at time 0 (usually pre-pull)
    if (relativeTime <= 0) continue;

    // Check if this is a dodgeable mechanic
    const isDodgeable = isDodgeableMechanic(abilityName, event);
    if (isDodgeable && !includeDodgeable) continue;

    // Create a unique ID for this ability usage
    const baseId = createActionId(abilityName, abilityGuid);
    const usageId = `${baseId}_${relativeTime}`;

    if (processedIds.has(usageId)) continue;
    processedIds.add(usageId);

    // Determine if this is a tank buster
    const isTankBuster = isTankBusterEvent(event);

    // Get damage values for formatting
    const totalDamage = event.amount ?? event.damage ?? 0;
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
      // Check if it's a dual tank buster by looking for multi-target
      if (event.target?.type === 'NPC' && isMultiTargetTankBuster(abilityName)) {
        action.isDualTankBuster = true;
      }
    }

    // Store the action
    if (!abilityMap.has(usageId)) {
      abilityMap.set(usageId, action);
    }
  }

  const actions = Array.from(abilityMap.values()).sort((a, b) => a.time - b.time);

  // Apply AoE deduplication if enabled
  if (dedupeAoE) {
    return dedupeAoEActions(actions);
  }

  return actions;
}

/**
 * Check if an ability is a dodgeable mechanic
 */
function isDodgeableMechanic(abilityName: string, event: FFLogsEvent): boolean {
  // If no damage, it's likely a dodgeable mechanic
  const hasDamage = (event.amount ?? 0) > 0 || (event.damage ?? 0) > 0;
  if (!hasDamage) return true;

  // Check against dodgeable patterns
  return DODGEABLE_PATTERNS.some(p => p.test(abilityName));
}

/**
 * Check if an event is a tank buster
 */
function isTankBusterEvent(event: FFLogsEvent): boolean {
  if (!event.target) return false;

  // Single target on a tank role player
  const isTankTarget = event.target.type === 'Player';

  // High damage single-target ability
  const damage = event.amount ?? event.damage ?? 0;
  const isHighDamage = damage > 50000; // Adjust threshold as needed

  // Check ability name for tank buster indicators
  const name = event.ability?.name ?? '';
  const hasTankBusterName = /\b(buster|fracture|needle|shot|blast|strike|blow)\b/i.test(name);

  return isTankTarget && (isHighDamage || hasTankBusterName);
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
 * Extract enemy information for parsing
 */
export function extractBossEnemy(
  enemies: FFLogsEnemy[],
  fight: FFLogsFight
): FFLogsEnemy | undefined {
  // Find enemy matching the fight boss ID
  let boss = enemies.find(e => e.id === fight.boss);
  if (boss) return boss;

  // Find by type "Boss" or "Unknown"
  boss = enemies.find(e => e.type === 'Boss' || e.type === 'Unknown');
  if (boss) return boss;

  // Fall back to first non-NPC enemy
  return enemies.find(e => e.type !== 'NPC');
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
