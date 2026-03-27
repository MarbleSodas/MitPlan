import { describe, expect, it } from 'vitest';
import vampFataleTimeline from './vamp-fatale-m9s.timeline.json';
import { normalizeTimelineRecord } from '../../utils/timeline/adaptiveTimelineUtils';
import { resolvePhaseAwareTimeline } from '../../utils/timeline/phaseOverrideResolver';

describe('vamp-fatale-m9s adaptive timeline', () => {
  it('migrates Vamp Fatale with stable phase anchors', () => {
    const timeline = normalizeTimelineRecord(vampFataleTimeline);
    const actionIds = new Set(timeline.actions.map((action) => action.id));

    expect(timeline.format).toBe('adaptive_damage');
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_coffinmaker_return',
      'phase_circular_arena',
      'phase_doornail_flail',
      'phase_finale_return',
      'phase_charnel_cell',
    ]);
    expect(timeline.phases?.every((phase) => actionIds.has(phase.anchorActionId))).toBe(true);
    expect(timeline.actions.find((action) => action.id === 'killer_voice_1')?.phaseId).toBe('unknown-phase');
    expect(timeline.actions.find((action) => action.id === 'killer_voice_1')?.skipEligible).toBe(false);
    expect(timeline.actions.find((action) => action.id === 'plummet_1')).toMatchObject({
      phaseId: 'phase_doornail_flail',
      isPhaseAnchor: true,
      skipEligible: false,
    });
  });

  it('hides prior skip-eligible actions when the Doornail / Flail phase is pulled earlier', () => {
    const resolved = resolvePhaseAwareTimeline(vampFataleTimeline, {
      phase_doornail_flail: {
        startTime: 230,
      },
    });

    expect(resolved.actions.find((action) => action.id === 'plummet_1')?.time).toBe(230);
    expect(resolved.skippedActions.some((action) => action.id === 'brutal_rain_2')).toBe(true);
    expect(
      resolved.phaseSummaries.find((summary) => summary.phaseId === 'phase_doornail_flail')
        ?.hiddenActionCount
    ).toBeGreaterThan(0);
  });
});
