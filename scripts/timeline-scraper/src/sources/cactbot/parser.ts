/**
 * Cactbot Timeline Parser
 *
 * Parses Cactbot timeline files into MitPlan boss action format.
 * Timeline files follow the Cactbot timeline format documented at:
 * https://github.com/OverlayPlugin/cactbot/blob/main/docs/TimelineGuide.md
 */

import type { BossAction, CactbotTimelineEntry } from '../../types/index.js';

export interface CactbotParseOptions {
  includeAlerts?: boolean;
  includeInfoOnly?: boolean;
  filterDodgeable?: boolean;
}

/**
 * Fetch a Cactbot timeline file from the repository
 */
export async function fetchCactbotTimeline(
  url: string
): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Cactbot timeline: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Parse Cactbot timeline text into structured entries
 * 
 * Modern Cactbot format examples:
 * - 10.5 "Brutal Impact x6" Ability { id: "A55B", source: "Brute Abombinator" } duration 5.2
 * - 23.1 "Stoneringer" Ability { id: ["A55D", "A55E"], source: "Brute Abombinator" }
 * - 0.0 "--sync--" InCombat { inGameCombat: "1" } window 0,1
 */
export function parseCactbotTimeline(
  timelineText: string,
  options: CactbotParseOptions = {}
): CactbotTimelineEntry[] {
  const {
    includeAlerts = true,
    includeInfoOnly = false,
    filterDodgeable = true,
  } = options;

  const entries: CactbotTimelineEntry[] = [];
  const lines = timelineText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // Parse timeline entry - handles modern Cactbot format
    // Format: TIME "NAME" [TYPE] [{ options }] [key: value]...
    // Example: 10.5 "Brutal Impact x6" Ability { id: "A55B", source: "Brute Abombinator" } duration 5.2
    const match = trimmed.match(/^(\d+\.?\d*)\s+"([^"]+)"/);
    if (!match) continue;

    const [, timeStr, name] = match;
    const time = parseFloat(timeStr);

    // Skip internal sync markers and non-ability entries
    if (name.startsWith('--') && name.endsWith('--')) {
      continue;
    }

    // Determine entry type from what follows the name
    const afterName = trimmed.substring(match[0].length).trim();
    let entryType: string | undefined;
    
    // Check for Ability, ActorControl, InCombat, etc.
    const typeMatch = afterName.match(/^(Ability|ActorControl|InCombat|StartsUsing|AddedCombatant)\b/i);
    if (typeMatch) {
      entryType = typeMatch[1];
    } else {
      // Legacy format: TIME "NAME" alert/alarm/info
      const legacyTypeMatch = afterName.match(/^(alert|alarm|info)\b/i);
      if (legacyTypeMatch) {
        entryType = legacyTypeMatch[1];
      }
    }

    // Skip non-Ability entries (InCombat, ActorControl, etc.) as they're not damage mechanics
    if (entryType && !['Ability', 'StartsUsing', 'alert', 'alarm', 'info'].includes(entryType)) {
      continue;
    }

    // Filter out dodgeable mechanics if requested (only for non-Ability types)
    // Ability entries should NOT be filtered by dodgeable patterns since they represent actual casts
    const isAbilityEntry = entryType === 'Ability' || entryType === 'StartsUsing';
    if (filterDodgeable && !isAbilityEntry && isDodgeableOnly(name, entryType)) {
      continue;
    }

    const entry: CactbotTimelineEntry = {
      time: Math.round(time),
      name: name.trim(),
    };

    if (entryType) {
      entry.type = entryType as CactbotTimelineEntry['type'];
    }

    // Extract ability ID from { id: "XXXX" } or { id: ["XXXX", "YYYY"] }
    const idMatch = afterName.match(/id:\s*(?:"([^"]+)"|\["([^\]]+)"\]|\[([^\]]+)\])/);
    if (idMatch) {
      // Take the first ID if multiple are listed
      const idValue = idMatch[1] || idMatch[2] || idMatch[3];
      if (idValue) {
        entry.id = idValue.split(/[",\s]+/).filter(Boolean)[0];
      }
    }

    // Parse duration from "duration X.X" at end of line
    const durationMatch = afterName.match(/duration\s+(\d+\.?\d*)/);
    if (durationMatch) {
      entry.duration = parseFloat(durationMatch[1]);
    }

    // Parse window from "window X,Y" 
    const windowMatch = afterName.match(/window\s+(\d+\.?\d*)/);
    if (windowMatch) {
      entry.window = parseFloat(windowMatch[1]);
    }

    entries.push(entry);
  }

  return entries;
}

