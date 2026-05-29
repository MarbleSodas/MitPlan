/**
 * Plan Real-time Service
 * 
 * Real-time subscriptions and updates for collaborative editing.
 */

import { ref, onValue, off, update, serverTimestamp, query, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { PLANS_PATH } from './plans.shared';
import { normalizePlanRecord, buildPlanUpdates, getShareSettings, buildShareViewPayload } from './plans.shared';
import { getPlan, createPlan } from './plans.crud';
import { getActiveUsersPath, getJobAssignmentPath } from '../collaborationPaths';
import { isPermissionDeniedError } from '../firebaseErrorUtils';
import { getTimeline } from '../timelineService';
import { createPlanTimelineLayoutFromLegacyPlan, getPlanTimelineMirrorFields } from '../../utils/timeline/planTimelineLayoutUtils';

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to real-time updates for a specific plan
 */
export const subscribeToPlan = (
  planId: string,
  callback: (plan: NormalizedPlanRecord | null, error?: Error) => void
): (() => void) => {
  const planRef = ref(database, `${PLANS_PATH}/${planId}`);

  const unsubscribe = onValue(planRef, (snapshot) => {
    if (snapshot.exists()) {
      const planData = snapshot.val();
      const completePlan = normalizePlanRecord(planId, planData);
      console.log('[subscribeToPlan] Received plan update:', {
        id: planId,
        name: completePlan.name,
        bossId: completePlan.bossId,
        selectedJobsKeys: Object.keys(completePlan.selectedJobs || {}),
        assignmentsKeys: Object.keys(completePlan.assignments || {}),
        lastChangeOrigin: completePlan.lastChangeOrigin,
      });

      callback(completePlan);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to plan changes:', error);
    callback(null, error);
  });

  return () => off(planRef, 'value', unsubscribe);
};

const getRecentPlanTimestamp = (plan: NormalizedPlanRecord) =>
  plan.updatedAt ||
  plan.lastAccessedAt ||
  plan.createdAt ||
  0;

const sortUserPlansByRecent = (plans: NormalizedPlanRecord[]): NormalizedPlanRecord[] => {
  plans.sort((a, b) => getRecentPlanTimestamp(b) - getRecentPlanTimestamp(a));
  return plans;
};

const mergeOwnedPlanCollections = (...planGroups: NormalizedPlanRecord[][]): NormalizedPlanRecord[] => {
  const mergedPlans = new Map<string, NormalizedPlanRecord>();

  planGroups.flat().forEach((plan) => {
    if (!plan?.id || mergedPlans.has(plan.id)) {
      return;
    }

    mergedPlans.set(plan.id, plan);
  });

  return sortUserPlansByRecent(Array.from(mergedPlans.values()));
};

/**
 * Subscribe to real-time updates for all user plans
 */
export const subscribeToUserPlans = (
  userId: string,
  callback: (plans: NormalizedPlanRecord[], error?: Error) => void
): (() => void) => {
  const plansRef = ref(database, PLANS_PATH);
  const ownerPlansQuery = query(plansRef, orderByChild('ownerId'), equalTo(userId));
  const legacyPlansQuery = query(plansRef, orderByChild('userId'), equalTo(userId));
  const subscriptionPlans: {
    ownerId: Map<string, NormalizedPlanRecord>;
    userId: Map<string, NormalizedPlanRecord>;
  } = {
    ownerId: new Map<string, NormalizedPlanRecord>(),
    userId: new Map<string, NormalizedPlanRecord>(),
  };
  const initialLoads = {
    ownerId: false,
    userId: false,
  };
  let hasErrored = false;
  let isClosed = false;

  const emitMergedPlans = () => {
    if (isClosed || hasErrored || !initialLoads.ownerId || !initialLoads.userId) {
      return;
    }

    const mergedPlans = mergeOwnedPlanCollections(
      Array.from(subscriptionPlans.ownerId.values()),
      Array.from(subscriptionPlans.userId.values())
    );
    callback(mergedPlans as NormalizedPlanRecord[]);
  };

  const buildSnapshotHandler = (fieldName: 'ownerId' | 'userId') => (snapshot: { exists: () => boolean; forEach: (cb: (child: { key: string; val: () => Record<string, unknown> }) => void) => void }) => {
    if (isClosed || hasErrored) {
      return;
    }

    const nextPlans = subscriptionPlans[fieldName];
    nextPlans.clear();

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        nextPlans.set(childSnapshot.key, normalizePlanRecord(childSnapshot.key, childSnapshot.val()));
      });
    }

    initialLoads[fieldName] = true;
    emitMergedPlans();
  };

  const handleSubscriptionError = (error: Error) => {
    if (isClosed || hasErrored) {
      return;
    }

    hasErrored = true;
    console.error('Error listening to user plans changes:', error);
    callback([], error);
  };

  const ownerUnsubscribe = onValue(
    ownerPlansQuery,
    buildSnapshotHandler('ownerId'),
    handleSubscriptionError
  );
  const legacyUnsubscribe = onValue(
    legacyPlansQuery,
    buildSnapshotHandler('userId'),
    handleSubscriptionError
  );

  return () => {
    isClosed = true;

    if (typeof ownerUnsubscribe === 'function') {
      ownerUnsubscribe();
    } else {
      off(ownerPlansQuery);
    }

    if (typeof legacyUnsubscribe === 'function') {
      legacyUnsubscribe();
    } else {
      off(legacyPlansQuery);
    }
  };
};

