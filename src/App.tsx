import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlanProvider } from './contexts/PlanContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const MitigationPlanner = lazy(() => import('./components/planner/MitigationPlanner'));
const DataPolicy = lazy(() => import('./pages/DataPolicy'));
const TimelineEditor = lazy(() => import('./components/timeline/TimelineEditor'));
const PlanTimelineEditor = lazy(() => import('./components/timeline/PlanTimelineEditor'));
const TimelineViewer = lazy(() => import('./components/timeline/TimelineViewer'));
const TimelineBrowser = lazy(() => import('./components/timeline/TimelineBrowser'));
const TimelineCreateHub = lazy(() => import('./components/timeline/TimelineCreateHub'));
const CreatePlanFromTimeline = lazy(() => import('./components/timeline/CreatePlanFromTimeline'));
const MakeTimelinesPublic = lazy(() => import('./components/admin/MakeTimelinesPublic'));
const ConsolidatedView = lazy(() => import('./components/consolidated'));

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
      <Suspense fallback={<LoadingComponent />}>
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
      </Suspense>
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
