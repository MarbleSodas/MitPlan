import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useDisplayName } from './DisplayNameContext';

// Create the context
const ReadOnlyContext = createContext();

// Create a provider component
export const ReadOnlyProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  // Safely get display name context with error boundary
  let displayNameContext;
  try {
    displayNameContext = useDisplayName();
  } catch (error) {
    console.warn('DisplayNameProvider not available in ReadOnlyContext, using fallback values:', error.message);
    displayNameContext = {
      canEdit: isAuthenticated, // Fallback to authentication status
      needsDisplayName: !isAuthenticated // Need display name if not authenticated
    };
  }

  const { canEdit: canEditWithDisplayName, needsDisplayName } = displayNameContext;
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);

  // Error state management for URL/plan loading errors
  const [urlError, setUrlError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current URL is a shared plan
  const isSharedPlan = () => {
    return window.location.pathname.includes('/plan/shared/');
  };

  // Determine read-only state based on authentication, plan ownership, sharing status, and display name
  useEffect(() => {
    const isShared = isSharedPlan();

    console.log('%c[READ-ONLY] Evaluating read-only state', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      isAuthenticated,
      user: user?.id,
      currentPlan: currentPlan?.id,
      planOwner: currentPlan?.user_id || currentPlan?.userId,
      isSharedPlan: isShared,
      canEditWithDisplayName,
      needsDisplayName
    });

    // If no plan is loaded, default to editable (for new plans)
    if (!currentPlan) {
      setIsReadOnly(false);
      setReadOnlyReason(null);
      return;
    }

    // For shared plans, handle differently based on display name availability
    if (isShared) {
      if (!isAuthenticated && needsDisplayName) {
        // Unauthenticated users need to provide display name to edit
        setIsReadOnly(true);
        setReadOnlyReason('needs_display_name');
        console.log('%c[READ-ONLY] Shared plan view-only mode: Display name required for editing', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          needsDisplayName,
          canEditWithDisplayName
        });
        return;
      } else if (canEditWithDisplayName) {
        // User can edit (authenticated or has provided display name)
        setIsReadOnly(false);
        setReadOnlyReason(null);
        console.log('%c[READ-ONLY] Shared plan edit mode: Collaborative editing enabled', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
          isAuthenticated,
          canEditWithDisplayName,
          planId: currentPlan?.id
        });
        return;
      }
    }

    // For non-shared plans, use original logic
    if (!isAuthenticated) {
      setIsReadOnly(true);
      setReadOnlyReason('unauthenticated');
      console.log('%c[READ-ONLY] Read-only mode: User not authenticated', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      return;
    }

    // If user is authenticated but doesn't own the plan, it's read-only
    const planOwnerId = currentPlan.user_id || currentPlan.userId;
    if (planOwnerId && user?.id !== planOwnerId) {
      setIsReadOnly(true);
      setReadOnlyReason('not_owner');
      console.log('%c[READ-ONLY] Read-only mode: User does not own plan', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      return;
    }

    // Otherwise, user can edit
    setIsReadOnly(false);
    setReadOnlyReason(null);
    console.log('%c[READ-ONLY] Edit mode: User can modify plan', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
  }, [isAuthenticated, user, currentPlan, canEditWithDisplayName, needsDisplayName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Function to set the current plan (called when a plan is loaded)
  const setPlanContext = (plan) => {
    console.log('%c[READ-ONLY] Setting plan context', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', plan);
    setCurrentPlan(plan);
  };

  // Function to clear the plan context (called when creating a new plan)
  const clearPlanContext = () => {
    console.log('%c[READ-ONLY] Clearing plan context', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
    setCurrentPlan(null);
    // Also clear any URL errors when clearing plan context
    setUrlError(null);
  };

  // Function to set URL error state
  const setUrlErrorState = (error) => {
    console.log('%c[READ-ONLY] Setting URL error state', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    setUrlError(error);
    // Clear plan context when there's a URL error
    setCurrentPlan(null);
  };

  // Function to clear URL error state
  const clearUrlError = () => {
    console.log('%c[READ-ONLY] Clearing URL error state', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    setUrlError(null);
  };

  // Timeout ref for loading state
  const loadingTimeoutRef = useRef(null);

  // Function to set loading state with timeout
  const setLoadingState = (loading) => {
    console.log('%c[READ-ONLY] Setting loading state', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', loading);
    setIsLoading(loading);

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Set a timeout to automatically clear loading state after 30 seconds
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('%c[READ-ONLY] Loading timeout reached, clearing loading state', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
        setIsLoading(false);
        // Set a timeout error if still loading after 30 seconds
        setUrlError({
          type: 'network_error',
          message: 'Loading timeout - the plan may be taking too long to load',
          canRetry: true
        });
      }, 30000); // 30 second timeout
    }
  };

  // Get user-friendly reason for read-only mode
  const getReadOnlyMessage = () => {
    switch (readOnlyReason) {
      case 'unauthenticated':
        return {
          title: 'Viewing in Read-Only Mode',
          message: 'Sign in to edit this mitigation plan and create your own plans.',
          actionText: 'Sign In to Edit'
        };
      case 'needs_display_name':
        return {
          title: 'Viewing Shared Plan',
          message: 'Enter your name or sign in to collaborate on this plan in real-time with other users.',
          actionText: 'Join Collaboration'
        };
      case 'not_owner':
        return {
          title: 'Viewing Shared Plan',
          message: 'This plan belongs to another user. You can view it but cannot make changes.',
          actionText: 'Create Your Own Plan'
        };
      default:
        return null;
    }
  };

  // Context value
  const contextValue = {
    // State
    isReadOnly,
    readOnlyReason,
    currentPlan,
    urlError,
    isLoading,

    // Actions
    setPlanContext,
    clearPlanContext,
    setUrlErrorState,
    clearUrlError,
    setLoadingState,

    // Helpers
    getReadOnlyMessage,
    isSharedPlan,

    // Computed values
    canEdit: !isReadOnly,
    canDragAndDrop: !isReadOnly,
    canSelectJobs: !isReadOnly,
    canRemoveMitigations: !isReadOnly,
    canSavePlan: !isReadOnly && isAuthenticated,
    isCollaborativeMode: isSharedPlan(), // Enable collaborative mode for all users on shared plans
    showCollaborationFeatures: isSharedPlan(),
    hasError: !!urlError
  };

  return (
    <ReadOnlyContext.Provider value={contextValue}>
      {children}
    </ReadOnlyContext.Provider>
  );
};

// Custom hook for using the read-only context
export const useReadOnly = () => {
  const context = useContext(ReadOnlyContext);
  if (context === undefined) {
    throw new Error('useReadOnly must be used within a ReadOnlyProvider');
  }
  return context;
};

export default ReadOnlyContext;
