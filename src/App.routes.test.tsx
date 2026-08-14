/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouter, RootRoute } from './App';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  loading: false,
}));

const locationState = vi.hoisted(() => ({
  pathname: '/',
  search: '',
}));

vi.mock('./lib/navigation', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
  useLocation: () => locationState,
}));

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: authState.isAuthenticated ? { uid: 'user-1' } : null,
    loading: authState.loading,
    isAuthenticated: authState.isAuthenticated,
  }),
}));

vi.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./contexts/PlanContext', () => ({
  PlanProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));

vi.mock('./components/landing/LandingPage', () => ({
  default: () => <div>Landing Page</div>,
}));

vi.mock('./components/dashboard/Dashboard', () => ({
  default: () => <div>Dashboard</div>,
}));

vi.mock('./components/planner/MitigationPlanner', () => ({
  default: ({ isSharedPlan }: { isSharedPlan?: boolean }) => (
    <div>{isSharedPlan ? 'Shared Planner' : 'Planner'}</div>
  ),
}));

vi.mock('./components/timeline/TimelineEditor', () => ({
  default: () => <div>Timeline Editor</div>,
}));

vi.mock('./components/timeline/PlanTimelineEditor', () => ({
  default: () => <div>Plan Timeline Editor</div>,
}));

vi.mock('./components/timeline/TimelineViewer', () => ({
  default: ({ isShared }: { isShared?: boolean }) => (
    <div>{isShared ? 'Shared Timeline Viewer' : 'Timeline Viewer'}</div>
  ),
}));

vi.mock('./components/timeline/TimelineBrowser', () => ({
  default: () => <div>Timeline Browser</div>,
}));

vi.mock('./components/timeline/TimelineCreateHub', () => ({
  default: () => <div>Timeline Create Hub</div>,
}));

vi.mock('./components/timeline/CreatePlanFromTimeline', () => ({
  default: () => <div>Create Plan From Timeline</div>,
}));

vi.mock('./components/admin/MakeTimelinesPublic', () => ({
  default: () => <div>Admin</div>,
}));

vi.mock('./components/consolidated', () => ({
  default: () => <div>Consolidated View</div>,
}));

vi.mock('./components/pages/DataPolicy', () => ({
  default: () => <div>Privacy Policy</div>,
}));

describe('App routing', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.loading = false;
    locationState.pathname = '/';
    locationState.search = '';
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('redirects guests away from edit routes and preserves a return target', async () => {
    locationState.pathname = '/plan/edit/plan-123';
    render(<AppRouter segments={['plan', 'edit', 'plan-123']} />);

    expect(screen.getByTestId('redirect').textContent).toBe(
      '/?next=%2Fplan%2Fedit%2Fplan-123'
    );
  });

  it('redirects guests away from the collaborator edit route and preserves a return target', async () => {
    locationState.pathname = '/plan/shared/plan-123';
    render(<AppRouter segments={['plan', 'shared', 'plan-123']} />);

    expect(screen.getByTestId('redirect').textContent).toBe(
      '/?next=%2Fplan%2Fshared%2Fplan-123'
    );
  });

  it('allows guests to open the public view-only plan route', async () => {
    locationState.pathname = '/plan/view/view-token-123';
    render(<AppRouter segments={['plan', 'view', 'view-token-123']} />);

    await screen.findByText('Consolidated View');
  });

  it('returns authenticated users to their requested route after sign-in', async () => {
    authState.isAuthenticated = true;
    locationState.search = '?next=%2Ftimeline%2Fbrowse';
    render(<RootRoute />);

    expect(screen.getByTestId('redirect').textContent).toBe('/timeline/browse');
  });

  it('routes authenticated users to the timeline hub', async () => {
    authState.isAuthenticated = true;
    locationState.pathname = '/timeline/create';
    render(<AppRouter segments={['timeline', 'create']} />);

    await screen.findByText('Timeline Create Hub');
  });

  it('routes authenticated users to the plan timeline editor', async () => {
    authState.isAuthenticated = true;
    locationState.pathname = '/plan/plan-123/timeline';
    render(<AppRouter segments={['plan', 'plan-123', 'timeline']} />);

    await screen.findByText('Plan Timeline Editor');
  });
});
