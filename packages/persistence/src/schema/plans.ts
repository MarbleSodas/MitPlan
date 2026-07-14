import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { encounters } from './encounters.js';
import { timelines } from './timelines.js';
import { abilityModeEnum } from './enums.js';

/**
 * Plan metadata. Architecture §17.3.
 * The plan's live state (assignments, tank states) lives in the Yjs
 * doc, snapshotted to `plan_snapshots` and `ydoc_snapshots`.
 */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    name: text('name').notNull(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id),
    partyId: uuid('party_id'),
    mode: abilityModeEnum('mode').notNull().default('CURRENT'),
    isLegacy: boolean('is_legacy').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Per-event assignment conflicts surfaced by the validator. */
    conflicts: jsonb('conflicts').$type<unknown[]>().default([]),
    /** Canonical timeline provenance — the source timeline this plan is pinned to. */
    sourceTimelineId: uuid('source_timeline_id').references(() => timelines.id, {
      onDelete: 'set null',
    }),
    sourceTimelineVersion: text('source_timeline_version'),
    sourceTimelineHash: text('source_timeline_hash'),
  },
  (t) => ({
    ownerIdx: index('plans_owner_idx').on(t.ownerId),
    encounterIdx: index('plans_encounter_idx').on(t.encounterId),
    updatedIdx: index('plans_updated_idx').on(t.updatedAt),
  }),
);
export type PlanRow = typeof plans.$inferSelect;
export type PlanInsert = typeof plans.$inferInsert;
