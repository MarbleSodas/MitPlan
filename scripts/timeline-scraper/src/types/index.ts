export interface BossAction {
  id: string;
  name: string;
  time: number;
  description?: string;
  unmitigatedDamage?: string;
  damageType?: 'physical' | 'magical' | 'mixed';
  importance?: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  isTankBuster?: boolean;
  isDualTankBuster?: boolean;
  tags?: string[];
  occurrence?: number;
  confidence?: number;
  sourceReports?: number;
  hitCount?: number;
  perHitDamage?: string;
  mechanic?: MechanicInfo;
  analysisSource?: 'fflogs' | 'cactbot' | 'ai' | 'web' | 'manual';
}

export interface MechanicInfo {
  type: MechanicType;
  target: 'party' | 'tanks' | 'healers' | 'dps' | 'random' | 'proximity' | 'marked';
  requiresMovement?: boolean;
  requiresStacking?: boolean;
  requiresSpreading?: boolean;
  vulnerabilityDebuff?: boolean;
  knockback?: boolean;
  bleedOrDot?: boolean;
  notes?: string;
}

export type MechanicType = 
  | 'raidwide'
  | 'tankbuster'
  | 'stack'
  | 'spread'
  | 'proximity'
  | 'cleave'
  | 'enrage'
  | 'transition'
  | 'mechanic'
  | 'dot'
  | 'unknown';

export interface MultiHitCluster {
  abilityId: number;
  abilityName: string;
  events: FFLogsEvent[];
  startTime: number;
  endTime: number;
  hitCount: number;
  totalDamage: number;
  perHitDamage: number;
}

export interface MultiHitConfig {
  windowMs: number;
  minHitsForMultiHit: number;
  knownMultiHitAbilities?: string[];
}

export interface OccurrenceConfig {
  sameOccurrenceWindowSec: number;
  newOccurrenceGapSec: number;
}

export interface AlignmentConfig {
  referenceAction?: string;
  autoDetectReference: boolean;
  minReportPresence: number;
}

export interface AbilityAnalysisRequest {
  abilityName: string;
  bossName: string;
  damage: number;
  hitCount: number;
  targetCount: number;
  timing: number;
  context?: string;
}

export interface AbilityAnalysisResponse {
  mechanicType: MechanicType;
  target: MechanicInfo['target'];
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  isTankBuster: boolean;
  isDualTankBuster: boolean;
  requiresMitigation: boolean;
  confidence: number;
}

export interface AbilityWebInfo {
  name: string;
  description: string;
  source: string;
  url: string;
  damageType?: 'physical' | 'magical' | 'mixed';
  mechanicType?: MechanicType;
  notes?: string[];
}

export interface EnhancedScrapeOptions {
  bossId: string;
  count?: number;
  output?: string;
  useCactbot?: boolean;
  dryRun?: boolean;
  minFightDuration?: number;
  minConfidence?: number;
  useAiAnalysis?: boolean;
  useWebSearch?: boolean;
  usePatternAnalysis?: boolean;
  useAiValidation?: boolean;
  autoCorrectTimeline?: boolean;
  multiHitConfig?: Partial<MultiHitConfig>;
  occurrenceConfig?: Partial<OccurrenceConfig>;
  alignmentConfig?: Partial<AlignmentConfig>;
  onProgress?: (message: string) => void;
}

/**
 * Timeline output format (matches MitPlan schema)
 */
export interface TimelineData {
  name: string;
  description?: string;
  bossId: string;
  bossTags?: string[];
  actions: BossAction[];
  version?: number;
  source?: 'fflogs' | 'cactbot' | 'hybrid';
  generatedAt?: number;
  fflogsReportCodes?: string[];
}

/**
 * FFLogs V2 API types
 */
export interface FFLogsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface FFLogsGameVersion {
  id: number;
  name: string;
  code: string;
}

export interface FFLogsZone {
  id: number;
  name: string;
  code: string;
  encounters: FFLogsEncounter[];
}

export interface FFLogsEncounter {
  id: number;
  name: string;
  zoneID: number;
}

export interface FFLogsFight {
  id: number;
  encounterID: number;
  name: string;
  gameZone?: {
    id: number;
    name: string;
  };
  startTime: number;
  endTime: number;
  kill: boolean;
  difficulty?: number;
  enemyNPCs?: FFLogsEnemyNPC[];
  friendlyPlayers?: number[];
}

export interface FFLogsEnemyNPC {
  id: number;
  gameID: number;
  groupCount?: number;
  instanceCount?: number;
}

export interface FFLogsEnemy {
  id: number;
  name: string;
  guid: number;
  type: string;
  instance?: boolean;
}

export interface FFLogsActor {
  id: number;
  name: string;
  type: 'Player' | 'NPC' | 'Boss' | 'Pet' | 'Unknown';
  subType?: string;
}

