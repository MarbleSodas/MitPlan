import type { BossAction, CactbotTimelineEntry } from '../../types/index.js';

export interface CactbotParseOptions {
  includeAlerts?: boolean;
  includeInfoOnly?: boolean;
  filterDodgeable?: boolean;
  abilityOnly?: boolean;
}

export interface ParsedCactbotEntry extends CactbotTimelineEntry {
  abilityIds?: string[];
  alternativeNames?: string[];
  hitCount?: number;
  isCommented?: boolean;
  rawLine?: string;
  resolvedDamageTime?: number;
  originalCastTime?: number;
  originalName?: string;
}

export interface TimingHint {
  time: number;
  name: string;
  baseName: string;
  abilityIds?: string[];
}

export async function fetchCactbotTimeline(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Cactbot timeline: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export function parseCactbotTimeline(
  timelineText: string,
  options: CactbotParseOptions = {}
): CactbotTimelineEntry[] {
  return parseCactbotTimelineExtended(timelineText, options);
}

export function parseCactbotTimelineExtended(
  timelineText: string,
  options: CactbotParseOptions = {}
): ParsedCactbotEntry[] {
  const {
    filterDodgeable = false,
    abilityOnly = true,
  } = options;

  const entries: ParsedCactbotEntry[] = [];
  const timingHints: TimingHint[] = [];
  const lines = timelineText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//')) {
      continue;
    }
    
    if (trimmed.startsWith('#') && !trimmed.match(/^#?\s*\d+\.?\d*\s+"/)) {
      continue;
    }

    const isLineCommented = trimmed.startsWith('#');
    const match = trimmed.match(/^#?\s*(\d+\.?\d*)\s+"([^"]+)"/);
    if (!match) continue;

    const [fullMatch, timeStr, name] = match;
    const time = parseFloat(timeStr);

    if (name.startsWith('--') && name.endsWith('--')) {
      continue;
    }

    const afterName = trimmed.substring(fullMatch.length).trim();
    let entryType: string | undefined;
    let isCommented = isLineCommented;
    
    const commentedTypeMatch = afterName.match(/^#(Ability|StartsUsing)\b/i);
    if (commentedTypeMatch) {
      entryType = commentedTypeMatch[1];
      isCommented = true;
    } else {
      const typeMatch = afterName.match(/^(Ability|ActorControl|InCombat|StartsUsing|AddedCombatant)\b/i);
      if (typeMatch) {
        entryType = typeMatch[1];
      } else {
        const legacyTypeMatch = afterName.match(/^(alert|alarm|info)\b/i);
        if (legacyTypeMatch) {
          entryType = legacyTypeMatch[1];
        }
      }
    }

    if (entryType && !['Ability', 'StartsUsing', 'alert', 'alarm', 'info'].includes(entryType)) {
      continue;
    }

    if (abilityOnly && entryType !== 'Ability' && entryType !== 'StartsUsing') {
      continue;
    }

    if (filterDodgeable && isDodgeableOnly(name, entryType)) {
      continue;
    }

    const abilityIds = extractAbilityIds(afterName);

    if (isCommented && entryType === 'Ability') {
      timingHints.push({
        time: Math.round(time * 10) / 10,
        name: cleanActionName(name),
        baseName: getBaseActionName(name),
        abilityIds: abilityIds.length > 0 ? abilityIds : undefined,
      });
      continue;
    }

    if (isCommented) {
      continue;
    }

    const entry: ParsedCactbotEntry = {
      time: Math.round(time * 10) / 10,
      name: cleanActionName(name),
      rawLine: trimmed,
      isCommented,
    };

    if (entryType) {
      entry.type = entryType as CactbotTimelineEntry['type'];
    }

    if (name.includes('/')) {
      entry.alternativeNames = name.split('/').map(n => cleanActionName(n.trim()));
    }

    const hitCountMatch = name.match(/\s+x(\d+)$/i);
    if (hitCountMatch) {
      entry.hitCount = parseInt(hitCountMatch[1], 10);
    }

    if (abilityIds.length > 0) {
      entry.abilityIds = abilityIds;
      entry.id = abilityIds[0];
    }

    const durationMatch = afterName.match(/duration\s+(\d+\.?\d*)/);
    if (durationMatch) {
      entry.duration = parseFloat(durationMatch[1]);
    }

    const windowMatch = afterName.match(/window\s+(\d+\.?\d*)/);
    if (windowMatch) {
      entry.window = parseFloat(windowMatch[1]);
    }

    entries.push(entry);
  }

  return resolveCastToDamageTimings(entries, timingHints);
}

function extractAbilityIds(text: string): string[] {
  const arrayMatch = text.match(/id:\s*\[([^\]]+)\]/);
  if (arrayMatch) {
    return arrayMatch[1]
      .split(',')
      .map(s => s.trim().replace(/"/g, ''))
      .filter(Boolean);
  }

  const singleMatch = text.match(/id:\s*"([^"]+)"/);
  if (singleMatch) {
    return [singleMatch[1]];
  }

  return [];
}

function cleanActionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function resolveCastToDamageTimings(
  entries: ParsedCactbotEntry[],
  timingHints: TimingHint[]
): ParsedCactbotEntry[] {
  if (timingHints.length === 0) {
    return entries;
  }

  const hintsByBaseName = new Map<string, TimingHint[]>();
  for (const hint of timingHints) {
    if (!hintsByBaseName.has(hint.baseName)) {
      hintsByBaseName.set(hint.baseName, []);
    }
    hintsByBaseName.get(hint.baseName)!.push(hint);
  }

  for (const [_, hints] of hintsByBaseName) {
    hints.sort((a, b) => a.time - b.time);
  }

  const usedHintIndices = new Map<string, number>();

  return entries.map(entry => {
    if (!isCastEntry(entry.name)) {
      return entry;
    }

    const entryBaseName = getBaseActionName(entry.name);
    const hints = hintsByBaseName.get(entryBaseName);
    
    if (!hints || hints.length === 0) {
      return entry;
    }

    const currentIndex = usedHintIndices.get(entryBaseName) || 0;
    
    const relevantHints = hints.filter(h => h.time > entry.time && h.time <= entry.time + 15);
    
    if (relevantHints.length === 0) {
      return entry;
    }

    const firstDamageHint = relevantHints[0];
    
    const newName = removeCastSuffix(entry.name);
    
    usedHintIndices.set(entryBaseName, currentIndex + relevantHints.length);

    return {
      ...entry,
      originalName: entry.name,
      originalCastTime: entry.time,
      name: newName,
      time: firstDamageHint.time,
      resolvedDamageTime: firstDamageHint.time,
    };
  });
}

function isCastEntry(name: string): boolean {
  return /\(cast\)$/i.test(name);
}

function removeCastSuffix(name: string): string {
  return name.replace(/\s*\(cast\)$/i, '').trim();
}

export function getBaseActionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+x\d+$/i, '')
    .replace(/\s*\([^)]+\)$/i, '')
    .replace(/\s+\d+$/i, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getNameVariations(name: string): string[] {
  const variations: string[] = [name.toLowerCase()];
  const baseName = getBaseActionName(name);
  
  if (baseName !== name.toLowerCase()) {
    variations.push(baseName);
  }

  if (name.includes('/')) {
    const parts = name.split('/');
    for (const part of parts) {
      const partLower = part.trim().toLowerCase();
      if (!variations.includes(partLower)) {
        variations.push(partLower);
      }
      const partBase = getBaseActionName(part);
      if (!variations.includes(partBase)) {
        variations.push(partBase);
      }
    }
  }

  return variations;
}

function isDodgeableOnly(name: string, type?: string): boolean {
  const dodgeablePatterns = [
    /\b(spread|stack|outside|inside|middle|away|close)\b/i,
    /\b(sphere|circle|donut|line|cone|cleave)\b/i,
    /\b(safe|danger)\b/i,
    /\b(knockback|pull|push|drag)\b/i,
    /\b(tether|beam|laser)\b/i,
  ];

  if (type === 'info' || !type) {
    return dodgeablePatterns.some(p => p.test(name));
  }

  return false;
}

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

    if (entry.duration) {
      action.description = `Duration: ${entry.duration}s`;
    }

    actions.push(action);
  }

  return actions.sort((a, b) => a.time - b.time);
}

