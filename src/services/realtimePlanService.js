import {
  ref,
  push,
  set,
  get,
  remove,
  update,
  serverTimestamp,
  onValue,
  off
} from 'firebase/database';
import { database } from '../config/firebase';
import { initializePlanOwnership, trackPlanAccess, getUserAccessiblePlans } from './planAccessService';

const PLANS_PATH = 'plans';

/**
 * Create a new mitigation plan
 */
export const createPlan = async (userId, planData) => {
  try {
    // Helper function to get boss name from ID
    const getBossName = (bossId) => {
      const bossNames = {
        'ketuduke': 'Ketuduke',
        'lala': 'Lala',
        'statice': 'Statice',
        'dancing-green-m5s': 'Dancing Green (M5S)',
        'sugar-riot': 'Sugar Riot (M6S)',
        'brute-abominator-m7s': 'Brute Abominator (M7S)',
        'howling-blade-m8s': 'Howling Blade (M8S)',
        'necron': 'Necron'
      };
      return bossNames[bossId] || 'Unknown Boss';
    };

    // Ensure all required fields are present with proper defaults
    const bossId = planData.selectedBoss?.id || planData.bossId || 'ketuduke';
    const basePlanDoc = {
      title: planData.title || planData.name || 'Untitled Plan',
      selectedBoss: planData.selectedBoss || {
        id: bossId,
        name: getBossName(bossId),
        actions: {}
      },
      selectedJobs: planData.selectedJobs || {},
      tankPositions: planData.tankPositions || planData.tankAssignments || {
        mainTank: null,
        offTank: null
      },
      assignedMitigations: planData.assignedMitigations || planData.assignments || {},
      connectedUsers: {},
      isPublic: planData.isPublic || false,
      lastModifiedBy: userId,
      lastChangeOrigin: 'creation',
      version: 4.0, // New version for updated Realtime Database structure
      // Timeline references (optional)
      sourceTimelineId: planData.sourceTimelineId || null,
      sourceTimelineName: planData.sourceTimelineName || null,
      // Boss tags for flexible boss associations
      bossTags: planData.bossTags || (bossId ? [bossId] : [])
    };

    // Initialize ownership and access control
    const planDoc = initializePlanOwnership(null, userId, basePlanDoc);

    console.log('[createPlan] Creating plan with data:', {
      title: planDoc.title,
      selectedBoss: planDoc.selectedBoss?.id,
      selectedJobsKeys: planDoc.selectedJobs ? Object.keys(planDoc.selectedJobs) : [],
      assignedMitigationsKeys: planDoc.assignedMitigations ? Object.keys(planDoc.assignedMitigations) : [],
      ownerId: planDoc.ownerId
    });

    const plansRef = ref(database, PLANS_PATH);
    const newPlanRef = push(plansRef);
    await set(newPlanRef, planDoc);

    console.log('[createPlan] Plan created successfully with ID:', newPlanRef.key);
    return { id: newPlanRef.key, ...planDoc };
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

    // Prepare updates object for partial update
    const updates = {};
    Object.entries(planData).forEach(([key, value]) => {
      updates[`${PLANS_PATH}/${planId}/${key}`] = value;
    });

    // Add timestamp
    updates[`${PLANS_PATH}/${planId}/updatedAt`] = serverTimestamp();

    console.log('[updatePlan] Firebase updates:', updates);

    // Use update() for partial updates instead of set() which replaces everything
    await update(ref(database), updates);

    console.log('[updatePlan] Update successful');

    // Return the updated data
    return { id: planId, ...planData, updatedAt: Date.now() };
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
      console.log('[getPlan] Retrieved plan data:', {
        id: planId,
        name: planData.name,
        bossId: planData.bossId,
        selectedJobsKeys: Object.keys(planData.selectedJobs || {}),
        assignmentsKeys: Object.keys(planData.assignments || {}),
        hasUserId: !!planData.userId,
        isPublic: !!planData.isPublic
      });

      // Apply backward compatibility migration
      const { migratePlanOwnership } = await import('./planAccessService');
      const migratedPlanData = migratePlanOwnership(planId, planData);

      // Ensure all required fields exist with proper defaults
      const completePlan = {
        id: planId,
        name: migratedPlanData.title || migratedPlanData.name || 'Untitled Plan',
        description: migratedPlanData.description || '',
        bossId: migratedPlanData.bossId || 'ketuduke',
        selectedJobs: migratedPlanData.selectedJobs || {},
        assignments: migratedPlanData.assignments || {},
        tankPositions: migratedPlanData.tankPositions || {},
        healthSettings: migratedPlanData.healthSettings || {},
        isPublic: migratedPlanData.isPublic || false,
        userId: migratedPlanData.userId,
        ownerId: migratedPlanData.ownerId,
        accessedBy: migratedPlanData.accessedBy || {},
        createdAt: migratedPlanData.createdAt,
        updatedAt: migratedPlanData.updatedAt,
        lastAccessedAt: migratedPlanData.lastAccessedAt,
        version: migratedPlanData.version || 3.0,
        lastModifiedBy: migratedPlanData.lastModifiedBy,
        lastChangeOrigin: migratedPlanData.lastChangeOrigin
      };

      // If migration added fields, update the plan in Firebase
      if (!planData.accessedBy || !planData.ownerId) {
        console.log('[getPlan] Migrating plan to new schema:', planId);
        try {
          await update(planRef, {
            ownerId: completePlan.ownerId,
            accessedBy: completePlan.accessedBy,
            lastAccessedAt: completePlan.lastAccessedAt
          });
        } catch (updateError) {
          console.warn('[getPlan] Failed to update plan with migration data:', updateError);
          // Don't throw error - plan can still be used
        }
      }

      return completePlan;
    } else {
      throw new Error('Plan not found');
    }
  } catch (error) {
    console.error('Error getting plan:', error);

    // Provide more specific error messages
    if (error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
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
      await trackPlanAccess(planId, userId, false);
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
    return await getUserAccessiblePlans(userId, false);
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
      console.log('[subscribeToPlan] Received plan update:', {
        id: planId,
        name: planData.title || planData.name,
        bossId: planData.bossId,
        selectedJobsKeys: Object.keys(planData.selectedJobs || {}),
        assignmentsKeys: Object.keys(planData.assignments || {}),
        lastChangeOrigin: planData.lastChangeOrigin
      });

      // Ensure all required fields exist with proper defaults
      const completePlan = {
        id: planId,
        name: planData.title || planData.name || 'Untitled Plan',
        description: planData.description || '',
        bossId: planData.bossId || 'ketuduke',
        selectedJobs: planData.selectedJobs || {},
        assignments: planData.assignments || {},
        tankPositions: planData.tankPositions || planData.tankAssignments || {},
        healthSettings: planData.healthSettings || {},
        isPublic: planData.isPublic || false,
        userId: planData.userId,
        createdAt: planData.createdAt,
        updatedAt: planData.updatedAt,
        version: planData.version || 3.0,
        lastModifiedBy: planData.lastModifiedBy,
        lastChangeOrigin: planData.lastChangeOrigin,
        // Timeline references (optional)
        sourceTimelineId: planData.sourceTimelineId || null,
        sourceTimelineName: planData.sourceTimelineName || null,
        // Boss tags for flexible boss associations
        bossTags: planData.bossTags || (planData.bossId ? [planData.bossId] : [])
      };

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

  const unsubscribe = onValue(plansRef, (snapshot) => {
    const plans = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const planData = childSnapshot.val();
        // Only include plans owned by this user (check both userId and ownerId for compatibility)
        if (planData && (planData.ownerId === userId || planData.userId === userId)) {
          // Transform the plan data to ensure consistent field mapping
          const transformedPlan = {
            id: childSnapshot.key,
            name: planData.title || planData.name || 'Untitled Plan',
            description: planData.description || '',
            bossId: planData.bossId || 'ketuduke',
            selectedJobs: planData.selectedJobs || {},
            assignments: planData.assignments || {},
            tankPositions: planData.tankPositions || planData.tankAssignments || {},
            isPublic: planData.isPublic || false,
            userId: planData.userId,
            ownerId: planData.ownerId,
            createdAt: planData.createdAt,
            updatedAt: planData.updatedAt,
            version: planData.version || 3.0,
            lastModifiedBy: planData.lastModifiedBy,
            lastChangeOrigin: planData.lastChangeOrigin,
            // Timeline references (optional)
            sourceTimelineId: planData.sourceTimelineId || null,
            sourceTimelineName: planData.sourceTimelineName || null,
            // Boss tags for flexible boss associations
            bossTags: planData.bossTags || (planData.bossId ? [planData.bossId] : [])
          };
          plans.push(transformedPlan);
        }
      });
    }

    // Sort by updatedAt in descending order (most recent first)
    plans.sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || 0;
      const bTime = b.updatedAt || b.createdAt || 0;
      return bTime - aTime;
    });

    callback(plans);
  }, (error) => {
    console.error('Error listening to user plans changes:', error);
    callback([], error);
  });

  return () => off(plansRef, 'value', unsubscribe);
};

