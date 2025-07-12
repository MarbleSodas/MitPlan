/**
 * Plan Access Service
 * Handles plan ownership and access control tracking
 */

import { ref, get, set, update, serverTimestamp } from 'firebase/database';
import { database } from '../config/firebase';
import anonymousUserService from './anonymousUserService';

/**
 * Track when a user accesses a plan
 * @param {string} planId - The plan ID
 * @param {string} userId - The user ID (can be anonymous user ID)
 * @param {boolean} isAnonymous - Whether this is an anonymous user
 */
export const trackPlanAccess = async (planId, userId, isAnonymous = false) => {
  try {
    if (isAnonymous) {
      // Handle anonymous user access tracking in localStorage
      const anonymousUser = anonymousUserService.getCurrentUser();
      anonymousUser.addAccessedPlan(planId);
      
      // Track detailed access info in localStorage
      const accessInfo = anonymousUser.planAccess || {};
      const now = Date.now();
      
      if (accessInfo[planId]) {
        accessInfo[planId].lastAccess = now;
        accessInfo[planId].accessCount = (accessInfo[planId].accessCount || 0) + 1;
      } else {
        accessInfo[planId] = {
          firstAccess: now,
          lastAccess: now,
          accessCount: 1
        };
      }
      
      anonymousUser.planAccess = accessInfo;
      anonymousUser.save();
      
      console.log('[PlanAccessService] Tracked anonymous access to plan:', planId);
      return;
    }

    // Handle authenticated user access tracking in Firebase
    const now = Date.now();
    const accessPath = `plans/${planId}/accessedBy/${userId}`;
    
    // Get current access data
    const currentAccessRef = ref(database, accessPath);
    const currentAccess = await get(currentAccessRef);
    
    if (currentAccess.exists()) {
      // Update existing access
      await update(currentAccessRef, {
        lastAccess: now,
        accessCount: (currentAccess.val().accessCount || 0) + 1
      });
    } else {
      // First time access
      await set(currentAccessRef, {
        firstAccess: now,
        lastAccess: now,
        accessCount: 1
      });
    }
    
    // Update plan's lastAccessedAt
    await update(ref(database, `plans/${planId}`), {
      lastAccessedAt: now
    });
    
    console.log('[PlanAccessService] Tracked access to plan:', planId, 'by user:', userId);
  } catch (error) {
    console.error('[PlanAccessService] Error tracking plan access:', error);
    // Don't throw error - access tracking shouldn't break plan loading
  }
};

/**
 * Check if a user has access to a plan (owns it or has accessed it)
 * @param {string} planId - The plan ID
 * @param {string} userId - The user ID
 * @param {object} planData - The plan data (optional, for performance)
 * @param {boolean} isAnonymous - Whether this is an anonymous user
 * @returns {Promise<boolean>} Whether the user has access
 *
 * NOTE: Universal access enabled - all users can access all plans
 */
export const hasAccessToPlan = async (planId, userId, planData = null, isAnonymous = false) => {
  // Universal access: all users can access all plans
  // Still track access for analytics purposes
  try {
    if (planId) {
      // Track access but don't restrict based on ownership
      await trackPlanAccess(planId, userId, isAnonymous);
    }
  } catch (error) {
    console.log('[PlanAccessService] Access tracking failed, but allowing access:', error);
  }

  return true; // Universal access enabled
};

/**
 * Get all plans accessible to a user (owned + accessed)
 * @param {string} userId - The user ID
 * @param {boolean} isAnonymous - Whether this is an anonymous user
 * @returns {Promise<Array>} Array of accessible plans
 *
 * NOTE: Universal access enabled - returns all plans for all users
 */
