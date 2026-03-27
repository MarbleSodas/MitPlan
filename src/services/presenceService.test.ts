import { describe, expect, it } from 'vitest';
import {
  applyPresencePatch,
  arePresenceStatesEqual,
  normalizePresenceData,
} from './presenceService';

describe('presenceService helpers', () => {
  it('normalizes generic targets and rounds cursor coordinates', () => {
    const normalized = normalizePresenceData({
      activeTarget: {
        surface: 'planner',
        entityType: 'assignment',
        entityId: 'action-1',
        field: 'mitigation-1',
        slotId: 'shared',
      },
      cursor: {
        surface: 'planner',
        panel: 'timeline',
        x: 10.7,
        y: 21.2,
        containerWidth: 800.4,
        containerHeight: 401.8,
      },
      viewport: {
        surface: 'planner',
        panel: 'timeline',
        section: 'timeline',
        scrollTop: 22.9,
      },
      lastUpdated: 5,
    });

    expect(normalized.activeTarget).toEqual(
      expect.objectContaining({
        key: 'planner|assignment|action-1|mitigation-1|shared',
      })
    );
    expect(normalized.cursor).toEqual(
      expect.objectContaining({
        x: 11,
        y: 21,
        containerWidth: 800,
        containerHeight: 402,
      })
    );
    expect(normalized.viewport?.scrollTop).toBe(23);
  });

  it('applies presence patches without depending on legacy field-specific schema', () => {
    const next = applyPresencePatch(null, {
      activeTarget: {
        surface: 'timeline',
        entityType: 'timelineEvent',
        entityId: 'event-1',
        field: 'time',
      },
      interaction: 'editing',
    });

    expect(next.activeTarget).toEqual(
      expect.objectContaining({
        key: 'timeline|timelineEvent|event-1|time|',
      })
    );
    expect(next.interaction).toBe('editing');
    expect(next.lastUpdated).toBeGreaterThan(0);
  });

  it('compares presence states by collaboration data and ignores timestamp churn', () => {
    const a = normalizePresenceData({
      activeTarget: {
        surface: 'planner',
        entityType: 'bossAction',
        entityId: 'boss-1',
      },
      interaction: 'selected',
      cursor: null,
      viewport: {
        surface: 'planner',
        panel: 'timeline',
        section: 'timeline',
        scrollTop: 100,
      },
      lastUpdated: 1,
    });

    const b = {
      ...a,
      lastUpdated: 999,
    };

    expect(arePresenceStatesEqual(a, b)).toBe(true);
  });
});
