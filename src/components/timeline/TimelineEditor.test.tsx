/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimelineEditor from './TimelineEditor';

const {
  createTimelineMock,
  getAllUniqueBossTagsMock,
  getTimelineMock,
  navigateMock,
  routeParams,
  toastErrorMock,
  toastInfoMock,
  toastSuccessMock,
  updateTimelineMock,
} = vi.hoisted(() => ({
  createTimelineMock: vi.fn(),
  getAllUniqueBossTagsMock: vi.fn(),
  getTimelineMock: vi.fn(),
  navigateMock: vi.fn(),
  routeParams: {} as { timelineId?: string },
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateTimelineMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => routeParams,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
  }),
}));

vi.mock('../../services/timelineService', () => ({
  createTimeline: (...args: unknown[]) => createTimelineMock(...args),
  getTimeline: (...args: unknown[]) => getTimelineMock(...args),
  updateTimeline: (...args: unknown[]) => updateTimelineMock(...args),
  getAllUniqueBossTags: (...args: unknown[]) => getAllUniqueBossTagsMock(...args),
}));

vi.mock('../collaboration/CollaborationPresenceShell', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}));

describe('TimelineEditor', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    routeParams.timelineId = undefined;
    createTimelineMock.mockReset();
    getAllUniqueBossTagsMock.mockReset();
    getTimelineMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();
    updateTimelineMock.mockReset();

    createTimelineMock.mockResolvedValue({ id: 'timeline-123' });
    getAllUniqueBossTagsMock.mockResolvedValue([]);
    getTimelineMock.mockResolvedValue(null);
    updateTimelineMock.mockResolvedValue(undefined);
  });

  it('requires a time when adding a boss action template and persists the normalized classification on save', async () => {
    render(<TimelineEditor />);

    fireEvent.click(screen.getByTitle('Click to edit name'));
    fireEvent.change(screen.getByPlaceholderText('Timeline name...'), {
      target: { value: 'Boss Template Test' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Timeline name...'), {
      key: 'Enter',
    });

    fireEvent.change(screen.getByPlaceholderText('Search actions, bosses, abilities...'), {
      target: { value: 'Hardcore' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Hardcore').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /set time/i })[0]!);

    await screen.findByText('Set Boss Action Time');

    fireEvent.change(screen.getByLabelText('Time (seconds)'), {
      target: { value: '45' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Action' }));

    await waitFor(() => {
      expect(screen.getAllByText('Hardcore').length).toBeGreaterThan(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(createTimelineMock).toHaveBeenCalledTimes(1);
    });

    expect(createTimelineMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        name: 'Boss Template Test',
        actions: [
          expect.objectContaining({
            name: 'Hardcore',
            time: 45,
            classification: 'dual_tankbuster',
            isTankBuster: true,
            isDualTankBuster: true,
          }),
        ],
      })
    );
  });

  it('normalizes existing classification-less actions before saving an edited timeline', async () => {
    routeParams.timelineId = 'timeline-1';
    getTimelineMock.mockResolvedValue({
      id: 'timeline-1',
      name: 'Existing Timeline',
      bossId: 'lala',
      bossTags: ['lala'],
      description: '',
      bossMetadata: { level: 90 },
      actions: [
        {
          id: 'inferno_theorem_1',
          name: 'Inferno Theorem',
          time: 12,
          importance: 'high',
          icon: '⚔️',
          isTankBuster: false,
        },
      ],
    });

    render(<TimelineEditor />);

    await waitFor(() => {
      expect(screen.getByText('Existing Timeline')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateTimelineMock).toHaveBeenCalledWith(
        'timeline-1',
        expect.objectContaining({
          actions: [
            expect.objectContaining({
              id: 'inferno_theorem_1',
              classification: 'raidwide',
              isRaidwide: true,
            }),
          ],
        })
      );
    });
  });
});
