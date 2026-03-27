import { describe, expect, it } from 'vitest';
import theTyrantTimeline from './the-tyrant-m11s.timeline.json';
import { normalizeTimelineRecord } from '../../utils/timeline/adaptiveTimelineUtils';

describe('the-tyrant-m11s adaptive timeline', () => {
  it('keeps the expected primary branch anchors and curated split windows', () => {
    const timeline = normalizeTimelineRecord(theTyrantTimeline);

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.actions).toHaveLength(39);
    expect(timeline.resolution?.defaultBranchId).toBe('fight-0-branch-0');
    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_comet_crushing_comet',
      'phase_dance_of_domination',
      'phase_ultimate_trophy_weapons',
      'phase_one_and_only_great_wall',
      'phase_arena_split',
      'phase_ecliptic_stampede',
      'phase_heartbreak',
    ]);

    const byId = new Map(timeline.actions.map((action) => [action.id, action]));
    const names = timeline.actions.map((action) => action.name);

    expect(byId.get('crown_of_arcadia_1')?.time).toBeCloseTo(12.66, 2);
    expect(byId.get('impact_1')?.time).toBeCloseTo(26.181, 3);
    expect(byId.get('impact_1')?.classification).toBe('raidwide');
    expect(byId.get('impact_1')?.unmitigatedDamage).toBe(156798);
    expect(byId.get('raw_steel_1')?.unmitigatedDamage).toBe(1019630);
    expect(byId.get('raw_steel_1')?.classification).toBe('dual_tankbuster');
    expect(byId.get('raw_steel_1')?.targetTank).toBe('both');
    expect(byId.get('heavy_hitter_1')?.time).toBeCloseTo(165.45, 2);
    expect(byId.get('heavy_hitter_1')?.classification).toBe('raidwide');
    expect(byId.get('heavy_hitter_1')?.unmitigatedDamage).toBe(161216);
    expect(byId.get('raw_steel_2')?.unmitigatedDamage).toBe(968221);
    expect(byId.get('raw_steel_2')?.classification).toBe('dual_tankbuster');
    expect(names).not.toContain('Trophy Weapons (Set 1)');
    expect(names).not.toContain('Trophy Weapons (Set 2)');
    expect(names).not.toContain('Ultimate Trophy Weapons');
    expect(names).not.toContain('Atomic Impact + Mammoth Meteor');
    expect(names).not.toContain('Ecliptic Stampede Resolves');
    expect(names).not.toContain('Superbolide');
    expect(names).not.toContain('Orbital Omen');
    expect(names).not.toContain('Fire and Fury / Orbital Omen');
    expect(
      timeline.actions.some((action) => (action.sourceAbilities || []).includes('Superbolide'))
    ).toBe(false);
    expect(byId.get('trophy_weapons_1_resolve_1')?.time).toBeCloseTo(51.685, 3);
    expect(byId.get('trophy_weapons_2_resolve_3')?.time).toBeCloseTo(106.693, 3);
    expect(timeline.actions.filter((action) => action.name.includes('Trophy Weapons')).length).toBe(12);
    expect(byId.get('ultimate_trophy_weapons_resolve_6')?.time).toBeCloseTo(222.227, 3);
    expect(byId.get('mammoth_meteor')?.unmitigatedDamage).toBe(41260);
    expect(byId.get('dance_of_domination')?.classification).toBe('raidwide');
    expect(byId.get('dance_of_domination')?.isMultiHit).toBe(true);
    expect(byId.get('dance_of_domination')?.hitCount).toBe(7);
    expect(byId.get('dance_of_domination')?.unmitigatedDamage).toBe(485548);
    expect(byId.get('dance_of_domination')?.originalDamagePerHit).toBe(69364);
    expect(byId.get('great_wall_of_fire_1')?.classification).toBe('tankbuster');
    expect(byId.get('great_wall_of_fire_1')?.isMultiHit).toBe(true);
    expect(byId.get('great_wall_of_fire_1')?.hitCount).toBe(2);
    expect(byId.get('great_wall_of_fire_1')?.unmitigatedDamage).toBe(1980945);
    expect(byId.get('great_wall_of_fire_1')?.originalDamagePerHit).toBe(990472);
    expect(byId.get('fearsome_fireball_1')?.classification).toBe('small_parties');
    expect(byId.get('fearsome_fireball_1')?.isMultiHit).toBe(true);
    expect(byId.get('fearsome_fireball_1')?.hitCount).toBe(4);
    expect(byId.get('foregone_fatality_1')?.classification).toBe('tankbuster');
    expect(byId.get('foregone_fatality_1')?.isMultiHit).toBe(true);
    expect(byId.get('foregone_fatality_1')?.hitCount).toBe(3);
    expect(byId.get('fire_breath_1')?.classification).toBe('small_parties');
    expect(byId.get('majestic_meteowrath_1')?.name).toBe('Majestic Meteor 2');
    expect(byId.get('majestic_meteowrath_1')?.classification).toBe('small_parties');
    expect(byId.get('majestic_meteowrath_1')?.hitCount).toBe(2);
    expect(byId.get('one_and_only')?.time).toBeCloseTo(242.517, 3);
    expect(byId.get('flatliner')?.time).toBeCloseTo(364.153, 3);
    expect(byId.get('crown_of_arcadia_3')?.time).toBeCloseTo(483.578, 3);
    expect(byId.get('crown_of_arcadia_1')?.phaseId).toBe('unknown-phase');
    expect(byId.get('crown_of_arcadia_1')?.isPhaseAnchor).toBe(false);
    expect(byId.get('comet_crushing_comet_1')?.isPhaseAnchor).toBe(true);
    expect(byId.get('dance_of_domination')?.isPhaseAnchor).toBe(true);
    expect(byId.get('heartbreak_kick_1')?.isPhaseAnchor).toBe(true);
    expect(byId.get('raw_steel_1')?.skipEligible).toBe(false);
    expect(byId.get('heartbreak_kick_1')?.time).toBeCloseTo(597.644, 3);
    expect(byId.get('heartbreak_kick_1')?.hitCount).toBe(5);
    expect(byId.get('heartbreak_kick_2')?.hitCount).toBe(6);
    expect(byId.get('heartbreak_kick_3')?.hitCount).toBe(7);
    expect(byId.has('atomic_impact_opener')).toBe(false);
    expect(byId.has('atomic_impact_sequence')).toBe(false);
    expect(byId.has('atomic_impact_late')).toBe(false);
    expect(byId.has('cosmic_kiss_2')).toBe(false);
    expect(byId.has('weighty_impact')).toBe(false);
  });

  it('preserves branch metadata for future adaptive use', () => {
    const timeline = normalizeTimelineRecord(theTyrantTimeline);
    const branchIds = timeline.adaptiveModel?.branches.map((branch) => branch.id) || [];

    expect(branchIds).toEqual([
      'fight-0-branch-0',
      'fight-0-branch-1',
      'fight-0-branch-2',
      'fight-1-branch-0',
      'fight-1-branch-1',
    ]);
    expect(timeline.adaptiveModel?.branches[0]?.label).toBe('Standard Route');
    expect(timeline.adaptiveModel?.branches[0]?.events).toHaveLength(39);
    expect(timeline.adaptiveModel?.branches[1]?.firstDivergenceTimestamp).toBe('01:36.449');
    expect(timeline.adaptiveModel?.branches[0]?.events.find((action) => action.id === 'flatliner')?.phaseId).toBe(
      'phase_arena_split'
    );
  });
});
