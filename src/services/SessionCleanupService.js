import {
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  serverTimestamp
} from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import SessionManagementService from './SessionManagementService';

/**
 * SessionCleanupService - Automatic cleanup of abandoned collaboration sessions
 * 
 * Features:
 * - Monitors active users in collaboration sessions
 * - Detects abandoned sessions (no active users)
 * - Automatically ends sessions and persists changes
 * - Cleans up Firebase Realtime Database data
 * - Handles edge cases like browser crashes and network disconnections
 */
class SessionCleanupService {
  constructor() {
    this.realtimeDb = realtimeDb;
    this.monitoredSessions = new Map(); // planId -> monitoring data
    this.cleanupIntervals = new Map(); // planId -> interval ID
    this.listeners = new Map(); // planId -> unsubscribe functions
    
    // Configuration
    this.config = {
      sessionTimeout: 10 * 60 * 1000, // 10 minutes in milliseconds
      heartbeatTimeout: 2 * 60 * 1000, // 2 minutes for heartbeat timeout
      cleanupCheckInterval: 2 * 60 * 1000, // Check every 2 minutes
      maxCleanupRetries: 3,
      retryDelay: 5000 // 5 seconds
    };

    console.log('🧹 SessionCleanupService initialized with config:', this.config);
  }

  /**
   * Start monitoring a collaboration session for cleanup
   */
  async startMonitoring(planId) {
    try {
      if (this.monitoredSessions.has(planId)) {
        console.log(`🧹 Already monitoring session for plan: ${planId}`);
        return { success: true, message: 'Already monitoring' };
      }

      console.log(`🧹 Starting session monitoring for plan: ${planId}`);

      // Check if session exists and is active
      const session = await SessionManagementService.getSession(planId);
      if (!session || session.status !== 'active') {
        console.log(`🧹 No active session found for plan: ${planId}`);
        return { success: false, message: 'No active session to monitor' };
      }

      // Initialize monitoring data
      const monitoringData = {
        planId,
        sessionId: session.id,
        startedAt: Date.now(),
        lastUserCheck: Date.now(),
        activeUsers: new Map(),
        cleanupAttempts: 0
      };

      this.monitoredSessions.set(planId, monitoringData);

      // Set up active users listener
      this.setupActiveUsersListener(planId);

      // Start periodic cleanup checks
      this.startCleanupChecks(planId);

      console.log(`✅ Session monitoring started for plan: ${planId}`);
      return { success: true, message: 'Session monitoring started' };

    } catch (error) {
      console.error(`❌ Failed to start monitoring for plan ${planId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop monitoring a collaboration session
   */
  async stopMonitoring(planId, reason = 'manual') {
    try {
      console.log(`🧹 Stopping session monitoring for plan: ${planId} (reason: ${reason})`);

      // Clean up listeners
      const listener = this.listeners.get(planId);
      if (listener) {
        listener();
        this.listeners.delete(planId);
      }

      // Clear cleanup interval
      const interval = this.cleanupIntervals.get(planId);
      if (interval) {
        clearInterval(interval);
        this.cleanupIntervals.delete(interval);
      }

      // Remove monitoring data
      this.monitoredSessions.delete(planId);

      console.log(`✅ Session monitoring stopped for plan: ${planId}`);
      return { success: true, message: 'Session monitoring stopped' };

    } catch (error) {
      console.error(`❌ Failed to stop monitoring for plan ${planId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Set up listener for active users in a collaboration session
   */
  setupActiveUsersListener(planId) {
    const activeUsersRef = ref(this.realtimeDb, `collaboration/${planId}/activeUsers`);
    
    const unsubscribe = onValue(activeUsersRef, (snapshot) => {
      this.handleActiveUsersUpdate(planId, snapshot);
    }, (error) => {
      console.error(`❌ Active users listener error for plan ${planId}:`, error);
    });

    this.listeners.set(planId, unsubscribe);
  }

  /**
   * Handle updates to active users list
   */
  handleActiveUsersUpdate(planId, snapshot) {
    const monitoringData = this.monitoredSessions.get(planId);
    if (!monitoringData) return;

    const now = Date.now();
    monitoringData.lastUserCheck = now;

    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const activeUsers = new Map();

      // Process each user and check their activity
      Object.entries(usersData).forEach(([userId, userData]) => {
        const lastSeen = userData.lastSeen;
        const joinedAt = userData.joinedAt;
        
        // Convert Firebase timestamps to milliseconds if needed
        const lastSeenTime = typeof lastSeen === 'object' && lastSeen.seconds 
          ? lastSeen.seconds * 1000 
          : (typeof lastSeen === 'number' ? lastSeen : now);

        const isActive = (now - lastSeenTime) < this.config.heartbeatTimeout;
        
        activeUsers.set(userId, {
          ...userData,
          lastSeenTime,
          isActive,
          timeSinceLastSeen: now - lastSeenTime
        });
      });

      monitoringData.activeUsers = activeUsers;
      
      const activeCount = Array.from(activeUsers.values()).filter(user => user.isActive).length;
      console.log(`🧹 Plan ${planId}: ${activeCount} active users out of ${activeUsers.size} total`);

    } else {
      // No users data - session is empty
      monitoringData.activeUsers = new Map();
      console.log(`🧹 Plan ${planId}: No users data found`);
    }
  }

  /**
   * Start periodic cleanup checks for a session
   */
  startCleanupChecks(planId) {
    const interval = setInterval(() => {
      this.performCleanupCheck(planId);
    }, this.config.cleanupCheckInterval);

    this.cleanupIntervals.set(planId, interval);
  }

  /**
   * Perform cleanup check for a specific session
   */
  async performCleanupCheck(planId) {
    try {
      const monitoringData = this.monitoredSessions.get(planId);
      if (!monitoringData) {
        console.log(`🧹 No monitoring data for plan: ${planId}`);
        return;
      }

      const now = Date.now();
      const activeUsers = Array.from(monitoringData.activeUsers.values()).filter(user => user.isActive);
      const timeSinceLastCheck = now - monitoringData.lastUserCheck;

      console.log('%c[SESSION CLEANUP] Performing cleanup check', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        activeUserCount: activeUsers.length,
        totalUsers: monitoringData.activeUsers.size,
        timeSinceLastCheck: Math.round(timeSinceLastCheck / 1000),
        sessionTimeout: this.config.sessionTimeout / 1000,
        timestamp: new Date().toISOString()
      });

      // Check if session should be cleaned up
      const shouldCleanup = this.shouldCleanupSession(monitoringData, now);

      if (shouldCleanup) {
        console.log('%c[SESSION CLEANUP] Session cleanup triggered', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          reason: activeUsers.length === 0 ? 'no_active_users' : 'timeout',
          inactiveTime: Math.round((now - monitoringData.lastUserActivity) / 1000)
        });
        await this.cleanupSession(planId, monitoringData);
      } else {
        console.log('%c[SESSION CLEANUP] Session still active', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          activeUsers: activeUsers.length,
          nextCheckIn: Math.round(this.config.cleanupCheckInterval / 1000)
        });
      }

    } catch (error) {
      console.error(`❌ Cleanup check failed for plan ${planId}:`, error);
    }
  }

