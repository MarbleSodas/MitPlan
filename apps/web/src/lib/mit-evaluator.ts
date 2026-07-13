/**
 * Web-layer mit stack evaluator. Mirrors the domain's
 * `MultiplicativeMitStackEvaluator` but operates on the plain
 * `AbilityInfo` and assignment types from the web data-source layer,
 * avoiding branded-ID imports from `@xivmitplan/domain`.
 *
 * FFXIV formula: 1.0 × ∏(1 - effectPct/100) for percent mits,
 * then additive shield after. Invulns zero out all damage.
 */
import type { AbilityInfo } from './data-source';

export type WebAssignment = {
  id: string;
  abilityId: string;
  eventId: string;
  targetUserId: string | null;
};

export type MitStackEntry = {
  abilityId: string;
  abilityName: string;
  jobAbbrev: string;
  effectPct: number;
  isInvuln: boolean;
};

export type MitStackResult = {
  residualPct: number;
  residualMultiplier: number;
  entries: MitStackEntry[];
  hasOverlap: boolean;
};

export function computeResidualMultiplier(effectPcts: readonly number[]): number {
  if (effectPcts.length === 0) return 1.0;
  const safe = effectPcts.map((p) => Math.max(0, Math.min(100, p)));
  return safe.reduce((acc, p) => acc * (1 - p / 100), 1.0);
}

/**
 * Evaluate the mit stack for a single event. Groups assignments by
 * eventId, resolves abilities, and computes the residual multiplier.
 */
export function evaluateEventMit(
  eventId: string,
  assignments: WebAssignment[],
  abilityById: Map<string, AbilityInfo>,
): MitStackResult {
  const active = assignments.filter((a) => a.eventId === eventId);
  const effectPcts: number[] = [];
  const entries: MitStackEntry[] = [];
  let hasInvuln = false;

  for (const a of active) {
    const ability = abilityById.get(a.abilityId);
    if (!ability || ability.effectPct == null || ability.effectPct <= 0) continue;
    if (ability.isInvuln) {
      hasInvuln = true;
    }
    effectPcts.push(ability.effectPct);
    entries.push({
      abilityId: ability.id,
      abilityName: ability.name,
      jobAbbrev: ability.jobAbbrev,
      effectPct: ability.effectPct,
      isInvuln: ability.isInvuln,
    });
  }

  const hasOverlap = active.length > 1;
  const multiplier = hasInvuln ? 0 : computeResidualMultiplier(effectPcts);

  return {
    residualPct: multiplier * 100,
    residualMultiplier: multiplier,
    entries,
    hasOverlap,
  };
}

/**
 * Detect double-bookings: the same ability from the same job used on
 * the same event multiple times.
 */
export function detectDoubleBookings(
  assignments: WebAssignment[],
  abilityById: Map<string, AbilityInfo>,
): Map<string, WebAssignment[]> {
  const seen = new Map<string, WebAssignment[]>();
  for (const a of assignments) {
    const ability = abilityById.get(a.abilityId);
    const key = `${a.eventId}:${ability?.jobAbbrev ?? 'unknown'}:${ability?.name ?? 'unknown'}`;
    const existing = seen.get(key) ?? [];
    existing.push(a);
    seen.set(key, existing);
  }
  const conflicts = new Map<string, WebAssignment[]>();
  for (const [key, list] of seen) {
    if (list.length > 1) conflicts.set(key, list);
  }
  return conflicts;
}
