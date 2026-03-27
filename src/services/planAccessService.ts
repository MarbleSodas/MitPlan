/**
 * Plan Access Service
 * Handles plan ownership and access control tracking
 */

import { ref, get, set, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';
import {
  getDashboardPlanLoadErrorMessage,
  getErrorMessage,
  isPermissionDeniedError,
  STALE_DATABASE_RULES_MESSAGE,
} from './firebaseErrorUtils';

const PLANS_PATH = 'plans';
const USER_PROFILES_PATH = 'userProfiles';

const getRecentPlanTimestamp = (plan) =>
  plan.accessInfo?.lastAccess ||
  plan.updatedAt ||
  plan.lastAccessedAt ||
  plan.createdAt ||
  0;

const sortPlansByRecent = (plans) => {
  plans.sort((a, b) => getRecentPlanTimestamp(b) - getRecentPlanTimestamp(a));
  return plans;
};

const normalizeDashboardPlan = (planId, planData, userId, overrides = {}) => {
  const normalizedName = planData.title || planData.name || 'Untitled Plan';
  const isOwner =
    overrides.isOwner ?? (planData.ownerId === userId || planData.userId === userId);
  const accessInfo = overrides.accessInfo ?? planData.accessedBy?.[userId] ?? null;

  return {
    id: planId,
    ...planData,
    name: normalizedName,
    isOwner,
    hasAccessed: overrides.hasAccessed ?? Boolean(accessInfo),
    accessInfo
  };
};

const mergePlansById = (...planGroups) => {
  const mergedPlans = new Map();

  planGroups.flat().forEach((plan) => {
    if (!plan?.id) {
      return;
    }

    if (!mergedPlans.has(plan.id)) {
      mergedPlans.set(plan.id, plan);
      return;
    }

    const existingPlan = mergedPlans.get(plan.id);
    if (!existingPlan.isOwner && plan.isOwner) {
      mergedPlans.set(plan.id, plan);
    }
  });

  return Array.from(mergedPlans.values());
};

const wrapPlanLoadError = (error, prefix) => {
  const message = getDashboardPlanLoadErrorMessage(error);

  if (message === STALE_DATABASE_RULES_MESSAGE) {
    return new Error(message);
  }

  return new Error(`${prefix}: ${message}`);
};

const getOwnedPlansByField = async (userId, fieldName) => {
  const plansRef = ref(database, PLANS_PATH);
  const planQuery = query(plansRef, orderByChild(fieldName), equalTo(userId));
  const snapshot = await get(planQuery);
  const plans = [];

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      const planData = childSnapshot.val();
      plans.push(
        normalizeDashboardPlan(childSnapshot.key, planData, userId, {
          isOwner: true,
          hasAccessed: true,
          accessInfo: {
            lastAccess: planData.lastAccessedAt || planData.updatedAt || planData.createdAt || Date.now(),
            accessCount: 1
          }
        })
      );
    });
  }

  return plans;
};

/**
 * Track when a user accesses a plan
 * @param {string} planId - The plan ID
 * @param {string} userId - The authenticated user ID
 */
