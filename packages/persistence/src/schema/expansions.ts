import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/** Game expansion (Dawntrail, Evercold, ...). Architecture §17.1. */
export const expansions = pgTable('expansions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  releasePatch: text('release_patch').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export type ExpansionRow = typeof expansions.$inferSelect;
export type ExpansionInsert = typeof expansions.$inferInsert;
