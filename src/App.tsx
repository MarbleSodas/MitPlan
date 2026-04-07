import { type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlanProvider } from './contexts/PlanContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import MitigationPlanner from './components/planner/MitigationPlanner';
import DataPolicy from './pages/DataPolicy';
import TimelineEditor from './components/timeline/TimelineEditor';
import PlanTimelineEditor from './components/timeline/PlanTimelineEditor';
import TimelineViewer from './components/timeline/TimelineViewer';
import TimelineBrowser from './components/timeline/TimelineBrowser';
import TimelineCreateHub from './components/timeline/TimelineCreateHub';
import CreatePlanFromTimeline from './components/timeline/CreatePlanFromTimeline';
import MakeTimelinesPublic from './components/admin/MakeTimelinesPublic';
import ConsolidatedView from './components/consolidated';

const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen text-base text-muted-foreground bg-background">
    Loading...
  </div>
);

interface RouteGuardProps {
  children: ReactNode;
}

const getSafeNextPath = (search: string) => {
  const next = new URLSearchParams(search).get('next');

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard';
  }

  return next;
};

const ProtectedRoute = ({ children }: RouteGuardProps) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingComponent />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/?next=${next}`} replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingComponent />;
  }

  const nextPath = getSafeNextPath(location.search);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={nextPath} replace />
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
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
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
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
        }
      />

      <Route
        path="/plan/:planId"
        element={
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
        }
      />

      <Route
        path="/plan/shared/:planId"
        element={
          <ProtectedRoute>
            <MitigationPlanner isSharedPlan={true} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/plan/:planId/timeline"
        element={
          <ProtectedRoute>
            <PlanTimelineEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/plan/view/:viewToken"
        element={<ConsolidatedView />}
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
            <TimelineCreateHub />
          </ProtectedRoute>
        }
      />

      <Route
        path="/timeline/create/editor"
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
          <TimelineViewer isShared={true} />
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
        path="/anonymous/*"
        element={<Navigate to="/" replace />}
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
