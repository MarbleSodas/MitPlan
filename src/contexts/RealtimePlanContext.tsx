import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import * as normalizedPlanService from '../services/normalizedPlanService';
import type {
  MitigationAssignments,
  Plan,
  PlanChange,
  PlanConnectionState,
  PlanOperation,
  PlanWorkspacePermissions,
  PlanTimelineLayout,
  TankPositions,
  UserPlanPreference,
} from '../types';

export const RealtimePlanDataContext = createContext<any>(null);
export const RealtimePlanActionsContext = createContext<any>(null);

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

  return useMemo(() => ({ ...data, ...actions }), [data, actions]);
};

const isNetworkFailure = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = error instanceof Error ? error.message : String(error || '');
  return /network|fetch|offline|connection|timeout|websocket/i.test(message);
};

const workspaceWaitTimeout = (milliseconds: number): Promise<void> =>
  new Promise((_, reject) => {
    globalThis.setTimeout(
      () => reject(new Error('Realtime channel connection timed out')),
      milliseconds
    );
  });

export const RealtimePlanProvider = ({ children, planId, readOnly = false }) => {
  const { user } = useAuth();

  const [realtimePlan, setRealtimePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionState, setConnectionState] =
    useState<PlanConnectionState>('loading');
  const [changes, setChanges] = useState<PlanChange[]>([]);
  const [preference, setPreference] = useState<UserPlanPreference | null>(null);
  const [permissions, setPermissions] = useState<PlanWorkspacePermissions>({
    canRead: true,
    canEdit: !readOnly,
    canAdmin: false,
  });

  const planRef = useRef<Plan | null>(null);
  const revisionRef = useRef(0);
  const bufferedChangesRef = useRef<Array<PlanChange & {
    afterData?: { plan: Plan; revision: number };
  }>>([]);
  const initializedRef = useRef(false);
  const reconnectingRef = useRef(false);

  const acceptWorkspace = useCallback((workspace) => {
    const revision = Number(workspace?.revision ?? workspace?.plan?.revision ?? 0);
    if (revision < revisionRef.current) return;

    const nextPlan = {
      ...workspace.plan,
      assignments: workspace.assignments || workspace.plan.assignments || {},
      revision,
    };
    revisionRef.current = revision;
    planRef.current = nextPlan;
    setRealtimePlan(nextPlan);
    setChanges(workspace.changes || []);
    setPreference(workspace.preference || null);
    setPermissions(workspace.permissions || {
      canRead: true,
      canEdit: !readOnly,
      canAdmin: false,
    });
    setError(null);
  }, [readOnly]);

  const refreshWorkspace = useCallback(async () => {
    if (!planId || !user?.uid) return null;
    const workspace = await normalizedPlanService.loadPlanWorkspace(
      planId,
      revisionRef.current || null
    );
    acceptWorkspace(workspace);
    return workspace;
  }, [acceptWorkspace, planId, user?.uid]);

  const replayOutbox = useCallback(async () => {
    if (!planId || !user?.uid || readOnly || reconnectingRef.current) return;
    reconnectingRef.current = true;

    try {
      const queued = await normalizedPlanService.listQueuedPlanOperations(planId);
      for (const item of queued) {
        const workspace = await normalizedPlanService.applyPlanOperation(
          planId,
          item.operation,
          revisionRef.current,
          item.operationId
        );
        acceptWorkspace(workspace);
        await normalizedPlanService.removeQueuedPlanOperation(item.operationId);
      }
      setConnectionState('saved');
    } finally {
      reconnectingRef.current = false;
    }
  }, [acceptWorkspace, planId, readOnly, user?.uid]);

  const reconcileAfterReconnect = useCallback(async () => {
    if (!initializedRef.current || reconnectingRef.current) return;
    setConnectionState('reconnecting');
    try {
      await refreshWorkspace();
      await replayOutbox();
    } catch (reconnectError) {
      if (isNetworkFailure(reconnectError)) {
        setConnectionState('offline-queued');
      } else {
        setConnectionState('error');
        setError(reconnectError instanceof Error
          ? reconnectError.message
          : 'Failed to reconnect to this plan');
      }
    }
  }, [refreshWorkspace, replayOutbox]);

  useEffect(() => {
    if (!planId) {
      setRealtimePlan(null);
      setLoading(false);
      setError('No plan selected');
      setConnectionState('error');
      return undefined;
    }

    if (!user?.uid) {
      setRealtimePlan(null);
      setLoading(false);
      setError('Sign in to open the collaborative planning workspace');
      setConnectionState('error');
      return undefined;
    }

    let active = true;
    initializedRef.current = false;
    bufferedChangesRef.current = [];
    revisionRef.current = 0;
    setLoading(true);
    setError(null);
    setConnectionState('connecting');

    const subscription = normalizedPlanService.subscribeToWorkspaceChanges(planId, {
      onChange: (change) => {
        if (!active) return;
        if (!initializedRef.current) {
          bufferedChangesRef.current.push(change);
          return;
        }

        if (change.revision <= revisionRef.current) return;
        if (change.revision !== revisionRef.current + 1 || !change.afterData) {
          void reconcileAfterReconnect();
          return;
        }
        acceptWorkspace(change.afterData);
        setConnectionState('saved');
      },
      onStatus: (status, statusError) => {
        if (!active) return;
        if (status === 'connecting') setConnectionState('connecting');
        if (status === 'connected') {
          if (initializedRef.current) void reconcileAfterReconnect();
        }
        if (status === 'disconnected') setConnectionState('reconnecting');
        if (status === 'error') {
          setConnectionState(
            typeof navigator !== 'undefined' && !navigator.onLine
              ? 'offline-queued'
              : 'reconnecting'
          );
          if (statusError && !isNetworkFailure(statusError)) {
            setError(statusError.message);
          }
        }
      },
    });

    void (async () => {
      try {
        // Subscribe before fetching so no committed revision can be missed
        // between the snapshot request and channel join.
        await Promise.race([subscription.ready, workspaceWaitTimeout(8_000)]);
        if (!active) return;

        const workspace = await normalizedPlanService.loadPlanWorkspace(planId);
        if (!active) return;
        acceptWorkspace(workspace);
        const restoredPreference = await normalizedPlanService.savePlanPreferences(planId, {});
        if (!active) return;
        setPreference(restoredPreference);

        const buffered = bufferedChangesRef.current
          .filter((change) => change.revision > revisionRef.current)
          .sort((left, right) => left.revision - right.revision);
        bufferedChangesRef.current = [];

        for (const change of buffered) {
          if (change.revision !== revisionRef.current + 1 || !change.afterData) {
            const freshWorkspace = await normalizedPlanService.loadPlanWorkspace(planId);
            if (!active) return;
            acceptWorkspace(freshWorkspace);
            break;
          }
          acceptWorkspace(change.afterData);
        }

        initializedRef.current = true;
        setIsInitialized(true);
        setConnectionState('saved');
        await replayOutbox();
      } catch (initializeError) {
        if (!active) return;
        const message = initializeError instanceof Error
          ? initializeError.message
          : 'Failed to load this plan';
        setError(
          /forbidden|permission/i.test(message)
            ? 'You do not have permission to access this plan'
            : message
        );
        setConnectionState(isNetworkFailure(initializeError) ? 'reconnecting' : 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();

    const handleOnline = () => void reconcileAfterReconnect();
    const handleOffline = () => setConnectionState('offline-queued');
    globalThis.addEventListener?.('online', handleOnline);
    globalThis.addEventListener?.('offline', handleOffline);

    return () => {
      active = false;
      initializedRef.current = false;
      setIsInitialized(false);
      void subscription.unsubscribe();
      globalThis.removeEventListener?.('online', handleOnline);
      globalThis.removeEventListener?.('offline', handleOffline);
    };
  }, [
    acceptWorkspace,
    planId,
    reconcileAfterReconnect,
    replayOutbox,
    user?.uid,
  ]);

  const commitOperation = useCallback(async (
    operation: PlanOperation,
    optimisticPatch: Partial<Plan> = {}
  ) => {
    if (!planId || !user?.uid || readOnly || !permissions.canEdit) return;
    if (
      connectionState === 'offline-queued' &&
      (operation.kind === 'upgrade_timeline' || operation.payload.routeId)
    ) {
      setError('Timeline and route changes require a connection.');
      return;
    }

    const operationId = normalizedPlanService.createOperationId();
    const queuedOperation = {
      operationId,
      planId,
      baseRevision: revisionRef.current,
      operation,
      queuedAt: Date.now(),
    };

    if (Object.keys(optimisticPatch).length > 0) {
      const optimisticPlan = planRef.current
        ? { ...planRef.current, ...optimisticPatch }
        : null;
      planRef.current = optimisticPlan;
      setRealtimePlan(optimisticPlan);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await normalizedPlanService.queuePlanOperation(queuedOperation);
      setConnectionState('offline-queued');
      return;
    }

    setConnectionState('saving');
    try {
      const workspace = await normalizedPlanService.applyPlanOperation(
        planId,
        operation,
        queuedOperation.baseRevision,
        operationId
      );
      acceptWorkspace(workspace);
      setConnectionState('saved');
    } catch (updateError) {
      if (isNetworkFailure(updateError)) {
        await normalizedPlanService.queuePlanOperation(queuedOperation);
        setConnectionState('offline-queued');
        return;
      }

      setConnectionState('error');
      setError(updateError instanceof Error ? updateError.message : 'Failed to update plan');
      try {
        await refreshWorkspace();
      } catch {
        // Keep the optimistic workspace visible while the connection recovers.
      }
      throw updateError;
    }
  }, [
    acceptWorkspace,
    connectionState,
    planId,
    permissions.canEdit,
    readOnly,
    refreshWorkspace,
    user?.uid,
  ]);

  const updateBossRealtime = useCallback((bossId: string) => {
    if (planRef.current?.bossId === bossId) return;
    void commitOperation(
      {
        kind: 'set_plan_meta',
        targetType: 'plan',
        payload: { metadata: { requestedBossId: bossId } },
      },
      { bossId }
    );
  }, [commitOperation]);

  const updateJobsRealtime = useCallback((selectedJobs) => {
    const optimizedSelectedJobs = Object.fromEntries(
      Object.entries(selectedJobs)
        .map(([roleKey, jobs]: [string, any]) => [
          roleKey,
          jobs.filter((job) => job.selected).map((job) => job.id),
        ])
        .filter(([, jobIds]: [string, any]) => jobIds.length > 0)
    );
    if (
      JSON.stringify(planRef.current?.selectedJobs || {}) ===
      JSON.stringify(optimizedSelectedJobs)
    ) return;

    void commitOperation(
      {
        kind: 'set_party',
        targetType: 'party',
        payload: { selectedJobs: optimizedSelectedJobs },
      },
      { selectedJobs: optimizedSelectedJobs }
    );
  }, [commitOperation]);

  const updateAssignmentsRealtime = useCallback(async (
    assignments: MitigationAssignments
  ) => {
    const changedEvents = normalizedPlanService.diffAssignmentEvents(
      planRef.current?.assignments || {},
      assignments
    );
    if (Object.keys(changedEvents).length === 0) return;
    for (const [eventKey, eventAssignments] of Object.entries(changedEvents)) {
      await commitOperation(
        {
          kind: 'set_event_assignments',
          targetType: 'assignment',
          targetKey: eventKey,
          payload: { assignmentEvents: { [eventKey]: eventAssignments } },
        },
        { assignments }
      );
    }
  }, [commitOperation]);

  const updateTankPositionsRealtime = useCallback((tankPositions: TankPositions) => {
    if (
      JSON.stringify(planRef.current?.tankPositions || {}) ===
      JSON.stringify(tankPositions)
    ) return;
    void commitOperation(
      {
        kind: 'set_party',
        targetType: 'party',
        payload: { tankPositions },
      },
      { tankPositions }
    );
  }, [commitOperation]);

  const updatePhaseOverridesRealtime = useCallback((phaseOverrides) => {
    if (
      JSON.stringify(planRef.current?.phaseOverrides || {}) ===
      JSON.stringify(phaseOverrides || {})
    ) return;
    void commitOperation(
      {
        kind: 'set_phase_overrides',
        targetType: 'timeline_overrides',
        payload: { phaseOverrides },
      },
      { phaseOverrides }
    );
  }, [commitOperation]);

  const updateTimelineLayoutRealtime = useCallback(async (
    timelineLayout: PlanTimelineLayout
  ) => {
    await commitOperation(
      {
        kind: 'set_timeline_layout',
        targetType: 'timeline_version',
        payload: {
          timelineLayout,
          phaseOverrides: {},
          sourceTimelineId: planRef.current?.sourceTimelineId,
          sourceTimelineName: planRef.current?.sourceTimelineName,
        },
      },
      {
        timelineLayout,
        bossId: timelineLayout?.bossId || null,
        bossTags: timelineLayout?.bossTags || [],
        bossMetadata: timelineLayout?.bossMetadata || null,
        phaseOverrides: {},
      }
    );
  }, [commitOperation]);

  const batchUpdateRealtime = useCallback((updates: Partial<Plan>) => {
    const healthSettings = {
      maxTankHP: updates.maxTankHP,
      partyMinHP: updates.partyMinHP,
      maxPartyHP: updates.maxPartyHP,
    };
    Object.keys(healthSettings).forEach((key) => {
      if (healthSettings[key] === undefined) delete healthSettings[key];
    });

    void commitOperation(
      {
        kind: 'patch_plan',
        targetType: 'plan',
        payload: {
          name: updates.name,
          description: updates.description,
          routeId: updates.routeId,
          timelineLayout: updates.timelineLayout,
          phaseOverrides: updates.phaseOverrides,
          healthSettings: Object.keys(healthSettings).length > 0
            ? healthSettings
            : undefined,
          metadata: {
            bossId: updates.bossId,
            bossTags: updates.bossTags,
            bossMetadata: updates.bossMetadata,
          },
        },
      },
      updates
    );
  }, [commitOperation]);

  const undoChange = useCallback(async (changeId: string) => {
    if (!planId || readOnly) return;
    setConnectionState('saving');
    try {
      const workspace = await normalizedPlanService.undoPlanChange(planId, changeId);
      acceptWorkspace(workspace);
      setConnectionState('saved');
    } catch (undoError) {
      setConnectionState('error');
      setError(undoError instanceof Error ? undoError.message : 'Unable to undo that change');
    }
  }, [acceptWorkspace, planId, readOnly]);

  const previewTimelineUpgrade = useCallback(async (targetVersionId: string) => {
    if (!planId) throw new Error('No plan is open');
    return normalizedPlanService.previewTimelineUpgrade(planId, targetVersionId);
  }, [planId]);

  const applyTimelineSelection = useCallback(async (
    targetVersionId: string,
    routeId: string
  ) => {
    const changingVersion = targetVersionId !== planRef.current?.timelineVersionId;
    await commitOperation(
      {
        kind: changingVersion ? 'upgrade_timeline' : 'set_route',
        targetType: 'timeline_version',
        targetKey: targetVersionId,
        payload: {
          timelineVersionId: targetVersionId,
          routeId,
          reviewApproved: true,
        },
      },
      {
        timelineVersionId: targetVersionId,
        routeId,
      }
    );
  }, [commitOperation]);

  const savePreferences = useCallback(async (
    preferences: Partial<UserPlanPreference>
  ) => {
    if (!planId || !user?.uid) return;
    const nextPreference = await normalizedPlanService.savePlanPreferences(planId, preferences);
    setPreference(nextPreference);
  }, [planId, user?.uid]);

  const recoverPlanData = useCallback(async () => {
    setLoading(true);
    try {
      await refreshWorkspace();
      setConnectionState('saved');
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspace]);

  const dataValue = useMemo(() => ({
    planId,
    realtimePlan,
    loading,
    isLoading: loading,
    error,
    isInitialized,
    isReadOnly: readOnly,
    connectionState,
    changes,
    preference,
    permissions,
    bossId: realtimePlan?.bossId,
    selectedJobs: realtimePlan?.selectedJobs || {},
    assignments: realtimePlan?.assignments || {},
    tankPositions: realtimePlan?.tankPositions || {},
    phaseOverrides: realtimePlan?.phaseOverrides || {},
    planName: realtimePlan?.name,
  }), [
    changes,
    connectionState,
    error,
    isInitialized,
    loading,
    planId,
    preference,
    permissions,
    readOnly,
    realtimePlan,
  ]);

  const actionsValue = useMemo(() => ({
    updateBossRealtime,
    updateJobsRealtime,
    updateAssignmentsRealtime,
    updateTankPositionsRealtime,
    updatePhaseOverridesRealtime,
    updateTimelineLayoutRealtime,
    batchUpdateRealtime,
    undoChange,
    previewTimelineUpgrade,
    applyTimelineSelection,
    savePreferences,
    recoverPlanData,
    loadPlanRealtime: recoverPlanData,
    updatePlanRealtime: batchUpdateRealtime,
    clearRealtimePlan: () => setRealtimePlan(null),
  }), [
    batchUpdateRealtime,
    recoverPlanData,
    applyTimelineSelection,
    savePreferences,
    previewTimelineUpgrade,
    undoChange,
    updateAssignmentsRealtime,
    updateBossRealtime,
    updateJobsRealtime,
    updatePhaseOverridesRealtime,
    updateTankPositionsRealtime,
    updateTimelineLayoutRealtime,
  ]);

  return (
    <RealtimePlanDataContext.Provider value={dataValue}>
      <RealtimePlanActionsContext.Provider value={actionsValue}>
        {children}
      </RealtimePlanActionsContext.Provider>
    </RealtimePlanDataContext.Provider>
  );
};
