/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { STALE_DATABASE_RULES_MESSAGE } from '../../services/firebaseErrorUtils';

const {
  getCategorizedUserPlansMock,
  getUserTimelinesMock,
  loadUserPlansMock,
  logoutMock,
  navigateMock,
  setHasPendingMigrationMock,
  setUserContextMock,
} = vi.hoisted(() => ({
  getCategorizedUserPlansMock: vi.fn(),
  getUserTimelinesMock: vi.fn(),
  loadUserPlansMock: vi.fn(),
  logoutMock: vi.fn(),
  navigateMock: vi.fn(),
  setHasPendingMigrationMock: vi.fn(),
  setUserContextMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
    logout: logoutMock,
    hasPendingMigration: false,
    setHasPendingMigration: setHasPendingMigrationMock,
  }),
}));

vi.mock('../../contexts/PlanContext', () => ({
  usePlan: () => ({
    loadUserPlans: loadUserPlansMock,
  }),
}));

vi.mock('../../services/unifiedPlanService', () => ({
  default: {
    setUserContext: (...args: unknown[]) => setUserContextMock(...args),
    getCategorizedUserPlans: (...args: unknown[]) => getCategorizedUserPlansMock(...args),
    createPlan: vi.fn(),
  },
}));

vi.mock('../../services/timelineService', () => ({
  getUserTimelines: (...args: unknown[]) => getUserTimelinesMock(...args),
}));

vi.mock('./PlanCard', () => ({
  default: ({ plan, isSharedPlan }: { plan: { name: string }; isSharedPlan?: boolean }) => (
    <div data-testid={isSharedPlan ? 'shared-plan-card' : 'owned-plan-card'}>{plan.name}</div>
  ),
}));

vi.mock('./TimelineCard', () => ({
  default: ({ timeline }: { timeline: { name: string } }) => <div>{timeline.name}</div>,
}));

vi.mock('./CreatePlanModal', () => ({ default: () => null }));
vi.mock('./BossSelectionModal', () => ({ default: () => null }));
vi.mock('./CustomTimelineSelectionModal', () => ({ default: () => null }));
vi.mock('./ImportPlanModal', () => ({ default: () => null }));
vi.mock('./UserProfile', () => ({ default: () => null }));
vi.mock('../modals/PlanMigrationModal', () => ({ default: () => null }));
vi.mock('../common/ThemeToggle', () => ({ default: () => null }));
vi.mock('../common/KofiButton/KofiButton', () => ({ default: () => null }));
vi.mock('../common/DiscordButton/DiscordButton', () => ({ default: () => null }));
vi.mock('../layout/Footer', () => ({ default: () => null }));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
  }: {
    children?: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    getCategorizedUserPlansMock.mockReset();
    getUserTimelinesMock.mockReset();
    loadUserPlansMock.mockReset();
    logoutMock.mockReset();
    navigateMock.mockReset();
    setHasPendingMigrationMock.mockReset();
    setUserContextMock.mockReset();

    getUserTimelinesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders owned and shared plans instead of the empty dashboard state', async () => {
    getCategorizedUserPlansMock.mockResolvedValue({
      ownedPlans: [{ id: 'owned-1', name: 'Owned Plan' }],
      sharedPlans: [{ id: 'shared-1', name: 'Shared Plan' }],
      totalPlans: 2,
    });

    render(<Dashboard />);

    await screen.findByText('Owned Plan');
    await screen.findByText('Shared Plan');

    expect(screen.queryByText('No Plans Yet')).toBeNull();
    expect(screen.getByTestId('owned-plan-card').textContent).toBe('Owned Plan');
    expect(screen.getByTestId('shared-plan-card').textContent).toBe('Shared Plan');
  });

  it('shows the empty state only when both owned and shared plans are empty', async () => {
    getCategorizedUserPlansMock.mockResolvedValue({
      ownedPlans: [],
      sharedPlans: [],
      totalPlans: 0,
    });

    render(<Dashboard />);

    await screen.findByText('No Plans Yet');
    expect(screen.queryByTestId('owned-plan-card')).toBeNull();
    expect(screen.queryByTestId('shared-plan-card')).toBeNull();
  });

  it('shows a configuration-focused error instead of the empty state when /plans queries are denied', async () => {
    getCategorizedUserPlansMock.mockRejectedValue(new Error('permission_denied at /plans'));

    render(<Dashboard />);

    await screen.findByText('Plans Unavailable');
    expect(screen.getAllByText(STALE_DATABASE_RULES_MESSAGE).length).toBeGreaterThan(0);
    expect(screen.queryByText('No Plans Yet')).toBeNull();
  });

  it('routes dashboard community timeline actions into the timeline hub', async () => {
    getCategorizedUserPlansMock.mockResolvedValue({
      ownedPlans: [{ id: 'owned-1', name: 'Owned Plan' }],
      sharedPlans: [],
      totalPlans: 1,
    });

    render(<Dashboard />);

    await screen.findByText('Community Timelines');

    fireEvent.click(screen.getByRole('button', { name: 'Open Timeline Hub' }));

    expect(navigateMock).toHaveBeenCalledWith('/timeline/create');
  });
});
