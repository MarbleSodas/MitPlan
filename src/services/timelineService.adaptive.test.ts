import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import adaptiveTimeline from '../data/timelines/the-tyrant-m11s.timeline.json';

const getMock = vi.fn();
const refMock = vi.fn();

vi.mock('../config/firebase', () => ({
  database: {},
}));

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  push: vi.fn(),
  set: vi.fn(),
  get: (...args: unknown[]) => getMock(...args),
  update: vi.fn(),
  remove: vi.fn(),
  query: vi.fn(),
  orderByChild: vi.fn(),
  equalTo: vi.fn(),
}));

import {
  getAllPublicTimelines,
  getAllUniqueBossTags,
  getTimeline,
  getTimelinesByBossTag,
  getUserTimelines,
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
    getMock.mockReset();
    refMock.mockReset();
    refMock.mockReturnValue({});
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
});
