/**
 * FFLogs V2 GraphQL Client
 *
 * Handles GraphQL queries to FFLogs with pagination and rate limiting.
 */

import type {
  GraphQLResponse,
  ReportData,
  EventsData,
  FFLogsEvent,
  FFLogsFight,
  FFLogsEnemy,
  RankingsData,
  DiscoveredReport,
} from '../../types/index.js';

export interface FFLogsClientConfig {
  accessToken?: string;
  apiUrl?: string;
}

interface RateLimitState {
  lastRequest: number;
  requestCount: number;
  windowStart: number;
}

const RATE_LIMIT = {
  requestsPerMinute: 60,
  minInterval: 1000, // 1 second between requests minimum
};

/**
 * FFLogs GraphQL Client class
 */
export class FFLogsClient {
  private accessToken: string | undefined;
  private apiUrl: string;
  private rateLimit: RateLimitState = {
    lastRequest: 0,
    requestCount: 0,
    windowStart: Date.now(),
  };

  constructor(config: FFLogsClientConfig = {}) {
    this.accessToken = config.accessToken;
    this.apiUrl = config.apiUrl || 'https://www.fflogs.com/api/v2';
  }

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Check if the client has an access token
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Rate limiting delay to ensure we stay within FFLogs API limits
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter if we're in a new minute window
    if (now - this.rateLimit.windowStart > 60000) {
      this.rateLimit.windowStart = now;
      this.rateLimit.requestCount = 0;
    }

