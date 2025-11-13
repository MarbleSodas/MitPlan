import {
  ref,
  set,
  remove,
  get,
  onValue,
  off,
  onDisconnect
} from 'firebase/database';
import { database } from '../config/firebase';

class SessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.cleanupIntervals = new Map();
    this.heartbeatIntervals = new Map();
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    this.SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    this.HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  }

  /**
   * Start a collaborative session for a plan
   */
  async startSession(planId, sessionId, userData) {
    try {
      const sessionRef = ref(database, `plans/${planId}/collaboration/activeUsers/${sessionId}`);

      const sessionData = {
        ...userData,
        sessionId,
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

      // Remove session from database
      await remove(sessionRef);

      // Stop heartbeat
      this.stopHeartbeat(sessionId);

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Check if we should stop cleanup monitoring for this plan
      const hasOtherSessions = Array.from(this.activeSessions.values())
        .some(session => session.planId === planId);
      
      if (!hasOtherSessions) {
        this.stopCleanupMonitoring(planId);
      }

      return true;
    } catch (error) {
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
        const activityRef = ref(database, `plans/${planId}/collaboration/activeUsers/${sessionId}/lastActivity`);
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
      const sessionsRef = ref(database, `shared/${planId}/activeUsers`);
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
          updates[`shared/${planId}/activeUsers/${sessionId}`] = null;

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
        await set(ref(database), updates);
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
      const sessionsRef = ref(database, `collaboration/plans/${planId}/users`);
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
  subscribeToSessions(planId, callback) {
    const sessionsRef = ref(database, `plans/${planId}/collaboration/activeUsers`);

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
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
      callback(sessions);
    }, (error) => {
      console.error('Error listening to session changes:', error);
      callback([]);
    });

    return () => off(sessionsRef, 'value', unsubscribe);
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
