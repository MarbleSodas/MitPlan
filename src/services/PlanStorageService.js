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

      // Additional check: try to reach appropriate database if we think we're online
      if (isCurrentlyOnline) {
        const isSharedPlan = this.isOnSharedPlanUrl();

        if (isSharedPlan && !this.authContext.isAuthenticated) {
          // For unauthenticated users on shared plans, check Realtime Database
          try {
            // Extract plan ID from URL for more accurate testing
            const planIdMatch = window.location.pathname.match(/\/plan\/shared\/([^\/]+)/);
            const planId = planIdMatch ? planIdMatch[1] : 'connectivity-test';

            const realtimeDbAvailable = await this.checkRealtimeDatabaseConnectivity(planId);
            const wasRealtimeDbAvailable = this.storageState !== STORAGE_STATES.OFFLINE;

            if (!realtimeDbAvailable && wasRealtimeDbAvailable) {
              console.log('🌐 Realtime Database became unavailable for shared plan:', planId);
              this.notifyConnectionStateChange('database-unavailable');
            } else if (realtimeDbAvailable && !wasRealtimeDbAvailable) {
              console.log('🌐 Realtime Database connection restored for shared plan:', planId);
              this.notifyConnectionStateChange('database-available');
            }
          } catch (error) {
            console.warn('🌐 Error checking Realtime Database connectivity:', error.message);
          }
        } else if (this.authContext.isAuthenticated) {
          // For authenticated users, check Firestore
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
   * Check if we're currently on a shared plan URL
   */
  isOnSharedPlanUrl() {
    return window.location.pathname.includes('/plan/shared/');
  }

  /**
   * Check Firebase Realtime Database connectivity for shared plans
   */
  async checkRealtimeDatabaseConnectivity(planId = 'connectivity-test') {
    try {
      // Use Firebase directly for connectivity test
      const { ref, set, remove, serverTimestamp } = await import('firebase/database');
      const { realtimeDb } = await import('../config/firebase');
      const { getCollaborationPath } = await import('../utils/firebaseHelpers');

      if (!realtimeDb) {
        console.warn('Realtime Database instance not available');
        return false;
      }

      const testRef = ref(realtimeDb, getCollaborationPath(planId, 'connectionTest'));

      const testData = {
        timestamp: serverTimestamp(),
        test: true,
        userId: `test-${Date.now()}`
      };

      // Use a timeout to avoid hanging
      const connectivityPromise = (async () => {
        await set(testRef, testData);
        await remove(testRef);
        return true;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Realtime Database connectivity check timeout')), 8000)
      );

      await Promise.race([connectivityPromise, timeoutPromise]);

      console.log('%c[PLAN STORAGE] Realtime Database connectivity check successful', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.warn('%c[PLAN STORAGE] Realtime Database connectivity check failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        error: error.message,
        planId,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Update storage state based on auth and connectivity
   */
  async updateStorageState() {
    const { isAuthenticated } = this.authContext;
    const isSharedPlan = this.isOnSharedPlanUrl();

    // For shared plans, prioritize Realtime Database connectivity over authentication
    if (isSharedPlan && !isAuthenticated) {
      if (!this.isOnlineState) {
        this.storageState = STORAGE_STATES.OFFLINE;
        return;
      }

      // Extract plan ID from URL for more accurate testing
      const planIdMatch = window.location.pathname.match(/\/plan\/shared\/([^\/]+)/);
      const planId = planIdMatch ? planIdMatch[1] : 'connectivity-test';

      // Check Realtime Database connectivity for shared plan collaboration
      const realtimeDbAvailable = await this.checkRealtimeDatabaseConnectivity(planId);
      this.storageState = realtimeDbAvailable ? STORAGE_STATES.ONLINE_LOCAL : STORAGE_STATES.OFFLINE;

      console.log('%c[PLAN STORAGE] Shared plan connectivity check', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        isOnline: this.isOnlineState,
        realtimeDbAvailable,
        storageState: this.storageState
      });

      return;
    }

    // Standard logic for authenticated users or non-shared plans
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
    console.log(`%c[PLAN STORAGE] Loading plan: ${planId}`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      isOnline: this.isOnline(),
      storageState: this.storageState,
      isAuthenticated: this.authContext.isAuthenticated
    });

    if (this.isOnline()) {
      try {
        const result = await this.firestoreService.getPlan(planId);
        if (result.success) {
          console.log(`%c[PLAN STORAGE] Plan loaded from database`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
            planId: result.plan.id,
            isPublic: result.plan.isPublic,
            isShared: result.plan.isShared,
            hasAssignments: !!result.plan.assignments,
            hasSelectedJobs: !!result.plan.selectedJobs,
            hasTankPositions: !!result.plan.tankPositions
          });

          const normalizedPlan = this.normalizePlanFromDatabase(result.plan);

          // Validate plan data for collaboration readiness
          const validation = this.validatePlanData(normalizedPlan, 'collaboration');
          if (!validation.isValid) {
            console.error(`%c[PLAN STORAGE] Plan validation failed`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', validation.errors);
          }

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
    console.log(`%c[PLAN STORAGE] Falling back to localStorage`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
    const localPlan = this.loadPlanFromLocalStorage(planId);
    if (localPlan) {
      // Validate local plan data
      const validation = this.validatePlanData(localPlan, 'local');
      if (!validation.isValid) {
        console.warn(`%c[PLAN STORAGE] Local plan validation failed`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', validation.errors);
      }
      return localPlan;
    }

    throw new Error('Plan not found in any storage location');
  }

  /**
   * Load a shared plan with intelligent coordination between Firestore and Firebase Realtime Database
   * Uses Enhanced Plan State Coordinator to get the most current plan state
   */
  async loadSharedPlan(planId, userId = null) {
    console.log(`%c[PLAN STORAGE] Loading shared plan with enhanced coordination: ${planId}`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      userId,
      hasFirestore: !!this.firestoreService
    });

    // Validate plan ID format (basic UUID check)
    if (!this.isValidPlanId(planId)) {
      throw new Error('Invalid plan ID format');
    }

    // Import Enhanced Plan State Coordinator
    const { default: enhancedPlanStateCoordinator } = await import('./EnhancedPlanStateCoordinator');

    // Use enhanced coordinator to get the most current plan state
    try {
      const coordinatorResult = await enhancedPlanStateCoordinator.loadSharedPlanState(planId, userId);

      if (coordinatorResult.success) {
        console.log(`%c[PLAN STORAGE] Plan loaded via enhanced coordinator`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          source: coordinatorResult.source,
          isCollaborative: coordinatorResult.isCollaborative,
          message: coordinatorResult.message
        });

        // Normalize the plan data for the application
        const normalizedPlan = this.normalizePlanFromDatabase(coordinatorResult.planState);

        // Add collaboration metadata
        normalizedPlan._collaborationInfo = {
          source: coordinatorResult.source,
          isCollaborative: coordinatorResult.isCollaborative,
          sessionInfo: coordinatorResult.sessionInfo
        };

        return normalizedPlan;
      } else {
        throw new Error(coordinatorResult.message || 'Failed to load plan via enhanced coordinator');
      }
    } catch (coordinatorError) {
      console.warn(`%c[PLAN STORAGE] Enhanced coordinator failed, falling back to direct Firestore`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: coordinatorError.message
      });

      // Fallback to direct Firestore loading
      return await this._loadSharedPlanFromFirestore(planId);
    }
  }

  /**
   * Fallback method to load shared plan directly from Firestore
   * Used when Enhanced Plan State Coordinator fails
   */
  async _loadSharedPlanFromFirestore(planId) {
    // Shared plans must be loaded from Firestore, regardless of online status
    if (!this.firestoreService) {
      throw new Error('Database service not available');
    }

    try {
      // Try to load as a public/shared plan using the standard getPlan method
      // This method already handles public and shared plan access permissions
      const result = await this.firestoreService.getPlan(planId);

      if (result.success && result.plan) {
        console.log(`%c[PLAN STORAGE] Shared plan loaded successfully (fallback)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          planName: result.plan.name,
          isShared: result.plan.isShared,
          isPublic: result.plan.isPublic
        });

        const normalizedPlan = this.normalizePlanFromDatabase(result.plan);

        // Mark as non-collaborative fallback
        normalizedPlan._collaborationInfo = {
          source: 'firestore_fallback',
          isCollaborative: false,
          sessionInfo: null
        };

        // Validate plan data for collaboration readiness
        const validation = this.validatePlanData(normalizedPlan, 'collaboration');
        if (!validation.isValid) {
          console.error(`%c[PLAN STORAGE] Shared plan validation failed`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', validation.errors);
        }

        return normalizedPlan;
      } else {
        console.warn(`%c[PLAN STORAGE] Shared plan not found`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          message: result.message
        });
        throw new Error(result.message || 'Shared plan not found');
      }
    } catch (error) {
      console.error(`%c[PLAN STORAGE] Failed to load shared plan`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message
      });

      // Provide more specific error messages
      if (error.message.includes('not found')) {
        throw new Error('Plan not found or no longer available');
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        throw new Error('Access denied to this plan');
      } else if (error.message.includes('network') || error.message.includes('offline')) {
        throw new Error('Network error - please check your connection');
      } else {
        throw new Error(`Failed to load shared plan: ${error.message}`);
      }
    }
  }

  /**
   * Validate plan ID format (supports both UUID and Firestore ID formats)
   */
  isValidPlanId(planId) {
    if (!planId || typeof planId !== 'string') {
      console.log('%c[PLAN STORAGE] Plan ID validation failed: invalid input', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        type: typeof planId
      });
      return false;
    }

    // Support UUID format (36 chars with dashes), Firestore ID format (20 chars alphanumeric), and test IDs (8+ chars alphanumeric with dashes)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const firestoreIdRegex = /^[a-zA-Z0-9]{20}$/;
    const testIdRegex = /^[a-zA-Z0-9-]{8,36}$/;

    const isUuid = uuidRegex.test(planId);
    const isFirestoreId = firestoreIdRegex.test(planId);
    const isTestId = testIdRegex.test(planId);
    const isValid = isUuid || isFirestoreId || isTestId;

    console.log('%c[PLAN STORAGE] Plan ID validation', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      length: planId.length,
      isUuid,
      isFirestoreId,
      isTestId,
      isValid
    });

    return isValid;
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
   * Validate plan data structure for completeness
   */
  validatePlanData(planData, context = 'general') {
    const errors = [];
    const warnings = [];
    const info = [];

    // Basic existence check
    if (!planData) {
      errors.push('Plan data is null or undefined');
      return { isValid: false, errors, warnings, info };
    }

    // Required fields
    if (!planData.id) errors.push('Plan ID is missing');
    if (!planData.bossId) errors.push('Boss ID is missing');

    // Data structure validation
    if (planData.assignments !== undefined) {
      if (typeof planData.assignments !== 'object' || planData.assignments === null) {
        errors.push('Assignments must be an object');
      } else if (Array.isArray(planData.assignments)) {
        errors.push('Assignments must be an object, not an array');
      } else {
        // Validate assignments structure
        const assignmentCount = Object.keys(planData.assignments).length;
        info.push(`Plan has ${assignmentCount} boss action assignments`);

        // Check for valid assignment structure
        for (const [bossActionId, assignments] of Object.entries(planData.assignments)) {
          if (!Array.isArray(assignments)) {
            warnings.push(`Assignment for boss action ${bossActionId} is not an array`);
          }
        }
      }
    } else {
      warnings.push('Assignments field is undefined');
    }

    if (planData.selectedJobs !== undefined) {
      if (typeof planData.selectedJobs !== 'object' || planData.selectedJobs === null) {
        errors.push('Selected jobs must be an object');
      } else if (Array.isArray(planData.selectedJobs)) {
        errors.push('Selected jobs must be an object, not an array');
      } else {
        const jobCount = Object.keys(planData.selectedJobs).filter(job => planData.selectedJobs[job]).length;
        info.push(`Plan has ${jobCount} selected jobs`);
      }
    } else {
      warnings.push('Selected jobs field is undefined');
    }

    if (planData.tankPositions !== undefined) {
      if (typeof planData.tankPositions !== 'object' || planData.tankPositions === null) {
        errors.push('Tank positions must be an object');
      } else if (Array.isArray(planData.tankPositions)) {
        errors.push('Tank positions must be an object, not an array');
      } else {
        const tankCount = Object.keys(planData.tankPositions).length;
        info.push(`Plan has ${tankCount} tank position assignments`);
      }
    }

    // Collaboration-specific validation
    if (context === 'collaboration') {
      if (planData.isShared === undefined) {
        warnings.push('isShared flag is missing - collaboration mode detection may fail');
      }
      if (planData.isPublic === undefined) {
        warnings.push('isPublic flag is missing - access control may fail');
      }

      // Check if plan is suitable for collaboration
      if (!planData.isShared && !planData.isPublic) {
        warnings.push('Plan is neither shared nor public - collaboration may not work');
      }
    }

    // Data integrity checks
    if (planData.name && typeof planData.name !== 'string') {
      warnings.push('Plan name should be a string');
    }
    if (planData.description && typeof planData.description !== 'string') {
      warnings.push('Plan description should be a string');
    }
    if (planData.version && typeof planData.version !== 'number') {
      warnings.push('Plan version should be a number');
    }

    // Boss ID validation
    const validBossIds = ['ketuduke', 'lala', 'statice', 'sugar_riot', 'brute_abominator', 'm8s'];
    if (planData.bossId && !validBossIds.includes(planData.bossId)) {
      warnings.push(`Unknown boss ID: ${planData.bossId}. Valid IDs: ${validBossIds.join(', ')}`);
    }

    // Log validation results with appropriate styling
    if (errors.length > 0) {
      console.error(`%c[PLAN VALIDATION] Errors (${context})`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', errors);
    }
    if (warnings.length > 0) {
      console.warn(`%c[PLAN VALIDATION] Warnings (${context})`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', warnings);
    }
    if (info.length > 0) {
      console.log(`%c[PLAN VALIDATION] Info (${context})`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', info);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Comprehensive plan data integrity check for import/collaboration
   */
  validatePlanIntegrity(planData, context = 'import') {
    console.log(`%c[PLAN INTEGRITY] Starting integrity check`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      context,
      planId: planData?.id,
      hasData: !!planData
    });

    const validation = this.validatePlanData(planData, context);
    const integrityIssues = [];
    const recommendations = [];

    if (!validation.isValid) {
      integrityIssues.push('Basic validation failed');
      return {
        isValid: false,
        canProceed: false,
        errors: validation.errors,
        warnings: validation.warnings,
        integrityIssues,
        recommendations: ['Fix validation errors before proceeding']
      };
    }

    // Deep integrity checks
    if (planData.assignments) {
      let totalAssignments = 0;
      for (const [bossActionId, assignments] of Object.entries(planData.assignments)) {
        if (Array.isArray(assignments)) {
          totalAssignments += assignments.length;

          // Check for duplicate assignments
          const assignmentIds = assignments.map(a => a.id || a.abilityId);
          const uniqueIds = new Set(assignmentIds);
          if (assignmentIds.length !== uniqueIds.size) {
            integrityIssues.push(`Duplicate assignments found for boss action ${bossActionId}`);
          }
        }
      }

      if (totalAssignments === 0) {
        recommendations.push('Plan has no mitigation assignments - consider adding some for better protection');
      } else {
        console.log(`%c[PLAN INTEGRITY] Found ${totalAssignments} total mitigation assignments`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      }
    }

    // Check job selection integrity
    if (planData.selectedJobs) {
      const selectedJobsList = Object.entries(planData.selectedJobs)
        .filter(([, selected]) => selected)
        .map(([job]) => job);

      if (selectedJobsList.length === 0) {
        recommendations.push('No jobs selected - plan may not function properly');
      } else if (selectedJobsList.length > 8) {
        integrityIssues.push('More than 8 jobs selected - this exceeds party size limit');
      }

      // Check for tank jobs if tank positions exist
      if (planData.tankPositions && Object.keys(planData.tankPositions).length > 0) {
        const tankJobs = ['PLD', 'WAR', 'DRK', 'GNB'];
        const selectedTanks = selectedJobsList.filter(job => tankJobs.includes(job));

        if (selectedTanks.length === 0) {
          integrityIssues.push('Tank positions defined but no tank jobs selected');
        } else if (selectedTanks.length > 2) {
          recommendations.push('More than 2 tank jobs selected - consider limiting to 2 for optimal planning');
        }
      }
    }

    // Collaboration readiness check
    if (context === 'collaboration') {
      if (!planData.isShared && !planData.isPublic) {
        integrityIssues.push('Plan is not marked as shared or public - collaboration will fail');
      }

      if (!planData.userId && !planData.user_id) {
        recommendations.push('Plan has no owner information - this may cause permission issues');
      }
    }

    const canProceed = integrityIssues.length === 0;

    console.log(`%c[PLAN INTEGRITY] Integrity check complete`, canProceed ? 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;' : 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
      isValid: validation.isValid,
      canProceed,
      issuesCount: integrityIssues.length,
      warningsCount: validation.warnings.length,
      recommendationsCount: recommendations.length
    });

    return {
      isValid: validation.isValid,
      canProceed,
      errors: validation.errors,
      warnings: validation.warnings,
      info: validation.info,
      integrityIssues,
      recommendations
    };
  }

  /**
   * Safely convert timestamp to ISO string
   */
  timestampToISOString(timestamp) {
    if (!timestamp) {
      return null;
    }

    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }

    // Handle Date objects
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    // Handle string timestamps
    if (typeof timestamp === 'string') {
      try {
        return new Date(timestamp).toISOString();
      } catch (error) {
        console.warn('Invalid timestamp string:', timestamp);
        return null;
      }
    }

    // Handle numeric timestamps (milliseconds)
    if (typeof timestamp === 'number') {
      try {
        return new Date(timestamp).toISOString();
      } catch (error) {
        console.warn('Invalid timestamp number:', timestamp);
        return null;
      }
    }

    console.warn('Unknown timestamp format:', timestamp);
    return null;
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
      date: this.timestampToISOString(dbPlan.createdAt) || new Date().toISOString(),
      lastModified: this.timestampToISOString(dbPlan.updatedAt) || new Date().toISOString(),
      isPublic: dbPlan.isPublic || false,
      isShared: dbPlan.isShared || false, // Critical for collaboration mode detection
      version: dbPlan.version || 1,
      source: 'database',
      // Preserve additional collaboration-related metadata
      userId: dbPlan.userId,
      user_id: dbPlan.user_id, // Legacy compatibility
      sharedAt: this.timestampToISOString(dbPlan.sharedAt),
      accessedAt: this.timestampToISOString(dbPlan.accessedAt)
    };

    // Validate the normalized plan
    const validation = this.validatePlanData(normalized, 'normalization');
    if (!validation.isValid) {
      console.error('Plan normalization produced invalid data:', validation.errors);
    }

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
