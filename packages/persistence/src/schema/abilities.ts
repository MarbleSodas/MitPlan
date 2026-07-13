import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { jobs } from './jobs.js';
import { abilityModeEnum } from './enums.js';

/**
 * Abilities. Architecture §17.1, §19.2.
 * The `(jobId, abilityId, mode)` composite key is the v1.0-ready
 * schema: one row per mode per ability.
 */
export const abilities = pgTable(
  'abilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    abilityId: text('ability_id').notNull(),
    mode: abilityModeEnum('mode').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    effectPct: integer('effect_pct'),
    recastS: integer('recast_s'),
    rangeM: integer('range_m'),
    durationS: integer('duration_s'),
    isInvuln: boolean('is_invuln').notNull().default(false),
    isHeal: boolean('is_heal').notNull().default(false),
    isShield: boolean('is_shield').notNull().default(false),
    effectiveFrom: text('effective_from').notNull(),
    effectiveTo: text('effective_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    jobModeIdx: index('abilities_job_mode_idx').on(t.jobId, t.mode),
    compositeKey: uniqueIndex('abilities_job_ability_mode_idx').on(t.jobId, t.abilityId, t.mode),
  }),
);
export type AbilityRow = typeof abilities.$inferSelect;
export type AbilityInsert = typeof abilities.$inferInsert;
