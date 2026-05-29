/**
 * Plan Sharing Service
 * 
 * Sharing, view tokens, and public access management.
 */

import { ref, get, update, set, serverTimestamp, onValue, off } from 'firebase/database';
import { database } from '../../config/firebase';
import { isPermissionDeniedError } from '../firebaseErrorUtils';
import {
  PLANS_PATH,
  PLAN_SHARE_VIEWS_PATH,
  getShareSettings,
  buildShareViewPayload,
  buildViewOnlyPlanRecord,
  createRandomToken,
  type NormalizedPlanRecord,
} from './plans.shared';
import { getPlan, createPlan } from './plans.crud';

// ============================================================================
// Helper Functions
// ============================================================================

const assertCanAdminExistingPlan = (plan: NormalizedPlanRecord, userId: string | null) => {
  if (!userId) {
    throw new Error('User ID required');
  }
  
  // Check ownership
  const ownerId = plan.ownerId || (plan as unknown as { userId?: string }).userId;
  if (ownerId !== userId) {
    throw new Error('Permission denied: Only the plan owner can manage sharing settings');
  }
};

const capturePlanShareViewSnapshot = async (
  planId: string,
  planData: Record<string, unknown> = {},
  overrides: {
    snapshotCreatedAt?: number;
    sourcePlanUpdatedAt?: number;
    viewEnabled?: boolean;
    viewToken?: string;
  } = {}
) => {
  const shareSettings = getShareSettings(planData);
  const viewToken = overrides.viewToken || shareSettings.viewToken;

  if (!viewToken) {
    return null;
  }

  const shareViewRef = ref(database, `${PLAN_SHARE_VIEWS_PATH}/${viewToken}`);
  const payload = buildShareViewPayload(planId, planData, {
    ...overrides,
    viewEnabled: overrides.viewEnabled ?? shareSettings.viewEnabled,
    viewToken,
  });

  await set(shareViewRef, payload);

  return {
    viewToken,
    ...payload,
  };
};

// ============================================================================
// URL Utilities
// ============================================================================

const getBaseUrl = (): string => {
  return typeof window !== 'undefined' ? window.location.origin : '';
};

/**
 * Get shareable edit link for a plan
 */
export const getShareableEditLink = (planId: string): string => {
  return `${getBaseUrl()}/plan/shared/${planId}`;
};

/**
 * Get shareable view link for a plan
 */
export const getShareableViewLink = (viewToken: string): string => {
  return `${getBaseUrl()}/plan/view/${viewToken}`;
};

// ============================================================================
// Sharing Operations
// ============================================================================

/**
 * Enable public share view for a plan
 */
export const enablePlanShareView = async (planId: string, userId?: string): Promise<{
  viewToken: string;
  editUrl: string;
  viewUrl: string;
}> => {
  try {
    const plan = await getPlan(planId);
    assertCanAdminExistingPlan(plan as unknown as NormalizedPlanRecord, userId || null);

    const existingShareSettings = getShareSettings(plan as unknown as Record<string, unknown>);
    const viewToken = existingShareSettings.viewToken || createRandomToken();
    const snapshotCreatedAt = Date.now();

    await update(ref(database), {
      [`${PLANS_PATH}/${planId}/shareSettings`]: {
        viewToken,
        viewEnabled: true,
        viewUpdatedAt: snapshotCreatedAt,
      },
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp(),
      [`${PLANS_PATH}/${planId}/lastModifiedBy`]: userId,
    });

    await capturePlanShareViewSnapshot(planId, plan as unknown as Record<string, unknown>, {
      viewToken,
      viewEnabled: true,
      snapshotCreatedAt,
      sourcePlanUpdatedAt: (plan as { updatedAt?: number }).updatedAt || snapshotCreatedAt,
    });

    return {
      viewToken,
      editUrl: getShareableEditLink(planId),
      viewUrl: getShareableViewLink(viewToken),
    };
  } catch (error) {
    console.error('Error enabling plan share view:', error);
    throw new Error('Failed to enable plan sharing');
  }
};

/**
 * Revoke public share view for a plan
 */
