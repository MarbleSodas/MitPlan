import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';
import * as planService from '../services/realtimePlanService';

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

  if (!data || !actions) {
    throw new Error('useRealtimePlan must be used within a RealtimePlanProvider');
  }

  return useMemo(() => ({
    ...data,
    ...actions
  }), [data, actions]);
};

export const RealtimePlanProvider = ({ children, planId, readOnly = false }) => {
  const { user } = useAuth();
  const { sessionId, debouncedUpdate, setChangeOrigin, isOwnChange } = useCollaboration();

  const [realtimePlan, setRealtimePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const isUpdatingRef = useRef(false);
  const changeOriginRef = useRef(null);
  const pendingChangesRef = useRef(new Set());
  const planListenerRef = useRef(null);
  const realtimePlanRef = useRef(realtimePlan);

  useEffect(() => {
    realtimePlanRef.current = realtimePlan;
  }, [realtimePlan]);

  useEffect(() => {
    if (!planId) {
      setRealtimePlan(null);
      setLoading(false);
      setError('No plan selected');
      return undefined;
    }

    setLoading(true);
    setError(null);

    const initializePlan = async () => {
      try {
        if (!readOnly && user?.uid) {
          try {
            await planService.ensurePlanStructure(planId);
          } catch (structureError) {
            if (!structureError.message?.includes('Permission denied')) {
              throw structureError;
            }
          }

          try {
            await planService.hydratePlanTimelineLayoutIfMissing(planId, user.uid, sessionId);
          } catch (hydrateError) {
            if (!hydrateError.message?.includes('Permission denied')) {
              throw hydrateError;
            }
          }
        }

        if (user?.uid) {
          try {
            const { trackPlanAccess } = await import('../services/planAccessService');
            await trackPlanAccess(planId, user.uid);
          } catch (accessError) {
            console.error('[RealtimePlanContext] Error tracking plan access:', accessError);
          }
        }
      } catch (initializeError) {
        console.warn('[RealtimePlanContext] Could not initialize plan:', initializeError);
        setError(initializeError.message);
      }
    };

    initializePlan();

    const unsubscribe = planService.subscribeToPlanWithOrigin(
      planId,
      (planData, changeOrigin, subscriptionError) => {
        if (subscriptionError) {
          if (
            subscriptionError.message?.includes('Permission denied') ||
            subscriptionError.message?.includes('permission_denied')
          ) {
            setError('You do not have permission to access this plan');
          } else {
            setError(subscriptionError.message);
          }
          setLoading(false);
          return;
        }

        if (planData) {
          if (!realtimePlanRef.current || !changeOrigin || !isOwnChange(changeOrigin)) {
            setRealtimePlan(planData);
          }
          setError(null);
        } else {
          setRealtimePlan(null);
        }

        setLoading(false);
        setIsInitialized(true);
      },
      readOnly ? null : sessionId
    );

    planListenerRef.current = unsubscribe;

    return () => {
      if (planListenerRef.current) {
        planListenerRef.current();
        planListenerRef.current = null;
      }
    };
  }, [planId, readOnly, sessionId, isOwnChange, user?.uid]);

  const trackChange = useCallback((changeType, changeId) => {
    const trackingId = `${changeType}-${changeId}-${sessionId}`;
    changeOriginRef.current = trackingId;
    pendingChangesRef.current.add(trackingId);

    setTimeout(() => {
      pendingChangesRef.current.delete(trackingId);
      if (changeOriginRef.current === trackingId) {
        changeOriginRef.current = null;
      }
    }, 2000);

    return trackingId;
  }, [sessionId]);

  const canMutatePlan = !!planId && !!user?.uid && !readOnly && !isUpdatingRef.current;

  const updateBossRealtime = useCallback((bossId) => {
    if (!canMutatePlan) return;
    if (realtimePlanRef.current?.bossId === bossId) return;

    trackChange('boss', bossId);
    setChangeOrigin(sessionId);

    const previousBossId = realtimePlanRef.current?.bossId;
    setRealtimePlan(prev => prev ? { ...prev, bossId } : null);

    debouncedUpdate(`boss-${planId}`, async () => {
      try {
        await planService.updatePlanBossRealtime(planId, bossId, user.uid, sessionId);
      } catch (updateError) {
        console.error('Error updating boss realtime:', updateError);
        setRealtimePlan(prev => prev ? { ...prev, bossId: previousBossId } : null);
      }
    }, 300);
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, trackChange, user?.uid]);

  const updateJobsRealtime = useCallback((selectedJobs) => {
    if (!canMutatePlan) return;

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
        await planService.updatePlanJobsRealtime(planId, optimizedSelectedJobs, user.uid, sessionId);
      } catch (updateError) {
        console.error('Error updating jobs realtime:', updateError);
        setRealtimePlan(prev => prev ? { ...prev, selectedJobs: previousJobs } : null);
        setError('Failed to update job selection. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
    }, 150);
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, trackChange, user?.uid]);

  const updateAssignmentsRealtime = useCallback((assignments) => {
    if (!canMutatePlan) {
      return Promise.resolve();
    }

    const currentAssignmentsString = JSON.stringify(realtimePlanRef.current?.assignments || {});
    const newAssignmentsString = JSON.stringify(assignments);
    if (currentAssignmentsString === newAssignmentsString) {
      return Promise.resolve();
    }

    trackChange('assignments', newAssignmentsString);
    setChangeOrigin(sessionId);

    const previousAssignments = realtimePlanRef.current?.assignments;
    setRealtimePlan(prev => prev ? { ...prev, assignments } : null);

    return new Promise((resolve, reject) => {
      debouncedUpdate(`assignments-${planId}`, async () => {
        try {
          await planService.updatePlanAssignmentsRealtime(planId, assignments, user.uid, sessionId);
          resolve(true);
        } catch (updateError) {
          console.error('Error updating assignments realtime:', updateError);
          setRealtimePlan(prev => prev ? { ...prev, assignments: previousAssignments } : null);
          setError('Failed to update mitigation assignments. Please try again.');
          setTimeout(() => setError(null), 5000);
          reject(updateError);
        }
      }, 300);
    });
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, trackChange, user?.uid]);

  const updateTankPositionsRealtime = useCallback((tankPositions) => {
    if (!canMutatePlan) return;

    const currentTankPositionsString = JSON.stringify(realtimePlanRef.current?.tankPositions || {});
    const newTankPositionsString = JSON.stringify(tankPositions);
    if (currentTankPositionsString === newTankPositionsString) return;

    trackChange('tankPositions', newTankPositionsString);
    setChangeOrigin(sessionId);

    const previousTankPositions = realtimePlanRef.current?.tankPositions;
    setRealtimePlan(prev => prev ? { ...prev, tankPositions } : null);

    debouncedUpdate(`tankPositions-${planId}`, async () => {
      try {
        await planService.updatePlanTankPositionsRealtime(planId, tankPositions, user.uid, sessionId);
      } catch (updateError) {
        console.error('Error updating tank positions realtime:', updateError);
        setRealtimePlan(prev => prev ? { ...prev, tankPositions: previousTankPositions } : null);
        setError('Failed to update tank positions. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
    }, 300);
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, trackChange, user?.uid]);

  const updatePhaseOverridesRealtime = useCallback((phaseOverrides) => {
    if (!canMutatePlan) return;

    const currentPhaseOverridesString = JSON.stringify(realtimePlanRef.current?.phaseOverrides || {});
    const nextPhaseOverridesString = JSON.stringify(phaseOverrides || {});
    if (currentPhaseOverridesString === nextPhaseOverridesString) return;

    trackChange('phaseOverrides', nextPhaseOverridesString);
    setChangeOrigin(sessionId);

    const previousPhaseOverrides = realtimePlanRef.current?.phaseOverrides || {};
    setRealtimePlan((prev) => prev ? { ...prev, phaseOverrides } : null);

    debouncedUpdate(`phaseOverrides-${planId}`, async () => {
      try {
        await planService.batchUpdatePlanRealtime(planId, { phaseOverrides }, user.uid, sessionId);
      } catch (updateError) {
        console.error('Error updating phase overrides realtime:', updateError);
        setRealtimePlan((prev) => prev ? { ...prev, phaseOverrides: previousPhaseOverrides } : null);
        setError('Failed to update phase timings. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
    }, 250);
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, trackChange, user?.uid]);

  const updateTimelineLayoutRealtime = useCallback((timelineLayout) => {
    if (!canMutatePlan) {
      return Promise.resolve();
    }

    const currentTimelineLayoutString = JSON.stringify(realtimePlanRef.current?.timelineLayout || null);
    const nextTimelineLayoutString = JSON.stringify(timelineLayout || null);
    const currentPhaseOverridesString = JSON.stringify(realtimePlanRef.current?.phaseOverrides || {});
    if (currentTimelineLayoutString === nextTimelineLayoutString && currentPhaseOverridesString === '{}') {
      return Promise.resolve();
    }

    trackChange('timelineLayout', nextTimelineLayoutString);
    setChangeOrigin(sessionId);

    const previousTimelineLayout = realtimePlanRef.current?.timelineLayout || null;
    const previousBossId = realtimePlanRef.current?.bossId || null;
    const previousBossTags = realtimePlanRef.current?.bossTags || [];
    const previousBossMetadata = realtimePlanRef.current?.bossMetadata || null;
    const previousPhaseOverrides = realtimePlanRef.current?.phaseOverrides || {};

    setRealtimePlan((prev) => prev
      ? {
          ...prev,
          timelineLayout,
          bossId: timelineLayout?.bossId || null,
          bossTags: timelineLayout?.bossTags || (timelineLayout?.bossId ? [timelineLayout.bossId] : []),
          bossMetadata: timelineLayout?.bossMetadata || null,
          phaseOverrides: {},
        }
      : null);

    return new Promise((resolve, reject) => {
      debouncedUpdate(`timelineLayout-${planId}`, async () => {
        try {
          await planService.updatePlanTimelineLayoutRealtime(planId, timelineLayout, user.uid, sessionId);
          resolve(true);
        } catch (updateError) {
          console.error('Error updating plan timeline layout realtime:', updateError);
          setRealtimePlan((prev) => prev
            ? {
                ...prev,
                timelineLayout: previousTimelineLayout,
                bossId: previousBossId,
                bossTags: previousBossTags,
                bossMetadata: previousBossMetadata,
                phaseOverrides: previousPhaseOverrides,
              }
            : null);
          setError('Failed to update the plan timeline. Please try again.');
          setTimeout(() => setError(null), 5000);
          reject(updateError);
        }
      }, 250);
    });
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, trackChange, user?.uid]);

  const batchUpdateRealtime = useCallback((updates) => {
    if (!canMutatePlan) return;

    setChangeOrigin(sessionId);

    const previousState = {};
    const currentPlan = realtimePlanRef.current;
    Object.keys(updates).forEach((key) => {
      if (currentPlan && currentPlan[key] !== undefined) {
        previousState[key] = currentPlan[key];
      }
    });

    setRealtimePlan(prev => prev ? { ...prev, ...updates } : null);

    debouncedUpdate(`batch-${planId}`, async () => {
      try {
        await planService.batchUpdatePlanRealtime(planId, updates, user.uid, sessionId);
      } catch (updateError) {
        console.error('Error batch updating plan realtime:', updateError);
        setRealtimePlan(prev => prev ? { ...prev, ...previousState } : null);
        setError('Failed to update settings. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
    }, 500);
  }, [canMutatePlan, debouncedUpdate, planId, sessionId, setChangeOrigin, user?.uid]);

  const recoverPlanData = useCallback(async () => {
    if (!planId) return;

    try {
      setLoading(true);
      setError(null);

      const planData = user?.uid
        ? await planService.getPlanWithAccessTracking(planId, user.uid)
        : await planService.getPublicPlan(planId);

      setRealtimePlan(planData);
    } catch (recoverError) {
      console.error('[RealtimePlanContext] Failed to recover plan data:', recoverError);
      setError('Failed to recover plan data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [planId, user?.uid]);

  const dataValue = useMemo(() => ({
    planId,
    realtimePlan,
    loading,
    error,
    isInitialized,
    isReadOnly: readOnly,
    bossId: realtimePlan?.bossId,
    selectedJobs: realtimePlan?.selectedJobs || {},
    assignments: realtimePlan?.assignments || {},
    tankPositions: realtimePlan?.tankPositions || {},
    phaseOverrides: realtimePlan?.phaseOverrides || {},
    planName: realtimePlan?.name
  }), [planId, realtimePlan, loading, error, isInitialized, readOnly]);

  const actionsValue = useMemo(() => ({
    updateBossRealtime,
    updateJobsRealtime,
    updateAssignmentsRealtime,
    updateTankPositionsRealtime,
    updatePhaseOverridesRealtime,
    updateTimelineLayoutRealtime,
    batchUpdateRealtime,
    recoverPlanData
  }), [
    updateBossRealtime,
    updateJobsRealtime,
    updateAssignmentsRealtime,
    updateTankPositionsRealtime,
    updatePhaseOverridesRealtime,
    updateTimelineLayoutRealtime,
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