// ============================================================================
// Real-time Updates
// ============================================================================

/**
 * Update specific fields of a plan with change origin tracking
 */
export const updatePlanFieldWithOrigin = async (
  planId: string,
  fieldPath: string,
  value: unknown,
  userId?: string | null,
  sessionId?: string | null
): Promise<boolean> => {
  try {
    console.log('[updatePlanFieldWithOrigin] Updating field:', {
      planId,
      fieldPath,
      valueType: typeof value,
      valueKeys: typeof value === 'object' && value !== null ? Object.keys(value as object) : 'N/A',
      userId,
      sessionId,
    });

    return await updatePlanFieldsWithOrigin(planId, { [fieldPath]: value }, userId, sessionId);
  } catch (error) {
    console.error('Error updating plan field with origin:', error);
    throw new Error('Failed to update plan field');
  }
};

/**
 * Update multiple plan fields atomically with change origin
 */
export const updatePlanFieldsWithOrigin = async (
  planId: string,
  fields: Record<string, unknown>,
  userId?: string | null,
  sessionId?: string | null
): Promise<boolean> => {
  try {
    const updates = buildPlanUpdates(planId, fields, userId || null, sessionId || null);
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error updating plan fields with origin:', error);
    throw new Error('Failed to update plan fields');
  }
};

/**
 * Subscribe to plan changes with change origin filtering (for collaboration)
 */
export const subscribeToPlanWithOrigin = (
  planId: string,
  callback: (plan: NormalizedPlanRecord | null, changeOrigin: string | null, error?: Error) => void,
  sessionId?: string | null
): (() => void) => {
  const planRef = ref(database, `${PLANS_PATH}/${planId}`);
  let isFirstLoad = true;

  const unsubscribe = onValue(planRef, (snapshot) => {
    if (snapshot.exists()) {
      const planData = snapshot.val();
      const changeOrigin = planData.lastChangeOrigin;
      const completePlan = normalizePlanRecord(planId, planData);

      if (isFirstLoad || !sessionId || changeOrigin !== sessionId) {
        console.log('[subscribeToPlanWithOrigin] Loading plan data:', {
          planId,
          isFirstLoad,
          changeOrigin,
          sessionId,
          name: completePlan.name,
          bossId: completePlan.bossId,
          selectedJobsKeys: Object.keys(completePlan.selectedJobs || {}),
          assignmentsKeys: Object.keys(completePlan.assignments || {}),
        });

        callback(completePlan, changeOrigin);
      }

      isFirstLoad = false;
    } else {
      callback(null, null);
    }
  }, (error) => {
    console.error('Error listening to plan changes:', error);
    callback(null, null, error);
  });

  return () => off(planRef, 'value', unsubscribe);
};