export interface FFLogsAbility {
  gameID: number;
  name: string;
  type: string;
}

export interface FFLogsEvent {
  timestamp: number;
  type: string;
  sourceID?: number;
  source?: FFLogsActor;
  targetID?: number;
  target?: FFLogsActor;
  ability?: {
    name: string;
    guid: number;
    type: number;
    abilityIcon: string;
  };
  abilityGameID?: number; // FFLogs v2 uses this instead of ability object
  damage?: number;
  hitType?: number;
  amount?: number;
  unmitigatedAmount?: number;
  absorbed?: number;
  overkill?: number;
  multistrike?: boolean;
  criticalHit?: boolean;
  multiplier?: number;
}

export interface FFLogsReportData {
  code: string;
  title: string;
  owner: string;
  zone: number;
  encounters: FFLogsFight[];
  startTime: number;
  endTime: number;
  enemies: FFLogsEnemy[];
}

/**
 * FFLogs GraphQL query types
 */
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: (string | number)[];
  }>;
}

export interface ReportData {
  reportData: {
    report: {
      code: string;
      title: string;
      owner: {
        name: string;
      };
      zone: {
        id: number;
        name: string;
      };
      fights: FFLogsFight[];
      startTime: number;
      endTime: number;
      masterData?: {
        actors: FFLogsActor[];
        abilities: FFLogsAbility[];
      };
    };
  };
}

export interface EventsData {
  reportData: {
    report: {
      events: {
        data: FFLogsEvent[];
        nextPageTimestamp: number | null;
      };
    };
  };
}

/**
 * Cactbot timeline types
 */
export interface CactbotTimelineEntry {
  time: number;
  name: string;
  type?: 'start' | 'end' | 'alert' | 'alarm' | 'info' | 'talk' | 'quest';
  duration?: number;
  window?: number;
  suppressSeconds?: number;
  id?: string;
  comment?: string;
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  fflogs: {
    clientId: string;
    clientSecret?: string;
    apiUrl: string;
    authUrl: string;
    redirectUri: string;
  };
  cactbot: {
    baseUrl: string;
    rawGitUrl: string;
    bossMapping: Record<string, CactbotBossMapping>;
  };
  output: {
    basePath: string;
    format: 'mitplan';
  };
  options: {
    includeDodgeable: boolean;
    dedupeAoE: boolean;
    minDamageThreshold: number;
  };
}

export interface CactbotBossMapping {
  id: string;
  name: string;
  zoneId?: number;
  encounterId?: number;  // FFLogs encounter ID for rankings query
  timelinePath: string;
  mitPlanId: string;
  fflogsBossId?: number; // Boss ID within a zone (multi-boss zones)
}

/**
 * Report discovery types
 */
export interface DiscoveredReport {
  code: string;
  title: string;
  startTime: number;
  kill: boolean;
  duration?: number;
}

/**
 * FFLogs rankings query types
 *
 * Note: The FFLogs fightRankings API returns JSON (unstructured),
 * not a fixed GraphQL type. The RankingsData interface below
 * represents the old Warcraft Logs schema and is kept for reference.
 *
 * The actual implementation parses the raw JSON response.
 */

/** @deprecated FFLogs uses unstructured JSON for fightRankings */
export interface RankingsData {
  worldData: {
    rankings: {
      encounter: {
        rankings: RankingEntry[];
      };
    };
  };
}

/** @deprecated FFLogs uses unstructured JSON for fightRankings */
export interface RankingEntry {
  report: {
    code: string;
    title: string;
  };
  startTime: number;
  kill: boolean;
}

/**
 * FFLogs fightRankings response (unstructured JSON)
 */
export interface FightRankingsResponse {
  worldData: {
    encounter: {
      id: number;
      name: string;
      fightRankings: unknown; // JSON - structure varies
    };
  };
}

/**
 * Timeline normalization types
 */
export interface NormalizationOptions {
  referenceAction?: string;  // Specific action to use as time=0 (default: first damaging action)
  detectPhases?: boolean;    // Auto-detect phase transitions
  phaseGapThreshold?: number; // Seconds gap indicating phase change (default: 30)
}

export interface Phase {
  phaseIndex: number;
  startTime: number;      // Relative to fight start
  normalizedStart: number; // Relative to phase start
  endTime: number;
  actions: BossAction[];
}

export interface NormalizedTimeline {
  actions: BossAction[];
  phases: Phase[];
  referenceAction: string;
  referenceTime: number;
}

/**
 * Aggregation types
 */
export type AggregationStrategy = 'merge' | 'average' | 'earliest' | 'latest' | 'median';

export interface AggregationOptions {
  strategy: AggregationStrategy;
  phaseAware?: boolean;  // Aggregate phases separately
}

export interface TimelineReport {
  actions: BossAction[];
  reportCode: string;
  normalized?: NormalizedTimeline;
}
