/**
 * Plan CRUD Service
 *
 * Core CRUD operations for plan management.
 */

import { ref, push, set, get, update, remove, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  getErrorMessage,
  isPermissionDeniedError,
  isPlansCollectionPermissionDeniedError,
} from '../firebaseErrorUtils';
import { getTimeline } from '../timelineService';
import {
  initializePlanOwnership,
  migratePlanOwnership,
  trackPlanAccess,
} from '../planAccessService';
import { getUserAccessiblePlans } from './plans.access';
import {
  PLANS_PATH,
  CURRENT_PLAN_VERSION,
  normalizePlanRecord,
  buildPlanUpdates,
  buildPlanFieldPayload,
  sanitizeFirebaseValue,
  getBossName,
  getShareSettings,
  getPlanOwnerId,
  getCollaboratorMap,
  type NormalizedPlanRecord,
} from './plans.shared';
import { getPlanTimelineLayout, getPlanTimelineMirrorFields, normalizePlanTimelineLayout, createPlanTimelineLayoutFromLegacyPlan } from '../../utils/timeline/planTimelineLayoutUtils';
import { canAdminPlan } from '../../utils/permissions/planPermissions';
import type { Plan, MitigationAssignments, SelectedJobs, TankPositions, BossMetadata, PlanTimelineLayout } from '../../types';

// ============================================================================
// Helper Functions
// ============================================================================

const assertCanAdminExistingPlan = (plan: NormalizedPlanRecord, userId: string | null) => {
  if (!userId) {
    throw new Error('User ID required');
  }

  if (!canAdminPlan(plan as unknown as Parameters<typeof canAdminPlan>[0], userId)) {
    throw new Error('Permission denied: Only the plan owner can manage sharing settings');
  }
};

const removePlanCollaborationIndexes = async (planId: string, collaborators: Record<string, unknown> = {}) => {
  const collaboratorIds = Object.keys(collaborators || {});
  if (collaboratorIds.length === 0) {
    return;
  }

  const cleanupUpdates: Record<string, null> = collaboratorIds.reduce<Record<string, null>>((acc, collaboratorId) => {
    acc[`plans/planCollaborationsByUser/${collaboratorId}/${planId}`] = null;
    return acc;
  }, {});

  await update(ref(database), cleanupUpdates);
};

const hydratePlanFieldsFromSourceTimeline = async (planData: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  if (planData.timelineLayout) {
    return buildPlanFieldPayload(planData);
  }

  if (!planData.sourceTimelineId) {
    return planData;
  }

  const sourceTimeline = await getTimeline(planData.sourceTimelineId as string);
  const timelineLayout = createPlanTimelineLayoutFromLegacyPlan(
    sourceTimeline,
    (planData.healthSettings as Record<string, unknown>) || {}
  );

  return {
    ...planData,
    ...getPlanTimelineMirrorFields(timelineLayout),
  };
};

const preparePlanForStorage = (userId: string, planData: Record<string, unknown> = {}): Record<string, unknown> => {
  const normalizedPlan = normalizePlanRecord(null, planData);

  return initializePlanOwnership(null, userId, {
    name: normalizedPlan.name,
    description: normalizedPlan.description,
    bossId: normalizedPlan.bossId,
    selectedJobs: normalizedPlan.selectedJobs,
    assignments: normalizedPlan.assignments,
    tankPositions: normalizedPlan.tankPositions,
    healthSettings: normalizedPlan.healthSettings,
    isPublic: normalizedPlan.isPublic,
    lastModifiedBy: userId,
    lastChangeOrigin: 'creation',
    version: CURRENT_PLAN_VERSION,
    sourceTimelineId: normalizedPlan.sourceTimelineId,
    sourceTimelineName: normalizedPlan.sourceTimelineName,
    phaseOverrides: normalizedPlan.phaseOverrides,
    bossTags: normalizedPlan.bossTags,
    bossMetadata: normalizedPlan.bossMetadata,
    timelineLayout: normalizedPlan.timelineLayout,
    collaborators: {},
    shareSettings: {
      viewToken: null,
      viewEnabled: false,
      viewUpdatedAt: null,
    },
  });
};

// ============================================================================
// Plan CRUD Operations
// ============================================================================

/**
 * Create a new mitigation plan
 */
