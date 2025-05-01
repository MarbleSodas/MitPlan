/**
 * Utility functions for version tracking and updates
 */

// Build timestamp that changes with each deployment
// This will be different for each build, triggering updates for returning users
// The __BUILD_TIMESTAMP__ is replaced by Vite during the build process
export const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined'
  ? __BUILD_TIMESTAMP__
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
