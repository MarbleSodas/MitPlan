import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlanProvider } from './contexts/PlanContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import MitigationPlanner from './components/planner/MitigationPlanner';
import UnauthenticatedPlanGuard from './components/guards/UnauthenticatedPlanGuard';
import DataPolicy from './pages/DataPolicy';
import AnonymousDashboard from './components/anonymous/AnonymousDashboard';
import TimelineEditor from './components/timeline/TimelineEditor';
import TimelineViewer from './components/timeline/TimelineViewer';
import TimelineBrowser from './components/timeline/TimelineBrowser';
import CreatePlanFromTimeline from './components/timeline/CreatePlanFromTimeline';
import MakeTimelinesPublic from './components/admin/MakeTimelinesPublic';

const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen text-base text-muted-foreground bg-background">
    Loading...
  </div>
);

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

const AnonymousAllowedRoute = ({ children }) => {
  const { hasUser, loading, enableAnonymousMode } = useAuth();

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

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
    <Routes>
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

      <Route
        path="/plan/shared/:planId"
        element={
          <AnonymousAllowedRoute>
            <MitigationPlanner isSharedPlan={true} />
          </AnonymousAllowedRoute>
        }
      />

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

      <Route
        path="/timeline/browse"
        element={
          <ProtectedRoute>
            <TimelineBrowser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/timeline/create"
        element={
          <ProtectedRoute>
            <TimelineEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/timeline/edit/:timelineId"
        element={
          <ProtectedRoute>
            <TimelineEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/timeline/view/:timelineId"
        element={
          <ProtectedRoute>
            <TimelineViewer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/timeline/shared/:timelineId"
        element={
          <AnonymousAllowedRoute>
            <TimelineViewer isShared={true} />
          </AnonymousAllowedRoute>
        }
      />

      <Route
        path="/plan/create-from-timeline/:timelineId"
        element={
          <ProtectedRoute>
            <PlanProvider>
              <CreatePlanFromTimeline />
            </PlanProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/make-timelines-public"
        element={
          <ProtectedRoute>
            <MakeTimelinesPublic />
          </ProtectedRoute>
        }
      />

      <Route
        path="/privacy-policy"
        element={<DataPolicy />}
      />

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />
    </Routes>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
