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
} from './abilities/abilityUtils.js';

export {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateOptimalMitigationPlan
} from './mitigation/mitigationUtils.js';

export {
  calculateDamagePercentage,
  calculateMitigatedDamage,
  calculateBarrierAmount,
  calculateRemainingHealth,
  formatHealth,
  formatHealthCompact,
  formatPercentage,
  getHealingPotency,
  calculateHealingAmount,
  calculateHealthAfterHealing
} from './health/healthBarUtils.js';

export {
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  clearLocalStorage
} from './storage/storageUtils';

export {
  isMobileDevice,
  isTabletDevice,
  isSmallMobileDevice,
  getDeviceType,
  isTouchDevice,
  isPortraitOrientation,
  isLandscapeOrientation,
  getViewportDimensions
} from './device/deviceUtils';

export {
  compressString,
  decompressString,
  generateShareableUrl,
  parseShareableUrl,
  checkUrlForPlanData,
  reconstructMitigations,
  reconstructJobs
} from './url/urlUtils.js';

export {
  BUILD_TIMESTAMP,
  checkForUpdates
} from './version/versionUtils.js';

export {
  processMultiHitTankBusters
} from './boss/bossActionUtils.js';

export {
  getJobById,
  getJobIcon,
  getJobName
} from './job/jobUtils';