export const createPlan = async (userId: string, planData: Partial<Plan>): Promise<Plan> => {
  try {
    const hydratedPlanData = await hydratePlanFieldsFromSourceTimeline(planData as Record<string, unknown>);
    const preparedDoc = preparePlanForStorage(userId, hydratedPlanData) as Record<string, unknown>;
    const planDoc = sanitizeFirebaseValue<Record<string, unknown>>(preparedDoc);

    if (!planDoc) {
      throw new Error('Failed to prepare plan document');
    }

    console.log('[createPlan] Creating plan with data:', {
      name: planDoc.name,
      bossId: planDoc.bossId || getBossName(planDoc.bossId as string),
      selectedJobsKeys: planDoc.selectedJobs ? Object.keys(planDoc.selectedJobs) : [],
      assignmentsKeys: planDoc.assignments ? Object.keys(planDoc.assignments) : [],
      ownerId: planDoc.ownerId,
    });

    const plansRef = ref(database, PLANS_PATH);
    const newPlanRef = push(plansRef);
    await set(newPlanRef, planDoc);

    console.log('[createPlan] Plan created successfully with ID:', newPlanRef.key);
    return normalizePlanRecord(newPlanRef.key, planDoc) as unknown as Plan;
  } catch (error) {
    console.error('Error creating plan:', error);
    throw new Error('Failed to create plan');
  }
};

/**
 * Update an existing mitigation plan (partial update)
 */
export const updatePlan = async (planId: string, planData: Partial<Plan>): Promise<Plan> => {
  try {
    console.log('[updatePlan] Updating plan:', { planId, updates: planData });
    const updates = buildPlanUpdates(planId, planData as Record<string, unknown>);
    console.log('[updatePlan] Firebase updates:', updates);
    await update(ref(database), updates);
    console.log('[updatePlan] Update successful');
    return normalizePlanRecord(planId, planData as Record<string, unknown>) as unknown as Plan;
  } catch (error) {
    console.error('[updatePlan] Error updating plan:', error);
    throw new Error('Failed to update plan');
  }
};

/**
 * Delete a mitigation plan
 */
export const deletePlan = async (planId: string, userId: string): Promise<boolean> => {
  try {
    const planRef = ref(database, `${PLANS_PATH}/${planId}`);
    const snapshot = await get(planRef);

    if (!snapshot.exists()) {
      throw new Error('Plan not found');
    }

    const plan = normalizePlanRecord(planId, snapshot.val());
    assertCanAdminExistingPlan(plan, userId);

    await removePlanCollaborationIndexes(planId, plan.collaborators);
    
    if (plan.shareSettings?.viewToken) {
      const shareViewsPath = 'planShareViews';
      await remove(ref(database, `${shareViewsPath}/${plan.shareSettings.viewToken}`));
    }
    
    await remove(planRef);
    return true;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw new Error((error as Error).message || 'Failed to delete plan');
  }
};

/**
 * Get a specific plan by ID
 */
export const getPlan = async (planId: string): Promise<Plan> => {
  try {
    const planRef = ref(database, `${PLANS_PATH}/${planId}`);
    const snapshot = await get(planRef);

    if (snapshot.exists()) {
      const planData = snapshot.val();
      const completePlan = normalizePlanRecord(planId, planData);
      console.log('[getPlan] Retrieved plan data:', {
        id: planId,
        name: completePlan.name,
        bossId: completePlan.bossId,
        selectedJobsKeys: Object.keys(completePlan.selectedJobs || {}),
        assignmentsKeys: Object.keys(completePlan.assignments || {}),
        hasUserId: !!completePlan.userId,
        isPublic: !!completePlan.isPublic,
      });

      // Apply backward compatibility migration
      const migratedPlanData = migratePlanOwnership(planId, {
        ...planData,
        ...completePlan,
      });
      const migratedPlan = normalizePlanRecord(planId, migratedPlanData);

      // If migration added fields, update the plan in Firebase
      if (!planData.accessedBy || !planData.ownerId) {
        console.log('[getPlan] Migrating plan to new schema:', planId);
        try {
          await update(planRef, {
            ownerId: migratedPlan.ownerId,
            accessedBy: migratedPlan.accessedBy,
            lastAccessedAt: migratedPlan.lastAccessedAt,
          });
        } catch (updateError) {
          console.warn('[getPlan] Failed to update plan with migration data:', updateError);
        }
      }

      return migratedPlan as unknown as Plan;
    } else {
      throw new Error('Plan not found');
    }
  } catch (error) {
    console.error('Error getting plan:', error);

    if (isPermissionDeniedError(error)) {
      throw new Error('Permission denied: You do not have access to this plan');
    } else if ((error as Error).message === 'Plan not found') {
      throw error;
    } else {
      throw new Error(`Failed to get plan: ${(error as Error).message}`);
    }
  }
};

/**
 * Get a specific plan by ID and track user access
 */
export const getPlanWithAccessTracking = async (planId: string, userId: string): Promise<Plan> => {
  try {
    const plan = await getPlan(planId);

    if (plan && userId) {
      await trackPlanAccess(planId, userId);
    }

    return plan;
  } catch (error) {
    console.error('Error getting plan with access tracking:', error);
    throw error;
  }
};

/**
 * Get all plans for a specific user (owned + accessed)
 */
