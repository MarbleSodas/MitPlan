/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

const {
  listNormalizedPlansMock,
  loadUserPlansMock,
  logoutMock,
  navigateMock,
  setHasPendingMigrationMock,
} = vi.hoisted(() => ({
  listNormalizedPlansMock: vi.fn(),
  loadUserPlansMock: vi.fn(),
  logoutMock: vi.fn(),
  navigateMock: vi.fn(),
  setHasPendingMigrationMock: vi.fn(),
}));

vi.mock('@/lib/navigation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/navigation')>('@/lib/navigation');
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

vi.mock('../../services/normalizedPlanService', () => ({
  listNormalizedPlans: (...args: unknown[]) => listNormalizedPlansMock(...args),
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
  SheetDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    listNormalizedPlansMock.mockReset();
    loadUserPlansMock.mockReset();
    logoutMock.mockReset();
    navigateMock.mockReset();
    setHasPendingMigrationMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders owned and shared plans instead of the empty dashboard state', async () => {
    listNormalizedPlansMock.mockResolvedValue([
      { id: 'owned-1', name: 'Owned Plan', accessLevel: 'owner' },
      { id: 'shared-1', name: 'Shared Plan', accessLevel: 'editor' },
    ]);

    render(<Dashboard />);

    await screen.findByText('Owned Plan');
    await screen.findByText('Shared Plan');

    expect(screen.queryByText('No Plans Yet')).toBeNull();
    expect(screen.getByTestId('owned-plan-card').textContent).toBe('Owned Plan');
    expect(screen.getByTestId('shared-plan-card').textContent).toBe('Shared Plan');
  });

  it('keeps plans and shared sections visible when the account is empty', async () => {
    listNormalizedPlansMock.mockResolvedValue([]);

    render(<Dashboard />);

    await screen.findByText(/No plans yet/);
    expect(screen.getByRole('heading', { name: 'Plans' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Shared' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Timelines' })).toBeTruthy();
    expect(screen.queryByTestId('owned-plan-card')).toBeNull();
    expect(screen.queryByTestId('shared-plan-card')).toBeNull();
  });

  it('shows the plan RPC error instead of the empty state when access is denied', async () => {
    listNormalizedPlansMock.mockRejectedValue(new Error('permission denied'));

    render(<Dashboard />);

    await screen.findByText('Plans Unavailable');
    expect(screen.getAllByText(/permission denied/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('No Plans Yet')).toBeNull();
  });

  it('routes the separate Timelines action into the timeline hub', async () => {
    listNormalizedPlansMock.mockResolvedValue([
      { id: 'owned-1', name: 'Owned Plan', accessLevel: 'owner' },
    ]);

    render(<Dashboard />);

    await screen.findByText('Owned Plan');
    fireEvent.click(screen.getByRole('button', { name: 'Timelines' }));

    expect(navigateMock).toHaveBeenCalledWith('/timeline/create');
  });
});
