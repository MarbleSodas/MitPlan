import {
  ref,
  push,
  set,
  get,
  remove,
  update,
  serverTimestamp,
  onValue,
  off,
  runTransaction,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { database } from '../config/firebase';
import { initializePlanOwnership, trackPlanAccess, getUserAccessiblePlans } from './planAccessService';
import {
  getActiveUsersPath,
  getJobAssignmentPath,
  getJobAssignmentsPath
} from './collaborationPaths';
import { isPermissionDeniedError } from './firebaseErrorUtils';
import { getTimeline } from './timelineService';
import {
  createPlanTimelineLayoutFromLegacyPlan,
  getPlanTimelineLayout,
  getPlanTimelineMirrorFields,
  normalizePlanTimelineLayout,
} from '../utils/timeline/planTimelineLayoutUtils';

const PLANS_PATH = 'plans';

const getBossName = (bossId) => {
  const bossNames = {
    'ketuduke': 'Ketuduke',
    'lala': 'Lala',
    'statice': 'Statice',
    'dancing-green-m5s': 'Dancing Green (M5S)',
    'sugar-riot': 'Sugar Riot (M6S)',
    'brute-abominator-m7s': 'Brute Abominator (M7S)',
    'howling-blade-m8s': 'Howling Blade (M8S)',
    'lindwurm-m12s': 'Lindwurm (M12S) Part 1',
    'lindwurm-ii-m12s': 'Lindwurm II (M12S) Part 2',
    'necron': 'Necron'
  };
  return bossNames[bossId] || 'Unknown Boss';
};

const getCanonicalBossId = (planData = {}) => {
  return planData.timelineLayout?.bossId || planData.bossId || planData.selectedBoss?.id || 'ketuduke';
};

const sanitizeFirebaseValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeFirebaseValue(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entryValue]) => {
      const sanitizedEntryValue = sanitizeFirebaseValue(entryValue);
      if (sanitizedEntryValue !== undefined) {
        acc[key] = sanitizedEntryValue;
      }
      return acc;
    }, {});
  }

  return value;
};

const withTimelineLayoutMirrors = (planData = {}) => {
  if (!planData.timelineLayout) {
    return planData;
  }

  const timelineLayout = normalizePlanTimelineLayout(planData.timelineLayout);
  if (!timelineLayout) {
    return {
      ...planData,
      timelineLayout: null,
    };
  }

  return {
    ...planData,
    ...getPlanTimelineMirrorFields(timelineLayout),
  };
};

const getCanonicalPlanField = (fieldPath, value) => {
  switch (fieldPath) {
    case 'title':
      return ['name', value];
    case 'selectedBoss':
      return ['bossId', typeof value === 'object' ? value?.id || 'ketuduke' : value];
    case 'assignedMitigations':
      return ['assignments', value];
    case 'tankAssignments':
      return ['tankPositions', value];
    default:
      return [fieldPath, value];
  }
};

const buildPlanFieldPayload = (planData = {}) => {
  return withTimelineLayoutMirrors(planData);
};

const normalizePlanRecord = (planId, planData = {}) => {
  const planFields = buildPlanFieldPayload(planData);
  const timelineLayout = getPlanTimelineLayout(planFields);
  const bossId = getCanonicalBossId(planFields);

  return {
    id: planId,
    name: planFields.name || planFields.title || 'Untitled Plan',
    description: planFields.description || '',
    bossId: timelineLayout?.bossId || bossId,
    selectedJobs: planFields.selectedJobs || {},
    assignments: planFields.assignments || planFields.assignedMitigations || {},
    tankPositions: planFields.tankPositions || planFields.tankAssignments || {
      mainTank: null,
      offTank: null
    },
    healthSettings: planFields.healthSettings || {},
    isPublic: planFields.isPublic || false,
    userId: planFields.userId || planFields.ownerId || null,
    ownerId: planFields.ownerId || planFields.userId || null,
    accessedBy: planFields.accessedBy || {},
    createdAt: planFields.createdAt,
    updatedAt: planFields.updatedAt,
    lastAccessedAt: planFields.lastAccessedAt,
    version: planFields.version || 4.1,
    lastModifiedBy: planFields.lastModifiedBy || null,
    lastChangeOrigin: planFields.lastChangeOrigin || null,
    sourceTimelineId: planFields.sourceTimelineId || null,
    sourceTimelineName: planFields.sourceTimelineName || null,
    phaseOverrides: planFields.phaseOverrides || {},
    bossTags: timelineLayout?.bossTags || planFields.bossTags || (bossId ? [bossId] : []),
    bossMetadata: timelineLayout?.bossMetadata || planFields.bossMetadata || null,
    timelineLayout,
  };
};

