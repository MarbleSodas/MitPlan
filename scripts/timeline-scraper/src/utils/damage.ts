/**
 * Damage Analysis and Formatting Utilities
 *
 * Handles AoE deduplication, multi-hit damage formatting,
 * and damage type detection.
 */

import type { BossAction } from '../types/index.js';
import type { FFLogsEvent } from '../types/index.js';

/**
 * Format a damage value into a human-readable string
 */
export function formatDamageValue(
  damage: number,
  event?: FFLogsEvent
): string {
  if (damage === 0) return 'N/A';
  if (damage < 1000) return `${damage}`;

  // Check for multi-hit damage (from event)
  if (event?.hitType && event.hitType > 1) {
    // hitType indicates multi-hit, calculate per-hit
    const hitCount = getHitCount(event);
    if (hitCount > 1) {
      const perHit = Math.round(damage / hitCount);
      return `~${formatNumber(perHit)} per hit (${hitCount} hits)`;
    }
  }

  return `~${formatNumber(damage)}`;
}

/**
 * Format a number with thousands separator
 */
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Get the number of hits from an event
 */
function getHitCount(event: FFLogsEvent): number {
  // hitType in FFLogs: 1 = normal, 2 = critical, 4 = direct hit, 6 = crit + direct
  // For multi-hit, we need to look at the amount structure
  // This is a simplified version - actual implementation may need more logic
  if (event.amount && event.amount > 0 && typeof event.amount === 'number') {
    // Check if this looks like a multi-hit ability
    const abilityName = event.ability?.name || '';
    if (/\b\d+\s*hits?\b/i.test(abilityName)) {
      const match = abilityName.match(/(\d+)\s*hits?/i);
      return match ? parseInt(match[1], 10) : 1;
    }
  }
  return 1;
}

/**
 * Determine damage type from FFLogs event
 */
export function determineDamageType(event: FFLogsEvent): 'physical' | 'magical' | 'mixed' {
  // FFLogs doesn't explicitly expose damage type in events
  // We need to infer from ability properties or known mappings
  const abilityName = event.ability?.name?.toLowerCase() || '';

  // Physical indicators
  const physicalKeywords = [
    'slash', 'pierce', 'blunt', 'strike', 'shot', 'blast',
    'swing', 'kick', 'punch', 'claw', 'fang', 'horn',
    'torture', 'ravage', 'devour', 'gnaw',
  ];

  // Magical indicators
  const magicalKeywords = [
    'fire', 'blizzard', 'thunder', 'aero', 'stone', 'water',
    'flare', 'freeze', 'burst', 'miasma', 'bio',
    'holy', 'dark', 'void', 'cosmos',
    'beam', 'laser', 'ray', 'pulse', 'wave',
    'bomb', 'explosion', 'eruption',
  ];

  const hasPhysical = physicalKeywords.some(k => abilityName.includes(k));
  const hasMagical = magicalKeywords.some(k => abilityName.includes(k));

  if (hasPhysical && hasMagical) return 'mixed';
  if (hasMagical) return 'magical';
  if (hasPhysical) return 'physical';

  // Default to physical for unknown
  return 'physical';
}

/**
 * AoE-related ability name patterns
 */
const AOE_PATTERNS = [
  /\baoe\b/i,
  /\bpbaoe\b/i,
  /\bcircle\b/i,
  /\bdonut\b/i,
  /\bcone\b/i,
  /\bwide\b/i,
  /\braidwide\b/i,
  /\braid\b/i,
  /\bparty\b/i,
  /\ball\b/i,
];

/**
 * Check if an ability name suggests AoE damage
 */
export function isAoEAbility(name: string): boolean {
  return AOE_PATTERNS.some(p => p.test(name));
}

/**
 * Check if two actions are duplicates within a time window
 */
export function areDuplicateActions(
  action1: BossAction,
  action2: BossAction,
  timeWindowSeconds = 3
): boolean {
  // Same or similar name
  const nameMatch = action1.name === action2.name ||
    normalizeAbilityName(action1.name) === normalizeAbilityName(action2.name);

  // Within time window
  const timeMatch = Math.abs(action1.time - action2.time) <= timeWindowSeconds;

  return nameMatch && timeMatch;
}

/**
 * Normalize an ability name for comparison
 */
function normalizeAbilityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Deduplicate AoE actions that hit multiple targets
 *
 * When a boss uses an AoE ability, it may create multiple events
 * for each target. We want to keep only one entry.
 */
export function dedupeAoEActions(actions: BossAction[]): BossAction[] {
  const deduped: BossAction[] = [];
  const seen = new Set<string>();

  // Sort by time to process in order
  const sorted = [...actions].sort((a, b) => a.time - b.time);

  for (const action of sorted) {
    const normalizedName = normalizeAbilityName(action.name);
    const timeWindow = Math.floor(action.time / 3); // 3-second windows

    const key = `${normalizedName}_${timeWindow}`;

    if (seen.has(key)) {
      // Check if there's already a similar action
      const existing = deduped.find(a =>
        normalizeAbilityName(a.name) === normalizedName &&
        Math.abs(a.time - action.time) <= 3
      );

      if (existing) {
        // Update damage if this one has higher
        if (action.unmitigatedDamage && existing.unmitigatedDamage) {
          // Keep the higher damage value or average
          const existingDamage = parseDamage(existing.unmitigatedDamage);
          const newDamage = parseDamage(action.unmitigatedDamage);
          if (newDamage > existingDamage) {
            existing.unmitigatedDamage = action.unmitigatedDamage;
          }
        }
        continue;
      }
    }

    seen.add(key);
    deduped.push(action);
  }

  return deduped.sort((a, b) => a.time - b.time);
}

/**
 * Parse damage value from string
 */
function parseDamage(damageStr: string): number {
  // Extract the first number from the string
  const match = damageStr.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ''), 10);
  }
  return 0;
}

/**
 * Group actions by phase based on time gaps
 */
export function groupActionsByPhase(
  actions: BossAction[],
  phaseGapSeconds = 30
): Map<number, BossAction[]> {
  const phases = new Map<number, BossAction[]>();
  let currentPhase = 1;
  let lastTime = 0;

  for (const action of actions) {
    // Check for phase transition (significant time gap)
    if (lastTime > 0 && action.time - lastTime > phaseGapSeconds) {
      currentPhase++;
    }

    if (!phases.has(currentPhase)) {
      phases.set(currentPhase, []);
    }
    phases.get(currentPhase)!.push(action);
    lastTime = action.time;
  }

  return phases;
}

/**
 * Calculate average damage for an ability across multiple uses
 */
export function calculateAverageDamage(
  actions: BossAction[],
  abilityName: string
): number {
  const matching = actions.filter(a =>
    normalizeAbilityName(a.name) === normalizeAbilityName(abilityName)
  );

  if (matching.length === 0) return 0;

  const damages = matching
    .map(a => parseDamage(a.unmitigatedDamage || '0'))
    .filter(d => d > 0);

  if (damages.length === 0) return 0;

  return Math.round(damages.reduce((sum, d) => sum + d, 0) / damages.length);
}
