/**
 * Utility functions for version tracking and updates
 */

// Build timestamp that changes with each deployment
// This will be different for each build, triggering updates for returning users
// The __BUILD_TIMESTAMP__ is replaced by Vite during the build process
export const BUILD_TIMESTAMP = (typeof window !== 'undefined' && window.__BUILD_TIMESTAMP__)
  ? window.__BUILD_TIMESTAMP__
  : Date.now(); // Fallback for development

/**
 * Check if the application has been updated since the user's last visit
 * If so, clear localStorage and refresh the page
 *
 * @returns {boolean} - Whether an update check was performed
 */
export const checkForUpdates = () => {
  try {
    // Get the stored version from localStorage
    const storedVersion = localStorage.getItem('mitPlanVersion');

    // If no stored version, this is a first visit or localStorage was cleared
    if (!storedVersion) {
      // Store the current version
      localStorage.setItem('mitPlanVersion', BUILD_TIMESTAMP.toString());
      return false;
    }

    // Compare stored version with current version
    if (storedVersion !== BUILD_TIMESTAMP.toString()) {
      console.log('%c[VERSION] Update detected! Clearing localStorage and refreshing...',
        'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;',
        { storedVersion, currentVersion: BUILD_TIMESTAMP });

      // Clear all localStorage
      localStorage.clear();

      // Store the new version
      localStorage.setItem('mitPlanVersion', BUILD_TIMESTAMP.toString());

      // Refresh the page
      window.location.reload();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
};

/**
 * Migrate plan data from older versions to the current format
 * @param {Object} planData - The plan data to migrate
 * @returns {Object} - The migrated plan data
 */
export const migratePlanData = (planData) => {
  if (!planData) {
    throw new Error('No plan data provided');
  }

  // Create a copy to avoid mutating the original
  const migratedData = { ...planData };

  // Determine the version
  const version = planData.version || '1.0';

  console.log(`%c[MIGRATION] Migrating plan from version ${version}`,
    'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

  // Version 1.0 to 1.2 migration
  if (version === '1.0' || !version) {
    // In version 1.0, there might be different field names or structures
    // Ensure assignments field exists
    if (!migratedData.assignments && migratedData.mitigations) {
      migratedData.assignments = migratedData.mitigations;
      delete migratedData.mitigations;
    }

    // Ensure selectedJobs field exists
    if (!migratedData.selectedJobs && migratedData.jobs) {
      migratedData.selectedJobs = migratedData.jobs;
      delete migratedData.jobs;
    }

    // Set version to 1.2
    migratedData.version = '1.2';
  }

  // Version 1.1 to 1.2 migration (if needed)
  if (version === '1.1') {
    // Handle any specific 1.1 to 1.2 changes
    migratedData.version = '1.2';
  }

  // Handle legacy field mappings first
  if (migratedData.assignedMitigations && !migratedData.assignments) {
    migratedData.assignments = migratedData.assignedMitigations;
    delete migratedData.assignedMitigations;
  }

  if (migratedData.tankAssignments && !migratedData.tankPositions) {
    migratedData.tankPositions = migratedData.tankAssignments;
    delete migratedData.tankAssignments;
  }

  // Ensure all required fields exist with defaults
  migratedData.assignments = migratedData.assignments || {};
  migratedData.selectedJobs = migratedData.selectedJobs || {};
  migratedData.bossId = migratedData.bossId || 'ketuduke';

  // Handle other legacy field names
  if (migratedData.boss && !migratedData.bossId) {
    migratedData.bossId = migratedData.boss;
    delete migratedData.boss;
  }

  if (migratedData.title && !migratedData.name) {
    migratedData.name = migratedData.title;
  }

  // Preserve important metadata
  if (migratedData.exportDate && !migratedData.createdAt) {
    migratedData.createdAt = migratedData.exportDate;
  }

  // Ensure the final version is set
  migratedData.version = '1.2';

  console.log(`%c[MIGRATION] Migration complete. Final version: ${migratedData.version}`,
    'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');

  return migratedData;
};

/**
 * Validate that plan data has all required fields
 * @param {Object} planData - The plan data to validate
 * @returns {boolean} - Whether the plan data is valid
 */
export const validatePlanData = (planData) => {
  if (!planData) {
    return false;
  }

  // Required fields for a valid plan
  const requiredFields = ['bossId', 'assignments'];

  for (const field of requiredFields) {
    if (!(field in planData)) {
      console.warn(`%c[VALIDATION] Missing required field: ${field}`,
        'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return false;
    }
  }

  // Validate data types
  if (typeof planData.assignments !== 'object') {
    console.warn(`%c[VALIDATION] Invalid assignments field type`,
      'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    return false;
  }

  if (planData.selectedJobs && typeof planData.selectedJobs !== 'object') {
    console.warn(`%c[VALIDATION] Invalid selectedJobs field type`,
      'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    return false;
  }

  return true;
};
