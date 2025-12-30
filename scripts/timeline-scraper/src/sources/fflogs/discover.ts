/**
 * FFLogs Report Discovery Service
 *
 * Discovers recent reports for a given boss using:
 * 1. FFLogs rankings API (preferred)
 * 2. Zone-based queries (fallback)
 */

import type { DiscoveredReport } from '../../types/index.js';
import { FFLogsClient } from './client.js';
import { getBossMapping } from '../../config/index.js';

export interface DiscoveryOptions {
  limit?: number;
  requireKill?: boolean;
  minDuration?: number;
  metric?: string;
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

  // Sort by start time (newest first)
  filtered.sort((a, b) => b.startTime - a.startTime);

  // Apply limit
  if (limit && filtered.length > limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}
