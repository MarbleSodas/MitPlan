import { useEffect, useRef } from 'react';
import { reconstructMitigations } from '../utils';
import { checkUrlForPlanData, reconstructJobs } from '../utils/url/urlUtils';
import { useAuth } from '../contexts/AuthContext';
import { usePlanStorage } from '../contexts/PlanStorageContext';
import { useTankPositionContext } from '../contexts/TankPositionContext';
import { useReadOnly } from '../contexts/ReadOnlyContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { useSharedPlanError } from '../contexts/SharedPlanErrorContext';
import PlanValidationService from '../services/PlanValidationService';
import ErrorHandlingService from '../services/ErrorHandlingService';

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
  const { loadPlan, isInitialized, storageState, storageService } = usePlanStorage();
  const { assignTankPosition } = useTankPositionContext();
  const { setPlanContext, setUrlErrorState, clearUrlError, setLoadingState, clearPlanContext } = useReadOnly();
  const { joinPlan: joinCollaboration, isConnected } = useCollaboration();
  const { setError: setSharedPlanError, clearError: clearSharedPlanError } = useSharedPlanError();

  // Track the last processed URL to prevent duplicate processing
  const lastProcessedUrlRef = useRef(null);

  useEffect(() => {
    const handleUrlPlan = async () => {
      try {
        // Wait for storage service to be initialized before attempting to load plans
        if (!isInitialized) {
          console.log('%c[URL HANDLER] Storage service not initialized yet, waiting...', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
          return;
        }

        // Check if we've already processed this URL to prevent duplicate processing
        const currentUrl = window.location.href;
        if (lastProcessedUrlRef.current === currentUrl) {
          console.log('%c[URL HANDLER] URL already processed, skipping...', 'background: #9E9E9E; color: white; padding: 2px 5px; border-radius: 3px;', currentUrl);
          return;
        }
        lastProcessedUrlRef.current = currentUrl;

        // Clear any previous errors when starting URL handling
        clearUrlError();
        clearSharedPlanError();

        const url = new URL(window.location.href);

        // Check for database plan ID in path (e.g., /plan/uuid or /plan/shared/uuid)
        console.log('%c[URL HANDLER] Checking URL path', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
          pathname: window.location.pathname,
          href: window.location.href
        });

        // Match both UUID format (36 chars with dashes) and Firestore ID format (20 chars alphanumeric)
        const pathMatch = window.location.pathname.match(/^\/plan\/(?:shared\/)?([a-zA-Z0-9-]{20,36})$/i);
        console.log('%c[URL HANDLER] Path match result', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
          pathMatch,
          pathname: window.location.pathname
        });

        if (pathMatch) {
          const planId = pathMatch[1];
          const isSharedPlan = window.location.pathname.includes('/plan/shared/');
          console.log('%c[URL HANDLER] Found plan ID in path', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', { planId, isSharedPlan });

          await loadPlanById(planId);
          return;
        } else {
          console.log('%c[URL HANDLER] No plan ID found in path', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
            pathname: window.location.pathname,
            expectedPattern: '/plan/shared/{uuid} or /plan/{uuid}'
          });
          // Ensure loading state is cleared when no plan ID is found
          setLoadingState(false);
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
        // Ensure loading state is cleared on error
        setLoadingState(false);
      }
    };

    const loadPlanById = async (planId) => {
      try {
        const isSharedPlan = window.location.pathname.includes('/plan/shared/');
        console.log('%c[URL HANDLER] Attempting to load plan', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', planId, 'Storage state:', storageState, 'Is shared:', isSharedPlan);

        // Set loading state
        setLoadingState(true);

        let plan = null;

        // For shared plans, use the specialized loadSharedPlan method
        if (isSharedPlan) {
          try {
            console.log('%c[URL HANDLER] Loading shared plan from Firestore', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', planId);

            if (storageService && storageService.loadSharedPlan) {
              plan = await storageService.loadSharedPlan(planId);
            } else {
              // Fallback: try the regular loadPlan method if loadSharedPlan doesn't exist
              plan = await loadPlan(planId);
            }

            console.log('%c[URL HANDLER] Shared plan loaded successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);
          } catch (error) {
            console.error('%c[URL HANDLER] Failed to load shared plan', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);

            // For shared plans, provide specific error handling with fallback attempts
            if (error.message.includes('Invalid plan ID format')) {
              console.error('%c[URL HANDLER] Invalid plan ID format', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', planId);
              // Set error state instead of redirecting
              setLoadingState(false);
              const errorObj = {
                type: 'invalid_plan_id',
                planId,
                message: error.message
              };
              setUrlErrorState(errorObj);
              setSharedPlanError(errorObj);
              return;
            } else if (error.message.includes('not found') || error.message.includes('no longer available')) {
              console.warn('%c[URL HANDLER] Shared plan not found in Firestore, checking collaboration session', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);

              // Try to load from collaboration session as fallback
              try {
                const SessionManagementService = (await import('../services/SessionManagementService.js')).default;
                const session = await SessionManagementService.getSession(planId);

                if (session && session.planSnapshot) {
                  console.log('%c[URL HANDLER] Found plan data in collaboration session', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', session.planSnapshot);
                  plan = session.planSnapshot;
                } else {
                  console.error('%c[URL HANDLER] No plan data found in session either', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', planId);
                  setLoadingState(false);
                  const errorObj = {
                    type: 'plan_not_found',
                    planId,
                    message: 'Plan not found in database or collaboration session'
                  };
                  setUrlErrorState(errorObj);
                  setSharedPlanError(errorObj);
                  return;
                }
              } catch (sessionError) {
                console.error('%c[URL HANDLER] Failed to check collaboration session', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', sessionError);
                setLoadingState(false);
                const errorObj = {
                  type: 'plan_not_found',
                  planId,
                  message: 'Failed to check collaboration session'
                };
                setUrlErrorState(errorObj);
                setSharedPlanError(errorObj);
                return;
              }
            } else if (error.message.includes('Access denied')) {
              console.error('%c[URL HANDLER] Access denied to shared plan', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', planId);
              setLoadingState(false);
              const errorObj = {
                type: 'access_denied',
                planId,
                message: error.message
              };
              setUrlErrorState(errorObj);
              setSharedPlanError(errorObj);
              return;
            } else {
              console.error('%c[URL HANDLER] Network or other error loading shared plan', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
              setLoadingState(false);
              const errorObj = {
                type: 'network_error',
                planId,
                message: error.message
              };
              setUrlErrorState(errorObj);
              setSharedPlanError(errorObj);
              return;
            }
          }
        } else {
          // For regular plans, use the standard loading method
          try {
            plan = await loadPlan(planId);
            console.log('%c[URL HANDLER] Plan loaded from storage service', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);
          } catch (error) {
            console.warn('Failed to load plan from storage service:', error);
          }
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
          console.log('%c[URL HANDLER] Successfully loaded plan, validating data', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', plan);

          // Clear loading state
          setLoadingState(false);

          // Validate plan data before importing
          const isSharedPlan = window.location.pathname.includes('/plan/shared/');
          const validationContext = isSharedPlan ? 'collaboration' : 'import';
          const validation = PlanValidationService.validateForImport(plan);

          if (!validation.isValid) {
            console.error('%c[URL HANDLER] Plan validation failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', validation.issues);
            ErrorHandlingService.handleValidationError(validation, 'plan_loading');
            return;
          }

          if (validation.warnings && validation.warnings.length > 0) {
            console.warn('%c[URL HANDLER] Plan validation warnings', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', validation.warnings);
            ErrorHandlingService.handleValidationError(validation, 'plan_loading');
          }

          // Additional collaboration validation for shared plans
          if (isSharedPlan) {
            const collaborationValidation = PlanValidationService.validateForCollaboration(plan);
            if (!collaborationValidation.canCollaborate) {
              console.error('%c[URL HANDLER] Plan not suitable for collaboration', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', collaborationValidation.collaborationIssues);
              // Could show user notification about collaboration issues
            }
          }

          // Set plan context for read-only determination
          setPlanContext(plan);

          // Import the plan data
          importPlanData({
            id: plan.id || planId, // Include the plan ID for validation
            assignments: plan.assignments || {},
            bossId: plan.bossId || 'ketuduke',
            selectedJobs: plan.selectedJobs || {},
            tankPositions: plan.tankPositions || {}
          });

          // Show success message for plan loading
          const assignmentCount = plan.assignments ? Object.values(plan.assignments).flat().length : 0;
          ErrorHandlingService.handleSuccess('plan_loaded', {
            planName: plan.name || 'Untitled Plan',
            assignmentCount,
            planId: plan.id
          });

          // NOTE: Auto-join collaboration logic removed from URL handler to prevent infinite loops
          // Collaboration joining is now handled exclusively by useAutoJoinCollaboration hook
          if (isSharedPlan && (plan.isPublic || plan.isShared)) {
            console.log('%c[URL HANDLER] Plan loaded for shared plan - collaboration will be handled by auto-join hook', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
              planId,
              planName: plan.name,
              isShared: plan.isShared,
              isPublic: plan.isPublic
            });
          }
        } else {
          console.warn('%c[URL HANDLER] Plan not found or access denied', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', planId);

          // Clear loading state and set error
          setLoadingState(false);

          // For shared plans, clear any cached plan data
          const isSharedPlan = window.location.pathname.includes('/plan/shared/');
          if (isSharedPlan) {
            clearPlanContext();
          }

          const errorObj = {
            type: 'plan_not_found',
            planId,
            message: 'Plan not found or access denied'
          };
          setUrlErrorState(errorObj);
          setSharedPlanError(errorObj);
        }
      } catch (error) {
        console.error('%c[URL HANDLER] Error loading plan by ID', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);

        // Clear loading state and set error
        setLoadingState(false);

        // For shared plans, clear any cached plan data
        const isSharedPlan = window.location.pathname.includes('/plan/shared/');
        if (isSharedPlan) {
          clearPlanContext();
        }

        const errorObj = {
          type: 'network_error',
          planId,
          message: error.message || 'Unexpected error loading plan'
        };
        setUrlErrorState(errorObj);
        setSharedPlanError(errorObj);
      }
    };

    const loadCompressedPlan = (planData) => {
      try {
        console.log('%c[URL HANDLER] Loading compressed plan data', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planData);

        // Validate compressed plan data
        const validation = PlanValidationService.validateForImport(planData);

        if (!validation.isValid) {
          console.error('%c[URL HANDLER] Compressed plan validation failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', validation.issues);
          ErrorHandlingService.handleValidationError(validation, 'compressed_plan_loading');
          return;
        }

        if (validation.warnings && validation.warnings.length > 0) {
          console.warn('%c[URL HANDLER] Compressed plan validation warnings', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', validation.warnings);
          ErrorHandlingService.handleValidationError(validation, 'compressed_plan_loading');
        }

        importPlanData({
          id: 'compressed-plan', // Provide a default ID for compressed plans
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
        // Validate plan data structure before processing
        console.log('%c[URL LOAD] Validating plan data before import', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', planData);

        const validationReport = PlanValidationService.generateValidationReport(planData, 'import');

        if (!validationReport.overall.canProceed) {
          console.error('%c[URL LOAD] Plan data validation failed, aborting import', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', validationReport);
          return;
        }

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
  }, [isInitialized]); // Simplified dependency array to prevent infinite loops
};

export default useEnhancedUrlHandler;