/**
 * Check if a timeline entry is a dodgeable-only mechanic
 */
function isDodgeableOnly(name: string, type?: string): boolean {
  const dodgeablePatterns = [
    /\b(spread|stack|outside|inside|middle|away|close)\b/i,
    /\b(sphere|circle|donut|line|cone|cleave)\b/i,
    /\b(safe|danger)\b/i,
    /\b(knockback|pull|push|drag)\b/i,
    /\b(tether|beam|laser)\b/i,
  ];

  // If type is info and name contains dodgeable pattern, it's likely dodgeable only
  if (type === 'info' || !type) {
    return dodgeablePatterns.some(p => p.test(name));
  }

  return false;
}

/**
 * Convert Cactbot timeline entries to MitPlan boss actions
 */
export function cactbotToMitPlanActions(
  entries: CactbotTimelineEntry[],
  bossId: string
): BossAction[] {
  const actions: BossAction[] = [];

  for (const entry of entries) {
    const actionId = entry.id || createActionIdFromName(entry.name, entry.time);

    const action: BossAction = {
      id: `${bossId}_${actionId}`,
      name: entry.name,
      time: entry.time,
      importance: getImportanceFromType(entry.type),
      icon: getIconFromName(entry.name),
    };

    // Add duration if present
    if (entry.duration) {
      action.description = `Duration: ${entry.duration}s`;
    }

    actions.push(action);
  }

  return actions.sort((a, b) => a.time - b.time);
}

/**
 * Create an action ID from name and time
 */
