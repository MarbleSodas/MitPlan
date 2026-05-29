/**
 * Plans Service Module
 * 
 * Organized plan management services with SOLID principles:
 * - CRUD operations (plans.crud)
 * - Sharing and view tokens (plans.sharing)
 * - Real-time subscriptions (plans.realtime)
 * - Collaboration features (plans.collaboration)
 * - Access control (plans.access)
 * - Shared utilities (plans.shared)
 */

// ============================================================================
// Re-exports for backward compatibility
// ============================================================================

// CRUD operations
export {
  createPlan,
  getPlan,
  updatePlan,
  deletePlan,
  getPlanWithAccessTracking,
  getUserPlans,
  duplicatePlan,
  exportPlan,
  importPlan,
} from './plans.crud';

// Sharing operations
export {
  getShareableEditLink,
  getShareableViewLink,
  enablePlanShareView,
  revokePlanShareView,
  rotatePlanShareViewToken,
  getPlanShareView,
  duplicatePlanFromViewToken,
  subscribeToPlanShareView,
  trackPlanShareViewAccess,
  makePlanPublic,
  getPublicPlan,
} from './plans.sharing';

// Real-time operations
export {
  subscribeToPlan,
  subscribeToUserPlans,
  subscribeToPlanWithOrigin,
  updatePlanFieldWithOrigin,
  updatePlanFieldsWithOrigin,
  updateTankPositionsRealtime,
  updatePlanAssignments,
  batchUpdatePlanRealtime,
  hydratePlanTimelineLayoutIfMissing,
  updatePlanTimelineLayoutRealtime,
} from './plans.realtime';

// Collaboration operations
export {
  claimJob,
  releaseJob,
  subscribeToJobAssignments,
  getUserCurrentJob,
  getActiveCollaborators,
  isPlanBeingCollaborated,
  subscribeToCollaboration,
  cleanupInactiveSessions,
} from './plans.collaboration';

// Access control operations
export {
  getUserAccessiblePlans,
  initializePlanOwnership,
  migratePlanOwnership,
  trackPlanAccess,
} from './plans.access';

// Shared utilities and types
export {
  PLANS_PATH,
  PLAN_SHARE_VIEWS_PATH,
  PLAN_SHARE_VIEW_TRACKING_PATH,
  PLAN_COLLABORATIONS_BY_USER_PATH,
  USER_PROFILES_PATH,
  CURRENT_PLAN_VERSION,
  getBossName,
  getCanonicalBossId,
  sanitizeFirebaseValue,
  withTimelineLayoutMirrors,
  buildPlanFieldPayload,
  getCanonicalPlanField,
  getPlanOwnerId,
  getCollaboratorMap,
  getShareSettings,
  getAccessLevelFromPlan,
  createRandomToken,
  normalizePlanRecord,
  buildShareViewPayload,
  buildViewOnlyPlanRecord,
  buildPlanUpdates,
  type NormalizedPlanRecord,
  type PlanShareSettings,
} from './plans.shared';
