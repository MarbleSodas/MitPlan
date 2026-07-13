import { pgTable, uuid, customType, integer, timestamp } from 'drizzle-orm/pg-core';
import { plans } from './plans.js';

/**
 * Hocuspocus persistence target (architecture §14.6.2, §17.7.2).
 * The DO is the hot in-memory layer; this table is the source of
 * truth that the DO reloads on cold start.
 */
const bytea = customType<{ data: Uint8Array; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const ydocSnapshots = pgTable('ydoc_snapshots', {
  planId: uuid('plan_id')
    .primaryKey()
    .references(() => plans.id, { onDelete: 'cascade' }),
  update: bytea('update').notNull(),
  byteSize: integer('byte_size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export type YDocSnapshotRow = typeof ydocSnapshots.$inferSelect;
export type YDocSnapshotInsert = typeof ydocSnapshots.$inferInsert;
