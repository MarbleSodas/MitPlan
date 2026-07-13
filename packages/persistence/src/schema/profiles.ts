import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * User profile. Architecture §17.5.
 * A 1:1 mirror of `auth.users(id)`. The auth.identities table is the
 * authoritative source for which providers map to which user; the
 * columns here are denormalized caches for fast RLS + migration lookups.
 *
 * IMPORTANT: this table is created in the `public` schema. Supabase
 * manages `auth.users` and `auth.identities` separately.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(), // references auth.users(id); we do not declare the FK because Supabase's auth schema is in a different namespace and the FK would fail to resolve in the migration
    displayName: text('display_name').notNull(),
    discordId: text('discord_id'),
    googleId: text('google_id'),
    email: text('email'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    mitplanV1ClaimDone: boolean('mitplan_v1_claim_done').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    discordIdx: index('profiles_discord_idx').on(t.discordId).where(sql`t.discord_id IS NOT NULL`),
    googleIdx: index('profiles_google_idx').on(t.googleId).where(sql`t.google_id IS NOT NULL`),
    emailIdx: index('profiles_email_idx').on(t.email).where(sql`t.email IS NOT NULL`),
  }),
);

// Drizzle's `where` requires a `sql` import; importing here to keep the
// schema file self-contained.
import { sql } from 'drizzle-orm';

export type ProfileRow = typeof profiles.$inferSelect;
export type ProfileInsert = typeof profiles.$inferInsert;
