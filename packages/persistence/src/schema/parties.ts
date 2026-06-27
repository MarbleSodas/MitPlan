import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/** Party (the 8-player composition a plan is for). Architecture §17. */
export const parties = pgTable(
  'parties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    name: text('name').notNull(),
    /** 8 player IDs, indexed by slot (0=MT, 1=OT, ...). */
    slotUserIds: jsonb('slot_user_ids').$type<(string | null)[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index('parties_owner_idx').on(t.ownerId),
  }),
);
export type PartyRow = typeof parties.$inferSelect;
export type PartyInsert = typeof parties.$inferInsert;