  /**
   * Determine if a session should be cleaned up
   */
  shouldCleanupSession(monitoringData, now) {
    const activeUsers = Array.from(monitoringData.activeUsers.values()).filter(user => user.isActive);

    // No active users
    if (activeUsers.length === 0) {
      const timeSinceLastUser = now - monitoringData.lastUserCheck;
      return timeSinceLastUser > this.config.sessionTimeout;
    }

    return false;
  }

  /**
   * Clean up an abandoned session
   */
  async cleanupSession(planId, monitoringData) {
    try {
      monitoringData.cleanupAttempts++;
      console.log(`🧹 Attempting session cleanup for plan ${planId} (attempt ${monitoringData.cleanupAttempts})`);

      // Get current session data
      const session = await SessionManagementService.getSession(planId);
      if (!session) {
        console.log(`🧹 Session already cleaned up for plan: ${planId}`);
        await this.stopMonitoring(planId, 'session_not_found');
        return { success: true, message: 'Session already cleaned up' };
      }

      // Get the latest plan data from the session
      const finalPlanData = await this.getLatestPlanData(planId, session);

      // End the session and persist changes
      const endResult = await SessionManagementService.endSession(planId, finalPlanData);

      if (endResult.success) {
        // Clean up collaboration data from Realtime Database
        await this.cleanupCollaborationData(planId);

        // Stop monitoring this session
        await this.stopMonitoring(planId, 'cleanup_completed');

        console.log(`✅ Session cleanup completed for plan: ${planId}`);
        return { success: true, message: 'Session cleaned up successfully' };

      } else {
        console.error(`❌ Failed to end session during cleanup for plan ${planId}:`, endResult.message);

        // Retry if we haven't exceeded max attempts
        if (monitoringData.cleanupAttempts < this.config.maxCleanupRetries) {
          console.log(`🔄 Scheduling retry for plan ${planId} in ${this.config.retryDelay}ms`);
          setTimeout(() => {
            this.cleanupSession(planId, monitoringData);
          }, this.config.retryDelay);
        } else {
          console.error(`❌ Max cleanup attempts exceeded for plan ${planId}`);
          await this.stopMonitoring(planId, 'max_retries_exceeded');
        }

        return { success: false, message: endResult.message };
      }

    } catch (error) {
      console.error(`❌ Session cleanup failed for plan ${planId}:`, error);

      // Retry logic
      if (monitoringData.cleanupAttempts < this.config.maxCleanupRetries) {
        setTimeout(() => {
          this.cleanupSession(planId, monitoringData);
        }, this.config.retryDelay);
      } else {
        await this.stopMonitoring(planId, 'cleanup_failed');
      }

      return { success: false, message: error.message };
    }
  }

