/**
 * Export all data from a single file
 */
export { bosses, baseHealthValues } from './bosses/bossData.js';
export { bossActionsMap, bossActions } from './bosses/bossActions.js';
export { ffxivJobs } from './jobs/jobData.js';
export { mitigationAbilities } from './abilities/mitigationAbilities.js';

// Re-export for backward compatibility
export { mitigationAbilities as default } from './abilities/mitigationAbilities';
