import { z } from 'zod';

/**
 * Cactbot timeline raw input. The full grammar is in Appendix B.1.
 * This is the parsed representation after the Cactbot line-parser runs
 * and before the domain parser normalizes to TimelineEvent.
 *
 * See architecture §12.2 (Stage 2: Parsing).
 */
export const CactbotLine = z.object({
  /** Milliseconds from t=0. */
  timestampMs: z.number().int().nonnegative(),
  /** Action text in quotes, e.g. "Brutal Rain". */
  name: z.string().nullable(),
  /** Sync regex (e.g. for `sync /regex/`). */
  sync: z.string().nullable(),
  /** Window arguments for the sync. */
  window: z.tuple([z.number().int(), z.number().int()]).nullable(),
  /** Duration in seconds. */
  duration: z.number().int().nonnegative().nullable(),
  /** Source ID hint (numeric, from the cactbot header). */
  sourceId: z.number().int().nullable(),
});
export type CactbotLine = z.infer<typeof CactbotLine>;

export const CactbotRawTimeline = z.object({
  /** Encounter ID we are claiming this timeline for. Validated server-side. */
  encounterId: z.string().uuid(),
  /** Original .txt content (kept for audit + idempotency). */
  raw: z.string().min(1),
  /** Cactbot header lines. */
  header: z.array(z.string()),
  /** Parsed lines. The parser must succeed or reject the whole file. */
  lines: z.array(CactbotLine),
  /** Patch version (e.g. "7.20"). */
  patchVersion: z.string(),
});
export type CactbotRawTimeline = z.infer<typeof CactbotRawTimeline>;

export const CactbotIngestRequest = z.object({
  /** Either a URL to the cactbot raw GitHub file, or a posted body. */
  url: z.string().url().optional(),
  encounterId: z.string().uuid(),
  /** Inline raw content (alternative to URL). */
  raw: z.string().min(1).optional(),
});
export type CactbotIngestRequest = z.infer<typeof CactbotIngestRequest>;
