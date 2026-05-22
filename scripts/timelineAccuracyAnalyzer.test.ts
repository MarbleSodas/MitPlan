import { describe, expect, it } from 'vitest';
import {
  analyzeTimelineAccuracy,
  compareActionsToSource,
  normalizeAbilityName,
  parseCactbotTimeline,
  parseFflogsEvents,
} from './timelineAccuracyAnalyzer.js';

describe('timelineAccuracyAnalyzer', () => {
  it('normalizes common timeline naming decorations', () => {
    expect(normalizeAbilityName('Brutal Rain (3 hits)')).toBe('brutal rain');
    expect(normalizeAbilityName('Brutal Rain x3+')).toBe('brutal rain');
    expect(normalizeAbilityName("Mage's Ballad 2")).toBe('mages ballad');
  });

  it('parses cactbot timeline rows while ignoring sync labels', () => {
    const events = parseCactbotTimeline(`
# Comment
hideall "--sync--"
0.0 "--sync--" InCombat { inGameCombat: "1" } window 0,1
10.4 "Killer Voice" Ability { id: "B384", source: "Vamp Fatale" }
46.7 "Brutal Rain x3+" #Ability { id: "B383", source: "Vamp Fatale" } duration 2
137.9 "Sadistic Screech" Ability { id: "B366", source: ["Coffinmaker", "Vamp Fatale"] } # Possible bug in log
`);

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      name: 'Killer Voice',
      time: 10.4,
      eventType: 'Ability',
      ids: ['B384'],
      sources: ['Vamp Fatale'],
    });
    expect(events[1]).toMatchObject({
      name: 'Brutal Rain x3+',
      duration: 2,
    });
    expect(events[2].sources).toEqual(['Coffinmaker', 'Vamp Fatale']);
  });

  it('compares official actions against normalized source events', () => {
    const officialActions = [
      {
        id: 'killer_voice_1',
        name: 'Killer Voice',
        time: 12,
        normalizedNames: ['killer voice'],
      },
      {
        id: 'brutal_rain_1',
        name: 'Brutal Rain (3 hits)',
        time: 49,
        normalizedNames: ['brutal rain'],
      },
    ];
    const sourceEvents = parseCactbotTimeline(`
10.4 "Killer Voice" Ability { id: "B384", source: "Vamp Fatale" }
46.7 "Brutal Rain x3+" #Ability { id: "B383", source: "Vamp Fatale" } duration 2
`);

    const report = compareActionsToSource(officialActions, sourceEvents, {
      sourceKind: 'cactbot',
      toleranceSeconds: 3,
      highDriftSeconds: 8,
    });

    expect(report.summary).toMatchObject({
      matchedCount: 2,
      driftCount: 0,
      missingSourceCount: 0,
    });
    expect(report.matches.map((match) => match.status)).toEqual(['ok', 'ok']);
  });

  it('marks high drift and missing source actions for review', () => {
    const report = compareActionsToSource(
      [
        {
          id: 'late_raidwide',
          name: 'Raidwide',
          time: 30,
          normalizedNames: ['raidwide'],
        },
        {
          id: 'missing_buster',
          name: 'Tankbuster',
          time: 60,
          normalizedNames: ['tankbuster'],
        },
      ],
      parseCactbotTimeline('10.0 "Raidwide" Ability { id: "AAAA", source: "Boss" }'),
      {
        sourceKind: 'cactbot',
        toleranceSeconds: 3,
        highDriftSeconds: 8,
      }
    );

    expect(report.matches.map((match) => match.status)).toEqual(['high_drift', 'missing_source']);
    expect(report.summary.highDriftCount).toBe(1);
    expect(report.summary.missingSourceCount).toBe(1);
  });

  it('parses FF Logs event exports with absolute timestamps', () => {
    const events = parseFflogsEvents({
      startTime: 1_000_000,
      events: [
        {
          timestamp: 1_010_400,
          type: 'damage',
          ability: { name: 'Killer Voice', guid: 45956 },
          source: { name: 'Vamp Fatale' },
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'fflogs',
      name: 'Killer Voice',
      time: 10.4,
      ids: ['45956'],
      sources: ['Vamp Fatale'],
    });
  });

  it('analyzes a timeline using cactbot metadata sources', async () => {
    const timeline = {
      name: 'Test Timeline',
      bossId: 'test-boss',
      analysisSources: [{ kind: 'cactbot', url: 'https://example.test/timeline.txt' }],
      phases: [
        {
          id: 'phase_open',
          name: 'Open',
          order: 0,
          anchorActionId: 'raidwide_1',
          branchIds: ['branch-0'],
          source: 'cactbot',
          skipWindowMode: 'hide_pre_anchor',
        },
      ],
      actions: [
        {
          id: 'raidwide_1',
          name: 'Raidwide',
          time: 10,
          sourceAbilities: ['Raidwide'],
        },
      ],
    };

    const report = await analyzeTimelineAccuracy({
      timeline,
      fetchImpl: async () =>
        new Response('10.2 "Raidwide" Ability { id: "AAAA", source: "Boss" }', {
          status: 200,
        }),
    });

    expect(report.metadata.verdict).toBe('pass');
    expect(report.cactbot.summary.coverageRatio).toBe(1);
    expect(report.phaseAnchors[0]).toMatchObject({
      phaseId: 'phase_open',
      status: 'ok',
    });
  });
});
