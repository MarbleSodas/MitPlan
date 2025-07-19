import React, { useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlanProvider } from './contexts/PlanContext';
import { ToastProvider } from './components/Common/Toast';
import LandingPage from './components/Landing';
import Dashboard from './components/Dashboard';
import MitigationPlanner from './components/Planner';
import UnauthenticatedPlanGuard from './components/Guards';
import DataPolicy from './pages/DataPolicy';
import AnonymousDashboard from './components/Anonymous';

// DEBUGGING: Minimal App to test if React is working
// TODO: Restore full app once loading issue is resolved

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: ${props => props.theme?.colors?.background || '#ffffff'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }

  #root {
    min-height: 100vh;
  }
`;



// Loading component
const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 1.1rem;
  color: ${props => props.theme?.colors?.lightText || '#6b7280'};
  background: ${props => props.theme?.colors?.background || '#ffffff'};
`;

const LoadingComponent = () => (
  <LoadingSpinner>
    Loading...
  </LoadingSpinner>
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
            <GlobalStyle />
            <AppContent />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;