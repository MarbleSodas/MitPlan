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

// ---------------------------------------------------------------------------
// Extended evaluation types
// ---------------------------------------------------------------------------

export type MitEvaluationContext = {
  eventTimestampMs: number;
  hitTimesMs?: readonly number[];
  damageType?: 'physical' | 'magical' | 'both' | null;
  targetKind?: string;
};

export type MitHitDetail = {
  hitTimeMs: number;
  residualPct: number;
  residualMultiplier: number;
  shieldTotalPct: number;
  shieldCount: number;
  entries: MitStackEntry[];
  hasInvuln: boolean;
};

export type ExtendedMitStackResult = MitStackResult & {
  perHit: MitHitDetail[];
  doubleBookings: Map<string, WebAssignment[]>;
};

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

export function computeResidualMultiplier(effectPcts: readonly number[]): number {
  if (effectPcts.length === 0) return 1.0;
  const safe = effectPcts.map((p) => Math.max(0, Math.min(100, p)));
  return safe.reduce((acc, p) => acc * (1 - p / 100), 1.0);
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

function isAbilityActiveAtTime(
  ability: AbilityInfo,
  eventTimestampMs: number,
  hitTimeMs: number,
): boolean {
  if (ability.durationS == null || ability.durationS <= 0) return true;
  const endMs = eventTimestampMs + ability.durationS * 1000;
  return hitTimeMs >= eventTimestampMs && hitTimeMs <= endMs;
}

function isAbilityApplicableForTarget(
  ability: AbilityInfo,
  targetKind: string,
): boolean {
  if (ability.target == null) return true;
  switch (ability.target) {
    case 'self':
      return targetKind === 'MAIN_TANK' || targetKind === 'OFF_TANK' || targetKind === 'HEALER';
    case 'single':
      return targetKind === 'MAIN_TANK' || targetKind === 'OFF_TANK' || targetKind === 'TARGETED' || targetKind === 'HEALER';
    case 'party':
      return targetKind === 'PARTY' || targetKind === 'ALL';
    case 'area':
      return targetKind === 'PARTY' || targetKind === 'ALL';
    default:
      return true;
  }
}

function isAbilityApplicableForDamageType(
  ability: AbilityInfo,
  damageType: 'physical' | 'magical' | 'both' | null,
): boolean {
  if (damageType == null) return true;
  if (ability.damageType == null || ability.damageType === 'both') return true;
  return ability.damageType === damageType;
}

// ---------------------------------------------------------------------------
// Per-hit evaluation
// ---------------------------------------------------------------------------

function evaluateHit(
  active: WebAssignment[],
  abilityById: Map<string, AbilityInfo>,
  eventTimestampMs: number,
  hitTimeMs: number,
  targetKind: string | undefined,
  damageType: 'physical' | 'magical' | 'both' | null | undefined,
): MitHitDetail {
  const effectPcts: number[] = [];
  const entries: MitStackEntry[] = [];
  let hasInvuln = false;
  let shieldTotalPct = 0;
  let shieldCount = 0;

  for (const a of active) {
    const ability = abilityById.get(a.abilityId);
    if (!ability) continue;

    if (targetKind && !isAbilityApplicableForTarget(ability, targetKind)) continue;
    if (damageType && !isAbilityApplicableForDamageType(ability, damageType)) continue;
    if (!isAbilityActiveAtTime(ability, eventTimestampMs, hitTimeMs)) continue;

    if (ability.isShield) {
      shieldCount++;
      if (ability.effectPct != null && ability.effectPct > 0) {
        shieldTotalPct += ability.effectPct;
      }
    }

    if (ability.effectPct == null || ability.effectPct <= 0) continue;
    if (ability.isInvuln) hasInvuln = true;

    effectPcts.push(ability.effectPct);
    entries.push({
      abilityId: ability.id,
      abilityName: ability.name,
      jobAbbrev: ability.jobAbbrev,
      effectPct: ability.effectPct,
      isInvuln: ability.isInvuln,
    });
  }

  const multiplier = hasInvuln ? 0 : computeResidualMultiplier(effectPcts);

  return {
    hitTimeMs,
    residualPct: multiplier * 100,
    residualMultiplier: multiplier,
    shieldTotalPct,
    shieldCount,
    entries,
    hasInvuln,
  };
}

// ---------------------------------------------------------------------------
// Event evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate the mit stack for a single event. Groups assignments by
 * eventId, resolves abilities, and computes the residual multiplier.
 *
 * When `context` is omitted the function behaves as before: no
 * duration/target/damage-type filtering, single evaluation at time 0.
 *
 * When `context` is provided the per-hit evaluation accounts for:
 *   - ability duration vs hit time
 *   - target-type compatibility
 *   - damage-type compatibility
 *   - shield metadata (count & effectPct sum)
 *   - multi-hit events (perHit array has one entry per hit)
 */
export function evaluateEventMit(
  eventId: string,
  assignments: WebAssignment[],
  abilityById: Map<string, AbilityInfo>,
  context?: MitEvaluationContext,
): ExtendedMitStackResult {
  const active = assignments.filter((a) => a.eventId === eventId);

  if (!context) {
    const effectPcts: number[] = [];
    const entries: MitStackEntry[] = [];
    let hasInvuln = false;

    for (const a of active) {
      const ability = abilityById.get(a.abilityId);
      if (!ability || ability.effectPct == null || ability.effectPct <= 0) continue;
      if (ability.isInvuln) hasInvuln = true;
      effectPcts.push(ability.effectPct);
      entries.push({
        abilityId: ability.id,
        abilityName: ability.name,
        jobAbbrev: ability.jobAbbrev,
        effectPct: ability.effectPct,
        isInvuln: ability.isInvuln,
      });
    }

    const multiplier = hasInvuln ? 0 : computeResidualMultiplier(effectPcts);
    return {
      residualPct: multiplier * 100,
      residualMultiplier: multiplier,
      entries,
      hasOverlap: active.length > 1,
      perHit: [],
      doubleBookings: new Map(),
    };
  }

  const hitTimesMs =
    context.hitTimesMs && context.hitTimesMs.length > 0
      ? [...context.hitTimesMs]
      : [context.eventTimestampMs];

  const perHit: MitHitDetail[] = hitTimesMs.map((hitTimeMs) =>
    evaluateHit(
      active,
      abilityById,
      context.eventTimestampMs,
      hitTimeMs,
      context.targetKind,
      context.damageType,
    ),
  );

  const firstHit = perHit[0]!;
  const doubleBookings = detectDoubleBookings(assignments, abilityById);

  return {
    residualPct: firstHit.residualPct,
    residualMultiplier: firstHit.residualMultiplier,
    entries: firstHit.entries,
    hasOverlap: active.length > 1,
    perHit,
    doubleBookings,
  };
}

// ---------------------------------------------------------------------------
// Double-booking detection
// ---------------------------------------------------------------------------

/**
 * Detect double-bookings: the same ability from the same job used on
 * the same event multiple times, or — when `eventTimestampsById` is
 * provided — within the recast window across different events.
 */
export function detectDoubleBookings(
  assignments: WebAssignment[],
  abilityById: Map<string, AbilityInfo>,
  eventTimestampsById?: ReadonlyMap<string, number>,
): Map<string, WebAssignment[]> {
  const conflicts = new Map<string, WebAssignment[]>();

  // Same-event conflicts (existing behavior)
  const byEventKey = new Map<string, WebAssignment[]>();
  for (const a of assignments) {
    const ability = abilityById.get(a.abilityId);
    const key = `${a.eventId}:${ability?.jobAbbrev ?? 'unknown'}:${ability?.name ?? 'unknown'}`;
    const existing = byEventKey.get(key) ?? [];
    existing.push(a);
    byEventKey.set(key, existing);
  }
  for (const [key, list] of byEventKey) {
    if (list.length > 1) conflicts.set(key, list);
  }

  // Recast-window conflicts across events
  if (eventTimestampsById) {
    const byAbility = new Map<string, WebAssignment[]>();
    for (const a of assignments) {
      const ability = abilityById.get(a.abilityId);
      const key = `${ability?.jobAbbrev ?? 'unknown'}:${ability?.name ?? 'unknown'}`;
      const existing = byAbility.get(key) ?? [];
      existing.push(a);
      byAbility.set(key, existing);
    }

    for (const [key, list] of byAbility) {
      if (list.length < 2) continue;
      const ability = abilityById.get(list[0]!.abilityId);
      if (!ability || ability.recastS == null || ability.recastS <= 0) continue;
      const recastMs = ability.recastS * 1000;

      const sorted = [...list].sort(
        (a, b) =>
          (eventTimestampsById.get(a.eventId) ?? 0) -
          (eventTimestampsById.get(b.eventId) ?? 0),
      );

      for (let i = 1; i < sorted.length; i++) {
        const prevTime = eventTimestampsById.get(sorted[i - 1]!.eventId) ?? 0;
        const currTime = eventTimestampsById.get(sorted[i]!.eventId) ?? 0;
        if (currTime - prevTime < recastMs) {
          conflicts.set(key, sorted);
          break;
        }
      }
    }
  }

  return conflicts;
}
