import { z } from 'zod';

/**
 * Ability mode. The 8.0 modes plus a CURRENT fallback for 7.x.
 * See architecture §19.2 — `(jobId, abilityId, mode)` is a first-class
 * composite key in v1.0.
 */
export const AbilityMode = z.enum(['REBORN', 'EVOLVED', 'CURRENT', 'ALL']);
export type AbilityMode = z.infer<typeof AbilityMode>;

/** Job role (tank, healer, melee, ranged, caster — FFXIV's 5 roles). */
export const Role = z.enum(['TANK', 'HEALER', 'MELEE', 'RANGED', 'CASTER']);
export type Role = z.infer<typeof Role>;

/** Single ability row, shape mirrors `abilities` table. */
export const Ability = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  abilityId: z.string(),
  mode: AbilityMode,
  name: z.string().min(1).max(128),
  description: z.string().nullable(),
  /** 0-100, the multiplicative mit percentage. */
  effectPct: z.number().min(0).max(100).nullable(),
  /** Recast in seconds. */
  recastS: z.number().min(0).nullable(),
  /** Range in meters (yalms). */
  rangeM: z.number().min(0).nullable(),
  /** Duration in seconds. */
  durationS: z.number().min(0).nullable(),
  /** True if this ability is a tank invuln. */
  isInvuln: z.boolean(),
  /** True if this ability is a heal. */
  isHeal: z.boolean(),
  /** True if this ability is a shield. */
  isShield: z.boolean(),
  /** Effective from patch version (e.g., "7.0", "7.20", "8.0"). */
  effectiveFrom: z.string(),
  /** Effective to patch version. null = currently effective. */
  effectiveTo: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Ability = z.infer<typeof Ability>;

/** Ability cross-mode equivalence (§19.2). */
export const AbilityEquivalenceRelation = z.enum([
  'EQUIVALENT',
  'CONSOLIDATED',
  'REMOVED',
  'ADDED',
]);
export type AbilityEquivalenceRelation = z.infer<typeof AbilityEquivalenceRelation>;

export const AbilityEquivalence = z.object({
  srcAbilityId: z.string().uuid(),
  dstAbilityId: z.string().uuid(),
  relation: AbilityEquivalenceRelation,
  note: z.string().nullable(),
});
export type AbilityEquivalence = z.infer<typeof AbilityEquivalence>;

/** Reference catalog query (§18.2). */
export const AbilityCatalogQuery = z.object({
  jobId: z.string().uuid().optional(),
  mode: AbilityMode.optional(),
  /** Free-text search on `name`. */
  q: z.string().optional(),
  /** Page size (1-200, default 50). */
  limit: z.number().int().min(1).max(200).default(50),
  /** Offset for pagination. */
  offset: z.number().int().min(0).default(0),
});
export type AbilityCatalogQuery = z.infer<typeof AbilityCatalogQuery>;