export const trackPlanAccess = async (planId, userId) => {
  try {
    console.log('[PlanAccessService] trackPlanAccess called:', { planId, userId });

    const now = Date.now();
    const accessPath = `${PLANS_PATH}/${planId}/accessedBy/${userId}`;
    const userAccessPath = `${USER_PROFILES_PATH}/${userId}/accessedPlans/${planId}`;

    // Update user's personal access list (Reverse Index)
    try {
      await update(ref(database, userAccessPath), {
        lastAccess: now,
        planId: planId
      });
    } catch (error) {
       if (!isPermissionDeniedError(error)) {
         console.error('[PlanAccessService] Error updating user profile accessed plans:', error);
       }
       // Non-blocking error
    }

    console.log('[PlanAccessService] Setting access path:', accessPath);
    console.log('[PlanAccessService] Database instance:', database);
    console.log('[PlanAccessService] Database app:', database.app);

    // Get current access data
    const currentAccessRef = ref(database, accessPath);
    console.log('[PlanAccessService] Access ref:', currentAccessRef);
    const currentAccess = await get(currentAccessRef);

    console.log('[PlanAccessService] Current access exists:', currentAccess.exists());
    console.log('[PlanAccessService] Current access value:', currentAccess.val());

    if (currentAccess.exists()) {
      // Update existing access
      console.log('[PlanAccessService] Updating existing access');
      try {
        await update(currentAccessRef, {
          lastAccess: now,
          accessCount: (currentAccess.val().accessCount || 0) + 1
        });
        console.log('[PlanAccessService] Existing access updated successfully');
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          console.error('[PlanAccessService] Error updating existing access:', error);
        }
        throw error;
      }
    } else {
      // First time access
      console.log('[PlanAccessService] Creating new access record');
      const newAccessData = {
        firstAccess: now,
        lastAccess: now,
        accessCount: 1
      };
      console.log('[PlanAccessService] New access data:', newAccessData);
      console.log('[PlanAccessService] Writing to path:', accessPath);
      try {
        await set(currentAccessRef, newAccessData);
        console.log('[PlanAccessService] New access record created successfully');

        // Verify the write by reading it back
        const verifyAccess = await get(currentAccessRef);
        console.log('[PlanAccessService] Verification read - exists:', verifyAccess.exists());
        console.log('[PlanAccessService] Verification read - value:', verifyAccess.val());
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          console.error('[PlanAccessService] Error creating new access record:', error);
        }
        throw error;
      }
    }

    // Update plan's lastAccessedAt
    console.log('[PlanAccessService] Updating plan lastAccessedAt');
    try {
      await update(ref(database, `${PLANS_PATH}/${planId}`), {
        lastAccessedAt: now
      });
      console.log('[PlanAccessService] Plan lastAccessedAt updated successfully');
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        console.error('[PlanAccessService] Error updating plan lastAccessedAt:', error);
      }
      throw error;
    }

    console.log('[PlanAccessService] Successfully tracked access to plan:', planId, 'by user:', userId);
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error('[PlanAccessService] Error tracking plan access:', error);
    }
    // Don't throw error - access tracking shouldn't break plan loading
  }
};

/**
 * Check if a user has access to a plan (owns it or has accessed it)
 * @param {string} planId - The plan ID
 * @param {string} userId - The user ID
 * @param {object} planData - The plan data (optional, for performance)
 * @returns {Promise<boolean>} Whether the user has access
 */
export const hasAccessToPlan = async (planId, userId, planData = null) => {
  try {
    if (!planId || !userId) {
      return false;
    }

    let effectivePlanData = planData;

    if (!effectivePlanData) {
      try {
        const planSnapshot = await get(ref(database, `${PLANS_PATH}/${planId}`));
        if (!planSnapshot.exists()) {
          return false;
        }
        effectivePlanData = planSnapshot.val();
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          return false;
        }
        throw error;
      }
    }

    const isOwner =
      effectivePlanData.ownerId === userId ||
      effectivePlanData.userId === userId;
    if (isOwner || effectivePlanData.isPublic === true || effectivePlanData.accessedBy?.[userId]) {
      return true;
    }

    const accessedPlanRef = ref(database, `${USER_PROFILES_PATH}/${userId}/accessedPlans/${planId}`);
    const accessedPlanSnapshot = await get(accessedPlanRef);
    return accessedPlanSnapshot.exists();
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error('[PlanAccessService] Error checking plan access:', error);
    }
    return false;
  }
};

/**
 * Get all plans accessible to a user (owned + accessed)
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of accessible plans
 */
export const getUserAccessiblePlans = async (userId) => {
  try {
    const { ownedPlans, sharedPlans } = await getCategorizedUserPlans(userId);
    return sortPlansByRecent(mergePlansById(ownedPlans, sharedPlans));
  } catch (error) {
    console.error('[PlanAccessService] Error getting accessible plans:', error);
    throw wrapPlanLoadError(error, 'Failed to load accessible plans');
  }
};

/**
 * Initialize plan ownership when creating a new plan
 * @param {string} planId - The plan ID
 * @param {string} userId - The owner user ID
 * @param {object} planData - The plan data
 * @returns {object} Updated plan data with ownership fields
 */
export const initializePlanOwnership = (planId, userId, planData) => {
  const now = Date.now();
  
  return {
    ...planData,
    ownerId: userId,
    userId: userId, // Keep for backward compatibility
    accessedBy: {}, // Initialize empty access tracking
    createdAt: planData.createdAt || now,
    updatedAt: now,
    lastAccessedAt: now
  };
};

/**
 * Migrate existing plan to new ownership schema
 * @param {string} planId - The plan ID
 * @param {object} planData - The existing plan data
 * @returns {object} Migrated plan data
 */
