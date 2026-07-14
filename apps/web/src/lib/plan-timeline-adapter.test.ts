import { describe, expect, it } from 'vitest';
import type { PlanTimelineAction } from '@xivmitplan/validation/plan';
import type { TimelineEventInfo } from './data-source';
import { buildEffectiveTimeline, detectCanonicalDrift } from './plan-timeline-adapter';

const event = (id: string, timestampMs: number, name = id): TimelineEventInfo => ({
  id,
  position: timestampMs,
  timestampMs,
  type: 'MECHANIC',
  name,
  durationMs: null,
  hitTimesMs: [],
  targetKind: 'PARTY',
  confidence: 1,
  notes: null,
});

const action = (overrides: Partial<PlanTimelineAction> = {}): PlanTimelineAction => ({
  id: '90000000-0000-0000-0000-000000000001',
  position: 0,
  timestampMs: 500,
  type: 'CUSTOM',
  name: 'Custom action',
  durationMs: null,
  hitTimesMs: [],
  targetKind: 'PARTY',
  sourceEventId: null,
  isCustom: true,
  notes: null,
  linkedAbilityId: null,
  damageType: null,
  hitCount: null,
  isDot: false,
  targetsTank: 'NONE',
  ...overrides,
});

describe('plan timeline adapter', () => {
  it('merges custom actions into the canonical order and exposes UI metadata', () => {
    const result = buildEffectiveTimeline([event('evt-1', 1000)], [action()]);

    expect(result.map((entry) => entry.id)).toEqual([
      '90000000-0000-0000-0000-000000000001',
      'evt-1',
    ]);
    expect(result[0]).toMatchObject({
      isCustom: true,
      type: 'CUSTOM',
      confidence: 1,
      sourceEventId: null,
    });
  });

  it('replaces a canonical event without changing its source identity', () => {
    const result = buildEffectiveTimeline(
      [event('evt-1', 1000, 'Canonical')],
      [
        action({
          id: '90000000-0000-0000-0000-000000000002',
          sourceEventId: 'evt-1',
          isCustom: false,
          type: 'BUSTER',
          name: 'Edited buster',
          timestampMs: 1200,
        }),
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '90000000-0000-0000-0000-000000000002',
      sourceEventId: 'evt-1',
      name: 'Edited buster',
      isCustom: false,
    });
  });

  it('detects provenance drift only when the saved hash changed', () => {
    expect(
      detectCanonicalDrift('hash-a', '7.21', [{ contentHash: 'hash-a', version: '7.21' }]),
    ).toEqual({ hasDrifted: false, message: null });
    expect(
      detectCanonicalDrift('hash-a', '7.21', [{ contentHash: 'hash-b', version: '8.0' }])
        .hasDrifted,
    ).toBe(true);
  });
});
