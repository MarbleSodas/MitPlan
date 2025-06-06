import {
  ref,
  set,
  get,
  push,
  remove,
  onValue,
  off,
  serverTimestamp,
  onDisconnect
} from 'firebase/database';
import { realtimeDb, auth } from '../config/firebase';

/**
 * Service for managing collaboration sessions
 * Handles session lifecycle, participant management, and change tracking
 */
class SessionManagementService {
  constructor() {
    this.auth = auth;
    this.realtimeDb = realtimeDb;
    this.listeners = new Map();
    this.currentSession = null;
  }

  /**
   * Start a new collaboration session for a plan
   * Supports both authenticated and anonymous session creators
   */
  async startSession(planId, planData, initiatorUserId = null) {
    try {
      const user = this.auth.currentUser;
      let ownerId, ownerName, isAuthenticated;

      if (user) {
        // Authenticated user
        ownerId = user.uid;
        ownerName = user.displayName || user.email || 'Anonymous User';
        isAuthenticated = true;
      } else if (initiatorUserId) {
        // Anonymous user
        ownerId = initiatorUserId;
        ownerName = `Anonymous User ${initiatorUserId.slice(-4)}`;
        isAuthenticated = false;
      } else {
        throw new Error('User ID required to start session');
      }

      // Check if session already exists
      const existingSession = await this.getSession(planId);
      if (existingSession && existingSession.status === 'active') {
        return {
          success: true,
          sessionId: existingSession.id,
          message: 'Joined existing collaboration session'
        };
      }

      const sessionId = `session_${Date.now()}_${ownerId}`;
      const sessionData = {
        id: sessionId,
        ownerId,
        ownerName,
        isOwnerAuthenticated: isAuthenticated,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        currentVersion: 1,
        lastSavedVersion: 0,
        planSnapshot: planData // Store initial plan state
      };

      // Create session
      const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
      await set(sessionRef, sessionData);

      // Add owner as participant
      await this.addParticipant(planId, ownerId, 'owner', {
        name: ownerName,
        joinedAt: serverTimestamp(),
        isAuthenticated
      });

      // Store initial version
      await this.saveVersion(planId, 1, planData, ownerId, 'session_start');

      this.currentSession = { planId, sessionId, ...sessionData };

      return {
        success: true,
        sessionId,
        message: 'Collaboration session started successfully'
      };
    } catch (error) {
      console.error('Start session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * End a collaboration session and persist changes
   */
  async endSession(planId, finalPlanData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const session = await this.getSession(planId);
      if (!session) {
        throw new Error('No active session found');
      }

      if (session.ownerId !== user.uid) {
        throw new Error('Only session owner can end the session');
      }

      // Import FirestoreService dynamically to avoid circular imports
      const { default: FirestoreService } = await import('./FirestoreService');

      // Create session backup before ending
      await FirestoreService.createSessionBackup(planId, session.id, finalPlanData);

      // Save session changes to the main plan in Firestore
      const saveResult = await FirestoreService.saveSessionChangesToPlan(planId, {
        sessionId: session.id,
        assignments: finalPlanData.assignments,
        selectedJobs: finalPlanData.selectedJobs,
        tankPositions: finalPlanData.tankPositions
      });

      if (!saveResult.success) {
        console.warn('Failed to save session changes to Firestore:', saveResult.message);
      }

      // Update session status
      const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
      await set(sessionRef, {
        ...session,
        status: 'ended',
        updatedAt: serverTimestamp(),
        endedAt: serverTimestamp(),
        finalPlanData,
        savedToFirestore: saveResult.success
      });

      // Save final version
      await this.saveVersion(planId, session.currentVersion + 1, finalPlanData, user.uid, 'session_end');

      // Clean up listeners
      this.cleanupSessionListeners(planId);

      // Clean up all collaboration data
      await this.cleanupAllCollaborationData(planId);

      this.currentSession = null;

      return {
        success: true,
        finalPlanData: saveResult.success ? saveResult.plan : finalPlanData,
        savedToFirestore: saveResult.success,
        message: saveResult.success
          ? 'Session ended and changes saved successfully'
          : 'Session ended but failed to save changes to main plan'
      };
    } catch (error) {
      console.error('End session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Pause a collaboration session
   */
  async pauseSession(planId) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const session = await this.getSession(planId);
      if (!session) {
        throw new Error('No session found');
      }

      if (session.ownerId !== user.uid) {
        throw new Error('Only session owner can pause the session');
      }

      const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
      await set(sessionRef, {
        ...session,
        status: 'paused',
        updatedAt: serverTimestamp(),
        pausedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Session paused successfully'
      };
    } catch (error) {
      console.error('Pause session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Resume a paused collaboration session
   */
  async resumeSession(planId) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const session = await this.getSession(planId);
      if (!session) {
        throw new Error('No session found');
      }

      if (session.ownerId !== user.uid) {
        throw new Error('Only session owner can resume the session');
      }

      const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
      await set(sessionRef, {
        ...session,
        status: 'active',
        updatedAt: serverTimestamp(),
        resumedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Session resumed successfully'
      };
    } catch (error) {
      console.error('Resume session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get current session for a plan
   */
  async getSession(planId) {
    try {
      const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
      const snapshot = await get(sessionRef);

      if (snapshot.exists()) {
        return snapshot.val();
      }

      return null;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Add participant to session
   */
  async addParticipant(planId, userId, role = 'editor', userData = {}) {
    try {
      const participantRef = ref(this.realtimeDb, `collaboration/${planId}/sessionParticipants/${userId}`);

      const participantData = {
        role,
        joinedAt: serverTimestamp(),
        ...userData
      };

      await set(participantRef, participantData);

      // Set up disconnect handler
      onDisconnect(participantRef).remove();

      return {
        success: true,
        message: 'Participant added successfully'
      };
    } catch (error) {
      console.error('Add participant error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(planId, userId) {
    try {
      const participantRef = ref(this.realtimeDb, `collaboration/${planId}/sessionParticipants/${userId}`);
      await set(participantRef, null);

      return {
        success: true,
        message: 'Participant removed successfully'
      };
    } catch (error) {
      console.error('Remove participant error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Track a change during the session
   */
  async trackChange(planId, changeType, changeData, version, authorId = null, authorName = null) {
    try {
      const user = this.auth.currentUser;
      let changeAuthor, changeAuthorName;

      if (user) {
        changeAuthor = user.uid;
        changeAuthorName = user.displayName || user.email || 'Anonymous User';
      } else if (authorId) {
        changeAuthor = authorId;
        changeAuthorName = authorName || `Anonymous User ${authorId.slice(-4)}`;
      } else {
        throw new Error('Author ID required to track changes');
      }

      const changeRef = push(ref(this.realtimeDb, `collaboration/${planId}/sessionChanges`));

      const changeRecord = {
        type: changeType,
        data: changeData,
        version,
        author: changeAuthor,
        authorName: changeAuthorName,
        timestamp: serverTimestamp(),
        applied: true,
        isAuthenticated: !!user
      };

      await set(changeRef, changeRecord);

      return {
        success: true,
        changeId: changeRef.key,
        message: 'Change tracked successfully'
      };
    } catch (error) {
      console.error('Track change error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Save a version of the plan during the session
   */
  async saveVersion(planId, version, planData, authorId, changeType = 'update') {
    try {
      const versionRef = ref(this.realtimeDb, `collaboration/${planId}/sessionVersions/v${version}`);

      const versionData = {
        version,
        data: planData,
        author: authorId,
        timestamp: serverTimestamp(),
        changeType
      };

      await set(versionRef, versionData);

      return {
        success: true,
        version,
        message: 'Version saved successfully'
      };
    } catch (error) {
      console.error('Save version error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Subscribe to session changes
   */
  subscribeToSession(planId, callback) {
    const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessionData = snapshot.val();
        callback(sessionData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Session subscription error:', error);
      callback(null);
    });

    // Store listener for cleanup
    this.listeners.set(`session_${planId}`, unsubscribe);

    return unsubscribe;
  }

  /**
   * Subscribe to session participants
   */
  subscribeToParticipants(planId, callback) {
    const participantsRef = ref(this.realtimeDb, `collaboration/${planId}/sessionParticipants`);

    const unsubscribe = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const participantsData = snapshot.val();
        const participants = Object.keys(participantsData).map(userId => ({
          userId,
          ...participantsData[userId]
        }));
        callback(participants);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Participants subscription error:', error);
      callback([]);
    });

    // Store listener for cleanup
    this.listeners.set(`participants_${planId}`, unsubscribe);

    return unsubscribe;
  }

  /**
   * Clean up session listeners
   */
  cleanupSessionListeners(planId) {
    const sessionListener = this.listeners.get(`session_${planId}`);
    const participantsListener = this.listeners.get(`participants_${planId}`);

    if (sessionListener) {
      sessionListener();
      this.listeners.delete(`session_${planId}`);
    }

    if (participantsListener) {
      participantsListener();
      this.listeners.delete(`participants_${planId}`);
    }
  }

  /**
   * Check if user is session owner
   */
  async isSessionOwner(planId, userId) {
    try {
      const session = await this.getSession(planId);
      return session && session.ownerId === userId;
    } catch (error) {
      console.error('Check session owner error:', error);
      return false;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(planId) {
    try {
      const session = await this.getSession(planId);
      if (!session) {
        return null;
      }

      const participantsRef = ref(this.realtimeDb, `collaboration/${planId}/sessionParticipants`);
      const changesRef = ref(this.realtimeDb, `collaboration/${planId}/sessionChanges`);

      const [participantsSnapshot, changesSnapshot] = await Promise.all([
        get(participantsRef),
        get(changesRef)
      ]);

      const participantCount = participantsSnapshot.exists() ?
        Object.keys(participantsSnapshot.val()).length : 0;

      const changeCount = changesSnapshot.exists() ?
        Object.keys(changesSnapshot.val()).length : 0;

      return {
        session,
        participantCount,
        changeCount,
        duration: session.createdAt ? Date.now() - session.createdAt : 0
      };
    } catch (error) {
      console.error('Get session stats error:', error);
      return null;
    }
  }

  /**
   * Clean up all collaboration data for a plan
   */
  async cleanupAllCollaborationData(planId) {
    try {
      console.log(`🧹 Cleaning up all collaboration data for plan: ${planId}`);

      // Remove all collaboration data
      const collaborationRef = ref(this.realtimeDb, `collaboration/${planId}`);
      await remove(collaborationRef);

      console.log(`✅ All collaboration data cleaned up for plan: ${planId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to cleanup collaboration data for plan ${planId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get session health status
   */
  async getSessionHealth(planId) {
    try {
      const session = await this.getSession(planId);
      if (!session) {
        return { healthy: false, message: 'No session found' };
      }

      // Check if session is active
      if (session.status !== 'active') {
        return {
          healthy: false,
          message: `Session is ${session.status}`,
          session
        };
      }

      // Check for active participants
      const participantsRef = ref(this.realtimeDb, `collaboration/${planId}/sessionParticipants`);
      const participantsSnapshot = await get(participantsRef);

      const participantCount = participantsSnapshot.exists()
        ? Object.keys(participantsSnapshot.val()).length
        : 0;

      // Check for active users
      const activeUsersRef = ref(this.realtimeDb, `collaboration/${planId}/activeUsers`);
      const activeUsersSnapshot = await get(activeUsersRef);

      const activeUserCount = activeUsersSnapshot.exists()
        ? Object.keys(activeUsersSnapshot.val()).length
        : 0;

      const now = Date.now();
      const sessionAge = now - (session.createdAt?.seconds ? session.createdAt.seconds * 1000 : now);

      return {
        healthy: true,
        session,
        participantCount,
        activeUserCount,
        sessionAge,
        message: `Session healthy with ${activeUserCount} active users`
      };

    } catch (error) {
      console.error('Session health check failed:', error);
      return {
        healthy: false,
        message: error.message,
        error
      };
    }
  }

  /**
   * Force end a session (for cleanup purposes)
   */
  async forceEndSession(planId, reason = 'forced_cleanup') {
    try {
      console.log(`🧹 Force ending session for plan ${planId} (reason: ${reason})`);

      const session = await this.getSession(planId);
      if (!session) {
        return { success: true, message: 'No session to end' };
      }

      // Get latest plan data
      const finalPlanData = session.initialPlanData || {};

      // Update session status to ended
      const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
      await set(sessionRef, {
        ...session,
        status: 'ended',
        endedAt: serverTimestamp(),
        endReason: reason,
        forcedEnd: true
      });

      // Try to save to Firestore if possible
      let saveResult = { success: false };
      try {
        const { default: FirestoreService } = await import('./FirestoreService');
        saveResult = await FirestoreService.savePlan(finalPlanData, planId);
      } catch (saveError) {
        console.warn('Failed to save plan during force end:', saveError);
      }

      // Clean up all data
      await this.cleanupAllCollaborationData(planId);

      console.log(`✅ Session force ended for plan: ${planId}`);
      return {
        success: true,
        savedToFirestore: saveResult.success,
        message: `Session force ended (${reason})`
      };

    } catch (error) {
      console.error(`❌ Failed to force end session for plan ${planId}:`, error);
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
export default new SessionManagementService();
