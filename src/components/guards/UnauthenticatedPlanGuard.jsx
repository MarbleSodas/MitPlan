import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard that handles unauthenticated users accessing plan edit links
 * Automatically redirects unauthenticated users to anonymous flow with display name prompt
 * Allows full editing capabilities on the same URL after anonymous user initialization
 */
const UnauthenticatedPlanGuard = ({ children }) => {
  const { user, loading, isAnonymousMode, initializeAnonymousUser } = useAuth();
  const navigate = useNavigate();
  const { planId } = useParams();
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Universal access: allow all users to access plans directly
    // If user is authenticated, allow normal access
    if (user && !isAnonymousMode) {
      return;
    }

    // If user is already in anonymous mode, allow access
    if (isAnonymousMode) {
      return;
    }

    // For unauthenticated users, still set up anonymous mode for collaboration
    handleUnauthenticatedAccess();
  }, [user, loading, isAnonymousMode, planId, navigate]);

  const handleUnauthenticatedAccess = async () => {
    if (isRedirecting) return;

    setIsRedirecting(true);

    try {
      // Automatically initialize anonymous user without display name prompt
      console.log('[UnauthenticatedPlanGuard] Initializing anonymous user automatically');

      // The anonymous user service will auto-generate a display name
      await initializeAnonymousUser();
      console.log('[UnauthenticatedPlanGuard] Anonymous mode initialized, staying on current route');

    } catch (error) {
      console.error('[UnauthenticatedPlanGuard] Error handling unauthenticated access:', error);
      // Fallback: redirect to home page
      navigate('/', { replace: true });
    } finally {
      setIsRedirecting(false);
    }
  };

  // Removed display name prompt handlers - no longer needed

  // Show loading state while processing
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // No longer showing display name prompt - anonymous users are auto-initialized

  // If we reach here, user is authenticated or in anonymous mode - render children
  return children;
};

export default UnauthenticatedPlanGuard;
