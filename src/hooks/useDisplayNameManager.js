/**
 * useDisplayNameManager Hook
 * 
 * Manages display name collection and persistence for unauthenticated users
 * in shared plan collaboration sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCollaboration } from '../contexts/CollaborationContext';

const STORAGE_KEY = 'mitplan_display_name';
const BANNER_DISMISSED_KEY = 'mitplan_display_name_banner_dismissed';

export const useDisplayNameManager = (planId = null) => {
  const { isAuthenticated, user } = useAuth();
  const { isCollaborating, displayName: collaborationDisplayName, userId } = useCollaboration();
  
  const [displayName, setDisplayName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSetName, setHasSetName] = useState(false);

  // Check if we're on a shared plan page
  const isSharedPlan = planId && window.location.pathname.includes('/plan/shared/');

  // Load stored display name on mount
  useEffect(() => {
    try {
      const storedName = localStorage.getItem(STORAGE_KEY);
      const bannerDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
      
      if (storedName) {
        setDisplayName(storedName);
        setHasSetName(true);
      }

      // Show banner for unauthenticated users on shared plans who haven't set a name
      if (isSharedPlan && !isAuthenticated && !storedName && !bannerDismissed) {
        setIsBannerVisible(true);
      }
    } catch (error) {
      console.warn('Failed to load display name from localStorage:', error);
    }
  }, [isSharedPlan, isAuthenticated]);

  // Update display name when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use authenticated user's name
      const authName = user.displayName || user.email || 'Authenticated User';
      setDisplayName(authName);
      setHasSetName(true);
      setIsBannerVisible(false);
      setIsModalOpen(false);
    } else if (!isAuthenticated && isSharedPlan) {
      // For unauthenticated users on shared plans, check if they need to set a name
      const storedName = localStorage.getItem(STORAGE_KEY);
      if (!storedName) {
        const bannerDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
        setIsBannerVisible(!bannerDismissed);
        setHasSetName(false);
      }
    }
  }, [isAuthenticated, user, isSharedPlan]);

  // Store display name in localStorage
  const storeDisplayName = useCallback((name) => {
    try {
      localStorage.setItem(STORAGE_KEY, name);
      localStorage.removeItem(BANNER_DISMISSED_KEY); // Reset banner dismissal when name is set
    } catch (error) {
      console.warn('Failed to store display name in localStorage:', error);
    }
  }, []);

  // Set display name
  const setUserDisplayName = useCallback(async (name) => {
    if (!name || !name.trim()) {
      throw new Error('Display name is required');
    }

    const trimmedName = name.trim();
    setIsLoading(true);

    try {
      // Store in localStorage for persistence
      storeDisplayName(trimmedName);
      
      // Update local state
      setDisplayName(trimmedName);
      setHasSetName(true);
      setIsModalOpen(false);
      setIsBannerVisible(false);

      console.log('%c[DISPLAY NAME] Name set successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        name: trimmedName,
        planId,
        isAuthenticated
      });

      return {
        success: true,
        displayName: trimmedName
      };
    } catch (error) {
      console.error('Failed to set display name:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [storeDisplayName, planId, isAuthenticated]);

  // Show display name modal
  const showDisplayNameModal = useCallback(() => {
    setIsModalOpen(true);
    setIsBannerVisible(false);
  }, []);

  // Hide display name modal
  const hideDisplayNameModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Dismiss banner (user chooses view-only mode)
  const dismissBanner = useCallback(() => {
    setIsBannerVisible(false);
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    } catch (error) {
      console.warn('Failed to store banner dismissal in localStorage:', error);
    }
  }, []);

  // Reset display name (for testing or user preference)
  const resetDisplayName = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BANNER_DISMISSED_KEY);
      setDisplayName('');
      setHasSetName(false);
      
      if (isSharedPlan && !isAuthenticated) {
        setIsBannerVisible(true);
      }
    } catch (error) {
      console.warn('Failed to reset display name:', error);
    }
  }, [isSharedPlan, isAuthenticated]);

  // Get effective display name (considering authentication state)
  const getEffectiveDisplayName = useCallback(() => {
    if (isAuthenticated && user) {
      return user.displayName || user.email || 'Authenticated User';
    }
    
    return displayName || null;
  }, [isAuthenticated, user, displayName]);

  // Check if user can edit (has set display name or is authenticated)
  const canEdit = useCallback(() => {
    if (isAuthenticated) {
      return true;
    }
    
    return hasSetName && displayName.trim().length > 0;
  }, [isAuthenticated, hasSetName, displayName]);

  // Get user status for UI display
  const getUserStatus = useCallback(() => {
    if (isAuthenticated) {
      return {
        type: 'authenticated',
        displayName: user?.displayName || user?.email || 'Authenticated User',
        canEdit: true,
        needsName: false
      };
    }
    
    if (hasSetName && displayName) {
      return {
        type: 'anonymous_named',
        displayName,
        canEdit: true,
        needsName: false
      };
    }
    
    return {
      type: 'anonymous_unnamed',
      displayName: null,
      canEdit: false,
      needsName: isSharedPlan
    };
  }, [isAuthenticated, user, hasSetName, displayName, isSharedPlan]);

  // Auto-show modal for shared plans if no name is set
  const autoShowModalIfNeeded = useCallback(() => {
    if (isSharedPlan && !isAuthenticated && !hasSetName && !displayName) {
      const bannerDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
      if (!bannerDismissed) {
        setIsModalOpen(true);
        setIsBannerVisible(false);
      }
    }
  }, [isSharedPlan, isAuthenticated, hasSetName, displayName]);

  return {
    // State
    displayName: getEffectiveDisplayName(),
    isModalOpen,
    isBannerVisible,
    isLoading,
    hasSetName: isAuthenticated || hasSetName,
    canEdit: canEdit(),
    userStatus: getUserStatus(),
    
    // Actions
    setDisplayName: setUserDisplayName,
    showModal: showDisplayNameModal,
    hideModal: hideDisplayNameModal,
    dismissBanner,
    resetDisplayName,
    autoShowModalIfNeeded,
    
    // Utilities
    isSharedPlan,
    isAuthenticated,
    needsDisplayName: isSharedPlan && !isAuthenticated && !hasSetName
  };
};