/**
 * Update specific fields of a plan for collaborative editing
 */
export const updatePlanField = async (planId, fieldPath, value, userId = null) => {
  try {
    const fieldRef = ref(database, `${PLANS_PATH}/${planId}/${fieldPath}`);
    await set(fieldRef, value);

    // Update the plan's last modified timestamp and user
    const metaRef = ref(database, `${PLANS_PATH}/${planId}`);
    const metaUpdate = {
      updatedAt: serverTimestamp()
    };

    if (userId) {
      metaUpdate.lastModifiedBy = userId;
    }

    await set(metaRef, metaUpdate);

    return true;
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

    // Get current plan data first
    const planRef = ref(database, `${PLANS_PATH}/${planId}`);
    const snapshot = await get(planRef);

    if (!snapshot.exists()) {
      throw new Error('Plan not found');
    }

    const currentPlan = snapshot.val();

    // Prepare the updated plan data
    const updatedPlan = {
      ...currentPlan,
      [fieldPath]: value,
      updatedAt: serverTimestamp()
    };

    if (userId) {
      updatedPlan.lastModifiedBy = userId;
    }

    if (sessionId) {
      updatedPlan.lastChangeOrigin = sessionId;
    }

    console.log('[updatePlanFieldWithOrigin] Executing single plan update');
    await set(planRef, updatedPlan);
    console.log('[updatePlanFieldWithOrigin] Update completed successfully');
    return true;
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
    const updates = {};

    // Add all field updates
    Object.entries(fields).forEach(([fieldPath, value]) => {
      updates[`${PLANS_PATH}/${planId}/${fieldPath}`] = value;
    });

    // Add metadata
    updates[`${PLANS_PATH}/${planId}/updatedAt`] = serverTimestamp();

    if (userId) {
      updates[`${PLANS_PATH}/${planId}/lastModifiedBy`] = userId;
    }

    if (sessionId) {
      updates[`${PLANS_PATH}/${planId}/lastChangeOrigin`] = sessionId;
    }

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

      // Always trigger callback on first load, then filter by origin
      if (isFirstLoad || !sessionId || changeOrigin !== sessionId) {
        console.log('[subscribeToPlanWithOrigin] Loading plan data:', {
          planId,
          isFirstLoad,
          changeOrigin,
          sessionId,
          name: planData.name,
          bossId: planData.bossId,
          selectedJobsKeys: Object.keys(planData.selectedJobs || {}),
          assignmentsKeys: Object.keys(planData.assignments || {})
        });

        // Ensure all required fields exist with proper defaults
        const completePlan = {
          id: planId,
          name: planData.title || planData.name || 'Untitled Plan',
          description: planData.description || '',
          bossId: planData.bossId || 'ketuduke',
          selectedJobs: planData.selectedJobs || {},
          assignments: planData.assignments || {},
          tankPositions: planData.tankPositions || planData.tankAssignments || {},
          healthSettings: planData.healthSettings || {},
          isPublic: planData.isPublic || false,
          userId: planData.userId,
          createdAt: planData.createdAt,
          updatedAt: planData.updatedAt,
          version: planData.version || 3.0,
          lastModifiedBy: planData.lastModifiedBy,
          lastChangeOrigin: planData.lastChangeOrigin,
          // Timeline references (optional)
          sourceTimelineId: planData.sourceTimelineId || null,
          sourceTimelineName: planData.sourceTimelineName || null,
          // Boss tags for flexible boss associations
          bossTags: planData.bossTags || (planData.bossId ? [planData.bossId] : [])
        };

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

/**
 * Session management functions
 */

/**
 * Clean up inactive sessions (older than 10 minutes)
 */
export const cleanupInactiveSessions = async (planId) => {
  try {
    const sessionsRef = ref(database, `plans/${planId}/collaboration/activeUsers`);
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
        updates[`plans/${planId}/collaboration/activeUsers/${childSnapshot.key}`] = null;
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
    const sessionsRef = ref(database, `plans/${planId}/collaboration/activeUsers`);
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
  const collaborationRef = ref(database, `plans/${planId}/collaboration/activeUsers`);

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
    if (error.message?.includes('Permission denied')) {
      throw new Error('Permission denied: You do not have access to this plan');
    } else {
      throw new Error('Failed to ensure plan structure');
    }
  }
};
