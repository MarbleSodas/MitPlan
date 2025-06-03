import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDisplayName } from '../../contexts/DisplayNameContext';
import { useReadOnly } from '../../contexts/ReadOnlyContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import DisplayNamePrompt from './DisplayNamePrompt';

const CollaborationOnboarding = () => {
  const { isAuthenticated } = useAuth();

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
  const [promptMode, setPromptMode] = useState('modal'); // 'modal' or 'banner'
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  // Check if we should show the onboarding prompt
  useEffect(() => {
    const shouldShowPrompt = () => {
      // Only show for shared plans
      if (!isSharedPlan()) return false;
      
      // Don't show if already authenticated
      if (isAuthenticated) return false;
      
      // Don't show if user can already edit
      if (canEdit) return false;
      
      // Don't show if we've already shown it this session
      if (hasShownPrompt) return false;
      
      // Don't show if no plan is loaded yet
      if (!currentPlan) return false;
      
      // Show if user needs display name
      return needsDisplayName;
    };

    if (shouldShowPrompt()) {
      // Small delay to ensure plan is fully loaded
      const timer = setTimeout(() => {
        setShowPrompt(true);
        setHasShownPrompt(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isSharedPlan, isAuthenticated, canEdit, needsDisplayName, currentPlan, hasShownPrompt]);

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
    // Don't set hasShownPrompt to true here - allow re-showing if user changes their mind
  };

  // Auto-join collaboration when user becomes able to edit
  useEffect(() => {
    const autoJoinCollaboration = async () => {
      if (!canEdit || !isConnected || !currentPlan?.id) return;
      
      // Extract plan ID from URL
      const pathMatch = window.location.pathname.match(/^\/plan\/shared\/([a-f0-9-]{36})$/i);
      const planId = pathMatch ? pathMatch[1] : null;
      
      if (planId && isSharedPlan()) {
        console.log('🤝 Auto-joining collaboration for user who can now edit');
        try {
          await joinPlan(planId);
        } catch (error) {
          console.error('❌ Failed to auto-join collaboration:', error);
        }
      }
    };

    autoJoinCollaboration();
  }, [canEdit, isConnected, currentPlan, joinPlan, isSharedPlan]);

  // Don't render anything if not needed
  if (!isSharedPlan() || isAuthenticated || canEdit || !showPrompt) {
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