export const getUserAccessiblePlans = async (userId, isAnonymous = false) => {
  try {
    if (isAnonymous) {
      // For anonymous users, delegate to localStorage service
      const localStoragePlanService = (await import('./localStoragePlanService')).default;
      return await localStoragePlanService.getUserPlans();
    }

    // For authenticated users, return ALL plans (universal access)
    const plansRef = ref(database, 'plans');
    const snapshot = await get(plansRef);

    const accessiblePlans = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const planData = childSnapshot.val();
        const planId = childSnapshot.key;

        // Track ownership for analytics but don't restrict access
        const isOwner = planData.ownerId === userId || planData.userId === userId;
        const hasAccessed = planData.accessedBy && planData.accessedBy[userId];

        console.log('[PlanAccessService] Processing plan:', planId, {
          isOwner,
          hasAccessed: !!hasAccessed,
          accessedByExists: !!planData.accessedBy,
          userInAccessedBy: planData.accessedBy ? Object.keys(planData.accessedBy).includes(userId) : false,
          ownerId: planData.ownerId,
          userId: planData.userId,
          currentUserId: userId
        });

        // Universal access: include ALL plans
        accessiblePlans.push({
          id: planId,
          ...planData,
          // Normalize field names for consistency with dashboard components
          name: planData.title || planData.name || 'Untitled Plan',
          isOwner,
          hasAccessed: !!hasAccessed,
          accessInfo: hasAccessed || null
        });
      });
    }
    
    // Sort by most recently updated/accessed
    accessiblePlans.sort((a, b) => {
      const aTime = a.updatedAt || a.lastAccessedAt || a.createdAt || 0;
      const bTime = b.updatedAt || b.lastAccessedAt || b.createdAt || 0;
      return bTime - aTime;
    });
    
    return accessiblePlans;
  } catch (error) {
    console.error('[PlanAccessService] Error getting accessible plans:', error);
    return [];
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
 * @param {boolean} isAnonymous - Whether this is an anonymous user
 * @returns {Promise<Array>} Array of owned plans
 */
export const getUserOwnedPlans = async (userId, isAnonymous = false) => {
  try {
    const allPlans = await getUserAccessiblePlans(userId, isAnonymous);

    // Filter to only owned plans
    const ownedPlans = allPlans.filter(plan => plan.isOwner);

    return ownedPlans;
  } catch (error) {
    console.error('[PlanAccessService] Error getting owned plans:', error);
    return [];
  }
};

/**
 * Get plans shared with a user (accessed but not owned)
 * @param {string} userId - The user ID
 * @param {boolean} isAnonymous - Whether this is an anonymous user
 * @returns {Promise<Array>} Array of shared plans
 */
export const getUserSharedPlans = async (userId, isAnonymous = false) => {
  try {
    if (isAnonymous) {
      // For anonymous users, there are no "shared" plans since they only work with localStorage
      // All plans are either owned or not accessible
      console.log('[PlanAccessService] Anonymous user - no shared plans');
      return [];
    }

    const allPlans = await getUserAccessiblePlans(userId, isAnonymous);
    console.log('[PlanAccessService] All accessible plans for user:', userId, allPlans.length);

    // Filter to only shared plans (accessed but not owned)
    const sharedPlans = allPlans.filter(plan => {
      const isShared = !plan.isOwner && plan.hasAccessed;
      if (isShared) {
        console.log('[PlanAccessService] Found shared plan:', plan.id, plan.name, {
          isOwner: plan.isOwner,
          hasAccessed: plan.hasAccessed,
          accessInfo: plan.accessInfo
        });
      }
      return isShared;
    });

    console.log('[PlanAccessService] Filtered shared plans:', sharedPlans.length);
    return sharedPlans;
  } catch (error) {
    console.error('[PlanAccessService] Error getting shared plans:', error);
    return [];
  }
};

/**
 * Get categorized plans for dashboard display
 * @param {string} userId - The user ID
 * @param {boolean} isAnonymous - Whether this is an anonymous user
 * @returns {Promise<object>} Object with ownedPlans and sharedPlans arrays
 */
export const getCategorizedUserPlans = async (userId, isAnonymous = false) => {
  try {
    console.log('[PlanAccessService] Getting categorized plans for user:', userId, 'isAnonymous:', isAnonymous);

    const [ownedPlans, sharedPlans] = await Promise.all([
      getUserOwnedPlans(userId, isAnonymous),
      getUserSharedPlans(userId, isAnonymous)
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
    return {
      ownedPlans: [],
      sharedPlans: [],
      totalPlans: 0
    };
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
