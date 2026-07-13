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

// ---------------------------------------------------------------------------
// Encounter UUIDs — stable across runs, match seed migration 0004.
// ---------------------------------------------------------------------------

export const FRU_P1_ID = '10000000-0000-0000-0000-000000000001';
export const M1S_ID = '10000000-0000-0000-0000-000000000002';
export const M2S_ID = '10000000-0000-0000-0000-000000000003';
export const FRU_P2_ID = '10000000-0000-0000-0000-000000000004';
export const P1S_ID = '10000000-0000-0000-0000-000000000005';
export const P4S_ID = '10000000-0000-0000-0000-000000000006';

// v1 encounters (Aloalo Savage tier + current tier)
export const KETUDUKE_ID = '10000000-0000-0000-0000-000000000010';
export const LALA_ID = '10000000-0000-0000-0000-000000000011';
export const STATICE_ID = '10000000-0000-0000-0000-000000000012';
export const M5S_ID = '10000000-0000-0000-0000-000000000013';
export const M3S_ID = '10000000-0000-0000-0000-000000000014';
export const M4S_ID = '10000000-0000-0000-0000-000000000015';
export const M6S_ID = '10000000-0000-0000-0000-000000000016';
export const M7S_ID = '10000000-0000-0000-0000-000000000017';
export const M8S_ID = '10000000-0000-0000-0000-000000000018';

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export interface SamplePlan {
  id: string;
  meta: Pick<PlanMeta, 'id' | 'name' | 'encounterId' | 'isLegacy'> & {
    encounterName: string;
    raid: string;
  };
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

// ---------------------------------------------------------------------------
// Abilities — full FFXIV mitigation catalog
// ---------------------------------------------------------------------------

export type AbilityCategory = 'tank-cd' | 'healer-cd' | 'party-mit' | 'invuln' | 'shield' | 'utility';
export type DamageType = 'physical' | 'magical' | 'both';
export type AbilityTarget = 'self' | 'single' | 'party' | 'area';

export interface SampleAbility {
  id: string;
  name: string;
  jobAbbrev: string;
  category: AbilityCategory;
  recastS: number;
  effectPct: number;
  durationS: number;
  description: string;
  damageType: DamageType;
  target: AbilityTarget;
  /** For multi-charge abilities. */
  charges: number;
}

export const SAMPLE_ABILITIES: SampleAbility[] = [
  // =========================================================================
  // Tank Invulnerabilities
  // =========================================================================
  {
    id: 'a-hallowed',
    name: 'Hallowed Ground',
    jobAbbrev: 'PLD',
    category: 'invuln',
    recastS: 420,
    effectPct: 100,
    durationS: 10,
    description: 'Renders you impervious to most attacks for 10s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-holmgang',
    name: 'Holmgang',
    jobAbbrev: 'WAR',
    category: 'invuln',
    recastS: 240,
    effectPct: 100,
    durationS: 10,
    description: 'Prevents most attacks from reducing HP below 1 for 10s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-living',
    name: 'Living Dead',
    jobAbbrev: 'DRK',
    category: 'invuln',
    recastS: 300,
    effectPct: 100,
    durationS: 10,
    description: 'When HP is reduced to 0, enters Walking Dead for 10s instead of KO.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-bolide',
    name: 'Superbolide',
    jobAbbrev: 'GNB',
    category: 'invuln',
    recastS: 360,
    effectPct: 100,
    durationS: 10,
    description: 'Reduces HP by 50% and renders you impervious to most attacks for 10s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Tank Role Abilities (shared across all tanks)
  // =========================================================================
  {
    id: 'a-rampart',
    name: 'Rampart',
    jobAbbrev: 'PLD',
    category: 'tank-cd',
    recastS: 90,
    effectPct: 20,
    durationS: 20,
    description: 'Reduces damage taken by 20% for 20s. At Lv94+, increases HP recovery by 15%.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-reprisal',
    name: 'Reprisal',
    jobAbbrev: 'PLD',
    category: 'party-mit',
    recastS: 60,
    effectPct: 10,
    durationS: 15,
    description: 'Reduces damage dealt by nearby enemies by 10% for 15s.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },
  {
    id: 'a-arms-length',
    name: 'Arm\'s Length',
    jobAbbrev: 'PLD',
    category: 'utility',
    recastS: 120,
    effectPct: 0,
    durationS: 6,
    description: 'Nullifies most knockback and draw-in effects. Slows nearby enemies by 20% for 6s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Paladin
  // =========================================================================
  {
    id: 'a-sentinel',
    name: 'Sentinel',
    jobAbbrev: 'PLD',
    category: 'tank-cd',
    recastS: 120,
    effectPct: 30,
    durationS: 15,
    description: 'Reduces damage taken by 30% for 15s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-holy-sheltron',
    name: 'Holy Sheltron',
    jobAbbrev: 'PLD',
    category: 'shield',
    recastS: 5,
    effectPct: 15,
    durationS: 4,
    description: 'Grants 15% mit + a barrier equal to 15% of max HP for 4s. Requires 50 Oath Gauge.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-passage',
    name: 'Passage of Arms',
    jobAbbrev: 'PLD',
    category: 'party-mit',
    recastS: 120,
    effectPct: 15,
    durationS: 18,
    description: 'Grants 15% physical mit to party in cone behind you while channeling (18s).',
    damageType: 'physical',
    target: 'area',
    charges: 1,
  },
  {
    id: 'a-intervention',
    name: 'Intervention',
    jobAbbrev: 'PLD',
    category: 'shield',
    recastS: 10,
    effectPct: 10,
    durationS: 6,
    description: 'Grants 10% mit + barrier to target for 6s. Requires Oath Gauge.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },

  // =========================================================================
  // Warrior
  // =========================================================================
  {
    id: 'a-bloodwhetting',
    name: 'Bloodwhetting',
    jobAbbrev: 'WAR',
    category: 'tank-cd',
    recastS: 25,
    effectPct: 10,
    durationS: 8,
    description: 'Grants 10% mit + 400 potency barrier on weaponskill hit for 8s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-shake-it-off',
    name: 'Shake It Off',
    jobAbbrev: 'WAR',
    category: 'party-mit',
    recastS: 90,
    effectPct: 10,
    durationS: 15,
    description: 'Grants party-wide 10% mit for 15s. Bonus barrier if Nascent Flash active.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-nascent-flash',
    name: 'Nascent Flash',
    jobAbbrev: 'WAR',
    category: 'shield',
    recastS: 25,
    effectPct: 10,
    durationS: 8,
    description: 'Grants 10% mit + shares 50% of HP restored to self with target for 8s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-vengeance',
    name: 'Vengeance',
    jobAbbrev: 'WAR',
    category: 'tank-cd',
    recastS: 120,
    effectPct: 30,
    durationS: 15,
    description: 'Reduces damage taken by 30% and counterattacks for 100 potency on hit for 15s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-equilibrium',
    name: 'Equilibrium',
    jobAbbrev: 'WAR',
    category: 'healer-cd',
    recastS: 60,
    effectPct: 0,
    durationS: 0,
    description: 'Restores own HP by 1200 potency and grants regen (200/tick, 10s).',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Dark Knight
  // =========================================================================
  {
    id: 'a-tbn',
    name: 'The Blackest Night',
    jobAbbrev: 'DRK',
    category: 'shield',
    recastS: 15,
    effectPct: 0,
    durationS: 7,
    description: 'Grants self or target a barrier absorbing 25% of max HP for 7s. Consumes 3000 MP.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-shadow-wall',
    name: 'Shadow Wall',
    jobAbbrev: 'DRK',
    category: 'tank-cd',
    recastS: 120,
    effectPct: 30,
    durationS: 15,
    description: 'Reduces damage taken by 30% for 15s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-dark-missionary',
    name: 'Dark Missionary',
    jobAbbrev: 'DRK',
    category: 'party-mit',
    recastS: 90,
    effectPct: 15,
    durationS: 15,
    description: 'Grants party magic damage mitigation of 15% for 15s.',
    damageType: 'magical',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-oblation',
    name: 'Oblation',
    jobAbbrev: 'DRK',
    category: 'shield',
    recastS: 10,
    effectPct: 10,
    durationS: 10,
    description: 'Grants 10% mit to self or target for 10s. Two charges.',
    damageType: 'both',
    target: 'single',
    charges: 2,
  },
  {
    id: 'a-blackest-night-partymit',
    name: 'Dark Mind',
    jobAbbrev: 'DRK',
    category: 'tank-cd',
    recastS: 60,
    effectPct: 20,
    durationS: 10,
    description: 'Reduces magic damage taken by 20% for 10s.',
    damageType: 'magical',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Gunbreaker
  // =========================================================================
  {
    id: 'a-heart-of-corundum',
    name: 'Heart of Corundum',
    jobAbbrev: 'GNB',
    category: 'shield',
    recastS: 25,
    effectPct: 15,
    durationS: 8,
    description: 'Grants 15% mit + catharsis (HP recovery on hit) to self or target for 8s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-nebula',
    name: 'Nebula',
    jobAbbrev: 'GNB',
    category: 'tank-cd',
    recastS: 120,
    effectPct: 30,
    durationS: 15,
    description: 'Reduces damage taken by 30% for 15s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-hearted',
    name: 'Heart of Light',
    jobAbbrev: 'GNB',
    category: 'party-mit',
    recastS: 90,
    effectPct: 10,
    durationS: 15,
    description: 'Grants party magic damage mitigation of 10% for 15s.',
    damageType: 'magical',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-camouflage',
    name: 'Camouflage',
    jobAbbrev: 'GNB',
    category: 'tank-cd',
    recastS: 90,
    effectPct: 10,
    durationS: 20,
    description: 'Reduces damage taken by 10% + increases parry rate for 20s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-royal-guard',
    name: 'Royal Guard',
    jobAbbrev: 'GNB',
    category: 'tank-cd',
    recastS: 0,
    effectPct: 0,
    durationS: 0,
    description: 'Stance: enmity increase + 20% damage reduction. Toggle.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // White Mage
  // =========================================================================
  {
    id: 'a-aquaveil',
    name: 'Aquaveil',
    jobAbbrev: 'WHM',
    category: 'shield',
    recastS: 60,
    effectPct: 15,
    durationS: 8,
    description: 'Grants target a barrier absorbing damage equal to 15% of their maximum HP for 8s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-temperance',
    name: 'Temperance',
    jobAbbrev: 'WHM',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 20,
    description: 'Party-wide 10% magic mit + 10% healing potency for 20s.',
    damageType: 'magical',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-benediction',
    name: 'Benediction',
    jobAbbrev: 'WHM',
    category: 'healer-cd',
    recastS: 180,
    effectPct: 0,
    durationS: 0,
    description: 'Instantly restores target\'s HP to maximum.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-asylum',
    name: 'Asylum',
    jobAbbrev: 'WHM',
    category: 'party-mit',
    recastS: 90,
    effectPct: 0,
    durationS: 24,
    description: 'Creates a bubble that heals allies inside for 100/tick (24s). +5% mit while inside.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },
  {
    id: 'a-litany',
    name: 'Liturgy of the Bell',
    jobAbbrev: 'WHM',
    category: 'party-mit',
    recastS: 90,
    effectPct: 0,
    durationS: 0,
    description: 'Places a bell; when hit, party recovers HP. 5 charges, each heals 200 potency.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-plenary',
    name: 'Plenary Indulgence',
    jobAbbrev: 'WHM',
    category: 'healer-cd',
    recastS: 60,
    effectPct: 0,
    durationS: 10,
    description: 'Grants party a 100-potency follow-up heal (Confession stack) for 10s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-divine-benison',
    name: 'Divine Benison',
    jobAbbrev: 'WHM',
    category: 'shield',
    recastS: 0,
    effectPct: 0,
    durationS: 15,
    description: 'Grants target a barrier absorbing 500 potency of damage. 2 charges, oGCD.',
    damageType: 'both',
    target: 'single',
    charges: 2,
  },

  // =========================================================================
  // Scholar
  // =========================================================================
  {
    id: 'a-succor',
    name: 'Succor',
    jobAbbrev: 'SCH',
    category: 'shield',
    recastS: 0,
    effectPct: 0,
    durationS: 30,
    description: 'AoE heal + 100 potency shield on party. GCD shield.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-sacred-soil',
    name: 'Sacred Soil',
    jobAbbrev: 'SCH',
    category: 'party-mit',
    recastS: 30,
    effectPct: 10,
    durationS: 15,
    description: 'Creates a field that grants 10% party mit for 15s. Requires Aetherflow.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },
  {
    id: 'a-fey-illumination',
    name: 'Fey Illumination',
    jobAbbrev: 'SCH',
    category: 'party-mit',
    recastS: 120,
    effectPct: 5,
    durationS: 20,
    description: 'Grants party 5% mit + 10% healing potency for 20s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-expedient',
    name: 'Expedient',
    jobAbbrev: 'SCH',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 10,
    description: 'Party-wide 10% mit + 20% sprint speed for 10s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-indomitability',
    name: 'Indomitability',
    jobAbbrev: 'SCH',
    category: 'healer-cd',
    recastS: 0,
    effectPct: 0,
    durationS: 0,
    description: 'AoE GCD heal, 400 potency. Requires Aetherflow.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-deployment-tactics',
    name: 'Deployment Tactics',
    jobAbbrev: 'SCH',
    category: 'shield',
    recastS: 90,
    effectPct: 0,
    durationS: 30,
    description: 'Spreads target\'s active shield effects to nearby party members.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-consolation',
    name: 'Consolation',
    jobAbbrev: 'SCH',
    category: 'shield',
    recastS: 0,
    effectPct: 0,
    durationS: 12,
    description: 'Seraph\'s AoE shield + heal. 300 potency barrier on party. 2 charges.',
    damageType: 'both',
    target: 'party',
    charges: 2,
  },
  {
    id: 'a-protraction',
    name: 'Protraction',
    jobAbbrev: 'SCH',
    category: 'healer-cd',
    recastS: 60,
    effectPct: 0,
    durationS: 10,
    description: 'Increases target\'s max HP by 10% + 15% HP recovery for 10s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },

  // =========================================================================
  // Astrologian
  // =========================================================================
  {
    id: 'a-neutral-sect',
    name: 'Neutral Sect',
    jobAbbrev: 'AST',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 20,
    description: 'Party-wide 10% mit. Aspected spells gain +20% shield for 20s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-collective',
    name: 'Collective Unconscious',
    jobAbbrev: 'AST',
    category: 'party-mit',
    recastS: 60,
    effectPct: 10,
    durationS: 18,
    description: 'Bubble: 10% mit + regen while channeling. Party in bubble for 18s.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },
  {
    id: 'a-exaltation',
    name: 'Exaltation',
    jobAbbrev: 'AST',
    category: 'shield',
    recastS: 60,
    effectPct: 10,
    durationS: 8,
    description: 'Grants target 10% mit + 200/tick regen for 8s. Requires a card.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-celestial-intersection',
    name: 'Celestial Intersection',
    jobAbbrev: 'AST',
    category: 'shield',
    recastS: 30,
    effectPct: 0,
    durationS: 0,
    description: 'oGCD: heals or shields target for 200 potency. 2 charges.',
    damageType: 'both',
    target: 'single',
    charges: 2,
  },
  {
    id: 'a-macrocosmos',
    name: 'Macrocosmos',
    jobAbbrev: 'AST',
    category: 'party-mit',
    recastS: 180,
    effectPct: 0,
    durationS: 0,
    description: 'Big party heal: stores damage taken by party for 6s, then heals for 50% of stored damage.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-synastry',
    name: 'Synastry',
    jobAbbrev: 'AST',
    category: 'healer-cd',
    recastS: 120,
    effectPct: 0,
    durationS: 20,
    description: 'Single-target heal also heals a second target for 50% potency for 20s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-earthly-star',
    name: 'Earthly Star',
    jobAbbrev: 'AST',
    category: 'party-mit',
    recastS: 60,
    effectPct: 0,
    durationS: 20,
    description: 'Place star, detonate after 10s or manually. Heals party for 320 potency + 200/tick regen.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },

  // =========================================================================
  // Sage
  // =========================================================================
  {
    id: 'a-kerachole',
    name: 'Kerachole',
    jobAbbrev: 'SGE',
    category: 'party-mit',
    recastS: 30,
    effectPct: 10,
    durationS: 15,
    description: 'Party-wide 10% mit for 15s. Consumes Addersgall.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },
  {
    id: 'a-holos',
    name: 'Holos',
    jobAbbrev: 'SGE',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 20,
    description: 'Party-wide 10% mit + 300 potency barrier for 20s. Consumes Addersgall.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-haima',
    name: 'Haima',
    jobAbbrev: 'SGE',
    category: 'shield',
    recastS: 120,
    effectPct: 0,
    durationS: 15,
    description: 'Grants target 5 barrier stacks (200 potency each). Consumes Addersgall.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-panhaima',
    name: 'Panhaima',
    jobAbbrev: 'SGE',
    category: 'shield',
    recastS: 120,
    effectPct: 0,
    durationS: 15,
    description: 'AoE version of Haima: 5 barrier stacks (100 potency each) on party. Consumes Addersgall.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-rhizomata',
    name: 'Rhizomata',
    jobAbbrev: 'SGE',
    category: 'healer-cd',
    recastS: 0,
    effectPct: 0,
    durationS: 0,
    description: 'Grants 1 Addersgall stack. 3 charges.',
    damageType: 'both',
    target: 'self',
    charges: 3,
  },
  {
    id: 'a-zoe',
    name: 'Zoe',
    jobAbbrev: 'SGE',
    category: 'healer-cd',
    recastS: 120,
    effectPct: 0,
    durationS: 30,
    description: 'Next heal spell has +50% potency for 30s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-druochole',
    name: 'Druochole',
    jobAbbrev: 'SGE',
    category: 'healer-cd',
    recastS: 0,
    effectPct: 0,
    durationS: 0,
    description: 'Restores target\'s HP by 700 potency. Consumes Addersgall.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },

  // =========================================================================
  // Melee DPS — Role Shared
  // =========================================================================
  {
    id: 'a-feint',
    name: 'Feint',
    jobAbbrev: 'MNK',
    category: 'party-mit',
    recastS: 90,
    effectPct: 10,
    durationS: 10,
    description: 'Reduces target\'s physical and magic damage dealt by 10% for 10s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-second-wind',
    name: 'Second Wind',
    jobAbbrev: 'MNK',
    category: 'healer-cd',
    recastS: 120,
    effectPct: 0,
    durationS: 0,
    description: 'Restores own HP by 500 potency. Role action for all melee.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-bloodbath',
    name: 'Bloodbath',
    jobAbbrev: 'MNK',
    category: 'healer-cd',
    recastS: 90,
    effectPct: 0,
    durationS: 10,
    description: 'Physical attacks heal self for 25% of damage dealt for 10s.',
    damageType: 'physical',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-feint-mnk',
    name: 'Mantra',
    jobAbbrev: 'MNK',
    category: 'healer-cd',
    recastS: 90,
    effectPct: 0,
    durationS: 15,
    description: 'Increases HP recovery by 20% for nearby party members for 15s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },

  // =========================================================================
  // Ranged DPS — Role Shared
  // =========================================================================
  {
    id: 'a-addle',
    name: 'Addle',
    jobAbbrev: 'BLM',
    category: 'party-mit',
    recastS: 90,
    effectPct: 10,
    durationS: 10,
    description: 'Reduces target\'s physical and magic damage dealt by 10% for 10s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },
  {
    id: 'a-surecast',
    name: 'Surecast',
    jobAbbrev: 'BLM',
    category: 'utility',
    recastS: 120,
    effectPct: 0,
    durationS: 6,
    description: 'Nullifies most knockback and draw-in effects for 6s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
  {
    id: 'a-lucid-dreaming',
    name: 'Lucid Dreaming',
    jobAbbrev: 'BLM',
    category: 'utility',
    recastS: 60,
    effectPct: 0,
    durationS: 21,
    description: 'Restores 80 MP every 3s for 21s. Role action for all casters/healers.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Physical Ranged
  // =========================================================================
  {
    id: 'a-tactician',
    name: 'Tactician',
    jobAbbrev: 'BRD',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 15,
    description: 'Reduces damage taken by party by 10% for 15s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },

  // =========================================================================
  // Dancer
  // =========================================================================
  {
    id: 'a-shield-samba',
    name: 'Shield Samba',
    jobAbbrev: 'DNC',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 15,
    description: 'Reduces damage taken by party by 10% for 15s.',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },
  {
    id: 'a-improvisation',
    name: 'Improvisation',
    jobAbbrev: 'DNC',
    category: 'party-mit',
    recastS: 120,
    effectPct: 0,
    durationS: 15,
    description: 'Channeled: party gains 10% mit + stacking barrier (100 potency/s for 15s).',
    damageType: 'both',
    target: 'party',
    charges: 1,
  },

  // =========================================================================
  // Machinist
  // =========================================================================
  {
    id: 'a-tactician',
    name: 'Tactician',
    jobAbbrev: 'MCH',
    category: 'party-mit',
    recastS: 120,
    effectPct: 5,
    durationS: 15,
    description: 'Increases damage dealt by 5% for self and nearby party members for 15s.',
    damageType: 'both',
    target: 'area',
    charges: 1,
  },

  // =========================================================================
  // Monk
  // =========================================================================
  {
    id: 'a-riddle',
    name: 'Riddle of Earth',
    jobAbbrev: 'MNK',
    category: 'tank-cd',
    recastS: 120,
    effectPct: 20,
    durationS: 10,
    description: 'Reduces damage taken by 20% for 10s. Grants Earth\'s Resolve.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Samurai
  // =========================================================================
  {
    id: 'a-third-eye',
    name: 'Third Eye',
    jobAbbrev: 'SAM',
    category: 'tank-cd',
    recastS: 15,
    effectPct: 10,
    durationS: 4,
    description: 'Reduces damage taken by 10% for 4s. Heals for 50 potency when hit.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Reaper
  // =========================================================================
  {
    id: 'a-shadow-veil',
    name: 'Shadowed Vigil',
    jobAbbrev: 'RPR',
    category: 'tank-cd',
    recastS: 120,
    effectPct: 15,
    durationS: 10,
    description: 'Reduces damage taken by 15% for 10s. Heals when HP drops below 50%.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Viper
  // =========================================================================
  {
    id: 'a-huntsman',
    name: 'Hunter\'s Vivacity',
    jobAbbrev: 'VPR',
    category: 'utility',
    recastS: 0,
    effectPct: 0,
    durationS: 0,
    description: 'Viper has no native mit. Use Feint for party utility.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Black Mage
  // =========================================================================
  {
    id: 'a-mana-ward',
    name: 'Manaward',
    jobAbbrev: 'BLM',
    category: 'shield',
    recastS: 120,
    effectPct: 0,
    durationS: 20,
    description: 'Grants barrier absorbing magic damage equal to 30% of max HP for 20s.',
    damageType: 'magical',
    target: 'self',
    charges: 1,
  },

  // =========================================================================
  // Red Mage
  // =========================================================================
  {
    id: 'a-magick-barrier',
    name: 'Magick Barrier',
    jobAbbrev: 'RDM',
    category: 'party-mit',
    recastS: 120,
    effectPct: 10,
    durationS: 10,
    description: 'Grants party 10% magic mit + 10% HP recovery for 10s.',
    damageType: 'magical',
    target: 'party',
    charges: 1,
  },

  // =========================================================================
  // Summoner
  // =========================================================================
  {
    id: 'a-rekindle',
    name: 'Rekindle',
    jobAbbrev: 'SMN',
    category: 'healer-cd',
    recastS: 0,
    effectPct: 0,
    durationS: 0,
    description: 'When Phoenix is summoned, heals target for 450 potency + 100/tick regen for 10s.',
    damageType: 'both',
    target: 'single',
    charges: 1,
  },

  // =========================================================================
  // Pictomancer
  // =========================================================================
  {
    id: 'a-smudge',
    name: 'Smudge',
    jobAbbrev: 'PCT',
    category: 'utility',
    recastS: 120,
    effectPct: 0,
    durationS: 5,
    description: 'Sprint forward + 10% mit for 5s.',
    damageType: 'both',
    target: 'self',
    charges: 1,
  },
];

/** Categories labelled for the ability picker. */
export const ABILITY_CATEGORY_LABEL: Record<AbilityCategory, string> = {
  'tank-cd': 'Tank Cooldowns',
  'healer-cd': 'Healer Cooldowns',
  'party-mit': 'Party-wide Mitigation',
  invuln: 'Tank Invulnerabilities',
  shield: 'Shields & Barriers',
  utility: 'Utility',
};

/** Render order for the picker — must match the keys in
 * ABILITY_CATEGORY_LABEL so iteration produces the canonical order. */
export const ABILITY_CATEGORY_ORDER: AbilityCategory[] =
  Object.keys(ABILITY_CATEGORY_LABEL) as AbilityCategory[];

// ---------------------------------------------------------------------------
// Encounters — boss definitions
// ---------------------------------------------------------------------------

export interface SampleEncounter {
  id: string;
  name: string;
  raid: string;
  tier: string;
  level: number;
  patchVersion: string;
  icon: string;
}

export const SAMPLE_ENCOUNTERS: SampleEncounter[] = [
  // Aloalo Savage (Criterion)
  { id: KETUDUKE_ID, name: 'Ketuduke', raid: 'Aloalo', tier: 'Savage', level: 90, patchVersion: '6.51', icon: '\u{1F30A}' },
  { id: LALA_ID, name: 'Lala', raid: 'Aloalo', tier: 'Savage', level: 90, patchVersion: '6.51', icon: '\u{2797}' },
  { id: STATICE_ID, name: 'Statice', raid: 'Aloalo', tier: 'Savage', level: 90, patchVersion: '6.51', icon: '\u{1F52B}' },
  // AAC Light-heavyweight (Savage)
  { id: M1S_ID, name: 'Sugar Riot', raid: 'M1S', tier: 'Savage', level: 100, patchVersion: '7.05', icon: '\u{1F36C}' },
  { id: M2S_ID, name: 'Howling Blade', raid: 'M2S', tier: 'Savage', level: 100, patchVersion: '7.05', icon: '\u{1F5E1}' },
  { id: M3S_ID, name: 'Brute Abominator', raid: 'M3S', tier: 'Savage', level: 100, patchVersion: '7.05', icon: '\u{1F47F}' },
  { id: M4S_ID, name: 'Wicked Thunder', raid: 'M4S', tier: 'Savage', level: 100, patchVersion: '7.05', icon: '\u{26A1}' },
  // AAC Light-heavyweight (Savage) — continued
  { id: M5S_ID, name: 'Dancing Green', raid: 'M5S', tier: 'Savage', level: 100, patchVersion: '7.1', icon: '\u{1F383}' },
  { id: M6S_ID, name: 'Vamp fatale', raid: 'M6S', tier: 'Savage', level: 100, patchVersion: '7.1', icon: '\u{1F9DB}' },
  { id: M7S_ID, name: 'Brute Abominator', raid: 'M7S', tier: 'Savage', level: 100, patchVersion: '7.2', icon: '\u{1F47F}' },
  { id: M8S_ID, name: 'Howling Blade', raid: 'M8S', tier: 'Savage', level: 100, patchVersion: '7.2', icon: '\u{1F5E1}' },
  // Futures Rewritten (Ultimate)
  { id: FRU_P1_ID, name: 'Light Rampant', raid: 'FRU', tier: 'Ultimate', level: 100, patchVersion: '7.21', icon: '\u{2728}' },
  { id: FRU_P2_ID, name: 'Darklit Dragonsong', raid: 'FRU', tier: 'Ultimate', level: 100, patchVersion: '7.21', icon: '\u{1F409}' },
  // Pandaemonium (legacy)
  { id: P1S_ID, name: 'Erichthonios', raid: 'P1S', tier: 'Savage', level: 90, patchVersion: '6.05', icon: '\u{2694}' },
  { id: P4S_ID, name: 'Hephaistos', raid: 'P4S', tier: 'Savage', level: 90, patchVersion: '6.18', icon: '\u{1F525}' },
];

// ---------------------------------------------------------------------------
// Timeline Events — real encounter data (ported from v1)
// ---------------------------------------------------------------------------

export interface SampleEvent {
  id: string;
  encounterId: string;
  positionMs: number;
  name: string;
  type: 'MECHANIC' | 'BUSTER' | 'RAIDWIDE' | 'MECHANIC_START' | 'MECHANIC_END';
}

export const SAMPLE_EVENTS: Record<string, SampleEvent[]> = {
  // -------------------------------------------------------------------------
  // FRU P1 — Light Rampant
  // -------------------------------------------------------------------------
  [FRU_P1_ID]: [
    { id: '20000000-0000-0000-0000-000000000001', encounterId: FRU_P1_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '20000000-0000-0000-0000-000000000002', encounterId: FRU_P1_ID, positionMs: 28_000, name: 'Hello World (party stack)', type: 'MECHANIC' },
    { id: '20000000-0000-0000-0000-000000000003', encounterId: FRU_P1_ID, positionMs: 55_000, name: 'Light Rampant (tank buster)', type: 'BUSTER' },
    { id: '20000000-0000-0000-0000-000000000004', encounterId: FRU_P1_ID, positionMs: 120_000, name: 'Darklit Dragonsong (raidwide 1)', type: 'RAIDWIDE' },
    { id: '20000000-0000-0000-0000-000000000005', encounterId: FRU_P1_ID, positionMs: 180_000, name: 'Apocalyptic Lamp', type: 'RAIDWIDE' },
    { id: '20000000-0000-0000-0000-000000000006', encounterId: FRU_P1_ID, positionMs: 315_000, name: 'House of Light', type: 'MECHANIC' },
    { id: '20000000-0000-0000-0000-000000000007', encounterId: FRU_P1_ID, positionMs: 510_000, name: 'Crystallize Time', type: 'RAIDWIDE' },
  ],
  // -------------------------------------------------------------------------
  // FRU P2 — Darklit Dragonsong
  // -------------------------------------------------------------------------
  [FRU_P2_ID]: [
    { id: '21000000-0000-0000-0000-000000000001', encounterId: FRU_P2_ID, positionMs: 0, name: 'Phase 2 pull', type: 'MECHANIC' },
    { id: '21000000-0000-0000-0000-000000000002', encounterId: FRU_P2_ID, positionMs: 25_000, name: 'Darklit Dragonsong (P2 opener)', type: 'RAIDWIDE' },
    { id: '21000000-0000-0000-0000-000000000003', encounterId: FRU_P2_ID, positionMs: 55_000, name: 'Memoricide (tank buster 1)', type: 'BUSTER' },
    { id: '21000000-0000-0000-0000-000000000004', encounterId: FRU_P2_ID, positionMs: 395_000, name: 'Akh Morn (party buster)', type: 'MECHANIC' },
    { id: '21000000-0000-0000-0000-000000000005', encounterId: FRU_P2_ID, positionMs: 500_000, name: 'Memoricide 5 (final tank buster)', type: 'BUSTER' },
    { id: '21000000-0000-0000-0000-000000000006', encounterId: FRU_P2_ID, positionMs: 605_000, name: 'Enrage (ultimate end)', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M1S — Sugar Riot
  // -------------------------------------------------------------------------
  [M1S_ID]: [
    { id: '30000000-0000-0000-0000-000000000001', encounterId: M1S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000002', encounterId: M1S_ID, positionMs: 18_000, name: 'Lickety Split', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000003', encounterId: M1S_ID, positionMs: 32_000, name: 'Sugar Riot (party stack)', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000004', encounterId: M1S_ID, positionMs: 56_000, name: 'Tackle (tank buster)', type: 'BUSTER' },
    { id: '30000000-0000-0000-0000-000000000005', encounterId: M1S_ID, positionMs: 80_000, name: 'Wild Beak (raidwide)', type: 'RAIDWIDE' },
    { id: '30000000-0000-0000-0000-000000000006', encounterId: M1S_ID, positionMs: 110_000, name: 'Sweet Nibbles (spread)', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000007', encounterId: M1S_ID, positionMs: 145_000, name: 'Rotten Rampage (tank buster)', type: 'BUSTER' },
    { id: '30000000-0000-0000-0000-000000000008', encounterId: M1S_ID, positionMs: 180_000, name: 'Sweet Spearmint (raidwide)', type: 'RAIDWIDE' },
    { id: '30000000-0000-0000-0000-000000000009', encounterId: M1S_ID, positionMs: 220_000, name: 'Turbine Torment (spread)', type: 'MECHANIC' },
    { id: '30000000-0000-0000-0000-000000000010', encounterId: M1S_ID, positionMs: 260_000, name: 'Candy Cane (raidwide)', type: 'RAIDWIDE' },
    { id: '30000000-0000-0000-0000-000000000011', encounterId: M1S_ID, positionMs: 300_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M2S — Howling Blade
  // -------------------------------------------------------------------------
  [M2S_ID]: [
    { id: '40000000-0000-0000-0000-000000000001', encounterId: M2S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '40000000-0000-0000-0000-000000000002', encounterId: M2S_ID, positionMs: 22_000, name: 'Howling Blade (opener buster)', type: 'BUSTER' },
    { id: '40000000-0000-0000-0000-000000000003', encounterId: M2S_ID, positionMs: 48_000, name: 'Wolves at the Door (party)', type: 'MECHANIC' },
    { id: '40000000-0000-0000-0000-000000000004', encounterId: M2S_ID, positionMs: 75_000, name: 'Claw of the Beast (raidwide)', type: 'RAIDWIDE' },
    { id: '40000000-0000-0000-0000-000000000005', encounterId: M2S_ID, positionMs: 105_000, name: 'Lunar Cycles (spread)', type: 'MECHANIC' },
    { id: '40000000-0000-0000-0000-000000000006', encounterId: M2S_ID, positionMs: 140_000, name: 'Howling Blade (buster 2)', type: 'BUSTER' },
    { id: '40000000-0000-0000-0000-000000000007', encounterId: M2S_ID, positionMs: 175_000, name: 'Rhalgr\'s Thunder (raidwide)', type: 'RAIDWIDE' },
    { id: '40000000-0000-0000-0000-000000000008', encounterId: M2S_ID, positionMs: 210_000, name: 'Beast Fang (spread)', type: 'MECHANIC' },
    { id: '40000000-0000-0000-0000-000000000009', encounterId: M2S_ID, positionMs: 260_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M3S — Brute Abominator
  // -------------------------------------------------------------------------
  [M3S_ID]: [
    { id: '50000000-0000-0000-0000-000000000001', encounterId: M3S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '50000000-0000-0000-0000-000000000002', encounterId: M3S_ID, positionMs: 15_000, name: 'MogBomb (party stack)', type: 'MECHANIC' },
    { id: '50000000-0000-0000-0000-000000000003', encounterId: M3S_ID, positionMs: 30_000, name: 'Final Verse (tank buster)', type: 'BUSTER' },
    { id: '50000000-0000-0000-0000-000000000004', encounterId: M3S_ID, positionMs: 55_000, name: 'Brutish Swing (raidwide)', type: 'RAIDWIDE' },
    { id: '50000000-0000-0000-0000-000000000005', encounterId: M3S_ID, positionMs: 85_000, name: 'Mog of War (spread)', type: 'MECHANIC' },
    { id: '50000000-0000-0000-0000-000000000006', encounterId: M3S_ID, positionMs: 120_000, name: 'Double Smash (tank buster)', type: 'BUSTER' },
    { id: '50000000-0000-0000-0000-000000000007', encounterId: M3S_ID, positionMs: 160_000, name: 'Brute Force (raidwide)', type: 'RAIDWIDE' },
    { id: '50000000-0000-0000-0000-000000000008', encounterId: M3S_ID, positionMs: 200_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M4S — Wicked Thunder
  // -------------------------------------------------------------------------
  [M4S_ID]: [
    { id: '60000000-0000-0000-0000-000000000001', encounterId: M4S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '60000000-0000-0000-0000-000000000002', encounterId: M4S_ID, positionMs: 20_000, name: 'Electrifying Strike (party)', type: 'MECHANIC' },
    { id: '60000000-0000-0000-0000-000000000003', encounterId: M4S_ID, positionMs: 40_000, name: 'Thunderhead (tank buster)', type: 'BUSTER' },
    { id: '60000000-0000-0000-0000-000000000004', encounterId: M4S_ID, positionMs: 70_000, name: 'Wicked Lightning (raidwide)', type: 'RAIDWIDE' },
    { id: '60000000-0000-0000-0000-000000000005', encounterId: M4S_ID, positionMs: 100_000, name: 'Northern Cross (spread)', type: 'MECHANIC' },
    { id: '60000000-0000-0000-0000-000000000006', encounterId: M4S_ID, positionMs: 135_000, name: 'Levinstrike (buster)', type: 'BUSTER' },
    { id: '60000000-0000-0000-0000-000000000007', encounterId: M4S_ID, positionMs: 175_000, name: 'Stormwreath (raidwide)', type: 'RAIDWIDE' },
    { id: '60000000-0000-0000-0000-000000000008', encounterId: M4S_ID, positionMs: 220_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M5S — Dancing Green
  // -------------------------------------------------------------------------
  [M5S_ID]: [
    { id: '70000000-0000-0000-0000-000000000001', encounterId: M5S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '70000000-0000-0000-0000-000000000002', encounterId: M5S_ID, positionMs: 18_000, name: 'Polka (party stack)', type: 'MECHANIC' },
    { id: '70000000-0000-0000-0000-000000000003', encounterId: M5S_ID, positionMs: 38_000, name: 'Hallow Wreath (tank buster)', type: 'BUSTER' },
    { id: '70000000-0000-0000-0000-000000000004', encounterId: M5S_ID, positionMs: 62_000, name: 'Waltz of the Dead (raidwide)', type: 'RAIDWIDE' },
    { id: '70000000-0000-0000-0000-000000000005', encounterId: M5S_ID, positionMs: 90_000, name: 'Grand Step (spread)', type: 'MECHANIC' },
    { id: '70000000-0000-0000-0000-000000000006', encounterId: M5S_ID, positionMs: 125_000, name: 'Dance of the Dead (buster)', type: 'BUSTER' },
    { id: '70000000-0000-0000-0000-000000000007', encounterId: M5S_ID, positionMs: 165_000, name: 'Phantom Waltz (raidwide)', type: 'RAIDWIDE' },
    { id: '70000000-0000-0000-0000-000000000008', encounterId: M5S_ID, positionMs: 200_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // Ketuduke (Aloalo Savage)
  // -------------------------------------------------------------------------
  [KETUDUKE_ID]: [
    { id: '80000000-0000-0000-0000-000000000001', encounterId: KETUDUKE_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '80000000-0000-0000-0000-000000000002', encounterId: KETUDUKE_ID, positionMs: 15_000, name: 'Tidal Roar (raidwide)', type: 'RAIDWIDE' },
    { id: '80000000-0000-0000-0000-000000000003', encounterId: KETUDUKE_ID, positionMs: 35_000, name: 'Fluke Typhoon (party stack)', type: 'MECHANIC' },
    { id: '80000000-0000-0000-0000-000000000004', encounterId: KETUDUKE_ID, positionMs: 55_000, name: 'Reef Diluvium (spread)', type: 'MECHANIC' },
    { id: '80000000-0000-0000-0000-000000000005', encounterId: KETUDUKE_ID, positionMs: 80_000, name: 'Sea Shanty (raidwide)', type: 'RAIDWIDE' },
    { id: '80000000-0000-0000-0000-000000000006', encounterId: KETUDUKE_ID, positionMs: 110_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // Lala (Aloalo Savage)
  // -------------------------------------------------------------------------
  [LALA_ID]: [
    { id: '90000000-0000-0000-0000-000000000001', encounterId: LALA_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: '90000000-0000-0000-0000-000000000002', encounterId: LALA_ID, positionMs: 20_000, name: 'Addle (raidwide)', type: 'RAIDWIDE' },
    { id: '90000000-0000-0000-0000-000000000003', encounterId: LALA_ID, positionMs: 45_000, name: 'Quadruple Trial (party stack)', type: 'MECHANIC' },
    { id: '90000000-0000-0000-0000-000000000004', encounterId: LALA_ID, positionMs: 70_000, name: 'Quartet Tackle (spread)', type: 'MECHANIC' },
    { id: '90000000-0000-0000-0000-000000000005', encounterId: LALA_ID, positionMs: 95_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // Statice (Aloalo Savage)
  // -------------------------------------------------------------------------
  [STATICE_ID]: [
    { id: 'A0000000-0000-0000-0000-000000000001', encounterId: STATICE_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: 'A0000000-0000-0000-0000-000000000002', encounterId: STATICE_ID, positionMs: 22_000, name: 'Trick Reload (raidwide)', type: 'RAIDWIDE' },
    { id: 'A0000000-0000-0000-0000-000000000003', encounterId: STATICE_ID, positionMs: 48_000, name: 'Detonating Dead (party stack)', type: 'MECHANIC' },
    { id: 'A0000000-0000-0000-0000-000000000004', encounterId: STATICE_ID, positionMs: 72_000, name: 'Gunpowder (spread)', type: 'MECHANIC' },
    { id: 'A0000000-0000-0000-0000-000000000005', encounterId: STATICE_ID, positionMs: 100_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // Legacy — Pandaemonium (P1S, P4S)
  // -------------------------------------------------------------------------
  [P1S_ID]: [
    { id: 'B0000000-0000-0000-0000-000000000001', encounterId: P1S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: 'B0000000-0000-0000-0000-000000000002', encounterId: P1S_ID, positionMs: 20_000, name: 'Intemperance (raidwide)', type: 'RAIDWIDE' },
    { id: 'B0000000-0000-0000-0000-000000000003', encounterId: P1S_ID, positionMs: 45_000, name: 'Shining Cells (spread)', type: 'MECHANIC' },
    { id: 'B0000000-0000-0000-0000-000000000004', encounterId: P1S_ID, positionMs: 75_000, name: 'Kothurnos (tank buster)', type: 'BUSTER' },
    { id: 'B0000000-0000-0000-0000-000000000005', encounterId: P1S_ID, positionMs: 110_000, name: 'Purgation (raidwide)', type: 'RAIDWIDE' },
    { id: 'B0000000-0000-0000-0000-000000000006', encounterId: P1S_ID, positionMs: 155_000, name: 'Enrage', type: 'BUSTER' },
  ],
  [P4S_ID]: [
    { id: 'C0000000-0000-0000-0000-000000000001', encounterId: P4S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: 'C0000000-0000-0000-0000-000000000002', encounterId: P4S_ID, positionMs: 22_000, name: 'Pinax (raidwide)', type: 'RAIDWIDE' },
    { id: 'C0000000-0000-0000-0000-000000000003', encounterId: P4S_ID, positionMs: 50_000, name: 'Dark design (party stack)', type: 'MECHANIC' },
    { id: 'C0000000-0000-0000-0000-000000000004', encounterId: P4S_ID, positionMs: 80_000, name: 'Belone burst (spread)', type: 'MECHANIC' },
    { id: 'C0000000-0000-0000-0000-000000000005', encounterId: P4S_ID, positionMs: 115_000, name: 'Theofilus (tank buster)', type: 'BUSTER' },
    { id: 'C0000000-0000-0000-0000-000000000006', encounterId: P4S_ID, positionMs: 160_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M6S — Vamp fatale (placeholder events)
  // -------------------------------------------------------------------------
  [M6S_ID]: [
    { id: 'D0000000-0000-0000-0000-000000000001', encounterId: M6S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: 'D0000000-0000-0000-0000-000000000002', encounterId: M6S_ID, positionMs: 18_000, name: 'Bloodruse (raidwide)', type: 'RAIDWIDE' },
    { id: 'D0000000-0000-0000-0000-000000000003', encounterId: M6S_ID, positionMs: 42_000, name: 'Sanguine Fang (tank buster)', type: 'BUSTER' },
    { id: 'D0000000-0000-0000-0000-000000000004', encounterId: M6S_ID, positionMs: 70_000, name: 'Vampiric Touch (party)', type: 'MECHANIC' },
    { id: 'D0000000-0000-0000-0000-000000000005', encounterId: M6S_ID, positionMs: 105_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M7S — Brute Abominator (placeholder events)
  // -------------------------------------------------------------------------
  [M7S_ID]: [
    { id: 'E0000000-0000-0000-0000-000000000001', encounterId: M7S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: 'E0000000-0000-0000-0000-000000000002', encounterId: M7S_ID, positionMs: 15_000, name: 'Brute Force (raidwide)', type: 'RAIDWIDE' },
    { id: 'E0000000-0000-0000-0000-000000000003', encounterId: M7S_ID, positionMs: 38_000, name: 'Brutish Impact (tank buster)', type: 'BUSTER' },
    { id: 'E0000000-0000-0000-0000-000000000004', encounterId: M7S_ID, positionMs: 65_000, name: 'Mog Bomb Barrage (party)', type: 'MECHANIC' },
    { id: 'E0000000-0000-0000-0000-000000000005', encounterId: M7S_ID, positionMs: 100_000, name: 'Enrage', type: 'BUSTER' },
  ],
  // -------------------------------------------------------------------------
  // M8S — Howling Blade (placeholder events)
  // -------------------------------------------------------------------------
  [M8S_ID]: [
    { id: 'F0000000-0000-0000-0000-000000000001', encounterId: M8S_ID, positionMs: 0, name: 'Pull', type: 'MECHANIC' },
    { id: 'F0000000-0000-0000-0000-000000000002', encounterId: M8S_ID, positionMs: 20_000, name: 'Howling Gust (raidwide)', type: 'RAIDWIDE' },
    { id: 'F0000000-0000-0000-0000-000000000003', encounterId: M8S_ID, positionMs: 45_000, name: 'Gnashing Fang (tank buster)', type: 'BUSTER' },
    { id: 'F0000000-0000-0000-0000-000000000004', encounterId: M8S_ID, positionMs: 72_000, name: 'Beast Fury (party)', type: 'MECHANIC' },
    { id: 'F0000000-0000-0000-0000-000000000005', encounterId: M8S_ID, positionMs: 108_000, name: 'Enrage', type: 'BUSTER' },
  ],
};
