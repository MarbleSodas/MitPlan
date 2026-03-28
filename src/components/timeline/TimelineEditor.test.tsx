/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimelineEditor from './TimelineEditor';
import { buildEditedTimelineRecord } from './TimelineEditorCore';
import { syncBossActionMetadataWithClassification } from '../../utils/boss/bossActionUtils';

const {
  createTimelineMock,
  getAllUniqueBossTagsMock,
  getTimelineMock,
  navigateMock,
  toastErrorMock,
  toastInfoMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  createTimelineMock: vi.fn(),
  getAllUniqueBossTagsMock: vi.fn(),
  getTimelineMock: vi.fn(),
  navigateMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({}),
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
  updateTimeline: vi.fn(),
  getAllUniqueBossTags: (...args: unknown[]) => getAllUniqueBossTagsMock(...args),
}));

vi.mock('../collaboration/CollaborationPresenceShell', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../collaboration/CollaborationStatusNotice', () => ({
  default: () => null,
}));

vi.mock('../collaboration/PresenceSurface', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../collaboration/PresenceTarget', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../collaboration/SectionPresencePill', () => ({
  default: () => null,
}));

vi.mock('./CompactTimelineVisualization', () => ({
  default: () => null,
}));

vi.mock('./TimelineSettingsDrawer', () => ({
  default: () => null,
}));

vi.mock('./CustomActionModal', () => ({
  default: () => null,
}));

vi.mock('./TimelineActionCard', () => ({
  default: ({ action }: { action: { name: string } }) => <div>{action.name}</div>,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  closestCenter: {},
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
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
    createTimelineMock.mockReset();
    getAllUniqueBossTagsMock.mockReset();
    getTimelineMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();

    createTimelineMock.mockResolvedValue({ id: 'timeline-123' });
    getAllUniqueBossTagsMock.mockResolvedValue([]);
    getTimelineMock.mockResolvedValue(null);
  });

  it('requires a time when adding a boss action template and persists the normalized classification on save', async () => {
    render(<TimelineEditor />);

    expect(screen.getByTestId('timeline-add-actions-rail').className).toContain('lg:sticky');
    expect(screen.getByTestId('boss-actions-library-results').className).toContain('overflow-y-auto');

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

  it('normalizes classification-less legacy actions when building the edited community timeline record', () => {
    const normalizedTimeline = buildEditedTimelineRecord({
      baseRecord: {
        id: 'timeline-1',
        name: 'Existing Timeline',
        bossId: 'lala',
        bossTags: ['lala'],
        description: '',
        bossMetadata: { level: 90 },
        actions: [],
      },
      timelineActions: [
        {
          id: 'inferno_theorem_1',
          name: 'Inferno Theorem',
          time: 12,
          importance: 'high',
          icon: '⚔️',
          isTankBuster: false,
        },
      ],
      normalizeTimelineAction: (action) =>
        syncBossActionMetadataWithClassification({
          ...action,
          source: action.source || (action.isCustom ? 'custom' : 'boss'),
        }),
      description: '',
      bossTags: ['lala'],
      level: 90,
    });

    expect(normalizedTimeline.actions).toEqual([
      expect.objectContaining({
        id: 'inferno_theorem_1',
        classification: 'raidwide',
        isRaidwide: true,
      }),
    ]);
  });
});
