/**
 * Plan-Based Collaboration Service
 * 
 * High-level service that implements the plan-based collaboration model.
 * This service orchestrates the optimized sync operations and provides
 * a unified interface for plan-based real-time collaboration.
 */

import OptimizedPlanSyncService from './OptimizedPlanSyncService';
import performanceMonitor from '../utils/collaborationPerformanceMonitor';
import { COLLABORATION_OPTIMIZATION } from '../config/collaborationOptimization';

class PlanBasedCollaborationService {
  constructor() {
    this.activePlans = new Map();
    this.planSubscriptions = new Map();
    this.migrationQueue = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the plan-based collaboration service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('%c[PLAN-BASED COLLAB] Initializing plan-based collaboration service', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

    // Start performance monitoring if enabled
    if (COLLABORATION_OPTIMIZATION.ENABLE_OPTIMIZATION_LOGGING) {
      performanceMonitor.startMonitoring();
    }

    this.isInitialized = true;
    
    console.log('%c[PLAN-BASED COLLAB] Service initialized successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
  }

  /**
   * Join a collaborative plan session and return current plan state
   */
  async joinPlan(planId, userId, initialPlanData = null) {
    try {
      console.log('%c[PLAN-BASED COLLAB] Joining plan with enhanced state loading', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        hasInitialData: !!initialPlanData
      });

      // Check if migration is needed
      const migrationCheck = await checkIfMigrationNeeded(planId);
      if (migrationCheck.needsMigration) {
        console.log('%c[PLAN-BASED COLLAB] Migration needed for plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
        await this.migratePlan(planId, userId);
      }

      // Load current plan state from Firebase Realtime Database
      let currentPlanState = null;
      const currentState = await OptimizedPlanSyncService.getCurrentPlanState(planId);

      if (currentState.success) {
        console.log('%c[PLAN-BASED COLLAB] Loaded existing plan state from Firebase Realtime Database', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          version: currentState.planState.version,
          fromCache: currentState.fromCache
        });
        currentPlanState = currentState.planState;
      } else if (initialPlanData) {
        console.log('%c[PLAN-BASED COLLAB] Initializing new plan state', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', planId);
        const initResult = await OptimizedPlanSyncService.initializePlanState(planId, initialPlanData, userId);
        if (initResult.success) {
          currentPlanState = initialPlanData;
        }
      } else {
        console.warn('%c[PLAN-BASED COLLAB] No existing plan state found and no initial data provided', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
      }

      // Set up plan subscription
      await this.subscribeToPlan(planId, userId);

      // Track active plan
      this.activePlans.set(planId, {
        userId,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        currentPlanState
      });

      console.log('%c[PLAN-BASED COLLAB] Successfully joined plan with state', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        activePlans: this.activePlans.size,
        hasCurrentState: !!currentPlanState,
        stateVersion: currentPlanState?.version || 'unknown'
      });

      return {
        success: true,
        planId,
        currentPlanState,
        message: 'Successfully joined collaborative plan',
        hasExistingState: !!currentPlanState
      };
    } catch (error) {
      console.error('%c[PLAN-BASED COLLAB] Failed to join plan', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Leave a collaborative plan session
   */
  async leavePlan(planId, userId) {
    try {
      console.log('%c[PLAN-BASED COLLAB] Leaving plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId
      });

      // Unsubscribe from plan updates
      this.unsubscribeFromPlan(planId);

      // Remove from active plans
      this.activePlans.delete(planId);

      // Cleanup resources
      OptimizedPlanSyncService.cleanup(planId);

      console.log('%c[PLAN-BASED COLLAB] Successfully left plan', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        remainingPlans: this.activePlans.size
      });

      return {
        success: true,
        message: 'Successfully left collaborative plan'
      };
    } catch (error) {
      console.error('%c[PLAN-BASED COLLAB] Failed to leave plan', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update complete plan state (plan-based approach)
   */
  async updatePlanState(planId, planData, userId) {
    try {
      // Update last activity
      const planInfo = this.activePlans.get(planId);
      if (planInfo) {
        planInfo.lastActivity = Date.now();
      }

      // Perform optimized sync
      const result = await OptimizedPlanSyncService.syncCompletePlan(planId, planData, userId);

      if (result.success) {
        console.log('%c[PLAN-BASED COLLAB] Plan state updated', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          version: result.version,
          skipped: result.skipped
        });
      }

      return result;
    } catch (error) {
      console.error('%c[PLAN-BASED COLLAB] Failed to update plan state', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update specific plan data (optimized partial updates)
   */
  async updatePlanData(planId, dataType, data, userId) {
    try {
      // Update last activity
      const planInfo = this.activePlans.get(planId);
      if (planInfo) {
        planInfo.lastActivity = Date.now();
      }

      let result;
      switch (dataType) {
        case 'assignments':
          result = await OptimizedPlanSyncService.syncMitigationAssignments(planId, data, userId);
          break;
        case 'selectedJobs':
          result = await OptimizedPlanSyncService.syncJobSelections(planId, data, userId);
          break;
        case 'bossId':
          result = await OptimizedPlanSyncService.syncBossSelection(planId, data, userId);
          break;
        case 'tankPositions':
          result = await OptimizedPlanSyncService.syncTankPositions(planId, data, userId);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      if (result.success) {
        console.log('%c[PLAN-BASED COLLAB] Plan data updated', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          dataType,
          skipped: result.skipped
        });
      }

      return result;
    } catch (error) {
      console.error('%c[PLAN-BASED COLLAB] Failed to update plan data', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        dataType,
        userId,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Subscribe to plan updates
   */
  async subscribeToPlan(planId, userId) {
    if (this.planSubscriptions.has(planId)) {
      console.log('%c[PLAN-BASED COLLAB] Already subscribed to plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
      return;
    }

    const unsubscribe = OptimizedPlanSyncService.subscribeToPlanUpdates(planId, (updateData) => {
      this.handlePlanUpdate(planId, updateData, userId);
    });

    this.planSubscriptions.set(planId, unsubscribe);

    console.log('%c[PLAN-BASED COLLAB] Subscribed to plan updates', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      totalSubscriptions: this.planSubscriptions.size
    });
  }

  /**
   * Unsubscribe from plan updates
   */
  unsubscribeFromPlan(planId) {
    const unsubscribe = this.planSubscriptions.get(planId);
    if (unsubscribe) {
      unsubscribe();
      this.planSubscriptions.delete(planId);

      console.log('%c[PLAN-BASED COLLAB] Unsubscribed from plan updates', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        remainingSubscriptions: this.planSubscriptions.size
      });
    }
  }

  /**
   * Handle plan updates from other users
   */
  handlePlanUpdate(planId, updateData, currentUserId) {
    // Skip updates from the same user to prevent loops
    if (updateData.lastUpdatedBy === currentUserId) {
      return;
    }

    console.log('%c[PLAN-BASED COLLAB] Received plan update from other user', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId,
      version: updateData.version,
      from: updateData.lastUpdatedBy,
      currentUser: currentUserId
    });

    // Emit collaborative update event
    window.dispatchEvent(new CustomEvent('planBasedCollaborativeUpdate', {
      detail: {
        planId,
        updateData,
        version: updateData.version,
        updatedBy: updateData.lastUpdatedBy,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Migrate a plan to the optimized structure
   */
  async migratePlan(planId, userId) {
    if (this.migrationQueue.has(planId)) {
      console.log('%c[PLAN-BASED COLLAB] Migration already in progress', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', planId);
      return;
    }

    this.migrationQueue.add(planId);

    try {
      const result = await migratePlanToOptimizedStructure(planId, userId);
      
      if (result.success) {
        console.log('%c[PLAN-BASED COLLAB] Plan migration completed', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          version: result.version
        });
      } else {
        console.error('%c[PLAN-BASED COLLAB] Plan migration failed', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          error: result.message
        });
      }

      return result;
    } finally {
      this.migrationQueue.delete(planId);
    }
  }

  /**
   * Get collaboration statistics
   */
  getCollaborationStats() {
    const stats = {
      activePlans: this.activePlans.size,
      activeSubscriptions: this.planSubscriptions.size,
      migrationsInProgress: this.migrationQueue.size,
      performanceMetrics: performanceMonitor.getCurrentMetrics(),
      planDetails: Array.from(this.activePlans.entries()).map(([planId, info]) => ({
        planId,
        userId: info.userId,
        joinedAt: info.joinedAt,
        lastActivity: info.lastActivity,
        sessionDuration: Date.now() - info.joinedAt
      }))
    };

    return stats;
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    console.log('%c[PLAN-BASED COLLAB] Cleaning up collaboration service', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');

    // Unsubscribe from all plans
    for (const [planId] of this.planSubscriptions) {
      this.unsubscribeFromPlan(planId);
    }

    // Clear active plans
    this.activePlans.clear();

    // Stop performance monitoring
    performanceMonitor.stopMonitoring();

    this.isInitialized = false;

    console.log('%c[PLAN-BASED COLLAB] Service cleanup completed', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
  }
}

// Create singleton instance
const planBasedCollaborationService = new PlanBasedCollaborationService();

export default planBasedCollaborationService;
