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

vi.mock('@/lib/navigation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/navigation')>('@/lib/navigation');
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
      actions: [{
        id: 'a1',
        name: 'Opening Hit',
        time: 89.40300000000002,
        description: 'A heavy opening hit.',
        unmitigatedDamage: 10000,
      }],
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

  it('rounds action times, formats damage, and expands details on demand', async () => {
    render(<TimelineViewer />);

    await screen.findByText('1:29.403');
    expect(screen.getByText('10,000 unmitigated damage')).toBeTruthy();
    expect(screen.queryByText('A heavy opening hit.')).toBeNull();

    fireEvent.click(screen.getByText('Opening Hit'));
    expect(screen.getByText('A heavy opening hit.')).toBeTruthy();
  });
});
