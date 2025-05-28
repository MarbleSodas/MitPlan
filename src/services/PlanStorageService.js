/**
 * Plan Storage Service
 *
 * Manages plan persistence with automatic fallback between database and localStorage.
 * Handles migration, synchronization, and conflict resolution.
 */

import { v4 as uuidv4 } from 'uuid';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';

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
  constructor(authContext, apiRequest) {
    this.authContext = authContext;
    this.apiRequest = apiRequest;
    this.storageState = STORAGE_STATES.OFFLINE;
    this.pendingOperations = this.loadPendingOperations();
    this.isOnlineState = navigator.onLine;
    this.lastDbCheck = null;
    this.dbAvailable = false;

    // Set up connectivity listeners
    this.setupConnectivityListeners();

    // Initialize storage state
    this.updateStorageState();
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
    // Cache check for 30 seconds
    if (this.lastDbCheck && Date.now() - this.lastDbCheck < 30000) {
      return this.dbAvailable;
    }

    try {
      await this.apiRequest('/plans?limit=1');
      this.dbAvailable = true;
      this.lastDbCheck = Date.now();
      return true;
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
   */
  async loadPlan(planId) {
    if (this.isOnline()) {
      try {
        const response = await this.apiRequest(`/plans/${planId}`);
        return this.normalizePlanFromDatabase(response.plan);
      } catch (error) {
        console.error('Database load failed, checking localStorage:', error);
      }
    }

    return this.loadPlanFromLocalStorage(planId);
  }

  /**
   * Load all plans
   */
  async loadAllPlans() {
    if (this.isOnline()) {
      try {
        const response = await this.apiRequest('/plans');
        return response.plans.map(plan => this.normalizePlanFromDatabase(plan));
      } catch (error) {
        console.error('Database load failed, falling back to localStorage:', error);
      }
    }

    return this.loadPlansFromLocalStorage();
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId) {
    if (this.isOnline()) {
      try {
        await this.apiRequest(`/plans/${planId}`, { method: 'DELETE' });
        // Also remove from localStorage if it exists
        this.deletePlanFromLocalStorage(planId);
        return true;
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
    const response = await this.apiRequest('/plans', {
      method: 'POST',
      body: JSON.stringify({
        name: plan.name,
        description: plan.description || '',
        boss_id: plan.bossId,
        assignments: plan.assignments,
        selected_jobs: plan.selectedJobs,
        tank_positions: plan.tankPositions || {}
      })
    });

    return this.normalizePlanFromDatabase(response.plan);
  }

  /**
   * Update plan in database
   */
  async updatePlanInDatabase(plan) {
    const response = await this.apiRequest(`/plans/${plan.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: plan.name,
        description: plan.description || '',
        assignments: plan.assignments,
        selected_jobs: plan.selectedJobs,
        tank_positions: plan.tankPositions || {}
      })
    });

    return this.normalizePlanFromDatabase(response.plan);
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
    return {
      id: dbPlan.id,
      name: dbPlan.name,
      description: dbPlan.description || '',
      bossId: dbPlan.boss_id,
      assignments: dbPlan.assignments || {},
      selectedJobs: dbPlan.selected_jobs || {},
      tankPositions: dbPlan.tank_positions || {},
      date: dbPlan.created_at,
      lastModified: dbPlan.updated_at,
      isPublic: dbPlan.is_public,
      version: dbPlan.version,
      source: 'database'
    };
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

    console.log(`Syncing ${this.pendingOperations.length} pending operations...`);

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

    if (successfulOperations.length > 0) {
      console.log(`Successfully synced ${successfulOperations.length} operations`);
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
        await this.apiRequest(`/plans/${planData.id}`, { method: 'DELETE' });
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
}

export default PlanStorageService;
