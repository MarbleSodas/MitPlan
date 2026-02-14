import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';
import * as planService from '../services/realtimePlanService';
import unifiedPlanService from '../services/unifiedPlanService';
import localStoragePlanService from '../services/localStoragePlanService';

export const RealtimePlanDataContext = createContext(null);
export const RealtimePlanActionsContext = createContext(null);

export const useRealtimePlanData = () => {
  const context = useContext(RealtimePlanDataContext);
  if (!context) {
    throw new Error('useRealtimePlanData must be used within a RealtimePlanProvider');
  }
  return context;
};

export const useRealtimePlanActions = () => {
  const context = useContext(RealtimePlanActionsContext);
  if (!context) {
    throw new Error('useRealtimePlanActions must be used within a RealtimePlanProvider');
  }
  return context;
};

export const useRealtimePlan = () => {
  const data = useContext(RealtimePlanDataContext);
  const actions = useContext(RealtimePlanActionsContext);
  
  // Legacy support: check if we are in a provider that supplies both
  // If we are in a legacy provider (if I hadn't changed it), this would fail.
  // But I am changing the provider.
  
  if (!data || !actions) {
     throw new Error('useRealtimePlan must be used within a RealtimePlanProvider');
  }

  // Combine them for backward compatibility
  return useMemo(() => ({
    ...data,
    ...actions
  }), [data, actions]);
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
  const realtimePlanRef = useRef(realtimePlan);

  // Keep ref in sync
  useEffect(() => {
    realtimePlanRef.current = realtimePlan;
  }, [realtimePlan]);

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

  const updateBossRealtime = useCallback((bossId) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    if (realtimePlanRef.current?.bossId === bossId) return;

    trackChange('boss', bossId);
    setChangeOrigin(sessionId);

    setRealtimePlan(prev => prev ? { ...prev, bossId } : null);
    
    const previousBossId = realtimePlanRef.current?.bossId;

    debouncedUpdate(`boss-${planId}`, async () => {
      try {
        await planService.updatePlanBossRealtime(planId, bossId, user.uid, sessionId);
      } catch (error) {
        console.error('Error updating boss realtime:', error);
        setRealtimePlan(prev => prev ? { ...prev, bossId: previousBossId } : null);
      }
    }, 300);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange]);

  const updateJobsRealtime = useCallback((selectedJobs) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    const optimizedSelectedJobs = {};
    Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
      const selectedJobIds = jobs
        .filter(job => job.selected)
        .map(job => job.id);

      if (selectedJobIds.length > 0) {
        optimizedSelectedJobs[roleKey] = selectedJobIds;
      }
    });

    const currentJobsString = JSON.stringify(realtimePlanRef.current?.selectedJobs || {});
    const newJobsString = JSON.stringify(optimizedSelectedJobs);
    if (currentJobsString === newJobsString) return;

    trackChange('jobs', newJobsString);
    setChangeOrigin(sessionId);

    const previousJobs = realtimePlanRef.current?.selectedJobs;

    setRealtimePlan(prev => prev ? { ...prev, selectedJobs: optimizedSelectedJobs } : null);

    debouncedUpdate(`jobs-${planId}`, async () => {
      try {
        if (isLocalPlan) {
          await localStoragePlanService.updatePlan(planId, { selectedJobs: optimizedSelectedJobs });
        } else {
          await planService.updatePlanJobsRealtime(planId, optimizedSelectedJobs, user?.uid, sessionId);
        }
        console.log('[RealtimePlanContext] Jobs updated successfully');
      } catch (error) {
        console.error('Error updating jobs realtime:', error);
        setRealtimePlan(prev => prev ? { ...prev, selectedJobs: previousJobs } : null);
        setError('Failed to update job selection. Please try again.');

        setTimeout(() => setError(null), 5000);
      }
    }, 150);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, isLocalPlan]);

  const updateAssignmentsRealtime = useCallback((assignments) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return Promise.resolve();

    const currentAssignmentsString = JSON.stringify(realtimePlanRef.current?.assignments || {});
    const newAssignmentsString = JSON.stringify(assignments);
    if (currentAssignmentsString === newAssignmentsString) return Promise.resolve();

    trackChange('assignments', newAssignmentsString);
    setChangeOrigin(sessionId);

    const previousAssignments = realtimePlanRef.current?.assignments;

    setRealtimePlan(prev => prev ? { ...prev, assignments } : null);

    const updatePromise = new Promise((resolve, reject) => {
      const updateKey = `assignments-${planId}`;

      debouncedUpdate(updateKey, async () => {
        try {
          if (isLocalPlan) {
            await localStoragePlanService.updatePlan(planId, { assignments });
          } else {
            await planService.updatePlanAssignmentsRealtime(planId, assignments, user?.uid, sessionId);
          }
          console.log('[RealtimePlanContext] Assignments updated successfully');
          resolve(true);
        } catch (error) {
          console.error('Error updating assignments realtime:', error);
          setRealtimePlan(prev => prev ? { ...prev, assignments: previousAssignments } : null);
          setError('Failed to update mitigation assignments. Please try again.');

          setTimeout(() => setError(null), 5000);
          reject(error);
        }
      }, 300);
    });

    return updatePromise;
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, isLocalPlan]);

  const updateTankPositionsRealtime = useCallback((tankPositions) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    const currentTankPositionsString = JSON.stringify(realtimePlanRef.current?.tankPositions || {});
    const newTankPositionsString = JSON.stringify(tankPositions);
    if (currentTankPositionsString === newTankPositionsString) return;

    trackChange('tankPositions', newTankPositionsString);
    setChangeOrigin(sessionId);

    const previousTankPositions = realtimePlanRef.current?.tankPositions;

    setRealtimePlan(prev => prev ? { ...prev, tankPositions } : null);

    debouncedUpdate(`tankPositions-${planId}`, async () => {
      try {
        if (isLocalPlan) {
          await localStoragePlanService.updatePlan(planId, { tankPositions });
        } else {
          await planService.updatePlanTankPositionsRealtime(planId, tankPositions, user?.uid, sessionId);
        }
        console.log('[RealtimePlanContext] Tank positions updated successfully');
      } catch (error) {
        console.error('Error updating tank positions realtime:', error);
        setRealtimePlan(prev => prev ? { ...prev, tankPositions: previousTankPositions } : null);
        setError('Failed to update tank positions. Please try again.');

        setTimeout(() => setError(null), 5000);
      }
    }, 300);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, trackChange, isLocalPlan]);

  // Batch update function for multiple fields
  const batchUpdateRealtime = useCallback((updates) => {
    if (!planId || (!user && !isAnonymousMode && !isLocalPlan) || isUpdatingRef.current) return;

    setChangeOrigin(sessionId);

    const previousState = {};
    const currentPlan = realtimePlanRef.current;
    Object.keys(updates).forEach(key => {
      if (currentPlan && currentPlan[key] !== undefined) {
        previousState[key] = currentPlan[key];
      }
    });

    setRealtimePlan(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });

    debouncedUpdate(`batch-${planId}`, async () => {
      try {
        if (isLocalPlan) {
          await localStoragePlanService.updatePlan(planId, updates);
        } else {
          await planService.batchUpdatePlanRealtime(planId, updates, user?.uid, sessionId);
        }
        console.log('[RealtimePlanContext] Batch update successful');
      } catch (error) {
        console.error('Error batch updating plan realtime:', error);
        setRealtimePlan(prev => {
          if (!prev) return null;
          return { ...prev, ...previousState };
        });
        setError('Failed to update settings. Please try again.');

        setTimeout(() => setError(null), 5000);
      }
    }, 500);
  }, [planId, user, sessionId, debouncedUpdate, setChangeOrigin, isLocalPlan, isAnonymousMode]);


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

  const dataValue = useMemo(() => ({
    planId,
    realtimePlan,
    loading,
    error,
    isInitialized,
    bossId: realtimePlan?.bossId,
    selectedJobs: realtimePlan?.selectedJobs || {},
    assignments: realtimePlan?.assignments || {},
    tankPositions: realtimePlan?.tankPositions || {},
    planName: realtimePlan?.name
  }), [planId, realtimePlan, loading, error, isInitialized]);

  const actionsValue = useMemo(() => ({
    updateBossRealtime,
    updateJobsRealtime,
    updateAssignmentsRealtime,
    updateTankPositionsRealtime,
    batchUpdateRealtime,
    recoverPlanData
  }), [
    updateBossRealtime,
    updateJobsRealtime,
    updateAssignmentsRealtime,
    updateTankPositionsRealtime,
    batchUpdateRealtime,
    recoverPlanData
  ]);

  return (
    <RealtimePlanDataContext.Provider value={dataValue}>
      <RealtimePlanActionsContext.Provider value={actionsValue}>
        {children}
      </RealtimePlanActionsContext.Provider>
    </RealtimePlanDataContext.Provider>
  );
};