function createActionIdFromName(name: string, time: number): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${sanitized}_${time}`;
}

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

export function mergeCactbotWithFFLogs(
  cactbotActions: BossAction[],
  fflogsActions: BossAction[]
): BossAction[] {
  const merged = new Map<string, BossAction>();

  for (const action of cactbotActions) {
    merged.set(`${action.name}_${action.time}`, action);
  }

  for (const ffAction of fflogsActions) {
    let found = false;

    for (const [key, cactAction] of merged) {
      if (actionsMatch(cactAction, ffAction)) {
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

    if (!found) {
      merged.set(`${ffAction.name}_${ffAction.time}`, ffAction);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.time - b.time);
}

function actionsMatch(a: BossAction, b: BossAction): boolean {
  const timeDiff = Math.abs(a.time - b.time);
  const nameMatch = a.name.toLowerCase() === b.name.toLowerCase();

  if (nameMatch && timeDiff <= 5) {
    return true;
  }

  if (timeDiff <= 2) {
    return true;
  }

  return false;
}

export function getAvailableCactbotTimelines(): string[] {
  return [
    'ui/raidboss/data/07-dt/raid/r1s.txt',
    'ui/raidboss/data/07-dt/raid/r2s.txt',
    'ui/raidboss/data/07-dt/raid/r3s.txt',
    'ui/raidboss/data/07-dt/raid/r4s.txt',
    'ui/raidboss/data/07-dt/raid/r5s.txt',
    'ui/raidboss/data/07-dt/raid/r6s.txt',
    'ui/raidboss/data/07-dt/raid/r7s.txt',
    'ui/raidboss/data/07-dt/raid/r8s.txt',
    'ui/raidboss/data/07-dt/raid/r1n.txt',
    'ui/raidboss/data/07-dt/raid/r2n.txt',
    'ui/raidboss/data/07-dt/raid/r3n.txt',
    'ui/raidboss/data/07-dt/raid/r4n.txt',
  ];
}