  /**
   * Get the latest plan data from collaboration session
   */
  async getLatestPlanData(planId, session) {
    try {
      // Try to get the most recent plan data from session versions
      const versionsRef = ref(this.realtimeDb, `collaboration/${planId}/sessionVersions`);
      const versionsSnapshot = await get(versionsRef);

      if (versionsSnapshot.exists()) {
        const versions = versionsSnapshot.val();
        const versionKeys = Object.keys(versions).sort((a, b) =>
          (versions[b].version || 0) - (versions[a].version || 0)
        );

        if (versionKeys.length > 0) {
          const latestVersion = versions[versionKeys[0]];
          if (latestVersion.planData) {
            console.log(`🧹 Using latest version data for plan ${planId} (version ${latestVersion.version})`);
            return latestVersion.planData;
          }
        }
      }

      // Fallback to session's initial plan data
      console.log(`🧹 Using session initial data for plan ${planId}`);
      return session.initialPlanData || {};

    } catch (error) {
      console.error(`❌ Failed to get latest plan data for ${planId}:`, error);
      return session.initialPlanData || {};
    }
  }

  /**
   * Clean up all collaboration data from Firebase Realtime Database
   */
  async cleanupCollaborationData(planId) {
    try {
      console.log(`🧹 Cleaning up collaboration data for plan: ${planId}`);

      const collaborationRef = ref(this.realtimeDb, `collaboration/${planId}`);
      await remove(collaborationRef);

      console.log(`✅ Collaboration data cleaned up for plan: ${planId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to cleanup collaboration data for plan ${planId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get monitoring status for all sessions
   */
  getMonitoringStatus() {
    const status = {
      totalSessions: this.monitoredSessions.size,
      sessions: []
    };

    this.monitoredSessions.forEach((data, planId) => {
      const activeUsers = Array.from(data.activeUsers.values()).filter(user => user.isActive);
      status.sessions.push({
        planId,
        sessionId: data.sessionId,
        startedAt: data.startedAt,
        activeUsers: activeUsers.length,
        totalUsers: data.activeUsers.size,
        cleanupAttempts: data.cleanupAttempts,
        lastUserCheck: data.lastUserCheck
      });
    });

    return status;
  }

  /**
   * Manually trigger cleanup for a specific session
   */
  async manualCleanup(planId) {
    const monitoringData = this.monitoredSessions.get(planId);
    if (!monitoringData) {
      return { success: false, message: 'Session not being monitored' };
    }

    console.log(`🧹 Manual cleanup triggered for plan: ${planId}`);
    return await this.cleanupSession(planId, monitoringData);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🧹 SessionCleanupService config updated:', this.config);
  }

  /**
   * Clean up all monitoring (for app shutdown)
   */
  async shutdown() {
    console.log('🧹 SessionCleanupService shutting down...');

    const planIds = Array.from(this.monitoredSessions.keys());
    for (const planId of planIds) {
      await this.stopMonitoring(planId, 'shutdown');
    }

    console.log('✅ SessionCleanupService shutdown complete');
  }
}

export default new SessionCleanupService();
