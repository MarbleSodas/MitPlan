/**
 * FFLogs GraphQL parser. Architecture §12.2, Appendix B.3.
 * The parser reads boss NPC `begincast` events across all pulls in a
 * report, computes the median timestamp per ability, and outputs
 * `confidence: 0.7` with `varianceMs: <spread>`.
 *
 * The FFLogs OAuth request is made by the orchestrator; the parser
 * consumes the response and shapes it into TimelineEvent[].
 */
import { ok, err } from '@xivmitplan/shared/result';
import type { Result } from '@xivmitplan/shared/result';
import { FFLogsReport } from '@xivmitplan/validation/fflogs';
import { TimelineEvent } from '@xivmitplan/validation/timeline';
import type { DomainError } from '../errors/index.js';
import type { ParseOptions, RawTimeline, TimelineParser } from '../ports/index.js';

/** Median helper for the per-ability timestamp. */
const median = (xs: ReadonlyArray<number>): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
};

/** Standard deviation as a proxy for `varianceMs`. */
const stdev = (xs: ReadonlyArray<number>): number => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.round(Math.sqrt(v));
};

/**
 * Normalize FFLogs events into TimelineEvent[].
 * One event per `ability.gameID` (across all pulls), with the median
 * `beginCast.timestamp` and a `varianceMs` from the spread.
 */
export const normalizeFFLogs = (
  report: FFLogsReport,
  options: ParseOptions,
): TimelineEvent[] => {
  // Group by ability.gameID, collect all beginCast timestamps.
  const groups = new Map<number, { name: string; timestamps: number[] }>();
  for (const ev of report.events.data) {
    const c = ev.beginCast;
    if (!c) continue;
    const key = c.ability.gameID;
    const g = groups.get(key) ?? { name: c.ability.name, timestamps: [] };
    g.timestamps.push(c.timestamp);
    groups.set(key, g);
  }

  const events: TimelineEvent[] = [];
  for (const [gameId, g] of groups) {
    const id = crypto.randomUUID();
    const timestampMs = median(g.timestamps);
    const varianceMs = stdev(g.timestamps);
    const event = TimelineEvent.safeParse({
      id,
      position: events.length,
      timestampMs,
      type: 'MECHANIC',
      name: g.name,
      normalizedNames: [g.name.toLowerCase().replace(/\s+/g, ' ').trim()],
      durationMs: null,
      hitTimesMs: [timestampMs],
      targets: { kind: 'PARTY' },
      mechanicId: String(gameId),
      patchVersion: options.patchVersion,
      confidence: 0.7,
      varianceMs,
      mergedFromSources: { cactbot: false, triggernometry: false, fflogs: true },
      notes: null,
    });
    if (event.success) events.push(event.data);
  }
  return events;
};

/** Fetch the FFLogs report (the orchestrator calls this; the parser consumes the result). */
export const fetchFFLogsReport = async (
  reportCode: string,
  oauthToken: string,
  bossSourceId: number,
): Promise<Result<FFLogsReport, DomainError>> => {
  // The real implementation calls the GraphQL endpoint with the
  // `reportData { report { code, events(nextPageTimestamp: $cursor) { data, nextPageTimestamp } } }`
  // query and pages until `nextPageTimestamp` is null. This is a stub
  // for Phase 0; the production call lives in
  // `apps/server/src/services/fflogs-client.ts` (Phase 1+).
  //
  // For now, the orchestrator can call this with a recorded fixture
  // in the integration tests.
  try {
    const response = await fetch('https://www.fflogs.com/api/v2/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oauthToken}`,
      },
      body: JSON.stringify({
        query: `query($code: String!, $cursor: Number) {
          reportData { report(code: $code) {
            code
            events(dataType: BeginCasts, sourceID: ${bossSourceId}, cursor: $cursor, limit: 10000) {
              data
              nextPageTimestamp
            }
          } }
        }`,
        variables: { code: reportCode, cursor: null },
      }),
    });
    if (!response.ok) {
      return err({
        kind: 'PARSER',
        source: 'FFLOGS',
        message: `FFLogs HTTP ${response.status}`,
      });
    }
    const json = (await response.json()) as { data?: unknown; errors?: unknown };
    if (!json.data) {
      return err({
        kind: 'PARSER',
        source: 'FFLOGS',
        message: 'FFLogs returned no data',
        cause: json.errors,
      });
    }
    // The shape returned by FFLogs is unwrapped from the GraphQL envelope.
    const report = (json.data as { reportData: { report: unknown } }).reportData.report;
    const parsed = FFLogsReport.safeParse(report);
    if (!parsed.success) {
      return err({
        kind: 'PARSER',
        source: 'FFLOGS',
        message: 'FFLogs response shape mismatch',
        cause: parsed.error,
      });
    }
    return ok(parsed.data);
  } catch (cause) {
    return err({ kind: 'PARSER', source: 'FFLOGS', message: 'FFLogs fetch failed', cause });
  }
};

export class FFLogsTimelineParser implements TimelineParser {
  readonly source = 'FFLOGS' as const;

  async parse(raw: RawTimeline, options: ParseOptions): Promise<Result<ReadonlyArray<TimelineEvent>, DomainError>> {
    if (raw.kind !== 'FFLOGS') {
      return err({ kind: 'PARSER', source: 'FFLOGS', message: 'Wrong source kind' });
    }
    const fetched = await fetchFFLogsReport(raw.reportCode, raw.oauthToken, raw.bossSourceId);
    if (!fetched.ok) return fetched;
    try {
      return ok(normalizeFFLogs(fetched.value, { ...options, encounterId: raw.encounterId }));
    } catch (cause) {
      return err({ kind: 'PARSER', source: 'FFLOGS', message: 'FFLogs normalize failed', cause });
    }
  }
}
