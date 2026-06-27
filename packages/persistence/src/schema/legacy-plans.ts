import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

/**
 * MitPlan v1 plan captured during the dual-write window
 * (architecture §17.7.1, §22.7).
 */
export const legacyLocalPlans = pgTable(
  'legacy_local_plans',
  {
    id: uuid('id').primaryKey(),
    ownerDiscordId: text('owner_discord_id'),
    ownerEmail: text('owner_email'),
    payload: jsonb('payload').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
    claimedBy: uuid('claimed_by'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    /** Generated column: 90 days after `captured_at`. */
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .generatedAlwaysAs(sql`captured_at + interval '90 days'`)
      .notNull(),
  },
  (t) => ({
    discordIdx: index('legacy_plans_discord_idx')
      .on(t.ownerDiscordId)
      .where(sql`claimed_by IS NULL`),
    emailIdx: index('legacy_plans_email_idx')
      .on(t.ownerEmail)
      .where(sql`claimed_by IS NULL`),
    expiresIdx: index('legacy_plans_expires_idx')
      .on(t.expiresAt)
      .where(sql`claimed_by IS NULL`),
  }),
);
export type LegacyLocalPlanRow = typeof legacyLocalPlans.$inferSelect;
export type LegacyLocalPlanInsert = typeof legacyLocalPlans.$inferInsert;

import { sql } from 'drizzle-orm';