export const revokePlanShareView = async (planId: string, userId?: string): Promise<boolean> => {
  try {
    const plan = await getPlan(planId);
    assertCanAdminExistingPlan(plan as unknown as NormalizedPlanRecord, userId || null);

    const shareSettings = getShareSettings(plan as unknown as Record<string, unknown>);
    if (!shareSettings.viewToken) {
      return true;
    }

    const now = Date.now();
    await update(ref(database), {
      [`${PLANS_PATH}/${planId}/shareSettings`]: {
        viewToken: shareSettings.viewToken,
        viewEnabled: false,
        viewUpdatedAt: now,
      },
      [`${PLAN_SHARE_VIEWS_PATH}/${shareSettings.viewToken}/viewEnabled`]: false,
      [`${PLAN_SHARE_VIEWS_PATH}/${shareSettings.viewToken}/revokedAt`]: now,
      [`${PLAN_SHARE_VIEWS_PATH}/${shareSettings.viewToken}/updatedAt`]: now,
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp(),
      [`${PLANS_PATH}/${planId}/lastModifiedBy`]: userId,
    });

    return true;
  } catch (error) {
    console.error('Error revoking plan share view:', error);
    throw new Error('Failed to revoke the public view link');
  }
};

/**
 * Rotate view token for a plan (regenerate the view link)
 */
export const rotatePlanShareViewToken = async (planId: string, userId?: string): Promise<{
  viewToken: string;
  editUrl: string;
  viewUrl: string;
}> => {
  try {
    const plan = await getPlan(planId);
    assertCanAdminExistingPlan(plan as unknown as NormalizedPlanRecord, userId || null);

    const previousShareSettings = getShareSettings(plan as unknown as Record<string, unknown>);
    const previousToken = previousShareSettings.viewToken;
    const nextToken = createRandomToken();
    const snapshotCreatedAt = Date.now();

    const updates: Record<string, unknown> = {
      [`${PLANS_PATH}/${planId}/shareSettings`]: {
        viewToken: nextToken,
        viewEnabled: true,
        viewUpdatedAt: snapshotCreatedAt,
      },
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp(),
      [`${PLANS_PATH}/${planId}/lastModifiedBy`]: userId,
    };

    if (previousToken) {
      updates[`${PLAN_SHARE_VIEWS_PATH}/${previousToken}/viewEnabled`] = false;
      updates[`${PLAN_SHARE_VIEWS_PATH}/${previousToken}/revokedAt`] = snapshotCreatedAt;
      updates[`${PLAN_SHARE_VIEWS_PATH}/${previousToken}/updatedAt`] = snapshotCreatedAt;
    }

    await update(ref(database), updates);

    await capturePlanShareViewSnapshot(planId, plan as unknown as Record<string, unknown>, {
      viewToken: nextToken,
      viewEnabled: true,
      snapshotCreatedAt,
      sourcePlanUpdatedAt: (plan as { updatedAt?: number }).updatedAt || snapshotCreatedAt,
    });

    return {
      viewToken: nextToken,
      editUrl: getShareableEditLink(planId),
      viewUrl: getShareableViewLink(nextToken),
    };
  } catch (error) {
    console.error('Error rotating plan share view token:', error);
    throw new Error('Failed to rotate the public view link');
  }
};

/**
 * Get share view data by view token
 */
export const getPlanShareView = async (viewToken: string): Promise<NormalizedPlanRecord> => {
  try {
    const shareViewRef = ref(database, `${PLAN_SHARE_VIEWS_PATH}/${viewToken}`);
    const snapshot = await get(shareViewRef);

    if (!snapshot.exists()) {
      throw new Error('Shared plan view not found');
    }

    const shareView = snapshot.val();
    if (shareView.viewEnabled !== true) {
      throw new Error('Shared plan view is no longer available');
    }

    return buildViewOnlyPlanRecord(viewToken, shareView);
  } catch (error) {
    console.error('Error getting plan share view:', error);
    throw new Error((error as Error).message || 'Failed to get shared plan view');
  }
};

/**
 * Duplicate a plan from a view token
 */
