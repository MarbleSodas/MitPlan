import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { expansions } from './expansions.js';

/** A raid tier (FRU, M1S-M4S, ...). Architecture §17.1. */
export const raids = pgTable(
  'raids',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expansionId: uuid('expansion_id')
      .notNull()
      .references(() => expansions.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    patchVersion: text('patch_version').notNull(),
    tier: integer('tier').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    expansionIdx: index('raids_expansion_idx').on(t.expansionId),
  }),
);
export type RaidRow = typeof raids.$inferSelect;
export type RaidInsert = typeof raids.$inferInsert;
