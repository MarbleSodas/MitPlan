import { z } from 'zod';

/**
 * FFLogs GraphQL response shape. The parser reads the boss NPC's
 * begincast events across all pulls in a report and infers the canonical
 * timing as the median. Per-event `varianceMs` is the spread.
 * See architecture §12.2 and Appendix B.3.
 */
export const FFLogsAbility = z.object({
  gameID: z.number().int().positive(),
  name: z.string(),
  icon: z.string().nullable().optional(),
});
export type FFLogsAbility = z.infer<typeof FFLogsAbility>;

export const FFLogsBeginCast = z.object({
  timestamp: z.number().int().nonnegative(),
  ability: FFLogsAbility,
  sourceID: z.number().int().positive(),
});
export type FFLogsBeginCast = z.infer<typeof FFLogsBeginCast>;

export const FFLogsEndCast = z.object({
  timestamp: z.number().int().nonnegative(),
});
export type FFLogsEndCast = z.infer<typeof FFLogsEndCast>;

export const FFLogsEvent = z.object({
  beginCast: FFLogsBeginCast.nullable(),
  endCast: FFLogsEndCast.nullable(),
});
export type FFLogsEvent = z.infer<typeof FFLogsEvent>;

export const FFLogsReport = z.object({
  code: z.string().min(1),
  events: z.object({
    data: z.array(FFLogsEvent),
    nextPageTimestamp: z.number().int().nullable().optional(),
  }),
});
export type FFLogsReport = z.infer<typeof FFLogsReport>;

export const FFLogsIngestRequest = z.object({
  encounterId: z.string().uuid(),
  reportCode: z.string().min(1),
  /** OAuth bearer token for the FFLogs user. Per-user, not shared. */
  oauthToken: z.string().min(1),
  /** Boss NPC source ID. Determines which events are filtered. */
  bossSourceId: z.number().int().positive(),
});
export type FFLogsIngestRequest = z.infer<typeof FFLogsIngestRequest>;