const preparePlanForStorage = (userId, planData = {}) => {
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
    version: 4.1,
    sourceTimelineId: normalizedPlan.sourceTimelineId,
    sourceTimelineName: normalizedPlan.sourceTimelineName,
    phaseOverrides: normalizedPlan.phaseOverrides,
    bossTags: normalizedPlan.bossTags,
    bossMetadata: normalizedPlan.bossMetadata,
    timelineLayout: normalizedPlan.timelineLayout,
  });
};

const hydratePlanFieldsFromSourceTimeline = async (planData = {}) => {
  if (planData.timelineLayout) {
    return buildPlanFieldPayload(planData);
  }

  if (!planData.sourceTimelineId) {
    return planData;
  }

  const sourceTimeline = await getTimeline(planData.sourceTimelineId);
  const timelineLayout = createPlanTimelineLayoutFromLegacyPlan(
    sourceTimeline,
    planData.healthSettings || {}
  );

  return {
    ...planData,
    ...getPlanTimelineMirrorFields(timelineLayout),
  };
};

const buildPlanUpdates = (planId, planData, userId = null, sessionId = null) => {
  const updates = {};
  const expandedPlanData = buildPlanFieldPayload(planData);

  Object.entries(expandedPlanData).forEach(([fieldPath, value]) => {
    const [canonicalFieldPath, canonicalValue] = getCanonicalPlanField(fieldPath, value);
    const sanitizedValue = sanitizeFirebaseValue(canonicalValue);
    if (sanitizedValue !== undefined) {
      updates[`${PLANS_PATH}/${planId}/${canonicalFieldPath}`] = sanitizedValue;
    }
  });

  updates[`${PLANS_PATH}/${planId}/updatedAt`] = serverTimestamp();

  if (userId) {
    updates[`${PLANS_PATH}/${planId}/lastModifiedBy`] = userId;
  }

  if (sessionId) {
    updates[`${PLANS_PATH}/${planId}/lastChangeOrigin`] = sessionId;
  }

  return updates;
};

const getRecentPlanTimestamp = (plan) =>
  plan.updatedAt ||
  plan.lastAccessedAt ||
  plan.createdAt ||
  0;

const sortUserPlansByRecent = (plans) => {
  plans.sort((a, b) => getRecentPlanTimestamp(b) - getRecentPlanTimestamp(a));
  return plans;
};

const mergeOwnedPlanCollections = (...planGroups) => {
  const mergedPlans = new Map();

  planGroups.flat().forEach((plan) => {
    if (!plan?.id || mergedPlans.has(plan.id)) {
      return;
    }

    mergedPlans.set(plan.id, plan);
  });

  return sortUserPlansByRecent(Array.from(mergedPlans.values()));
};

/**
 * Create a new mitigation plan
 */
export const createPlan = async (userId, planData) => {
  try {
    const hydratedPlanData = await hydratePlanFieldsFromSourceTimeline(planData);
    const planDoc = sanitizeFirebaseValue(preparePlanForStorage(userId, hydratedPlanData));

    console.log('[createPlan] Creating plan with data:', {
      name: planDoc.name,
      bossId: planDoc.bossId || getBossName(planDoc.bossId),
      selectedJobsKeys: planDoc.selectedJobs ? Object.keys(planDoc.selectedJobs) : [],
      assignmentsKeys: planDoc.assignments ? Object.keys(planDoc.assignments) : [],
      ownerId: planDoc.ownerId
    });

    const plansRef = ref(database, PLANS_PATH);
    const newPlanRef = push(plansRef);
    await set(newPlanRef, planDoc);

    console.log('[createPlan] Plan created successfully with ID:', newPlanRef.key);
    return normalizePlanRecord(newPlanRef.key, planDoc);
  } catch (error) {
    console.error('Error creating plan:', error);
    throw new Error('Failed to create plan');
  }
};

/**
 * Update an existing mitigation plan (partial update)
 */
export const updatePlan = async (planId, planData) => {
  try {
    console.log('[updatePlan] Updating plan:', { planId, updates: planData });
    const updates = buildPlanUpdates(planId, planData);
    console.log('[updatePlan] Firebase updates:', updates);
    await update(ref(database), updates);
    console.log('[updatePlan] Update successful');
    return { id: planId, ...normalizePlanRecord(planId, planData), updatedAt: Date.now() };
  } catch (error) {
    console.error('[updatePlan] Error updating plan:', error);
    throw new Error('Failed to update plan');
  }
};

