/**
 * Legacy timeline reconstruction.
 *
 * Imported (Firebase / MitPlan v1) plans store their mitigation as
 * `assignments` keyed by the original `bossActionId`. The Firebase
 * Realtime Database had no separate normalized timeline — the set of
 * `bossActionId`s *is* the timeline. The converter preserved each
 * `bossActionId` on the row (`legacyBossActionId`) and stubbed a stable
 * placeholder `eventId`.
 *
 * When an imported plan has no matching catalog timeline, we rebuild a
 * faithful timeline from those `bossActionId`s so every mitigation
 * renders on the canvas exactly where it lived in v1. Each synthetic
 * event reuses the assignment's stored `eventId`, so it lines up with
 * the existing assignments with no further re-anchoring.
 */
import type { Assignment } from '@xivmitplan/validation/plan';
import type { TimelineEventInfo } from '@/lib/data-source';

const humanizeBossAction = (id: string): string =>
  id
    .split(/[_-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Trailing occurrence number in ids like `deep_cut_1` / `tidal_roar_2`. */
const sequenceOf = (id: string): number | null => {
  const m = id.match(/[_-](\d+)$/);
  return m ? Number(m[1]) : null;
};

const SPACING_MS = 30_000;

/**
 * Build synthetic timeline events for the imported-assignment rows whose
 * `eventId` is not already a catalog event. Catalog events are left
 * untouched; synthetic events are appended and ordered by their original
 * occurrence so the rail reads top-to-bottom like the v1 plan.
 */
export function buildLegacyTimeline(
  assignments: Assignment[],
  catalogById: Map<string, TimelineEventInfo>,
): TimelineEventInfo[] {
  const seen = new Set<string>();
  const ordered = assignments
    .filter((a) => a.legacyBossActionId && !catalogById.has(a.eventId))
    .map((a) => ({ a, seq: sequenceOf(a.legacyBossActionId!) }))
    .sort((x, y) => {
      const sx = x.seq;
      const sy = y.seq;
      if (sx != null && sy != null) return sx - sy;
      if (sx != null) return -1;
      if (sy != null) return 1;
      return x.a.legacyBossActionId!.localeCompare(y.a.legacyBossActionId!);
    });

  const events: TimelineEventInfo[] = [];
  let index = 0;
  for (const { a } of ordered) {
    if (seen.has(a.eventId)) continue;
    seen.add(a.eventId);
    const bossActionId = a.legacyBossActionId!;
    const timestampMs = index * SPACING_MS;
    events.push({
      id: a.eventId,
      position: timestampMs,
      timestampMs,
      type: 'MECHANIC',
      name: humanizeBossAction(bossActionId),
      durationMs: null,
      hitTimesMs: [],
      targetKind: 'ALL',
      confidence: 1,
      notes: null,
      normalizedNames: [bossActionId.toLowerCase().replace(/[_-]+/g, '-').replace(/^-|-$/g, '')],
      mechanicId: null,
      patchVersion: '',
      mergedFromSources: { cactbot: false, triggernometry: false, fflogs: false },
    });
    index += 1;
  }
  return events;
}
