/**
 * Merger tests. Architecture §12.3.
 */
import { describe, expect, it } from 'vitest';
import { DefaultTimelineMerger } from './merger.js';
import { TimelineEvent } from '@xivmitplan/validation/timeline';
import { brandId } from '@xivmitplan/shared/ids';

const ENC_ID = brandId<'EncounterId'>('00000000-0000-0000-0000-000000000001');

const makeEvent = (id: string, name: string, ts: number, sources: { cactbot?: boolean; triggernometry?: boolean; fflogs?: boolean } = {}): TimelineEvent => ({
  id,
  position: 0,
  timestampMs: ts,
  type: 'MECHANIC',
  name,
  normalizedNames: [name.toLowerCase().replace(/\s+/g, ' ').trim()],
  durationMs: null,
  hitTimesMs: [ts],
  targets: { kind: 'PARTY' },
  mechanicId: null,
  patchVersion: '7.20',
  confidence: 0.9,
  mergedFromSources: { cactbot: !!sources.cactbot, triggernometry: !!sources.triggernometry, fflogs: !!sources.fflogs },
});

describe('DefaultTimelineMerger', () => {
  it('merges a single Cactbot-only event', () => {
    const merger = new DefaultTimelineMerger();
    const result = merger.merge({
      encounterId: ENC_ID,
      patchVersion: '7.20',
      cactbot: [makeEvent('1', 'Brutal Rain', 10_000, { cactbot: true })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.timeline.events).toHaveLength(1);
    expect(result.value.conflicts).toHaveLength(0);
  });

  it('aligns Cactbot + Triggernometry within 2s window', () => {
    const merger = new DefaultTimelineMerger();
    const result = merger.merge({
      encounterId: ENC_ID,
      patchVersion: '7.20',
      cactbot: [makeEvent('1', 'Brutal Rain', 10_000, { cactbot: true })],
      triggernometry: [makeEvent('2', 'Brutal Rain', 10_500, { triggernometry: true })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.timeline.events).toHaveLength(1);
    // Weighted average: (0.5*10000 + 0.2*10500) / 0.7 ≈ 10142.857
    expect(result.value.timeline.events[0]?.timestampMs).toBe(10_143);
  });

  it('flags a drift conflict when sources disagree > 500ms', () => {
    const merger = new DefaultTimelineMerger();
    const result = merger.merge({
      encounterId: ENC_ID,
      patchVersion: '7.20',
      cactbot: [makeEvent('1', 'Brutal Rain', 10_000, { cactbot: true })],
      triggernometry: [makeEvent('2', 'Brutal Rain', 11_500, { triggernometry: true })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.conflicts.some((c) => c.kind === 'TIMESTAMP_DRIFT')).toBe(true);
  });

  it('adds a MISSING_FROM_ONE conflict for an event only in triggernometry', () => {
    const merger = new DefaultTimelineMerger();
    const result = merger.merge({
      encounterId: ENC_ID,
      patchVersion: '7.20',
      cactbot: [makeEvent('1', 'Brutal Rain', 10_000, { cactbot: true })],
      triggernometry: [makeEvent('2', 'Something Else', 30_000, { triggernometry: true })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.conflicts.some((c) => c.kind === 'MISSING_FROM_ONE' && c.sources.includes('TRIGGERNOMETRY'))).toBe(true);
  });
});
