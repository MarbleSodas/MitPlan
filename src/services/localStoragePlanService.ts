/**
 * Local Storage Plan Service
 * Manages mitigation plans in localStorage for anonymous users
 */

import { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '../utils/storage/storageUtils';
import anonymousUserService from './anonymousUserService';

// Constants for localStorage keys
const LOCAL_PLANS_KEY = 'mitplan_local_plans';
const LOCAL_PLAN_REGISTRY_KEY = 'mitplan_local_plan_registry';

/**
 * Generate a unique plan ID for local storage
 */
export const generateLocalPlanId = () => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Local Storage Plan Service
 */
class LocalStoragePlanService {
  constructor() {
    this.plans = new Map();
    this.registry = new Map();
    this.loadFromStorage();
  }

  /**
   * Load plans and registry from localStorage
   */
  loadFromStorage() {
    const plans = loadFromLocalStorage(LOCAL_PLANS_KEY, {});
    const registry = loadFromLocalStorage(LOCAL_PLAN_REGISTRY_KEY, {});

    this.plans = new Map(Object.entries(plans));
    this.registry = new Map(Object.entries(registry));
  }

  /**
   * Save plans and registry to localStorage
   */
  saveToStorage() {
    const plansObj = Object.fromEntries(this.plans);
    const registryObj = Object.fromEntries(this.registry);

    saveToLocalStorage(LOCAL_PLANS_KEY, plansObj);
    saveToLocalStorage(LOCAL_PLAN_REGISTRY_KEY, registryObj);
  }

  /**
   * Create a new plan
   */
  async createPlan(planData) {
    try {
      const planId = generateLocalPlanId();
      const user = anonymousUserService.getCurrentUser();

      const plan = {
        id: planId,
        ...planData,
        userId: user.id,
        isLocal: true,
        isPublic: false, // Local plans are private by default
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        // Timeline references (optional)
        sourceTimelineId: planData.sourceTimelineId || null,
        sourceTimelineName: planData.sourceTimelineName || null,
        // Boss tags for flexible boss associations
        bossTags: planData.bossTags || (planData.bossId ? [planData.bossId] : [])
      };

      // Store the plan
      this.plans.set(planId, plan);

      // Update registry
      this.registry.set(planId, {
        id: planId,
        name: plan.name,
        bossId: plan.bossId,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        userId: user.id,
        isLocal: true,
        isPublic: false,
        sourceTimelineId: plan.sourceTimelineId,
        bossTags: plan.bossTags
      });

      // Add to user's plans
      user.addPlan(planId);

      // Save to storage
      this.saveToStorage();

      console.log('[LocalStoragePlanService] Plan created:', planId);
      return plan;
    } catch (error) {
      console.error('Error creating local plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  /**
   * Get a plan by ID
   */
  async getPlan(planId) {
    try {
      const plan = this.plans.get(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Mark as accessed by current user and track detailed access
      const user = anonymousUserService.getCurrentUser();
      user.addAccessedPlan(planId);

      // Track detailed access info
      const accessInfo = user.planAccess || {};
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

      user.planAccess = accessInfo;
      user.save();

      return plan;
    } catch (error) {
      console.error('Error getting local plan:', error);
      throw error;
    }
  }

  /**
   * Update a plan
   */
  async updatePlan(planId, updates) {
    try {
      const existingPlan = this.plans.get(planId);
      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      const updatedPlan = {
        ...existingPlan,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: (existingPlan.version || 0) + 1
      };

      // Store updated plan
      this.plans.set(planId, updatedPlan);

      // Update registry
      this.registry.set(planId, {
        ...this.registry.get(planId),
        name: updatedPlan.name,
        bossId: updatedPlan.bossId,
        updatedAt: updatedPlan.updatedAt
      });

      // Save to storage
      this.saveToStorage();

      console.log('[LocalStoragePlanService] Plan updated:', planId);
      return updatedPlan;
    } catch (error) {
      console.error('Error updating local plan:', error);
      throw error;
    }
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId) {
    try {
      const user = anonymousUserService.getCurrentUser();

      // Check if user owns the plan
      if (!user.ownsPlan(planId)) {
        throw new Error('Permission denied: You can only delete plans you created');
      }

      // Remove from storage
      this.plans.delete(planId);
      this.registry.delete(planId);

      // Remove from user's plans
      user.removePlan(planId);

      // Save to storage
      this.saveToStorage();

      console.log('[LocalStoragePlanService] Plan deleted:', planId);
      return true;
    } catch (error) {
      console.error('Error deleting local plan:', error);
      throw error;
    }
  }

  /**
   * Get all plans for current user
   */
  async getUserPlans() {
    try {
      const user = anonymousUserService.getCurrentUser();
      const userPlanIds = user.getAllPlans();

      const userPlans = userPlanIds
        .map(planId => this.registry.get(planId))
        .filter(plan => plan) // Filter out any missing plans
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return userPlans;
    } catch (error) {
      console.error('Error getting user plans:', error);
      return [];
    }
  }

  /**
   * Get all full plan objects for current user (for migration)
   */
  async getAllUserPlans() {
    try {
      const user = anonymousUserService.getCurrentUser();
      const userPlanIds = user.getAllPlans();

      const userPlans = userPlanIds
        .map(planId => this.plans.get(planId))
        .filter(plan => plan) // Filter out any missing plans
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return userPlans;
    } catch (error) {
      console.error('Error getting all user plans:', error);
      return [];
    }
  }

  /**
   * Get plans created by current user
   */
  async getOwnedPlans() {
    try {
      const user = anonymousUserService.getCurrentUser();
      const ownedPlanIds = user.plans;

      const ownedPlans = ownedPlanIds
        .map(planId => this.registry.get(planId))
        .filter(plan => plan)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return ownedPlans;
    } catch (error) {
      console.error('Error getting owned plans:', error);
      return [];
    }
  }

  /**
   * Check if a plan exists
   */
  planExists(planId) {
    return this.plans.has(planId);
  }

  /**
   * Export all plans for migration
   */
  exportPlansForMigration() {
    const user = anonymousUserService.getCurrentUser();
    const userPlanIds = user.getAllPlans();

    const exportData = {
      ownedPlans: [],
      accessedPlans: [],
      exportTimestamp: new Date().toISOString()
    };

    userPlanIds.forEach(planId => {
      const plan = this.plans.get(planId);
      if (plan) {
        if (user.ownsPlan(planId)) {
          exportData.ownedPlans.push(plan);
        } else {
          exportData.accessedPlans.push({
            id: planId,
            name: plan.name,
            accessedAt: new Date().toISOString()
          });
        }
      }
    });

    return exportData;
  }

  /**
   * Clear all local plans (for migration)
   */
  clearAllPlans() {
    this.plans.clear();
    this.registry.clear();
    removeFromLocalStorage(LOCAL_PLANS_KEY);
    removeFromLocalStorage(LOCAL_PLAN_REGISTRY_KEY);
  }

  /**
   * Get plan statistics
   */
  getStatistics() {
    const user = anonymousUserService.getCurrentUser();
    return {
      totalPlans: this.plans.size,
      ownedPlans: user.plans.length,
      accessedPlans: user.accessedPlans.length,
      storageUsed: this.calculateStorageUsage()
    };
  }

  /**
   * Calculate approximate storage usage
   */
  calculateStorageUsage() {
    try {
      const plansData = JSON.stringify(Object.fromEntries(this.plans));
      const registryData = JSON.stringify(Object.fromEntries(this.registry));
      return plansData.length + registryData.length;
    } catch (error) {
      return 0;
    }
  }
}

// Create and export singleton instance
const localStoragePlanService = new LocalStoragePlanService();

export default localStoragePlanService;
