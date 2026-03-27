/**
 * Unified Plan Service
 * Currently routes all plan operations to Firebase-backed services.
 */

import * as firebasePlanService from './realtimePlanService';
import { getCategorizedUserPlans } from './planAccessService';

class UnifiedPlanService {
  constructor() {
    this.currentUser = null;
  }

  setUserContext(user) {
    this.currentUser = user;
  }

  async createPlan(planData, userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    if (!effectiveUserId) {
      throw new Error('User ID required for Firebase plan creation');
    }
    return await firebasePlanService.createPlan(effectiveUserId, planData);
  }

  async getPlan(planId) {
    return await firebasePlanService.getPlan(planId);
  }

  async getPlanWithAccessTracking(planId, userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    if (!effectiveUserId) {
      throw new Error('User ID required for access tracking');
    }
    return await firebasePlanService.getPlanWithAccessTracking(planId, effectiveUserId);
  }

  async updatePlan(planId, updates) {
    if (!this.currentUser?.uid) {
      throw new Error('User context not set. Please ensure user is authenticated.');
    }
    return await firebasePlanService.updatePlan(planId, updates);
  }

  async deletePlan(planId) {
    const userId = this.currentUser?.uid;
    if (!userId) {
      throw new Error('User ID required for Firebase plan deletion');
    }
    return await firebasePlanService.deletePlan(planId, userId);
  }

  async getUserPlans(userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    if (!effectiveUserId) {
      throw new Error('User ID required for Firebase plan retrieval');
    }
    return await firebasePlanService.getUserPlans(effectiveUserId);
  }

  async getCategorizedUserPlans() {
    const effectiveUserId = this.currentUser?.uid;
    if (!effectiveUserId) {
      throw new Error('User not authenticated');
    }
    return await getCategorizedUserPlans(effectiveUserId);
  }

  async planExists(planId) {
    try {
      const plan = await firebasePlanService.getPlan(planId);
      return !!plan;
    } catch {
      return false;
    }
  }

  async canEditPlan() {
    return true;
  }

  subscribeToPlan(planId, callback) {
    return firebasePlanService.subscribeToPlan(planId, callback);
  }

  subscribeToPlanWithOrigin(planId, callback) {
    return firebasePlanService.subscribeToPlanWithOrigin(planId, callback);
  }

  subscribeToUserPlans(userId, callback) {
    return firebasePlanService.subscribeToUserPlans(userId, callback);
  }

  async updatePlanRealtime(planId, updates, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.batchUpdatePlanRealtime(planId, updates, effectiveUserId, sessionId);
  }

  async batchUpdatePlanRealtime(planId, updates, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.batchUpdatePlanRealtime(planId, updates, effectiveUserId, sessionId);
  }

  async updatePlanAssignmentsRealtime(planId, assignments, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.updatePlanAssignmentsRealtime(planId, assignments, effectiveUserId, sessionId);
  }

  async updatePlanJobsRealtime(planId, selectedJobs, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.updatePlanJobsRealtime(planId, selectedJobs, effectiveUserId, sessionId);
  }

  async updatePlanTankPositionsRealtime(planId, tankPositions, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.updateTankPositionsRealtime(planId, tankPositions, effectiveUserId, sessionId);
  }

  async updatePlanBossRealtime(planId, bossId, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.updatePlanBossRealtime(planId, bossId, effectiveUserId, sessionId);
  }

  async updatePlanTimelineLayoutRealtime(planId, timelineLayout, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.updatePlanTimelineLayoutRealtime(
      planId,
      timelineLayout,
      effectiveUserId,
      sessionId
    );
  }

  async importPlan(importData, planName = null, userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await firebasePlanService.importPlan(effectiveUserId, importData, planName);
  }

  getStatistics() {
    return {
      totalPlans: 0,
      ownedPlans: 0,
      accessedPlans: 0,
      storageUsed: 0,
    };
  }

  supportsRealtime() {
    return true;
  }

  supportsSharing() {
    return true;
  }

  getCurrentMode() {
    return 'firebase';
  }
}

const unifiedPlanService = new UnifiedPlanService();

export default unifiedPlanService;
