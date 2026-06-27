import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { encounters } from './encounters.js';
import { timelineSourceEnum, abilityModeEnum } from './enums.js';

/** A canonical timeline (architecture §12.4, §17.2). */
export const timelines = pgTable(
  'timelines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    contentHash: text('content_hash').notNull(),
    source: timelineSourceEnum('source').notNull(),
    mode: abilityModeEnum('mode').notNull().default('CURRENT'),
    /** Per-event array; shape conforms to TimelineEvent[] in @xivmitplan/validation/timeline. */
    events: jsonb('events').$type<unknown[]>().notNull(),
    branches: jsonb('branches').$type<unknown[]>().notNull().default([]),
    joins: jsonb('joins').$type<unknown[]>().notNull().default([]),
    mergedFromSources: jsonb('merged_from_sources')
      .$type<{ cactbot: boolean; triggernometry: boolean; fflogs: boolean }>()
      .notNull()
      .default({ cactbot: false, triggernometry: false, fflogs: false }),
    perEventConfidence: jsonb('per_event_confidence').$type<Record<string, number>>(),
    byteSize: integer('byte_size').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    encounterVersionIdx: uniqueIndex('timelines_encounter_version_idx').on(
      t.encounterId,
      t.version,
      t.source,
    ),
    updatedIdx: index('timelines_updated_idx').on(t.updatedAt),
  }),
);
export type TimelineRow = typeof timelines.$inferSelect;
export type TimelineInsert = typeof timelines.$inferInsert;