/**
 * Delete a mitigation plan
 */
export const deletePlan = async (planId) => {
  try {
    const planRef = ref(database, `${PLANS_PATH}/${planId}`);
    await remove(planRef);
    return true;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw new Error('Failed to delete plan');
  }
};

/**
 * Get a specific plan by ID
 */
export const getPlan = async (planId) => {
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
        isPublic: !!completePlan.isPublic
      });

      // Apply backward compatibility migration
      const { migratePlanOwnership } = await import('./planAccessService');
      const migratedPlanData = migratePlanOwnership(planId, {
        ...planData,
        ...completePlan
      });
      const migratedPlan = normalizePlanRecord(planId, migratedPlanData);

      // If migration added fields, update the plan in Firebase
      if (!planData.accessedBy || !planData.ownerId) {
        console.log('[getPlan] Migrating plan to new schema:', planId);
        try {
          await update(planRef, {
            ownerId: migratedPlan.ownerId,
            accessedBy: migratedPlan.accessedBy,
            lastAccessedAt: migratedPlan.lastAccessedAt
          });
        } catch (updateError) {
          console.warn('[getPlan] Failed to update plan with migration data:', updateError);
          // Don't throw error - plan can still be used
        }
      }

      return migratedPlan;
    } else {
      throw new Error('Plan not found');
    }
  } catch (error) {
    console.error('Error getting plan:', error);

    // Provide more specific error messages
    if (isPermissionDeniedError(error)) {
      throw new Error('Permission denied: You do not have access to this plan');
    } else if (error.message === 'Plan not found') {
      throw error; // Re-throw the specific "Plan not found" error
    } else {
      throw new Error(`Failed to get plan: ${error.message}`);
    }
  }
};

/**
 * Get a specific plan by ID and track user access
 */
