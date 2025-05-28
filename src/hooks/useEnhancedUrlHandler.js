import { useEffect } from 'react';
import { checkUrlForPlanData, reconstructMitigations, reconstructJobs } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { usePlanStorage } from '../contexts/PlanStorageContext';

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
  const { loadPlan } = usePlanStorage();

  useEffect(() => {
    const handleUrlPlan = async () => {
      try {
        const url = new URL(window.location.href);
        
        // Check for database plan ID in path (e.g., /plan/uuid)
        const pathMatch = window.location.pathname.match(/^\/plan\/([a-f0-9-]{36})$/i);
        if (pathMatch) {
          const planId = pathMatch[1];
          console.log('%c[URL HANDLER] Found plan ID in path', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', planId);
          
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
        // Try to load from storage service first (handles both database and localStorage)
        let plan = null;
        
        try {
          plan = await loadPlan(planId);
        } catch (error) {
          console.warn('Failed to load plan from storage service:', error);
        }
        
        // Fallback: try direct API call for public plans
        if (!plan && apiRequest) {
          try {
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
          } catch (error) {
            console.error('Failed to load plan from API:', error);
            return;
          }
        }
        
        if (plan) {
          console.log('%c[URL HANDLER] Loaded plan successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);
          
          // Import the plan data
          importPlanData({
            assignments: plan.assignments || {},
            bossId: plan.bossId || 'ketuduke',
            selectedJobs: plan.selectedJobs || {}
          });
        } else {
          console.warn('Plan not found or access denied:', planId);
        }
      } catch (error) {
        console.error('Error loading plan by ID:', error);
      }
    };

    const loadCompressedPlan = (planData) => {
      try {
        console.log('%c[URL HANDLER] Loading compressed plan data', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planData);
        
        importPlanData({
          assignments: planData.assignments || {},
          bossId: planData.bossId || 'ketuduke',
          selectedJobs: planData.selectedJobs || {}
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

          // First update the context
          setSelectedJobs(reconstructedJobs);

          // Then directly update localStorage to ensure consistency
          console.log('%c[URL LOAD] Updating localStorage with selected jobs', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
          localStorage.setItem('selectedJobs', JSON.stringify(reconstructedJobs));

          // Also update the autosave data
          const autosavedPlan = JSON.parse(localStorage.getItem('mitPlanAutosave') || '{}');

          // Create optimized selectedJobs object with only the selected job IDs
          const optimizedSelectedJobs = {};

          Object.entries(reconstructedJobs).forEach(([roleKey, jobs]) => {
            // Filter to include only selected jobs and store only their IDs
            const selectedJobIds = jobs
              .filter(job => job.selected)
              .map(job => job.id);

            // Only include the role if it has selected jobs
            if (selectedJobIds.length > 0) {
              optimizedSelectedJobs[roleKey] = selectedJobIds;
            }
          });

          console.log('%c[URL LOAD] Optimized selected jobs for autosave', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', optimizedSelectedJobs);

          localStorage.setItem('mitPlanAutosave', JSON.stringify({
            ...autosavedPlan,
            bossId: planData.bossId,
            assignments: planData.assignments,
            selectedJobs: optimizedSelectedJobs
          }));

          // Force a re-render to ensure the UI reflects the changes
          setTimeout(() => {
            console.log('%c[URL LOAD] Forcing re-render after job selection update', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
            setSelectedJobs({...reconstructedJobs});
          }, 100);
        }
      } catch (error) {
        console.error('Error importing plan data:', error);
      }
    };

    handleUrlPlan();
  }, [importAssignments, setCurrentBossId, setSelectedJobs, currentBossId, apiRequest, loadPlan]);
};

export default useEnhancedUrlHandler;
