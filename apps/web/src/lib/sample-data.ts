/**
 * Seeded test data for the plan editor without a live Supabase + catalog.
 *
 * Phase 0 ran against hardcoded `PLACEHOLDER_ENCOUNTERS` in learn.index; we
 * mirror that pattern with a richer sample so the editor can be exercised
 * end-to-end (create plan, open, add mit, see realtime broadcast) without
 * needing the PostgREST catalog rolled out.
 *
 * Phase 1+ (per README): replace `SAMPLE_PLANS` with `rpc('list_encounters')`
 * + `rpc('list_my_plans')`. Drop `SAMPLE_ABILITIES` once the abilities
 * catalog is loaded from `abilityEquivalence` rows.
 */

import type { PlanMeta } from '@xivmitplan/validation/plan';

// Encounter UUIDs are stable across runs (used as the foreign key by
// the SAMPLE_EVENTS list below). Declared first because SAMPLE_PLANS
// references them in encounterId.
//
// These match the seed migration `0004_xivmitplan_v1_seed.sql` UUIDs
// verbatim, so the demo continues to work without changes when
// Supabase is connected.
export const FRU_P1_ID = '10000000-0000-0000-0000-000000000001';
export const M1S_ID = '10000000-0000-0000-0000-000000000002';
export const M2S_ID = '10000000-0000-0000-0000-000000000003';
export const FRU_P2_ID = '10000000-0000-0000-0000-000000000004';
export const P1S_ID = '10000000-0000-0000-0000-000000000005';
export const P4S_ID = '10000000-0000-0000-0000-000000000006';

export interface SamplePlan {
  id: string;
  meta: Pick<PlanMeta, 'id' | 'name' | 'encounterId' | 'isLegacy'> & {
    encounterName: string;
    raid: string;
  };
  /** ISO timestamp for "updatedAt" display; Phase 2+ pulls from the DB. */
  updatedAt: string;
  partySize: 8 | 16;
}

export const SAMPLE_PLANS: SamplePlan[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    meta: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'FRU P1 — Light Rampant prog',
      encounterId: FRU_P1_ID,
      encounterName: 'Light Rampant',
      raid: 'FRU',
      isLegacy: false,
    },
    updatedAt: '2026-06-28T19:42:11Z',
    partySize: 8,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    meta: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'M1S — Sugar Riot farm',
      encounterId: M1S_ID,
      encounterName: 'Sugar Riot',
      raid: 'M1S',
      isLegacy: false,
    },
    updatedAt: '2026-06-27T11:08:33Z',
    partySize: 8,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    meta: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'M2S — Howling Blade week 1',
      encounterId: M2S_ID,
      encounterName: 'Howling Blade',
      raid: 'M2S',
      isLegacy: false,
    },
    updatedAt: '2026-06-25T22:14:09Z',
    partySize: 8,
  },
];

/**
 * Common FFXIV mitigations across all jobs. A subset of what the catalog
 * table will eventually hold — enough to make the ability picker feel
 * real (grouped by category, searchable, ~25 entries).
 */
export interface SampleAbility {
  id: string;
  name: string;
  jobAbbrev: string;
  category: 'tank-cd' | 'healer-cd' | 'party-mit' | 'invuln' | 'shield';
  recastS: number;
  effectPct: number;
  /** Plain-English description surfaced in the picker tooltip. */
  description: string;
}

