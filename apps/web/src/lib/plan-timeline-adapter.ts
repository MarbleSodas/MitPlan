/**
 * plan-timeline-adapter — merges canonical timeline events with plan-local
 * action overrides and provides materialization/drift detection.
 *
 * Two data sources:
 *   - Canonical events from the Postgres `timelines` table (read-only).
 *   - Plan-local timelineActions from the Yjs PlanDoc (mutable).
 *
 * The adapter produces the "effective" timeline for rendering in the
 * planner and timeline editor: canonical events with plan-local actions
 * inserted, edited, or removed.
 */
import type { PlanTimelineAction } from '@xivmitplan/validation/plan';
import type { TimelineEventInfo } from './data-source';

/** Effective timeline event shape exposed to the UI layer. */
export interface EffectiveTimelineEvent {
  id: string;
  position: number;
  timestampMs: number;
  type: 'MECHANIC' | 'BUSTER' | 'RAIDWIDE' | 'MECHANIC_START' | 'MECHANIC_END' | 'CUSTOM';
  name: string;
  durationMs: number | null;
  hitTimesMs: number[];
  targetKind: 'MAIN_TANK' | 'OFF_TANK' | 'PARTY' | 'HEALER' | 'TARGETED' | 'ALL';
  /** True when this event is sourced from plan-local actions (not canonical). */
  isCustom: boolean;
  /** The original canonical event id, or null for custom actions. */
  sourceEventId: string | null;
  notes: string | null;
  linkedAbilityId: string | null;
  damageType: 'physical' | 'magical' | 'both' | null;
  isDot: boolean;
}

/** Convert a canonical TimelineEventInfo to an EffectiveTimelineEvent. */
export function canonicalToEffective(e: TimelineEventInfo): EffectiveTimelineEvent {
  return {
    id: e.id,
    position: e.position,
    timestampMs: e.timestampMs,
    type: e.type,
    name: e.name,
    durationMs: e.durationMs,
    hitTimesMs: e.hitTimesMs,
    targetKind: e.targetKind,
    isCustom: false,
    sourceEventId: e.id,
    notes: e.notes ?? null,
    linkedAbilityId: null,
    damageType: null,
    isDot: false,
  };
}

/** Convert a PlanTimelineAction to an EffectiveTimelineEvent. */
export function actionToEffective(a: PlanTimelineAction): EffectiveTimelineEvent {
  return {
    id: a.id,
    position: a.position,
    timestampMs: a.timestampMs,
    type: a.type,
    name: a.name,
    durationMs: a.durationMs,
    hitTimesMs: a.hitTimesMs,
    targetKind: a.targetKind,
    isCustom: a.isCustom,
    sourceEventId: a.sourceEventId,
    notes: a.notes,
    linkedAbilityId: a.linkedAbilityId,
    damageType: a.damageType,
    isDot: a.isDot,
  };
}

/**
 * Build the effective timeline by merging canonical events with
 * plan-local timeline actions.
 *
 * Merge strategy:
 *   1. Start with all canonical events.
 *   2. For each plan-local action:
 *      a. If it has a sourceEventId matching a canonical event, REPLACE
 *         that event with the action (keeping the canonical id as
 *         sourceEventId).
 *      b. If it has no sourceEventId or the source event no longer exists,
 *         INSERT it at the correct position.
 *   3. Sort by timestampMs, then position.
 *   4. Re-assign positions sequentially.
 */
export function buildEffectiveTimeline(
  canonical: readonly TimelineEventInfo[],
  actions: readonly PlanTimelineAction[],
): EffectiveTimelineEvent[] {
  const canonicalMap = new Map(canonical.map((e) => [e.id, e]));
  const seenSourceIds = new Set<string>();
  const result: EffectiveTimelineEvent[] = [];

  // Start with all canonical events converted to effective.
  for (const e of canonical) {
    result.push(canonicalToEffective(e));
  }

  // Apply plan-local actions: replace matching canonical events,
  // insert unmatched custom actions.
  for (const a of [...actions].sort((x, y) => x.position - y.position)) {
    if (a.sourceEventId && canonicalMap.has(a.sourceEventId)) {
      // Replace the canonical event at the matching index.
      const idx = result.findIndex(
        (r) => r.sourceEventId === a.sourceEventId && !r.isCustom,
      );
      if (idx !== -1) {
        result[idx] = actionToEffective(a);
        seenSourceIds.add(a.sourceEventId);
      } else {
        // Source event not found in result; append as custom.
        result.push(actionToEffective(a));
      }
    } else {
      // Custom action or source not found — insert.
      result.push(actionToEffective(a));
    }
  }

  // Sort by timestampMs, then by position for stable ordering.
  result.sort((a, b) => {
    const tDiff = a.timestampMs - b.timestampMs;
    if (tDiff !== 0) return tDiff;
    return a.position - b.position;
  });

  // Re-assign sequential positions.
  for (let i = 0; i < result.length; i++) {
    result[i] = { ...result[i], position: i } as EffectiveTimelineEvent;
  }

  return result;
}

/**
 * Detect drift between the plan's saved source timeline provenance
 * and the current canonical timeline.
 */
export function detectCanonicalDrift(
  planSourceHash: string | null | undefined,
  planSourceVersion: string | null | undefined,
  currentCanonical: readonly { contentHash: string; version: string }[],
): { hasDrifted: boolean; message: string | null } {
  if (!planSourceHash && !planSourceVersion) {
    return { hasDrifted: false, message: null };
  }

  const current = currentCanonical[0];
  if (!current) {
    return {
      hasDrifted: true,
      message: 'The source timeline for this encounter is no longer available.',
    };
  }

  if (planSourceHash && current.contentHash !== planSourceHash) {
    return {
      hasDrifted: true,
      message: `The canonical timeline has changed (version ${current.version}) since this plan was created (version ${planSourceVersion ?? 'unknown'}).`,
    };
  }

  return { hasDrifted: false, message: null };
}

/**
 * Materialize a canonical timeline into plan-local actions.
 * Creates a PlanTimelineAction for each canonical event, marking
 * them as non-custom (isCustom: false) with the sourceEventId set.
 * This should be called once when the user first edits a read-only
 * canonical timeline.
 */
export function materializeCanonicalToActions(
  canonical: readonly TimelineEventInfo[],
): PlanTimelineAction[] {
  return canonical.map((e, idx) => ({
    id: crypto.randomUUID(),
    position: idx,
    timestampMs: e.timestampMs,
    type: e.type,
    name: e.name,
    durationMs: e.durationMs,
    hitTimesMs: e.hitTimesMs,
    targetKind: e.targetKind,
    sourceEventId: e.id,
    isCustom: false,
    notes: e.notes ?? null,
    linkedAbilityId: null,
    damageType: null,
    hitCount: null,
    isDot: false,
    targetsTank: e.targetKind === 'MAIN_TANK' ? 'MAIN' : e.targetKind === 'OFF_TANK' ? 'OFF' : 'NONE',
  }));
}