export const getPlanWithAccessTracking = async (planId, userId) => {
  try {
    const plan = await getPlan(planId);

    // Track access if user is provided and plan exists
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
export const getUserPlans = async (userId) => {
  try {
    // Use the new access control service to get accessible plans
    return await getUserAccessiblePlans(userId);
  } catch (error) {
    console.error('Error getting user plans:', error);
    throw new Error('Failed to get user plans');
  }
};

/**
 * Duplicate a plan
 */
export const duplicatePlan = async (userId, originalPlanId, newName) => {
  try {
    const originalPlan = await getPlan(originalPlanId);
    
    // Remove Firebase-specific fields and create new plan
    const { id, createdAt, updatedAt, ...planData } = originalPlan;
    const duplicatedPlan = {
      ...planData,
      name: newName || `Copy of ${originalPlan.name}`,
      userId
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
export const exportPlan = async (planId) => {
  try {
    const plan = await getPlan(planId);
    
    // Remove user-specific and Firebase-specific data for export
    const { id, userId, createdAt, updatedAt, ...exportData } = plan;
    
    return {
      ...exportData,
      exportDate: new Date().toISOString(),
      version: '3.0'
    };
  } catch (error) {
    console.error('Error exporting plan:', error);
    throw new Error('Failed to export plan');
  }
};

/**
 * Import plan data
 */
export const importPlan = async (userId, importData, planName) => {
  try {
    // Import the migration utilities
    const { migratePlanData, validatePlanData } = await import('../utils/version/versionUtils.js');

    console.log('%c[IMPORT] Starting plan import process',
      'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', importData);

    // Migrate the plan data to the current version
    const migratedData = migratePlanData(importData);

    // Validate the migrated data
    if (!validatePlanData(migratedData)) {
      throw new Error('Invalid plan data after migration');
    }

    console.log('%c[IMPORT] Plan data migrated and validated successfully',
      'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', migratedData);

    const planData = {
      name: planName || migratedData.name || 'Imported Plan',
      bossId: migratedData.bossId,
      assignments: migratedData.assignments,
      selectedJobs: migratedData.selectedJobs || {},
      tankPositions: migratedData.tankPositions || {},
      description: migratedData.description || '',
      sourceTimelineId: migratedData.sourceTimelineId || null,
      sourceTimelineName: migratedData.sourceTimelineName || null,
      phaseOverrides: migratedData.phaseOverrides || {},
      bossTags: migratedData.bossTags || [],
      bossMetadata: migratedData.bossMetadata || null,
      timelineLayout: migratedData.timelineLayout || null,
      healthSettings: migratedData.healthSettings || {},
      importedAt: new Date().toISOString(),
      originalVersion: importData.version || 'unknown',
      migratedVersion: migratedData.version
    };

    return await createPlan(userId, planData);
  } catch (error) {
    console.error('Error importing plan:', error);
    throw new Error(`Failed to import plan: ${error.message}`);
  }
};

/**
 * Listen to real-time changes for a specific plan
 */
export const subscribeToPlan = (planId, callback) => {
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
        lastChangeOrigin: completePlan.lastChangeOrigin
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

/**
 * Listen to real-time changes for user's plans
 */
export const subscribeToUserPlans = (userId, callback) => {
  const plansRef = ref(database, PLANS_PATH);
  const ownerPlansQuery = query(plansRef, orderByChild('ownerId'), equalTo(userId));
  const legacyPlansQuery = query(plansRef, orderByChild('userId'), equalTo(userId));
  const subscriptionPlans = {
    ownerId: new Map(),
    userId: new Map(),
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

    callback(
      mergeOwnedPlanCollections(
        Array.from(subscriptionPlans.ownerId.values()),
        Array.from(subscriptionPlans.userId.values())
      )
    );
  };

  const buildSnapshotHandler = (fieldName) => (snapshot) => {
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

  const handleSubscriptionError = (error) => {
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

/**
 * Update specific fields of a plan for collaborative editing
 */
export const updatePlanField = async (planId, fieldPath, value, userId = null) => {
  try {
    return await updatePlanFieldsWithOrigin(planId, { [fieldPath]: value }, userId);
  } catch (error) {
    console.error('Error updating plan field:', error);
    throw new Error('Failed to update plan field');
  }
};



/**
 * Update tank positions with real-time sync
 */
export const updateTankPositionsRealtime = async (planId, tankPositions, userId, sessionId) => {
  try {
    const updates = {
      [`${PLANS_PATH}/${planId}/tankPositions`]: tankPositions,
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp(),
      [`${PLANS_PATH}/${planId}/lastModifiedBy`]: userId,
      [`${PLANS_PATH}/${planId}/lastChangeOrigin`]: sessionId
    };

    await update(ref(database), updates);
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
export const updatePlanAssignments = async (planId, assignments, userId = null) => {
  try {
    const updates = {
      [`${PLANS_PATH}/${planId}/assignments`]: assignments,
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp()
    };

    if (userId) {
      updates[`${PLANS_PATH}/${planId}/lastModifiedBy`] = userId;
    }

    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error updating plan assignments:', error);
    throw new Error('Failed to update plan assignments');
  }
};

/**
 * Update selected jobs for a plan
 */
export const updatePlanJobs = async (planId, selectedJobs, userId = null) => {
  try {
    const updates = {
      [`${PLANS_PATH}/${planId}/selectedJobs`]: selectedJobs,
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp()
    };

    if (userId) {
      updates[`${PLANS_PATH}/${planId}/lastModifiedBy`] = userId;
    }

    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error updating plan jobs:', error);
    throw new Error('Failed to update plan jobs');
  }
};

/**
 * Update plan boss selection
 */
export const updatePlanBoss = async (planId, bossId, userId = null) => {
  try {
    const updates = {
      [`${PLANS_PATH}/${planId}/bossId`]: bossId,
      [`${PLANS_PATH}/${planId}/updatedAt`]: serverTimestamp()
    };

    if (userId) {
      updates[`${PLANS_PATH}/${planId}/lastModifiedBy`] = userId;
    }

    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error updating plan boss:', error);
    throw new Error('Failed to update plan boss');
  }
};

/**
 * Make a plan public for sharing
 */
export const makePlanPublic = async (planId, isPublic = true) => {
  try {
    const planRef = ref(database, `${PLANS_PATH}/${planId}/isPublic`);
    await set(planRef, isPublic);

    // Update timestamp
    const timestampRef = ref(database, `${PLANS_PATH}/${planId}/updatedAt`);
    await set(timestampRef, serverTimestamp());

    return true;
  } catch (error) {
    console.error('Error updating plan visibility:', error);
    throw new Error('Failed to update plan visibility');
  }
};

/**
 * Get a public plan (for sharing)
 */
export const getPublicPlan = async (planId) => {
  try {
    const plan = await getPlan(planId);

    if (!plan.isPublic) {
      throw new Error('Plan is not public');
    }

    return plan;
  } catch (error) {
    console.error('Error getting public plan:', error);
    throw new Error('Failed to get public plan');
  }
};

/**
 * Update plan with conflict resolution using optimistic locking
 */
export const updatePlanWithConflictResolution = async (planId, updates, userId, expectedVersion = null) => {
  try {
    const planRef = ref(database, `${PLANS_PATH}/${planId}`);

    // Get current plan state
    const currentSnapshot = await get(planRef);
    if (!currentSnapshot.exists()) {
      throw new Error('Plan not found');
    }

    const currentPlan = currentSnapshot.val();

    // Check version conflict if expectedVersion is provided
    if (expectedVersion !== null && currentPlan.version !== expectedVersion) {
      throw new Error('CONFLICT: Plan has been modified by another user');
    }

    // Increment version for optimistic locking
    const newVersion = (currentPlan.version || 0) + 1;

    const updateData = {
      ...updates,
      version: newVersion,
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    };

    // Perform atomic update
    await set(planRef, { ...currentPlan, ...updateData });

    return {
      success: true,
      version: newVersion,
      data: updateData
    };
  } catch (error) {
    if (error.message.includes('CONFLICT')) {
      return {
        success: false,
        conflict: true,
        error: error.message
      };
    }

    console.error('Error updating plan with conflict resolution:', error);
    throw new Error('Failed to update plan');
  }
};

/**
 * Merge plan changes with conflict resolution
 */
export const mergePlanChanges = async (planId, localChanges, userId) => {
  try {
    const planRef = ref(database, `${PLANS_PATH}/${planId}`);
    const currentSnapshot = await get(planRef);

    if (!currentSnapshot.exists()) {
      throw new Error('Plan not found');
    }

    const serverPlan = currentSnapshot.val();

    // Simple merge strategy: server wins for conflicts, but preserve non-conflicting changes
    const mergedPlan = {
      ...serverPlan,
      ...localChanges,
      version: (serverPlan.version || 0) + 1,
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    };

    // Handle specific field conflicts
    if (localChanges.assignments && serverPlan.assignments) {
      // Merge assignments - keep both local and server assignments
      mergedPlan.assignments = {
        ...serverPlan.assignments,
        ...localChanges.assignments
      };
    }

    if (localChanges.selectedJobs && serverPlan.selectedJobs) {
      // Merge selected jobs - union of both selections
      mergedPlan.selectedJobs = {
        ...serverPlan.selectedJobs,
        ...localChanges.selectedJobs
      };
    }

    await set(planRef, mergedPlan);

    return {
      success: true,
      mergedPlan,
      conflicts: [] // Could be enhanced to return specific conflicts
    };
  } catch (error) {
    console.error('Error merging plan changes:', error);
    throw new Error('Failed to merge plan changes');
  }
};

/**
 * Create a plan snapshot for rollback purposes
 */
export const createPlanSnapshot = async (planId, userId, reason = 'manual') => {
  try {
    const plan = await getPlan(planId);
    const snapshotRef = ref(database, `planSnapshots/${planId}/${Date.now()}`);

    const snapshot = {
      ...plan,
      snapshotCreatedAt: serverTimestamp(),
      snapshotCreatedBy: userId,
      snapshotReason: reason
    };

    await set(snapshotRef, snapshot);
    return snapshot;
  } catch (error) {
    console.error('Error creating plan snapshot:', error);
    throw new Error('Failed to create plan snapshot');
  }
};

/**
 * Real-time collaboration functions
 */

/**
 * Update plan field with change origin tracking
 */
export const updatePlanFieldWithOrigin = async (planId, fieldPath, value, userId = null, sessionId = null) => {
  try {
    console.log('[updatePlanFieldWithOrigin] Updating field:', {
      planId,
      fieldPath,
      valueType: typeof value,
      valueKeys: typeof value === 'object' && value !== null ? Object.keys(value) : 'N/A',
      userId,
      sessionId
    });

    return await updatePlanFieldsWithOrigin(planId, { [fieldPath]: value }, userId, sessionId);
  } catch (error) {
    console.error('Error updating plan field with origin:', error);
    console.error('Update details:', { planId, fieldPath, valueType: typeof value });
    throw new Error('Failed to update plan field');
  }
};

/**
 * Update multiple plan fields atomically with change origin
 */
export const updatePlanFieldsWithOrigin = async (planId, fields, userId = null, sessionId = null) => {
  try {
    const updates = buildPlanUpdates(planId, fields, userId, sessionId);
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error updating plan fields with origin:', error);
    throw new Error('Failed to update plan fields');
  }
};

/**
 * Subscribe to plan changes with change origin filtering
 */
export const subscribeToPlanWithOrigin = (planId, callback, sessionId = null) => {
  const planRef = ref(database, `${PLANS_PATH}/${planId}`);
  let isFirstLoad = true;

  const unsubscribe = onValue(planRef, (snapshot) => {
    if (snapshot.exists()) {
      const planData = snapshot.val();
      const changeOrigin = planData.lastChangeOrigin;
      const completePlan = normalizePlanRecord(planId, planData);

      // Always trigger callback on first load, then filter by origin
      if (isFirstLoad || !sessionId || changeOrigin !== sessionId) {
        console.log('[subscribeToPlanWithOrigin] Loading plan data:', {
          planId,
          isFirstLoad,
          changeOrigin,
          sessionId,
          name: completePlan.name,
          bossId: completePlan.bossId,
          selectedJobsKeys: Object.keys(completePlan.selectedJobs || {}),
          assignmentsKeys: Object.keys(completePlan.assignments || {})
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

/**
 * Update plan assignments with real-time collaboration support
 */
export const updatePlanAssignmentsRealtime = async (planId, assignments, userId = null, sessionId = null) => {
  try {
    console.log('[updatePlanAssignmentsRealtime] Updating assignments:', {
      planId,
      assignmentCount: Object.keys(assignments || {}).length,
      userId,
      sessionId
    });

    const result = await updatePlanFieldWithOrigin(planId, 'assignments', assignments, userId, sessionId);
    console.log('[updatePlanAssignmentsRealtime] Update successful');
    return result;
  } catch (error) {
    console.error('Error updating plan assignments realtime:', error);
    throw new Error('Failed to update plan assignments');
  }
};

/**
 * Update selected jobs with real-time collaboration support
 */
export const updatePlanJobsRealtime = async (planId, selectedJobs, userId = null, sessionId = null) => {
  try {
    console.log('[updatePlanJobsRealtime] Updating jobs:', {
      planId,
      jobKeys: Object.keys(selectedJobs || {}),
      userId,
      sessionId
    });

    const result = await updatePlanFieldWithOrigin(planId, 'selectedJobs', selectedJobs, userId, sessionId);
    console.log('[updatePlanJobsRealtime] Update successful');
    return result;
  } catch (error) {
    console.error('Error updating plan jobs realtime:', error);
    throw new Error('Failed to update plan jobs');
  }
};

/**
 * Update plan boss selection with real-time collaboration support
 */
export const updatePlanBossRealtime = async (planId, bossId, userId = null, sessionId = null) => {
  try {
    console.log('[updatePlanBossRealtime] Updating boss:', {
      planId,
      bossId,
      userId,
      sessionId
    });

    const result = await updatePlanFieldWithOrigin(planId, 'bossId', bossId, userId, sessionId);
    console.log('[updatePlanBossRealtime] Update successful');
    return result;
  } catch (error) {
    console.error('Error updating plan boss realtime:', error);
    throw new Error('Failed to update plan boss');
  }
};

export const updatePlanTimelineLayoutRealtime = async (
  planId,
  timelineLayout,
  userId = null,
  sessionId = null
) => {
  try {
    const normalizedTimelineLayout = normalizePlanTimelineLayout(timelineLayout);
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



/**
 * Batch update multiple plan fields for better performance
 */
export const batchUpdatePlanRealtime = async (planId, updates, userId = null, sessionId = null) => {
  try {
    return await updatePlanFieldsWithOrigin(planId, updates, userId, sessionId);
  } catch (error) {
    console.error('Error batch updating plan realtime:', error);
    throw new Error('Failed to batch update plan');
  }
};

export const hydratePlanTimelineLayoutIfMissing = async (planId, userId = null, sessionId = null) => {
  try {
    const plan = await getPlan(planId);

    if (plan.timelineLayout || !plan.sourceTimelineId) {
      return plan.timelineLayout || null;
    }

    const sourceTimeline = await getTimeline(plan.sourceTimelineId);
    const timelineLayout = createPlanTimelineLayoutFromLegacyPlan(
      sourceTimeline,
      plan.healthSettings || {}
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
 * Session management functions
 */

/**
 * Clean up inactive sessions (older than 10 minutes)
 */
export const cleanupInactiveSessions = async (planId) => {
  try {
    const sessionsRef = ref(database, getActiveUsersPath(planId));
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) return;

    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000); // 10 minutes in milliseconds

    const updates = {};

    snapshot.forEach((childSnapshot) => {
      const sessionData = childSnapshot.val();
      const lastActivity = sessionData.lastActivity;

      // Remove sessions that haven't been active for 10+ minutes
      if (lastActivity && lastActivity < tenMinutesAgo) {
        updates[`${getActiveUsersPath(planId)}/${childSnapshot.key}`] = null;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  } catch (error) {
    console.error('Error cleaning up inactive sessions:', error);
  }
};

/**
 * Get active collaborators for a plan
 */
export const getActiveCollaborators = async (planId) => {
  try {
    const sessionsRef = ref(database, getActiveUsersPath(planId));
    const snapshot = await get(sessionsRef);

    const collaborators = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();
        if (sessionData && sessionData.isActive) {
          collaborators.push({
            sessionId: childSnapshot.key,
            ...sessionData
          });
        }
      });
    }

    return collaborators;
  } catch (error) {
    console.error('Error getting active collaborators:', error);
    return [];
  }
};

/**
 * Check if a plan is currently being collaborated on
 */
export const isPlanBeingCollaborated = async (planId) => {
  try {
    const collaborators = await getActiveCollaborators(planId);
    return collaborators.length > 1; // More than 1 means collaboration
  } catch (error) {
    console.error('Error checking plan collaboration status:', error);
    return false;
  }
};

/**
 * Subscribe to collaboration changes for a plan
 */
export const subscribeToCollaboration = (planId, callback) => {
  const collaborationRef = ref(database, getActiveUsersPath(planId));

  const unsubscribe = onValue(collaborationRef, (snapshot) => {
    const collaborators = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();
        if (sessionData && sessionData.isActive) {
          collaborators.push({
            sessionId: childSnapshot.key,
            ...sessionData
          });
        }
      });
    }
    callback(collaborators);
  }, (error) => {
    console.error('Error listening to collaboration changes:', error);
    callback([]);
  });

  return () => off(collaborationRef, 'value', unsubscribe);
};

/**
 * Get plan snapshots for rollback
 */
export const getPlanSnapshots = async (planId, limit = 10) => {
  try {
    const snapshotsRef = ref(database, `planSnapshots/${planId}`);
    const snapshot = await get(snapshotsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const snapshots = [];
    snapshot.forEach((childSnapshot) => {
      snapshots.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Sort by creation time (most recent first) and limit
    return snapshots
      .sort((a, b) => (b.snapshotCreatedAt || 0) - (a.snapshotCreatedAt || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting plan snapshots:', error);
    throw new Error('Failed to get plan snapshots');
  }
};

/**
 * Ensure a plan has all required fields with proper defaults
 * This function can be used to migrate existing plans to the new structure
 */
export const ensurePlanStructure = async (planId) => {
  try {
    console.log('[ensurePlanStructure] Checking plan structure for:', planId);

    const plan = await getPlan(planId);
    let needsUpdate = false;
    const updates = {};

    // Check and add missing fields
    if (!plan.selectedJobs || typeof plan.selectedJobs !== 'object') {
      updates.selectedJobs = {};
      needsUpdate = true;
    }

    if (!plan.assignments || typeof plan.assignments !== 'object') {
      updates.assignments = {};
      needsUpdate = true;
    }

    if (!plan.tankPositions || typeof plan.tankPositions !== 'object') {
      // Check if we have legacy tankAssignments to migrate
      if (plan.tankAssignments && typeof plan.tankAssignments === 'object') {
        updates.tankPositions = plan.tankAssignments;
        console.log('[ensurePlanStructure] Migrating tankAssignments to tankPositions:', plan.tankAssignments);
      } else {
        updates.tankPositions = {};
      }
      needsUpdate = true;
    }

    if (plan.isPublic === undefined) {
      updates.isPublic = false;
      needsUpdate = true;
    }

    if (!plan.phaseOverrides || typeof plan.phaseOverrides !== 'object') {
      updates.phaseOverrides = {};
      needsUpdate = true;
    }

    if (!plan.bossId) {
      updates.bossId = 'ketuduke';
      needsUpdate = true;
    }

    // Check and initialize access control fields for backward compatibility
    if (!plan.accessedBy || typeof plan.accessedBy !== 'object') {
      updates.accessedBy = {};
      needsUpdate = true;
      console.log('[ensurePlanStructure] Initializing accessedBy field for backward compatibility');
    }

    if (!plan.ownerId && plan.userId) {
      // Migrate userId to ownerId for backward compatibility
      updates.ownerId = plan.userId;
      needsUpdate = true;
      console.log('[ensurePlanStructure] Migrating userId to ownerId:', plan.userId);
    }

    if (!plan.createdAt) {
      updates.createdAt = Date.now();
      needsUpdate = true;
    }

    if (!plan.updatedAt) {
      updates.updatedAt = Date.now();
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log('[ensurePlanStructure] Updating plan structure with:', updates);
      await updatePlanFieldsWithOrigin(planId, updates);
      console.log('[ensurePlanStructure] Plan structure updated successfully');

      // Clean up legacy tankAssignments field if we migrated it
      if (plan.tankAssignments && updates.tankPositions) {
        try {
          await remove(ref(database, `${PLANS_PATH}/${planId}/tankAssignments`));
          console.log('[ensurePlanStructure] Cleaned up legacy tankAssignments field');
        } catch (error) {
          console.warn('[ensurePlanStructure] Failed to clean up legacy tankAssignments:', error);
        }
      }
    } else {
      console.log('[ensurePlanStructure] Plan structure is already complete');
    }

    return true;
  } catch (error) {
    console.error('Error ensuring plan structure:', error);

    // Handle permission errors more gracefully
    if (isPermissionDeniedError(error)) {
      throw new Error('Permission denied: You do not have access to this plan');
    } else {
      throw new Error('Failed to ensure plan structure');
    }
  }
};

export const claimJob = async (planId, jobId, userId, displayName, color) => {
  try {
    const jobAssignmentsRef = ref(database, getJobAssignmentsPath(planId));
    
    const result = await runTransaction(jobAssignmentsRef, (currentAssignments) => {
      const assignments = currentAssignments || {};
      
      if (assignments[jobId] && assignments[jobId].userId !== userId) {
        return undefined;
      }
      
      const userAlreadyHasJob = Object.entries(assignments).some(
        ([existingJobId, assignment]) => 
          existingJobId !== jobId && assignment?.userId === userId
      );
      
      if (userAlreadyHasJob) {
        return undefined;
      }
      
      return {
        ...assignments,
        [jobId]: {
          userId,
          displayName,
          color,
          assignedAt: Date.now()
        }
      };
    });
    
    if (!result.committed) {
      console.log('[claimJob] Transaction aborted - job already claimed or user has another job');
      return false;
    }
    
    console.log('[claimJob] Successfully claimed job:', jobId, 'for user:', displayName);
    return true;
  } catch (error) {
    console.error('[claimJob] Error claiming job:', error);
    return false;
  }
};

export const releaseJob = async (planId, jobId, userId) => {
  try {
    const jobRef = ref(database, getJobAssignmentPath(planId, jobId));
    
    const result = await runTransaction(jobRef, (currentAssignment) => {
      if (!currentAssignment) {
        return null;
      }
      
      if (currentAssignment.userId !== userId) {
        return undefined;
      }
      
      return null;
    });
    
    if (!result.committed) {
      console.log('[releaseJob] Transaction aborted - not the owner of this job');
      return false;
    }
    
    console.log('[releaseJob] Successfully released job:', jobId);
    return true;
  } catch (error) {
    console.error('[releaseJob] Error releasing job:', error);
    return false;
  }
};

export const subscribeToJobAssignments = (planId, callback) => {
  const jobAssignmentsRef = ref(database, getJobAssignmentsPath(planId));
  
  const unsubscribe = onValue(jobAssignmentsRef, (snapshot) => {
    const assignments = snapshot.exists() ? snapshot.val() : {};
    callback(assignments);
  }, (error) => {
    console.error('[subscribeToJobAssignments] Error:', error);
    callback({});
  });
  
  return () => off(jobAssignmentsRef, 'value', unsubscribe);
};

export const getUserCurrentJob = async (planId, userId) => {
  try {
    const jobAssignmentsRef = ref(database, getJobAssignmentsPath(planId));
    const snapshot = await get(jobAssignmentsRef);
    
    if (!snapshot.exists()) return null;
    
    const assignments = snapshot.val();
    for (const [jobId, assignment] of Object.entries(assignments)) {
      if (assignment?.userId === userId) {
        return jobId;
      }
    }
    return null;
  } catch (error) {
    console.error('[getUserCurrentJob] Error:', error);
    return null;
  }
};

export const updatePlanTankPositionsRealtime = async (planId, tankPositions, userId, sessionId) => {
  try {
    const tankPositionsRef = ref(database, `${PLANS_PATH}/${planId}/tankPositions`);
    
    await set(tankPositionsRef, tankPositions);
    
    console.log('[updatePlanTankPositionsRealtime] Successfully updated tank positions:', tankPositions);
    return true;
  } catch (error) {
    console.error('[updatePlanTankPositionsRealtime] Error updating tank positions:', error);
    throw error;
  }
};
