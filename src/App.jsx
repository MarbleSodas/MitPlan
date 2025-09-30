import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlanProvider } from './contexts/PlanContext';
import { ToastProvider } from './components/common/Toast';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import MitigationPlanner from './components/planner/MitigationPlanner';
import UnauthenticatedPlanGuard from './components/guards/UnauthenticatedPlanGuard';
import DataPolicy from './pages/DataPolicy';
import AnonymousDashboard from './components/anonymous/AnonymousDashboard';

// DEBUGGING: Minimal App to test if React is working
// TODO: Restore full app once loading issue is resolved

// Global styles



// Loading component
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen text-[1.1rem] text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-950">
    Loading...
  </div>
);

// Protected Route component (requires authentication)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingComponent />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Anonymous-Allowed Route component (allows both authenticated and anonymous users)
const AnonymousAllowedRoute = ({ children }) => {
  const { hasUser, loading, enableAnonymousMode } = useAuth();

  // Use useEffect to enable anonymous mode after render to avoid setState during render
  useEffect(() => {
    if (!loading && !hasUser) {
      enableAnonymousMode();
    }
  }, [hasUser, loading, enableAnonymousMode]);

  if (loading) {
    return <LoadingComponent />;
  }

  return children;
};

// Main App component that handles routing and authentication
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] transition-colors">
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <PlanProvider>
              <Dashboard />
            </PlanProvider>
          </ProtectedRoute>
        }
      />

      {/* Plan editing routes */}
      <Route
        path="/plan/edit/:planId"
        element={
          <UnauthenticatedPlanGuard>
            <MitigationPlanner />
          </UnauthenticatedPlanGuard>
        }
      />

      <Route
        path="/planner"
        element={
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
        }
      />

      <Route
        path="/planner/:planId"
        element={
          <UnauthenticatedPlanGuard>
            <MitigationPlanner />
          </UnauthenticatedPlanGuard>
        }
      />

      <Route
        path="/plan/:planId"
        element={
          <UnauthenticatedPlanGuard>
            <MitigationPlanner />
          </UnauthenticatedPlanGuard>
        }
      />

      {/* Shared plan routes - accessible to both authenticated and unauthenticated users */}
      <Route
        path="/plan/shared/:planId"
        element={
          <AnonymousAllowedRoute>
            <MitigationPlanner isSharedPlan={true} />
          </AnonymousAllowedRoute>
        }
      />

      {/* Anonymous dashboard and plan routes */}
      <Route
        path="/anonymous"
        element={
          <AnonymousAllowedRoute>
            <AnonymousDashboard />
          </AnonymousAllowedRoute>
        }
      />

      <Route
        path="/anonymous/planner"
        element={
          <AnonymousAllowedRoute>
            <MitigationPlanner isAnonymous={true} />
          </AnonymousAllowedRoute>
        }
      />

      <Route
        path="/anonymous/plan/:planId"
        element={
          <AnonymousAllowedRoute>
            <MitigationPlanner isAnonymous={true} />
          </AnonymousAllowedRoute>
        }
      />

      {/* Legal pages - accessible to all users */}
      <Route
        path="/privacy-policy"
        element={<DataPolicy />}
      />

      {/* Catch all route */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />
    </Routes>
    </div>
  );
};

// Main App component with full routing and authentication
function App() {
  console.log('[App] Rendering full application with routing');

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;