export const duplicatePlanFromViewToken = async (
  viewToken: string,
  userId: string,
  newName?: string
): Promise<NormalizedPlanRecord> => {
  try {
    const sharedView = await getPlanShareView(viewToken);

    const planData = {
      name: newName || `${sharedView.name} (Copy)`,
      description: sharedView.description || '',
      bossId: sharedView.bossId,
      selectedJobs: sharedView.selectedJobs || {},
      assignments: sharedView.assignments || {},
      tankPositions: sharedView.tankPositions || {
        mainTank: null,
        offTank: null,
      },
      healthSettings: sharedView.healthSettings || {},
      sourceTimelineId: sharedView.sourceTimelineId || null,
      sourceTimelineName: sharedView.sourceTimelineName || null,
      phaseOverrides: sharedView.phaseOverrides || {},
      bossTags: sharedView.bossTags || [],
      bossMetadata: sharedView.bossMetadata || null,
      timelineLayout: sharedView.timelineLayout || null,
      isPublic: false,
    };

    return await createPlan(userId, planData as Parameters<typeof createPlan>[1]) as unknown as NormalizedPlanRecord;
  } catch (error) {
    console.error('Error duplicating plan from shared view:', error);
    throw new Error('Failed to create a copy of this plan');
  }
};

/**
 * Make a plan publicly editable
 */
export const makePlanPublic = async (planId: string, isPublic = true, userId?: string): Promise<{
  isPublic: boolean;
  editUrl: string;
}> => {
  try {
    const plan = await getPlan(planId);
    assertCanAdminExistingPlan(plan as unknown as NormalizedPlanRecord, userId || null);

    await update(ref(database), {
      [`${PLANS_PATH}/${planId}/isPublic`]: isPublic,
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp(),
      [`${PLANS_PATH}/${planId}/lastModifiedBy`]: userId,
    });

    return {
      isPublic,
      editUrl: getShareableEditLink(planId),
    };
  } catch (error) {
    console.error('Error updating public edit sharing:', error);
    throw new Error('Failed to update public edit sharing');
  }
};

/**
 * Get a public plan (if it is public)
 */
export const getPublicPlan = async (planId: string): Promise<NormalizedPlanRecord> => {
  const plan = await getPlan(planId);

  if (!(plan as { isPublic?: boolean }).isPublic) {
    throw new Error('Shared plan is no longer publicly editable');
  }

  return plan as unknown as NormalizedPlanRecord;
};

// ============================================================================
// Share View Subscriptions
// ============================================================================

/**
 * Subscribe to real-time updates for a shared plan view
 */
export const subscribeToPlanShareView = (
  viewToken: string,
  callback: (plan: NormalizedPlanRecord | null, error?: Error) => void
): (() => void) => {
  const shareViewRef = ref(database, `${PLAN_SHARE_VIEWS_PATH}/${viewToken}`);

  const unsubscribe = onValue(shareViewRef, (snapshot: { exists: () => boolean; val: () => Record<string, unknown> }) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const shareView = snapshot.val();
    if (shareView.viewEnabled !== true) {
      callback(null);
      return;
    }

    callback(buildViewOnlyPlanRecord(viewToken, shareView));
  }, (error: Error) => {
    console.error('Error listening to shared plan view changes:', error);
    callback(null, error);
  });

  return () => off(shareViewRef, 'value', unsubscribe);
};

/**
 * Track access to a shared plan view
 */
export const trackPlanShareViewAccess = async (viewToken: string, userId: string): Promise<void> => {
  try {
    if (!viewToken || !userId) {
      return;
    }

    const shareView = await getPlanShareView(viewToken);
    const now = Date.now();
    const viewerRef = ref(database, `${PLAN_SHARE_VIEW_TRACKING_PATH}/${viewToken}/viewers/${userId}`);
    const viewerSnapshot = await get(viewerRef);
    const existingViewer = viewerSnapshot.exists() ? viewerSnapshot.val() : null;

    await set(viewerRef, {
      firstViewedAt: existingViewer?.firstViewedAt || now,
      lastViewedAt: now,
      accessCount: (existingViewer?.accessCount || 0) + 1,
    });

    await update(ref(database, `${USER_PROFILES_PATH}/${userId}/accessedPlans/${shareView.planId}`), {
      planId: shareView.planId,
      viewToken,
      accessType: 'view',
      lastAccess: now,
      accessCount: (existingViewer?.accessCount || 0) + 1,
    });
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error('Error tracking shared plan view access:', error);
    }
  }
};

// Import required Firebase and utilities
