/**
 * Tests for the legacy (MitPlan v1 / Firebase) → PlanDoc converter.
 * Uses real-shaped v1 payloads (verified against the production
 * `xivmit` Realtime Database) and a small catalog.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  convertLegacyPlanToYDoc,
  parseLegacyPlan,
  actionNameOf,
  resolveEncounterId,
  resolveAbility,
  resolveEvent,
  LEGACY_SENTINEL_ENCOUNTER_ID,
} from '../../../../scripts/lib/legacy-convert.mjs';

// A real-shaped v1 plan (M5S "Dancing Green" boss).
const M5S_PLAN = {
  id: '-OUpCZNBCDZl3_s8U-Lq',
  title: 'M5S prog',
  bossId: 'dancing-green-m5s',
  selectedBoss: { id: 'ketuduke', name: 'Ketuduke' },
  ownerId: 'WDPsyp5xHNNMJeAh7tzMNGBkkor1',
  createdAt: 1751490792547,
  updatedAt: 1751563395268,
  version: 4,
  isPublic: false,
  selectedJobs: { tank: ['PLD', 'WAR'] },
  tankPositions: { mainTank: 'WAR', offTank: 'PLD' },
  assignments: {
    deep_cut_1: [
      { id: 'intervention', name: 'Intervention', tankPosition: 'offTank', assignedAt: 1751561536287 },
      { id: 'sentinel', name: 'Sentinel', tankPosition: 'mainTank', assignedAt: 1751563394880 },
    ],
    raidwide_2: [{ id: 'reprisal', name: 'Reprisal', tankPosition: null, assignedAt: 1751563400000 }],
  },
};

// A catalog that mirrors the seeded new-system data we want to match against.
const CATALOG = {
  abilities: [
    { id: '60000000-0000-0000-0000-000000000003', abilityId: 'rampart', name: 'Rampart' },
    { id: '60000000-0000-0000-0000-000000000013', abilityId: 'reprisal', name: 'Reprisal' },
    { id: '60000000-0000-0000-0000-000000000001', abilityId: 'the-blackest-night', name: 'The Blackest Night' },
    // New ability_id uses '-' while v1 uses '_' — must still match.
    { id: '60000000-0000-0000-0000-000000000021', abilityId: 'sacred-soil', name: 'Sacred Soil' },
  ],
  encounters: [
    { id: '10000000-0000-0000-0000-000000000002', slug: 'm1s-sugar-riot', name: 'Sugar Riot' },
    { id: '10000000-0000-0000-0000-000000000001', slug: 'fru-p1-light-rampant', name: 'Light Rampant' },
  ],
  timelines: [
    {
      encounterId: '10000000-0000-0000-0000-000000000001',
      events: [
        {
          id: '80000000-0000-0000-0000-000000000003',
          name: 'Deep Cut',
          normalizedNames: ['deep-cut'],
        },
      ],
    },
  ],
};

describe('legacy-convert — unit helpers', () => {
  it('actionNameOf strips boss + sequence from a bossActionId', () => {
    expect(actionNameOf('deep_cut_1')).toBe('deep cut');
    expect(actionNameOf('tidal_roar_2')).toBe('tidal roar');
    expect(actionNameOf('some_boss_specific_thing_3')).toBe('some boss specific thing');
  });

  it('resolveEncounterId matches by raid token then by boss name', () => {
    expect(resolveEncounterId('dancing-green-m5s', 'ketuduke', CATALOG.encounters)).toBeNull();
    expect(resolveEncounterId('sugar-riot', 'sugar-riot', CATALOG.encounters)).toBe(
      '10000000-0000-0000-0000-000000000002',
    );
  });

  it('resolveAbility matches v1 _ id to new - abilityId and by name', () => {
    expect(resolveAbility('reprisal', 'Reprisal', CATALOG.abilities)?.abilityId).toBe('reprisal');
    expect(resolveAbility('sacred_soil', 'Sacred Soil', CATALOG.abilities)?.abilityId).toBe('sacred-soil');
    expect(resolveAbility('intervention', 'Intervention', CATALOG.abilities)).toBeNull();
  });

  it('resolveEvent matches a bossActionId to a timeline event', () => {
    const ev = resolveEvent('deep_cut_1', CATALOG.timelines[0]!.events);
    expect(ev?.id).toBe('80000000-0000-0000-0000-000000000003');
  });
});

describe('legacy-convert — full conversion', () => {
  it('parses the real-shaped plan into a flat assignment list', () => {
    const parsed = parseLegacyPlan(M5S_PLAN);
    expect(parsed.title).toBe('M5S prog');
    expect(parsed.bossId).toBe('dancing-green-m5s');
    expect(parsed.assignments).toHaveLength(3);
    expect(parsed.assignments[0]).toMatchObject({
      bossActionId: 'deep_cut_1',
      mitigationId: 'intervention',
      tankPosition: 'offTank',
    });
  });

  it('produces a Yjs doc with meta + re-anchored assignments', () => {
    const { ydocB64, encounterId, report } = convertLegacyPlanToYDoc(M5S_PLAN, CATALOG);
    expect(typeof ydocB64).toBe('string');
    expect(encounterId).toBe(LEGACY_SENTINEL_ENCOUNTER_ID); // M5S has no seeded encounter

    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(ydocB64, 'base64'));
    const meta = doc.getMap('meta');
    const assignments = doc.getMap('assignments');

    expect(meta.get('isLegacy')).toBe(true);
    expect(meta.get('name')).toBe('M5S prog');
    expect(meta.get('legacyPayloadAvailable')).toBe(true);
    expect((meta.get('legacyPayload') as { bossId: string }).bossId).toBe('dancing-green-m5s');

    // reprisal matches by id; intervention/sentinel do not (placeholder ability).
    expect(report.total).toBe(3);
    expect(report.matchedAbility).toBe(1);
    expect(report.unmatchedAbility).toBe(2);

    const rows = [...assignments.values()].map((m) =>
      Object.fromEntries((m as Y.Map<unknown>).entries()),
    ) as Array<Record<string, unknown>>;
    const reprisal = rows.find((r) => r.legacyMitigationId === 'reprisal');
    expect(reprisal?.abilityId).toBe('60000000-0000-0000-0000-000000000013');
    const intervention = rows.find((r) => r.legacyMitigationId === 'intervention');
    expect(intervention?.targetType).toBe('OFF_TANK');
    expect(intervention?.notes).toContain('ability: Intervention');
    expect(intervention?.notes).toContain('event: deep_cut_1');
  });

  it('re-anchors events when the encounter timeline exists', () => {
    const sugarPlan = {
      id: 'plan-sugar',
      title: 'M1S farm',
      bossId: 'sugar-riot',
      ownerId: 'u1',
      assignments: { deep_cut_1: [{ id: 'reprisal', name: 'Reprisal', tankPosition: null }] },
    };
    const { encounterId } = convertLegacyPlanToYDoc(sugarPlan, CATALOG);
    expect(encounterId).toBe('10000000-0000-0000-0000-000000000002');
  });

  it('is deterministic for the same input (logical state)', () => {
    const decode = (b64: string) => {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, Buffer.from(b64, 'base64'));
      const meta = doc.getMap('meta');
      const assignments = [...doc.getMap('assignments').values()].map((m) =>
        Object.fromEntries((m as Y.Map<unknown>).entries()),
      );
      return { name: meta.get('name'), assignments };
    };
    const a = decode(convertLegacyPlanToYDoc(M5S_PLAN, CATALOG).ydocB64);
    const b = decode(convertLegacyPlanToYDoc(M5S_PLAN, CATALOG).ydocB64);
    expect(a.name).toBe(b.name);
    expect(a.assignments).toEqual(b.assignments);
  });
});
