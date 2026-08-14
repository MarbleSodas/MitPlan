import { describe, expect, it } from 'vitest';
import {
  buildTimelineUpgradePreview,
  canonicalTimelineJson,
  hashTimelineDocument,
  resolvePhaseAnchors,
  validateTimelineEvidence,
} from './timelineVersionService';

describe('timelineVersionService', () => {
  it('produces identical JSON and hashes for semantically identical inputs', async () => {
    const left = { routes: ['default'], encounter: 'm12s', schemaVersion: 2 };
    const right = { schemaVersion: 2, encounter: 'm12s', routes: ['default'] };
    expect(canonicalTimelineJson(left)).toBe(canonicalTimelineJson(right));
    expect(await hashTimelineDocument(left)).toBe(await hashTimelineDocument(right));
  });

  it('blocks publication until evidence thresholds or reviewed waivers pass', () => {
    const validation = validateTimelineEvidence({
      distinctPublicClearCount: 29,
      reportRevisionCount: 29,
      stableEventSupportRatios: [0.79],
      branchEvidence: [{ reportCount: 4, supportRatio: 0.14 }],
      maximumUnexplainedDriftSeconds: 8.1,
      unsupportedEventCount: 1,
    });
    expect(validation.publishable).toBe(false);
    expect(validation.blockers).toHaveLength(5);
  });

  it('classifies upgrade events and protects non-identical assignment mappings', () => {
    const current = {
      actions: [
        { id: 'same', time: 10, name: 'Same' },
        { id: 'moved', time: 20, name: 'Moved' },
        { id: 'changed', time: 30, name: 'Old' },
        { id: 'removed', time: 40, name: 'Removed' },
      ],
      healthConfig: {},
    };
    const target = {
      actions: [
        { id: 'same', time: 10, name: 'Same' },
        { id: 'moved', time: 22, name: 'Moved' },
        { id: 'changed', time: 30, name: 'New' },
        { id: 'added', time: 50, name: 'Added' },
      ],
      healthConfig: {},
    };
    const preview = buildTimelineUpgradePreview(
      current as never,
      target as never,
      { same: [{ id: 'reprisal' }], moved: [{ id: 'addle' }] }
    );
    expect(preview.unchanged).toEqual(['same']);
    expect(preview.moved).toEqual(['moved']);
    expect(preview.metadataChanged).toEqual(['changed']);
    expect(preview.added).toEqual(['added']);
    expect(preview.removed).toEqual(['removed']);
    expect(preview.assignmentsFollowingAutomatically).toEqual(['same']);
    expect(preview.assignmentsRequiringReview).toEqual(['moved']);
  });

  it('cascades phase anchor offsets until the next explicit override', () => {
    expect(resolvePhaseAnchors(
      [
        { id: 'p1', canonicalStartMs: 0 },
        { id: 'p2', canonicalStartMs: 60_000 },
        { id: 'p3', canonicalStartMs: 120_000 },
        { id: 'p4', canonicalStartMs: 180_000 },
      ],
      {
        p2: { anchorTimeMs: 65_000 },
        p4: { anchorTimeMs: 178_000 },
      }
    ).map((phase) => phase.effectiveStartMs)).toEqual([
      0,
      65_000,
      125_000,
      178_000,
    ]);
  });
});
