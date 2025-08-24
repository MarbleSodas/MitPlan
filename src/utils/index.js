/**
 * Export all utilities from a single file
 */
export {
  filterAbilitiesByLevel,
  getAbilityDescriptionForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount,
  isSelfTargetingAbilityUsableByTank,
  filterAbilityUpgrades,
  getAvailableAbilities
} from './abilities/abilityUtils';

export {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateOptimalMitigationPlan
} from './mitigation/mitigationUtils';

export {
  calculateDamagePercentage,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  calculateRemainingHealth,
  formatHealth,
  formatPercentage,
  getHealingPotency,
  calculateHealingAmount,
  calculateHealthAfterHealing
} from './health/healthBarUtils';

export {
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  clearLocalStorage
} from './storage/storageUtils';

export {
} from './device/deviceUtils';

export {
  compressString,
  decompressString,
  generateShareableUrl,
  parseShareableUrl,
  checkUrlForPlanData,
  reconstructMitigations,
  reconstructJobs
} from './url/urlUtils';

export {
  BUILD_TIMESTAMP,
  checkForUpdates
} from './version/versionUtils';

export {
  processMultiHitTankBusters
} from './boss/bossActionUtils';
