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

  it('shows owned, collected, official, and public community entry points', async () => {
    render(<TimelineCreateHub />);

    await waitFor(() => {
      expect(screen.getByText('Continue Your Timelines')).toBeTruthy();
    });

    expect(screen.getByText('Owned Timeline')).toBeTruthy();
    expect(screen.getByText('Start From a Plan Timeline')).toBeTruthy();
    expect(screen.getByText('Private Plan')).toBeTruthy();
    expect(screen.getByText('Start From an Official Timeline')).toBeTruthy();
    expect(screen.getByText('Official Lala')).toBeTruthy();
    expect(screen.getByText('Duplicate a Community Timeline')).toBeTruthy();
    expect(screen.getByText('Collected Timeline')).toBeTruthy();
    expect(screen.getByText('Browse Public Community Timelines')).toBeTruthy();
    expect(screen.getByText('Public Lala')).toBeTruthy();
  });

  it('routes plan and timeline seeds into the shared community editor flow', async () => {
    render(<TimelineCreateHub />);

    await waitFor(() => {
      expect(screen.getByText('Private Plan')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start From Plan Timeline' }));
    expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourcePlanId=plan-1');

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Into Editor' }));
    expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourceTimelineId=collected-timeline');

    fireEvent.click(screen.getByRole('button', { name: 'Use as Starting Point' }));
    expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourceTimelineId=official-lala');
  });
});