    // Check if we've exceeded the rate limit
    if (this.rateLimit.requestCount >= RATE_LIMIT.requestsPerMinute) {
      const waitTime = 60000 - (now - this.rateLimit.windowStart);
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.rateLimit.windowStart = Date.now();
        this.rateLimit.requestCount = 0;
      }
    }

    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.rateLimit.lastRequest;
    if (timeSinceLastRequest < RATE_LIMIT.minInterval) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.minInterval - timeSinceLastRequest));
    }

    this.rateLimit.lastRequest = Date.now();
    this.rateLimit.requestCount++;
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    await this.respectRateLimit();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FFLogs API error: ${response.status} ${error}`);
    }

    const data = await response.json() as GraphQLResponse<T>;

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    if (!data.data) {
      throw new Error('No data returned from FFLogs API');
    }

    return data.data;
  }

  /**
   * Get report metadata
   */
  async getReport(code: string): Promise<ReportData['reportData']['report']> {
    const query = `
      query ReportData($code: String!) {
        reportData {
          report(code: $code) {
            code
            title
            owner {
              name
            }
            zone {
              id
              name
            }
            fights {
              id
              encounterID
              name
              gameZone {
                id
                name
              }
              startTime
              endTime
              kill
              difficulty
              enemyNPCs {
                id
                gameID
                groupCount
                instanceCount
              }
              friendlyPlayers
            }
            startTime
            endTime
            masterData {
              actors {
                id
                name
                type
                subType
              }
              abilities {
                gameID
                name
                type
              }
            }
          }
        }
      }
    `;

    const data = await this.query<ReportData>(query, { code });
    return data.reportData.report;
  }

  /**
   * Get events from a report with pagination support
   */
  async getEvents(
    code: string,
    fightId: number,
    options: {
      startTime?: number;
      endTime?: number;
      dataType?: string;
      sourceId?: number;
      targetId?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: FFLogsEvent[];
    nextPageTimestamp: number | null;
  }> {
    const {
      startTime = 0,
      endTime = 9999999999,
      dataType = 'DamageDone',
      limit = 10000,
    } = options;

    // Build filter string inline (FFLogs v2 uses inline args, not variables for events)
    const filterParts = [
      `fightIDs: [${fightId}]`,
      `startTime: ${startTime}`,
      `endTime: ${endTime}`,
      `limit: ${limit}`,
      `dataType: ${dataType}`,
    ];

    if (options.sourceId !== undefined) {
      filterParts.push(`sourceID: ${options.sourceId}`);
    }
    if (options.targetId !== undefined) {
      filterParts.push(`targetID: ${options.targetId}`);
    }

    const filterString = filterParts.join(', ');

    const query = `
      query EventsData($code: String!) {
        reportData {
          report(code: $code) {
            events(${filterString}) {
              data
              nextPageTimestamp
            }
          }
        }
      }
    `;

    const data = await this.query<EventsData>(query, { code });
    return {
      data: data.reportData.report.events.data,
      nextPageTimestamp: data.reportData.report.events.nextPageTimestamp,
    };
  }

  /**
   * Get all events from a report with automatic pagination
   */
  async getAllEvents(
    code: string,
    fightId: number,
    options: {
      startTime?: number;
      endTime?: number;
      dataType?: string;
      onProgress?: (count: number) => void;
    } = {}
  ): Promise<FFLogsEvent[]> {
    const allEvents: FFLogsEvent[] = [];
    let currentStartTime = options.startTime ?? 0;
    const desiredEndTime = options.endTime ?? 9999999999;

    // FFLogs pagination: nextPageTimestamp tells us where to start the next query
    let nextPageTimestamp: number | null = null;

    do {
      const result = await this.getEvents(code, fightId, {
        startTime: nextPageTimestamp ?? currentStartTime,
        endTime: desiredEndTime,
        dataType: options.dataType,
        limit: 10000,
      });

      allEvents.push(...result.data);
      nextPageTimestamp = result.nextPageTimestamp;

      if (options.onProgress) {
        options.onProgress(allEvents.length);
      }
    } while (nextPageTimestamp !== null && nextPageTimestamp < desiredEndTime);

    return allEvents;
  }

  /**
   * Get damage events from a report
   */
  async getDamageEvents(
    code: string,
    fightId: number,
    startTime: number,
    endTime: number
  ): Promise<FFLogsEvent[]> {
    return this.getAllEvents(code, fightId, {
      startTime,
      endTime,
      dataType: 'DamageDone',
    });
  }

  /**
   * Get cast events from a report (ability casts)
   */
  async getCastEvents(
    code: string,
    fightId: number,
    startTime: number,
    endTime: number
  ): Promise<FFLogsEvent[]> {
    return this.getAllEvents(code, fightId, {
      startTime,
      endTime,
      dataType: 'Casts',
    });
  }

  /**
   * Get all enemy buffs/debuffs (useful for mechanics tracking)
   */
  async getBuffEvents(
    code: string,
    fightId: number,
    startTime: number,
    endTime: number
  ): Promise<FFLogsEvent[]> {
    return this.getAllEvents(code, fightId, {
      startTime,
      endTime,
      dataType: 'Buffs',
    });
  }

  /**
   * Get rankings for an encounter to discover recent reports
   *
   * This queries the FFLogs fightRankings API to find recent reports for a specific boss encounter.
   * Note: fightRankings returns JSON (not structured types) - we need to parse the response.
   */
  async getEncounterRankings(
    encounterId: number,
    options: {
      metric?: string;
      limit?: number;
    } = {}
  ): Promise<DiscoveredReport[]> {
    const { limit = 100 } = options;

    // Use the correct FFLogs API: worldData.encounter(id).fightRankings
    // This returns JSON (unstructured) - we'll parse it to extract report data
    const query = `
      query EncounterFightRankings($encounterId: Int!) {
        worldData {
          encounter(id: $encounterId) {
            id
            name
            fightRankings(page: 1)
          }
        }
      }
    `;

    try {
      const response = await this.query<{ worldData: { encounter: { id: number; name: string; fightRankings: unknown } } }>(query, {
        encounterId,
      });

      const rankingsData = response?.worldData?.encounter?.fightRankings;

      if (!rankingsData) {
        console.warn(`  No rankings data returned for encounter ${encounterId}`);
        return [];
      }

      // Parse the JSON response to extract report information
      return this.parseFightRankingsJson(rankingsData, limit);
    } catch (error) {
      // If query fails, log the error but don't throw
      console.warn(`Rankings query failed: ${(error as Error).message}`);
      console.warn('This may be due to FFLogs API schema differences or rate limiting.');
      return [];
    }
  }

  /**
   * Parse the fightRankings JSON response to extract report data
   *
   * The fightRankings field returns JSON with unknown structure.
   * We need to defensively parse it to extract report codes, titles, etc.
   */
  private parseFightRankingsJson(rankingsData: unknown, limit: number): DiscoveredReport[] {
    const reports: DiscoveredReport[] = [];

    try {
      // The JSON structure is typically an object with a 'rankings' or 'data' key containing an array
      const data = rankingsData as Record<string, unknown>;

      // Try possible structures
      let rankingsArray: unknown[] = [];

      if (Array.isArray(data)) {
        rankingsArray = data;
      } else if (data.rankings && Array.isArray(data.rankings)) {
        rankingsArray = data.rankings as unknown[];
      } else if (data.data && Array.isArray(data.data)) {
        rankingsArray = data.data as unknown[];
      } else if (data.reports && Array.isArray(data.reports)) {
        rankingsArray = data.reports as unknown[];
      } else if (data.fights && Array.isArray(data.fights)) {
        rankingsArray = data.fights as unknown[];
      }

      // Parse each ranking entry
      for (const entry of rankingsArray) {
        if (typeof entry !== 'object' || entry === null) continue;

        const ranking = entry as Record<string, unknown>;

        // Extract report code - try common field names
        const report = ranking.report as Record<string, unknown> | string;
        let code: string | undefined;

        if (typeof report === 'string') {
          code = report;
        } else if (report && typeof report === 'object') {
          code = (report.code as string) || (report.reportCode as string);
        }

        // Extract title
        const title = (ranking.title as string) ||
                      (ranking.name as string) ||
                      (ranking.reportTitle as string) ||
                      'Unknown';

        // Extract startTime
        const startTime = typeof ranking.startTime === 'number' ? ranking.startTime :
                          typeof ranking.startTime === 'string' ? parseInt(ranking.startTime, 10) :
                          Date.now();

        // Extract kill status - default to true for rankings (usually only kills are ranked)
        const kill = ranking.kill !== undefined ? Boolean(ranking.kill) : true;

        if (code) {
          reports.push({ code, title, startTime, kill });

          // Stop if we've reached the limit
          if (reports.length >= limit) break;
        }
      }

      console.log(`  Parsed ${reports.length} reports from fightRankings JSON`);

      // If we couldn't parse any reports, log a sample of the data for debugging
      if (reports.length === 0) {
        console.warn('  Could not parse reports from fightRankings response');
        console.warn(`  Sample data: ${JSON.stringify(data).substring(0, 200)}...`);
      }

    } catch (error) {
      console.warn(`  Error parsing fightRankings JSON: ${(error as Error).message}`);
    }

    return reports;
  }

  /**
   * Alternative: Get reports by zone/fight filtering
   *
   * This is a fallback method if rankings query doesn't work.
   * It would require known report codes to filter through.
   */
  async findReportsByZone(
    zoneId: number,
    options: {
      limit?: number;
      requireKill?: boolean;
    } = {}
  ): Promise<DiscoveredReport[]> {
    // This would require a different approach, possibly using
    // a different FFLogs API endpoint or known public report codes
    // For now, return empty - this is a placeholder for future implementation
    console.warn('findReportsByZone not yet implemented');
    return [];
  }

  /**
   * Find kill fights in a report
   */
  findKillFights(fights: FFLogsFight[]): FFLogsFight[] {
    return fights.filter(f => f.kill);
  }

  /**
   * Find fights by encounter ID
   */
  findFightsByEncounter(fights: FFLogsFight[], encounterId: number): FFLogsFight[] {
    return fights.filter(f => f.encounterID === encounterId);
  }

  /**
   * Find fights by boss ID (legacy alias for findFightsByEncounter)
   * @deprecated Use findFightsByEncounter instead
   */
  findFightsByBoss(fights: FFLogsFight[], encounterId: number): FFLogsFight[] {
    return this.findFightsByEncounter(fights, encounterId);
  }

  /**
   * Find enemies by name pattern
   */
  findEnemiesByName(enemies: FFLogsEnemy[], pattern: RegExp): FFLogsEnemy[] {
    return enemies.filter(e => pattern.test(e.name));
  }

  /**
   * Get the main boss enemy from a list of enemies
   * Usually the one with type "Boss" or "Unknown" (for non-NPC)
   */
  findBossEnemy(enemies: FFLogsEnemy[]): FFLogsEnemy | undefined {
    // First try to find type "Boss"
    let boss = enemies.find(e => e.type === 'Boss' || e.type === 'Unknown');
    if (boss) return boss;

    // Fall back to any non-NPC enemy
    return enemies.find(e => e.type !== 'NPC' && !e.instance);
  }
}

/**
 * Create a new FFLogs client with authentication
 */
export async function createAuthenticatedClient(
  accessToken: string,
  apiUrl?: string
): Promise<FFLogsClient> {
  const client = new FFLogsClient({ accessToken, apiUrl });
  return client;
}

/**
 * Rate limit information for status commands
 */
export interface RateLimitInfo {
  requestsRemaining: number;
  windowReset: number;
  lastRequest: number;
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): RateLimitInfo {
  return {
    requestsRemaining: RATE_LIMIT.requestsPerMinute,
    windowReset: Date.now() + 60000,
    lastRequest: 0,
  };
}