export const SAMPLE_ABILITIES: SampleAbility[] = [
  // ----- Tank CDs (single-target, on tank) -----
  {
    id: 'a-tbn',
    name: 'The Blackest Night',
    jobAbbrev: 'DRK',
    category: 'shield',
    recastS: 60,
    effectPct: 50,
    description: 'Single-target 25s shield absorbing 50% of damage taken.',
  },
  {
    id: 'a-hol',
    name: 'Heart of Corundum',
    jobAbbrev: 'GNB',
    category: 'tank-cd',
    recastS: 60,
    effectPct: 15,
    description: 'Single-target mit + catharsis dot on the target.',
  },
  {
    id: 'a-raw',
    name: 'Rampart',
    jobAbbrev: 'PLD',
    category: 'tank-cd',
    recastS: 90,
    effectPct: 20,
    description: 'Job-agnostic 20% mit on yourself, 90s recast.',
  },
  {
    id: 'a-cam',
    name: 'Camouflage',
    jobAbbrev: 'WAR',
    category: 'tank-cd',
    recastS: 90,
    effectPct: 10,
    description: '10% mit + stacks additional when hit repeatedly.',
  },
  // ----- Tank invulns -----
  {
    id: 'a-hallowed',
    name: 'Hallowed Ground',
    jobAbbrev: 'PLD',
    category: 'invuln',
    recastS: 420,
    effectPct: 100,
    description: '10s full invuln on self.',
  },
  {
    id: 'a-living',
    name: 'Living Dead',
    jobAbbrev: 'DRK',
    category: 'invuln',
    recastS: 300,
    effectPct: 100,
    description: '10s invuln with a walking-dead follow-up window.',
  },
  {
    id: 'a-bolide',
    name: 'Superbolide',
    jobAbbrev: 'GNB',
    category: 'invuln',
    recastS: 360,
    effectPct: 100,
    description: '10s full invuln, drops HP to 1.',
  },
  {
    id: 'a-holm',
    name: 'Holmgang',
    jobAbbrev: 'WAR',
    category: 'invuln',
    recastS: 240,
    effectPct: 100,
    description: '4s invuln + lock HP for 6s (no healing in/out).',
  },
  // ----- Healer CDs (single-target, on tank) -----
  {
    id: 'a-benison',
    name: 'Divine Benison',
    jobAbbrev: 'AST',
    category: 'shield',
    recastS: 30,
    effectPct: 0,
    description: 'Quick single-target shield on a party member.',
  },
  {
    id: 'a-celestial',
    name: 'Celestial Intersection',
    jobAbbrev: 'AST',
    category: 'shield',
    recastS: 30,
    effectPct: 0,
    description: 'Heals or shields self/target for a small amount.',
  },
  {
    id: 'a-excog',
    name: 'Excogitation',
    jobAbbrev: 'SCH',
    category: 'shield',
    recastS: 45,
    effectPct: 0,
    description: 'Triggers when target HP drops below 50%.',
  },
  {
    id: 'a-protect',
    name: 'Aquaveil',
    jobAbbrev: 'SCH',
    category: 'shield',
    recastS: 60,
    effectPct: 15,
    description: '15% mit on a single target, 8s.',
  },
  // ----- Party-wide mits -----
  {
    id: 'a-reprisal',
    name: 'Reprisal',
    jobAbbrev: 'PLD',
    category: 'party-mit',
    recastS: 60,
    effectPct: 10,
    description: 'Party-wide 10% mit + slow for 5/15s.',
  },
  {
    id: 'a-feint',
    name: 'Feint',
    jobAbbrev: 'MNK',
    category: 'party-mit',
    recastS: 90,
    effectPct: 10,
    description: 'Single-target 10% mit via debuff, melee.',
  },
  {
    id: 'a-addle',
    name: 'Addle',
    jobAbbrev: 'BLM',
    category: 'party-mit',
    recastS: 90,
    effectPct: 10,
    description: 'Single-target 10% mit via debuff, magic.',
  },
  {
    id: 'a-arms',
    name: 'Arms Length',
    jobAbbrev: 'WAR',
    category: 'party-mit',
    recastS: 120,
    effectPct: 0,
    description: 'Knockback + slow immunity for 6s.',
  },
  {
    id: 'a-surecast',
    name: 'Surecast',
    jobAbbrev: 'BLM',
    category: 'party-mit',
    recastS: 120,
    effectPct: 0,
    description: 'Knockback + draw-in immunity for 6s.',
  },
  {
    id: 'a-dm',
    name: 'Dark Missionary',
    jobAbbrev: 'DRK',
    category: 'party-mit',
    recastS: 90,
    effectPct: 15,
    description: 'Party magic 15% mit, 15s.',
  },
  {
    id: 'a-passage',
    name: 'Passage of Arms',
    jobAbbrev: 'PLD',
    category: 'party-mit',
    recastS: 120,
    effectPct: 15,
    description: 'Cone-shaped physical 15% mit, 18s while channeling.',
  },
  {
    id: 'a-dimens',
    name: 'Collective Unconscious',
    jobAbbrev: 'AST',
    category: 'party-mit',
    recastS: 60,
    effectPct: 10,
    description: 'Bubble of 10% mit plus regen while channeling.',
  },
  {
    id: 'a-sac',
    name: 'Sacred Soil',
    jobAbbrev: 'SCH',
    category: 'party-mit',
    recastS: 30,
    effectPct: 10,
    description: 'AOE 10% mit + HP recovery on hit.',
  },
  {
    id: 'a-stars',
    name: 'Earthly Star',
    jobAbbrev: 'AST',
    category: 'party-mit',
    recastS: 60,
    effectPct: 0,
    description: 'Detonates for a regen or shield depending on maturity.',
  },
  {
    id: 'a-fey',
    name: 'Fey Illumination',
    jobAbbrev: 'SCH',
    category: 'party-mit',
    recastS: 120,
    effectPct: 5,
    description: 'Party-wide 5% mit + 10% healing potency.',
  },
];

