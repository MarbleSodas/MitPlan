export const RECENT_LOGIN_MAX_AGE_SECONDS = 5 * 60;

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

const getAuthTimeSeconds = (auth) => {
  const authTime = auth?.token?.auth_time;
  return typeof authTime === 'number' ? authTime : Number(authTime || 0);
};

export function assertDeleteAccountRequest(request, HttpsErrorClass) {
  const uid = request?.auth?.uid;

  if (!uid) {
    throw new HttpsErrorClass('unauthenticated', 'You must be signed in to delete your account.');
  }

  if (request?.data?.confirm !== true) {
    throw new HttpsErrorClass('invalid-argument', 'Account deletion must be explicitly confirmed.');
  }

  const authTimeSeconds = getAuthTimeSeconds(request.auth);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!authTimeSeconds || nowSeconds - authTimeSeconds > RECENT_LOGIN_MAX_AGE_SECONDS) {
    throw new HttpsErrorClass(
      'failed-precondition',
      'Please sign in again before deleting your account.'
    );
  }

  return uid;
}

const getPlanShareToken = (plan) => (
  isRecord(plan?.shareSettings) ? plan.shareSettings.viewToken || null : null
);

const deleteCollaborationRoom = (updates, roomId) => {
  updates[`planCollaboration/${roomId}`] = null;
};

const deletePlanArtifacts = (updates, planId, plan, deletedShareTokens) => {
  updates[`plans/${planId}`] = null;
  deleteCollaborationRoom(updates, `plan:${planId}`);
  deleteCollaborationRoom(updates, planId);

  const viewToken = getPlanShareToken(plan);
  if (viewToken) {
    deletedShareTokens.add(viewToken);
    updates[`planShareViews/${viewToken}`] = null;
    updates[`planShareViewTracking/${viewToken}`] = null;
  }
};

const deleteTimelineArtifacts = (updates, timelineId) => {
  updates[`timelines/${timelineId}`] = null;
  deleteCollaborationRoom(updates, `timeline:${timelineId}`);
  deleteCollaborationRoom(updates, timelineId);
};

const scrubCollaborationRoom = (updates, roomId, roomData, uid) => {
  if (!isRecord(roomData)) {
    return;
  }

  const sessionIdsToRemove = new Set();

  if (isRecord(roomData.activeUsers)) {
    Object.entries(roomData.activeUsers).forEach(([sessionId, session]) => {
      if (session?.userId === uid) {
        sessionIdsToRemove.add(sessionId);
        updates[`planCollaboration/${roomId}/activeUsers/${sessionId}`] = null;
      }
    });
  }

  if (isRecord(roomData.presence)) {
    Object.entries(roomData.presence).forEach(([sessionId, presence]) => {
      if (sessionIdsToRemove.has(sessionId) || presence?.userId === uid) {
        updates[`planCollaboration/${roomId}/presence/${sessionId}`] = null;
      }
    });
  }

  if (isRecord(roomData.jobAssignments)) {
    Object.entries(roomData.jobAssignments).forEach(([jobId, assignment]) => {
      if (assignment?.userId === uid) {
        updates[`planCollaboration/${roomId}/jobAssignments/${jobId}`] = null;
      }
    });
  }
};

const deleteDeletedPlanIndexes = (updates, rootData, deletedPlanIds) => {
  if (deletedPlanIds.size === 0) {
    return;
  }

  if (isRecord(rootData.userProfiles)) {
    Object.keys(rootData.userProfiles).forEach((profileUid) => {
      deletedPlanIds.forEach((planId) => {
        updates[`userProfiles/${profileUid}/accessedPlans/${planId}`] = null;
      });
    });
  }

  if (isRecord(rootData.planCollaborationsByUser)) {
    Object.keys(rootData.planCollaborationsByUser).forEach((profileUid) => {
      deletedPlanIds.forEach((planId) => {
        updates[`planCollaborationsByUser/${profileUid}/${planId}`] = null;
      });
    });
  }
};

const deleteDeletedTimelineIndexes = (updates, rootData, deletedTimelineIds) => {
  if (deletedTimelineIds.size === 0 || !isRecord(rootData.userCollections)) {
    return;
  }

  Object.keys(rootData.userCollections).forEach((profileUid) => {
    deletedTimelineIds.forEach((timelineId) => {
      updates[`userCollections/${profileUid}/timelines/${timelineId}`] = null;
    });
  });
};

