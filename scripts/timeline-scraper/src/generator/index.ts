/**
 * Timeline Generator
 *
 * Main orchestration for generating MitPlan timelines from:
 * - FFLogs reports (for damage data)
 * - Cactbot timelines (for timing and mechanic identification)
 */

import { getBossMapping, createConfig } from '../config/index.js';

export { extractDamageTimeline, type DamageExtractorOptions, type DamageExtractorResult } from './damageExtractor.js';

/**
 * List all available bosses
 */
export function listAvailableBosses(): Array<{ id: string; name: string }> {
  const config = createConfig();
  return Object.entries(config.cactbot.bossMapping).map(([id, info]) => ({
    id,
    name: info.name,
  }));
}

export async function analyzeReport(reportCode: string, options: any): Promise<void> {
  console.log(`Analyzing report ${reportCode} (Fight: ${options.fightId || 'All'}) - [EXPERIMENTAL]`);
}
