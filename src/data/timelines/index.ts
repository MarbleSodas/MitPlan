import bruteAbominatorM7STimeline from './brute-abominator-m7s.timeline.json';
import dancingGreenM5STimeline from './dancing-green-m5s.timeline.json';
import howlingBladeM8STimeline from './howling-blade-m8s.timeline.json';
import ketudukeTimeline from './ketuduke.timeline.json';
import lalaTimeline from './lala.timeline.json';
import necronTimeline from './necron.timeline.json';
import redHotDeepBlueM10STimeline from './red-hot-deep-blue-m10s.timeline.json';
import staticeTimeline from './statice.timeline.json';
import sugarRiotTimeline from './sugar-riot.timeline.json';
import theTyrantM11STimeline from './the-tyrant-m11s.timeline.json';
import vampFataleM9STimeline from './vamp-fatale-m9s.timeline.json';
import type { Timeline } from '../../types';
import { normalizeTimelineRecord } from '../../utils/timeline/adaptiveTimelineUtils';
import { syncTimelineBossActionsWithClassification } from '../../utils/boss/bossActionUtils';

const officialAdaptiveTimelinesEntries = [
  [
    'ketuduke',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(ketudukeTimeline as Timeline)
    ),
  ],
  [
    'lala',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(lalaTimeline as Timeline)
    ),
  ],
  [
    'statice',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(staticeTimeline as Timeline)
    ),
  ],
  [
    'vamp-fatale-m9s',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(vampFataleM9STimeline as Timeline)
    ),
  ],
  [
    'dancing-green-m5s',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(dancingGreenM5STimeline as Timeline)
    ),
  ],
  [
    'red-hot-deep-blue-m10s',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(redHotDeepBlueM10STimeline as Timeline)
    ),
  ],
  [
    'sugar-riot',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(sugarRiotTimeline as Timeline)
    ),
  ],
  [
    'brute-abominator-m7s',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(bruteAbominatorM7STimeline as Timeline)
    ),
  ],
  [
    'howling-blade-m8s',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(howlingBladeM8STimeline as Timeline)
    ),
  ],
  [
    'the-tyrant-m11s',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(theTyrantM11STimeline as Timeline)
    ),
  ],
  [
    'necron',
    syncTimelineBossActionsWithClassification(
      normalizeTimelineRecord(necronTimeline as Timeline)
    ),
  ],
] as const;

export const officialAdaptiveTimelinesMap = Object.fromEntries(
  officialAdaptiveTimelinesEntries
) as Record<string, Timeline>;

export const officialAdaptiveTimelines = Object.values(officialAdaptiveTimelinesMap);

export const officialAdaptiveActionsMap = Object.fromEntries(
  officialAdaptiveTimelinesEntries.map(([bossId, timeline]) => [bossId, timeline.actions])
) as Record<string, Timeline['actions']>;

export function getOfficialAdaptiveTimeline(bossId: string): Timeline | null {
  return officialAdaptiveTimelinesMap[bossId] || null;
}
