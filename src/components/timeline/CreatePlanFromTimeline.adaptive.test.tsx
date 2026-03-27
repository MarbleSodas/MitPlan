/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import adaptiveTimeline from '../../data/timelines/the-tyrant-m11s.timeline.json';
import { normalizeTimelineRecord } from '../../utils/timeline/adaptiveTimelineUtils';
import CreatePlanFromTimeline from './CreatePlanFromTimeline';

const {
  navigateMock,
  createNewPlanMock,
  addToastMock,
  getTimelineMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  createNewPlanMock: vi.fn(),
  addToastMock: vi.fn(),
  getTimelineMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ timelineId: 'legacy-official-doc' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
  }),
}));

vi.mock('../../contexts/PlanContext', () => ({
  usePlan: () => ({
    createNewPlan: createNewPlanMock,
  }),
}));

vi.mock('../common/Toast', () => ({
  useToast: () => ({
    addToast: addToastMock,
  }),
}));

vi.mock('../../services/timelineService', () => ({
  getTimeline: (...args: unknown[]) => getTimelineMock(...args),
}));

describe('CreatePlanFromTimeline adaptive timeline support', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    createNewPlanMock.mockReset();
    addToastMock.mockReset();
    getTimelineMock.mockReset();

    getTimelineMock.mockResolvedValue(normalizeTimelineRecord({
      id: 'official-the-tyrant-m11s',
      ...adaptiveTimeline,
    }));
    createNewPlanMock.mockResolvedValue({ id: 'plan-1' });
  });

  it('loads resolved actions from an adaptive timeline and preserves the source timeline on create', async () => {
    render(<CreatePlanFromTimeline />);

    await screen.findByText('The Tyrant (M11S) - Official Adaptive Timeline');
    expect(screen.getByText(/Boss Actions \(39\)/)).toBeTruthy();
    expect(screen.getAllByText('Crown of Arcadia').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Create Mitplan' }));

    await waitFor(() => {
      expect(createNewPlanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: 'the-tyrant-m11s',
          sourceTimelineId: 'official-the-tyrant-m11s',
          sourceTimelineName: 'The Tyrant (M11S) - Official Adaptive Timeline',
          timelineLayout: expect.objectContaining({
            bossId: 'the-tyrant-m11s',
            healthConfig: {
              party: 186000,
              defaultTank: 295000,
              mainTank: 295000,
              offTank: 295000,
            },
          }),
        })
      );
    });
  });
});
