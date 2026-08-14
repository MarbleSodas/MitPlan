/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlanTimelineEditor from './PlanTimelineEditor';

const {
  createTimelineMock,
  corePropsSpy,
  navigateMock,
  planState,
  updateTimelineLayoutRealtimeMock,
  userState,
} = vi.hoisted(() => ({
  createTimelineMock: vi.fn(),
  corePropsSpy: vi.fn(),
  navigateMock: vi.fn(),
  updateTimelineLayoutRealtimeMock: vi.fn(),
  userState: {
    uid: 'user-1',
  },
  planState: {
    loading: false,
    realtimePlan: {
      id: 'plan-1',
      name: 'Plan Timeline',
      ownerId: 'user-1',
      userId: 'user-1',
      timelineLayout: {
        bossId: 'lala',
        bossTags: ['lala'],
        bossMetadata: { level: 100, name: 'Lala' },
        actions: [
          {
            id: 'a1',
            name: 'Opener',
            time: 10,
          },
        ],
        adaptiveModel: {
          branches: [
            {
              id: 'default',
              events: [
                {
                  id: 'a1',
                  name: 'Opener',
                  time: 10,
                  branchId: 'default',
                  phaseId: 'phase_1',
                },
              ],
            },
          ],
        },
        resolution: { defaultBranchId: 'default' },
        phases: [
          {
            id: 'phase_1',
            name: 'Phase 1',
            order: 0,
            anchorActionId: 'a1',
            branchIds: ['default'],
            source: 'manual',
            skipWindowMode: 'hide_pre_anchor',
          },
        ],
        analysisSources: [{ kind: 'manual', title: 'Notes' }],
        guideSources: [{ site: 'the-balance', url: 'https://example.com' }],
        format: 'adaptive_damage',
        schemaVersion: 2,
        description: 'Local plan route',
        healthConfig: {
          party: 150000,
          defaultTank: 220000,
          mainTank: 225000,
          offTank: 223000,
        },
      },
    },
  },
}));

vi.mock('@/lib/navigation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/navigation')>('@/lib/navigation');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ planId: 'plan-1' }),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: userState.uid ? { uid: userState.uid } : null,
    isAuthenticated: Boolean(userState.uid),
  }),
}));

vi.mock('../../contexts/RealtimeAppProvider', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../../contexts/RealtimePlanContext', () => ({
  useRealtimePlan: () => ({
    loading: planState.loading,
    realtimePlan: planState.realtimePlan,
    updateTimelineLayoutRealtime: updateTimelineLayoutRealtimeMock,
  }),
}));

vi.mock('../../services/timelineService', () => ({
  createTimeline: (...args: unknown[]) => createTimelineMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./TimelineEditorCore', () => ({
  default: (props: {
    readOnly?: boolean;
    onSave: (payload: unknown) => Promise<void>;
    onPublish?: (payload: unknown) => Promise<void>;
  }) => {
    corePropsSpy(props);
    return (
      <div>
        <div>{props.readOnly ? 'read-only' : 'editable'}</div>
        <button type="button" onClick={() => void props.onSave({
          editedTimeline: {
            bossId: 'lala',
            bossTags: ['lala'],
            bossMetadata: { level: 100, name: 'Lala' },
            actions: [
              {
                id: 'a2',
                name: 'Updated Hit',
                time: 22,
              },
            ],
            adaptiveModel: {
              branches: [
                {
                  id: 'default',
                  events: [
                    {
                      id: 'a2',
                      name: 'Updated Hit',
                      time: 22,
                      branchId: 'default',
                      phaseId: 'phase_1',
                    },
                  ],
                },
              ],
            },
            resolution: { defaultBranchId: 'default' },
            phases: [
              {
                id: 'phase_1',
                name: 'Phase 1',
                order: 0,
                anchorActionId: 'a2',
                branchIds: ['default'],
                source: 'manual',
                skipWindowMode: 'hide_pre_anchor',
              },
            ],
            analysisSources: [{ kind: 'manual', title: 'Notes' }],
            guideSources: [{ site: 'the-balance', url: 'https://example.com' }],
            format: 'adaptive_damage',
            schemaVersion: 2,
            description: 'Edited route',
          },
        })}>
          Save
        </button>
        {props.onPublish && (
          <button type="button" onClick={() => void props.onPublish({
            editedTimeline: {
              bossId: 'lala',
              bossTags: ['lala'],
              bossMetadata: { level: 100, name: 'Lala' },
              actions: [
                {
                  id: 'a2',
                  name: 'Updated Hit',
                  time: 22,
                },
              ],
              adaptiveModel: {
                branches: [
                  {
                    id: 'default',
                    events: [
                      {
                        id: 'a2',
                        name: 'Updated Hit',
                        time: 22,
                        branchId: 'default',
                        phaseId: 'phase_1',
                      },
                    ],
                  },
                ],
              },
              resolution: { defaultBranchId: 'default' },
              phases: [
                {
                  id: 'phase_1',
                  name: 'Phase 1',
                  order: 0,
                  anchorActionId: 'a2',
                  branchIds: ['default'],
                  source: 'manual',
                  skipWindowMode: 'hide_pre_anchor',
                },
              ],
              analysisSources: [{ kind: 'manual', title: 'Notes' }],
              guideSources: [{ site: 'the-balance', url: 'https://example.com' }],
              format: 'adaptive_damage',
              schemaVersion: 2,
              description: 'Edited route',
            },
            details: {
              name: 'Published Route',
              description: 'Community copy',
              visibility: 'public',
            },
          })}>
            Publish
          </button>
        )}
      </div>
    );
  },
}));

