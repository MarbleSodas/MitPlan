import { loadFromLocalStorage, saveToLocalStorage } from './storage/storageUtils';

/**
 * Migration utility for moving localStorage plans to database
 */

const MIGRATION_STATUS_KEY = 'mitPlanMigrationStatus';
const SAVED_PLANS_KEY = 'mitPlanSavedPlans';
const AUTOSAVE_KEY = 'mitPlanAutosave';

/**
 * Check if migration has already been completed for a user
 * @param {string} userId - User ID
 * @returns {boolean} Whether migration is complete
 */
export const isMigrationComplete = (userId) => {
  const migrationStatus = loadFromLocalStorage(MIGRATION_STATUS_KEY, {});
  return migrationStatus[userId] === 'complete';
};

/**
 * Mark migration as complete for a user
 * @param {string} userId - User ID
 */
export const markMigrationComplete = (userId) => {
  const migrationStatus = loadFromLocalStorage(MIGRATION_STATUS_KEY, {});
  migrationStatus[userId] = 'complete';
  saveToLocalStorage(MIGRATION_STATUS_KEY, migrationStatus);
};

/**
 * Get localStorage plans that need migration
 * @returns {Array} Array of plans from localStorage
 */
export const getLocalStoragePlans = () => {
  return loadFromLocalStorage(SAVED_PLANS_KEY, []);
};

/**
 * Get autosave data from localStorage
 * @returns {Object|null} Autosave data or null
 */
export const getLocalStorageAutosave = () => {
  return loadFromLocalStorage(AUTOSAVE_KEY, null);
};

/**
 * Convert localStorage plan format to database plan format
 * @param {Object} localPlan - Plan from localStorage
 * @param {string} userId - User ID
 * @returns {Object} Plan in database format
 */
export const convertLocalPlanToDbFormat = (localPlan, userId) => {
  return {
    title: localPlan.name || 'Untitled Plan',
    description: `Migrated from local storage on ${new Date().toLocaleDateString()}`,
    bossId: localPlan.bossId,
    selectedJobs: localPlan.selectedJobs || {},
    assignments: localPlan.assignments || {},
    userId: userId,
    isPublic: false,
    // Preserve original metadata
    metadata: {
      originalId: localPlan.id,
      originalDate: localPlan.date,
      originalVersion: localPlan.version,
      migrated: true,
      migratedAt: new Date().toISOString()
    }
  };
};

/**
 * Migrate localStorage plans to database
 * @param {string} userId - User ID
 * @param {Function} createPlan - Function to create plan in database
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Migration result
 */
export const migratePlansToDatabase = async (userId, createPlan, onProgress = null) => {
  try {
    // Check if migration already completed
    if (isMigrationComplete(userId)) {
      console.log('Migration already completed for user:', userId);
      return { success: true, migrated: 0, skipped: 0, errors: [] };
    }

    const localPlans = getLocalStoragePlans();
    
    if (localPlans.length === 0) {
      console.log('No localStorage plans to migrate');
      markMigrationComplete(userId);
      return { success: true, migrated: 0, skipped: 0, errors: [] };
    }

    console.log(`Starting migration of ${localPlans.length} plans for user:`, userId);

    let migrated = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < localPlans.length; i++) {
      const localPlan = localPlans[i];
      
      try {
        // Report progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: localPlans.length,
            planName: localPlan.name
          });
        }

        // Convert to database format
        const dbPlan = convertLocalPlanToDbFormat(localPlan, userId);
        
        // Create plan in database
        await createPlan(dbPlan);
        migrated++;
        
        console.log(`Migrated plan: ${localPlan.name}`);
        
      } catch (error) {
        console.error(`Failed to migrate plan: ${localPlan.name}`, error);
        errors.push({
          planName: localPlan.name,
          error: error.message
        });
      }
    }

    // Mark migration as complete
    markMigrationComplete(userId);

    const result = {
      success: true,
      migrated,
      skipped,
      errors,
      total: localPlans.length
    };

    console.log('Migration completed:', result);
    return result;

  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message,
      migrated: 0,
      skipped: 0,
      errors: []
    };
  }
};

/**
 * Migrate autosave data to database
 * @param {string} userId - User ID
 * @param {Function} createPlan - Function to create plan in database
 * @returns {Promise<boolean>} Whether autosave was migrated
 */
export const migrateAutosaveToDatabase = async (userId, createPlan) => {
  try {
    const autosaveData = getLocalStorageAutosave();
    
    if (!autosaveData || !autosaveData.assignments) {
      return false;
    }

    // Create a plan from autosave data
    const autosavePlan = {
      title: 'Autosaved Plan (Migrated)',
      description: `Autosaved plan migrated from local storage on ${new Date().toLocaleDateString()}`,
      bossId: 'unknown', // Will need to be updated by user
      selectedJobs: autosaveData.selectedJobs || {},
      assignments: autosaveData.assignments,
      userId: userId,
      isPublic: false,
      metadata: {
        isAutosave: true,
        migrated: true,
        migratedAt: new Date().toISOString(),
        originalLastSaved: autosaveData.lastSaved
      }
    };

    await createPlan(autosavePlan);
    console.log('Autosave data migrated successfully');
    return true;

  } catch (error) {
    console.error('Failed to migrate autosave data:', error);
    return false;
  }
};

/**
 * Clear localStorage plans after successful migration (optional)
 * @param {boolean} keepBackup - Whether to keep a backup
 */
export const clearLocalStoragePlans = (keepBackup = true) => {
  if (keepBackup) {
    const plans = getLocalStoragePlans();
    const autosave = getLocalStorageAutosave();
    
    // Save backup
    saveToLocalStorage('mitPlanBackup', {
      plans,
      autosave,
      backedUpAt: new Date().toISOString()
    });
  }

  // Clear original data
  localStorage.removeItem(SAVED_PLANS_KEY);
  localStorage.removeItem(AUTOSAVE_KEY);
};

export default {
  isMigrationComplete,
  markMigrationComplete,
  getLocalStoragePlans,
  getLocalStorageAutosave,
  convertLocalPlanToDbFormat,
  migratePlansToDatabase,
  migrateAutosaveToDatabase,
  clearLocalStoragePlans
};
