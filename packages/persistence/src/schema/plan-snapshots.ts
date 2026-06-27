import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { plans } from './plans.js';
import { snapshotReasonEnum } from './enums.js';

/** Plan snapshot. Architecture §17.3. */
export const planSnapshots = pgTable(
  'plan_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    ydocB64: text('ydoc_b64').notNull(),
    byteSize: integer('byte_size').notNull(),
    reason: snapshotReasonEnum('reason').notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    planIdx: index('plan_snapshots_plan_idx').on(t.planId),
    createdAtIdx: index('plan_snapshots_created_at_idx').on(t.createdAt),
  }),
);
export type PlanSnapshotRow = typeof planSnapshots.$inferSelect;
export type PlanSnapshotInsert = typeof planSnapshots.$inferInsert;
