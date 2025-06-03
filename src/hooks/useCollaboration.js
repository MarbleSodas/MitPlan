import { useEffect, useRef } from 'react';
import { useCollaboration as useCollaborationContext } from '../contexts/CollaborationContext';

/**
 * Hook for plan-specific collaboration features
 * Handles real-time synchronization of plan changes
 */
export const useCollaboration = (planData, updateCallbacks) => {
  // Extract plan ID from URL
  const planId = (() => {
    const pathMatch = window.location.pathname.match(/^\/plan\/(?:shared\/)?([a-f0-9-]{36})$/i);
    return pathMatch ? pathMatch[1] : null;
  })();
  const {
    isConnected,
    isCollaborating,
    roomUsers,
    joinPlan,
    leavePlan,
    onPlanUpdate,
    onUserJoined,
    onUserLeft
  } = useCollaborationContext();

  const lastUpdateRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Join plan room when planId changes and it's a shared plan
  useEffect(() => {
    if (planId && isConnected) {
      // Check if this is a shared plan URL
      const isSharedPlan = window.location.pathname.includes('/plan/shared/');

      if (isSharedPlan) {
        console.log('🤝 Joining collaboration for shared plan:', planId);
        joinPlan(planId);
      }
    }

    return () => {
      if (isCollaborating) {
        console.log('🤝 Leaving collaboration for plan:', planId);
        leavePlan();
      }
    };
  }, [planId, isConnected, joinPlan, leavePlan, isCollaborating]);

  // Handle incoming plan updates
  useEffect(() => {
    const handlePlanUpdate = (updateData) => {
      // Prevent infinite loops by checking if we're currently updating
      if (isUpdatingRef.current) {
        console.log('🔄 Skipping update - currently updating');
        return;
      }

      // Prevent processing our own updates
      if (lastUpdateRef.current &&
          lastUpdateRef.current.version === updateData.version &&
          Date.now() - lastUpdateRef.current.timestamp < 1000) {
        console.log('🔄 Skipping own update');
        return;
      }

      console.log('📡 Processing remote plan update:', updateData);

      isUpdatingRef.current = true;

      try {
        // Apply updates based on what changed
        if (updateData.changes.assignments && updateCallbacks.onAssignmentsUpdate) {
          updateCallbacks.onAssignmentsUpdate(updateData.changes.assignments);
        }

        if (updateData.changes.selected_jobs && updateCallbacks.onJobsUpdate) {
          updateCallbacks.onJobsUpdate(updateData.changes.selected_jobs);
        }

        if (updateData.changes.tank_positions && updateCallbacks.onTankPositionsUpdate) {
          updateCallbacks.onTankPositionsUpdate(updateData.changes.tank_positions);
        }

        // Store update info to prevent loops
        lastUpdateRef.current = {
          version: updateData.version,
          timestamp: Date.now()
        };

        console.log('✅ Applied remote plan update');
      } catch (error) {
        console.error('❌ Error applying remote update:', error);
      } finally {
        // Reset updating flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    };

    onPlanUpdate(handlePlanUpdate);
  }, [updateCallbacks, onPlanUpdate]);

  // Handle user presence events
  useEffect(() => {
    const handleUserJoined = (userData) => {
      console.log('👥 User joined collaboration:', userData);
      // Could show a notification here
    };

    const handleUserLeft = (userData) => {
      console.log('👋 User left collaboration:', userData);
      // Could show a notification here
    };

    onUserJoined(handleUserJoined);
    onUserLeft(handleUserLeft);
  }, [onUserJoined, onUserLeft]);

  // Function to mark that we're making a local update
  const markLocalUpdate = (version) => {
    lastUpdateRef.current = {
      version,
      timestamp: Date.now()
    };
  };

  // Function to check if collaboration is active for current plan
  const isActiveCollaboration = () => {
    return isCollaborating &&
           window.location.pathname.includes('/plan/shared/') &&
           roomUsers.length > 1; // More than just the current user
  };

  return {
    isConnected,
    isCollaborating: isCollaborating && window.location.pathname.includes('/plan/shared/'),
    roomUsers,
    markLocalUpdate,
    isActiveCollaboration
  };
};

export default useCollaboration;
