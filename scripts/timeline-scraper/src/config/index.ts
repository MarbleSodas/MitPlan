/**
 * Timeline Scraper Configuration
 *
 * Includes FFLogs V2 API settings and Cactbot timeline paths
 */

import type { ScraperConfig } from '../types/index.js';

/**
 * FFLogs API endpoints (V2)
 */
export const FFLOGS_API_URL = 'https://www.fflogs.com/api/v2';
export const FFLOGS_API_URL_CLIENT = 'https://www.fflogs.com/api/v2/client';
export const FFLOGS_API_URL_USER = 'https://www.fflogs.com/api/v2/user';
export const FFLOGS_AUTH_URL = 'https://www.fflogs.com/oauth/authorize';
export const FFLOGS_TOKEN_URL = 'https://www.fflogs.com/oauth/token';
export const FFLOGS_REDIRECT_URI = 'http://localhost:3850/callback';

/**
 * Cactbot repository URLs
 * Using the official Cactbot repository on GitHub
 *
 * Timeline files are located at:
 * ui/raidboss/data/07-dt/{zone-type}/{boss}.txt
 *
 * For Dawntrail (7.x):
 * - Normal raids: ui/raidboss/data/07-dt/raid/
 * - Extreme trials: ui/raidboss/data/07-dt/trial/
 * - Savage raids: ui/raidboss/data/07-dt/savage/
 * - Ultimate raids: ui/raidboss/data/07-dt/ultimate/
 */
export const CACTBOT_BASE_URL = 'https://raw.githubusercontent.com/quisquous/cactbot/main';

/**
 * Boss mapping from MitPlan boss IDs to Cactbot timeline paths
 *
 * Zone IDs and Encounter IDs from FFLogs V2 API:
 *
 * AAC Light-Heavyweight (Zone 62):
 * - Encounter 93: Black Cat → m1s
 * - Encounter 94: Honey B. Lovely → m2s
 * - Encounter 95: Brute Bomber → m3s
 * - Encounter 96: Wicked Thunder → m4s
 *
 * AAC Cruiserweight (Zone 68):
 * - Encounter 97: Dancing Green → m5s
 * - Encounter 98: Sugar Riot → m6s
 * - Encounter 99: Brute Abombinator → m7s
 * - Encounter 100: Howling Blade → m8s
 *
 * Note: Cactbot does not yet have Dawntrail (7.x) timeline files.
 * Timeline paths are placeholders and will return 404 until Cactbot adds 7.x support.
 */
export interface BossConfig {
  id: string;
  name: string;
  zoneId?: number;
  encounterId?: number;
  timelinePath: string;
  mitPlanId: string;
  fflogsAbilityIds?: number[];
  multiHitAbilities?: string[];
  firstAction?: string;
  phaseTransitions?: string[];
}

