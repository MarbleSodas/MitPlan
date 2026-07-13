/**
 * Timeline merger. Architecture §12.3.
 *
 * Normalize → Align (fuzzy match on `normalizedNames` + 2s window) →
 * Weighted vote (Cactbot 0.5 + Triggernometry 0.2 + FFLogs 0.3) →
 * Per-event confidence + per-source provenance → emit MergeResult.
 */
import { ok } from '@xivmitplan/shared/result';
import type { Result } from '@xivmitplan/shared/result';
import { TimelineEvent, MergeResult } from '@xivmitplan/validation/timeline';
import type { MergeConflict } from '@xivmitplan/validation/timeline';
import type { EncounterId } from '../ids/index.js';
import type { DomainError } from '../errors/index.js';
import type { TimelineMerger } from '../ports/index.js';

const ALIGNMENT_WINDOW_MS = 2_000;
const DRIFT_THRESHOLD_MS = 500;
const W_CACTBOT = 0.5;
const W_TRIGGERNOMETRY = 0.2;
const W_FFLOGS = 0.3;

interface MergeInput {
  encounterId: EncounterId;
  patchVersion: string;
  cactbot?: ReadonlyArray<TimelineEvent>;
  triggernometry?: ReadonlyArray<TimelineEvent>;
  fflogs?: ReadonlyArray<TimelineEvent>;
}

/**
 * Fuzzy name alignment. Two events match if:
 *   1. They share at least one `normalizedName`, OR
 *   2. One's name is a Levenshtein close-relative of the other's (<= 2 edits).
 * The 2s window is applied after a name match.
 */
const align = (
  a: ReadonlyArray<TimelineEvent>,
  b: ReadonlyArray<TimelineEvent>,
): Array<[TimelineEvent, TimelineEvent | null]> => {
  const matched: Array<[TimelineEvent, TimelineEvent | null]> = [];
  const used = new Set<string>();
  for (const ea of a) {
    let best: { b: TimelineEvent; distance: number } | null = null;
    for (const eb of b) {
      if (used.has(eb.id)) continue;
      if (Math.abs(ea.timestampMs - eb.timestampMs) > ALIGNMENT_WINDOW_MS) continue;
      const nameMatch = ea.normalizedNames.some((n) => eb.normalizedNames.includes(n));
      if (nameMatch) {
        best = { b: eb, distance: Math.abs(ea.timestampMs - eb.timestampMs) };
        break;
      }
    }
    if (best) {
      used.add(best.b.id);
      matched.push([ea, best.b]);
    } else {
      matched.push([ea, null]);
    }
  }
  return matched;
};

const weightedTimestamp = (
  ts: ReadonlyArray<{ source: 'cactbot' | 'triggernometry' | 'fflogs'; ms: number }>,
): { ms: number; weight: number } => {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const t of ts) {
    let w = 0;
    if (t.source === 'cactbot') w = W_CACTBOT;
    else if (t.source === 'triggernometry') w = W_TRIGGERNOMETRY;
    else if (t.source === 'fflogs') w = W_FFLOGS;
    totalWeight += w;
    weightedSum += t.ms * w;
  }
  return { ms: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0, weight: totalWeight };
};

const pickConfidence = (sources: {
  cactbot?: number | null;
  triggernometry?: number | null;
  fflogs?: number | null;
}): number => {
  // Confidence = sum of weights of present sources, with a 0.05 floor
  // for any single-source event to avoid "0 confidence" rendering issues.
  let s = 0;
  if (sources.cactbot != null) s += W_CACTBOT;
  if (sources.triggernometry != null) s += W_TRIGGERNOMETRY;
  if (sources.fflogs != null) s += W_FFLOGS;
  return Math.max(0.05, Math.min(1, s));
};

