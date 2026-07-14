/**
 * Tests for `buildLegacyTimeline` — the synthetic-timeline reconstruction
 * for imported (Firebase / MitPlan v1) plans.
 */
import { describe, expect, it } from 'vitest';
import type { Assignment } from '@xivmitplan/validation/plan';
import type { TimelineEventInfo } from '@/lib/data-source';
import { buildLegacyTimeline } from './legacy-timeline';

const baseAssignment = (over: Partial<Assignment>): Assignment =>
  ({
    id: 'a',
    abilityId: 'ability-x',
    targetUserId: null,
    targetType: 'PARTY',
    eventId: 'event-x',
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    revision: 0,
    legacyMitigationId: null,
    legacyMitigationName: null,
    legacyBossActionId: null,
    casterJobId: null,
    casterUserId: null,
    casterDisplayName: null,
    casterColor: null,
    tankPosition: null,
    precastSeconds: null,
    instanceId: null,
    ...over,
  }) as Assignment;

const catalogEvent = (id: string): TimelineEventInfo => ({
  id,
  position: 0,
  timestampMs: 0,
  type: 'MECHANIC',
  name: 'Catalog',
  durationMs: null,
  hitTimesMs: [],
  targetKind: 'ALL',
  confidence: 1,
  notes: null,
  normalizedNames: [],
  mechanicId: null,
  patchVersion: '',
  mergedFromSources: { cactbot: false, triggernometry: false, fflogs: false },
});

describe('buildLegacyTimeline', () => {
  it('returns no synthetic events when there are no imported assignments', () => {
    const assignments = [
      baseAssignment({ eventId: 'e1', legacyBossActionId: null }),
    ];
    expect(buildLegacyTimeline(assignments, new Map())).toEqual([]);
  });

  it('builds one synthetic event per distinct bossActionId', () => {
    const assignments = [
      baseAssignment({ eventId: 'ev-1', legacyBossActionId: 'deep_cut_1' }),
      baseAssignment({ eventId: 'ev-1', legacyBossActionId: 'deep_cut_1' }),
      baseAssignment({ eventId: 'ev-2', legacyBossActionId: 'tidal_roar_2' }),
    ];
    const out = buildLegacyTimeline(assignments, new Map());
    expect(out.map((e) => e.id)).toEqual(['ev-1', 'ev-2']);
    expect(out[0]!.name).toBe('Deep Cut 1');
    expect(out[1]!.name).toBe('Tidal Roar 2');
  });

  it('orders synthetic events by their occurrence number', () => {
    const assignments = [
      baseAssignment({ eventId: 'ev-2', legacyBossActionId: 'tidal_roar_2' }),
      baseAssignment({ eventId: 'ev-1', legacyBossActionId: 'deep_cut_1' }),
    ];
    const out = buildLegacyTimeline(assignments, new Map());
    expect(out.map((e) => e.id)).toEqual(['ev-1', 'ev-2']);
    expect(out[0]!.timestampMs).toBeLessThan(out[1]!.timestampMs);
  });

  it('does not synthesize events already present in the catalog', () => {
    const catalog = new Map([['ev-matched', catalogEvent('ev-matched')]]);
    const assignments = [
      baseAssignment({ eventId: 'ev-matched', legacyBossActionId: 'deep_cut_1' }),
      baseAssignment({ eventId: 'ev-new', legacyBossActionId: 'tidal_roar_2' }),
    ];
    const out = buildLegacyTimeline(assignments, catalog);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('ev-new');
  });
});
