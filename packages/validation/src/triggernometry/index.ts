import { z } from 'zod';

/**
 * Triggernometry export shape. Triggernometry is event-driven, not
 * time-anchored, so the parser infers `timestampMs` at confidence 0.6
 * (architecture §12.2). See Appendix B.2 for the XML example.
 */
export const TriggernometryAction = z.object({
  ActionType: z.number().int(),
  Text: z.string().nullable().optional(),
});
export type TriggernometryAction = z.infer<typeof TriggernometryAction>;

export const TriggernometryTrigger = z.object({
  Id: z.string(),
  Name: z.string(),
  CategoryName: z.string(),
  TriggerType: z.number().int(),
  Condition: z.string().nullable().optional(),
  Actions: z.array(TriggernometryAction).default([]),
});
export type TriggernometryTrigger = z.infer<typeof TriggernometryTrigger>;

export const TriggernometryExport = z.object({
  Triggers: z.array(TriggernometryTrigger),
});
export type TriggernometryExport = z.infer<typeof TriggernometryExport>;

/** Wrapped ingest request with the encounter binding. */
export const TriggernometryIngestRequest = z.object({
  encounterId: z.string().uuid(),
  /** Raw XML of the TriggernometryExport root. */
  xml: z.string().min(1),
  /** Patch version (e.g. "7.20"). */
  patchVersion: z.string(),
});
export type TriggernometryIngestRequest = z.infer<typeof TriggernometryIngestRequest>;
