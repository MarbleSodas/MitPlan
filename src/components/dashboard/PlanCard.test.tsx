/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlanCard from './PlanCard';

const { authState, getUserDisplayNameMock } = vi.hoisted(() => ({
  authState: {
    uid: 'viewer-1',
  },
  getUserDisplayNameMock: vi.fn(),
}));

vi.mock('../../contexts/PlanContext', () => ({
  usePlan: () => ({
    deletePlanById: vi.fn(),
    duplicatePlanById: vi.fn(),
    exportPlanById: vi.fn(),
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.uid ? { uid: authState.uid } : null,
  }),
}));

vi.mock('../../services/userService', () => ({
  getUserDisplayName: (...args: unknown[]) => getUserDisplayNameMock(...args),
}));

vi.mock('../../services/realtimePlanService', () => ({
  updatePlanFieldsWithOrigin: vi.fn(),
  getShareableEditLink: vi.fn((planId: string) => `https://example.com/plan/shared/${planId}`),
  getShareableViewLink: vi.fn((viewToken: string) => `https://example.com/plan/view/${viewToken}`),
  makePlanPublic: vi.fn(),
  enablePlanShareView: vi.fn(),
  rotatePlanShareViewToken: vi.fn(),
  revokePlanShareView: vi.fn(),
  addPlanCollaborator: vi.fn(),
  removePlanCollaborator: vi.fn(),
  getKnownPlanUsers: vi.fn(() => Promise.resolve([])),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PlanCard permissions', () => {
  beforeEach(() => {
    authState.uid = 'viewer-1';
    getUserDisplayNameMock.mockReset();
    getUserDisplayNameMock.mockResolvedValue('Owner One');
  });

  afterEach(() => {
    cleanup();
  });

  it('lets shared editors open the plan while hiding owner-only admin actions', async () => {
    render(
      <PlanCard
        plan={{
          id: 'shared-plan-1',
          name: 'Shared Plan',
          ownerId: 'owner-1',
          userId: 'owner-1',
          collaborators: {
            'viewer-1': {
              role: 'editor',
              addedAt: Date.now(),
              addedBy: 'owner-1',
            },
          },
          accessLevel: 'editor',
          shareMode: 'edit',
          hasAccessed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        isSharedPlan={true}
        onEdit={vi.fn()}
      />
    );

    expect(await screen.findByText('Created by: Owner One')).toBeTruthy();
    expect(screen.queryByTitle('Edit plan name')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('keeps share and delete controls for the plan owner', () => {
    authState.uid = 'owner-1';

    render(
      <PlanCard
        plan={{
          id: 'owned-plan-1',
          name: 'Owned Plan',
          ownerId: 'owner-1',
          userId: 'owner-1',
          accessLevel: 'owner',
          shareMode: 'owned',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByTitle('Edit plan name')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });
});
