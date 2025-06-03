import { useEffect } from 'react';
import { reconstructMitigations } from '../utils';
import { checkUrlForPlanData, reconstructJobs } from '../utils/url/urlUtils';
import { useAuth } from '../contexts/AuthContext';
import { usePlanStorage } from '../contexts/PlanStorageContext';
import { useTankPositionContext } from '../contexts/TankPositionContext';
import { useReadOnly } from '../contexts/ReadOnlyContext';

/**
 * Enhanced URL handler that supports both database plan IDs and compressed plan data
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.importAssignments - Function to import assignments
 * @param {Function} options.setCurrentBossId - Function to set the current boss ID
 * @param {Function} options.setSelectedJobs - Function to set selected jobs
 * @param {string} options.currentBossId - Current boss ID
 * @returns {void}
 */
const useEnhancedUrlHandler = ({
  importAssignments,
  setCurrentBossId,
  setSelectedJobs,
  currentBossId
}) => {
  const { apiRequest } = useAuth();
  const { loadPlan, isInitialized, storageState } = usePlanStorage();
  const { assignTankPosition } = useTankPositionContext();
  const { setPlanContext } = useReadOnly();

  useEffect(() => {
    const handleUrlPlan = async () => {
      try {
        // Wait for storage service to be initialized before attempting to load plans
        if (!isInitialized) {
          console.log('%c[URL HANDLER] Storage service not initialized yet, waiting...', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
          return;
        }

        const url = new URL(window.location.href);

        // Check for database plan ID in path (e.g., /plan/uuid or /plan/shared/uuid)
        const pathMatch = window.location.pathname.match(/^\/plan\/(?:shared\/)?([a-f0-9-]{36})$/i);
        if (pathMatch) {
          const planId = pathMatch[1];
          const isSharedPlan = window.location.pathname.includes('/plan/shared/');
          console.log('%c[URL HANDLER] Found plan ID in path', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', { planId, isSharedPlan });

          await loadPlanById(planId);
          return;
        }

        // Check for plan_id parameter (alternative format)
        const planIdParam = url.searchParams.get('plan_id');
        if (planIdParam) {
          console.log('%c[URL HANDLER] Found plan_id parameter', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', planIdParam);

          await loadPlanById(planIdParam);

          // Clean up URL
          url.searchParams.delete('plan_id');
          window.history.replaceState({}, document.title, url.toString());
          return;
        }

        // Check for compressed plan data (backward compatibility)
        const planData = checkUrlForPlanData();
        if (planData) {
          console.log('%c[URL HANDLER] Found compressed plan data in URL', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', planData);

          loadCompressedPlan(planData);

          // Clean up URL
          url.searchParams.delete('plan');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (error) {
        console.error('Error handling URL plan data:', error);
      }
    };

    const loadPlanById = async (planId) => {
      try {
        console.log('%c[URL HANDLER] Attempting to load plan', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', planId, 'Storage state:', storageState);

        // Try to load from storage service first (handles both database and localStorage)
        let plan = null;

        try {
          plan = await loadPlan(planId);
          console.log('%c[URL HANDLER] Plan loaded from storage service', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);
        } catch (error) {
          console.warn('Failed to load plan from storage service:', error);
        }

        // Fallback: try direct API call for public plans (only if user is authenticated or plan might be public)
        if (!plan && apiRequest) {
          try {
            console.log('%c[URL HANDLER] Trying direct API call for plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
            const response = await apiRequest(`/plans/${planId}`);
            plan = {
              id: response.plan.id,
              name: response.plan.name,
              assignments: response.plan.assignments || {},
              bossId: response.plan.boss_id || 'ketuduke',
              selectedJobs: response.plan.selected_jobs || {},
              tankPositions: response.plan.tank_positions || {},
              isPublic: response.plan.is_public,
              source: 'database'
            };
            console.log('%c[URL HANDLER] Plan loaded from direct API call', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);
          } catch (error) {
            console.error('Failed to load plan from API:', error);

            // Show user-friendly error message
            if (error.message.includes('Plan not found') || error.message.includes('404')) {
              console.warn('%c[URL HANDLER] Plan not found in database', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', planId);
              // Could show a toast notification here in the future
            } else {
              console.warn('%c[URL HANDLER] API error while loading plan', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error.message);
            }
            return;
          }
        }

        if (plan) {
          console.log('%c[URL HANDLER] Successfully loaded plan, importing data', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);

          // Set plan context for read-only determination
          setPlanContext(plan);

          // Import the plan data
          importPlanData({
            assignments: plan.assignments || {},
            bossId: plan.bossId || 'ketuduke',
            selectedJobs: plan.selectedJobs || {},
            tankPositions: plan.tankPositions || {}
          });

          // If this is a shared plan, automatically start collaboration
          const isSharedPlan = window.location.pathname.includes('/plan/shared/');
          if (isSharedPlan && (plan.isPublic || plan.isShared)) {
            console.log('%c[URL HANDLER] Starting collaboration for shared plan', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', planId);

            // Import collaboration context dynamically to avoid circular imports
            try {
              const { useCollaboration } = await import('../contexts/CollaborationContext');
              // Note: This will be handled by the useCollaboration hook in App.jsx
              // We just need to ensure the plan is loaded first
            } catch (collaborationError) {
              console.warn('Failed to start collaboration:', collaborationError);
            }
          }
        } else {
          console.warn('%c[URL HANDLER] Plan not found or access denied', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', planId);
          // Could show a user notification here
        }
      } catch (error) {
        console.error('%c[URL HANDLER] Error loading plan by ID', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
      }
    };

    const loadCompressedPlan = (planData) => {
      try {
        console.log('%c[URL HANDLER] Loading compressed plan data', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planData);

        importPlanData({
          assignments: planData.assignments || {},
          bossId: planData.bossId || 'ketuduke',
          selectedJobs: planData.selectedJobs || {},
          tankPositions: planData.tankPositions || {}
        });
      } catch (error) {
        console.error('Error loading compressed plan:', error);
      }
    };

    const importPlanData = (planData) => {
      try {
        // Reconstruct the full mitigation objects from IDs
        const reconstructedAssignments = reconstructMitigations(planData.assignments);
        console.log('%c[URL LOAD] Reconstructed assignments', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', reconstructedAssignments);

        // Restore tank positions if provided
        if (planData.tankPositions && Object.keys(planData.tankPositions).length > 0) {
          console.log('%c[URL LOAD] Restoring tank positions', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planData.tankPositions);

          // Restore main tank position
          if (planData.tankPositions.mainTank) {
            assignTankPosition(planData.tankPositions.mainTank, 'mainTank');
          }

          // Restore off tank position
          if (planData.tankPositions.offTank) {
            assignTankPosition(planData.tankPositions.offTank, 'offTank');
          }
        }

        // Reconstruct the full job objects if selectedJobs is included
        let reconstructedJobs = null;
        if (planData.selectedJobs) {
          console.log('%c[URL LOAD] Selected jobs from URL', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planData.selectedJobs);
          reconstructedJobs = reconstructJobs(planData.selectedJobs);
          console.log('%c[URL LOAD] Reconstructed jobs', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', reconstructedJobs);
        }

        // Update assignments using the context
        if (reconstructedAssignments) {
          importAssignments(reconstructedAssignments);
        }

        // Update boss if different
        if (planData.bossId && planData.bossId !== currentBossId) {
          setCurrentBossId(planData.bossId);
        }

        // Update selected jobs if they were included in the import
        if (reconstructedJobs) {
          console.log('%c[URL LOAD] Updating selected jobs in context', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
          // Let JobContext handle localStorage updates
          setSelectedJobs(reconstructedJobs);
        }

        console.log('%c[URL LOAD] Plan data import completed', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      } catch (error) {
        console.error('Error importing plan data:', error);
      }
    };

    handleUrlPlan();
  }, [importAssignments, setCurrentBossId, setSelectedJobs, currentBossId, apiRequest, loadPlan, isInitialized, setPlanContext]);
};

export default useEnhancedUrlHandler;
