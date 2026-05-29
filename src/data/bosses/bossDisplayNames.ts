/**
 * Boss Display Names
 * 
 * Simple mapping of boss IDs to their display names.
 * This allows the service layer to get boss names without importing the full boss definitions.
 */

import { bosses } from './bossData';

/**
 * Mapping of boss IDs to display names for service layer usage
 * These are the IDs used in plan.timelineLayout.bossId and plan.bossId
 */
export const BOSS_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze(
  bosses.reduce<Record<string, string>>((acc, boss) => {
    acc[boss.id] = boss.name;
    return acc;
  }, {})
);

/**
 * Get display name for a boss ID
 * 
 * @param bossId - The boss ID (e.g., 'ketuduke', 'sugar-riot')
 * @returns The display name or 'Unknown Boss' if not found
 */
export const getBossDisplayName = (bossId: string): string => {
  return BOSS_DISPLAY_NAMES[bossId] ?? 'Unknown Boss';
};

/**
 * Get all known boss IDs
 */
export const getAllBossIds = (): string[] => {
  return Object.keys(BOSS_DISPLAY_NAMES);
};

/**
 * Check if a boss ID is valid
 */
export const isValidBossId = (bossId: string): boolean => {
  return bossId in BOSS_DISPLAY_NAMES;
};
