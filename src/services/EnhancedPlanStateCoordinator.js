/**
 * Enhanced Plan State Coordinator
 * 
 * Intelligently coordinates plan state loading between Firestore and Firebase Realtime Database
 * for shared mitigation plans. Ensures users always get the most current plan state by:
 * 
 * 1. Checking for active collaboration sessions in Firebase Realtime Database first
 * 2. Loading current collaborative state if session exists
 * 3. Falling back to Firestore for non-collaborative plans
 * 4. Handling state migration and synchronization
 */

import { ref, get, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { getCollaborationPath, handleFirebaseError, retryOperation } from '../utils/firebaseHelpers';
import OptimizedPlanSyncService from './OptimizedPlanSyncService';
import SessionManagementService from './SessionManagementService';
import FirestoreService from './FirestoreService';

class EnhancedPlanStateCoordinator {
  constructor() {
    this.firestoreService = null;
    this.sessionService = null;
    this.loadingCache = new Map(); // Prevent duplicate loading requests
    this.stateCache = new Map(); // Cache loaded states temporarily
    this.initialized = false;
    this._initializeServices();
  }

  /**
   * Initialize services with error handling
   */
  async _initializeServices() {
    try {
      // FirestoreService and SessionManagementService are exported as singleton instances
      this.firestoreService = FirestoreService;
      this.sessionService = SessionManagementService;
      this.initialized = true;
      console.log('%c[PLAN COORDINATOR] Services initialized successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    } catch (error) {
      console.error('%c[PLAN COORDINATOR] Failed to initialize services', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
      this.initialized = false;
    }
  }

  /**
   * Ensure services are initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this._initializeServices();
    }
    if (!this.initialized) {
      throw new Error('Failed to initialize Enhanced Plan State Coordinator services');
    }
  }

  /**
   * Load plan state for shared plans with intelligent source selection
   * 
   * @param {string} planId - The plan ID to load
   * @param {string} userId - Current user ID (for session tracking)
   * @returns {Promise<Object>} Plan state with metadata about source and collaboration status
   */
  async loadSharedPlanState(planId, userId = null) {
    try {
      // Prevent duplicate loading requests
      if (this.loadingCache.has(planId)) {
        console.log('%c[PLAN COORDINATOR] Waiting for existing load request', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
        return await this.loadingCache.get(planId);
      }

      const loadPromise = this._performPlanStateLoad(planId, userId);
      this.loadingCache.set(planId, loadPromise);

      try {
        const result = await loadPromise;
        return result;
      } finally {
        this.loadingCache.delete(planId);
      }
    } catch (error) {
      console.error('%c[PLAN COORDINATOR] Failed to load plan state', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message
      });

      // Provide graceful degradation with detailed error information
      return {
        success: false,
        message: this._getErrorMessage(error),
        error: error.message,
        planState: null,
        source: 'error',
        isCollaborative: false,
        sessionInfo: null,
        fallbackRecommendation: this._getFallbackRecommendation(error)
      };
    }
  }

  /**
   * Internal method to perform the actual plan state loading
   */
  async _performPlanStateLoad(planId, userId) {
    // Ensure services are initialized
    await this._ensureInitialized();

    console.log('%c[PLAN COORDINATOR] Loading plan state with intelligent coordination', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      userId
    });

    // Step 1: Check for active collaboration session
    const collaborationStatus = await this._checkCollaborationStatus(planId);
    
    if (collaborationStatus.hasActiveSession) {
      console.log('%c[PLAN COORDINATOR] Active collaboration detected, loading from Firebase Realtime Database', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        sessionId: collaborationStatus.sessionId,
        version: collaborationStatus.currentVersion
      });

      // Load from Firebase Realtime Database (current collaborative state)
      const realtimeState = await this._loadFromRealtimeDatabase(planId);
      
      if (realtimeState.success) {
        return {
          success: true,
          planState: realtimeState.planState,
          source: 'realtime_database',
          isCollaborative: true,
          sessionInfo: collaborationStatus,
          message: 'Loaded current collaborative state from Firebase Realtime Database'
        };
      } else {
        console.warn('%c[PLAN COORDINATOR] Failed to load from Realtime Database, falling back to Firestore', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          error: realtimeState.message
        });
      }
    }

    // Step 2: Load from Firestore (fallback or non-collaborative)
    console.log('%c[PLAN COORDINATOR] Loading from Firestore', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', planId);
    
    const firestoreState = await this._loadFromFirestore(planId);
    
    if (firestoreState.success) {
      // If we have an active session but failed to load from Realtime Database,
      // we should migrate the Firestore state to Realtime Database
      if (collaborationStatus.hasActiveSession) {
        console.log('%c[PLAN COORDINATOR] Migrating Firestore state to Realtime Database', 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;', planId);
        
        await this._migrateToRealtimeDatabase(planId, firestoreState.planState, userId);
      }

      return {
        success: true,
        planState: firestoreState.planState,
        source: 'firestore',
        isCollaborative: collaborationStatus.hasActiveSession,
        sessionInfo: collaborationStatus.hasActiveSession ? collaborationStatus : null,
        message: collaborationStatus.hasActiveSession 
          ? 'Loaded from Firestore and migrated to collaborative session'
          : 'Loaded from Firestore (no active collaboration)'
      };
    }

    // Step 3: Both sources failed
    throw new Error('Failed to load plan state from both Realtime Database and Firestore');
  }

  /**
   * Check if there's an active collaboration session for the plan
   */
  async _checkCollaborationStatus(planId) {
    if (!planId) {
      console.warn('%c[PLAN COORDINATOR] No plan ID provided for collaboration status check', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return { hasActiveSession: false };
    }

    try {
      // Use retry operation for better reliability
      const sessionSnapshot = await retryOperation(async () => {
        const sessionRef = ref(realtimeDb, getCollaborationPath(planId, 'session'));
        return await get(sessionRef);
      }, 2, 500);

      if (sessionSnapshot.exists()) {
        const sessionData = sessionSnapshot.val();
        
        // Check if session is active and recent
        const isActive = sessionData.status === 'active';
        const isRecent = this._isSessionRecent(sessionData);

        if (isActive && isRecent) {
          return {
            hasActiveSession: true,
            sessionId: sessionData.id,
            currentVersion: sessionData.currentVersion || 1,
            ownerId: sessionData.ownerId,
            sessionData
          };
        }
      }

      return { hasActiveSession: false };
    } catch (error) {
      console.error('%c[PLAN COORDINATOR] Error checking collaboration status', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message
      });
      return { hasActiveSession: false };
    }
  }

  /**
   * Load plan state from Firebase Realtime Database
   */
  async _loadFromRealtimeDatabase(planId) {
    try {
      const result = await OptimizedPlanSyncService.getCurrentPlanState(planId);
      
      if (result.success && result.planState) {
        // Validate the plan state has required fields
        const planState = result.planState;
        const isValid = this._validatePlanState(planState);
        
        if (isValid) {
          return {
            success: true,
            planState: this._normalizePlanState(planState),
            fromCache: result.fromCache
          };
        } else {
          return {
            success: false,
            message: 'Invalid plan state structure in Realtime Database'
          };
        }
      }

      return {
        success: false,
        message: result.message || 'Plan state not found in Realtime Database'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Load plan state from Firestore
   */
  async _loadFromFirestore(planId) {
    if (!this.firestoreService) {
      return {
        success: false,
        message: 'Firestore service not available'
      };
    }

    try {
      const result = await retryOperation(async () => {
        return await this.firestoreService.getPlan(planId);
      }, 2, 1000);
      
      if (result.success && result.plan) {
        return {
          success: true,
          planState: this._normalizePlanState(result.plan)
        };
      }

      return {
        success: false,
        message: result.message || 'Plan not found in Firestore'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Migrate plan state from Firestore to Firebase Realtime Database
   */
  async _migrateToRealtimeDatabase(planId, planState, userId) {
    try {
      console.log('%c[PLAN COORDINATOR] Migrating plan state to Realtime Database', 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId
      });

      const result = await OptimizedPlanSyncService.initializePlanState(planId, planState, userId);
      
      if (result.success) {
        console.log('%c[PLAN COORDINATOR] Plan state migration completed', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          version: result.version
        });
      } else {
        console.error('%c[PLAN COORDINATOR] Plan state migration failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          error: result.message
        });
      }

      return result;
    } catch (error) {
      console.error('%c[PLAN COORDINATOR] Migration error', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message
      });
      return { success: false, message: error.message };
    }
  }

  /**
   * Check if a session is recent (within last 30 minutes)
   */
  _isSessionRecent(sessionData) {
    if (!sessionData.updatedAt && !sessionData.createdAt) {
      return true; // Assume recent if no timestamp
    }

    const sessionTime = sessionData.updatedAt || sessionData.createdAt;
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    // Handle Firebase server timestamp format
    if (typeof sessionTime === 'object' && sessionTime.seconds) {
      const sessionTimeMs = sessionTime.seconds * 1000;
      return (now - sessionTimeMs) < thirtyMinutes;
    }

    // Handle regular timestamp
    if (typeof sessionTime === 'number') {
      return (now - sessionTime) < thirtyMinutes;
    }

    return true; // Default to recent if timestamp format is unclear
  }

  /**
   * Validate plan state structure
   */
  _validatePlanState(planState) {
    if (!planState || typeof planState !== 'object') {
      return false;
    }

    // Check for required fields
    const hasAssignments = planState.assignments !== undefined;
    const hasSelectedJobs = planState.selectedJobs !== undefined;
    const hasBossId = planState.bossId !== undefined;

    return hasAssignments && hasSelectedJobs && hasBossId;
  }

  /**
   * Normalize plan state to consistent format with complete data validation
   */
  _normalizePlanState(planState) {
    if (!planState || typeof planState !== 'object') {
      console.warn('%c[PLAN COORDINATOR] Invalid plan state provided for normalization', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planState);
      return this._getDefaultPlanState();
    }

    const normalized = {
      // Core plan identification
      id: planState.id || null,

      // Essential plan data - ensure these are always objects/arrays
      assignments: this._normalizeAssignments(planState.assignments),
      selectedJobs: this._normalizeSelectedJobs(planState.selectedJobs),
      bossId: planState.bossId || 'ketuduke',
      tankPositions: this._normalizeTankPositions(planState.tankPositions),

      // Additional plan settings
      filterSettings: planState.filterSettings || {},

      // Collaboration metadata
      version: planState.version || 1,
      lastUpdated: planState.lastUpdated || null,
      lastUpdatedBy: planState.lastUpdatedBy || null,

      // Firestore metadata (preserve if exists)
      name: planState.name || null,
      description: planState.description || null,
      isPublic: planState.isPublic || false,
      isShared: planState.isShared || false,
      userId: planState.userId || null,
      createdAt: planState.createdAt || null,
      updatedAt: planState.updatedAt || null
    };

    console.log('%c[PLAN COORDINATOR] Plan state normalized', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      originalKeys: Object.keys(planState),
      normalizedKeys: Object.keys(normalized),
      hasAssignments: Object.keys(normalized.assignments).length > 0,
      hasSelectedJobs: Object.keys(normalized.selectedJobs).length > 0,
      hasTankPositions: Object.keys(normalized.tankPositions).length > 0
    });

    return normalized;
  }

  /**
   * Get default plan state structure
   */
  _getDefaultPlanState() {
    return {
      id: null,
      assignments: {},
      selectedJobs: {},
      bossId: 'ketuduke',
      tankPositions: {},
      filterSettings: {},
      version: 1,
      lastUpdated: null,
      lastUpdatedBy: null,
      name: null,
      description: null,
      isPublic: false,
      isShared: false,
      userId: null,
      createdAt: null,
      updatedAt: null
    };
  }

  /**
   * Normalize assignments data
   */
  _normalizeAssignments(assignments) {
    if (!assignments || typeof assignments !== 'object') {
      return {};
    }

    // Ensure all assignment values are arrays
    const normalized = {};
    Object.keys(assignments).forEach(bossActionId => {
      const assignment = assignments[bossActionId];
      if (Array.isArray(assignment)) {
        normalized[bossActionId] = assignment;
      } else if (assignment && typeof assignment === 'object') {
        // Handle tank position format: { MT: [...], OT: [...] }
        normalized[bossActionId] = assignment;
      } else {
        console.warn('%c[PLAN COORDINATOR] Invalid assignment format for boss action', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', bossActionId, assignment);
        normalized[bossActionId] = [];
      }
    });

    return normalized;
  }

  /**
   * Normalize selected jobs data
   */
  _normalizeSelectedJobs(selectedJobs) {
    if (!selectedJobs) {
      return {};
    }

    // Handle both array format (legacy) and object format (current)
    if (Array.isArray(selectedJobs)) {
      console.warn('%c[PLAN COORDINATOR] Legacy array format for selectedJobs, converting to object format', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return { legacy: selectedJobs };
    }

    if (typeof selectedJobs === 'object') {
      return selectedJobs;
    }

    console.warn('%c[PLAN COORDINATOR] Invalid selectedJobs format', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', selectedJobs);
    return {};
  }

  /**
   * Normalize tank positions data
   */
  _normalizeTankPositions(tankPositions) {
    if (!tankPositions || typeof tankPositions !== 'object') {
      return {};
    }

    // Ensure tank positions have valid structure
    const normalized = {};
    if (tankPositions.mainTank || tankPositions.MT) {
      normalized.mainTank = tankPositions.mainTank || tankPositions.MT;
    }
    if (tankPositions.offTank || tankPositions.OT) {
      normalized.offTank = tankPositions.offTank || tankPositions.OT;
    }

    return normalized;
  }

  /**
   * Get user-friendly error message
   */
  _getErrorMessage(error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    if (error.message.includes('permission') || error.message.includes('access')) {
      return 'Access denied. You may not have permission to view this plan.';
    }
    if (error.message.includes('not found')) {
      return 'Plan not found. It may have been deleted or the link is invalid.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return 'An unexpected error occurred while loading the plan.';
  }

  /**
   * Get fallback recommendation based on error type
   */
  _getFallbackRecommendation(error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        action: 'retry',
        message: 'Try refreshing the page or check your internet connection.',
        canRetry: true
      };
    }
    if (error.message.includes('permission') || error.message.includes('access')) {
      return {
        action: 'contact_owner',
        message: 'Contact the plan owner to request access.',
        canRetry: false
      };
    }
    if (error.message.includes('not found')) {
      return {
        action: 'create_new',
        message: 'Create a new plan or check the link.',
        canRetry: false
      };
    }
    return {
      action: 'retry',
      message: 'Try again in a few moments.',
      canRetry: true
    };
  }

  /**
   * Clear caches (useful for testing or manual refresh)
   */
  clearCaches() {
    this.loadingCache.clear();
    this.stateCache.clear();
    console.log('%c[PLAN COORDINATOR] Caches cleared', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;');
  }
}

// Export singleton instance
const enhancedPlanStateCoordinator = new EnhancedPlanStateCoordinator();
export default enhancedPlanStateCoordinator;
