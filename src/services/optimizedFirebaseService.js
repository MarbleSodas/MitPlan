import { 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  serverTimestamp,
  update
} from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Optimized Firebase service for efficient real-time collaboration
 * Focuses on minimizing reads/writes and optimizing data structure
 */

class OptimizedFirebaseService {
  constructor() {
    this.activeListeners = new Map();
    this.writeQueue = new Map();
    this.writeTimer = null;
    this.BATCH_DELAY = 250; // ms
    this.MAX_BATCH_SIZE = 10;
  }

  /**
   * Optimized plan structure for minimal data transfer
   */
  createOptimizedPlanStructure(planData) {
    return {
      // Core plan data
      meta: {
        name: planData.name,
        bossId: planData.bossId,
        userId: planData.userId,
        isPublic: planData.isPublic || false,
        createdAt: planData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: planData.version || 1
      },
      
      // Separate nodes for different data types to enable selective listening
      jobs: planData.selectedJobs || {},
      assignments: planData.assignments || {},
      tankPositions: planData.tankPositions || {},
      
      // Collaboration metadata
      collaboration: {
        lastModifiedBy: planData.userId,
        lastChangeOrigin: null,
        activeUsers: 0
      }
    };
  }

  /**
   * Batch write operations for better performance
   */
  queueWrite(path, data, priority = 'normal') {
    if (!this.writeQueue.has(path)) {
      this.writeQueue.set(path, { data, priority, timestamp: Date.now() });
    } else {
      // Update existing queued write
      const existing = this.writeQueue.get(path);
      this.writeQueue.set(path, {
        data: { ...existing.data, ...data },
        priority: priority === 'high' ? 'high' : existing.priority,
        timestamp: Date.now()
      });
    }

    this.scheduleFlush();
  }

  /**
   * Schedule batch flush
   */
  scheduleFlush() {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    this.writeTimer = setTimeout(() => {
      this.flushWrites();
    }, this.BATCH_DELAY);
  }

