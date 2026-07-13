/**
 * Cactbot timeline parser. Architecture §12.2, Appendix B.1.
 * Cactbot's format is line-based, e.g.:
 *   0.0 "--sync--" sync "/NameOfTheEnemy appears!/"
 *   10.0 "Brutal Rain" sync / 1[56]:Brutal Rain:/ window 10,10
 *   30.0 "Brutal Rain" duration 3
 *
 * Each line is parsed into a `CactbotLine` (see @xivmitplan/validation/cactbot)
 * and then normalized to the canonical `TimelineEvent` shape.
 */
import { ok, err } from '@xivmitplan/shared/result';
import type { Result } from '@xivmitplan/shared/result';
import { CactbotLine } from '@xivmitplan/validation/cactbot';
import { TimelineEvent } from '@xivmitplan/validation/timeline';
import type { DomainError } from '../errors/index.js';
import type { ParseOptions, RawTimeline, TimelineParser } from '../ports/index.js';

/** Parse the raw cactbot text into CactbotLine[]. */
export const parseCactbotRaw = (raw: string): CactbotLine[] => {
  const lines: CactbotLine[] = [];
  const text = raw.replace(/\r\n?/g, '\n');
  let inHeader = true;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;
    if (inHeader) {
      if (line.startsWith('#') || line.startsWith('### ')) {
        // Header line. Skip; the orchestrator may consume them separately.
        continue;
      }
      if (line.startsWith('hideall') || line.startsWith('hide')) {
        continue;
      }
      inHeader = false;
    }
    const parsed = parseCactbotLine(line);
    if (parsed) lines.push(parsed);
  }
  return lines;
};

const TIME_RE = /^(\d+(?:\.\d+)?)\s+/;
const QUOTED_RE = /"([^"]*)"/;
const SYNC_RE = /\bsync\s+\/(.+)\/\s*(?:window\s+(\d+)\s*,\s*(\d+))?/;
const DURATION_RE = /\bduration\s+(\d+(?:\.\d+)?)/;

const parseCactbotLine = (line: string): CactbotLine | null => {
  const t = TIME_RE.exec(line);
  if (!t) return null;
  const timestampMs = Math.round(parseFloat(t[1]!) * 1000);
  const rest = line.slice(t[0].length);
  const nameMatch = QUOTED_RE.exec(rest);
  const name = nameMatch?.[1] ?? null;
  const syncMatch = SYNC_RE.exec(rest);
  const sync = syncMatch?.[1] ?? null;
  const window =
    syncMatch?.[2] && syncMatch?.[3]
      ? ([parseInt(syncMatch[2], 10), parseInt(syncMatch[3], 10)] as [number, number])
      : null;
  const durMatch = DURATION_RE.exec(rest);
  const duration = durMatch ? parseFloat(durMatch[1]!) : null;
  const parsed = CactbotLine.safeParse({
    timestampMs,
    name,
    sync,
    window,
    duration,
    sourceId: null,
  });
  return parsed.success ? parsed.data : null;
};

/** Normalize CactbotLine[] into TimelineEvent[]. */
export const normalizeCactbot = (
  lines: ReadonlyArray<CactbotLine>,
  options: ParseOptions,
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  for (const line of lines) {
    if (line.name == null || line.name.startsWith('--')) continue; // skip sync markers
    const id = crypto.randomUUID();
    const event = TimelineEvent.safeParse({
      id,
      position: events.length,
      timestampMs: line.timestampMs,
      type: inferType(line.name),
      name: line.name,
      normalizedNames: [line.name.toLowerCase().replace(/\s+/g, ' ').trim()],
      durationMs: line.duration != null ? Math.round(line.duration * 1000) : null,
      hitTimesMs: [line.timestampMs],
      targets: { kind: 'PARTY' },
      mechanicId: null,
      patchVersion: options.patchVersion,
      // Cactbot is the most-trusted source. Confidence is 0.9 by default;
      // the merger may upgrade to 0.95 if all three sources agree.
      confidence: 0.9,
      mergedFromSources: { cactbot: true, triggernometry: false, fflogs: false },
      notes: null,
    });
    if (event.success) events.push(event.data);
  }
  return events;
};

const inferType = (name: string): TimelineEvent['type'] => {
  const lower = name.toLowerCase();
  if (lower.includes('raidwide') || lower.includes('enrage')) return 'RAIDWIDE';
  if (lower.includes('buster') || lower.includes('tank')) return 'BUSTER';
  return 'MECHANIC';
};

export class CactbotTimelineParser implements TimelineParser {
  readonly source = 'CACTBOT' as const;

  async parse(raw: RawTimeline, options: ParseOptions): Promise<Result<ReadonlyArray<TimelineEvent>, DomainError>> {
    if (raw.kind !== 'CACTBOT') {
      return err({ kind: 'PARSER', source: 'CACTBOT', message: 'Wrong source kind' });
    }
    try {
      const lines = parseCactbotRaw(raw.raw);
      const events = normalizeCactbot(lines, { ...options, encounterId: raw.encounterId });
      return ok(events);
    } catch (cause) {
      return err({ kind: 'PARSER', source: 'CACTBOT', message: 'Cactbot parse failed', cause });
    }
  }
}