export const getUserPlans = async (userId: string): Promise<Plan[]> => {
  try {
    return await getUserAccessiblePlans(userId);
  } catch (error) {
    console.error('Error getting user plans:', error);
    throw new Error('Failed to get user plans');
  }
};

// ============================================================================
// Import/Export Operations
// ============================================================================

/**
 * Duplicate a plan
 */
export const duplicatePlan = async (userId: string, originalPlanId: string, newName?: string): Promise<Plan> => {
  try {
    const originalPlan = await getPlan(originalPlanId);

    const duplicatedPlan = {
      name: newName || `${originalPlan.name} (Copy)`,
      description: originalPlan.description || '',
      bossId: originalPlan.bossId,
      selectedJobs: originalPlan.selectedJobs || {},
      assignments: originalPlan.assignments || {},
      tankPositions: originalPlan.tankPositions || {
        mainTank: null,
        offTank: null,
      },
      healthSettings: originalPlan.healthSettings || {},
      sourceTimelineId: originalPlan.sourceTimelineId || null,
      sourceTimelineName: originalPlan.sourceTimelineName || null,
      phaseOverrides: originalPlan.phaseOverrides || {},
      bossTags: originalPlan.bossTags || [],
      bossMetadata: originalPlan.bossMetadata || null,
      timelineLayout: originalPlan.timelineLayout || null,
      isPublic: false,
    };

    return await createPlan(userId, duplicatedPlan);
  } catch (error) {
    console.error('Error duplicating plan:', error);
    throw new Error('Failed to duplicate plan');
  }
};

/**
 * Export plan data for sharing
 */
export const exportPlan = async (planId: string): Promise<Record<string, unknown>> => {
  try {
    const plan = await getPlan(planId);

    const {
      id,
      userId: _userId,
      ownerId: _ownerId,
      collaborators: _collaborators,
      shareSettings: _shareSettings,
      accessLevel: _accessLevel,
      shareMode: _shareMode,
      viewToken: _viewToken,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...exportData
    } = plan;

    return {
      ...exportData,
      exportDate: new Date().toISOString(),
      version: '3.0',
    };
  } catch (error) {
    console.error('Error exporting plan:', error);
    throw new Error('Failed to export plan');
  }
};

/**
 * Import plan data
 */
export const importPlan = async (userId: string, importData: unknown, planName: string): Promise<Plan> => {
  try {
    const { migratePlanData, validatePlanData } = await import('../../utils/version/versionUtils.js');

    console.log('%c[IMPORT] Starting plan import process',
      'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', importData);

    // Type the import data as LegacyPlanData
    const legacyData = importData as {
      version?: string;
      name?: string;
      title?: string;
      bossId?: string;
      assignments?: MitigationAssignments;
      selectedJobs?: SelectedJobs;
      tankPositions?: TankPositions;
      healthSettings?: Record<string, unknown>;
      sourceTimelineId?: string | null;
      sourceTimelineName?: string | null;
      phaseOverrides?: Record<string, { startTime: number }>;
      bossTags?: string[];
      bossMetadata?: BossMetadata | null;
      timelineLayout?: PlanTimelineLayout | null;
    };

    const migratedData = migratePlanData(legacyData);

    // Validate the migrated data (cast to Partial<Plan> for type compatibility)
    if (!validatePlanData(migratedData as unknown as Partial<Plan>)) {
      throw new Error('Invalid plan data after migration');
    }

    console.log('%c[IMPORT] Plan data migrated and validated successfully',
      'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', migratedData);

    // Build plan data for createPlan - cast migrated data to compatible Plan fields
    const planData: Partial<Plan> = {
      name: planName || migratedData.name || legacyData.name || legacyData.title || 'Imported Plan',
      bossId: migratedData.bossId,
      assignments: migratedData.assignments,
      selectedJobs: migratedData.selectedJobs || {},
      tankPositions: migratedData.tankPositions || { mainTank: null, offTank: null },
      sourceTimelineId: migratedData.sourceTimelineId || null,
      sourceTimelineName: migratedData.sourceTimelineName || null,
      phaseOverrides: migratedData.phaseOverrides || {},
      bossTags: migratedData.bossTags || [],
      bossMetadata: migratedData.bossMetadata || null,
      timelineLayout: migratedData.timelineLayout || null,
      healthSettings: migratedData.healthSettings || {},
      // Extra import metadata (stored as plain data)
      ...({
        description: (legacyData.name || legacyData.title) ? String(legacyData.name || legacyData.title) : undefined,
        importedAt: new Date().toISOString(),
        originalVersion: legacyData.version || 'unknown',
        migratedVersion: migratedData.version,
      } as Partial<Plan>),
    };

    return await createPlan(userId, planData);
  } catch (error) {
    console.error('Error importing plan:', error);
    throw new Error(`Failed to import plan: ${(error as Error).message}`);
  }
};
