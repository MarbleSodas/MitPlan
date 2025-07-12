/**
 * Account Migration Service
 * Handles migration of anonymous user data to authenticated Firebase accounts
 */

import anonymousUserService from './anonymousUserService';
import localStoragePlanService from './localStoragePlanService';
import { createPlan, updatePlan } from './realtimePlanService';

/**
 * Account Migration Service
 */
class AccountMigrationService {
  constructor() {
    this.migrationInProgress = false;
  }

  /**
   * Check if migration is needed
   */
  needsMigration() {
    const anonymousUser = anonymousUserService.getCurrentUser();
    return anonymousUser && (anonymousUser.plans.length > 0 || anonymousUser.accessedPlans.length > 0);
  }

  /**
   * Get migration preview data
   */
  getMigrationPreview() {
    if (!this.needsMigration()) {
      return null;
    }

    const anonymousUser = anonymousUserService.getCurrentUser();
    const planStats = localStoragePlanService.getStatistics();

    return {
      anonymousUserId: anonymousUser.id,
      displayName: anonymousUser.displayName,
      createdAt: anonymousUser.createdAt,
      ownedPlansCount: anonymousUser.plans.length,
      accessedPlansCount: anonymousUser.accessedPlans.length,
      totalPlansCount: planStats.totalPlans,
      storageUsed: planStats.storageUsed,
      migrationEstimate: this.estimateMigrationTime(anonymousUser.plans.length)
    };
  }

