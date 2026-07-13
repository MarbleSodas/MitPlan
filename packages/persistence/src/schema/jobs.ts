import { pgTable, uuid, text, boolean, index } from 'drizzle-orm/pg-core';
import { roles } from './roles.js';

/** FFXIV job (PLD, WAR, SCH, AST, ...). Architecture §17.1, §19.1. */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    name: text('name').notNull().unique(),
    abbreviation: text('abbreviation').notNull().unique(),
    evolvedOnly: boolean('evolved_only').notNull().default(false),
    isNew: boolean('is_new').notNull().default(false),
  },
  (t) => ({
    roleIdx: index('jobs_role_idx').on(t.roleId),
  }),
);
export type JobRow = typeof jobs.$inferSelect;
export type JobInsert = typeof jobs.$inferInsert;
