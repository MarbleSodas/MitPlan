/**
 * Triggernometry XML parser. Architecture §12.2, Appendix B.2.
 * Triggernometry is event-driven, not time-anchored — the parser
 * infers `timestampMs` from the typical timing of the boss action in
 * the encounter. Output `confidence` is 0.6 (research report key finding).
 */
import { ok, err } from '@xivmitplan/shared/result';
import type { Result } from '@xivmitplan/shared/result';
import {
  TriggernometryExport,
  type TriggernometryTrigger,
} from '@xivmitplan/validation/triggernometry';
import { TimelineEvent } from '@xivmitplan/validation/timeline';
import type { DomainError } from '../errors/index.js';
import type { ParseOptions, RawTimeline, TimelineParser } from '../ports/index.js';

const matchTag = (xml: string, tag: string): string | null => {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m?.[1]?.trim() ?? null;
};

/**
 * Parse the Triggernometry XML. We do not import an XML library to keep
 * the parser's surface narrow; Triggernometry's export is a flat root
 * with a list of triggers. A DOMParser (or `xmldom` in Node) is the
 * upstream concern; the orchestrator calls `parseTriggernometryXml`
 * with the parsed `TriggernometryExport` object.
 */
export const parseTriggernometryXml = (xml: string): TriggernometryExport => {
  const triggers: TriggernometryTrigger[] = [];
  const triggerBlocks = xml.match(/<Trigger>[\s\S]*?<\/Trigger>/g) ?? [];
  for (const block of triggerBlocks) {
    const id = matchTag(block, 'Id') ?? '';
    const name = matchTag(block, 'Name') ?? '';
    const categoryName = matchTag(block, 'CategoryName') ?? '';
    const triggerType = parseInt(matchTag(block, 'TriggerType') ?? '0', 10);
    const condition = matchTag(block, 'Condition');
    triggers.push({
      Id: id,
      Name: name,
      CategoryName: categoryName,
      TriggerType: triggerType,
      Condition: condition,
      Actions: [],
    });
  }
  return TriggernometryExport.parse({ Triggers: triggers });
};

/**
 * Infer `timestampMs` from the typical timing of the boss action.
 * The inference source is the encounter's Cactbot timeline.
 */
const inferTimestamp = (
  categoryName: string,
  cactbotEvents: ReadonlyArray<TimelineEvent>,
): number => {
  const match = cactbotEvents.find(
    (e) => e.normalizedNames.includes(categoryName.toLowerCase().replace(/\s+/g, ' ').trim()),
  );
  return match?.timestampMs ?? 60_000;
};

/** Normalize TriggernometryExport into TimelineEvent[]. */
export const normalizeTriggernometry = (
  parsed: TriggernometryExport,
  options: ParseOptions,
  cactbotEvents: ReadonlyArray<TimelineEvent>,
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  for (const t of parsed.Triggers) {
    const id = crypto.randomUUID();
    const name = t.CategoryName || t.Name;
    const timestampMs = inferTimestamp(t.CategoryName, cactbotEvents);
    const event = TimelineEvent.safeParse({
      id,
      position: events.length,
      timestampMs,
      type: 'MECHANIC',
      name,
      normalizedNames: [name.toLowerCase().replace(/\s+/g, ' ').trim()],
      durationMs: null,
      hitTimesMs: [timestampMs],
      targets: { kind: 'PARTY' },
      mechanicId: null,
      patchVersion: options.patchVersion,
      confidence: 0.6,
      varianceMs: 2_000,
      mergedFromSources: { cactbot: false, triggernometry: true, fflogs: false },
      notes: null,
    });
    if (event.success) events.push(event.data);
  }
  return events;
};

export class TriggernometryTimelineParser implements TimelineParser {
  readonly source = 'TRIGGERNOMETRY' as const;

  async parse(
    raw: RawTimeline,
    options: ParseOptions,
    context?: { cactbotEvents?: ReadonlyArray<TimelineEvent> },
  ): Promise<Result<ReadonlyArray<TimelineEvent>, DomainError>> {
    if (raw.kind !== 'TRIGGERNOMETRY') {
      return err({ kind: 'PARSER', source: 'TRIGGERNOMETRY', message: 'Wrong source kind' });
    }
    try {
      const parsed = parseTriggernometryXml(raw.xml);
      const events = normalizeTriggernometry(parsed, options, context?.cactbotEvents ?? []);
      return ok(events);
    } catch (cause) {
      return err({
        kind: 'PARSER',
        source: 'TRIGGERNOMETRY',
        message: 'Triggernometry parse failed',
        cause,
      });
    }
  }
}