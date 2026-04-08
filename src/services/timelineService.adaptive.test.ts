import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import adaptiveTimeline from '../data/timelines/the-tyrant-m11s.timeline.json';

const equalToMock = vi.fn();
const getMock = vi.fn();
const orderByChildMock = vi.fn();
const pushMock = vi.fn();
const queryMock = vi.fn();
const refMock = vi.fn();
const setMock = vi.fn();
const updateMock = vi.fn();

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  push: (...args: unknown[]) => pushMock(...args),
  set: (...args: unknown[]) => setMock(...args),
  get: (...args: unknown[]) => getMock(...args),
  update: (...args: unknown[]) => updateMock(...args),
  remove: vi.fn(),
  query: (...args: unknown[]) => queryMock(...args),
  orderByChild: (...args: unknown[]) => orderByChildMock(...args),
  equalTo: (...args: unknown[]) => equalToMock(...args),
}));

import {
  createTimeline,
  getAllPublicTimelines,
  getAllUniqueBossTags,
  getTimeline,
  getTimelinesByBossTag,
  getUserTimelines,
  updateTimeline,
} from './timelineService';

function buildSnapshot(value: unknown) {
  return {
    exists: () => value !== null && value !== undefined,
    val: () => value,
    forEach: (callback: (child: { key: string; val: () => unknown }) => void) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
        callback({
          key,
          val: () => entryValue,
        });
      });
    },
  };
}

