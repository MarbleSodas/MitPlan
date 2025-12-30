/**
 * FFLogs Report Discovery Service
 *
 * Discovers recent reports for a given boss using:
 * 1. FFLogs rankings API (preferred)
 * 2. Zone-based queries (fallback)
 */

import type { DiscoveredReport, FFLogsFight } from '../../types/index.js';
import { FFLogsClient } from './client.js';
import { getBossMapping } from '../../config/index.js';

export interface DiscoveryOptions {
  limit?: number;
  requireKill?: boolean;
  minDuration?: number;
  metric?: string;
}

export interface ValidatedReport extends DiscoveredReport {
  fightId: number;
  fightDuration: number;
  validated: boolean;
}

/**
 * Discover recent reports for a boss
 *
 * @param bossId - The boss ID (e.g., 'm7s', 'm8s')
 * @param client - Authenticated FFLogs client
 * @param options - Discovery options
 * @returns Array of discovered reports
 */
export async function discoverRecentReports(
  bossId: string,
  client: FFLogsClient,
  options: DiscoveryOptions = {}
): Promise<DiscoveredReport[]> {
  const {
    limit = 30,
    requireKill = true,
    minDuration = 120,
    metric = 'dps',
  } = options;

  const bossMapping = getBossMapping(bossId);
  if (!bossMapping) {
    throw new Error(`Unknown boss ID: ${bossId}`);
  }

  console.log(`Discovering reports for ${bossMapping.name}...`);

  // Try encounterId first (if available), then fall back to zoneId
  const encounterId = (bossMapping as { encounterId?: number }).encounterId;
  const zoneId = bossMapping.zoneId;

  let reports: DiscoveredReport[] = [];

  if (encounterId) {
    // Use encounter rankings query (most accurate)
    reports = await discoverByEncounter(encounterId, client, { limit, metric });
  } else if (zoneId) {
    // Fall back to zone-based discovery
    reports = await discoverByZone(zoneId, client, { limit, requireKill, minDuration });
  }

  console.log(`  Found ${reports.length} reports`);

  return reports;
}

/**
 * Discover reports using encounter rankings query
 *
 * This is the preferred method as it directly queries for a specific boss encounter.
 */
async function discoverByEncounter(
  encounterId: number,
  client: FFLogsClient,
  options: {
    limit?: number;
    metric?: string;
  } = {}
): Promise<DiscoveredReport[]> {
  const { limit = 100, metric = 'dps' } = options;

  try {
    const rankings = await client.getEncounterRankings(encounterId, {
      limit,
      metric,
    });

    return rankings;
  } catch (error) {
    console.warn(`  Encounter rankings query failed: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Discover reports by zone (fallback method)
 *
 * This is less accurate as it requires fetching multiple reports
 * and filtering them to find the correct boss.
 */
async function discoverByZone(
  zoneId: number,
  client: FFLogsClient,
  options: {
    limit?: number;
    requireKill?: boolean;
    minDuration?: number;
  } = {}
): Promise<DiscoveredReport[]> {
  const { limit = 100, requireKill = true, minDuration = 120 } = options;

  // This is a placeholder for zone-based discovery
  // In practice, this would require either:
  // 1. A different FFLogs API endpoint
  // 2. Known public report codes to filter through
  // 3. Web scraping (not recommended)

  console.warn(`  Zone-based discovery not yet implemented for zone ${zoneId}`);
  console.warn(`  Please provide encounterId in boss mapping for accurate discovery`);

  return [];

  // Future implementation could:
  // - Query a list of known public reports for the zone
  // - Filter by boss and kill status
  // - Return matching reports
}

/**
 * Validate that a report meets minimum requirements
 */
export function validateReport(
  report: DiscoveredReport,
  options: {
    requireKill?: boolean;
    minDuration?: number;
  } = {}
): boolean {
  const { requireKill = true, minDuration = 120 } = options;

  if (requireKill && !report.kill) {
    return false;
  }

  if (report.duration && report.duration < minDuration) {
    return false;
  }

  return true;
}

/**
 * Filter reports by criteria
 */
export function filterReports(
  reports: DiscoveredReport[],
  options: {
    requireKill?: boolean;
    minDuration?: number;
    limit?: number;
  } = {}
): DiscoveredReport[] {
  const { limit } = options;

  let filtered = reports.filter(r => validateReport(r, options));

  filtered.sort((a, b) => b.startTime - a.startTime);

  if (limit && filtered.length > limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

export async function discoverAndValidateReports(
  bossId: string,
  client: FFLogsClient,
  options: DiscoveryOptions & { onProgress?: (current: number, total: number) => void } = {}
): Promise<ValidatedReport[]> {
  const {
    limit = 10,
    requireKill = true,
    minDuration = 120,
    onProgress,
  } = options;

  const bossMapping = getBossMapping(bossId);
  if (!bossMapping) {
    throw new Error(`Unknown boss ID: ${bossId}`);
  }

  const encounterId = (bossMapping as { encounterId?: number }).encounterId;
  if (!encounterId) {
    throw new Error(`Boss ${bossId} does not have encounterId configured. Use 'generate' with manual report codes.`);
  }

  console.log(`Discovering reports for ${bossMapping.name} (encounter ${encounterId})...`);

  const candidateReports = await discoverRecentReports(bossId, client, {
    limit: limit * 3,
    requireKill,
    minDuration,
  });

  if (candidateReports.length === 0) {
    console.log('No candidate reports found from rankings');
    return [];
  }

  console.log(`Found ${candidateReports.length} candidate reports, validating...`);

  const validatedReports: ValidatedReport[] = [];
  let processed = 0;

  for (const report of candidateReports) {
    if (validatedReports.length >= limit) break;

    try {
      processed++;
      if (onProgress) onProgress(processed, candidateReports.length);

      const reportData = await client.getReport(report.code);
      const fights = client.findFightsByEncounter(reportData.fights, encounterId);
      const killFights = requireKill ? client.findKillFights(fights) : fights;

      if (killFights.length === 0) continue;

      const longestFight = killFights.sort((a, b) => 
        (b.endTime - b.startTime) - (a.endTime - a.startTime)
      )[0];

      const fightDuration = (longestFight.endTime - longestFight.startTime) / 1000;

      if (fightDuration < minDuration) continue;

      validatedReports.push({
        ...report,
        fightId: longestFight.id,
        fightDuration: Math.round(fightDuration),
        validated: true,
        duration: Math.round(fightDuration),
      });

    } catch (error) {
      console.warn(`  Failed to validate ${report.code}: ${(error as Error).message}`);
    }
  }

  console.log(`Validated ${validatedReports.length} reports with kill fights`);
  return validatedReports;
}