export const migratePlanOwnership = (planId, planData) => {
  const now = Date.now();
  
  // Set ownerId if missing (use userId as fallback)
  const ownerId = planData.ownerId || planData.userId;
  
  return {
    ...planData,
    ownerId,
    accessedBy: planData.accessedBy || {}, // Initialize if missing
    createdAt: planData.createdAt || now,
    updatedAt: planData.updatedAt || now,
    lastAccessedAt: planData.lastAccessedAt || now
  };
};

/**
 * Get plans owned by a user (separated from accessed plans)
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of owned plans
 */
export const getUserOwnedPlans = async (userId) => {
  try {
    const [ownerPlans, legacyPlans] = await Promise.all([
      getOwnedPlansByField(userId, 'ownerId'),
      getOwnedPlansByField(userId, 'userId')
    ]);

    return sortPlansByRecent(mergePlansById(ownerPlans, legacyPlans));
  } catch (error) {
    console.error('[PlanAccessService] Error getting owned plans:', error);
    throw wrapPlanLoadError(error, 'Failed to load owned plans');
  }
};


/**
 * Get plans shared with a user (accessed but not owned)
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of shared plans
 */
export const getUserSharedPlans = async (userId) => {
  try {
    const userAccessRef = ref(database, `${USER_PROFILES_PATH}/${userId}/accessedPlans`);
    const snapshot = await get(userAccessRef);

    if (!snapshot.exists()) {
      return [];
    }

    const accessedPlansMap = snapshot.val();
    if (!accessedPlansMap || typeof accessedPlansMap !== 'object') {
      return [];
    }
    const planIds = Object.keys(accessedPlansMap);
    
    const planPromises = planIds.map(async (planId) => {
      const planRef = ref(database, `${PLANS_PATH}/${planId}`);
      const planSnapshot = await get(planRef);

      if (!planSnapshot.exists()) {
        return null;
      }

      const planData = planSnapshot.val();
      if (planData.ownerId === userId || planData.userId === userId) {
        return null;
      }

      return normalizeDashboardPlan(planId, planData, userId, {
        isOwner: false,
        hasAccessed: true,
        accessInfo: {
          lastAccess: accessedPlansMap[planId]?.lastAccess || 0,
          accessCount: accessedPlansMap[planId]?.accessCount || 1
        }
      });
    });

    const results = await Promise.all(planPromises);
    return sortPlansByRecent(results.filter((plan) => plan !== null));
  } catch (error) {
    console.error('[PlanAccessService] Error getting shared plans:', error);
    throw new Error(`Failed to load shared plans: ${getErrorMessage(error)}`);
  }
};


/**
 * Get categorized plans for dashboard display
 * @param {string} userId - The user ID
 * @returns {Promise<object>} Object with ownedPlans and sharedPlans arrays
 */
export const getCategorizedUserPlans = async (userId) => {
  try {
    console.log('[PlanAccessService] Getting categorized plans for user:', userId);

    const [ownedPlans, sharedPlans] = await Promise.all([
      getUserOwnedPlans(userId),
      getUserSharedPlans(userId)
    ]);

    console.log('[PlanAccessService] Categorized plans result:', {
      ownedPlans: ownedPlans.length,
      sharedPlans: sharedPlans.length,
      totalPlans: ownedPlans.length + sharedPlans.length
    });

    return {
      ownedPlans,
      sharedPlans,
      totalPlans: ownedPlans.length + sharedPlans.length
    };
  } catch (error) {
    console.error('[PlanAccessService] Error getting categorized plans:', error);
    throw wrapPlanLoadError(error, 'Failed to load categorized plans');
  }
};

/**
 * Get access statistics for a plan
 * @param {object} planData - The plan data
 * @returns {object} Access statistics
 */
export const getPlanAccessStats = (planData) => {
  const accessedBy = planData.accessedBy || {};
  const accessors = Object.keys(accessedBy);

  let totalAccesses = 0;
  let lastAccess = 0;

  accessors.forEach(userId => {
    const userAccess = accessedBy[userId];
    totalAccesses += userAccess.accessCount || 0;
    lastAccess = Math.max(lastAccess, userAccess.lastAccess || 0);
  });

  return {
    uniqueAccessors: accessors.length,
    totalAccesses,
    lastAccess,
    isShared: accessors.length > 0
  };
};

export default {
  trackPlanAccess,
  hasAccessToPlan,
  getUserAccessiblePlans,
  getUserOwnedPlans,
  getUserSharedPlans,
  getCategorizedUserPlans,
  initializePlanOwnership,
  migratePlanOwnership,
  getPlanAccessStats
};
