/**
 * Offline storage utility for caching operations when disconnected
 * Uses IndexedDB for efficient storage of large amounts of data
 */
import { openDB } from 'idb';

// Database name and version
const DB_NAME = 'mitplan_offline_db';
const DB_VERSION = 1;

// Store names
const PLANS_STORE = 'plans';
const PENDING_OPS_STORE = 'pending_operations';
const SYNC_STATUS_STORE = 'sync_status';

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(PLANS_STORE)) {
        db.createObjectStore(PLANS_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(PENDING_OPS_STORE)) {
        const store = db.createObjectStore(PENDING_OPS_STORE, { 
          keyPath: 'id',
          autoIncrement: true 
        });
        store.createIndex('planId', 'planId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(SYNC_STATUS_STORE)) {
        db.createObjectStore(SYNC_STATUS_STORE, { keyPath: 'planId' });
      }
    }
  });
};

/**
 * Save a plan to offline storage
 * @param {Object} plan - Plan data
 * @returns {Promise<void>}
 */
export const savePlanOffline = async (plan) => {
  if (!plan || !plan.id) {
    console.error('Invalid plan data for offline storage');
    return;
  }
  
  const db = await initDB();
  await db.put(PLANS_STORE, plan);
  
  // Update sync status
  await db.put(SYNC_STATUS_STORE, {
    planId: plan.id,
    lastSynced: new Date(),
    status: 'synced'
  });
};

/**
 * Get a plan from offline storage
 * @param {string} planId - Plan ID
 * @returns {Promise<Object|null>} Plan data or null if not found
 */
export const getPlanOffline = async (planId) => {
  if (!planId) {
    return null;
  }
  
  const db = await initDB();
  return db.get(PLANS_STORE, planId);
};

/**
 * Save a pending operation for offline sync
 * @param {string} planId - Plan ID
 * @param {Object} operation - Operation data
 * @returns {Promise<number>} Operation ID
 */
export const savePendingOperation = async (planId, operation) => {
  if (!planId || !operation) {
    console.error('Invalid operation data for offline storage');
    return;
  }
  
  const db = await initDB();
  
  // Add operation to pending operations store
  const id = await db.add(PENDING_OPS_STORE, {
    planId,
    operation,
    timestamp: new Date(),
    attempts: 0
  });
  
  // Update sync status
  await db.put(SYNC_STATUS_STORE, {
    planId,
    lastModified: new Date(),
    status: 'pending'
  });
  
  return id;
};

/**
 * Get all pending operations for a plan
 * @param {string} planId - Plan ID
 * @returns {Promise<Array>} Array of pending operations
 */
export const getPendingOperations = async (planId) => {
  if (!planId) {
    return [];
  }
  
  const db = await initDB();
  const tx = db.transaction(PENDING_OPS_STORE, 'readonly');
  const index = tx.store.index('planId');
  
  return index.getAll(planId);
};

/**
 * Remove a pending operation after successful sync
 * @param {number} operationId - Operation ID
 * @returns {Promise<void>}
 */
export const removePendingOperation = async (operationId) => {
  const db = await initDB();
  await db.delete(PENDING_OPS_STORE, operationId);
};

/**
 * Get sync status for a plan
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Sync status
 */
export const getSyncStatus = async (planId) => {
  if (!planId) {
    return { status: 'unknown' };
  }
  
  const db = await initDB();
  const status = await db.get(SYNC_STATUS_STORE, planId);
  
  return status || { planId, status: 'unknown' };
};

/**
 * Update sync status for a plan
 * @param {string} planId - Plan ID
 * @param {string} status - Sync status ('synced', 'pending', 'syncing', 'error')
 * @param {string} [error] - Error message if status is 'error'
 * @returns {Promise<void>}
 */
export const updateSyncStatus = async (planId, status, error = null) => {
  if (!planId) {
    return;
  }
  
  const db = await initDB();
  await db.put(SYNC_STATUS_STORE, {
    planId,
    status,
    lastUpdated: new Date(),
    error
  });
};
