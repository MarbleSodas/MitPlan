/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimelineEditor from './TimelineEditor';

const {
  corePropsSpy,
  createTimelineMock,
  getPlanMock,
  getTimelineMock,
  hydratePlanTimelineLayoutIfMissingMock,
  navigateMock,
  routeParams,
  routeSearchParams,
  updateTimelineMock,
} = vi.hoisted(() => ({
  corePropsSpy: vi.fn(),
  createTimelineMock: vi.fn(),
  getPlanMock: vi.fn(),
  getTimelineMock: vi.fn(),
  hydratePlanTimelineLayoutIfMissingMock: vi.fn(),
  navigateMock: vi.fn(),
  routeParams: {} as { timelineId?: string },
  routeSearchParams: new URLSearchParams(),
  updateTimelineMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => routeParams,
    useSearchParams: () => [routeSearchParams, vi.fn()],
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
  getAllUniqueBossTags: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/realtimePlanService', () => ({
  getPlan: (...args: unknown[]) => getPlanMock(...args),
  hydratePlanTimelineLayoutIfMissing: (...args: unknown[]) =>
    hydratePlanTimelineLayoutIfMissingMock(...args),
}));

vi.mock('../collaboration/CollaborationPresenceShell', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('./TimelineEditorCore', () => ({
  default: (props: {
    loading?: boolean;
    sourceRecord?: {
      name?: string;
      description?: string;
      bossId?: string | null;
      bossTags?: string[];
      bossMetadata?: { level?: number } | null;
      actions?: Array<Record<string, unknown>>;
    } | null;
    onSave: (payload: {
      name: string;
      description: string;
      editedTimeline: Record<string, unknown>;
    }) => Promise<void>;
  }) => {
    corePropsSpy(props);

    if (props.loading) {
      return <div>Loading timeline...</div>;
    }

    return (
      <div>
        <div>{props.sourceRecord?.name || 'Blank Timeline'}</div>
        <button
          type="button"
          onClick={() => void props.onSave({
            name: props.sourceRecord?.name || 'Blank Timeline',
            description: props.sourceRecord?.description || '',
            editedTimeline: {
              bossId: props.sourceRecord?.bossId || null,
              bossTags: props.sourceRecord?.bossTags || [],
              bossMetadata: props.sourceRecord?.bossMetadata || null,
              actions: props.sourceRecord?.actions || [],
              description: props.sourceRecord?.description || '',
              phases: [],
              analysisSources: [],
              guideSources: [],
              adaptiveModel: null,
              resolution: null,
              format: 'legacy_flat',
              schemaVersion: 1,
            },
          })}
        >
          Save
        </button>
      </div>
    );
  },
}));

describe('TimelineEditor flow', () => {
  beforeEach(() => {
    corePropsSpy.mockReset();
    createTimelineMock.mockReset();
    getPlanMock.mockReset();
    getTimelineMock.mockReset();
    hydratePlanTimelineLayoutIfMissingMock.mockReset();
    navigateMock.mockReset();
    routeParams.timelineId = undefined;
    routeSearchParams.delete('sourcePlanId');
    routeSearchParams.delete('sourceTimelineId');
    updateTimelineMock.mockReset();

    createTimelineMock.mockResolvedValue({ id: 'timeline-123' });
    getPlanMock.mockResolvedValue(null);
    getTimelineMock.mockResolvedValue(null);
    hydratePlanTimelineLayoutIfMissingMock.mockResolvedValue(undefined);
    updateTimelineMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('updates an existing community timeline when editing by id', async () => {
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
          classification: 'raidwide',
          isRaidwide: true,
        },
      ],
    });

    render(<TimelineEditor />);

    await waitFor(() => {
      expect(screen.getByText('Existing Timeline')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateTimelineMock).toHaveBeenCalledTimes(1);
    });

    expect(createTimelineMock).not.toHaveBeenCalled();
    expect(updateTimelineMock).toHaveBeenCalledWith(
      'timeline-1',
      expect.objectContaining({
        name: 'Existing Timeline',
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

  it('loads a timeline seed into create mode and saves a new community timeline', async () => {
    routeSearchParams.set('sourceTimelineId', 'timeline-seed-1');
    getTimelineMock.mockResolvedValue({
      id: 'timeline-seed-1',
      name: 'Seed Route',
      bossId: 'lala',
      bossTags: ['lala'],
      description: 'Seed description',
      bossMetadata: { level: 100 },
      actions: [
        {
          id: 'seed-action-1',
          name: 'Seed Hit',
          time: 25,
          classification: 'raidwide',
          isRaidwide: true,
        },
      ],
    });

    render(<TimelineEditor />);

    await waitFor(() => {
      expect(screen.getByText('Seed Route Copy')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(createTimelineMock).toHaveBeenCalledTimes(1);
    });

    expect(updateTimelineMock).not.toHaveBeenCalled();
    expect(createTimelineMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        name: 'Seed Route Copy',
        description: 'Seed description',
        bossId: 'lala',
        bossTags: ['lala'],
        bossMetadata: { level: 100 },
        actions: [
          expect.objectContaining({
            id: 'seed-action-1',
            classification: 'raidwide',
            isRaidwide: true,
          }),
        ],
      })
    );
  });

  it('loads a plan seed into create mode and saves a new community timeline', async () => {
    routeSearchParams.set('sourcePlanId', 'plan-1');
    getPlanMock.mockResolvedValue({
      id: 'plan-1',
      name: 'Plan Seed',
      description: 'Plan description',
      timelineLayout: {
        bossId: 'lala',
        bossTags: ['lala'],
        bossMetadata: { level: 100 },
        description: 'Plan timeline description',
        actions: [
          {
            id: 'plan-action-1',
            name: 'Plan Hit',
            time: 40,
            classification: 'raidwide',
            isRaidwide: true,
          },
        ],
      },
    });

    render(<TimelineEditor />);

    await waitFor(() => {
      expect(screen.getByText('Plan Seed Community Timeline')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(createTimelineMock).toHaveBeenCalledTimes(1);
    });

    expect(hydratePlanTimelineLayoutIfMissingMock).toHaveBeenCalledWith('plan-1', 'user-1');
    expect(updateTimelineMock).not.toHaveBeenCalled();
    expect(createTimelineMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        name: 'Plan Seed Community Timeline',
        description: 'Plan timeline description',
        bossId: 'lala',
        bossTags: ['lala'],
        bossMetadata: { level: 100 },
        actions: [
          expect.objectContaining({
            id: 'plan-action-1',
            classification: 'raidwide',
            isRaidwide: true,
          }),
        ],
      })
    );
  });
});
