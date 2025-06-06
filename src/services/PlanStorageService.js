/**
 * Plan Storage Service
 *
 * Manages plan persistence with automatic fallback between Firestore and localStorage.
 * Handles migration, synchronization, and conflict resolution.
 */

import { v4 as uuidv4 } from 'uuid';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';
import FirestoreService from './FirestoreService';

// Storage states
export const STORAGE_STATES = {
  ONLINE_DB: 'online_database',
  ONLINE_LOCAL: 'online_local_fallback',
  OFFLINE: 'offline_local_only'
};

// Operation types for queuing
export const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

class PlanStorageService {
  constructor(authContext) {
    this.authContext = authContext;
    this.firestoreService = FirestoreService;
    this.storageState = STORAGE_STATES.OFFLINE;
    this.pendingOperations = this.loadPendingOperations();
    this.isOnlineState = navigator.onLine;
    this.lastDbCheck = null;
    this.dbAvailable = false;

    // Set up connectivity listeners
    this.setupConnectivityListeners();

    // Note: updateStorageState() is called explicitly from the context
    // to handle async initialization properly
  }

  /**
   * Set up network connectivity listeners
   */
  setupConnectivityListeners() {
    // Enhanced online/offline detection
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored');
      this.isOnlineState = true;
      this.updateStorageState();
      this.attemptSync();
      this.notifyConnectionStateChange('online');
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Network connection lost');
      this.isOnlineState = false;
      this.updateStorageState();
      this.notifyConnectionStateChange('offline');
    });

    // Additional connection monitoring
    this.startConnectionMonitoring();
  }

  /**
   * Start periodic connection monitoring
   */
  startConnectionMonitoring() {
    // Check connection every 30 seconds
    this.connectionMonitorInterval = setInterval(async () => {
      const wasOnline = this.isOnlineState;
      const isCurrentlyOnline = navigator.onLine;

      // If navigator.onLine changed, update our state
      if (wasOnline !== isCurrentlyOnline) {
        this.isOnlineState = isCurrentlyOnline;
        console.log(`🌐 Connection state changed: ${isCurrentlyOnline ? 'online' : 'offline'}`);
        this.updateStorageState();

        if (isCurrentlyOnline) {
          this.attemptSync();
        }

        this.notifyConnectionStateChange(isCurrentlyOnline ? 'online' : 'offline');
      }

      // Additional check: try to reach Firebase if we think we're online
      if (isCurrentlyOnline && this.authContext.isAuthenticated) {
        try {
          const dbAvailable = await this.checkDatabaseAvailability();
          if (!dbAvailable && this.dbAvailable) {
            console.log('🌐 Database became unavailable despite network connection');
            this.notifyConnectionStateChange('database-unavailable');
          } else if (dbAvailable && !this.dbAvailable) {
            console.log('🌐 Database connection restored');
            this.notifyConnectionStateChange('database-available');
            this.attemptSync();
          }
        } catch (error) {
          // Ignore errors in monitoring - don't want to spam logs
        }
      }
    }, 30000);
  }

  /**
   * Notify about connection state changes
   */
  notifyConnectionStateChange(state) {
    // Emit custom event for UI components to listen to
    const event = new CustomEvent('connectionStateChange', {
      detail: {
        state,
        isOnline: this.isOnlineState,
        dbAvailable: this.dbAvailable,
        storageState: this.storageState
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Cleanup connection monitoring
   */
  cleanup() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }

  /**
   * Update storage state based on auth and connectivity
   */
  async updateStorageState() {
    const { isAuthenticated } = this.authContext;

    if (!isAuthenticated) {
      this.storageState = STORAGE_STATES.OFFLINE;
      return;
    }

    if (!this.isOnlineState) {
      this.storageState = STORAGE_STATES.ONLINE_LOCAL;
      return;
    }

    // Check database availability
    const dbAvailable = await this.checkDatabaseAvailability();
    this.storageState = dbAvailable ? STORAGE_STATES.ONLINE_DB : STORAGE_STATES.ONLINE_LOCAL;
  }

  /**
   * Check if database is available
   */
  async checkDatabaseAvailability() {
    if (!this.authContext.isAuthenticated) {
      this.dbAvailable = false;
      return false;
    }

    // Cache check for 30 seconds
    if (this.lastDbCheck && Date.now() - this.lastDbCheck < 30000) {
      return this.dbAvailable;
    }

    try {
      // Test Firestore connectivity with timeout
      const connectivityPromise = this.firestoreService.getUserPlans();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connectivity check timeout')), 5000)
      );

      const result = await Promise.race([connectivityPromise, timeoutPromise]);
      this.dbAvailable = result.success;
      this.lastDbCheck = Date.now();
      return this.dbAvailable;
    } catch (error) {
      console.warn('Database unavailable, falling back to localStorage:', error);

      // Log specific connection error types for debugging
      if (this.isConnectionError(error)) {
        console.warn('Connection error detected during database availability check');
      }

      this.dbAvailable = false;
      this.lastDbCheck = Date.now();
      return false;
    }
  }

  /**
   * Check if an error is related to connection issues
   */
  isConnectionError(error) {
    const connectionErrorPatterns = [
      'runtime.lastError',
      'Could not establish connection',
      'Failed to fetch',
      'Network request failed',
      'Connection timeout',
      'NETWORK_ERROR',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'offline',
      'No internet connection'
    ];

    const errorMessage = error.message || error.toString();
    return connectionErrorPatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get current storage state
   */
  getStorageState() {
    return this.storageState;
  }

  /**
   * Check if currently online with database access
   */
  isOnline() {
    return this.storageState === STORAGE_STATES.ONLINE_DB;
  }

  /**
   * Check if there are pending sync operations
   */
  hasPendingSync() {
    return this.pendingOperations.length > 0;
  }

  /**
   * Save a plan (create or update)
   */
  async savePlan(planData, isUpdate = false) {
    const plan = this.normalizePlanData(planData);

    if (this.isOnline()) {
      try {
        // Add timeout wrapper for database operations
        const savePromise = isUpdate && plan.id
          ? this.updatePlanInDatabase(plan)
          : this.createPlanInDatabase(plan);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Plan save operation timeout')), 30000)
        );

        return await Promise.race([savePromise, timeoutPromise]);
      } catch (error) {
        console.error('Database save failed, falling back to localStorage:', error);

        // Handle specific connection errors
        if (this.isConnectionError(error)) {
          console.warn('Connection error detected during save, using fallback storage');
        } else if (error.message.includes('timeout')) {
          console.warn('Save operation timed out, using fallback storage');
        }

        this.queueOperation(isUpdate ? OPERATION_TYPES.UPDATE : OPERATION_TYPES.CREATE, plan);
        return this.savePlanToLocalStorage(plan);
      }
    } else {
      // Queue operation if authenticated but offline
      if (this.authContext.isAuthenticated) {
        this.queueOperation(isUpdate ? OPERATION_TYPES.UPDATE : OPERATION_TYPES.CREATE, plan);
      }
      return this.savePlanToLocalStorage(plan);
    }
  }

  /**
   * Load a specific plan by ID
   * Supports loading public/shared plans for both authenticated and unauthenticated users
   */
  async loadPlan(planId) {
    if (this.isOnline()) {
      try {
        const result = await this.firestoreService.getPlan(planId);
        if (result.success) {
          const normalizedPlan = this.normalizePlanFromDatabase(result.plan);
          return normalizedPlan;
        } else {
          console.warn('PlanStorageService: Database load failed:', result.message);
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('PlanStorageService: Database load failed, checking localStorage:', error);

        // For shared plans, don't fall back to localStorage since they should be in the database
        if (error.message === 'Plan not found' || error.message === 'Access denied') {
          throw error; // Re-throw these specific errors
        }
      }
    }

    // Fallback to localStorage for offline mode or network errors
    const localPlan = this.loadPlanFromLocalStorage(planId);
    if (localPlan) {
      return localPlan;
    }

    throw new Error('Plan not found in any storage location');
  }

  /**
   * Load all plans
   */
  async loadAllPlans() {
    if (this.isOnline()) {
      try {
        const result = await this.firestoreService.getUserPlans();

        if (result.success && result.plans) {
          const normalizedPlans = result.plans.map(plan => this.normalizePlanFromDatabase(plan));
          return normalizedPlans;
        } else {
          console.warn('PlanStorageService: Failed to load plans from Firestore:', result.message);
          throw new Error(result.message || 'Failed to load plans from Firestore');
        }
      } catch (error) {
        console.error('PlanStorageService: Firestore load failed, falling back to localStorage:', error);
      }
    }

    const localPlans = this.loadPlansFromLocalStorage();
    return localPlans;
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId) {
    if (this.isOnline()) {
      try {
        const result = await this.firestoreService.deletePlan(planId);

        if (result.success) {
          // Also remove from localStorage if it exists
          this.deletePlanFromLocalStorage(planId);
          return true;
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Database delete failed:', error.message);

        // If authenticated, queue the operation for later
        if (this.authContext.isAuthenticated) {
          this.queueOperation(OPERATION_TYPES.DELETE, { id: planId });
        }

        // Re-throw the error so the UI can handle it appropriately
        throw error;
      }
    } else if (this.authContext.isAuthenticated) {
      // Queue delete operation
      this.queueOperation(OPERATION_TYPES.DELETE, { id: planId });
    }

    return this.deletePlanFromLocalStorage(planId);
  }

  /**
   * Create plan in database
   */
  async createPlanInDatabase(plan) {
    const planData = {
      name: plan.name,
      description: plan.description || '',
      bossId: plan.bossId,
      assignments: plan.assignments,
      selectedJobs: plan.selectedJobs,
      tankPositions: plan.tankPositions || {}
    };

    const result = await this.firestoreService.createPlan(planData);
    if (result.success) {
      return this.normalizePlanFromDatabase(result.plan);
    } else {
      throw new Error(result.message);
    }
  }

  /**
   * Update plan in database
   */
  async updatePlanInDatabase(plan) {
    const updateData = {
      name: plan.name,
      description: plan.description || '',
      assignments: plan.assignments,
      selectedJobs: plan.selectedJobs,
      tankPositions: plan.tankPositions || {}
    };

    const result = await this.firestoreService.updatePlan(plan.id, updateData);
    if (result.success) {
      return this.normalizePlanFromDatabase(result.plan);
    } else {
      throw new Error(result.message);
    }
  }

  /**
   * Update plan visibility (make public/private)
   */
  async updatePlanVisibility(planId, isPublic) {
    if (!this.isOnline()) {
      throw new Error('Cannot update plan visibility while offline');
    }

    const result = await this.firestoreService.updatePlan(planId, { isPublic });
    if (result.success) {
      return this.normalizePlanFromDatabase(result.plan);
    } else {
      throw new Error(result.message);
    }
  }

  /**
   * Share an existing plan (make it public and return shareable URL)
   */
  async sharePlan(plan) {
    // If plan is only in localStorage, save it to database first
    if (plan.source !== 'database') {
      if (!this.authContext.isAuthenticated) {
        throw new Error('Please sign in to share plans');
      }

      // Save to database first
      const savedPlan = await this.savePlan(plan);
      plan = savedPlan;
    }

    // Use Firestore service to share the plan
    const result = await this.firestoreService.sharePlan(plan.id);
    if (result.success) {
      return {
        plan: this.normalizePlanFromDatabase({ ...plan, isPublic: true, isShared: true }),
        shareUrl: result.shareUrl,
        sessionId: result.sessionId,
        collaborationEnabled: result.collaborationEnabled,
        message: result.message
      };
    } else {
      throw new Error(result.message);
    }
  }

  /**
   * Save plan to localStorage
   */
  savePlanToLocalStorage(plan) {
    const savedPlans = this.loadPlansFromLocalStorage();
    const existingIndex = savedPlans.findIndex(p => p.id === plan.id);

    if (existingIndex >= 0) {
      savedPlans[existingIndex] = plan;
    } else {
      savedPlans.push(plan);
    }

    saveToLocalStorage('mitPlanSavedPlans', savedPlans);
    return plan;
  }

  /**
   * Load plan from localStorage
   */
  loadPlanFromLocalStorage(planId) {
    const savedPlans = this.loadPlansFromLocalStorage();
    return savedPlans.find(plan => plan.id === planId) || null;
  }

  /**
   * Load all plans from localStorage
   */
  loadPlansFromLocalStorage() {
    return loadFromLocalStorage('mitPlanSavedPlans', []);
  }

  /**
   * Delete plan from localStorage
   */
  deletePlanFromLocalStorage(planId) {
    const savedPlans = this.loadPlansFromLocalStorage();
    const filteredPlans = savedPlans.filter(plan => plan.id !== planId);
    saveToLocalStorage('mitPlanSavedPlans', filteredPlans);
    return true;
  }

  /**
   * Normalize plan data to consistent format
   */
  normalizePlanData(planData) {
    return {
      id: planData.id || uuidv4(),
      name: planData.name || 'Untitled Plan',
      description: planData.description || '',
      bossId: planData.bossId,
      assignments: planData.assignments || {},
      selectedJobs: planData.selectedJobs || {},
      tankPositions: planData.tankPositions || {},
      date: planData.date || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      source: planData.source || 'local'
    };
  }

  /**
   * Normalize plan from database format
   */
  normalizePlanFromDatabase(dbPlan) {
    if (!dbPlan) {
      throw new Error('Invalid plan data: plan is null or undefined');
    }

    const normalized = {
      id: dbPlan.id,
      name: dbPlan.name || 'Untitled Plan',
      description: dbPlan.description || '',
      bossId: dbPlan.bossId || 'ketuduke',
      assignments: dbPlan.assignments || {},
      selectedJobs: dbPlan.selectedJobs || {},
      tankPositions: dbPlan.tankPositions || {},
      date: dbPlan.createdAt ? dbPlan.createdAt.toISOString() : new Date().toISOString(),
      lastModified: dbPlan.updatedAt ? dbPlan.updatedAt.toISOString() : new Date().toISOString(),
      isPublic: dbPlan.isPublic || false,
      version: dbPlan.version || 1,
      source: 'database'
    };

    return normalized;
  }

  /**
   * Queue operation for later sync
   */
  queueOperation(type, planData) {
    const operation = {
      id: uuidv4(),
      type,
      planData,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    this.pendingOperations.push(operation);
    this.savePendingOperations();
  }

  /**
   * Load pending operations from localStorage
   */
  loadPendingOperations() {
    return loadFromLocalStorage('mitPlanPendingOperations', []);
  }

  /**
   * Save pending operations to localStorage
   */
  savePendingOperations() {
    saveToLocalStorage('mitPlanPendingOperations', this.pendingOperations);
  }

  /**
   * Attempt to sync pending operations
   */
  async attemptSync() {
    if (!this.isOnline() || this.pendingOperations.length === 0) {
      return;
    }

    // Notify that syncing is starting
    this.notifyConnectionStateChange('syncing');
    console.log(`🔄 Starting sync of ${this.pendingOperations.length} pending operations`);

    const successfulOperations = [];
    const failedOperations = [];

    for (const operation of this.pendingOperations) {
      try {
        await this.executeOperation(operation);
        successfulOperations.push(operation);
        console.log(`✅ Synced operation: ${operation.type} for plan ${operation.planData.id || 'new'}`);
      } catch (error) {
        console.error('Sync operation failed:', error);
        operation.retries = (operation.retries || 0) + 1;

        // Remove operations that have failed too many times
        if (operation.retries < 3) {
          failedOperations.push(operation);
          console.warn(`⚠️ Sync failed, will retry (attempt ${operation.retries}/3)`);
        } else {
          console.error(`❌ Sync failed permanently after 3 attempts, discarding operation`);
        }
      }
    }

    this.pendingOperations = failedOperations;
    this.savePendingOperations();

    // Notify sync completion
    if (successfulOperations.length > 0) {
      console.log(`✅ Sync completed: ${successfulOperations.length} operations synced`);
      this.notifyConnectionStateChange('online');
    }
  }

  /**
   * Execute a queued operation
   */
  async executeOperation(operation) {
    const { type, planData } = operation;

    switch (type) {
      case OPERATION_TYPES.CREATE:
        await this.createPlanInDatabase(planData);
        break;
      case OPERATION_TYPES.UPDATE:
        await this.updatePlanInDatabase(planData);
        break;
      case OPERATION_TYPES.DELETE:
        const result = await this.firestoreService.deletePlan(planData.id);
        if (!result.success) {
          throw new Error(result.message);
        }
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
}

export default PlanStorageService;
