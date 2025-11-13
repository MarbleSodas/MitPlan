import { useEffect } from 'react';
import { checkUrlForPlanData, reconstructMitigations, reconstructJobs } from '../utils';

/**
 * Custom hook for handling URL parameters for plan sharing
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.importAssignments - Function to import assignments
 * @param {Function} options.setCurrentBossId - Function to set the current boss ID
 * @param {Function} options.setSelectedJobs - Function to set selected jobs
 * @param {string} options.currentBossId - Current boss ID
 * @returns {void}
 */
const useUrlHandler = ({
  importAssignments,
  setCurrentBossId,
  setSelectedJobs,
  currentBossId
}) => {
  // Check for URL parameters on mount and load plan if present
  useEffect(() => {
    // Check if there's a plan in the URL
    const planData = checkUrlForPlanData();

    if (planData) {
      try {
        console.log('%c[URL LOAD] Loading plan from URL', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planData);

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
            selectedJobs: optimizedSelectedJobs
          }));

          // Force a re-render to ensure the UI reflects the changes
          setTimeout(() => {
            console.log('%c[URL LOAD] Forcing re-render after job selection update', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
            setSelectedJobs({...reconstructedJobs});
          }, 100);
        }

        // Remove the plan parameter from the URL to prevent reloading on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('plan');
        window.history.replaceState({}, document.title, url.toString());
      } catch (error) {
        console.error('Error loading plan from URL:', error);
      }
    }
  }, [importAssignments, setCurrentBossId, setSelectedJobs, currentBossId]);
};

export default useUrlHandler;
