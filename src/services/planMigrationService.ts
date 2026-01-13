import localStoragePlanService from './localStoragePlanService';
import { planService } from './realtimePlanService';

/**
 * Service for migrating anonymous plans to authenticated user accounts
 */
class PlanMigrationService {
  /**
   * Get all anonymous plans from localStorage
   * @returns {Array} Array of anonymous plans
   */
  async getAnonymousPlans() {
    try {
      const plans = await localStoragePlanService.getAllUserPlans();
      return plans.filter(plan => plan.id && plan.id.startsWith('local_'));
    } catch (error) {
      console.error('[PlanMigrationService] Error getting anonymous plans:', error);
      return [];
    }
  }

  /**
   * Migrate a single anonymous plan to Firebase
   * @param {string} localPlanId - The local plan ID
   * @param {string} userId - The authenticated user ID
   * @returns {Promise<string>} The new Firebase plan ID
   */
  async migratePlan(localPlanId, userId) {
    try {
      console.log('[PlanMigrationService] Migrating plan:', localPlanId, 'to user:', userId);

      // Get the local plan
      const localPlan = await localStoragePlanService.getPlan(localPlanId);
      if (!localPlan) {
        throw new Error(`Local plan ${localPlanId} not found`);
      }

      // Create a new plan structure for Firebase
      const migratedPlan = {
        name: localPlan.name || 'Migrated Plan',
        bossId: localPlan.bossId || 'ketuduke',
        selectedJobs: localPlan.selectedJobs || {},
        assignments: localPlan.assignments || {},
        tankPositions: localPlan.tankPositions || {},
        userId: userId,
        isPublic: false, // Default to private
        createdAt: localPlan.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        migratedFrom: localPlanId, // Track migration source
        migratedAt: new Date().toISOString()
      };

      // Create the plan in Firebase
      const newPlanId = await planService.createPlan(migratedPlan);
      console.log('[PlanMigrationService] Plan migrated successfully:', newPlanId);

      return newPlanId;
    } catch (error) {
      console.error('[PlanMigrationService] Error migrating plan:', error);
      throw error;
    }
  }

  /**
   * Migrate all anonymous plans to authenticated user account
   * @param {string} userId - The authenticated user ID
   * @returns {Promise<Array>} Array of migration results
   */
  async migrateAllPlans(userId) {
    try {
      console.log('[PlanMigrationService] Starting migration for user:', userId);

      const anonymousPlans = await this.getAnonymousPlans();
      console.log('[PlanMigrationService] Found', anonymousPlans.length, 'anonymous plans to migrate');

      if (anonymousPlans.length === 0) {
        return [];
      }

      const migrationResults = [];

      for (const plan of anonymousPlans) {
        try {
          const newPlanId = await this.migratePlan(plan.id, userId);
          migrationResults.push({
            success: true,
            localPlanId: plan.id,
            newPlanId: newPlanId,
            planName: plan.name
          });
        } catch (error) {
          console.error('[PlanMigrationService] Failed to migrate plan:', plan.id, error);
          migrationResults.push({
            success: false,
            localPlanId: plan.id,
            error: error.message,
            planName: plan.name
          });
        }
      }

      console.log('[PlanMigrationService] Migration completed:', migrationResults);
      return migrationResults;
    } catch (error) {
      console.error('[PlanMigrationService] Error during migration:', error);
      throw error;
    }
  }

  /**
   * Clean up migrated anonymous plans from localStorage
   * @param {Array} migrationResults - Results from migrateAllPlans
   */
  async cleanupMigratedPlans(migrationResults) {
    try {
      const successfulMigrations = migrationResults.filter(result => result.success);
      
      for (const result of successfulMigrations) {
        try {
          await localStoragePlanService.deletePlan(result.localPlanId);
          console.log('[PlanMigrationService] Cleaned up local plan:', result.localPlanId);
        } catch (error) {
          console.warn('[PlanMigrationService] Failed to cleanup local plan:', result.localPlanId, error);
        }
      }
    } catch (error) {
      console.error('[PlanMigrationService] Error during cleanup:', error);
    }
  }

  /**
   * Check if user has anonymous plans that can be migrated
   * @returns {Promise<boolean>} True if there are plans to migrate
   */
  async hasPlansToMigrate() {
    try {
      // Only check if there's an existing anonymous user session
      const existingAnonymousUser = localStorage.getItem('anonymousUser');
      if (!existingAnonymousUser) {
        return false;
      }

      const plans = await this.getAnonymousPlans();
      return plans.length > 0;
    } catch (error) {
      console.error('[PlanMigrationService] Error checking for plans to migrate:', error);
      return false;
    }
  }

  /**
   * Get migration summary for display to user
   * @returns {Promise<Object>} Migration summary
   */
  async getMigrationSummary() {
    try {
      const plans = await this.getAnonymousPlans();
      return {
        planCount: plans.length,
        planNames: plans.map(plan => plan.name || 'Unnamed Plan'),
        totalSize: plans.reduce((size, plan) => size + JSON.stringify(plan).length, 0)
      };
    } catch (error) {
      console.error('[PlanMigrationService] Error getting migration summary:', error);
      return {
        planCount: 0,
        planNames: [],
        totalSize: 0
      };
    }
  }
}

// Export singleton instance
export const planMigrationService = new PlanMigrationService();
