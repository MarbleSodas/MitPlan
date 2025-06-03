import { useEffect, useRef, useCallback } from 'react';
import { useCollaboration as useCollaborationContext } from '../contexts/CollaborationContext';
import { useAuth } from '../contexts/AuthContext';
import { useReadOnly } from '../contexts/ReadOnlyContext';

/**
 * Enhanced hook for shared plan collaboration
 * Handles real-time synchronization, user presence, and selection tracking
 */
export const useSharedPlanCollaboration = (planData, updateCallbacks) => {
  const { user } = useAuth();
  const { isSharedPlan, isCollaborativeMode } = useReadOnly();
  
  // Extract plan ID from URL
  const planId = (() => {
    const pathMatch = window.location.pathname.match(/^\/plan\/shared\/([a-f0-9-]{36})$/i);
    return pathMatch ? pathMatch[1] : null;
  })();

  const {
    isConnected,
    isCollaborating,
    roomUsers,
    userSelections,
    joinPlan,
    leavePlan,
    onPlanUpdate,
    updateSelection,
    clearSelection,
    broadcastPlanUpdate
  } = useCollaborationContext();

  const lastUpdateRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const currentSelectionRef = useRef(null);

  // Join collaboration when accessing shared plan
  useEffect(() => {
    if (planId && isConnected && isSharedPlan() && isCollaborativeMode) {
      console.log('🤝 Joining shared plan collaboration:', planId);
      joinPlan(planId);
    }

    return () => {
      if (isCollaborating) {
        console.log('🤝 Leaving shared plan collaboration:', planId);
        leavePlan();
      }
    };
  }, [planId, isConnected, isSharedPlan, isCollaborativeMode, joinPlan, leavePlan]);

  // Handle incoming plan updates from other users
  useEffect(() => {
    if (!isCollaborating) return;

    const handlePlanUpdate = (update) => {
      // Prevent processing our own updates
      if (update.userId === user?.uid) {
        return;
      }

      // Check if this update is newer than our last local update
      const isNewerUpdate = !lastUpdateRef.current || 
                           update.timestamp > lastUpdateRef.current.timestamp;

      if (isNewerUpdate && !isUpdatingRef.current) {
        console.log('🔄 Processing remote plan update:', update);
        
        isUpdatingRef.current = true;
        
        try {
          // Apply updates based on type
          switch (update.type) {
            case 'assignments_update':
              if (updateCallbacks.onAssignmentsUpdate) {
                updateCallbacks.onAssignmentsUpdate(update.data.assignments);
              }
              break;
            case 'jobs_update':
              if (updateCallbacks.onJobsUpdate) {
                updateCallbacks.onJobsUpdate(update.data.selectedJobs);
              }
              break;
            case 'tank_positions_update':
              if (updateCallbacks.onTankPositionsUpdate) {
                updateCallbacks.onTankPositionsUpdate(update.data.tankPositions);
              }
              break;
            case 'full_plan_update':
              // Apply all changes at once
              if (update.data.assignments && updateCallbacks.onAssignmentsUpdate) {
                updateCallbacks.onAssignmentsUpdate(update.data.assignments);
              }
              if (update.data.selectedJobs && updateCallbacks.onJobsUpdate) {
                updateCallbacks.onJobsUpdate(update.data.selectedJobs);
              }
              if (update.data.tankPositions && updateCallbacks.onTankPositionsUpdate) {
                updateCallbacks.onTankPositionsUpdate(update.data.tankPositions);
              }
              break;
          }
        } finally {
          isUpdatingRef.current = false;
        }
      }
    };

    onPlanUpdate(handlePlanUpdate);
  }, [isCollaborating, user?.uid, updateCallbacks, onPlanUpdate]);

  // Broadcast plan changes to other users
  const broadcastUpdate = useCallback(async (updateType, data) => {
    if (!isCollaborating || isUpdatingRef.current) {
      return;
    }

    try {
      await broadcastPlanUpdate({
        type: updateType,
        data,
        timestamp: Date.now()
      });

      // Mark this as our update to prevent echo
      lastUpdateRef.current = {
        timestamp: Date.now(),
        type: updateType
      };
    } catch (error) {
      console.error('❌ Failed to broadcast update:', error);
    }
  }, [isCollaborating, broadcastPlanUpdate]);

  // Selection management
  const selectElement = useCallback(async (elementId, elementType = 'boss_action') => {
    if (!isCollaborating) return;

    try {
      await updateSelection(elementId, {
        elementType,
        timestamp: Date.now()
      });
      currentSelectionRef.current = elementId;
    } catch (error) {
      console.error('❌ Failed to update selection:', error);
    }
  }, [isCollaborating, updateSelection]);

  const clearElementSelection = useCallback(async () => {
    if (!isCollaborating) return;

    try {
      await clearSelection();
      currentSelectionRef.current = null;
    } catch (error) {
      console.error('❌ Failed to clear selection:', error);
    }
  }, [isCollaborating, clearSelection]);

  // Debounced update functions
  const debouncedBroadcast = useCallback(
    debounce((updateType, data) => {
      broadcastUpdate(updateType, data);
    }, 500),
    [broadcastUpdate]
  );

  // Monitor plan data changes and broadcast them
  useEffect(() => {
    if (!isCollaborating || isUpdatingRef.current) return;

    // Broadcast assignments changes
    if (planData.assignments) {
      debouncedBroadcast('assignments_update', { assignments: planData.assignments });
    }
  }, [planData.assignments, isCollaborating, debouncedBroadcast]);

  useEffect(() => {
    if (!isCollaborating || isUpdatingRef.current) return;

    // Broadcast job selection changes
    if (planData.selectedJobs) {
      debouncedBroadcast('jobs_update', { selectedJobs: planData.selectedJobs });
    }
  }, [planData.selectedJobs, isCollaborating, debouncedBroadcast]);

  useEffect(() => {
    if (!isCollaborating || isUpdatingRef.current) return;

    // Broadcast tank position changes
    if (planData.tankPositions) {
      debouncedBroadcast('tank_positions_update', { tankPositions: planData.tankPositions });
    }
  }, [planData.tankPositions, isCollaborating, debouncedBroadcast]);

  return {
    // Collaboration state
    isConnected,
    isCollaborating: isCollaborating && isSharedPlan(),
    roomUsers,
    userSelections,
    currentUserId: user?.uid,

    // Selection management
    selectElement,
    clearElementSelection,
    currentSelection: currentSelectionRef.current,

    // Manual update broadcasting
    broadcastUpdate,

    // Utility
    isActiveCollaboration: () => isCollaborating && roomUsers.length > 1
  };
};

// Simple debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default useSharedPlanCollaboration;
