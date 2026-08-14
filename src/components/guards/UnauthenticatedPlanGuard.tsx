import React from 'react';
import { Navigate, useLocation } from '@/lib/navigation';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Legacy guard retained for compatibility.
 * Unauthenticated users are redirected to sign-in and returned to the current route after auth.
 */
const UnauthenticatedPlanGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/?next=${next}`} replace />;
  }

  return children;
};

export default UnauthenticatedPlanGuard;
