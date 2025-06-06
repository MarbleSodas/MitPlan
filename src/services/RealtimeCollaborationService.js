/**
 * Real-time Collaboration Service
 *
 * Provides real-time collaboration features using Firebase Realtime Database
 */

import {
  ref,
  set,
  push,
  onValue,
  off,
  remove,
  serverTimestamp,
  onDisconnect
} from 'firebase/database';
import { realtimeDb, auth } from '../config/firebase';
import SessionManagementService from './SessionManagementService';
import SessionCleanupService from './SessionCleanupService';

class RealtimeCollaborationService {
  constructor() {
    this.realtimeDb = realtimeDb;
    this.auth = auth;
    this.listeners = new Map();
    this.userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
  }

  /**
   * Join a plan collaboration room
   * Supports both authenticated and anonymous users for shared plans
   */
  async joinPlan(planId, userInfo = {}) {
    try {
      const user = this.auth.currentUser;

      // Generate user info for both authenticated and anonymous users
      let userId, userName, isAuthenticated;

      if (user) {
        // Authenticated user
        userId = user.uid;
        userName = userInfo.displayName || user.displayName || user.email || 'Anonymous User';
        isAuthenticated = true;
      } else {
        // Anonymous user - use provided user info or generate
        if (userInfo.userId) {
          // Use provided anonymous user ID (from DisplayNameContext)
          userId = userInfo.userId;
          userName = userInfo.displayName || `Anonymous User ${userId.slice(-4)}`;
        } else {
          // Fallback: generate a temporary ID
          userId = this.generateAnonymousUserId();
          userName = userInfo.displayName || `Anonymous User ${userId.slice(-4)}`;
        }
        isAuthenticated = false;
      }

      const userColor = this.getUserColor(userId);

      console.log('🚪 Joining plan collaboration:', { planId, userId, userName, isAuthenticated });

      // Check if there's an existing session, or create one if this is a shared plan
      let session = await SessionManagementService.getSession(planId);

      // If no session exists and this is a shared plan, create one automatically
      if (!session) {
        console.log('🚀 No session found, creating new session for shared plan:', planId);
        try {
          // Try to get the plan data to initialize the session
          const FirestoreService = (await import('./FirestoreService.js')).default;
          const planResult = await FirestoreService.getPlan(planId);
          if (planResult.success && (planResult.plan.isPublic || planResult.plan.isShared)) {
            const sessionResult = await SessionManagementService.startSession(planId, planResult.plan, userId);
            if (sessionResult.success) {
              session = await SessionManagementService.getSession(planId);
              console.log('✅ Created new collaboration session:', session);
            }
          }
        } catch (sessionError) {
          console.warn('⚠️ Failed to create session, continuing without:', sessionError);
        }
      }

      // Set user presence in the collaboration room
      const userRef = ref(this.realtimeDb, `collaboration/${planId}/activeUsers/${userId}`);

      await set(userRef, {
        id: userId,
        name: userName,
        color: userColor,
        joinedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isAuthenticated
      });

      // Set up disconnect handler to remove user when they leave
      onDisconnect(userRef).remove();

      // If there's an active session, add user as participant
      if (session && session.status === 'active') {
        await SessionManagementService.addParticipant(planId, userId, 'editor', {
          name: userName,
          color: userColor,
          isAuthenticated
        });
      }

      // Set up periodic heartbeat to update lastSeen with enhanced error handling
      const heartbeatInterval = setInterval(async () => {
        try {
          await set(ref(this.realtimeDb, `collaboration/${planId}/activeUsers/${userId}/lastSeen`),
                   serverTimestamp());

          // Update connection status
          await set(ref(this.realtimeDb, `collaboration/${planId}/activeUsers/${userId}/connectionStatus`), {
            status: 'connected',
            lastHeartbeat: serverTimestamp()
          });
        } catch (error) {
          console.error('Heartbeat error:', error);

          // Mark connection as unstable
          try {
            await set(ref(this.realtimeDb, `collaboration/${planId}/activeUsers/${userId}/connectionStatus`), {
              status: 'unstable',
              lastError: error.message,
              timestamp: serverTimestamp()
            });
          } catch (statusError) {
            console.error('Failed to update connection status:', statusError);
          }

          clearInterval(heartbeatInterval);
          this.listeners.delete(`heartbeat_${planId}`);
        }
      }, 30000); // Update every 30 seconds

      // Store interval for cleanup
      this.listeners.set(`heartbeat_${planId}`, heartbeatInterval);

      // Start session cleanup monitoring if this is the first user
      try {
        await SessionCleanupService.startMonitoring(planId);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to start session cleanup monitoring:', cleanupError);
      }

      return {
        success: true,
        userId,
        userColor,
        sessionActive: session && session.status === 'active',
        isSessionOwner: session && session.ownerId === userId,
        message: 'Joined collaboration successfully'
      };
    } catch (error) {
      console.error('Join plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Leave a plan collaboration room
   */
  async leavePlan(planId, anonymousUserId = null) {
    try {
      const user = this.auth.currentUser;
      let userId;

      if (user) {
        userId = user.uid;
      } else if (anonymousUserId) {
        userId = anonymousUserId;
      } else {
        return { success: true }; // No user to remove
      }

      // Remove user from active users
      await remove(ref(this.realtimeDb, `collaboration/${planId}/activeUsers/${userId}`));

      // Remove user selections
      await remove(ref(this.realtimeDb, `collaboration/${planId}/selections/${userId}`));

      // Clear heartbeat interval
      const heartbeatInterval = this.listeners.get(`heartbeat_${planId}`);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        this.listeners.delete(`heartbeat_${planId}`);
      }

      // Check if this was the last user and stop cleanup monitoring if needed
      try {
        const activeUsersRef = ref(this.realtimeDb, `collaboration/${planId}/activeUsers`);
        const snapshot = await get(activeUsersRef);

        if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
          console.log(`🧹 Last user left plan ${planId}, cleanup monitoring will handle session termination`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to check remaining users for cleanup:', error);
      }

      // Remove all listeners for this plan
      this.removeAllListeners(planId);

      return {
        success: true,
        message: 'Left collaboration successfully'
      };
    } catch (error) {
      console.error('Leave plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update user selection
   */
  async updateSelection(planId, elementId, selectionData = {}, anonymousUserId = null) {
    try {
      const user = this.auth.currentUser;
      let userId;

      if (user) {
        userId = user.uid;
      } else if (anonymousUserId) {
        userId = anonymousUserId;
      } else {
        throw new Error('User ID required for selection update');
      }
      const selectionRef = ref(this.realtimeDb, `collaboration/${planId}/selections/${userId}`);

      await set(selectionRef, {
        elementId,
        timestamp: serverTimestamp(),
        ...selectionData
      });

      return {
        success: true,
        message: 'Selection updated'
      };
    } catch (error) {
      console.error('Update selection error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Clear user selection
   */
  async clearSelection(planId, anonymousUserId = null) {
    try {
      const user = this.auth.currentUser;
      let userId;

      if (user) {
        userId = user.uid;
      } else if (anonymousUserId) {
        userId = anonymousUserId;
      } else {
        return { success: true }; // No user to clear selection for
      }
      await remove(ref(this.realtimeDb, `collaboration/${planId}/selections/${userId}`));

      return {
        success: true,
        message: 'Selection cleared'
      };
    } catch (error) {
      console.error('Clear selection error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Broadcast plan update to other users
   */
  async broadcastPlanUpdate(planId, updateData, anonymousUserId = null, anonymousUserName = null) {
    try {
      const user = this.auth.currentUser;
      let userId, userName;

      if (user) {
        userId = user.uid;
        userName = user.displayName || user.email || 'Anonymous User';
      } else if (anonymousUserId) {
        userId = anonymousUserId;
        userName = anonymousUserName || `Anonymous User ${anonymousUserId.slice(-4)}`;
      } else {
        throw new Error('User ID required for plan update broadcast');
      }

      // Check if there's an active session
      const session = await SessionManagementService.getSession(planId);

      const updateRef = push(ref(this.realtimeDb, `collaboration/${planId}/planUpdates`));

      const updateRecord = {
        type: updateData.type || 'plan_update',
        data: updateData.data || {},
        userId,
        userName,
        timestamp: serverTimestamp(),
        sessionId: session ? session.id : null,
        version: session ? session.currentVersion + 1 : 1,
        isAuthenticated: !!user
      };

      await set(updateRef, updateRecord);

      // If there's an active session, track the change
      if (session && session.status === 'active') {
        await SessionManagementService.trackChange(
          planId,
          updateData.type || 'plan_update',
          updateData.data || {},
          updateRecord.version
        );

        // Update session version
        const sessionRef = ref(this.realtimeDb, `collaboration/${planId}/session`);
        await set(sessionRef, {
          ...session,
          currentVersion: updateRecord.version,
          updatedAt: serverTimestamp()
        });
      }

      return {
        success: true,
        version: updateRecord.version,
        sessionActive: session && session.status === 'active',
        message: 'Plan update broadcasted'
      };
    } catch (error) {
      console.error('Broadcast plan update error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Listen to active users in a plan
   */
  subscribeToActiveUsers(planId, callback) {
    const usersRef = ref(this.realtimeDb, `collaboration/${planId}/activeUsers`);

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const users = [];
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        Object.keys(usersData).forEach(userId => {
          users.push({
            id: userId,
            ...usersData[userId]
          });
        });
      }
      callback(users);
    }, (error) => {
      console.error('Active users subscription error:', error);
      callback([]);
    });

    this.listeners.set(`activeUsers_${planId}`, unsubscribe);
    return () => {
      off(usersRef, 'value', unsubscribe);
      this.listeners.delete(`activeUsers_${planId}`);
    };
  }

  /**
   * Listen to user selections in a plan
   */
  subscribeToSelections(planId, callback) {
    const selectionsRef = ref(this.realtimeDb, `collaboration/${planId}/selections`);

    const unsubscribe = onValue(selectionsRef, (snapshot) => {
      const selections = {};
      if (snapshot.exists()) {
        const selectionsData = snapshot.val();
        Object.keys(selectionsData).forEach(userId => {
          selections[userId] = selectionsData[userId];
        });
      }
      callback(selections);
    }, (error) => {
      console.error('Selections subscription error:', error);
      callback({});
    });

    this.listeners.set(`selections_${planId}`, unsubscribe);
    return () => {
      off(selectionsRef, 'value', unsubscribe);
      this.listeners.delete(`selections_${planId}`);
    };
  }

  /**
   * Listen to plan updates from other users
   */
  subscribeToPlanUpdates(planId, callback) {
    const updatesRef = ref(this.realtimeDb, `collaboration/${planId}/planUpdates`);

    const unsubscribe = onValue(updatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatesData = snapshot.val();
        const updates = Object.keys(updatesData).map(key => ({
          id: key,
          ...updatesData[key]
        }));

        // Sort by timestamp and get the latest updates
        updates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(updates);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Plan updates subscription error:', error);
      callback([]);
    });

    this.listeners.set(`planUpdates_${planId}`, unsubscribe);
    return () => {
      off(updatesRef, 'value', unsubscribe);
      this.listeners.delete(`planUpdates_${planId}`);
    };
  }

  /**
   * Start a collaboration session for a plan
   */
  async startCollaborationSession(planId, planData) {
    try {
      const result = await SessionManagementService.startSession(planId, planData);

      if (result.success) {
        // Broadcast session start to all participants
        await this.broadcastPlanUpdate(planId, {
          type: 'session_started',
          data: {
            sessionId: result.sessionId,
            message: 'Collaboration session started'
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Start collaboration session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * End a collaboration session for a plan
   */
  async endCollaborationSession(planId, finalPlanData) {
    try {
      const result = await SessionManagementService.endSession(planId, finalPlanData);

      if (result.success) {
        // Broadcast session end to all participants
        await this.broadcastPlanUpdate(planId, {
          type: 'session_ended',
          data: {
            message: 'Collaboration session ended',
            finalPlanData: result.finalPlanData
          }
        });
      }

      return result;
    } catch (error) {
      console.error('End collaboration session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Pause a collaboration session
   */
  async pauseCollaborationSession(planId) {
    try {
      const result = await SessionManagementService.pauseSession(planId);

      if (result.success) {
        // Broadcast session pause to all participants
        await this.broadcastPlanUpdate(planId, {
          type: 'session_paused',
          data: {
            message: 'Collaboration session paused'
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Pause collaboration session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Resume a collaboration session
   */
  async resumeCollaborationSession(planId) {
    try {
      const result = await SessionManagementService.resumeSession(planId);

      if (result.success) {
        // Broadcast session resume to all participants
        await this.broadcastPlanUpdate(planId, {
          type: 'session_resumed',
          data: {
            message: 'Collaboration session resumed'
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Resume collaboration session error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get current session information
   */
  async getSessionInfo(planId) {
    try {
      return await SessionManagementService.getSession(planId);
    } catch (error) {
      console.error('Get session info error:', error);
      return null;
    }
  }

  /**
   * Check if user is session owner
   */
  async isSessionOwner(planId, userId) {
    try {
      return await SessionManagementService.isSessionOwner(planId, userId);
    } catch (error) {
      console.error('Check session owner error:', error);
      return false;
    }
  }

  /**
   * Subscribe to session changes
   */
  subscribeToSession(planId, callback) {
    return SessionManagementService.subscribeToSession(planId, callback);
  }

  /**
   * Subscribe to session participants
   */
  subscribeToSessionParticipants(planId, callback) {
    return SessionManagementService.subscribeToParticipants(planId, callback);
  }

  /**
   * Clean up old plan updates (keep only last 50)
   */
  async cleanupPlanUpdates(planId) {
    try {
      const updatesRef = ref(this.realtimeDb, `collaboration/${planId}/planUpdates`);

      onValue(updatesRef, async (snapshot) => {
        if (snapshot.exists()) {
          const updatesData = snapshot.val();
          const updates = Object.keys(updatesData).map(key => ({
            id: key,
            timestamp: updatesData[key].timestamp || 0
          }));

          if (updates.length > 50) {
            // Sort by timestamp and remove oldest
            updates.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = updates.slice(0, updates.length - 50);

            for (const update of toRemove) {
              await remove(ref(this.realtimeDb, `collaboration/${planId}/planUpdates/${update.id}`));
            }
          }
        }
      }, { onlyOnce: true });

      return {
        success: true,
        message: 'Plan updates cleaned up'
      };
    } catch (error) {
      console.error('Cleanup plan updates error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Generate an anonymous user ID for unauthenticated users
   */
  generateAnonymousUserId() {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get a consistent color for a user
   */
  getUserColor(userId) {
    // Generate a consistent color based on user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.userColors.length;
    return this.userColors[index];
  }

  /**
   * Remove all listeners for a plan with enhanced cleanup
   */
  removeAllListeners(planId) {
    console.log(`🧹 Removing all listeners for plan: ${planId}`);

    const keysToRemove = [];
    this.listeners.forEach((listener, key) => {
      if (key.includes(planId)) {
        try {
          if (typeof listener === 'function') {
            listener(); // Call unsubscribe function
            console.log(`✅ Unsubscribed listener: ${key}`);
          } else if (typeof listener === 'number') {
            clearInterval(listener); // Clear interval
            console.log(`✅ Cleared interval: ${key}`);
          }
        } catch (error) {
          console.error(`❌ Error cleaning up listener ${key}:`, error);
        }
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      this.listeners.delete(key);
    });

    // Clean up session listeners
    SessionManagementService.cleanupSessionListeners(planId);

    // Stop session cleanup monitoring
    try {
      SessionCleanupService.stopMonitoring(planId, 'listeners_removed');
    } catch (error) {
      console.warn('⚠️ Failed to stop cleanup monitoring:', error);
    }

    console.log(`✅ All listeners removed for plan: ${planId}`);
  }

  /**
   * Enhanced connection health monitoring
   */
  async checkConnectionHealth(planId) {
    try {
      const testRef = ref(this.realtimeDb, `collaboration/${planId}/connectionTest`);
      const testData = {
        timestamp: serverTimestamp(),
        test: true
      };

      await set(testRef, testData);
      await remove(testRef);

      return { healthy: true, message: 'Connection is healthy' };
    } catch (error) {
      console.error('Connection health check failed:', error);
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Get detailed collaboration status for a plan
   */
  async getCollaborationStatus(planId) {
    try {
      const collaborationRef = ref(this.realtimeDb, `collaboration/${planId}`);
      const snapshot = await get(collaborationRef);

      if (!snapshot.exists()) {
        return {
          exists: false,
          message: 'No collaboration data found'
        };
      }

      const data = snapshot.val();
      const activeUsers = data.activeUsers || {};
      const session = data.session || null;
      const planUpdates = data.planUpdates || {};

      const now = Date.now();
      const userStats = Object.entries(activeUsers).map(([userId, userData]) => {
        const lastSeen = userData.lastSeen;
        const lastSeenTime = typeof lastSeen === 'object' && lastSeen.seconds
          ? lastSeen.seconds * 1000
          : (typeof lastSeen === 'number' ? lastSeen : now);

        return {
          userId,
          name: userData.name,
          isActive: (now - lastSeenTime) < (2 * 60 * 1000), // 2 minutes
          lastSeenTime,
          timeSinceLastSeen: now - lastSeenTime,
          connectionStatus: userData.connectionStatus || { status: 'unknown' }
        };
      });

      return {
        exists: true,
        activeUsers: userStats,
        session: session ? {
          id: session.id,
          status: session.status,
          ownerId: session.ownerId,
          currentVersion: session.currentVersion
        } : null,
        totalUpdates: Object.keys(planUpdates).length,
        lastUpdate: Object.values(planUpdates).reduce((latest, update) => {
          const updateTime = update.timestamp?.seconds ? update.timestamp.seconds * 1000 : 0;
          return updateTime > latest ? updateTime : latest;
        }, 0)
      };

    } catch (error) {
      console.error('Failed to get collaboration status:', error);
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a plan has active collaboration
   */
  async isCollaborationActive(planId) {
    try {
      const usersRef = ref(this.realtimeDb, `collaboration/${planId}/activeUsers`);

      return new Promise((resolve) => {
        onValue(usersRef, (snapshot) => {
          const hasActiveUsers = snapshot.exists() && Object.keys(snapshot.val()).length > 0;
          resolve({
            success: true,
            isActive: hasActiveUsers,
            userCount: hasActiveUsers ? Object.keys(snapshot.val()).length : 0
          });
        }, (error) => {
          console.error('Check collaboration error:', error);
          resolve({
            success: false,
            isActive: false,
            userCount: 0
          });
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Check collaboration error:', error);
      return {
        success: false,
        isActive: false,
        userCount: 0
      };
    }
  }
}

export default new RealtimeCollaborationService();
