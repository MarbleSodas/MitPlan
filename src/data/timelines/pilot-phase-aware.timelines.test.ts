import { describe, expect, it } from 'vitest';
import dancingGreenTimeline from './dancing-green-m5s.timeline.json';
import redHotDeepBlueTimeline from './red-hot-deep-blue-m10s.timeline.json';
import sugarRiotTimeline from './sugar-riot.timeline.json';
import { normalizeTimelineRecord } from '../../utils/timeline/adaptiveTimelineUtils';
import { resolvePhaseAwareTimeline } from '../../utils/timeline/phaseOverrideResolver';

describe('phase-aware pilot timelines', () => {
  it('migrates Dancing Green with stable phase ordering and unique action ids', () => {
    const timeline = normalizeTimelineRecord(dancingGreenTimeline);
    const actionIds = timeline.actions.map((action) => action.id);
    const uniqueActionIds = new Set(actionIds);

    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.phases?.map((phase) => phase.id)).toEqual([
      'phase_intro',
      'phase_disco_floor_1',
      'phase_ensemble_1',
      'phase_exafloors',
      'phase_frogtourage_1',
      'phase_ensemble_2',
      'phase_frogtourage_2',
      'phase_disco_floor_2',
    ]);
    expect(timeline.phases?.[6]?.anchorActionId).toBe('back-up_dance_2_2');
    expect(uniqueActionIds.size).toBe(actionIds.length);
    expect(timeline.actions.find((action) => action.id === 'back-up_dance_2_2')?.isPhaseAnchor).toBe(true);
  });

  it('migrates Sugar Riot with phase-aware skip windows for the adds to river transition', () => {
    const resolved = resolvePhaseAwareTimeline(sugarRiotTimeline, {
      phase_river: {
        startTime: 350,
      },
    });

    expect(sugarRiotTimeline.phases.map((phase) => phase.id)).toEqual([
      'phase_blank_canvas_1',
      'phase_desert',
      'phase_adds',
      'phase_river',
      'phase_blank_canvas_2',
    ]);
    expect(resolved.skippedActions.some((action) => action.id === 'color_riot_4')).toBe(true);
    expect(resolved.phaseSummaries.find((summary) => summary.phaseId === 'phase_river')?.hiddenActionCount).toBeGreaterThan(0);
  });

  it('migrates Red Hot & Deep Blue with phase anchors that support pulling arena split earlier', () => {
    const resolved = resolvePhaseAwareTimeline(redHotDeepBlueTimeline, {
      phase_double_alley_oop: {
        startTime: 520,
      },
    });

    expect(redHotDeepBlueTimeline.phases.map((phase) => phase.id)).toEqual([
      'phase_red_hot',
      'phase_deep_blue',
      'phase_insane_air_1',
      'phase_snaking',
      'phase_bubble_deep_aerial',
      'phase_arena_split',
      'phase_insane_air_2',
      'phase_double_alley_oop',
    ]);
    expect(resolved.skippedActions.some((action) => action.id === 'divers_dare_7')).toBe(true);
    expect(resolved.actions.find((action) => action.id === 'alley_oop_double_dip_2')?.time).toBe(520);
  });
});
