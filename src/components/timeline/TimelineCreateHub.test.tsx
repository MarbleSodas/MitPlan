/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimelineCreateHub from './TimelineCreateHub';

const {
  getAllPublicTimelinesMock,
  getCategorizedUserPlansMock,
  getOfficialTimelinesMock,
  getUserTimelinesMock,
  navigateMock,
} = vi.hoisted(() => ({
  getAllPublicTimelinesMock: vi.fn(),
  getCategorizedUserPlansMock: vi.fn(),
  getOfficialTimelinesMock: vi.fn(),
  getUserTimelinesMock: vi.fn(),
  navigateMock: vi.fn(),
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
  }),
}));

vi.mock('../../services/planAccessService', () => ({
  getCategorizedUserPlans: (...args: unknown[]) => getCategorizedUserPlansMock(...args),
}));

vi.mock('../../services/timelineService', () => ({
  getUserTimelines: (...args: unknown[]) => getUserTimelinesMock(...args),
  getOfficialTimelines: (...args: unknown[]) => getOfficialTimelinesMock(...args),
  getAllPublicTimelines: (...args: unknown[]) => getAllPublicTimelinesMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('TimelineCreateHub', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getCategorizedUserPlansMock.mockReset();
    getUserTimelinesMock.mockReset();
    getOfficialTimelinesMock.mockReset();
    getAllPublicTimelinesMock.mockReset();

    getCategorizedUserPlansMock.mockResolvedValue({
      ownedPlans: [
        {
          id: 'plan-1',
          name: 'Private Plan',
          bossId: 'lala',
          bossTags: ['lala'],
          timelineLayout: {
            bossId: 'lala',
            actions: [],
          },
        },
      ],
      sharedPlans: [],
      totalPlans: 1,
    });

    getUserTimelinesMock.mockResolvedValue([
      {
        id: 'owned-timeline',
        name: 'Owned Timeline',
        bossId: 'lala',
        bossTags: ['lala'],
        description: 'Owned description',
        isOwned: true,
        official: false,
      },
      {
        id: 'collected-timeline',
        name: 'Collected Timeline',
        bossId: 'lala',
        bossTags: ['lala'],
        description: 'Collected description',
        isOwned: false,
        official: false,
      },
    ]);

    getOfficialTimelinesMock.mockResolvedValue([
      {
        id: 'official-lala',
        name: 'Official Lala',
        bossId: 'lala',
        bossTags: ['lala'],
        description: 'Official route',
      },
    ]);

    getAllPublicTimelinesMock.mockResolvedValue([
      {
        id: 'public-lala',
        name: 'Public Lala',
        bossId: 'lala',
        bossTags: ['lala'],
        description: 'Public route',
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('organizes owned, plan, and community entry points into focused tabs', async () => {
    render(<TimelineCreateHub />);

    await waitFor(() => {
      expect(screen.getByText('Owned Timeline')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'From a plan' }));
    expect(screen.getByText('Private Plan')).toBeTruthy();
    expect(screen.getByText('Official Lala')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Browse' }));
    expect(screen.getByText('Collected Timeline')).toBeTruthy();
    expect(screen.getByText('Public Lala')).toBeTruthy();
  });

  it('routes plan and timeline seeds into the shared community editor flow', async () => {
    render(<TimelineCreateHub />);

    await screen.findByText('Owned Timeline');
    fireEvent.click(screen.getByRole('tab', { name: 'From a plan' }));

    fireEvent.click(screen.getByRole('button', { name: 'Start from plan' }));
    expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourcePlanId=plan-1');

    fireEvent.click(screen.getByRole('button', { name: 'Use as starting point' }));
    expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourceTimelineId=official-lala');

    fireEvent.click(screen.getByRole('tab', { name: 'Browse' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Start from this' })[0]!);
    expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourceTimelineId=collected-timeline');
  });
});
