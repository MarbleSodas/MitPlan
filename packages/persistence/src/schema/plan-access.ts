import { pgTable, uuid, timestamp, boolean, index, primaryKey } from 'drizzle-orm/pg-core';
import { plans } from './plans.js';
import { planAccessRoleEnum } from './enums.js';

/** Plan access grant. Architecture §17.3. */
export const planAccess = pgTable(
  'plan_access',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: planAccessRoleEnum('role').notNull(),
    viaShareToken: boolean('via_share_token').notNull().default(false),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.planId, t.userId] }),
    userIdx: index('plan_access_user_idx').on(t.userId),
  }),
);
export type PlanAccessRow = typeof planAccess.$inferSelect;
export type PlanAccessInsert = typeof planAccess.$inferInsert;
