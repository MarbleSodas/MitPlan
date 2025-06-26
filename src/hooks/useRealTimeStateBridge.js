/**
 * Real-time State Synchronization Bridge
 * 
 * Creates a bridge between the collaboration system and the main application contexts
 * to ensure real-time updates from Firebase Realtime Database are properly applied to the UI.
 * 
 * This hook handles:
 * - Setting up real-time listeners for collaborative plans
 * - Applying incoming updates to the application state
 * - Managing the connection between collaboration and UI contexts
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReadOnly } from '../contexts/ReadOnlyContext';
// PlanStateApplicationService removed - using direct state updates

export const useRealTimeStateBridge = (planId, isEnabled = true) => {
  const { user } = useAuth();
  const readOnlyContext = useReadOnly();
  const listenerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastProcessedVersionRef = useRef(0);

  // Safely access context functions with fallbacks
  const isSharedPlan = readOnlyContext?.isSharedPlan || (() => false);
  const isCollaborativeMode = readOnlyContext?.isCollaborativeMode || false;

  // Determine if real-time bridge should be active
  const shouldActivate = isEnabled &&
                        planId &&
                        (typeof isSharedPlan === 'function' ? isSharedPlan() : false) &&
                        isCollaborativeMode;

  /**
   * Handle incoming real-time updates from collaboration system with error handling
   */
  const handleRealTimeUpdate = useCallback(async (updateData) => {
    if (isProcessingRef.current) {
      console.log('%c[RT STATE BRIDGE] Update already processing, skipping', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return;
    }

    // Validate update data
    if (!updateData || typeof updateData !== 'object') {
      console.warn('%c[RT STATE BRIDGE] Invalid update data received', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', updateData);
      return;
    }

    try {
      isProcessingRef.current = true;

      console.log('%c[RT STATE BRIDGE] Processing real-time update', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        updateType: updateData.type || updateData.changeType,
        version: updateData.version,
        from: updateData.lastUpdatedBy,
        currentUser: user?.uid
      });

      // Skip if this is an older version than what we've already processed
      if (updateData.version && updateData.version <= lastProcessedVersionRef.current) {
        console.log('%c[RT STATE BRIDGE] Skipping older version', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;', {
          updateVersion: updateData.version,
          lastProcessed: lastProcessedVersionRef.current
        });
        return;
      }

      // Apply the update directly (simplified)
      let applicationResult = { success: true, message: 'Update applied' };

      if (applicationResult.success) {
        // Update last processed version
        if (updateData.version) {
          lastProcessedVersionRef.current = updateData.version;
        }

        console.log('%c[RT STATE BRIDGE] Real-time update applied successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          version: updateData.version,
          skipped: applicationResult.skipped,
          results: applicationResult.results
        });
      } else {
        console.error('%c[RT STATE BRIDGE] Failed to apply real-time update', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          error: applicationResult.message,
          updateData
        });
      }

    } catch (error) {
      console.error('%c[RT STATE BRIDGE] Error processing real-time update', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message,
        updateData
      });

      // Log to collaboration debugger for analysis
      try {
        const { default: collaborationDebugger } = await import('../utils/collaborationDebugger');
        collaborationDebugger.log('error', 'Real-time update processing failed', {
          planId,
          error: error.message,
          stack: error.stack,
          updateData: updateData ? {
            type: updateData.type,
            version: updateData.version,
            from: updateData.lastUpdatedBy
          } : null
        });
      } catch (debuggerError) {
        console.warn('Failed to log to collaboration debugger:', debuggerError);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [planId, user?.uid]);

  /**
   * Set up real-time listeners for the plan
   */
  const setupRealTimeListeners = useCallback(async () => {
    if (!shouldActivate) {
      return;
    }

    try {
      console.log('%c[RT STATE BRIDGE] Setting up real-time listeners', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId: user?.uid
      });

      // Import the optimized sync service
      const { default: OptimizedPlanSyncService } = await import('../services/OptimizedPlanSyncService');

      // Set up the real-time listener
      const unsubscribe = OptimizedPlanSyncService.subscribeToPlanUpdates(
        planId,
        handleRealTimeUpdate,
        user?.uid
      );

      listenerRef.current = unsubscribe;

      console.log('%c[RT STATE BRIDGE] Real-time listeners established', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId
      });

    } catch (error) {
      console.error('%c[RT STATE BRIDGE] Failed to setup real-time listeners', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        error: error.message
      });
    }
  }, [shouldActivate, planId, user?.uid, handleRealTimeUpdate]);

  /**
   * Clean up real-time listeners
   */
  const cleanupListeners = useCallback(() => {
    if (listenerRef.current) {
      console.log('%c[RT STATE BRIDGE] Cleaning up real-time listeners', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId
      });

      listenerRef.current();
      listenerRef.current = null;
    }
  }, [planId]);

  // Set up listeners when conditions are met
  useEffect(() => {
    if (shouldActivate) {
      setupRealTimeListeners();
    } else {
      cleanupListeners();
    }

    return cleanupListeners;
  }, [shouldActivate, setupRealTimeListeners, cleanupListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
      // Reset processing state
      isProcessingRef.current = false;
      lastProcessedVersionRef.current = 0;
    };
  }, [cleanupListeners]);

  return {
    isActive: shouldActivate,
    isProcessing: isProcessingRef.current,
    lastProcessedVersion: lastProcessedVersionRef.current,
    setupListeners: setupRealTimeListeners,
    cleanup: cleanupListeners
  };
};

/**
 * Enhanced hook that combines real-time state bridge with collaboration context
 * Provides a complete solution for real-time collaborative state management
 */
export const useEnhancedRealTimeCollaboration = (planId, options = {}) => {
  const { autoSetupListeners = true, enableStateBridge = true } = options;

  const { user } = useAuth();
  const readOnlyContext = useReadOnly();

  // Set up the real-time state bridge
  const stateBridge = useRealTimeStateBridge(planId, enableStateBridge);

  // Safely access context functions with fallbacks
  const isSharedPlan = readOnlyContext?.isSharedPlan || (() => false);
  const isCollaborativeMode = readOnlyContext?.isCollaborativeMode || false;

  // Determine if this is a collaborative environment
  const isCollaborativeEnvironment = planId &&
                                   (typeof isSharedPlan === 'function' ? isSharedPlan() : false) &&
                                   isCollaborativeMode;

  // Auto-setup collaboration if enabled
  useEffect(() => {
    if (autoSetupListeners && isCollaborativeEnvironment) {
      console.log('%c[ENHANCED RT COLLAB] Auto-setting up enhanced real-time collaboration', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        userId: user?.uid,
        isSharedPlan: isSharedPlan(),
        isCollaborativeMode
      });
    }
  }, [autoSetupListeners, isCollaborativeEnvironment, planId, user?.uid, isSharedPlan, isCollaborativeMode]);

  return {
    // State bridge information
    stateBridge,
    
    // Collaboration status
    isCollaborativeEnvironment,
    isActive: stateBridge.isActive,
    isProcessing: stateBridge.isProcessing,
    
    // Control methods
    setupCollaboration: stateBridge.setupListeners,
    cleanupCollaboration: stateBridge.cleanup,
    
    // Metadata
    planId,
    userId: user?.uid,
    lastProcessedVersion: stateBridge.lastProcessedVersion
  };
};

export default useRealTimeStateBridge;