/** Mock timeline events per encounter — used to anchor assignments. */
export interface SampleEvent {
  id: string;
  encounterId: string;
  positionMs: number;
  name: string;
  type: 'MECHANIC' | 'BUSTER' | 'RAIDWIDE';
}

export const SAMPLE_EVENTS: Record<string, SampleEvent[]> = {
  [FRU_P1_ID]: [
    { id: '20000000-0000-0000-0000-000000000001', encounterId: FRU_P1_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '20000000-0000-0000-0000-000000000002', encounterId: FRU_P1_ID, positionMs: 28_000, name: 'Hello World (party stack)', type: 'MECHANIC' },
    { id: '20000000-0000-0000-0000-000000000003', encounterId: FRU_P1_ID, positionMs: 55_000, name: 'Light Rampant (tank buster)', type: 'BUSTER' },
    { id: '20000000-0000-0000-0000-000000000004', encounterId: FRU_P1_ID, positionMs: 120_000, name: 'Darklit Dragonsong (raidwide 1)', type: 'RAIDWIDE' },
    { id: '20000000-0000-0000-0000-000000000005', encounterId: FRU_P1_ID, positionMs: 180_000, name: 'Apocalyptic Lamp', type: 'RAIDWIDE' },
    { id: '20000000-0000-0000-0000-000000000006', encounterId: FRU_P1_ID, positionMs: 315_000, name: 'House of Light', type: 'MECHANIC' },
    { id: '20000000-0000-0000-0000-000000000007', encounterId: FRU_P1_ID, positionMs: 510_000, name: 'Crystallize Time', type: 'RAIDWIDE' },
  ],
  [FRU_P2_ID]: [
    { id: '21000000-0000-0000-0000-000000000001', encounterId: FRU_P2_ID, positionMs: 0, name: 'Phase 2 pull', type: 'MECHANIC' },
    { id: '21000000-0000-0000-0000-000000000002', encounterId: FRU_P2_ID, positionMs: 25_000, name: 'Darklit Dragonsong (P2 opener)', type: 'RAIDWIDE' },
    { id: '21000000-0000-0000-0000-000000000003', encounterId: FRU_P2_ID, positionMs: 55_000, name: 'Memoricide (tank buster 1)', type: 'BUSTER' },
    { id: '21000000-0000-0000-0000-000000000004', encounterId: FRU_P2_ID, positionMs: 395_000, name: 'Akh Morn (party buster)', type: 'MECHANIC' },
    { id: '21000000-0000-0000-0000-000000000005', encounterId: FRU_P2_ID, positionMs: 500_000, name: 'Memoricide 5 (final tank buster)', type: 'BUSTER' },
    { id: '21000000-0000-0000-0000-000000000006', encounterId: FRU_P2_ID, positionMs: 605_000, name: 'Enrage (ultimate end)', type: 'BUSTER' },
  ],
  [M1S_ID]: [
    { id: '30000000-0000-0000-0000-000000000001', encounterId: M1S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000002', encounterId: M1S_ID, positionMs: 30_000, name: 'Sugar Riot (party stack)', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000003', encounterId: M1S_ID, positionMs: 70_000, name: 'Tackle (tank buster)', type: 'BUSTER' },
    { id: '30000000-0000-0000-0000-000000000004', encounterId: M1S_ID, positionMs: 110_000, name: 'Wild Beak (raidwide)', type: 'RAIDWIDE' },
  ],
  [M2S_ID]: [
    { id: '40000000-0000-0000-0000-000000000001', encounterId: M2S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '40000000-0000-0000-0000-000000000002', encounterId: M2S_ID, positionMs: 35_000, name: 'Howling Blade', type: 'BUSTER' },
    { id: '40000000-0000-0000-0000-000000000003', encounterId: M2S_ID, positionMs: 80_000, name: 'Wolves at the Door', type: 'MECHANIC' },
  ],
};

/** Categories labelled for the ability picker. */
export const ABILITY_CATEGORY_LABEL: Record<SampleAbility['category'], string> = {
  'tank-cd': 'Tank CDs',
  'healer-cd': 'Healer CDs',
  'party-mit': 'Party-wide',
  invuln: 'Tank invulns',
  shield: 'Shields',
};

/** Render order for the picker — must match the keys in
 * ABILITY_CATEGORY_LABEL so iteration produces the canonical order. */
export const ABILITY_CATEGORY_ORDER: SampleAbility['category'][] =
  Object.keys(ABILITY_CATEGORY_LABEL) as SampleAbility['category'][];