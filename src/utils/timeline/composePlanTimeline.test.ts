import { describe, expect, it } from 'vitest';
import type { Timeline } from '../../types';
import { composePlanTimeline } from './composePlanTimeline';

const timeline: Timeline = {
  id: 'timeline-1',
  name: 'Composable fight',
  actions: [],
  format: 'adaptive_damage',
  schemaVersion: 2,
  resolution: { defaultBranchId: 'route-a' },
  phases: [{
    id: 'phase-a',
    name: 'Phase A',
    order: 0,
    anchorActionId: 'a-1',
    branchIds: ['route-a', 'route-b'],
    source: 'manual',
    skipWindowMode: 'keep_visible',
  }],
  adaptiveModel: {
    branches: [
      {
        id: 'route-a',
        events: [{ id: 'a-1', name: 'Route A', time: 10, phaseId: 'phase-a' }],
      },
      {
        id: 'route-b',
        events: [{ id: 'a-1', name: 'Route B', time: 20, phaseId: 'phase-a' }],
      },
    ],
  },
};

describe('composePlanTimeline', () => {
  it('resolves the selected route, phase offsets, and custom events in one path', () => {
    const composed = composePlanTimeline(timeline, {
      routeId: 'route-b',
      phaseOverrides: { 'phase-a': { startTime: 25 } },
      customEvents: [{
        id: 'custom-1',
        name: 'Plan note',
        time: 22,
        phaseId: 'phase-a',
        isCustom: true,
      }],
    });

    expect(composed.routeId).toBe('route-b');
    expect(composed.actions.map(({ id, time }) => ({ id, time }))).toEqual([
      { id: 'a-1', time: 25 },
      { id: 'custom-1', time: 27 },
    ]);
  });

  it('falls back to the pinned default route when a legacy route id is stale', () => {
    const composed = composePlanTimeline(timeline, { routeId: 'removed-route' });

    expect(composed.routeId).toBe('route-a');
    expect(composed.usedRouteFallback).toBe(true);
    expect(composed.actions[0]?.name).toBe('Route A');
  });
});
