/**
 * Export all utilities from a single file
 */
export {
  filterAbilitiesByLevel,
  getAbilityDescriptionForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel
} from './abilities/abilityUtils';

export {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable
} from './mitigation/mitigationUtils';

export {
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  clearLocalStorage
} from './storage/storageUtils';

export {
  isMobileDevice,
  isTouchDevice
} from './device/deviceUtils';

// Commented out server-side log processing functions that use Node.js modules
// These functions are not compatible with browser environments
/*
export {
  readCsvFile,
  parseTimeToSeconds,
  extractUnmitigatedDamage,
  extractDamageType,
  determineImportance,
  processBossActions,
  formatBossActions,
  processBossLogs,
  saveBossActionsToJson,
  processAndSaveBossLogs
} from './logs/processLogFiles';
*/
