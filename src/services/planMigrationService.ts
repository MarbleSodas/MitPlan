import { legacyLocalPlanImportService } from './legacyLocalPlanImportService';

/**
 * Legacy compatibility wrapper around the authenticated one-time local import flow.
 */
class PlanMigrationService {
  async getAnonymousPlans() {
    return legacyLocalPlanImportService.getLegacyPlans();
  }

  async migratePlan(localPlanId, userId) {
    const results = await legacyLocalPlanImportService.importAll(userId);
    const match = results.find(result => result.localPlanId === localPlanId);

    if (!match?.success || !match.newPlanId) {
      throw new Error(match?.error || `Failed to migrate plan ${localPlanId}`);
    }

    return match.newPlanId;
  }

  async migrateAllPlans(userId) {
    return legacyLocalPlanImportService.importAll(userId);
  }

  async cleanupMigratedPlans(migrationResults) {
    legacyLocalPlanImportService.clearImportedPlans(migrationResults);
  }

  async hasPlansToMigrate() {
    return legacyLocalPlanImportService.hasLegacyPlans();
  }

  async getMigrationSummary() {
    return legacyLocalPlanImportService.getMigrationSummary();
  }
}

export const planMigrationService = new PlanMigrationService();
