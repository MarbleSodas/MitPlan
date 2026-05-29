/**
 * Plan Collaboration Service
 * 
 * Job assignments and active user tracking for collaborative editing.
 */

import { ref, get, update, runTransaction } from 'firebase/database';
import { database } from '../../config/firebase';
import { getActiveUsersPath, getJobAssignmentPath, getJobAssignmentsPath } from '../collaborationPaths';

/**
 * Claim a job in a collaborative session
 */
export const claimJob = async (
  planId: string,
  jobId: string,
  userId: string,
  displayName: string,
  color: string
): Promise<boolean> => {
  try {
    const jobAssignmentsRef = ref(database, getJobAssignmentsPath(planId));

    const result = await runTransaction(jobAssignmentsRef, (currentAssignments: Record<string, unknown> | null) => {
      const assignments = (currentAssignments || {}) as Record<string, { userId?: string }>;

      if (assignments[jobId] && assignments[jobId].userId !== userId) {
        return undefined; // Abort transaction
      }

      const userAlreadyHasJob = Object.entries(assignments).some(
        ([existingJobId, assignment]) =>
          existingJobId !== jobId && assignment?.userId === userId
      );

      if (userAlreadyHasJob) {
        return undefined; // Abort transaction
      }

      return {
        ...assignments,
        [jobId]: {
          userId,
          displayName,
          color,
          assignedAt: Date.now(),
        },
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

/**
 * Release a claimed job
 */
export const releaseJob = async (
  planId: string,
  jobId: string,
  userId: string
): Promise<boolean> => {
  try {
    const jobRef = ref(database, getJobAssignmentPath(planId, jobId));

    const result = await runTransaction(jobRef, (currentAssignment: { userId?: string } | null) => {
      if (!currentAssignment) {
        return null; // Already empty
      }

      if (currentAssignment.userId !== userId) {
        return undefined; // Abort - not the owner
      }

      return null; // Remove
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

/**
 * Subscribe to job assignments changes
 */
export const subscribeToJobAssignments = (
  planId: string,
  callback: (assignments: Record<string, JobAssignment>) => void
): (() => void) => {
  const { onValue, off } = require('firebase/database');
  const jobAssignmentsRef = ref(database, getJobAssignmentsPath(planId));

  const unsubscribe = onValue(jobAssignmentsRef, (snapshot: { exists: () => boolean; val: () => Record<string, JobAssignment> }) => {
    const assignments = snapshot.exists() ? snapshot.val() : {};
    callback(assignments);
  }, (error: Error) => {
    console.error('[subscribeToJobAssignments] Error:', error);
    callback({});
  });

  return () => off(jobAssignmentsRef, 'value', unsubscribe);
};

export interface JobAssignment {
  userId: string;
  displayName: string;
  color: string;
  assignedAt: number;
}

/**
 * Get the current job assigned to a user
 */
export const getUserCurrentJob = async (planId: string, userId: string): Promise<string | null> => {
  try {
    const jobAssignmentsRef = ref(database, getJobAssignmentsPath(planId));
    const snapshot = await get(jobAssignmentsRef);

    if (!snapshot.exists()) return null;

    const assignments = snapshot.val() as Record<string, JobAssignment>;
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

// ============================================================================
// Active Collaborators (Sessions)
// ============================================================================

/**
 * Get active collaborators for a plan
 */
export const getActiveCollaborators = async (planId: string): Promise<ActiveCollaborator[]> => {
  try {
    const sessionsRef = ref(database, getActiveUsersPath(planId));
    const snapshot = await get(sessionsRef);

    const collaborators: ActiveCollaborator[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot: { key: string; val: () => ActiveSession }) => {
        const sessionData = childSnapshot.val();
        if (sessionData && sessionData.isActive) {
          collaborators.push({
            sessionId: childSnapshot.key,
            ...sessionData,
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

export interface ActiveSession {
  sessionId?: string;
  displayName: string;
  userId?: string;
  color: string;
  isActive: boolean;
  lastActivity: number;
  joinedAt: number;
  currentPlanId?: string;
}

export interface ActiveCollaborator extends ActiveSession {
  sessionId: string;
}

/**
 * Check if a plan is currently being collaborated on
 */
export const isPlanBeingCollaborated = async (planId: string): Promise<boolean> => {
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
export const subscribeToCollaboration = (
  planId: string,
  callback: (collaborators: ActiveCollaborator[]) => void
): (() => void) => {
  const { onValue, off } = require('firebase/database');
  const collaborationRef = ref(database, getActiveUsersPath(planId));

  const unsubscribe = onValue(collaborationRef, (snapshot: { exists: () => boolean; forEach: (cb: (child: { key: string; val: () => ActiveSession }) => void) => void }) => {
    const collaborators: ActiveCollaborator[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot: { key: string; val: () => ActiveSession }) => {
        const sessionData = childSnapshot.val();
        if (sessionData && sessionData.isActive) {
          collaborators.push({
            sessionId: childSnapshot.key,
            ...sessionData,
          });
        }
      });
    }
    callback(collaborators);
  }, (error: Error) => {
    console.error('Error listening to collaboration changes:', error);
    callback([]);
  });

  return () => off(collaborationRef, 'value', unsubscribe);
};

/**
 * Clean up inactive sessions (older than 10 minutes)
 */
export const cleanupInactiveSessions = async (planId: string): Promise<void> => {
  try {
    const sessionsRef = ref(database, getActiveUsersPath(planId));
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) return;

    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);

    const updates: Record<string, null> = {};

    snapshot.forEach((childSnapshot: { key: string; val: () => ActiveSession }) => {
      const sessionData = childSnapshot.val();
      const lastActivity = sessionData.lastActivity;

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