export const BOSS_MAPPING: Record<string, BossConfig> = {
  // Dawntrail Savage Raids (AAC Light-Heavyweight - Zone 62)
  'm1s': {
    id: 'm1s',
    name: 'M1S - Black Cat',
    zoneId: 62,
    encounterId: 93,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m1s.txt',
    mitPlanId: 'aac-light-heavyweight-m1s',
  },
  'm2s': {
    id: 'm2s',
    name: 'M2S - Honey B. Lovely',
    zoneId: 62,
    encounterId: 94,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m2s.txt',
    mitPlanId: 'aac-light-heavyweight-m2s',
  },
  'm3s': {
    id: 'm3s',
    name: 'M3S - Brute Bomber',
    zoneId: 62,
    encounterId: 95,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m3s.txt',
    mitPlanId: 'aac-light-heavyweight-m3s',
  },
  'm4s': {
    id: 'm4s',
    name: 'M4S - Wicked Thunder',
    zoneId: 62,
    encounterId: 96,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m4s.txt',
    mitPlanId: 'aac-light-heavyweight-m4s',
  },

  // Dawntrail Savage Raids (AAC Cruiserweight - Zone 68)
  'm5s': {
    id: 'm5s',
    name: 'M5S - Dancing Green',
    zoneId: 68,
    encounterId: 97,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m5s.txt',
    mitPlanId: 'aac-cruiserweight-m5s',
  },
  'm6s': {
    id: 'm6s',
    name: 'M6S - Sugar Riot',
    zoneId: 68,
    encounterId: 98,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m6s.txt',
    mitPlanId: 'aac-cruiserweight-m6s',
  },
  'm7s': {
    id: 'm7s',
    name: 'M7S - Brute Abombinator',
    zoneId: 68,
    encounterId: 99,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m7s.txt',
    mitPlanId: 'aac-cruiserweight-m7s',
    multiHitAbilities: ['brutal impact', 'explosion'],
    firstAction: 'Brutal Impact',
    phaseTransitions: ['Neo Bombarian Special'],
  },
  'm8s': {
    id: 'm8s',
    name: 'M8S - Howling Blade',
    zoneId: 68,
    encounterId: 100,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m8s.txt',
    mitPlanId: 'aac-cruiserweight-m8s',
  },

  // Dawntrail Normal Raids (AAC Light-Heavyweight - Zone 62)
  'm1': {
    id: 'm1',
    name: 'M1 - Black Cat',
    zoneId: 62,
    encounterId: 93,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m1.txt',
    mitPlanId: 'aac-light-heavyweight-m1',
  },
  'm2': {
    id: 'm2',
    name: 'M2 - Honey B. Lovely',
    zoneId: 62,
    encounterId: 94,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m2.txt',
    mitPlanId: 'aac-light-heavyweight-m2',
  },
  'm3': {
    id: 'm3',
    name: 'M3 - Brute Bomber',
    zoneId: 62,
    encounterId: 95,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m3.txt',
    mitPlanId: 'aac-light-heavyweight-m3',
  },
  'm4': {
    id: 'm4',
    name: 'M4 - Wicked Thunder',
    zoneId: 62,
    encounterId: 96,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m4.txt',
    mitPlanId: 'aac-light-heavyweight-m4',
  },

  // Dawntrail Normal Raids (AAC Cruiserweight - Zone 68)
  'm5': {
    id: 'm5',
    name: 'M5 - Dancing Green',
    zoneId: 68,
    encounterId: 97,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m5.txt',
    mitPlanId: 'aac-cruiserweight-m5',
  },
  'm6': {
    id: 'm6',
    name: 'M6 - Sugar Riot',
    zoneId: 68,
    encounterId: 98,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m6.txt',
    mitPlanId: 'aac-cruiserweight-m6',
  },
  'm7': {
    id: 'm7',
    name: 'M7 - Brute Abombinator',
    zoneId: 68,
    encounterId: 99,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m7.txt',
    mitPlanId: 'aac-cruiserweight-m7',
  },
  'm8': {
    id: 'm8',
    name: 'M8 - Howling Blade',
    zoneId: 68,
    encounterId: 100,
    timelinePath: 'ui/raidboss/data/07-dt/raid/m8.txt',
    mitPlanId: 'aac-cruiserweight-m8',
  },

  // Legacy aliases (for backward compatibility)
  'sugar-riot': {
    id: 'm6s',
    name: 'M6S - Sugar Riot',
    zoneId: 68,
    encounterId: 98,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m6s.txt',
    mitPlanId: 'aac-cruiserweight-m6s',
  },
  'dancing-green': {
    id: 'm5s',
    name: 'M5S - Dancing Green',
    zoneId: 68,
    encounterId: 97,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m5s.txt',
    mitPlanId: 'aac-cruiserweight-m5s',
  },
  'brute-abominator': {
    id: 'm7s',
    name: 'M7S - Brute Abombinator',
    zoneId: 68,
    encounterId: 99,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m7s.txt',
    mitPlanId: 'aac-cruiserweight-m7s',
  },
  'howling-blade': {
    id: 'm8s',
    name: 'M8S - Howling Blade',
    zoneId: 68,
    encounterId: 100,
    timelinePath: 'ui/raidboss/data/07-dt/savage/m8s.txt',
    mitPlanId: 'aac-cruiserweight-m8s',
  },
};

/**
 * Get the full URL for a Cactbot timeline file
 */
export function getCactbotTimelineUrl(path: string): string {
  return `${CACTBOT_BASE_URL}/${path}`;
}

/**
 * Get boss mapping by MitPlan boss ID or alias
 */
export function getBossMapping(bossId: string): BossConfig | undefined {
  return BOSS_MAPPING[bossId.toLowerCase()];
}

export function getBossMultiHitAbilities(bossId: string): string[] {
  const boss = getBossMapping(bossId);
  return boss?.multiHitAbilities || [];
}

export function getBossFirstAction(bossId: string): string | undefined {
  const boss = getBossMapping(bossId);
  return boss?.firstAction;
}

export function getBossPhaseTransitions(bossId: string): string[] {
  const boss = getBossMapping(bossId);
  return boss?.phaseTransitions || [];
}

/**
 * Get all available boss IDs
 */
export function getAllBossIds(): string[] {
  return Object.keys(BOSS_MAPPING);
}

/**
 * Create the full scraper configuration
 */
export function createConfig(options: Partial<ScraperConfig> = {}): ScraperConfig {
  const clientId = options.fflogs?.clientId || process.env.FFLOGS_CLIENT_ID;
  const clientSecret = options.fflogs?.clientSecret || process.env.FFLOGS_CLIENT_SECRET;

  return {
    fflogs: {
      clientId: clientId || '',
      clientSecret: clientSecret,
      apiUrl: options.fflogs?.apiUrl || FFLOGS_API_URL,
      authUrl: options.fflogs?.authUrl || FFLOGS_AUTH_URL,
      redirectUri: options.fflogs?.redirectUri || FFLOGS_REDIRECT_URI,
    },
    cactbot: {
      baseUrl: options.cactbot?.baseUrl || CACTBOT_BASE_URL,
      rawGitUrl: options.cactbot?.rawGitUrl || CACTBOT_BASE_URL,
      bossMapping: BOSS_MAPPING,
    },
    output: {
      basePath: options.output?.basePath || '../../../src/data/bosses',
      format: options.output?.format || 'mitplan',
    },
    options: {
      includeDodgeable: options.options?.includeDodgeable ?? false,
      dedupeAoE: options.options?.dedupeAoE ?? true,
      minDamageThreshold: options.options?.minDamageThreshold || 100,
    },
  };
}

export const defaultConfig = createConfig();
