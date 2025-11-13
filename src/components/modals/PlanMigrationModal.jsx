import React, { useState, useEffect } from 'react';
import { planMigrationService } from '../../services/planMigrationService';

/**
 * Modal that prompts users to migrate their anonymous plans when they create an account
 */
const PlanMigrationModal = ({ isOpen, onMigrate, onSkip, onClose, userId }) => {
  const [migrationSummary, setMigrationSummary] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);
  const [error, setError] = useState('');

  // Load migration summary when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadMigrationSummary();
    }
  }, [isOpen, userId]);

  const loadMigrationSummary = async () => {
    try {
      const summary = await planMigrationService.getMigrationSummary();
      setMigrationSummary(summary);
    } catch (error) {
      console.error('[PlanMigrationModal] Error loading migration summary:', error);
      setError('Failed to load plan information');
    }
  };

  const handleMigrate = async () => {
    if (!userId) {
      setError('User ID is required for migration');
      return;
    }

    setIsMigrating(true);
    setError('');

    try {
      console.log('[PlanMigrationModal] Starting migration for user:', userId);
      const results = await planMigrationService.migrateAllPlans(userId);
      setMigrationResults(results);

      // Clean up successfully migrated plans
      await planMigrationService.cleanupMigratedPlans(results);

      // Notify parent component
      onMigrate(results);
    } catch (error) {
      console.error('[PlanMigrationModal] Migration failed:', error);
      setError('Migration failed. Please try again.');
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleClose = () => {
    if (isMigrating) return; // Prevent closing during migration
    onClose();
  };

  if (!isOpen) return null;

  // Show migration results
  if (migrationResults) {
    const successCount = migrationResults.filter(r => r.success).length;
    const failCount = migrationResults.filter(r => !r.success).length;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Migration Complete!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {successCount > 0 && (
                  <>Successfully migrated {successCount} plan{successCount !== 1 ? 's' : ''} to your account.</>
                )}
                {failCount > 0 && (
                  <> {failCount} plan{failCount !== 1 ? 's' : ''} could not be migrated.</>
                )}
              </p>

              {/* Migration details */}
              {migrationResults.length > 0 && (
                <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Migration Details:</h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {migrationResults.map((result, index) => (
                      <li key={index} className="flex items-center">
                        {result.success ? (
                          <svg className="h-3 w-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        {result.planName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Migrate Your Plans
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We found {migrationSummary?.planCount || 0} mitigation plan{migrationSummary?.planCount !== 1 ? 's' : ''} from your anonymous session. 
              Would you like to save them to your new account?
            </p>

            {/* Plan list */}
            {migrationSummary && migrationSummary.planCount > 0 && (
              <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Plans to migrate:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {migrationSummary.planNames.map((name, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="h-3 w-3 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                      </svg>
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleSkip}
                disabled={isMigrating}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip
              </button>
              <button
                onClick={handleMigrate}
                disabled={isMigrating || !migrationSummary || migrationSummary.planCount === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isMigrating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Migrating...
                  </>
                ) : (
                  'Migrate Plans'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanMigrationModal;