function createActionIdFromName(name: string, time: number): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${sanitized}_${time}`;
}

/**
 * Map Cactbot entry type to MitPlan importance
 */
function getImportanceFromType(
  type?: string
): 'low' | 'medium' | 'high' | 'critical' {
  switch (type) {
    case 'alarm':
      return 'critical';
    case 'alert':
      return 'high';
    case 'info':
      return 'medium';
    default:
      return 'medium';
  }
}

/**
 * Get an appropriate icon for an ability name
 */
function getIconFromName(name: string): string {
  const lower = name.toLowerCase();

  if (/\btankbuster\b|\bbuster\b/i.test(name)) return '🛡️';
  if (/\baoe\b|\braid\b/i.test(name)) return '⭕';
  if (/\bstack\b/i.test(name)) return '🎯';
  if (/\bspread\b/i.test(name)) return '💫';
  if (/\bline\b|\bbeam\b|\blaser\b/i.test(name)) return '➡️';
  if (/\bcircle\b|\bdonut\b/i.test(name)) return '⭕';
  if (/\bknockback\b/i.test(name)) return '💨';
  if (/\btether\b/i.test(name)) return '🔗';
  if (/\bdebuff\b|\bdoom\b/i.test(name)) return '☠️';
  if (/\bbuff\b|\bshield\b/i.test(name)) return '🛡️';

  return '⚔️';
}

/**
 * Load and parse a Cactbot timeline by boss ID
 */
export async function loadCactbotTimeline(
  bossId: string,
  timelinePath: string,
  baseUrl: string = 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main',
  options: CactbotParseOptions = {}
): Promise<BossAction[]> {
  const url = `${baseUrl}/${timelinePath}`;

  try {
    const timelineText = await fetchCactbotTimeline(url);
    const entries = parseCactbotTimeline(timelineText, options);
    return cactbotToMitPlanActions(entries, bossId);
  } catch (error) {
    throw new Error(`Failed to load Cactbot timeline for ${bossId}: ${(error as Error).message}`);
  }
}

export async function loadCactbotTimelineSafe(
  bossId: string,
  timelinePath: string,
  baseUrl: string = 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main',
  options: CactbotParseOptions = {}
): Promise<{ actions: BossAction[]; available: boolean; error?: string }> {
  const url = `${baseUrl}/${timelinePath}`;

  try {
    const response = await fetch(url);
    
    if (response.status === 404) {
      return {
        actions: [],
        available: false,
        error: `Cactbot timeline not available for ${bossId} (7.x content not yet supported by Cactbot)`,
      };
    }
    
    if (!response.ok) {
      return {
        actions: [],
        available: false,
        error: `Failed to fetch Cactbot timeline: ${response.status}`,
      };
    }
    
    const timelineText = await response.text();
    const entries = parseCactbotTimeline(timelineText, options);
    const actions = cactbotToMitPlanActions(entries, bossId);
    
    return { actions, available: true };
  } catch (error) {
    return {
      actions: [],
      available: false,
      error: `Error fetching Cactbot timeline: ${(error as Error).message}`,
    };
  }
}

export function fuzzyMatchActionName(fflogsName: string, cactbotName: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = normalize(fflogsName);
  const b = normalize(cactbotName);
  
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  
  const similarity = calculateSimilarity(a, b);
  return similarity > 0.8;
}

function calculateSimilarity(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

export function buildCactbotOccurrenceMap(
  cactbotActions: BossAction[]
): Map<string, BossAction[]> {
  const map = new Map<string, BossAction[]>();
  
  for (const action of cactbotActions) {
    const key = action.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(action);
  }
  
  for (const [_, actions] of map) {
    actions.sort((a, b) => a.time - b.time);
  }
  
  return map;
}

/**
 * Merge Cactbot timeline with FFLogs parsed data
 *
 * Cactbot provides timing and mechanic identification
 * FFLogs provides damage values and validation
 */
export function mergeCactbotWithFFLogs(
  cactbotActions: BossAction[],
  fflogsActions: BossAction[]
): BossAction[] {
  const merged = new Map<string, BossAction>();

  // Add all Cactbot actions first
  for (const action of cactbotActions) {
    merged.set(`${action.name}_${action.time}`, action);
  }

  // Merge FFLogs data
  for (const ffAction of fflogsActions) {
    // Find matching Cactbot action by time proximity
    let found = false;

    for (const [key, cactAction] of merged) {
      if (actionsMatch(cactAction, ffAction)) {
        // Update with FFLogs damage data
        if (ffAction.unmitigatedDamage) {
          cactAction.unmitigatedDamage = ffAction.unmitigatedDamage;
        }
        if (ffAction.damageType) {
          cactAction.damageType = ffAction.damageType;
        }
        if (ffAction.isTankBuster) {
          cactAction.isTankBuster = true;
          if (ffAction.isDualTankBuster) {
            cactAction.isDualTankBuster = true;
          }
        }
        found = true;
        break;
      }
    }

    // Add FFLogs-only actions
    if (!found) {
      merged.set(`${ffAction.name}_${ffAction.time}`, ffAction);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.time - b.time);
}

/**
 * Check if two actions represent the same mechanic
 */
function actionsMatch(a: BossAction, b: BossAction): boolean {
  const timeDiff = Math.abs(a.time - b.time);
  const nameMatch = a.name.toLowerCase() === b.name.toLowerCase();

  // Match if names are similar and within 5 seconds
  if (nameMatch && timeDiff <= 5) {
    return true;
  }

  // Match if times are very close (within 2 seconds)
  if (timeDiff <= 2) {
    return true;
  }

  return false;
}

/**
 * Get list of available Cactbot timelines
 *
 * This would scan the Cactbot repository for timeline files.
 * For now, return a hardcoded list based on known Dawntrail bosses.
 */
export function getAvailableCactbotTimelines(): string[] {
  return [
    // Dawntrail Savage (7.x)
    'ui/raidboss/data/07-dt/savage/r1s.txt',
    'ui/raidboss/data/07-dt/savage/r2s.txt',
    'ui/raidboss/data/07-dt/savage/r3s.txt',
    'ui/raidboss/data/07-dt/savage/r4s.txt',
    'ui/raidboss/data/07-dt/savage/r5s.txt',
    'ui/raidboss/data/07-dt/savage/r6s.txt',
    'ui/raidboss/data/07-dt/savage/r7s.txt',
    'ui/raidboss/data/07-dt/savage/r8s.txt',
    // Dawntrail Normal
    'ui/raidboss/data/07-dt/raid/r1.txt',
    'ui/raidboss/data/07-dt/raid/r2.txt',
    'ui/raidboss/data/07-dt/raid/r3.txt',
    'ui/raidboss/data/07-dt/raid/r4.txt',
  ];
}
