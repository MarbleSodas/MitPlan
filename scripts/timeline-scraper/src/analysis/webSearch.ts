import type { AbilityWebInfo, BossAction, MechanicType } from '../types/index.js';

interface WebSearchConfig {
  enabled: boolean;
  sources: ('consolegameswiki' | 'ffxiv.gamerescape' | 'akhmorning' | 'thebalanceffxiv')[];
  timeout: number;
  cacheResults: boolean;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  enabled: true,
  sources: ['consolegameswiki', 'ffxiv.gamerescape'],
  timeout: 10000,
  cacheResults: true,
};

const searchCache = new Map<string, AbilityWebInfo[]>();

export async function searchAbilityInfo(
  abilityName: string,
  bossName: string,
  config: Partial<WebSearchConfig> = {}
): Promise<AbilityWebInfo[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (!cfg.enabled) {
    return [];
  }
  
  const cacheKey = `${bossName}_${abilityName}`.toLowerCase();
  if (cfg.cacheResults && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
  
  try {
    const results = await performWebSearch(abilityName, bossName, cfg);
    
    if (cfg.cacheResults) {
      searchCache.set(cacheKey, results);
    }
    
    return results;
  } catch (error) {
    console.warn(`Web search failed for ${abilityName}: ${(error as Error).message}`);
    return [];
  }
}

async function performWebSearch(
  abilityName: string,
  bossName: string,
  config: WebSearchConfig
): Promise<AbilityWebInfo[]> {
  const query = `FFXIV ${bossName} ${abilityName} mechanic guide`;
  
  try {
    const response = await fetchWithTimeout(
      buildSearchUrl(query),
      config.timeout
    );
    
    if (!response) {
      return buildFallbackInfo(abilityName, bossName);
    }
    
    return parseSearchResults(response, abilityName);
  } catch {
    return buildFallbackInfo(abilityName, bossName);
  }
}

function buildSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encoded}`;
}

async function fetchWithTimeout(url: string, timeout: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MitPlan/1.0)',
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.text();
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

function parseSearchResults(html: string, abilityName: string): AbilityWebInfo[] {
  const results: AbilityWebInfo[] = [];
  
  const urlPattern = /https?:\/\/[^\s"<>]+(?:ffxiv|finalfantasy|thebalance)[^\s"<>]*/gi;
  const urls = html.match(urlPattern) || [];
  
  for (const url of urls.slice(0, 3)) {
    const source = extractSourceName(url);
    results.push({
      name: abilityName,
      description: `Information from ${source}`,
      source,
      url,
    });
  }
  
  return results;
}

function extractSourceName(url: string): string {
  if (url.includes('consolegameswiki')) return 'Console Games Wiki';
  if (url.includes('gamerescape')) return 'Gamer Escape';
  if (url.includes('akhmorning')) return 'Akh Morning';
  if (url.includes('thebalance')) return 'The Balance';
  return 'Web';
}

function buildFallbackInfo(abilityName: string, bossName: string): AbilityWebInfo[] {
  return [{
    name: abilityName,
    description: inferDescriptionFromName(abilityName),
    source: 'inferred',
    url: '',
    mechanicType: inferMechanicTypeFromName(abilityName),
    damageType: inferDamageTypeFromName(abilityName),
  }];
}

function inferDescriptionFromName(name: string): string {
  const lower = name.toLowerCase();
  
  if (/impact|burst|special|wave/.test(lower)) {
    return 'Raidwide damage that hits all party members';
  }
  if (/buster|smash|cleave/.test(lower)) {
    return 'Heavy damage targeting tanks';
  }
  if (/stack|share/.test(lower)) {
    return 'Stack marker requiring players to group up';
  }
  if (/spread|scatter/.test(lower)) {
    return 'Spread mechanic requiring players to separate';
  }
  if (/seeds|plant|grow/.test(lower)) {
    return 'Mechanic involving positional requirements';
  }
  if (/explosion|bomb/.test(lower)) {
    return 'Explosive damage with potential knockback';
  }
  
  return `${name} mechanic`;
}

function inferMechanicTypeFromName(name: string): MechanicType {
  const lower = name.toLowerCase();
  
  if (/buster|smash|cleave|fracture/.test(lower)) return 'tankbuster';
  if (/impact|burst|special|wave|raid/.test(lower)) return 'raidwide';
  if (/stack|share/.test(lower)) return 'stack';
  if (/spread|scatter/.test(lower)) return 'spread';
  if (/explosion|bomb|proximity/.test(lower)) return 'proximity';
  if (/enrage/.test(lower)) return 'enrage';
  if (/transition|phase/.test(lower)) return 'transition';
  
  return 'mechanic';
}

function inferDamageTypeFromName(name: string): 'physical' | 'magical' | 'mixed' {
  const lower = name.toLowerCase();
  
  const magicalPatterns = /fire|ice|thunder|water|wind|earth|holy|dark|void|flare|burst|beam|ray/;
  const physicalPatterns = /smash|slash|strike|punch|claw|crush|blow|swing|hit/;
  
  const hasMagical = magicalPatterns.test(lower);
  const hasPhysical = physicalPatterns.test(lower);
  
  if (hasMagical && hasPhysical) return 'mixed';
  if (hasMagical) return 'magical';
  return 'physical';
}

export async function enrichActionsWithWebData(
  actions: BossAction[],
  bossName: string,
  config: Partial<WebSearchConfig> = {}
): Promise<BossAction[]> {
  const enriched: BossAction[] = [];
  const uniqueAbilities = new Set<string>();
  const webInfoMap = new Map<string, AbilityWebInfo>();
  
  for (const action of actions) {
    const key = action.name.toLowerCase();
    if (!uniqueAbilities.has(key)) {
      uniqueAbilities.add(key);
      const results = await searchAbilityInfo(action.name, bossName, config);
      if (results.length > 0) {
        webInfoMap.set(key, results[0]);
      }
    }
  }
  
  for (const action of actions) {
    const key = action.name.toLowerCase();
    const webInfo = webInfoMap.get(key);
    
    if (webInfo) {
      enriched.push({
        ...action,
        description: action.description || webInfo.description,
        damageType: action.damageType || webInfo.damageType,
        analysisSource: 'web',
      });
    } else {
      enriched.push(action);
    }
  }
  
  return enriched;
}

export function clearSearchCache(): void {
  searchCache.clear();
}

export function buildBossGuideUrl(bossName: string): string {
  const normalized = bossName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `https://ffxiv.consolegameswiki.com/wiki/${normalized}`;
}

export function buildFFLogsUrl(bossId: string, encounterId: number): string {
  return `https://www.fflogs.com/zone/rankings/${encounterId}`;
}