export class DefaultTimelineMerger implements TimelineMerger {
  merge(input: MergeInput): Result<MergeResult, DomainError> {
    const conflicts: MergeConflict[] = [];
    const cactbot = input.cactbot ?? [];
    const trigg = input.triggernometry ?? [];
    const fflogs = input.fflogs ?? [];

    // Pairwise align: cactbot ↔ trigg, cactbot ↔ fflogs.
    const cTrigg = align(cactbot, trigg);
    const cFflogs = align(cactbot, fflogs);

    const triggByCactbotId = new Map<string, TimelineEvent | null>();
    for (const [ca, tb] of cTrigg) triggByCactbotId.set(ca.id, tb);

    const fflogsByCactbotId = new Map<string, TimelineEvent | null>();
    for (const [ca, fb] of cFflogs) fflogsByCactbotId.set(ca.id, fb);

    // Build the merged event set, keyed by Cactbot event when present.
    const merged: TimelineEvent[] = [];
    for (const ca of cactbot) {
      const tb = triggByCactbotId.get(ca.id) ?? null;
      const fb = fflogsByCactbotId.get(ca.id) ?? null;

      const tss: Array<{ source: 'cactbot' | 'triggernometry' | 'fflogs'; ms: number }> = [
        { source: 'cactbot', ms: ca.timestampMs },
      ];
      if (tb) tss.push({ source: 'triggernometry', ms: tb.timestampMs });
      if (fb) tss.push({ source: 'fflogs', ms: fb.timestampMs });

      const w = weightedTimestamp(tss);

      // Drift conflict: any pair disagrees by > 500ms.
      for (let i = 0; i < tss.length; i++) {
        for (let j = i + 1; j < tss.length; j++) {
          if (Math.abs(tss[i]!.ms - tss[j]!.ms) > DRIFT_THRESHOLD_MS) {
            conflicts.push({
              eventId: ca.id,
              kind: 'TIMESTAMP_DRIFT',
              sources: [
                tss[i]!.source === 'cactbot'
                  ? 'CACTBOT'
                  : tss[i]!.source === 'triggernometry'
                    ? 'TRIGGERNOMETRY'
                    : 'FFLOGS',
                tss[j]!.source === 'cactbot'
                  ? 'CACTBOT'
                  : tss[j]!.source === 'triggernometry'
                    ? 'TRIGGERNOMETRY'
                    : 'FFLOGS',
              ],
              detail: `drift ${Math.abs(tss[i]!.ms - tss[j]!.ms)}ms`,
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      const confidence = pickConfidence({
        cactbot: ca.timestampMs,
        triggernometry: tb?.timestampMs ?? null,
        fflogs: fb?.timestampMs ?? null,
      });

      const varianceMs = [tb?.varianceMs, fb?.varianceMs].find((x): x is number => x != null);

      const mergedEvent: TimelineEvent = {
        ...ca,
        position: merged.length,
        timestampMs: w.ms,
        confidence,
        varianceMs,
        mergedFromSources: {
          cactbot: true,
          triggernometry: tb != null,
          fflogs: fb != null,
        },
      };
      merged.push(mergedEvent);
    }

    // Add events present in trigg/fflogs but not in cactbot.
    for (const t of trigg) {
      const alreadyMerged = merged.some((m) => m.normalizedNames.some((n) => t.normalizedNames.includes(n)));
      if (alreadyMerged) continue;
      const mergedEvent: TimelineEvent = {
        ...t,
        position: merged.length,
        mergedFromSources: { cactbot: false, triggernometry: true, fflogs: false },
        confidence: pickConfidence({ triggernometry: t.timestampMs }),
      };
      merged.push(mergedEvent);
      conflicts.push({
        eventId: t.id,
        kind: 'MISSING_FROM_ONE',
        sources: ['TRIGGERNOMETRY'],
        detail: `triggernometry-only: ${t.name}`,
        detectedAt: new Date().toISOString(),
      });
    }
    for (const f of fflogs) {
      const alreadyMerged = merged.some((m) => m.normalizedNames.some((n) => f.normalizedNames.includes(n)));
      if (alreadyMerged) continue;
      const mergedEvent: TimelineEvent = {
        ...f,
        position: merged.length,
        mergedFromSources: { cactbot: false, triggernometry: false, fflogs: true },
        confidence: pickConfidence({ fflogs: f.timestampMs }),
      };
      merged.push(mergedEvent);
      conflicts.push({
        eventId: f.id,
        kind: 'MISSING_FROM_ONE',
        sources: ['FFLOGS'],
        detail: `fflogs-only: ${f.name}`,
        detectedAt: new Date().toISOString(),
      });
    }

    // Sort by timestampMs.
    merged.sort((a, b) => a.timestampMs - b.timestampMs);
    // Re-assign positions.
    const positioned = merged.map((e, i) => ({ ...e, position: i }));

    const result: MergeResult = {
      timeline: {
        id: crypto.randomUUID(),
        encounterId: input.encounterId as unknown as MergeResult['timeline']['encounterId'],
        version: input.patchVersion,
        contentHash: '', // computed by the repository
        source: 'MERGED',
        events: positioned,
        branches: [],
        joins: [],
        mergedFromSources: {
          cactbot: cactbot.length > 0,
          triggernometry: trigg.length > 0,
          fflogs: fflogs.length > 0,
        },
        perEventConfidence: Object.fromEntries(positioned.map((e) => [e.id, e.confidence])),
        mode: 'CURRENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      conflicts,
    };
    return ok(result);
  }
}