  /**
   * Flush queued writes in batches
   */
  async flushWrites() {
    if (this.writeQueue.size === 0) return;

    const writes = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();

    // Sort by priority (high priority first)
    writes.sort((a, b) => {
      if (a[1].priority === 'high' && b[1].priority !== 'high') return -1;
      if (b[1].priority === 'high' && a[1].priority !== 'high') return 1;
      return a[1].timestamp - b[1].timestamp;
    });

    // Process in batches
    for (let i = 0; i < writes.length; i += this.MAX_BATCH_SIZE) {
      const batch = writes.slice(i, i + this.MAX_BATCH_SIZE);
      const updates = {};

      batch.forEach(([path, { data }]) => {
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, value]) => {
            updates[`${path}/${key}`] = value;
          });
        } else {
          updates[path] = data;
        }
      });

      try {
        await update(ref(database), updates);
      } catch (error) {
        console.error('Batch write error:', error);
        // Re-queue failed writes
        batch.forEach(([path, writeData]) => {
          this.queueWrite(path, writeData.data, 'high');
        });
      }
    }
  }

  /**
   * Subscribe to specific plan fields with optimized listeners
   */
  subscribeToOptimizedPlan(planId, callbacks, sessionId = null) {
    const listeners = {};

    // Subscribe to metadata changes
    if (callbacks.onMetaChange) {
      const metaRef = ref(database, `plans/${planId}`);
      const metaListener = onValue(metaRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Skip if this change originated from current session
          if (!sessionId || data.lastChangeOrigin !== sessionId) {
            callbacks.onMetaChange(data);
          }
        }
      });
      listeners.meta = () => off(metaRef, 'value', metaListener);
    }

    // Subscribe to job changes
    if (callbacks.onJobsChange) {
      const jobsRef = ref(database, `plans/${planId}/selectedJobs`);
      const jobsListener = onValue(jobsRef, (snapshot) => {
        if (snapshot.exists()) {
          callbacks.onJobsChange(snapshot.val());
        }
      });
      listeners.jobs = () => off(jobsRef, 'value', jobsListener);
    }

    // Subscribe to assignment changes
    if (callbacks.onAssignmentsChange) {
      const assignmentsRef = ref(database, `plans/${planId}/assignments`);
      const assignmentsListener = onValue(assignmentsRef, (snapshot) => {
        if (snapshot.exists()) {
          callbacks.onAssignmentsChange(snapshot.val());
        }
      });
      listeners.assignments = () => off(assignmentsRef, 'value', assignmentsListener);
    }

    // Subscribe to tank position changes
    if (callbacks.onTankPositionsChange) {
      const tankRef = ref(database, `plans/${planId}/tankPositions`);
      const tankListener = onValue(tankRef, (snapshot) => {
        if (snapshot.exists()) {
          callbacks.onTankPositionsChange(snapshot.val());
        }
      });
      listeners.tankPositions = () => off(tankRef, 'value', tankListener);
    }

    // Store listeners for cleanup
    this.activeListeners.set(planId, listeners);

    // Return cleanup function
    return () => {
      const planListeners = this.activeListeners.get(planId);
      if (planListeners) {
        Object.values(planListeners).forEach(cleanup => cleanup());
        this.activeListeners.delete(planId);
      }
    };
  }

  /**
   * Update plan field with optimized writes
   */
  updatePlanField(planId, field, data, userId, sessionId, priority = 'normal') {
    const updates = {
      [`plans/${planId}/${field}`]: data,
      [`plans/${planId}/updatedAt`]: serverTimestamp(),
      [`plans/${planId}/lastModifiedBy`]: userId,
      [`plans/${planId}/lastChangeOrigin`]: sessionId
    };

    this.queueWrite('', updates, priority);
  }

  /**
   * Batch update multiple fields
   */
  batchUpdatePlan(planId, updates, userId, sessionId, priority = 'normal') {
    const batchUpdates = {};

    Object.entries(updates).forEach(([field, data]) => {
      batchUpdates[`plans/${planId}/${field}`] = data;
    });

    // Add metadata
    batchUpdates[`plans/${planId}/updatedAt`] = serverTimestamp();
    batchUpdates[`plans/${planId}/lastModifiedBy`] = userId;
    batchUpdates[`plans/${planId}/lastChangeOrigin`] = sessionId;

    this.queueWrite('', batchUpdates, priority);
  }

  /**
   * Get plan data efficiently
   */
  async getPlanData(planId, fields = null) {
    try {
      if (fields) {
        // Get only specific fields
        const promises = fields.map(field =>
          get(ref(database, `plans/${planId}/${field}`))
        );
        const snapshots = await Promise.all(promises);

        const result = {};
        fields.forEach((field, index) => {
          if (snapshots[index].exists()) {
            result[field] = snapshots[index].val();
          }
        });
        return result;
      } else {
        // Get entire plan
        const snapshot = await get(ref(database, `plans/${planId}`));
        return snapshot.exists() ? snapshot.val() : null;
      }
    } catch (error) {
      console.error('Error getting plan data:', error);
      throw error;
    }
  }

  /**
   * Cleanup all listeners and pending writes
   */
  cleanup() {
    // Clear all listeners
    this.activeListeners.forEach((listeners) => {
      Object.values(listeners).forEach(cleanup => cleanup());
    });
    this.activeListeners.clear();

    // Clear write timer
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    // Flush any pending writes
    if (this.writeQueue.size > 0) {
      this.flushWrites();
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      activeListeners: this.activeListeners.size,
      queuedWrites: this.writeQueue.size,
      hasPendingTimer: !!this.writeTimer
    };
  }
}

// Create singleton instance
const optimizedFirebaseService = new OptimizedFirebaseService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    optimizedFirebaseService.cleanup();
  });
}

export default optimizedFirebaseService;
