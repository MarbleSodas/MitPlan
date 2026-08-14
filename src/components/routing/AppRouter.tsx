'use client';

import dynamic from 'next/dynamic';
import { type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PlanProvider } from '../../contexts/PlanContext';
import { CollaborationProvider } from '../../contexts/CollaborationContext';
import { Navigate, useLocation } from '../../lib/navigation';

const LandingPage = dynamic(() => import('../landing/LandingPage'), { loading: () => <Loading /> });
const Dashboard = dynamic(() => import('../dashboard/Dashboard'), { loading: () => <Loading /> });
const MitigationPlanner = dynamic(() => import('../planner/MitigationPlanner'), { loading: () => <Loading /> });
const DataPolicy = dynamic(() => import('../pages/DataPolicy'), { loading: () => <Loading /> });
const TimelineEditor = dynamic(() => import('../timeline/TimelineEditor'), { loading: () => <Loading /> });
const PlanTimelineEditor = dynamic(() => import('../timeline/PlanTimelineEditor'), { loading: () => <Loading /> });
const TimelineViewer = dynamic(() => import('../timeline/TimelineViewer'), { loading: () => <Loading /> });
const TimelineBrowser = dynamic(() => import('../timeline/TimelineBrowser'), { loading: () => <Loading /> });
const TimelineCreateHub = dynamic(() => import('../timeline/TimelineCreateHub'), { loading: () => <Loading /> });
const CreatePlanFromTimeline = dynamic(() => import('../timeline/CreatePlanFromTimeline'), { loading: () => <Loading /> });
const MakeTimelinesPublic = dynamic(() => import('../admin/MakeTimelinesPublic'), { loading: () => <Loading /> });
const ConsolidatedView = dynamic(() => import('../consolidated'), { loading: () => <Loading /> });
const PlanInviteRedeemer = dynamic(() => import('../collaboration/PlanInviteRedeemer'), { loading: () => <Loading /> });

export const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-base text-muted-foreground">
    Loading...
  </div>
);

const getSafeNextPath = (search: string) => {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
};

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/?next=${next}`} replace />;
  }
  return <>{children}</>;
};

export const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (isAuthenticated) return <Navigate to={getSafeNextPath(location.search)} replace />;
  return <LandingPage onAuthSuccess={() => undefined} />;
};

const protectedScreen = (screen: ReactNode) => <ProtectedRoute>{screen}</ProtectedRoute>;

export const AppRouter = ({ segments }: { segments: string[] }) => {
  const { isAuthenticated } = useAuth();
  const path = `/${segments.join('/')}`;
  let screen: ReactNode;

  if (path === '/dashboard') {
    screen = protectedScreen(
      <CollaborationProvider enabled={false}>
        <PlanProvider><Dashboard /></PlanProvider>
      </CollaborationProvider>
    );
  } else if (
    path === '/planner' ||
    /^\/planner\/[^/]+$/.test(path) ||
    /^\/plan\/edit\/[^/]+$/.test(path) ||
    /^\/plan\/[^/]+$/.test(path)
  ) {
    screen = protectedScreen(<MitigationPlanner planId={undefined} onNavigateBack={undefined} />);
  } else if (/^\/plan\/shared\/[^/]+$/.test(path)) {
    screen = protectedScreen(<MitigationPlanner planId={undefined} onNavigateBack={undefined} isSharedPlan />);
  } else if (/^\/plan\/[^/]+\/timeline$/.test(path)) {
    screen = protectedScreen(<PlanTimelineEditor />);
  } else if (/^\/plan\/view\/[^/]+$/.test(path)) {
    screen = <ConsolidatedView />;
  } else if (/^\/plan\/invite\/[^/]+$/.test(path)) {
    screen = protectedScreen(<PlanInviteRedeemer />);
  } else if (path === '/timeline/browse') {
    screen = protectedScreen(<TimelineBrowser />);
  } else if (path === '/timeline/create') {
    screen = protectedScreen(<TimelineCreateHub />);
  } else if (path === '/timeline/create/editor' || /^\/timeline\/edit\/[^/]+$/.test(path)) {
    screen = protectedScreen(<TimelineEditor />);
  } else if (/^\/timeline\/view\/[^/]+$/.test(path)) {
    screen = protectedScreen(<TimelineViewer />);
  } else if (/^\/timeline\/shared\/[^/]+$/.test(path)) {
    screen = <TimelineViewer isShared />;
  } else if (/^\/plan\/create-from-timeline\/[^/]+$/.test(path)) {
    screen = protectedScreen(
      <CollaborationProvider enabled={false}>
        <PlanProvider><CreatePlanFromTimeline /></PlanProvider>
      </CollaborationProvider>
    );
  } else if (path === '/admin/make-timelines-public') {
    screen = protectedScreen(<MakeTimelinesPublic />);
  } else if (path === '/privacy-policy') {
    screen = <DataPolicy />;
  } else {
    screen = <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
  }

  return <div className="min-h-screen bg-background text-foreground transition-colors">{screen}</div>;
};