describe('timelineService adaptive reads', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    equalToMock.mockReset();
    getMock.mockReset();
    orderByChildMock.mockReset();
    pushMock.mockReset();
    queryMock.mockReset();
    refMock.mockReset();
    setMock.mockReset();
    updateMock.mockReset();
    refMock.mockImplementation((_database: unknown, path: string) => ({ path }));
    orderByChildMock.mockImplementation((field: string) => ({ field }));
    equalToMock.mockImplementation((value: string | boolean) => ({ value }));
    pushMock.mockReturnValue({ key: 'new-timeline', path: 'timelines/new-timeline' });
    setMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(undefined);
    queryMock.mockImplementation(
      (baseRef: { path: string }, order: { field?: string }, equal: { value: string | boolean }) => ({
        path: baseRef.path,
        orderField: order.field ?? null,
        equalToValue: equal.value,
      })
    );
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('normalizes adaptive timelines into resolved planner actions', async () => {
    getMock.mockResolvedValue(buildSnapshot(adaptiveTimeline));

    const timeline = await getTimeline('adaptive-m11s');

    expect(timeline.id).toBe('adaptive-m11s');
    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.actions).toHaveLength(39);
    expect(timeline.actions[0]?.name).toBe('Crown of Arcadia');
    expect(timeline.actions.some((action) => action.id === 'dance_of_domination')).toBe(true);
    expect(timeline.actions.some((action) => action.id === 'impact_1')).toBe(true);
    expect(timeline.actions.some((action) => action.id === 'heavy_hitter_1')).toBe(true);
    expect(timeline.actions.some((action) => action.id === 'atomic_impact_sequence')).toBe(false);
    expect(timeline.actions.some((action) => action.name === 'Superbolide')).toBe(false);
    expect(timeline.actions.every((action) => !('events' in action))).toBe(true);
  });

  it('returns local official timelines without querying Firebase', async () => {
    const timeline = await getTimeline('official-the-tyrant-m11s');

    expect(getMock).not.toHaveBeenCalled();
    expect(timeline.id).toBe('official-the-tyrant-m11s');
    expect(timeline.official).toBe(true);
    expect(timeline.format).toBe('adaptive_damage');
  });

  it('returns the new local official M9S timeline without querying Firebase', async () => {
    const timeline = await getTimeline('official-vamp-fatale-m9s');

    expect(getMock).not.toHaveBeenCalled();
    expect(timeline.id).toBe('official-vamp-fatale-m9s');
    expect(timeline.bossId).toBe('vamp-fatale-m9s');
    expect(timeline.official).toBe(true);
    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.phases?.length).toBeGreaterThan(1);
  });

  it('returns the new local official M12S timeline without querying Firebase', async () => {
    const timeline = await getTimeline('official-lindwurm-m12s');

    expect(getMock).not.toHaveBeenCalled();
    expect(timeline.id).toBe('official-lindwurm-m12s');
    expect(timeline.bossId).toBe('lindwurm-m12s');
    expect(timeline.official).toBe(true);
    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.actions.some((action) => action.id === 'the_fixer_1')).toBe(true);
    expect(timeline.phases?.length).toBeGreaterThan(3);
  });

  it('returns the new local official M12S Part 2 timeline without querying Firebase', async () => {
    const timeline = await getTimeline('official-lindwurm-ii-m12s');

    expect(getMock).not.toHaveBeenCalled();
    expect(timeline.id).toBe('official-lindwurm-ii-m12s');
    expect(timeline.bossId).toBe('lindwurm-ii-m12s');
    expect(timeline.official).toBe(true);
    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.actions.some((action) => action.id === 'arcadian_hell_1')).toBe(true);
    expect(timeline.phases?.length).toBeGreaterThan(4);
  });

  it('replaces remote official timeline documents with the local canonical timeline', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      ...adaptiveTimeline,
      official: true,
      isPublic: true,
      bossId: 'the-tyrant-m11s',
      bossTags: ['the-tyrant-m11s'],
    }));

    const timeline = await getTimeline('remote-official-doc');

    expect(timeline.id).toBe('official-the-tyrant-m11s');
    expect(timeline.name).toBe('The Tyrant (M11S) - Official Adaptive Timeline');
    expect(timeline.actions).toHaveLength(39);
  });

  it('shows only community timelines in public browsing', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      'remote-official-doc': {
        name: 'Old Remote Official',
        bossId: 'the-tyrant-m11s',
        bossTags: ['the-tyrant-m11s'],
        official: true,
        isPublic: true,
        actions: [],
      },
      'community-timeline': {
        name: 'Community Route',
        bossId: 'the-tyrant-m11s',
        bossTags: ['the-tyrant-m11s'],
        official: false,
        isPublic: true,
        actions: [
          {
            id: 'community-action',
            name: 'Community Hit',
            time: 12,
          },
        ],
        updatedAt: 10,
      },
    }));

    const timelines = await getAllPublicTimelines('name');

    expect(timelines.some((timeline) => timeline.id === 'official-the-tyrant-m11s')).toBe(false);
    expect(timelines.some((timeline) => timeline.id === 'community-timeline')).toBe(true);
    expect(timelines.some((timeline) => timeline.id === 'remote-official-doc')).toBe(false);
  });

  it('derives browse-page boss tags from community timelines only', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      'remote-official-doc': {
        name: 'Old Remote Official',
        bossId: 'the-tyrant-m11s',
        bossTags: ['the-tyrant-m11s'],
        official: true,
        isPublic: true,
        actions: [],
      },
      'community-timeline': {
        name: 'Community Route',
        bossId: 'm1s-custom',
        bossTags: ['m1s-custom', 'shared-tag'],
        official: false,
        isPublic: true,
        actions: [],
      },
      'community-timeline-2': {
        name: 'Another Route',
        bossId: 'm2s-custom',
        bossTags: ['shared-tag', 'm2s-custom'],
        official: false,
        isPublic: true,
        actions: [],
      },
    }));

    const tags = await getAllUniqueBossTags();

    expect(tags).toEqual(['m1s-custom', 'm2s-custom', 'shared-tag']);
    expect(tags).not.toContain('the-tyrant-m11s');
  });

  it('lists local official timelines first for boss-tag timeline selection', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      'community-timeline': {
        name: 'Community Route',
        bossId: 'the-tyrant-m11s',
        bossTags: ['the-tyrant-m11s'],
        official: false,
        isPublic: true,
        actions: [
          {
            id: 'community-action',
            name: 'Community Hit',
            time: 12,
          },
        ],
      },
    }));

    const timelines = await getTimelinesByBossTag('the-tyrant-m11s');

    expect(timelines[0]?.id).toBe('official-the-tyrant-m11s');
    expect(timelines[0]?.official).toBe(true);
    expect(timelines.some((timeline) => timeline.id === 'community-timeline')).toBe(true);
  });

  it('lists the local M9S official timeline for boss-tag selection', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      'community-vamp-timeline': {
        name: 'Community Vamp Route',
        bossId: 'vamp-fatale-m9s',
        bossTags: ['vamp-fatale-m9s'],
        official: false,
        isPublic: true,
        actions: [
          {
            id: 'community-vamp-action',
            name: 'Community Vamp Hit',
            time: 18,
          },
        ],
      },
    }));

    const timelines = await getTimelinesByBossTag('vamp-fatale-m9s');

    expect(timelines[0]?.id).toBe('official-vamp-fatale-m9s');
    expect(timelines[0]?.official).toBe(true);
    expect(timelines.some((timeline) => timeline.id === 'community-vamp-timeline')).toBe(true);
  });

  it('lists the local M12S official timeline for boss-tag selection', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      'community-lindwurm-timeline': {
        name: 'Community Lindwurm Route',
        bossId: 'lindwurm-m12s',
        bossTags: ['lindwurm-m12s'],
        official: false,
        isPublic: true,
        actions: [
          {
            id: 'community-lindwurm-action',
            name: 'Community Lindwurm Hit',
            time: 22,
          },
        ],
      },
    }));

    const timelines = await getTimelinesByBossTag('lindwurm-m12s');

    expect(timelines[0]?.id).toBe('official-lindwurm-m12s');
    expect(timelines[0]?.official).toBe(true);
    expect(timelines.some((timeline) => timeline.id === 'community-lindwurm-timeline')).toBe(true);
  });

  it('lists the local M12S Part 2 official timeline for boss-tag selection', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      'community-lindwurm-ii-timeline': {
        name: 'Community Lindwurm II Route',
        bossId: 'lindwurm-ii-m12s',
        bossTags: ['lindwurm-ii-m12s'],
        official: false,
        isPublic: true,
        actions: [
          {
            id: 'community-lindwurm-ii-action',
            name: 'Community Lindwurm II Hit',
            time: 32,
          },
        ],
      },
    }));

    const timelines = await getTimelinesByBossTag('lindwurm-ii-m12s');

    expect(timelines[0]?.id).toBe('official-lindwurm-ii-m12s');
    expect(timelines[0]?.official).toBe(true);
    expect(timelines.some((timeline) => timeline.id === 'community-lindwurm-ii-timeline')).toBe(true);
  });

  it('loads owned timelines from both ownerId and legacy userId queries without duplicates', async () => {
    getMock.mockImplementation((target: { path: string; orderField?: string | null; equalToValue?: string | boolean }) => {
      if (target.path === 'timelines' && target.orderField === 'ownerId' && target.equalToValue === 'user-1') {
        return Promise.resolve(
          buildSnapshot({
            'timeline-owner': {
              ownerId: 'user-1',
              userId: 'user-1',
              name: 'Owner Timeline',
              updatedAt: 200,
              actions: [],
            },
            'timeline-modern': {
              ownerId: 'user-1',
              name: 'Modern Timeline',
              updatedAt: 100,
              actions: [],
            },
          })
        );
      }

      if (target.path === 'timelines' && target.orderField === 'userId' && target.equalToValue === 'user-1') {
        return Promise.resolve(
          buildSnapshot({
            'timeline-owner': {
              ownerId: 'user-1',
              userId: 'user-1',
              name: 'Owner Timeline',
              updatedAt: 200,
              actions: [],
            },
            'timeline-legacy': {
              userId: 'user-1',
              name: 'Legacy Timeline',
              updatedAt: 150,
              actions: [],
            },
          })
        );
      }

      if (target.path === 'userCollections/user-1/timelines') {
        return Promise.resolve(buildSnapshot(null));
      }

      throw new Error(`Unexpected get target: ${JSON.stringify(target)}`);
    });

    const timelines = await getUserTimelines('user-1');

    expect(timelines.map((timeline) => timeline.id)).toEqual([
      'timeline-owner',
      'timeline-legacy',
      'timeline-modern',
    ]);
    expect(timelines.every((timeline) => timeline.isOwned)).toBe(true);
  });

  it('returns an empty list when user timeline reads are permission denied', async () => {
    getMock.mockRejectedValue(new Error('Permission denied'));

    await expect(getUserTimelines('user-1')).resolves.toEqual([]);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('falls back to the local official timeline when community reads are permission denied', async () => {
    getMock.mockRejectedValue(new Error('Permission denied'));

    const timelines = await getTimelinesByBossTag('the-tyrant-m11s');

    expect(timelines).toHaveLength(1);
    expect(timelines[0]?.id).toBe('official-the-tyrant-m11s');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('sanitizes undefined action fields before creating a timeline', async () => {
    await createTimeline('user-1', {
      name: 'Phase Test',
      bossId: 'the-tyrant-m11s',
      bossTags: ['the-tyrant-m11s'],
      actions: [
        {
          id: 'anchor',
          name: 'Anchor',
          time: 10,
          phaseId: 'phase_1',
          isPhaseAnchor: undefined,
          source: 'custom',
          isCustom: true,
        },
      ],
    });

    expect(setMock).toHaveBeenCalledTimes(1);
    const [, payload] = setMock.mock.calls[0];
    expect(payload.actions[0]).not.toHaveProperty('isPhaseAnchor');
  });

  it('sanitizes undefined action fields before updating a timeline', async () => {
    getMock.mockResolvedValue(buildSnapshot({
      name: 'Existing Timeline',
      bossId: 'the-tyrant-m11s',
      bossTags: ['the-tyrant-m11s'],
      actions: [
        {
          id: 'existing-action',
          name: 'Existing Action',
          time: 8,
          source: 'custom',
          isCustom: true,
        },
      ],
      phases: [],
      analysisSources: [],
      format: 'legacy_flat',
      schemaVersion: 1,
      userId: 'user-1',
      ownerId: 'user-1',
    }));

    await updateTimeline('timeline-1', {
      actions: [
        {
          id: 'updated-action',
          name: 'Updated Action',
          time: 12,
          phaseId: 'phase_1',
          isPhaseAnchor: undefined,
          source: 'custom',
          isCustom: true,
        },
      ],
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateMock.mock.calls[0];
    expect(payload.actions[0]).not.toHaveProperty('isPhaseAnchor');
  });
});
