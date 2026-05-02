import { describe, expect, it, vi } from 'vitest';
import {
  assertDeleteAccountRequest,
  buildAccountDeletionUpdates,
  cleanupCurrentUserAccount,
} from './accountDeletion.js';

class TestHttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

describe('assertDeleteAccountRequest', () => {
  it('rejects unauthenticated calls', () => {
    expect(() => assertDeleteAccountRequest({ data: { confirm: true } }, TestHttpsError))
      .toThrow(/signed in/);
  });

  it('rejects missing confirmation', () => {
    expect(() => assertDeleteAccountRequest({
      auth: { uid: 'user-1', token: { auth_time: Math.floor(Date.now() / 1000) } },
      data: {},
    }, TestHttpsError)).toThrow(/confirmed/);
  });

  it('rejects stale auth sessions', () => {
    expect(() => assertDeleteAccountRequest({
      auth: { uid: 'user-1', token: { auth_time: Math.floor(Date.now() / 1000) - 600 } },
      data: { confirm: true },
    }, TestHttpsError)).toThrow(/sign in again/);
  });
});

describe('buildAccountDeletionUpdates', () => {
  it('deletes owned content and scrubs the user from remaining records', () => {
    const result = buildAccountDeletionUpdates({
      userProfiles: {
        'user-1': { displayName: 'User 1' },
        'user-2': { accessedPlans: { 'owned-plan': true } },
      },
      userCollections: {
        'user-1': { timelines: { 'owned-timeline': true } },
        'user-2': { timelines: { 'owned-timeline': true } },
      },
      plans: {
        'owned-plan': {
          ownerId: 'user-1',
          userId: 'user-1',
          shareSettings: { viewToken: 'view-token-1' },
          collaborators: { 'user-2': { role: 'editor' } },
        },
        'shared-plan': {
          ownerId: 'user-2',
          collaborators: { 'user-1': { role: 'editor' } },
          accessedBy: { 'user-1': { accessCount: 2 } },
          lastModifiedBy: 'user-1',
        },
      },
      planShareViews: {
        'view-token-1': { planId: 'owned-plan', ownerId: 'user-1' },
        'view-token-2': { planId: 'shared-plan', ownerId: 'user-2' },
      },
      planShareViewTracking: {
        'view-token-1': { viewers: { 'user-2': true } },
        'view-token-2': { viewers: { 'user-1': true } },
      },
      planCollaborationsByUser: {
        'user-1': { 'shared-plan': true },
        'user-2': { 'owned-plan': true },
      },
      timelines: {
        'owned-timeline': { ownerId: 'user-1', userId: 'user-1' },
        'liked-timeline': {
          ownerId: 'user-2',
          likedBy: {
            'user-1': { userId: 'user-1' },
            'user-2': { userId: 'user-2' },
          },
          likeCount: 2,
        },
      },
      planCollaboration: {
        'plan:owned-plan': { activeUsers: { sessionA: { userId: 'user-2' } } },
        'plan:shared-plan': {
          activeUsers: { sessionB: { userId: 'user-1' } },
          presence: { sessionB: { activeTarget: null } },
          jobAssignments: { PLD: { userId: 'user-1' } },
        },
      },
    }, 'user-1');

    expect(result.deletedPlans).toBe(1);
    expect(result.deletedTimelines).toBe(1);
    expect(result.scrubbedPlans).toBe(1);
    expect(result.scrubbedTimelines).toBe(1);
    expect(result.updates).toMatchObject({
      'userProfiles/user-1': null,
      'userCollections/user-1': null,
      'planCollaborationsByUser/user-1': null,
      'plans/owned-plan': null,
      'planShareViews/view-token-1': null,
      'planShareViewTracking/view-token-1': null,
      'planCollaboration/plan:owned-plan': null,
      'plans/shared-plan/collaborators/user-1': null,
      'plans/shared-plan/accessedBy/user-1': null,
      'plans/shared-plan/lastModifiedBy': null,
      'planShareViewTracking/view-token-2/viewers/user-1': null,
      'timelines/owned-timeline': null,
      'timelines/liked-timeline/likedBy/user-1': null,
      'timelines/liked-timeline/likeCount': 1,
      'userProfiles/user-2/accessedPlans/owned-plan': null,
      'userCollections/user-2/timelines/owned-timeline': null,
      'planCollaborationsByUser/user-2/owned-plan': null,
      'planCollaboration/plan:shared-plan/activeUsers/sessionB': null,
      'planCollaboration/plan:shared-plan/presence/sessionB': null,
      'planCollaboration/plan:shared-plan/jobAssignments/PLD': null,
    });
  });
});

describe('cleanupCurrentUserAccount', () => {
  it('deletes the auth user after database cleanup succeeds', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const database = {
      ref: vi.fn(() => ({
        once: vi.fn().mockResolvedValue({ val: () => ({ userProfiles: { 'user-1': {} } }) }),
        update,
      })),
    };

    await expect(cleanupCurrentUserAccount({
      auth: { deleteUser },
      database,
    }, 'user-1')).resolves.toMatchObject({ deleted: true });

    expect(update).toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('does not delete the auth user if database cleanup fails', async () => {
    const update = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const deleteUser = vi.fn();
    const database = {
      ref: vi.fn(() => ({
        once: vi.fn().mockResolvedValue({ val: () => ({}) }),
        update,
      })),
    };

    await expect(cleanupCurrentUserAccount({
      auth: { deleteUser },
      database,
    }, 'user-1')).rejects.toThrow(/database unavailable/);

    expect(deleteUser).not.toHaveBeenCalled();
  });
});
