/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimelineViewer from './TimelineViewer';

const {
  addToastMock,
  getTimelineMock,
  navigateMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  getTimelineMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ timelineId: 'community-1' }),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
  }),
}));

vi.mock('../common/Toast', () => ({
  useToast: () => ({
    addToast: addToastMock,
  }),
}));

vi.mock('../../services/timelineService', () => ({
  getShareableLink: vi.fn(() => 'https://example.com/timeline/shared/community-1'),
  getTimeline: (...args: unknown[]) => getTimelineMock(...args),
}));

describe('TimelineViewer', () => {
  beforeEach(() => {
    addToastMock.mockReset();
    getTimelineMock.mockReset();
    navigateMock.mockReset();

    getTimelineMock.mockResolvedValue({
      id: 'community-1',
      name: 'Community Route',
      bossId: 'lala',
      bossTags: ['lala'],
      description: 'Viewer description',
      actions: [{ id: 'a1', name: 'Opening Hit', time: 10 }],
      ownerId: 'owner-2',
      userId: 'owner-2',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('lets viewers branch a community timeline into the shared editor', async () => {
    render(<TimelineViewer />);

    await screen.findByText('Community Route');

    fireEvent.click(screen.getByRole('button', { name: 'Start From This' }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/timeline/create/editor?sourceTimelineId=community-1');
    });
  });

  it('renders the sticky header with a solid card background', async () => {
    render(<TimelineViewer />);

    const header = await screen.findByTestId('timeline-viewer-header');

    expect(header.className).toContain('bg-card');
    expect(header.className).not.toContain('bg-[var(--color-cardBackground)]');
  });
});
