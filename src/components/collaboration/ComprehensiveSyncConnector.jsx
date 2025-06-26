/**
 * ComprehensiveSyncConnector
 * 
 * React component that connects the comprehensive real-time sync service
 * with the mitigation context to automatically sync assignment changes.
 */

import { useEffect, useRef } from 'react';
import { useMitigationContext } from '../../contexts/MitigationContext';
import useOptimizedRealTimeSync from '../../hooks/useOptimizedRealTimeSync';

const ComprehensiveSyncConnector = ({ planId, enabled = true }) => {
  const { assignments } = useMitigationContext();
  const lastSyncedAssignmentsRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  const {
    isActive: shouldSync,
    syncMitigationAssignments: syncAssignments,
    isActive: isConnected
  } = useOptimizedRealTimeSync(planId, enabled);

  // Debounced sync function to prevent excessive syncing
  const debouncedSyncAssignments = (newAssignments) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await syncAssignments(newAssignments);
        lastSyncedAssignmentsRef.current = newAssignments;
        
        console.log('%c[COMPREHENSIVE SYNC CONNECTOR] Synced assignments', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          assignmentCount: Object.keys(newAssignments).length
        });
      } catch (error) {
        console.error('%c[COMPREHENSIVE SYNC CONNECTOR] Failed to sync assignments', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          error: error.message
        });
      }
    }, 300); // 300ms debounce
  };

  // Monitor assignment changes and sync them
  useEffect(() => {
    if (!enabled || !shouldSync || !isConnected || !assignments) {
      return;
    }

    // Check if assignments have actually changed
    const assignmentsString = JSON.stringify(assignments);
    const lastSyncedString = JSON.stringify(lastSyncedAssignmentsRef.current);

    if (assignmentsString !== lastSyncedString) {
      console.log('%c[COMPREHENSIVE SYNC CONNECTOR] Assignments changed, syncing', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        assignmentCount: Object.keys(assignments).length,
        hasLastSynced: !!lastSyncedAssignmentsRef.current
      });

      debouncedSyncAssignments(assignments);
    }
  }, [assignments, enabled, shouldSync, isConnected, planId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default ComprehensiveSyncConnector;
