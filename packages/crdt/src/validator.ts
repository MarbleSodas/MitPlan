/**
 * PlanDoc validator. Used by the §20.3 stress-test suite to verify
 * that a Y.Doc that was concurrently edited by 4-16 clients still
 * conforms to the Zod schemas for the plan structure.
 */
import { z } from 'zod';
import {
  PlanMeta,
  Assignment,
  TankState,
  PlanTimelineAction,
  PlanPartyState,
  TimelineSettings,
} from '@xivmitplan/validation/plan';
import type { PlanDoc } from './schema.js';

export const PlanSnapshotShape = z.object({
  meta: z.record(z.string(), z.unknown()).refine(
    (m) => {
      const r = PlanMeta.safeParse({
        ...m,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      });
      return r.success;
    },
    { message: 'meta must conform to PlanMeta' },
  ),
  events: z.array(z.unknown()),
  assignments: z.record(z.string(), z.unknown()).refine(
    (a) => {
      for (const v of Object.values(a)) {
        const r = Assignment.safeParse(v);
        if (!r.success) return false;
      }
      return true;
    },
    { message: 'every assignment must conform to Assignment' },
  ),
  tankStates: z.array(z.unknown()).refine(
    (ts) => {
      for (const v of ts) {
        const r = TankState.safeParse(v);
        if (!r.success) return false;
      }
      return true;
    },
    { message: 'every tank state must conform to TankState' },
  ),
  locks: z.record(z.string(), z.string()),
  timelineActions: z.array(z.unknown()).refine(
    (ta) => {
      for (const v of ta) {
        const r = PlanTimelineAction.safeParse(v);
        if (!r.success) return false;
      }
      return true;
    },
    { message: 'every timeline action must conform to PlanTimelineAction' },
  ),
  party: z.record(z.string(), z.unknown()).refine(
    (p) => {
      const r = PlanPartyState.safeParse(p);
      return r.success;
    },
    { message: 'party must conform to PlanPartyState' },
  ),
  timelineSettings: z.record(z.string(), z.unknown()).refine(
    (ts) => {
      const r = TimelineSettings.safeParse(ts);
      return r.success;
    },
    { message: 'timelineSettings must conform to TimelineSettings' },
  ),
});
export type PlanSnapshotShape = z.infer<typeof PlanSnapshotShape>;

/**
 * Validate a PlanDoc against the Zod schemas. Returns the list of
 * violations; an empty list means the doc is valid.
 */
export const validatePlanDoc = (doc: PlanDoc): ReadonlyArray<string> => {
  const json = doc.toJSON();
  const result = PlanSnapshotShape.safeParse(json);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};
