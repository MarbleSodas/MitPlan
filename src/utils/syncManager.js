/**
 * Sync Manager for handling offline/online transitions
 * Manages synchronization of offline operations when connection is restored
 */
import {
  getPendingOperations,
  removePendingOperation,
  updateSyncStatus,
  savePlanOffline
} from './offlineStorage';

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.isSyncing = false;
    this.socket = null;
    this.onSyncStatusChange = null;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }
  
  /**
   * Initialize the sync manager with a socket connection
   * @param {Object} socket - Socket.io connection
   * @param {Function} onSyncStatusChange - Callback for sync status changes
   */
  init(socket, onSyncStatusChange) {
    this.socket = socket;
    this.onSyncStatusChange = onSyncStatusChange;
    
    // Check if we need to sync any pending operations
    if (this.isOnline) {
      this.syncPendingOperations();
    }
  }
  
  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Connection restored. Syncing pending operations...');
    this.isOnline = true;
    
    if (this.onSyncStatusChange) {
      this.onSyncStatusChange('online');
    }
    
    // Start syncing pending operations
    this.syncPendingOperations();
  }
  
  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Connection lost. Operations will be queued for later sync.');
    this.isOnline = false;
    
    if (this.onSyncStatusChange) {
      this.onSyncStatusChange('offline');
    }
  }
  
  /**
   * Queue an operation for sync
   * @param {string} planId - Plan ID
   * @param {Object} operation - Operation data
   * @param {Object} currentPlan - Current plan state
   */
  queueOperation(planId, operation, currentPlan) {
    // Add to sync queue
    this.syncQueue.push({ planId, operation, currentPlan });
    
    // If online, try to sync immediately
    if (this.isOnline && !this.isSyncing) {
      this.processSyncQueue();
    }
  }
  
  /**
   * Process the sync queue
   */
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0 || !this.isOnline || !this.socket) {
      return;
    }
    
    this.isSyncing = true;
    
    try {
      // Process each operation in the queue
      while (this.syncQueue.length > 0) {
        const { planId, operation, currentPlan } = this.syncQueue.shift();
        
        // Update sync status
        if (this.onSyncStatusChange) {
          this.onSyncStatusChange('syncing', planId);
        }
        await updateSyncStatus(planId, 'syncing');
        
        // Send operation to server
        await this.sendOperation(planId, operation, currentPlan);
        
        // Update sync status
        if (this.onSyncStatusChange) {
          this.onSyncStatusChange('synced', planId);
        }
        await updateSyncStatus(planId, 'synced');
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
      
      if (this.onSyncStatusChange) {
        this.onSyncStatusChange('error', null, error.message);
      }
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Send an operation to the server
   * @param {string} planId - Plan ID
   * @param {Object} operation - Operation data
   * @param {Object} currentPlan - Current plan state
   * @returns {Promise<void>}
   */
  sendOperation(planId, operation, currentPlan) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      // Set up a timeout for the operation
      const timeout = setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, 10000);
      
      // Send the operation
      this.socket.emit('operation', {
        docId: planId,
        version: currentPlan.version,
        operations: [operation],
        clientId: this.socket.id
      });
      
      // Set up a one-time handler for the response
      this.socket.once('operation_ack', (data) => {
        clearTimeout(timeout);
        
        if (data.error) {
          reject(new Error(data.error));
        } else {
          // Save the updated plan to offline storage
          if (data.plan) {
            savePlanOffline(data.plan);
          }
          resolve();
        }
      });
    });
  }
  
  /**
   * Sync pending operations from IndexedDB
   */
  async syncPendingOperations() {
    if (!this.isOnline || !this.socket || this.isSyncing) {
      return;
    }
    
    try {
      // Get all plans with pending operations
      const pendingPlans = await this.getPendingPlans();
      
      for (const planId of pendingPlans) {
        // Get pending operations for this plan
        const pendingOps = await getPendingOperations(planId);
        
        if (pendingOps.length === 0) {
          continue;
        }
        
        // Update sync status
        if (this.onSyncStatusChange) {
          this.onSyncStatusChange('syncing', planId);
        }
        await updateSyncStatus(planId, 'syncing');
        
        // Process each operation
        for (const op of pendingOps) {
          try {
            // Send operation to server
            await this.sendOperation(planId, op.operation, op.currentPlan);
            
            // Remove from pending operations
            await removePendingOperation(op.id);
          } catch (error) {
            console.error(`Error syncing operation ${op.id}:`, error);
            
            // Update sync status
            if (this.onSyncStatusChange) {
              this.onSyncStatusChange('error', planId, error.message);
            }
            await updateSyncStatus(planId, 'error', error.message);
            
            // Stop processing this plan's operations
            break;
          }
        }
        
        // Update sync status
        if (this.onSyncStatusChange) {
          this.onSyncStatusChange('synced', planId);
        }
        await updateSyncStatus(planId, 'synced');
      }
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  }
  
  /**
   * Get all plans with pending operations
   * @returns {Promise<Array>} Array of plan IDs
   */
  async getPendingPlans() {
    // This would normally query IndexedDB for plans with pending operations
    // For simplicity, we'll just return the unique plan IDs from the sync queue
    return [...new Set(this.syncQueue.map(item => item.planId))];
  }
}

// Export a singleton instance
export default new SyncManager();
