import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { raids } from './raids.js';

/** A boss encounter. Architecture §17.1, §19.2. */
export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raidId: uuid('raid_id')
      .notNull()
      .references(() => raids.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    patchVersion: text('patch_version').notNull(),
    bossNpcSourceId: integer('boss_npc_source_id'),
    effectiveFrom: text('effective_from').notNull(),
    effectiveTo: text('effective_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    raidIdx: index('encounters_raid_idx').on(t.raidId),
    patchIdx: index('encounters_patch_idx').on(t.patchVersion),
  }),
);
export type EncounterRow = typeof encounters.$inferSelect;
export type EncounterInsert = typeof encounters.$inferInsert;
