import { useEffect, useRef } from 'react';
import { useCollaboration as useCollaborationContext } from '../contexts/CollaborationContext';
import { useReadOnly } from '../contexts/ReadOnlyContext';
import PlanValidationService from '../services/PlanValidationService';
import ErrorHandlingService from '../services/ErrorHandlingService';

/**
 * Hook for plan-specific collaboration features
 * Handles real-time synchronization of plan changes
 *
 * OPTIMIZED DATA FLOW:
 * 1. URL handler loads and validates plan data from database once
 * 2. Plan data is stored in ReadOnlyContext via setPlanContext()
 * 3. Collaboration system works independently of plan data to prevent infinite loops
 * 4. Only collaborative state (assignments, selections, presence) is synchronized
 * 5. Plan data is cached and not re-fetched during collaboration
 */
export const useCollaboration = () => {
  // Extract plan ID from URL
  const planId = (() => {
    const pathMatch = window.location.pathname.match(/^\/plan\/(?:shared\/)?([a-f0-9-]{36})$/i);
    return pathMatch ? pathMatch[1] : null;
  })();

  // Get the current plan data from ReadOnlyContext (loaded by URL handler)
  const { currentPlan } = useReadOnly();

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

  // NOTE: Auto-join logic removed from this hook to prevent infinite loops
  // Auto-joining is now handled exclusively by useAutoJoinCollaboration hook
  // This hook only manages collaboration state and event handlers

  // Handle incoming plan updates through collaboration context
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
        // Log the update for debugging - actual plan updates will be handled by the UI components
        // that subscribe to the collaboration context directly
        console.log('📡 Collaboration update received:', {
          type: updateData.type,
          hasAssignments: !!updateData.changes?.assignments,
          hasJobs: !!updateData.changes?.selected_jobs,
          hasTankPositions: !!updateData.changes?.tank_positions,
          version: updateData.version
        });

        // Store update info to prevent loops
        lastUpdateRef.current = {
          version: updateData.version,
          timestamp: Date.now()
        };

        console.log('✅ Processed remote plan update');
      } catch (error) {
        console.error('❌ Error processing remote update:', error);
      } finally {
        // Reset updating flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    };

    onPlanUpdate(handlePlanUpdate);
  }, [onPlanUpdate]);

  // Handle user presence events - optimized to prevent spam
  const previousUsersRef = useRef(new Set());

  useEffect(() => {
    const handleUserJoined = (userData) => {
      // Only log if this is actually a new user joining
      if (!previousUsersRef.current.has(userData.id)) {
        console.log('👥 User joined collaboration:', userData);
        previousUsersRef.current.add(userData.id);
        // Could show a notification here
      }
    };

    const handleUserLeft = (userData) => {
      if (previousUsersRef.current.has(userData.id)) {
        console.log('👋 User left collaboration:', userData);
        previousUsersRef.current.delete(userData.id);
        // Could show a notification here
      }
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
