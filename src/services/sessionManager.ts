import {
  ref,
  set,
  remove,
  get,
  update,
  onValue,
  onDisconnect
} from 'firebase/database';
import { database } from '../config/firebase';
import { clearPresence } from './presenceService';
import { USER_COLORS, MAX_USERS_PER_PLAN } from '../types/presence';
import {
  getActiveUserPath,
  getActiveUsersPath
} from './collaborationPaths';
import {
  COLLABORATION_UNAVAILABLE_MESSAGE,
  isPermissionDeniedError,
} from './firebaseErrorUtils';

class SessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.cleanupIntervals = new Map();
    this.heartbeatIntervals = new Map();
    this.CLEANUP_INTERVAL = 5 * 60 * 1000;
    this.SESSION_TIMEOUT = 10 * 60 * 1000;
    this.HEARTBEAT_INTERVAL = 30 * 1000;
    this.MAX_USERS = MAX_USERS_PER_PLAN;
  }

  async getActiveSessionCount(planId) {
    try {
      const sessionsRef = ref(database, getActiveUsersPath(planId));
      const snapshot = await get(sessionsRef);
      
      if (!snapshot.exists()) return 0;
      
      let count = 0;
      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();
        if (sessionData && sessionData.isActive) {
          count++;
        }
      });
      
      return count;
    } catch (error) {
      console.error('Error getting active session count:', error);
      return 0;
    }
  }

  getColorForSession(planId, existingSessionCount) {
    return USER_COLORS[existingSessionCount % USER_COLORS.length] ?? '#3b82f6';
  }

  normalizeSessionForSubscriber(sessionId, sessionData) {
    return {
      sessionId,
      userId: sessionData?.userId || '',
      displayName: sessionData?.displayName || 'User',
      email: sessionData?.email || '',
      color: sessionData?.color || '#3b82f6',
      isActive: Boolean(sessionData?.isActive),
    };
  }

  areSessionListsEqual(previousSessions = [], nextSessions = []) {
    if (previousSessions.length !== nextSessions.length) {
      return false;
    }

    return previousSessions.every((session, index) => {
      const otherSession = nextSessions[index];

      return (
        session.sessionId === otherSession?.sessionId &&
        session.userId === otherSession?.userId &&
        session.displayName === otherSession?.displayName &&
        session.email === otherSession?.email &&
        session.color === otherSession?.color &&
        session.isActive === otherSession?.isActive
      );
    });
  }

  async startSession(planId, sessionId, userData) {
    try {
      const currentCount = await this.getActiveSessionCount(planId);
      if (currentCount >= this.MAX_USERS) {
        throw new Error(`Plan has reached maximum collaborator limit (${this.MAX_USERS} users)`);
      }

      const color = this.getColorForSession(planId, currentCount);
      const sessionRef = ref(database, getActiveUserPath(planId, sessionId));

      const sessionData = {
        ...userData,
        sessionId,
        color,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true
      };

      // Set session data
      await set(sessionRef, sessionData);

      // Set up disconnect handler
      const disconnectRef = onDisconnect(sessionRef);
      await disconnectRef.remove();

      // Store session info
      this.activeSessions.set(sessionId, {
        planId,
        sessionRef,
        disconnectRef,
        userData
      });

      // Start heartbeat for this session
      this.startHeartbeat(planId, sessionId);

      // Start cleanup monitoring for this plan
      this.startCleanupMonitoring(planId);

      return true;
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        const permissionError = new Error(COLLABORATION_UNAVAILABLE_MESSAGE) as Error & { code?: string };
        permissionError.code = 'PERMISSION_DENIED';
        throw permissionError;
      }

      console.error('Error starting session:', error);
      throw new Error('Failed to start collaborative session');
    }
  }

  /**
   * End a collaborative session
   */
  async endSession(sessionId) {
    try {
      const sessionInfo = this.activeSessions.get(sessionId);
      if (!sessionInfo) return;

      const { planId, sessionRef } = sessionInfo;

      await remove(sessionRef);

      await clearPresence(planId, sessionId);

      this.stopHeartbeat(sessionId);

      this.activeSessions.delete(sessionId);

      const hasOtherSessions = Array.from(this.activeSessions.values())
        .some(session => session.planId === planId);
      
      if (!hasOtherSessions) {
        this.stopCleanupMonitoring(planId);
      }

      return true;
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        this.stopHeartbeat(sessionId);
        this.activeSessions.delete(sessionId);
        return false;
      }

      console.error('Error ending session:', error);
      throw new Error('Failed to end collaborative session');
    }
  }

  /**
   * Start heartbeat for a session
   */
  startHeartbeat(planId, sessionId) {
    // Clear existing heartbeat if any
    this.stopHeartbeat(sessionId);

    const heartbeatInterval = setInterval(async () => {
      try {
        const activityRef = ref(database, `${getActiveUserPath(planId, sessionId)}/lastActivity`);
        await set(activityRef, Date.now());
      } catch (error) {
        console.error('Error updating heartbeat:', error);
        // If heartbeat fails, the session might be invalid
        this.endSession(sessionId);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(sessionId, heartbeatInterval);
  }

  /**
   * Stop heartbeat for a session
   */
  stopHeartbeat(sessionId) {
    const interval = this.heartbeatIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(sessionId);
    }
  }

  /**
   * Start cleanup monitoring for a plan
   */
  startCleanupMonitoring(planId) {
    // Don't start if already monitoring
    if (this.cleanupIntervals.has(planId)) return;

    const cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupInactiveSessions(planId);
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL);

    this.cleanupIntervals.set(planId, cleanupInterval);
  }

  /**
   * Stop cleanup monitoring for a plan
   */
  stopCleanupMonitoring(planId) {
    const interval = this.cleanupIntervals.get(planId);
    if (interval) {
      clearInterval(interval);
      this.cleanupIntervals.delete(planId);
    }
  }

  /**
   * Clean up inactive sessions for a plan
   */
  async cleanupInactiveSessions(planId) {
    try {
      const sessionsRef = ref(database, getActiveUsersPath(planId));
      const snapshot = await get(sessionsRef);

      if (!snapshot.exists()) {
        // No sessions exist, stop monitoring
        this.stopCleanupMonitoring(planId);
        return;
      }

      const now = Date.now();
      const updates = {};
      let hasActiveSessions = false;

      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();
        const sessionId = childSnapshot.key;
        const lastActivity = sessionData.lastActivity;

        if (lastActivity && (now - lastActivity) > this.SESSION_TIMEOUT) {
          // Mark for removal
          updates[`${getActiveUsersPath(planId)}/${sessionId}`] = null;

          // Also remove from local tracking if it exists
          if (this.activeSessions.has(sessionId)) {
            this.stopHeartbeat(sessionId);
            this.activeSessions.delete(sessionId);
          }
        } else {
          hasActiveSessions = true;
        }
      });

      // Apply cleanup updates
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }

      // If no active sessions remain, stop monitoring
      if (!hasActiveSessions) {
        this.stopCleanupMonitoring(planId);
      }
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }

  /**
   * Get active sessions for a plan
   */
  async getActiveSessions(planId) {
    try {
      const sessionsRef = ref(database, getActiveUsersPath(planId));
      const snapshot = await get(sessionsRef);
      
      const sessions = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const sessionData = childSnapshot.val();
          if (sessionData && sessionData.isActive) {
            sessions.push({
              sessionId: childSnapshot.key,
              ...sessionData
            });
          }
        });
      }
      
      return sessions;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  /**
   * Subscribe to session changes for a plan
   */
  subscribeToSessions(planId, callback, options = {}) {
    const sessionsRef = ref(database, getActiveUsersPath(planId));
    let lastEmittedSessions = null;

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const sessions = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const sessionData = childSnapshot.val();
          if (sessionData && sessionData.isActive) {
            sessions.push(this.normalizeSessionForSubscriber(childSnapshot.key, sessionData));
          }
        });
      }

      if (lastEmittedSessions && this.areSessionListsEqual(lastEmittedSessions, sessions)) {
        return;
      }

      lastEmittedSessions = sessions;
      callback(sessions);
    }, (error) => {
      options.onError?.(error);
      if (!options.onError || !isPermissionDeniedError(error)) {
        console.error('Error listening to session changes:', error);
      }
      callback([]);
    });

    return unsubscribe;
  }

  /**
   * Cleanup all sessions and intervals
   */
  cleanup() {
    // End all active sessions
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => {
      this.endSession(sessionId);
    });

    // Clear all cleanup intervals
    this.cleanupIntervals.forEach((interval, planId) => {
      clearInterval(interval);
    });
    this.cleanupIntervals.clear();

    // Clear all heartbeat intervals
    this.heartbeatIntervals.forEach((interval, sessionId) => {
      clearInterval(interval);
    });
    this.heartbeatIntervals.clear();
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sessionManager.cleanup();
  });
}

export default sessionManager;
