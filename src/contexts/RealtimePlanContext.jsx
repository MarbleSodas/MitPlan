import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';
import * as planService from '../services/realtimePlanService';
import unifiedPlanService from '../services/unifiedPlanService';
import localStoragePlanService from '../services/localStoragePlanService';

const RealtimePlanContext = createContext({});

export const useRealtimePlan = () => {
  const context = useContext(RealtimePlanContext);
  if (!context) {
    throw new Error('useRealtimePlan must be used within a RealtimePlanProvider');
  }
  return context;
};

export const RealtimePlanProvider = ({ children, planId }) => {
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const { sessionId, debouncedUpdate, setChangeOrigin, isOwnChange } = useCollaboration();

  // Detect if this is a local plan (starts with 'local_')
  const isLocalPlan = planId && planId.startsWith('local_');

  // Set up unified plan service context
  useEffect(() => {
    unifiedPlanService.setUserContext(user || anonymousUser, isAnonymousMode || isLocalPlan);
  }, [user, anonymousUser, isAnonymousMode, isLocalPlan]);

  // Complete plan state loaded from Firebase Realtime Database
  const [realtimePlan, setRealtimePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs to prevent infinite loops and track changes
  const isUpdatingRef = useRef(false);
  const changeOriginRef = useRef(null);
  const pendingChangesRef = useRef(new Set());
  const planListenerRef = useRef(null);

  // Load plan data directly from Firebase Realtime Database
  useEffect(() => {
    if (!planId) {
      console.log('[RealtimePlanContext] No planId provided');
      return;
    }

    console.log('[RealtimePlanContext] Setting up listener for planId:', planId);
    setLoading(true);
    setError(null);

    // Initialize plan based on type (local or Firebase)
    const initializePlan = async () => {
      try {
        if (isLocalPlan) {
          // For local plans, load directly from localStorage
          console.log('[RealtimePlanContext] Loading local plan from localStorage');
          const localPlan = await localStoragePlanService.getPlan(planId);

          if (localPlan) {
            console.log('[RealtimePlanContext] Local plan loaded:', localPlan.name);
            setRealtimePlan(localPlan);
            setLoading(false);
            setError(null);
            return; // Don't set up Firebase listener for local plans
          } else {
            throw new Error('Local plan not found');
          }
        } else {
          // For Firebase plans, try to ensure plan structure exists
          // But handle permission errors gracefully
          try {
            await planService.ensurePlanStructure(planId);
          } catch (structureError) {
            // If it's a permission error, we'll let the real-time listener handle it
            if (structureError.message?.includes('Permission denied')) {
              console.log('[RealtimePlanContext] Plan access restricted, will attempt real-time connection');
            } else {
              // For other errors, re-throw
              throw structureError;
            }
          }
        }
      } catch (error) {
        console.warn('[RealtimePlanContext] Could not initialize plan:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    initializePlan();

    // Set up real-time listener only for Firebase plans
    let unsubscribe = () => {};

    if (!isLocalPlan) {
      // Track access when first loading the plan
      const trackInitialAccess = async () => {
        try {
          const currentUser = user || anonymousUser;
          if (currentUser) {
            const { trackPlanAccess } = await import('../services/planAccessService');
            if (currentUser.uid) {
              await trackPlanAccess(planId, currentUser.uid, false);
              console.log('[RealtimePlanContext] Initial access tracked for authenticated user:', currentUser.uid);
            } else if (currentUser.id) {
              await trackPlanAccess(planId, currentUser.id, true);
              console.log('[RealtimePlanContext] Initial access tracked for anonymous user:', currentUser.id);
            }
          }
        } catch (error) {
          console.error('[RealtimePlanContext] Error tracking initial access:', error);
        }
      };

      // Track access on first load
      trackInitialAccess();

      unsubscribe = planService.subscribeToPlanWithOrigin(
        planId,
        (planData, changeOrigin, error) => {
          console.log('[RealtimePlanContext] Received data:', { planData: !!planData, changeOrigin, error });

          if (error) {
            console.error('[RealtimePlanContext] Error loading plan:', error);

            // Handle permission errors more gracefully
            if (error.message?.includes('Permission denied') || error.message?.includes('permission_denied')) {
              setError('You do not have permission to access this plan');
            } else {
              setError(error.message);
            }
            setLoading(false);
            return;
          }

        if (planData) {
          // Always update on initial load (when realtimePlan is null)
          // Only skip updates if this change originated from this session AND we already have data
          if (!realtimePlan || !changeOrigin || !isOwnChange(changeOrigin)) {
            console.log('[RealtimePlanContext] Setting plan data:', {
              name: planData.name,
              bossId: planData.bossId,
              selectedJobsKeys: Object.keys(planData.selectedJobs || {}),
              selectedJobsData: planData.selectedJobs,
              assignmentCount: Object.keys(planData.assignments || {}).length,
              assignmentsData: planData.assignments,
              tankPositionsData: planData.tankPositions,
              hasUserId: !!planData.userId,
              isPublic: planData.isPublic,
              sourceTimelineId: planData.sourceTimelineId,
              sourceTimelineName: planData.sourceTimelineName
            });
            setRealtimePlan(planData);
          } else {
            console.log('[RealtimePlanContext] Skipping update - own change');
          }
          setError(null);
        } else {
          console.log('[RealtimePlanContext] No plan data received');
          setRealtimePlan(null);
        }

        setLoading(false);
        setIsInitialized(true);
      },
      sessionId
    );
    }

    planListenerRef.current = unsubscribe;

    // Cleanup listener on unmount or planId change
    return () => {
      if (planListenerRef.current) {
        planListenerRef.current();
        planListenerRef.current = null;
      }
    };
  }, [planId, sessionId, isOwnChange, isLocalPlan]);

  // Enhanced change origin tracking
  const trackChange = useCallback((changeType, changeId) => {
    const trackingId = `${changeType}-${changeId}-${sessionId}`;
    changeOriginRef.current = trackingId;
    pendingChangesRef.current.add(trackingId);

    // Clear tracking after a delay
    setTimeout(() => {
      pendingChangesRef.current.delete(trackingId);
      if (changeOriginRef.current === trackingId) {
        changeOriginRef.current = null;
      }
    }, 2000);

    return trackingId;
  }, [sessionId]);

  // Real-time update functions that immediately update Firebase
  const updateBossRealtime = useCallback((bossId) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    // Check if this is actually a change
    if (realtimePlan?.bossId === bossId) return;

    // Track this change
    trackChange('boss', bossId);
    setChangeOrigin(sessionId);

    // Update local state immediately for better UX
    setRealtimePlan(prev => prev ? { ...prev, bossId } : null);

    debouncedUpdate(`boss-${planId}`, async () => {
      try {
        await planService.updatePlanBossRealtime(planId, bossId, user.uid, sessionId);
      } catch (error) {
        console.error('Error updating boss realtime:', error);
        // Revert local state on error
        setRealtimePlan(prev => prev ? { ...prev, bossId: realtimePlan?.bossId } : null);
      }
    }, 300);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, realtimePlan]);

  const updateJobsRealtime = useCallback((selectedJobs) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    // Convert full job objects to optimized format (only selected job IDs)
    const optimizedSelectedJobs = {};
    Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
      // Filter to only include selected jobs and store only their IDs
      const selectedJobIds = jobs
        .filter(job => job.selected)
        .map(job => job.id);

      // Only include the role if it has selected jobs
      if (selectedJobIds.length > 0) {
        optimizedSelectedJobs[roleKey] = selectedJobIds;
      }
    });

    // Check if this is actually a change
    const currentJobsString = JSON.stringify(realtimePlan?.selectedJobs || {});
    const newJobsString = JSON.stringify(optimizedSelectedJobs);
    if (currentJobsString === newJobsString) return;

    // Track this change
    trackChange('jobs', newJobsString);
    setChangeOrigin(sessionId);

    // Store the previous state for potential rollback
    const previousJobs = realtimePlan?.selectedJobs;

    // Update local state immediately with optimized format
    setRealtimePlan(prev => prev ? { ...prev, selectedJobs: optimizedSelectedJobs } : null);

    debouncedUpdate(`jobs-${planId}`, async () => {
      try {
        if (isLocalPlan) {
          // For local plans, update localStorage directly
          await localStoragePlanService.updatePlan(planId, { selectedJobs: optimizedSelectedJobs });
        } else {
          // For Firebase plans, use realtime service
          await planService.updatePlanJobsRealtime(planId, optimizedSelectedJobs, user?.uid, sessionId);
        }
        console.log('[RealtimePlanContext] Jobs updated successfully');
      } catch (error) {
        console.error('Error updating jobs realtime:', error);
        // Revert local state on error
        setRealtimePlan(prev => prev ? { ...prev, selectedJobs: previousJobs } : null);
        setError('Failed to update job selection. Please try again.');

        // Clear error after a delay
        setTimeout(() => setError(null), 5000);
      }
    }, 150);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, realtimePlan, isLocalPlan]);

  const updateAssignmentsRealtime = useCallback((assignments) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return Promise.resolve();

    // Check if this is actually a change
    const currentAssignmentsString = JSON.stringify(realtimePlan?.assignments || {});
    const newAssignmentsString = JSON.stringify(assignments);
    if (currentAssignmentsString === newAssignmentsString) return Promise.resolve();

    // Track this change
    trackChange('assignments', newAssignmentsString);
    setChangeOrigin(sessionId);

    // Store the previous state for potential rollback
    const previousAssignments = realtimePlan?.assignments;

    // Update local state immediately
    setRealtimePlan(prev => prev ? { ...prev, assignments } : null);

    // Create a Promise that will be resolved/rejected by the debounced update
    const updatePromise = new Promise((resolve, reject) => {
      // Store the resolve/reject functions so the debounced update can call them
      const updateKey = `assignments-${planId}`;

      debouncedUpdate(updateKey, async () => {
        try {
          if (isLocalPlan) {
            // For local plans, update localStorage directly
            await localStoragePlanService.updatePlan(planId, { assignments });
          } else {
            // For Firebase plans, use realtime service
            await planService.updatePlanAssignmentsRealtime(planId, assignments, user?.uid, sessionId);
          }
          console.log('[RealtimePlanContext] Assignments updated successfully');
          resolve(true);
        } catch (error) {
          console.error('Error updating assignments realtime:', error);
          // Revert local state on error
          setRealtimePlan(prev => prev ? { ...prev, assignments: previousAssignments } : null);
          setError('Failed to update mitigation assignments. Please try again.');

          // Clear error after a delay
          setTimeout(() => setError(null), 5000);
          reject(error);
        }
      }, 300);
    });

    return updatePromise;
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, realtimePlan, isLocalPlan]);

  const updateTankPositionsRealtime = useCallback((tankPositions) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    // Check if this is actually a change
    const currentTankPositionsString = JSON.stringify(realtimePlan?.tankPositions || {});
    const newTankPositionsString = JSON.stringify(tankPositions);
    if (currentTankPositionsString === newTankPositionsString) return;

    // Track this change
    trackChange('tankPositions', newTankPositionsString);
    setChangeOrigin(sessionId);

    // Store the previous state for potential rollback
    const previousTankPositions = realtimePlan?.tankPositions;

    // Update local state immediately
    setRealtimePlan(prev => prev ? { ...prev, tankPositions } : null);

    debouncedUpdate(`tankPositions-${planId}`, async () => {
      try {
        if (isLocalPlan) {
          // For local plans, update localStorage directly
          await localStoragePlanService.updatePlan(planId, { tankPositions });
        } else {
          // For Firebase plans, use realtime service
          await planService.updateTankPositionsRealtime(planId, tankPositions, user?.uid, sessionId);
        }
        console.log('[RealtimePlanContext] Tank positions updated successfully');
      } catch (error) {
        console.error('Error updating tank positions realtime:', error);
        // Revert local state on error
        setRealtimePlan(prev => prev ? { ...prev, tankPositions: previousTankPositions } : null);
        setError('Failed to update tank positions. Please try again.');

        // Clear error after a delay
        setTimeout(() => setError(null), 5000);
      }
    }, 300);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, realtimePlan, isLocalPlan]);

  // Batch update function for multiple fields
  const batchUpdateRealtime = useCallback((updates) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    setChangeOrigin(sessionId);

    // Update local state immediately
    setRealtimePlan(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });

    debouncedUpdate(`batch-${planId}`, async () => {
      try {
        await planService.batchUpdatePlanRealtime(planId, updates, user.uid, sessionId);
      } catch (error) {
        console.error('Error batch updating plan realtime:', error);
        // Revert local state on error
        setRealtimePlan(prev => {
          if (!prev) return null;
          const reverted = { ...prev };
          Object.keys(updates).forEach(key => {
            if (realtimePlan && realtimePlan[key] !== undefined) {
              reverted[key] = realtimePlan[key];
            }
          });
          return reverted;
        });
      }
    }, 500);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, realtimePlan]);

  // Recovery function to reload plan data from Firebase
  const recoverPlanData = useCallback(async () => {
    if (!planId) return;

    try {
      setLoading(true);
      setError(null);

      // Use access tracking when recovering plan data
      const planData = await planService.getPlanWithAccessTracking(planId);
      setRealtimePlan(planData);

      console.log('[RealtimePlanContext] Plan data recovered successfully');
    } catch (error) {
      console.error('[RealtimePlanContext] Failed to recover plan data:', error);
      setError('Failed to recover plan data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  const value = {
    // Real-time plan data
    realtimePlan,
    loading,
    error,
    isInitialized,

    // Convenience accessors for plan data
    bossId: realtimePlan?.bossId,
    selectedJobs: realtimePlan?.selectedJobs || {},
    assignments: realtimePlan?.assignments || {},
    tankPositions: realtimePlan?.tankPositions || {},
    planName: realtimePlan?.name,

    // Update functions
    updateBossRealtime,
    updateJobsRealtime,
    updateAssignmentsRealtime,
    updateTankPositionsRealtime,
    batchUpdateRealtime,

    // Recovery function
    recoverPlanData
  };

  return (
    <RealtimePlanContext.Provider value={value}>
      {children}
    </RealtimePlanContext.Provider>
  );
};
