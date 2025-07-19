/**
 * Unified Plan Service
 * Handles both Firebase and localStorage plan operations based on user authentication state
 */

import * as firebasePlanService from './realtimePlanService';
import localStoragePlanService from './localStoragePlanService';
import { trackPlanAccess, getCategorizedUserPlans } from './planAccessService';

/**
 * Unified Plan Service that routes to appropriate backend
 */
class UnifiedPlanService {
  constructor() {
    this.isAnonymousMode = false;
    this.currentUser = null;
  }

  /**
   * Set the current user context
   */
  setUserContext(user, isAnonymous = false) {
    this.currentUser = user;
    this.isAnonymousMode = isAnonymous;
  }

  /**
   * Get the appropriate service based on user state
   */
  getService() {
    return this.isAnonymousMode ? localStoragePlanService : firebasePlanService;
  }

  /**
   * Create a new plan
   */
  async createPlan(planData, userId = null) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.createPlan(planData);
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      if (!effectiveUserId) {
        throw new Error('User ID required for Firebase plan creation');
      }
      return await firebasePlanService.createPlan(effectiveUserId, planData);
    }
  }

  /**
   * Get a plan by ID
   */
  async getPlan(planId) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.getPlan(planId);
    } else {
      return await firebasePlanService.getPlan(planId);
    }
  }

  /**
   * Get a plan by ID with access tracking
   */
  async getPlanWithAccessTracking(planId, userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid || this.currentUser?.id;

    if (this.isAnonymousMode) {
      // For anonymous users, getPlan already tracks access
      return await localStoragePlanService.getPlan(planId);
    } else {
      if (!effectiveUserId) {
        throw new Error('User ID required for access tracking');
      }
      return await firebasePlanService.getPlanWithAccessTracking(planId, effectiveUserId);
    }
  }

  /**
   * Update a plan
   */
  async updatePlan(planId, updates) {
    console.log('[UnifiedPlanService] updatePlan called:', {
      planId,
      updates,
      isAnonymousMode: this.isAnonymousMode,
      currentUser: this.currentUser?.uid || this.currentUser?.id,
      hasCurrentUser: !!this.currentUser
    });

    if (!this.currentUser && !this.isAnonymousMode) {
      console.error('[UnifiedPlanService] No user context set for Firebase operation');
      throw new Error('User context not set. Please ensure user is authenticated.');
    }

    if (this.isAnonymousMode) {
      console.log('[UnifiedPlanService] Routing to localStorage service');
      return await localStoragePlanService.updatePlan(planId, updates);
    } else {
      console.log('[UnifiedPlanService] Routing to Firebase service');
      return await firebasePlanService.updatePlan(planId, updates);
    }
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.deletePlan(planId);
    } else {
      const userId = this.currentUser?.uid;
      if (!userId) {
        throw new Error('User ID required for Firebase plan deletion');
      }
      return await firebasePlanService.deletePlan(planId, userId);
    }
  }

  /**
   * Get user's plans
   */
  async getUserPlans(userId = null) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.getUserPlans();
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      if (!effectiveUserId) {
        throw new Error('User ID required for Firebase plan retrieval');
      }
      return await firebasePlanService.getUserPlans(effectiveUserId);
    }
  }

  /**
   * Get categorized plans (owned vs shared) for the current user
   */
  async getCategorizedUserPlans() {
    if (this.isAnonymousMode) {
      // For anonymous users, get the anonymous user ID
      const anonymousUserService = (await import('./anonymousUserService')).default;
      const anonymousUser = anonymousUserService.getCurrentUser();
      const effectiveUserId = anonymousUser?.id;

      if (!effectiveUserId) {
        throw new Error('Anonymous user not initialized');
      }

      return await getCategorizedUserPlans(effectiveUserId, true);
    } else {
      // For authenticated users
      const effectiveUserId = this.currentUser?.uid;

      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      return await getCategorizedUserPlans(effectiveUserId, false);
    }
  }

  /**
   * Check if a plan exists
   */
  async planExists(planId) {
    if (this.isAnonymousMode) {
      return localStoragePlanService.planExists(planId);
    } else {
      try {
        const plan = await firebasePlanService.getPlan(planId);
        return !!plan;
      } catch (error) {
        return false;
      }
    }
  }

  /**
   * Check if current user can edit a plan
   * NOTE: Universal access enabled - all users can edit all plans
   */
  async canEditPlan(planId) {
    // Universal access: all users can edit all plans
    return true;
  }

  /**
   * Subscribe to plan changes (Firebase only)
   */
  subscribeToPlan(planId, callback) {
    if (this.isAnonymousMode) {
      // For localStorage, we don't have real-time updates
      // Return a no-op unsubscribe function
      return () => {};
    } else {
      return firebasePlanService.subscribeToPlan(planId, callback);
    }
  }

  /**
   * Subscribe to plan changes with origin tracking (Firebase only)
   */
  subscribeToPlanWithOrigin(planId, callback) {
    if (this.isAnonymousMode) {
      // For localStorage, we don't have real-time updates
      // Return a no-op unsubscribe function
      return () => {};
    } else {
      return firebasePlanService.subscribeToPlanWithOrigin(planId, callback);
    }
  }

  /**
   * Subscribe to user plans (Firebase only)
   */
  subscribeToUserPlans(userId, callback) {
    if (this.isAnonymousMode) {
      // For localStorage, we don't have real-time updates
      // Return a no-op unsubscribe function
      return () => {};
    } else {
      return firebasePlanService.subscribeToUserPlans(userId, callback);
    }
  }

  /**
   * Real-time plan updates (Firebase only)
   */
  async updatePlanRealtime(planId, updates, userId = null, sessionId = null) {
    if (this.isAnonymousMode) {
      // For localStorage, just do a regular update
      return await localStoragePlanService.updatePlan(planId, updates);
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.batchUpdatePlanRealtime(planId, updates, effectiveUserId, sessionId);
    }
  }

  /**
   * Batch update plan with real-time support (Firebase only)
   */
  async batchUpdatePlanRealtime(planId, updates, userId = null, sessionId = null) {
    if (this.isAnonymousMode) {
      // For localStorage, just do a regular update
      return await localStoragePlanService.updatePlan(planId, updates);
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.batchUpdatePlanRealtime(planId, updates, effectiveUserId, sessionId);
    }
  }

  /**
   * Update specific plan fields with real-time support
   */
  async updatePlanAssignmentsRealtime(planId, assignments, userId = null, sessionId = null) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.updatePlan(planId, { assignments });
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.updatePlanAssignmentsRealtime(planId, assignments, effectiveUserId, sessionId);
    }
  }

  async updatePlanJobsRealtime(planId, selectedJobs, userId = null, sessionId = null) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.updatePlan(planId, { selectedJobs });
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.updatePlanJobsRealtime(planId, selectedJobs, effectiveUserId, sessionId);
    }
  }

  async updatePlanTankPositionsRealtime(planId, tankPositions, userId = null, sessionId = null) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.updatePlan(planId, { tankPositions });
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.updateTankPositionsRealtime(planId, tankPositions, effectiveUserId, sessionId);
    }
  }

  async updatePlanBossRealtime(planId, bossId, userId = null, sessionId = null) {
    if (this.isAnonymousMode) {
      return await localStoragePlanService.updatePlan(planId, { bossId });
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.updatePlanBossRealtime(planId, bossId, effectiveUserId, sessionId);
    }
  }

  /**
   * Import plan data
   */
  async importPlan(importData, planName = null, userId = null) {
    if (this.isAnonymousMode) {
      // For localStorage, create a new plan with imported data
      const planData = {
        name: planName || importData.name || 'Imported Plan',
        bossId: importData.bossId,
        assignments: importData.assignments || {},
        selectedJobs: importData.selectedJobs || {},
        tankPositions: importData.tankPositions || {},
        description: importData.description || '',
        importedAt: new Date().toISOString(),
        originalVersion: importData.version || 'unknown'
      };
      return await localStoragePlanService.createPlan(planData);
    } else {
      const effectiveUserId = userId || this.currentUser?.uid;
      return await firebasePlanService.importPlan(importData, planName, effectiveUserId);
    }
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    if (this.isAnonymousMode) {
      return localStoragePlanService.getStatistics();
    } else {
      // Firebase doesn't have built-in statistics
      return {
        totalPlans: 0,
        ownedPlans: 0,
        accessedPlans: 0,
        storageUsed: 0
      };
    }
  }

  /**
   * Check if service supports real-time features
   */
  supportsRealtime() {
    return !this.isAnonymousMode;
  }

  /**
   * Check if service supports sharing
   * NOTE: Universal access enabled - all services support sharing
   */
  supportsSharing() {
    return true; // Universal access: all services support sharing
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return this.isAnonymousMode ? 'localStorage' : 'firebase';
  }
}

// Create and export singleton instance
const unifiedPlanService = new UnifiedPlanService();

export default unifiedPlanService;