// ============================================================================
// Specific Field Updates
// ============================================================================

/**
 * Update tank positions with real-time sync
 */
export const updateTankPositionsRealtime = async (
  planId: string,
  tankPositions: { mainTank: string | null; offTank: string | null },
  userId?: string | null,
  sessionId?: string | null
): Promise<boolean> => {
  try {
    await updatePlanFieldsWithOrigin(planId, { tankPositions }, userId, sessionId);
    console.log('[updateTankPositionsRealtime] Successfully updated tank positions');
    return true;
  } catch (error) {
    console.error('Error updating tank positions:', error);
    throw new Error('Failed to update tank positions');
  }
};

/**
 * Update plan assignments with conflict resolution
 */
export const updatePlanAssignments = async (
  planId: string,
  assignments: Record<string, unknown>,
  userId?: string | null
): Promise<boolean> => {
  try {
    await updatePlanFieldsWithOrigin(planId, { assignments }, userId);
    return true;
  } catch (error) {
    console.error('Error updating plan assignments:', error);
    throw new Error('Failed to update plan assignments');
  }
};

/**
 * Batch update multiple plan fields for better performance
 */
export const batchUpdatePlanRealtime = async (
  planId: string,
  updates: Record<string, unknown>,
  userId?: string | null,
  sessionId?: string | null
): Promise<boolean> => {
  try {
    return await updatePlanFieldsWithOrigin(planId, updates, userId, sessionId);
  } catch (error) {
    console.error('Error batch updating plan realtime:', error);
    throw new Error('Failed to batch update plan');
  }
};

/**
 * Hydrate plan with timeline layout if missing
 */
export const hydratePlanTimelineLayoutIfMissing = async (
  planId: string,
  userId?: string | null,
  sessionId?: string | null
): Promise<unknown> => {
  try {
    const plan = await getPlan(planId);

    if ((plan as { timelineLayout?: unknown }).timelineLayout || !(plan as { sourceTimelineId?: string }).sourceTimelineId) {
      return (plan as { timelineLayout?: unknown }).timelineLayout || null;
    }

    const sourceTimeline = await getTimeline((plan as { sourceTimelineId: string }).sourceTimelineId);
    const timelineLayout = createPlanTimelineLayoutFromLegacyPlan(
      sourceTimeline,
      (plan as { healthSettings?: Record<string, unknown> }).healthSettings || {}
    );
    const updateFields = getPlanTimelineMirrorFields(timelineLayout);

    await updatePlanFieldsWithOrigin(planId, updateFields, userId, sessionId);
    return timelineLayout;
  } catch (error) {
    console.error('[hydratePlanTimelineLayoutIfMissing] Failed to hydrate plan timeline layout:', error);
    throw new Error('Failed to hydrate plan timeline layout');
  }
};

/**
 * Update plan timeline layout with realtime sync
 */
export const updatePlanTimelineLayoutRealtime = async (
  planId: string,
  timelineLayout: unknown,
  userId?: string | null,
  sessionId?: string | null
): Promise<boolean> => {
  try {
    const normalizedTimelineLayout = normalizePlanTimelineLayout(timelineLayout as Parameters<typeof normalizePlanTimelineLayout>[0]);
    if (!normalizedTimelineLayout) {
      throw new Error('A valid timeline layout is required');
    }

    const result = await updatePlanFieldsWithOrigin(
      planId,
      {
        ...getPlanTimelineMirrorFields(normalizedTimelineLayout),
        phaseOverrides: {},
      },
      userId,
      sessionId
    );
    console.log('[updatePlanTimelineLayoutRealtime] Update successful');
    return result;
  } catch (error) {
    console.error('Error updating plan timeline layout realtime:', error);
    throw new Error('Failed to update plan timeline layout');
  }
};

// Import normalization function
import { normalizePlanTimelineLayout } from '../../utils/timeline/planTimelineLayoutUtils';
import type { NormalizedPlanRecord } from './plans.shared';

// Re-export utility functions that other modules might need
export { getShareableEditLink, getShareableViewLink } from './plans.sharing';
