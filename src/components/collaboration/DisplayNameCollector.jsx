/**
 * DisplayNameCollector Component
 * 
 * Orchestrates display name collection for unauthenticated users on shared plans.
 * Manages both modal and banner display based on user interaction and preferences.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { useDisplayName } from '../../contexts/DisplayNameContext';
import DisplayNameModal from './DisplayNameModal';
import DisplayNameBanner from './DisplayNameBanner';

const DisplayNameCollector = ({ planId, planTitle = 'Shared Plan' }) => {
  const { isAuthenticated } = useAuth();
  const { isCollaborating, roomUsers } = useCollaboration();
  const { 
    displayName, 
    hasProvidedName, 
    needsDisplayName, 
    canEdit, 
    setDisplayName 
  } = useDisplayName();

  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're on a shared plan page
  const isSharedPlan = planId && window.location.pathname.includes('/plan/shared/');

  // Load banner dismissal state from localStorage
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('mitplan_display_name_banner_dismissed') === 'true';
      setBannerDismissed(dismissed);
    } catch (error) {
      console.warn('Failed to load banner dismissal state:', error);
    }
  }, []);

  // Determine when to show banner or modal
  useEffect(() => {
    if (!isSharedPlan || isAuthenticated || hasProvidedName || bannerDismissed) {
      setShowBanner(false);
      return;
    }

    // Show banner for unauthenticated users who haven't provided a name
    setShowBanner(true);
  }, [isSharedPlan, isAuthenticated, hasProvidedName, bannerDismissed]);

  // Handle display name submission
  const handleSetDisplayName = async (name) => {
    setIsLoading(true);

    try {
      // Set display name in context
      setDisplayName(name);

      // Hide modal and banner
      setShowModal(false);
      setShowBanner(false);

      console.log('%c[DISPLAY NAME COLLECTOR] Name set successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        name,
        planId
      });

      // Trigger collaboration join after display name is set
      // Small delay to ensure context updates are processed
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('displayNameProvided', {
          detail: { displayName: name, planId }
        }));
      }, 100);

      return { success: true };
    } catch (error) {
      console.error('Failed to set display name:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal open from banner
  const handleShowModal = () => {
    setShowModal(true);
    setShowBanner(false);
  };

  // Handle modal close/skip
  const handleModalClose = () => {
    setShowModal(false);
    // Don't show banner again if user explicitly closed modal
    setBannerDismissed(true);
    try {
      localStorage.setItem('mitplan_display_name_banner_dismissed', 'true');
    } catch (error) {
      console.warn('Failed to save banner dismissal state:', error);
    }
  };

  // Handle banner dismissal
  const handleBannerDismiss = () => {
    setShowBanner(false);
    setBannerDismissed(true);
    try {
      localStorage.setItem('mitplan_display_name_banner_dismissed', 'true');
    } catch (error) {
      console.warn('Failed to save banner dismissal state:', error);
    }
  };

  // Auto-show modal on first visit to shared plan (if banner not dismissed and no banner showing)
  useEffect(() => {
    if (isSharedPlan && !isAuthenticated && !hasProvidedName && !bannerDismissed && !showBanner) {
      // Small delay to let the page load
      const timer = setTimeout(() => {
        // Show modal if banner is not visible and user still needs to provide name
        if (!showBanner && !hasProvidedName) {
          console.log('%c[DISPLAY NAME COLLECTOR] Auto-showing modal for shared plan', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
          setShowModal(true);
        }
      }, 2000); // Increased delay to ensure page is fully loaded

      return () => clearTimeout(timer);
    }
  }, [isSharedPlan, isAuthenticated, hasProvidedName, bannerDismissed, showBanner]);

  // Reset banner dismissal when user signs out
  useEffect(() => {
    if (!isAuthenticated && isSharedPlan) {
      // If user signs out while on a shared plan, reset banner dismissal
      // so they can set a display name again
      const wasAuthenticated = localStorage.getItem('mitplan_was_authenticated') === 'true';
      if (wasAuthenticated) {
        setBannerDismissed(false);
        try {
          localStorage.removeItem('mitplan_display_name_banner_dismissed');
          localStorage.removeItem('mitplan_was_authenticated');
        } catch (error) {
          console.warn('Failed to reset banner dismissal state:', error);
        }
      }
    } else if (isAuthenticated) {
      // Track that user was authenticated
      try {
        localStorage.setItem('mitplan_was_authenticated', 'true');
      } catch (error) {
        console.warn('Failed to track authentication state:', error);
      }
    }
  }, [isAuthenticated, isSharedPlan]);

  // Don't render anything if not on shared plan or user is authenticated
  if (!isSharedPlan || isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Display Name Banner */}
      {showBanner && (
        <DisplayNameBanner
          onSetDisplayName={handleShowModal}
          onDismiss={handleBannerDismiss}
          currentDisplayName={displayName}
          collaboratorCount={roomUsers.length}
          planTitle={planTitle}
          isVisible={showBanner}
        />
      )}

      {/* Display Name Modal */}
      {showModal && (
        <DisplayNameModal
          isOpen={showModal}
          onSubmit={handleSetDisplayName}
          onSkip={handleModalClose}
          onClose={handleModalClose}
          initialValue={displayName || ''}
          isLoading={isLoading}
          planTitle={planTitle}
        />
      )}
    </>
  );
};

export default DisplayNameCollector;
