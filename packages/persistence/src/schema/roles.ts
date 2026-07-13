import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums.js';

/** FFXIV role. Architecture §17.1. */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: roleEnum('name').notNull().unique(),
  abbreviation: text('abbreviation').notNull(),
});
export type RoleRow = typeof roles.$inferSelect;
export type RoleInsert = typeof roles.$inferInsert;