describe('PlanTimelineEditor', () => {
  beforeEach(() => {
    corePropsSpy.mockReset();
    createTimelineMock.mockReset();
    navigateMock.mockReset();
    updateTimelineLayoutRealtimeMock.mockReset();
    createTimelineMock.mockResolvedValue({ id: 'timeline-2' });
    updateTimelineLayoutRealtimeMock.mockResolvedValue(undefined);
    userState.uid = 'user-1';
    planState.loading = false;
    planState.realtimePlan.ownerId = 'user-1';
    planState.realtimePlan.userId = 'user-1';
    planState.realtimePlan.isPublic = false;
    planState.realtimePlan.accessedBy = {};
    planState.realtimePlan.collaborators = {};
  });

  afterEach(() => {
    cleanup();
  });

  it('saves direct timeline edits back into the plan timeline layout', async () => {
    render(<PlanTimelineEditor />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateTimelineLayoutRealtimeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: 'lala',
          actions: [
            expect.objectContaining({
              id: 'a2',
              name: 'Updated Hit',
            }),
          ],
          healthConfig: {
            party: 150000,
            defaultTank: 220000,
            mainTank: 225000,
            offTank: 223000,
          },
        })
      );
    });
  });

  it('publishes a new community timeline without mutating the plan route', async () => {
    render(<PlanTimelineEditor />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(createTimelineMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'Published Route',
          description: 'Community copy',
          isPublic: true,
          actions: [
            expect.objectContaining({
              id: 'a2',
              name: 'Updated Hit',
            }),
          ],
          adaptiveModel: expect.objectContaining({
            branches: expect.any(Array),
          }),
          resolution: { defaultBranchId: 'default' },
          phases: expect.any(Array),
          guideSources: [{ site: 'the-balance', url: 'https://example.com' }],
          analysisSources: [{ kind: 'manual', title: 'Notes' }],
        })
      );
    });

    expect(navigateMock).not.toHaveBeenCalledWith('/timeline/edit/timeline-2');
  });

  it('allows signed-in editors to edit and publish from the plan timeline', () => {
    userState.uid = 'editor-2';
    planState.realtimePlan.ownerId = 'owner-1';
    planState.realtimePlan.userId = 'owner-1';
    planState.realtimePlan.collaborators = {
      'editor-2': {
        role: 'editor',
      },
    };

    render(<PlanTimelineEditor />);

    expect(screen.getByText('editable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();
  });

  it('allows any signed-in user with the plan link to edit and publish', () => {
    // Anyone with the plan link who is signed in can edit — owner /
    // collaborator / accessedBy checks no longer gate writes. The planId in
    // the URL is the capability.
    userState.uid = 'stranger-99';
    planState.realtimePlan.ownerId = 'owner-1';
    planState.realtimePlan.userId = 'owner-1';
    planState.realtimePlan.collaborators = {};
    planState.realtimePlan.accessedBy = {};

    render(<PlanTimelineEditor />);

    expect(screen.getByText('editable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();
  });
});
