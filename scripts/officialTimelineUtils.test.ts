import { describe, expect, it } from 'vitest';
import { bosses } from '../src/data/bosses/bossData.js';
import {
  buildOfficialTimelineData,
  loadCanonicalTimelineForBoss,
  selectTimelineToKeep,
} from './officialTimelineUtils.js';

const ketudukeBoss = bosses.find((boss) => boss.id === 'ketuduke');
const howlingBladeBoss = bosses.find((boss) => boss.id === 'howling-blade-m8s');
const necronBoss = bosses.find((boss) => boss.id === 'necron');
const tyrantBoss = bosses.find((boss) => boss.id === 'the-tyrant-m11s');
const redHotBoss = bosses.find((boss) => boss.id === 'red-hot-deep-blue-m10s');
const vampBoss = bosses.find((boss) => boss.id === 'vamp-fatale-m9s');

describe('officialTimelineUtils', () => {
  it('loads adaptive canonical timeline data for Ketuduke without phase metadata', () => {
    expect(ketudukeBoss).toBeTruthy();

    const timeline = loadCanonicalTimelineForBoss(ketudukeBoss);

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.actions).toHaveLength(18);
    expect(timeline.resolution?.defaultBranchId).toBe('ketuduke-branch-0');
    expect(timeline.phases).toEqual([]);
    expect(timeline.guideSources?.length).toBeGreaterThanOrEqual(2);
  });

  it('loads adaptive canonical timeline data for M9S', () => {
    expect(vampBoss).toBeTruthy();

    const timeline = loadCanonicalTimelineForBoss(vampBoss);

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.actions).toHaveLength(35);
    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_coffinmaker_return',
      'phase_circular_arena',
      'phase_doornail_flail',
      'phase_finale_return',
      'phase_charnel_cell',
    ]);
  });

  it('loads adaptive canonical timeline data for M11S', () => {
    expect(tyrantBoss).toBeTruthy();

    const timeline = loadCanonicalTimelineForBoss(tyrantBoss);

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.actions).toHaveLength(39);
    expect(timeline.resolution?.defaultBranchId).toBe('fight-0-branch-0');
    expect(timeline.phases?.length).toBe(7);
    expect(Array.isArray(timeline.adaptiveModel?.branches)).toBe(true);
    expect(timeline.adaptiveModel?.branches?.length).toBeGreaterThan(1);
  });

  it('loads adaptive canonical timeline data for M8S', () => {
    expect(howlingBladeBoss).toBeTruthy();

    const timeline = loadCanonicalTimelineForBoss(howlingBladeBoss);

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.actions).toHaveLength(47);
    expect(timeline.resolution?.defaultBranchId).toBe('howling-blade-m8s-branch-0');
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
  });

  it('loads adaptive canonical timeline data for Necron', () => {
    expect(necronBoss).toBeTruthy();

    const timeline = loadCanonicalTimelineForBoss(necronBoss);

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.actions).toHaveLength(25);
    expect(timeline.resolution?.defaultBranchId).toBe('necron-branch-0');
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
  });

  it('builds official adaptive documents with the new schema fields', () => {
    const now = 1_716_000_000_000;
    const createdAt = now - 5_000;
    const timeline = loadCanonicalTimelineForBoss(tyrantBoss);

    const document = buildOfficialTimelineData(tyrantBoss, timeline, {
      now,
      createdAt,
    });

    expect(document.bossId).toBe('the-tyrant-m11s');
    expect(document.format).toBe('adaptive_damage');
    expect(document.schemaVersion).toBe(2);
    expect(document.version).toBe(3.0);
    expect(document.createdAt).toBe(createdAt);
    expect(document.updatedAt).toBe(now);
    expect(document.actions).toHaveLength(39);
    expect(document.adaptiveModel?.branches?.length).toBeGreaterThan(1);
    expect(document.phases?.[0]?.id).toBe('phase_comet_crushing_comet');
  });

  it('keeps the oldest official timeline when deduplicating', () => {
    const selection = selectTimelineToKeep([
      { key: 'newest', createdAt: 300 },
      { key: 'oldest', createdAt: 100 },
      { key: 'middle', createdAt: 200 },
    ]);

    expect(selection.toKeep?.key).toBe('oldest');
    expect(selection.duplicates.map((timeline) => timeline.key)).toEqual(['middle', 'newest']);
  });

  it('preserves phase metadata for phase-aware pilot timelines', () => {
    expect(redHotBoss).toBeTruthy();

    const timeline = loadCanonicalTimelineForBoss(redHotBoss);
    const document = buildOfficialTimelineData(redHotBoss, timeline, {
      now: 1_716_000_000_000,
    });

    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.phases?.length).toBeGreaterThan(1);
    expect(document.phases?.[0]?.id).toBe('phase_red_hot');
    expect(document.analysisSources?.some((source) => source.kind === 'cactbot')).toBe(true);
  });
});
