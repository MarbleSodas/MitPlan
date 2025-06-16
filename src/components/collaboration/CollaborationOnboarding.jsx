import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDisplayName } from '../../contexts/DisplayNameContext';
import { useReadOnly } from '../../contexts/ReadOnlyContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import DisplayNamePrompt from './DisplayNamePrompt';

const CollaborationOnboarding = () => {
  const { isAuthenticated } = useAuth();

  // Debug logging for component mount/unmount
  useEffect(() => {
    console.log('%c[COLLABORATION ONBOARDING] Component mounted', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    return () => {
      console.log('%c[COLLABORATION ONBOARDING] Component unmounted', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;');
    };
  }, []);

  // Safely get display name context with error boundary
  let displayNameContext;
  try {
    displayNameContext = useDisplayName();
  } catch (error) {
    console.warn('DisplayNameProvider not available in CollaborationOnboarding, component will not render:', error.message);
    return null; // Don't render if DisplayNameProvider is not available
  }

  const {
    needsDisplayName,
    setDisplayName,
    generateAnonymousName,
    displayName,
    canEdit
  } = displayNameContext;
  const { isSharedPlan, currentPlan } = useReadOnly();
  const { joinPlan, isConnected } = useCollaboration();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptMode, setPromptMode] = useState('banner'); // Default to 'banner' for non-blocking experience
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  const [lastPlanId, setLastPlanId] = useState(null);

  // Force show prompt for testing (check URL parameter)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forcePrompt = urlParams.get('force_prompt');
    if (forcePrompt === 'true' && isSharedPlan()) {
      console.log('%c[COLLABORATION ONBOARDING] Force showing prompt for testing', 'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;');
      setShowPrompt(true);
      setHasShownPrompt(false);
    }
  }, [isSharedPlan]);

  // Reset prompt state when navigating to a different shared plan
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/plan\/shared\/([a-f0-9-]{36})$/i);
    const currentPlanId = pathMatch ? pathMatch[1] : null;

    if (currentPlanId && currentPlanId !== lastPlanId) {
      console.log('%c[COLLABORATION ONBOARDING] New plan detected, resetting prompt state', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
        oldPlanId: lastPlanId,
        newPlanId: currentPlanId
      });
      setHasShownPrompt(false);
      setShowPrompt(false);
      setLastPlanId(currentPlanId);
    }
  }, [lastPlanId]);

  // Check if we should show the onboarding prompt
  useEffect(() => {
    const shouldShowPrompt = () => {
      console.log('%c[COLLABORATION ONBOARDING] Evaluating prompt conditions', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
        isSharedPlan: isSharedPlan(),
        isAuthenticated,
        canEdit,
        needsDisplayName,
        hasCurrentPlan: !!currentPlan,
        hasShownPrompt,
        displayName
      });

      // Only show for shared plans
      if (!isSharedPlan()) {
        console.log('%c[COLLABORATION ONBOARDING] Not a shared plan', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
        return false;
      }

      // Don't show if already authenticated
      if (isAuthenticated) {
        console.log('%c[COLLABORATION ONBOARDING] User is authenticated', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
        return false;
      }

      // Don't show if user can already edit (has provided display name)
      if (canEdit) {
        console.log('%c[COLLABORATION ONBOARDING] User can already edit', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', { canEdit, displayName });
        return false;
      }

      // Don't show if we've already shown it this session
      if (hasShownPrompt) {
        console.log('%c[COLLABORATION ONBOARDING] Already shown this session', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
        return false;
      }

      // Don't show if no plan is loaded yet
      if (!currentPlan) {
        console.log('%c[COLLABORATION ONBOARDING] No plan loaded yet', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
        return false;
      }

      // Show if user needs display name
      const shouldShow = needsDisplayName;
      console.log('%c[COLLABORATION ONBOARDING] Final decision:', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', { shouldShow, needsDisplayName });
      return shouldShow;
    };

    const result = shouldShowPrompt();
    if (result) {
      console.log('%c[COLLABORATION ONBOARDING] Showing prompt in 1 second', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
      // Small delay to ensure plan is fully loaded
      const timer = setTimeout(() => {
        setShowPrompt(true);
        setHasShownPrompt(true);
        console.log('%c[COLLABORATION ONBOARDING] Prompt displayed', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isSharedPlan, isAuthenticated, canEdit, needsDisplayName, currentPlan, hasShownPrompt, displayName]);

  // Handle display name submission
  const handleDisplayNameSubmit = async (customName) => {
    try {
      let finalName = customName;
      
      if (!finalName) {
        // Generate anonymous name if none provided
        finalName = generateAnonymousName();
      }
      
      // Set the display name
      setDisplayName(finalName);
      
      // Close the prompt
      setShowPrompt(false);
      
      // Try to join collaboration if connected
      if (isConnected && currentPlan?.id) {
        // Extract plan ID from URL
        const pathMatch = window.location.pathname.match(/^\/plan\/shared\/([a-f0-9-]{36})$/i);
        const planId = pathMatch ? pathMatch[1] : null;
        
        if (planId) {
          console.log('🤝 Joining collaboration after display name setup:', finalName);
          await joinPlan(planId);
        }
      }
      
      console.log('✅ Display name onboarding completed:', finalName);
    } catch (error) {
      console.error('❌ Failed to complete display name onboarding:', error);
      // Could show error message to user here
    }
  };

  // Handle sign in
  const handleSignIn = () => {
    // Close the prompt - authentication will handle the rest
    setShowPrompt(false);
    console.log('🔐 User chose to sign in instead of providing display name');
  };

  // Handle prompt close
  const handlePromptClose = () => {
    setShowPrompt(false);
    console.log('%c[COLLABORATION ONBOARDING] Prompt closed by user', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    // Don't set hasShownPrompt to true here - allow re-showing if user changes their mind
  };

  // Add a mechanism to re-show prompt if user dismisses but conditions are still met
  useEffect(() => {
    if (!showPrompt && !hasShownPrompt && isSharedPlan() && !isAuthenticated && !canEdit && needsDisplayName && currentPlan) {
      console.log('%c[COLLABORATION ONBOARDING] Re-evaluating prompt after dismissal', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      const timer = setTimeout(() => {
        if (!isAuthenticated && !canEdit) {
          console.log('%c[COLLABORATION ONBOARDING] Re-showing prompt after dismissal', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
          setShowPrompt(true);
        }
      }, 5000); // Re-show after 5 seconds if conditions are still met

      return () => clearTimeout(timer);
    }
  }, [showPrompt, hasShownPrompt, isSharedPlan, isAuthenticated, canEdit, needsDisplayName, currentPlan]);

  // Handle authentication state transitions
  useEffect(() => {
    if (isAuthenticated && showPrompt) {
      console.log('%c[COLLABORATION ONBOARDING] User authenticated, hiding prompt', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      setShowPrompt(false);
      setHasShownPrompt(true); // Mark as shown since user is now authenticated
    }
  }, [isAuthenticated, showPrompt]);

  // NOTE: Auto-join logic removed to prevent infinite loops
  // Auto-joining is now handled exclusively by useAutoJoinCollaboration hook

  // Enhanced render logic with better debugging
  const shouldRender = isSharedPlan() && !isAuthenticated && !canEdit && showPrompt;

  console.log('%c[COLLABORATION ONBOARDING] Render decision', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
    shouldRender,
    isSharedPlan: isSharedPlan(),
    isAuthenticated,
    canEdit,
    showPrompt,
    needsDisplayName,
    hasCurrentPlan: !!currentPlan
  });

  if (!shouldRender) {
    return null;
  }

  return (
    <DisplayNamePrompt
      isOpen={showPrompt}
      onClose={handlePromptClose}
      onSubmit={handleDisplayNameSubmit}
      onSignIn={handleSignIn}
      mode={promptMode}
      planName={currentPlan?.name || 'Shared Plan'}
    />
  );
};

export default CollaborationOnboarding;