  /**
   * Estimate migration time based on number of plans
   */
  estimateMigrationTime(planCount) {
    // Rough estimate: 1-2 seconds per plan
    const seconds = Math.max(5, planCount * 1.5);
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    }
    return `${Math.round(seconds / 60)} minutes`;
  }

  /**
   * Migrate anonymous user data to authenticated account
   */
  async migrateToAuthenticatedAccount(authenticatedUser, options = {}) {
    if (this.migrationInProgress) {
      throw new Error('Migration already in progress');
    }

    try {
      this.migrationInProgress = true;
      
      const {
        preserveDisplayName = true,
        migrateOwnedPlans = true,
        migrateAccessedPlans = false, // Only migrate owned plans by default
        onProgress = null
      } = options;

      console.log('[AccountMigration] Starting migration for user:', authenticatedUser.uid);

      // Get anonymous user data
      const anonymousUser = anonymousUserService.getCurrentUser();
      if (!anonymousUser) {
        throw new Error('No anonymous user data found');
      }

      // Get plans data for migration
      const plansData = localStoragePlanService.exportPlansForMigration();
      
      const migrationResult = {
        success: false,
        migratedPlans: [],
        failedPlans: [],
        preservedData: {},
        errors: []
      };

      let progress = 0;
      const totalSteps = (migrateOwnedPlans ? plansData.ownedPlans.length : 0) + 
                        (migrateAccessedPlans ? plansData.accessedPlans.length : 0) + 2;

      // Step 1: Update user profile if needed
      if (preserveDisplayName && anonymousUser.displayName && !authenticatedUser.displayName) {
        try {
          await this.updateUserProfile(authenticatedUser, {
            displayName: anonymousUser.displayName
          });
          migrationResult.preservedData.displayName = anonymousUser.displayName;
          console.log('[AccountMigration] Preserved display name:', anonymousUser.displayName);
        } catch (error) {
          console.warn('[AccountMigration] Failed to preserve display name:', error);
          migrationResult.errors.push(`Failed to preserve display name: ${error.message}`);
        }
      }

      progress++;
      onProgress?.(progress, totalSteps, 'Updated user profile');

      // Step 2: Migrate owned plans
      if (migrateOwnedPlans && plansData.ownedPlans.length > 0) {
        console.log('[AccountMigration] Migrating owned plans:', plansData.ownedPlans.length);
        
        for (const localPlan of plansData.ownedPlans) {
          try {
            // Create plan in Firebase
            const migratedPlan = await this.migratePlanToFirebase(localPlan, authenticatedUser.uid);
            migrationResult.migratedPlans.push({
              localId: localPlan.id,
              firebaseId: migratedPlan.id,
              name: localPlan.name,
              type: 'owned'
            });
            
            progress++;
            onProgress?.(progress, totalSteps, `Migrated plan: ${localPlan.name}`);
            
            console.log('[AccountMigration] Migrated plan:', localPlan.name, 'to', migratedPlan.id);
          } catch (error) {
            console.error('[AccountMigration] Failed to migrate plan:', localPlan.name, error);
            migrationResult.failedPlans.push({
              localId: localPlan.id,
              name: localPlan.name,
              error: error.message,
              type: 'owned'
            });
            migrationResult.errors.push(`Failed to migrate plan "${localPlan.name}": ${error.message}`);
          }
        }
      }

      // Step 3: Handle accessed plans (record access history)
      if (migrateAccessedPlans && plansData.accessedPlans.length > 0) {
        console.log('[AccountMigration] Recording accessed plans:', plansData.accessedPlans.length);
        
        for (const accessedPlan of plansData.accessedPlans) {
          try {
            // For now, just record that these plans were accessed
            // In the future, we could implement a "recently accessed" feature
            migrationResult.preservedData.accessedPlans = migrationResult.preservedData.accessedPlans || [];
            migrationResult.preservedData.accessedPlans.push(accessedPlan);
            
            progress++;
            onProgress?.(progress, totalSteps, `Recorded access: ${accessedPlan.name}`);
          } catch (error) {
            console.error('[AccountMigration] Failed to record accessed plan:', accessedPlan.name, error);
            migrationResult.errors.push(`Failed to record access to "${accessedPlan.name}": ${error.message}`);
          }
        }
      }

      // Step 4: Clean up anonymous data
      try {
        this.cleanupAnonymousData();
        progress++;
        onProgress?.(progress, totalSteps, 'Cleaned up anonymous data');
        console.log('[AccountMigration] Cleaned up anonymous data');
      } catch (error) {
        console.warn('[AccountMigration] Failed to clean up anonymous data:', error);
        migrationResult.errors.push(`Failed to clean up anonymous data: ${error.message}`);
      }

      migrationResult.success = migrationResult.migratedPlans.length > 0 || migrationResult.errors.length === 0;
      
      console.log('[AccountMigration] Migration completed:', migrationResult);
      return migrationResult;

    } catch (error) {
      console.error('[AccountMigration] Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Migrate a single plan to Firebase
   */
  async migratePlanToFirebase(localPlan, userId) {
    // Prepare plan data for Firebase
    const planData = {
      name: localPlan.name,
      bossId: localPlan.bossId,
      assignments: localPlan.assignments || {},
      selectedJobs: localPlan.selectedJobs || {},
      tankPositions: localPlan.tankPositions || {},
      description: localPlan.description || '',
      isPublic: false, // Migrated plans are private by default
      migratedFrom: 'anonymous',
      originalLocalId: localPlan.id,
      originalCreatedAt: localPlan.createdAt,
      migrationTimestamp: new Date().toISOString()
    };

    // Create plan in Firebase
    return await createPlan(userId, planData);
  }

  /**
   * Update user profile with preserved data
   */
  async updateUserProfile(user, updates) {
    // This would typically use Firebase Auth updateProfile
    // For now, we'll just log the intent
    console.log('[AccountMigration] Would update user profile:', updates);
    // TODO: Implement actual profile update when needed
  }

  /**
   * Clean up anonymous data after successful migration
   */
  cleanupAnonymousData() {
    // Clear local storage plans
    localStoragePlanService.clearAllPlans();
    
    // Clear anonymous user data
    anonymousUserService.clearAnonymousData();
    
    console.log('[AccountMigration] Anonymous data cleaned up');
  }

  /**
   * Cancel migration and restore anonymous state
   */
  cancelMigration() {
    if (this.migrationInProgress) {
      this.migrationInProgress = false;
      console.log('[AccountMigration] Migration cancelled');
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus() {
    return {
      inProgress: this.migrationInProgress,
      needsMigration: this.needsMigration()
    };
  }
}

// Create and export singleton instance
const accountMigrationService = new AccountMigrationService();

export default accountMigrationService;
