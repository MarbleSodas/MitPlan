import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReadOnly } from '../contexts/ReadOnlyContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { useDisplayName } from '../contexts/DisplayNameContext';

/**
 * Hook to automatically join collaboration when accessing shared plans
 * This hook is used in App.jsx where all contexts are available
 */
export const useAutoJoinCollaboration = () => {
  const { isAuthenticated } = useAuth();
  const { currentPlan, isSharedPlan } = useReadOnly();
  const { joinPlan, isConnected, isCollaborating } = useCollaboration();
  const { canEdit } = useDisplayName();

  // Prevent concurrent join attempts
  const isJoiningRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const lastPlanIdRef = useRef(null);

  useEffect(() => {
    const autoJoinSharedPlan = async () => {
      // Extract plan ID from URL first
      const pathMatch = window.location.pathname.match(/^\/plan\/shared\/([a-f0-9-]{36})$/i);
      const planId = pathMatch ? pathMatch[1] : null;

      // Check if we're on a shared plan URL
      const isSharedPlanUrl = isSharedPlan();

      // Skip if no plan ID or not a shared plan URL
      if (!planId || !isSharedPlanUrl) {
        return;
      }

      // Skip if we've already processed this plan ID
      if (lastPlanIdRef.current === planId && hasJoinedRef.current) {
        return;
      }

      // Prevent concurrent join attempts
      if (isJoiningRef.current) {
        console.log('%c[AUTO-JOIN] Skipping - join in progress', 'background: #9E9E9E; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          isJoining: isJoiningRef.current
        });
        return;
      }

      // Only auto-join if:
      // 1. We're connected to Firebase
      // 2. We're not already collaborating on this plan
      // Note: Removed currentPlan dependency to prevent infinite loops
      if (!isConnected || isCollaborating) {
        console.log('%c[AUTO-JOIN] Skipping auto-join', 'background: #9E9E9E; color: white; padding: 2px 5px; border-radius: 3px;', {
          isConnected,
          isCollaborating,
          planId,
          reason: !isConnected ? 'not connected' : 'already collaborating'
        });
        return;
      }

      console.log('%c[AUTO-JOIN] Auto-joining shared plan collaboration', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        planId,
        canEdit,
        isAuthenticated,
        userType: isAuthenticated ? 'authenticated' : 'anonymous'
      });

      // Set joining flag to prevent concurrent attempts
      isJoiningRef.current = true;
      lastPlanIdRef.current = planId;

      try {
        // Join without passing plan data - let collaboration system handle its own data needs
        await joinPlan(planId);
        hasJoinedRef.current = true; // Mark as successfully joined
        console.log('%c[AUTO-JOIN] Successfully auto-joined collaboration', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', planId);
      } catch (error) {
        console.warn('%c[AUTO-JOIN] Failed to auto-join collaboration, user can still view plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          planId,
          error: error.message,
          stack: error.stack
        });
        // Don't block plan viewing if auto-join fails
      } finally {
        isJoiningRef.current = false; // Reset joining flag
      }
    };

    autoJoinSharedPlan();
  }, [isConnected, isSharedPlan, isCollaborating, joinPlan, isAuthenticated]);

  // Reset join flags when URL changes (different plan)
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/plan\/shared\/([a-f0-9-]{36})$/i);
    const currentPlanId = pathMatch ? pathMatch[1] : null;

    if (currentPlanId !== lastPlanIdRef.current) {
      hasJoinedRef.current = false;
      isJoiningRef.current = false;
      lastPlanIdRef.current = null;
    }
  }, [window.location.pathname]);
};

export default useAutoJoinCollaboration;