export function buildAccountDeletionUpdates(rootData = {}, uid) {
  const updates = {
    [`userProfiles/${uid}`]: null,
    [`userCollections/${uid}`]: null,
    [`planCollaborationsByUser/${uid}`]: null,
  };
  const deletedPlanIds = new Set();
  const deletedTimelineIds = new Set();
  const deletedShareTokens = new Set();
  let scrubbedPlans = 0;
  let scrubbedTimelines = 0;

  if (isRecord(rootData.plans)) {
    Object.entries(rootData.plans).forEach(([planId, plan]) => {
      if (!isRecord(plan)) {
        return;
      }

      if (plan.ownerId === uid || plan.userId === uid) {
        deletedPlanIds.add(planId);
        deletePlanArtifacts(updates, planId, plan, deletedShareTokens);
        return;
      }

      let scrubbed = false;
      if (isRecord(plan.collaborators) && plan.collaborators[uid]) {
        updates[`plans/${planId}/collaborators/${uid}`] = null;
        scrubbed = true;
      }

      if (isRecord(plan.accessedBy) && plan.accessedBy[uid]) {
        updates[`plans/${planId}/accessedBy/${uid}`] = null;
        scrubbed = true;
      }

      if (plan.lastModifiedBy === uid) {
        updates[`plans/${planId}/lastModifiedBy`] = null;
        scrubbed = true;
      }

      if (scrubbed) {
        scrubbedPlans += 1;
      }
    });
  }

  if (isRecord(rootData.planShareViews)) {
    Object.entries(rootData.planShareViews).forEach(([viewToken, shareView]) => {
      if (deletedShareTokens.has(viewToken)) {
        return;
      }

      if (shareView?.ownerId === uid || deletedPlanIds.has(shareView?.planId)) {
        updates[`planShareViews/${viewToken}`] = null;
        updates[`planShareViewTracking/${viewToken}`] = null;
        deletedShareTokens.add(viewToken);
      }
    });
  }

  if (isRecord(rootData.planShareViewTracking)) {
    Object.entries(rootData.planShareViewTracking).forEach(([viewToken, tracking]) => {
      if (deletedShareTokens.has(viewToken)) {
        return;
      }

      if (isRecord(tracking?.viewers) && tracking.viewers[uid]) {
        updates[`planShareViewTracking/${viewToken}/viewers/${uid}`] = null;
      }
    });
  }

  if (isRecord(rootData.timelines)) {
    Object.entries(rootData.timelines).forEach(([timelineId, timeline]) => {
      if (!isRecord(timeline)) {
        return;
      }

      if (timeline.ownerId === uid || timeline.userId === uid) {
        deletedTimelineIds.add(timelineId);
        deleteTimelineArtifacts(updates, timelineId);
        return;
      }

      if (isRecord(timeline.likedBy) && timeline.likedBy[uid]) {
        const remainingLikeCount = Object.keys(timeline.likedBy)
          .filter((likedUserId) => likedUserId !== uid)
          .length;
        updates[`timelines/${timelineId}/likedBy/${uid}`] = null;
        updates[`timelines/${timelineId}/likeCount`] = remainingLikeCount;
        scrubbedTimelines += 1;
      }
    });
  }

  deleteDeletedPlanIndexes(updates, rootData, deletedPlanIds);
  deleteDeletedTimelineIndexes(updates, rootData, deletedTimelineIds);

  if (isRecord(rootData.planCollaboration)) {
    Object.entries(rootData.planCollaboration).forEach(([roomId, roomData]) => {
      if (updates[`planCollaboration/${roomId}`] === null) {
        return;
      }

      scrubCollaborationRoom(updates, roomId, roomData, uid);
    });
  }

  return {
    updates,
    deletedPlans: deletedPlanIds.size,
    deletedTimelines: deletedTimelineIds.size,
    scrubbedPlans,
    scrubbedTimelines,
  };
}

export async function cleanupCurrentUserAccount({ auth, database }, uid) {
  const rootSnapshot = await database.ref().once('value');
  const cleanup = buildAccountDeletionUpdates(rootSnapshot.val() || {}, uid);

  await database.ref().update(cleanup.updates);
  await auth.deleteUser(uid);

  return {
    deleted: true,
    deletedPlans: cleanup.deletedPlans,
    deletedTimelines: cleanup.deletedTimelines,
    scrubbedPlans: cleanup.scrubbedPlans,
    scrubbedTimelines: cleanup.scrubbedTimelines,
  };
}
