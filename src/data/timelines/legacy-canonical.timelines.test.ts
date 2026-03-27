import { describe, expect, it } from 'vitest';
import bruteAbominatorTimeline from './brute-abominator-m7s.timeline.json';
import howlingBladeTimeline from './howling-blade-m8s.timeline.json';
import ketudukeTimeline from './ketuduke.timeline.json';
import lalaTimeline from './lala.timeline.json';
import necronTimeline from './necron.timeline.json';
import staticeTimeline from './statice.timeline.json';
import { normalizeTimelineRecord } from '../../utils/timeline/adaptiveTimelineUtils';
import { resolvePhaseAwareTimeline } from '../../utils/timeline/phaseOverrideResolver';

function expectCanonicalSources(
  timeline: {
    guideSources?: { site: string }[];
    analysisSources?: { kind: string }[];
  }
) {
  expect(timeline.guideSources?.length).toBeGreaterThanOrEqual(2);
  expect(timeline.analysisSources?.map((source) => source.kind)).toEqual([
    'cactbot',
    'fflogs',
    'manual',
  ]);
}

describe('legacy canonical timeline migrations', () => {
  it('migrates the linear Another Aloalo encounters without artificial phases', () => {
    const timelines = [
      ['ketuduke', normalizeTimelineRecord(ketudukeTimeline)],
      ['lala', normalizeTimelineRecord(lalaTimeline)],
      ['statice', normalizeTimelineRecord(staticeTimeline)],
    ] as const;

    timelines.forEach(([bossId, timeline]) => {
      const actionIds = timeline.actions.map((action) => action.id);

      expect(timeline.format).toBe('adaptive_damage');
      expect(timeline.schemaVersion).toBe(2);
      expect(timeline.phases).toEqual([]);
      expect(new Set(actionIds).size).toBe(actionIds.length);
      expect(timeline.resolution?.defaultBranchId).toBe(`${bossId}-branch-0`);
      expect(timeline.actions.every((action) => action.branchId === `${bossId}-branch-0`)).toBe(true);
      expect(timeline.actions.every((action) => action.phaseId === 'unknown-phase')).toBe(true);
      expectCanonicalSources(timeline);
    });
  });

  it('migrates Brute Abominator with stable phase anchors', () => {
    const timeline = normalizeTimelineRecord(bruteAbominatorTimeline);

    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_opening',
      'phase_sinister_seeds',
      'phase_explosion_pulp_smash',
      'phase_neo_bombarian_special',
      'phase_thorny_deathmatch_sporesplosion',
      'phase_strange_seeds',
      'phase_final_enrage_stretch',
    ]);
    expect(timeline.actions.find((action) => action.id === 'strange_seeds_1')).toMatchObject({
      phaseId: 'phase_strange_seeds',
      isPhaseAnchor: true,
      skipEligible: false,
    });
    expectCanonicalSources(timeline);
  });

  it('hides prior skip-eligible actions when Brute Abominator skips ahead to Strange Seeds', () => {
    const resolved = resolvePhaseAwareTimeline(bruteAbominatorTimeline, {
      phase_strange_seeds: {
        startTime: 240,
      },
    });

    expect(resolved.actions.find((action) => action.id === 'strange_seeds_1')?.time).toBe(240);
    expect(resolved.skippedActions.some((action) => action.id === 'abominable_blink_2')).toBe(true);
    expect(
      resolved.phaseSummaries.find((summary) => summary.phaseId === 'phase_strange_seeds')?.hiddenActionCount
    ).toBeGreaterThan(0);
  });

  it('migrates Howling Blade with stable phase anchors across both halves of the fight', () => {
    const timeline = normalizeTimelineRecord(howlingBladeTimeline);

    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_opening',
      'phase_millennial_decay',
      'phase_terrestrial_titans',
      'phase_adds',
      'phase_terrestrial_rage',
      'phase_beckon_moonlight',
      'phase_phase_2_opener',
      'phase_twofold_tempest',
      'phase_champions_circuit',
      'phase_lone_wolf_howling_eight',
    ]);
    expect(timeline.actions.find((action) => action.id === 'howling_eight_1')).toMatchObject({
      phaseId: 'phase_lone_wolf_howling_eight',
      isPhaseAnchor: true,
      skipEligible: false,
    });
    expectCanonicalSources(timeline);
  });

  it('hides prior skip-eligible actions when Howling Blade pulls Howling Eight earlier', () => {
    const resolved = resolvePhaseAwareTimeline(howlingBladeTimeline, {
      phase_lone_wolf_howling_eight: {
        startTime: 900,
      },
    });

    expect(resolved.actions.find((action) => action.id === 'howling_eight_1')?.time).toBe(900);
    expect(resolved.skippedActions.some((action) => action.id === 'ultraviolent_ray_4')).toBe(true);
    expect(
      resolved.phaseSummaries.find((summary) => summary.phaseId === 'phase_lone_wolf_howling_eight')
        ?.hiddenActionCount
    ).toBeGreaterThan(0);
  });

  it('migrates Necron with stable late-fight anchor sections', () => {
    const timeline = normalizeTimelineRecord(necronTimeline);

    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_fear_of_death_1',
      'phase_fear_of_death_2',
      'phase_grand_cross_1',
      'phase_darkness_of_eternity',
      'phase_p2_opener',
      'phase_mass_macabre',
      'phase_fear_of_death_3',
      'phase_grand_cross_2',
    ]);
    expect(timeline.actions.find((action) => action.id === 'grand_cross_finale')).toMatchObject({
      phaseId: 'phase_grand_cross_2',
      isPhaseAnchor: true,
      skipEligible: false,
    });
    expectCanonicalSources(timeline);
  });

  it('hides prior skip-eligible actions when Necron pulls Grand Cross 2 earlier', () => {
    const resolved = resolvePhaseAwareTimeline(necronTimeline, {
      phase_grand_cross_2: {
        startTime: 560,
      },
    });

    expect(resolved.actions.find((action) => action.id === 'grand_cross_finale')?.time).toBe(560);
    expect(resolved.skippedActions.some((action) => action.id === 'smite_of_gloom_2')).toBe(true);
    expect(
      resolved.phaseSummaries.find((summary) => summary.phaseId === 'phase_grand_cross_2')?.hiddenActionCount
    ).toBeGreaterThan(0);
  });
});
