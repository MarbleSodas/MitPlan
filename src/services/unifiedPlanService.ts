/**
 * Unified Plan Service
 * Currently routes all plan operations to Supabase-backed services.
 */

import * as supabasePlanService from './realtimePlanService';
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
      throw new Error('User ID required for Supabase plan creation');
    }
    return await supabasePlanService.createPlan(effectiveUserId, planData);
  }

  async getPlan(planId) {
    return await supabasePlanService.getPlan(planId);
  }

  async getPlanWithAccessTracking(planId, userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    if (!effectiveUserId) {
      throw new Error('User ID required for access tracking');
    }
    return await supabasePlanService.getPlanWithAccessTracking(planId, effectiveUserId);
  }

  async updatePlan(planId, updates) {
    if (!this.currentUser?.uid) {
      throw new Error('User context not set. Please ensure user is authenticated.');
    }
    return await supabasePlanService.updatePlan(planId, updates);
  }

  async deletePlan(planId) {
    const userId = this.currentUser?.uid;
    if (!userId) {
      throw new Error('User ID required for Supabase plan deletion');
    }
    return await supabasePlanService.deletePlan(planId, userId);
  }

  async getUserPlans(userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    if (!effectiveUserId) {
      throw new Error('User ID required for Supabase plan retrieval');
    }
    return await supabasePlanService.getUserPlans(effectiveUserId);
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
      const plan = await supabasePlanService.getPlan(planId);
      return !!plan;
    } catch {
      return false;
    }
  }

  async canEditPlan() {
    return true;
  }

  subscribeToPlan(planId, callback) {
    return supabasePlanService.subscribeToPlan(planId, callback);
  }

  subscribeToPlanWithOrigin(planId, callback) {
    return supabasePlanService.subscribeToPlanWithOrigin(planId, callback);
  }

  subscribeToUserPlans(userId, callback) {
    return supabasePlanService.subscribeToUserPlans(userId, callback);
  }

  async updatePlanRealtime(planId, updates, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.batchUpdatePlanRealtime(planId, updates, effectiveUserId, sessionId);
  }

  async batchUpdatePlanRealtime(planId, updates, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.batchUpdatePlanRealtime(planId, updates, effectiveUserId, sessionId);
  }

  async updatePlanAssignmentsRealtime(planId, assignments, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.updatePlanAssignmentsRealtime(planId, assignments, effectiveUserId, sessionId);
  }

  async updatePlanJobsRealtime(planId, selectedJobs, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.updatePlanJobsRealtime(planId, selectedJobs, effectiveUserId, sessionId);
  }

  async updatePlanTankPositionsRealtime(planId, tankPositions, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.updateTankPositionsRealtime(planId, tankPositions, effectiveUserId, sessionId);
  }

  async updatePlanBossRealtime(planId, bossId, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.updatePlanBossRealtime(planId, bossId, effectiveUserId, sessionId);
  }

  async updatePlanTimelineLayoutRealtime(planId, timelineLayout, userId = null, sessionId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.updatePlanTimelineLayoutRealtime(
      planId,
      timelineLayout,
      effectiveUserId,
      sessionId
    );
  }

  async importPlan(importData, planName = null, userId = null) {
    const effectiveUserId = userId || this.currentUser?.uid;
    return await supabasePlanService.importPlan(effectiveUserId, importData, planName);
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
    return 'supabase';
  }
}

const unifiedPlanService = new UnifiedPlanService();

export default unifiedPlanService;
