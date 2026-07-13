import { pgTable, uuid, text, primaryKey, index } from 'drizzle-orm/pg-core';
import { abilities } from './abilities.js';

/**
 * Cross-mode equivalence. Architecture §19.2.
 * Maps a (src_ability, dst_ability) pair to a relation:
 *   EQUIVALENT   — same action in another mode
 *   CONSOLIDATED — src was rolled into dst
 *   REMOVED      — src no longer exists in this mode
 *   ADDED        — dst is new in this mode
 */
export const abilityEquivalence = pgTable(
  'ability_equivalence',
  {
    srcAbilityId: uuid('src_ability_id')
      .notNull()
      .references(() => abilities.id, { onDelete: 'cascade' }),
    dstAbilityId: uuid('dst_ability_id')
      .notNull()
      .references(() => abilities.id, { onDelete: 'cascade' }),
    relation: text('relation', {
      enum: ['EQUIVALENT', 'CONSOLIDATED', 'REMOVED', 'ADDED'],
    }).notNull(),
    note: text('note'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.srcAbilityId, t.dstAbilityId] }),
    srcIdx: index('ability_equivalence_src_idx').on(t.srcAbilityId),
  }),
);
export type AbilityEquivalenceRow = typeof abilityEquivalence.$inferSelect;
export type AbilityEquivalenceInsert = typeof abilityEquivalence.$inferInsert;
