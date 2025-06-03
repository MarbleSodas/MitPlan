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
    window.addEventListener('online', () => {
      this.isOnlineState = true;
      this.updateStorageState();
      this.attemptSync();
    });

    window.addEventListener('offline', () => {
      this.isOnlineState = false;
      this.updateStorageState();
    });
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
      this.dbAvailable = false;
      this.lastDbCheck = Date.now();
      return false;
    }
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
        if (isUpdate && plan.id) {
          return await this.updatePlanInDatabase(plan);
        } else {
          return await this.createPlanInDatabase(plan);
        }
      } catch (error) {
        console.error('Database save failed, falling back to localStorage:', error);
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
        console.error('Database delete failed, queueing operation:', error);
        this.queueOperation(OPERATION_TYPES.DELETE, { id: planId });
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

    const successfulOperations = [];
    const failedOperations = [];

    for (const operation of this.pendingOperations) {
      try {
        await this.executeOperation(operation);
        successfulOperations.push(operation);
      } catch (error) {
        console.error('Sync operation failed:', error);
        operation.retries = (operation.retries || 0) + 1;

        // Remove operations that have failed too many times
        if (operation.retries < 3) {
          failedOperations.push(operation);
        }
      }
    }

    this.pendingOperations = failedOperations;
    this.savePendingOperations();
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
