import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const bossesDir = join(projectRoot, 'src', 'data', 'bosses');
const timelinesDir = join(projectRoot, 'src', 'data', 'timelines');

const VERIFIED_AT = '2026-03-26';
const FFLOGS_REPORT_DOCS_URL = 'https://ja.fflogs.com/v2-api-docs/ff/report.doc.html';

const ALOALO_CACTBOT_TIMELINE_URL =
  'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/06-ew/dungeon/another_aloalo_island-savage.txt';
const ALOALO_WRITTEN_GUIDE = {
  site: 'consolegameswiki',
  url: 'https://ffxiv.consolegameswiki.com/wiki/Another_Aloalo_Island_(Savage)',
  title: 'Another Aloalo Island (Savage)',
};

const OFFICIAL_TIMELINE_BOSS_METADATA = {
  'dancing-green-m5s': {
    id: 'dancing-green-m5s',
    name: 'Dancing Green (M5S)',
    description: 'The shameless playboy of Solution Nine, first boss of AAC Cruiserweight Tier (Savage).',
    icon: '💃',
    level: 100,
    baseHealth: { party: 143000, tank: 225000 },
  },
  'sugar-riot': {
    id: 'sugar-riot',
    name: 'Sugar Riot (M6S)',
    description: 'The artistic genius of Solution Nine, second boss of AAC Cruiserweight Tier (Savage).',
    icon: '🎨',
    level: 100,
    baseHealth: { party: 143000, tank: 225000 },
  },
  'red-hot-deep-blue-m10s': {
    id: 'red-hot-deep-blue-m10s',
    name: 'Red Hot & Deep Blue (M10S)',
    description: 'The fiery and frigid duo, second boss of AAC Heavyweight Tier (Savage).',
    icon: '🔥',
    level: 100,
    baseHealth: { party: 143000, tank: 225000 },
  },
  ketuduke: {
    id: 'ketuduke',
    name: 'Ketuduke',
    description: 'The Soul of the South Seas, first boss of Another Aloalo Island (Savage).',
    icon: '🌊',
    level: 90,
    baseHealth: { party: 80000, tank: 120000 },
  },
  lala: {
    id: 'lala',
    name: 'Lala',
    description: 'Math Boss, second boss of Another Aloalo Island (Savage).',
    icon: '➗',
    level: 90,
    baseHealth: { party: 80000, tank: 120000 },
  },
  statice: {
    id: 'statice',
    name: 'Statice',
    description: 'The final boss of Another Aloalo Island (Savage), wielding a gun and powerful magic.',
    icon: '🔫',
    level: 90,
    baseHealth: { party: 80000, tank: 120000 },
  },
  'brute-abominator-m7s': {
    id: 'brute-abominator-m7s',
    name: 'Brute Abominator (M7S)',
    description: 'The monstrous creation of Solution Nine, third boss of AAC Cruiserweight Tier (Savage).',
    icon: '👹',
    level: 100,
    baseHealth: { party: 143000, tank: 225000 },
  },
  'howling-blade-m8s': {
    id: 'howling-blade-m8s',
    name: 'Howling Blade (M8S)',
    description: 'The final boss of AAC Cruiserweight Tier (Savage), wielding a sword and commanding wind and stone.',
    icon: '🐺',
    level: 100,
    baseHealth: { party: 143000, tank: 225000 },
  },
  necron: {
    id: 'necron',
    name: 'Necron',
    description: 'The harbinger of death and darkness, wielding necrotic magic and existential terror.',
    icon: '💀',
    level: 100,
    baseHealth: { party: 143000, tank: 225000 },
  },
};

const OFFICIAL_TIMELINE_CONFIGS = {
  'dancing-green-m5s': {
    filename: 'dancing-green_actions.json',
    shortTags: ['M5S', 'dancing-green'],
    cactbotTimelineUrl: 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r5s.txt',
    description:
      'Phase-aware migrated adaptive timeline for Dancing Green (M5S). Phases are seeded from the cactbot r5s timeline sections and mapped onto the existing mitigation-focused MitPlan action library.',
    manualTitle: 'MitPlan pilot migration',
    manualNotes:
      'Actions are migrated from the existing local boss library and annotated with phase anchors plus skip-eligible windows.',
    phases: [
      { id: 'phase_intro', name: 'Intro', anchorActionId: 'deep_cut_1' },
      { id: 'phase_disco_floor_1', name: 'Disco Floor 1', anchorActionId: 'disco_infernal_1' },
      { id: 'phase_ensemble_1', name: 'Ensemble 1', anchorActionId: 'get_down_1' },
      { id: 'phase_exafloors', name: 'Exafloors', anchorActionId: 'eighth_beats_1' },
      { id: 'phase_frogtourage_1', name: 'Frogtourage 1', anchorActionId: 'disco_infernal_2' },
      { id: 'phase_ensemble_2', name: 'Ensemble 2', anchorActionId: 'get_down_2' },
      { id: 'phase_frogtourage_2', name: 'Frogtourage 2', anchorActionId: 'back-up_dance_2_2' },
      { id: 'phase_disco_floor_2', name: 'Disco Floor 2', anchorActionId: 'quarter_beats_1' },
    ],
  },
  'sugar-riot': {
    filename: 'sugar-riot_actions.json',
    shortTags: ['M6S', 'sugar-riot'],
    cactbotTimelineUrl: 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r6s.txt',
    description:
      'Phase-aware migrated adaptive timeline for Sugar Riot (M6S). Phases are seeded from the cactbot r6s timeline sections and mapped onto the existing mitigation-focused MitPlan action library.',
    manualTitle: 'MitPlan pilot migration',
    manualNotes:
      'Actions are migrated from the existing local boss library and annotated with phase anchors plus skip-eligible windows.',
    phases: [
      { id: 'phase_blank_canvas_1', name: 'Blank Canvas 1', anchorActionId: 'mousse_mural_1' },
      { id: 'phase_desert', name: 'Desert', anchorActionId: 'desert_layer_1' },
      { id: 'phase_adds', name: 'Adds', anchorActionId: 'ready_ore_not_1' },
      { id: 'phase_river', name: 'River', anchorActionId: 'mousse_mural_2' },
      { id: 'phase_blank_canvas_2', name: 'Blank Canvas 2', anchorActionId: 'mousse_mural_3' },
    ],
  },
  'red-hot-deep-blue-m10s': {
    filename: 'red-hot-deep-blue_actions.json',
    shortTags: ['M10S', 'red-hot-deep-blue'],
    cactbotTimelineUrl: 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r10s.txt',
    description:
      'Phase-aware migrated adaptive timeline for Red Hot & Deep Blue (M10S). Phase names follow the cactbot r10s sections and support planner-side skips by pulling later phase anchors earlier.',
    manualTitle: 'MitPlan pilot migration',
    manualNotes:
      'Actions are migrated from the existing local boss library and annotated with phase anchors plus skip-eligible windows.',
    phases: [
      { id: 'phase_red_hot', name: 'Red Hot', anchorActionId: 'hot_impact_1' },
      { id: 'phase_deep_blue', name: 'Deep Blue', anchorActionId: 'sick_swell_1' },
      { id: 'phase_insane_air_1', name: 'Insane Air 1', anchorActionId: 'plunging_blasting_snap_1' },
      { id: 'phase_snaking', name: 'Snaking', anchorActionId: 'firesnaking_watersnaking_1' },
      { id: 'phase_bubble_deep_aerial', name: 'Bubble / Deep Aerial', anchorActionId: 'deep_aerial_1' },
      { id: 'phase_arena_split', name: 'Arena Split', anchorActionId: 'divers_dare_5' },
      { id: 'phase_insane_air_2', name: 'Insane Air 2', anchorActionId: 'plunging_blasting_snap_3' },
      { id: 'phase_double_alley_oop', name: 'Double Alley-oop', anchorActionId: 'alley_oop_double_dip_2' },
    ],
  },
  ketuduke: {
    filename: 'ketudukeActions.json',
    shortTags: [],
    cactbotTimelineUrl: ALOALO_CACTBOT_TIMELINE_URL,
    writtenGuide: ALOALO_WRITTEN_GUIDE,
    description:
      'Linear migrated adaptive timeline for Ketuduke. The existing mitigation-focused action library is preserved and wrapped in the canonical adaptive timeline schema without artificial phase segmentation.',
    manualTitle: 'MitPlan legacy criterion migration',
    manualNotes:
      'The current local mitigation timeline is preserved as a linear adaptive route because the encounter remains planner-linear for this project.',
    phases: [],
  },
  lala: {
    filename: 'lala_actions.json',
    shortTags: [],
    cactbotTimelineUrl: ALOALO_CACTBOT_TIMELINE_URL,
    writtenGuide: ALOALO_WRITTEN_GUIDE,
    description:
      'Linear migrated adaptive timeline for Lala. The existing mitigation-focused action library is preserved and wrapped in the canonical adaptive timeline schema without artificial phase segmentation.',
    manualTitle: 'MitPlan legacy criterion migration',
    manualNotes:
      'The current local mitigation timeline is preserved as a linear adaptive route because the encounter remains planner-linear for this project.',
    phases: [],
  },
  statice: {
    filename: 'statice_actions.json',
    shortTags: [],
    cactbotTimelineUrl: ALOALO_CACTBOT_TIMELINE_URL,
    writtenGuide: ALOALO_WRITTEN_GUIDE,
    description:
      'Linear migrated adaptive timeline for Statice. The existing mitigation-focused action library is preserved and wrapped in the canonical adaptive timeline schema without artificial phase segmentation.',
    manualTitle: 'MitPlan legacy criterion migration',
    manualNotes:
      'The current local mitigation timeline is preserved as a linear adaptive route because the encounter remains planner-linear for this project.',
    phases: [],
  },
  'brute-abominator-m7s': {
    filename: 'brute-abominator_actions.json',
    shortTags: ['M7S', 'brute-abominator'],
    cactbotTimelineUrl: 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r7s.txt',
    writtenGuide: {
      site: 'icy-veins',
      url: 'https://www.icy-veins.com/ffxiv/aac-cruiserweight-m3-savage-raid-guide',
      title: 'AAC Cruiserweight M3 (Savage) Raid Guide for FFXIV',
    },
    description:
      'Phase-aware migrated adaptive timeline for Brute Abominator (M7S). Cactbot section boundaries are mapped onto the existing mitigation-focused local route so planner phase overrides can target the major deathmatch sections cleanly.',
    manualTitle: 'MitPlan legacy savage migration',
    manualNotes:
      'Actions are preserved from the existing local mitigation route and annotated with cactbot-aligned phase anchors plus skip windows.',
    phases: [
      { id: 'phase_opening', name: 'Opening', anchorActionId: 'brutal_impact_1' },
      { id: 'phase_sinister_seeds', name: 'Sinister Seeds', anchorActionId: 'sinister_seeds_1' },
      { id: 'phase_explosion_pulp_smash', name: 'Explosion / Pulp Smash', anchorActionId: 'explosion_1' },
      { id: 'phase_neo_bombarian_special', name: 'Neo Bombarian Special', anchorActionId: 'neo_bombarian_special_1' },
      {
        id: 'phase_thorny_deathmatch_sporesplosion',
        name: 'Thorny Deathmatch / Sporesplosion',
        anchorActionId: 'abominable_blink_1',
      },
      { id: 'phase_strange_seeds', name: 'Strange Seeds', anchorActionId: 'strange_seeds_1' },
      { id: 'phase_final_enrage_stretch', name: 'Final Enrage Stretch', anchorActionId: 'brutal_impact_2' },
    ],
  },
  'howling-blade-m8s': {
    filename: 'howling-blade_actions.json',
    shortTags: ['M8S', 'howling-blade'],
    cactbotTimelineUrl: 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r8s.txt',
    writtenGuide: {
      site: 'icy-veins',
      url: 'https://www.icy-veins.com/ffxiv/aac-cruiserweight-m4-savage-raid-guide',
      title: 'AAC Cruiserweight M4 (Savage) Raid Guide for FFXIV',
    },
    description:
      'Phase-aware migrated adaptive timeline for Howling Blade (M8S). The canonical mitigation route keeps its local action timing while gaining cactbot-aligned phase anchors for the intermission and phase-two sections.',
    manualTitle: 'MitPlan legacy savage migration',
    manualNotes:
      'Actions are preserved from the existing local mitigation route and annotated with cactbot-aligned phase anchors plus skip windows.',
    phases: [
      { id: 'phase_opening', name: 'Opening', anchorActionId: 'extraplanar_pursuit_1' },
      { id: 'phase_millennial_decay', name: 'Millennial Decay', anchorActionId: 'millenial_decay_1' },
      { id: 'phase_terrestrial_titans', name: 'Terrestrial Titans', anchorActionId: 'terrestrial_titans_1' },
      { id: 'phase_adds', name: 'Adds', anchorActionId: 'howling_havoc_1' },
      { id: 'phase_terrestrial_rage', name: 'Terrestrial Rage', anchorActionId: 'ravenous_saber_1' },
      { id: 'phase_beckon_moonlight', name: 'Beckon Moonlight', anchorActionId: 'beckon_moonlight_1' },
      { id: 'phase_phase_2_opener', name: 'Phase 2 Opener', anchorActionId: 'quake_iii_1' },
      { id: 'phase_twofold_tempest', name: 'Twofold Tempest', anchorActionId: 'twofold_tempest_1' },
      { id: 'phase_champions_circuit', name: "Champion's Circuit", anchorActionId: 'champions_circuit_1' },
      { id: 'phase_lone_wolf_howling_eight', name: 'Lone Wolf / Howling Eight', anchorActionId: 'howling_eight_1' },
    ],
  },
  necron: {
    filename: 'necron_actions.json',
    shortTags: ['necron-ex'],
    cactbotTimelineUrl: 'https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/trial/necron-ex.txt',
    writtenGuide: {
      site: 'icy-veins',
      url: 'https://www.icy-veins.com/ffxiv/necrons-embrace-extreme-trial-guide',
      title: "The Minstrel's Ballad: Necron's Embrace Extreme Trial Guide for FFXIV",
    },
    description:
      "Phase-aware migrated adaptive timeline for Necron. The local mitigation route is preserved while cactbot section markers are mapped onto the major Fear of Death, Grand Cross, and post-transition sections.",
    manualTitle: 'MitPlan legacy trial migration',
    manualNotes:
      'Actions are preserved from the existing local mitigation route and annotated with cactbot-aligned phase anchors plus skip windows.',
    phases: [
      { id: 'phase_fear_of_death_1', name: 'Fear of Death 1', anchorActionId: 'fear_of_death_1' },
      { id: 'phase_fear_of_death_2', name: 'Fear of Death 2', anchorActionId: 'fear_of_death_2' },
      { id: 'phase_grand_cross_1', name: 'Grand Cross 1', anchorActionId: 'grand_cross_1' },
      { id: 'phase_darkness_of_eternity', name: 'Darkness of Eternity', anchorActionId: 'darkness_of_eternity_1' },
      { id: 'phase_p2_opener', name: 'P2 Opener', anchorActionId: 'ends_embrace_2' },
      { id: 'phase_mass_macabre', name: 'Mass Macabre', anchorActionId: 'macabre_mark_1' },
      { id: 'phase_fear_of_death_3', name: 'Fear of Death 3', anchorActionId: 'fear_of_death_3' },
      { id: 'phase_grand_cross_2', name: 'Grand Cross 2', anchorActionId: 'grand_cross_finale' },
    ],
  },
};

function loadBossActions(filename) {
  const filePath = join(bossesDir, filename);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function uniquifyActionIds(actions) {
  const counts = new Map();

  return actions.map((action) => {
    const currentCount = (counts.get(action.id) || 0) + 1;
    counts.set(action.id, currentCount);

    return {
      ...action,
      id: currentCount === 1 ? action.id : `${action.id}_${currentCount}`,
    };
  });
}

function buildTimelinePhases(phases, branchId) {
  return phases.map((phase, index) => ({
    ...phase,
    order: index,
    branchIds: [branchId],
    source: 'cactbot',
    skipWindowMode: 'hide_pre_anchor',
  }));
}

function assignPhaseIds(actions, phases) {
  const anchorIndexById = new Map(
    phases.map((phase) => [phase.anchorActionId, actions.findIndex((action) => action.id === phase.anchorActionId)])
  );

  for (const phase of phases) {
    if (!anchorIndexById.has(phase.anchorActionId) || anchorIndexById.get(phase.anchorActionId) === -1) {
      throw new Error(`Missing anchor action "${phase.anchorActionId}" for phase "${phase.id}"`);
    }
  }

  const sortedPhases = [...phases].sort(
    (left, right) => anchorIndexById.get(left.anchorActionId) - anchorIndexById.get(right.anchorActionId)
  );
  const anchorIds = new Set(sortedPhases.map((phase) => phase.anchorActionId));

  return actions.map((action, index) => {
    let currentPhase = sortedPhases[0];

    for (const phase of sortedPhases) {
      const anchorIndex = anchorIndexById.get(phase.anchorActionId);
      if (anchorIndex <= index) {
        currentPhase = phase;
      } else {
        break;
      }
    }

    return {
      ...action,
      phaseId: currentPhase.id,
      isPhaseAnchor: anchorIds.has(action.id),
      skipEligible: !anchorIds.has(action.id),
    };
  });
}

function buildGuideSources(config) {
  const guideSources = [
    {
      site: 'cactbot',
      url: config.cactbotTimelineUrl,
      title: `cactbot ${config.shortTags[0] || config.id || 'timeline'} timeline`.trim(),
      lastVerifiedAt: VERIFIED_AT,
    },
  ];

  if (config.writtenGuide) {
    guideSources.push({
      ...config.writtenGuide,
      lastVerifiedAt: VERIFIED_AT,
    });
  }

  return guideSources;
}

function buildAnalysisSources(config) {
  const notes = config.phases?.length
    ? 'Section labels seed the planner-visible phase names and ordering.'
    : 'The cactbot timeline is cited for encounter sequencing while the planner route remains intentionally linear.';

  return [
    {
      kind: 'cactbot',
      url: config.cactbotTimelineUrl,
      title: `cactbot ${config.shortTags[0] || config.id || 'timeline'} timeline`.trim(),
      lastVerifiedAt: VERIFIED_AT,
      notes,
    },
    {
      kind: 'fflogs',
      url: FFLOGS_REPORT_DOCS_URL,
      title: 'FF Logs report API docs',
      lastVerifiedAt: VERIFIED_AT,
      notes: config.phases?.length
        ? 'Planner phase overrides follow the same fight-phase timing model used for FF Logs report analysis.'
        : 'The canonical adaptive format keeps FF Logs-compatible source metadata even when the planner route remains linear.',
    },
    {
      kind: 'manual',
      title: config.manualTitle,
      lastVerifiedAt: VERIFIED_AT,
      notes: config.manualNotes,
    },
  ];
}

function buildTimelineActions(sourceActions, phases, branchId) {
  const baseActions =
    phases.length > 0
      ? assignPhaseIds(sourceActions, phases)
      : sourceActions.map((action) => ({
          ...action,
          isPhaseAnchor: false,
          skipEligible: false,
        }));

  const sourceKind = phases.length > 0 ? 'legacy_phase_migrated' : 'legacy_linear_migrated';

  return baseActions.map((action) => ({
    ...action,
    branchId,
    sourceKind,
    sourceAbilities:
      Array.isArray(action.sourceAbilities) && action.sourceAbilities.length > 0
        ? action.sourceAbilities
        : [action.name],
  }));
}

function buildTimelineDocument(boss, config) {
  const branchId = `${boss.id}-branch-0`;
  const sourceActions = uniquifyActionIds(loadBossActions(config.filename));
  const phases = buildTimelinePhases(config.phases || [], branchId);
  const timelineActions = buildTimelineActions(sourceActions, phases, branchId);

  return {
    name: `${boss.name} - Official Adaptive Timeline`,
    description: config.description,
    schemaVersion: 2,
    format: 'adaptive_damage',
    bossId: boss.id,
    bossTags: Array.from(new Set([boss.id, ...(config.shortTags || [])])),
    bossMetadata: {
      level: boss.level,
      name: boss.name,
      icon: boss.icon,
      description: boss.description,
      baseHealth: boss.baseHealth,
    },
    guideSources: buildGuideSources({ ...config, id: boss.id }),
    analysisSources: buildAnalysisSources({ ...config, id: boss.id }),
    resolution: {
      defaultBranchId: branchId,
    },
    phases,
    actions: timelineActions,
    adaptiveModel: {
      branches: [
        {
          id: branchId,
          label: phases.length > 0 ? 'Default Route' : 'Linear Route',
          description:
            phases.length > 0
              ? 'Phase-aware migrated route built from the existing MitPlan action library.'
              : 'Linear migrated route built from the existing MitPlan action library.',
          sampleCount: 1,
          sampleRatio: 1,
          isPrimaryBranch: true,
          firstDivergenceTimestampMs: null,
          firstDivergenceTimestamp: null,
          eventCount: timelineActions.length,
          events: timelineActions,
        },
      ],
    },
  };
}

function writeTimeline(bossId, timeline) {
  const targetPath = join(timelinesDir, `${bossId}.timeline.json`);
  writeFileSync(targetPath, `${JSON.stringify(timeline, null, 2)}\n`, 'utf8');
  return targetPath;
}

function resolveRequestedBossIds() {
  const requestedBossIds = process.argv.slice(2);
  if (requestedBossIds.length === 0) {
    return Object.keys(OFFICIAL_TIMELINE_CONFIGS);
  }

  for (const bossId of requestedBossIds) {
    if (!OFFICIAL_TIMELINE_CONFIGS[bossId]) {
      throw new Error(`Unknown boss id: ${bossId}`);
    }
  }

  return requestedBossIds;
}

function main() {
  const requestedBossIds = resolveRequestedBossIds();
  let writtenCount = 0;

  requestedBossIds.forEach((bossId) => {
    const boss = OFFICIAL_TIMELINE_BOSS_METADATA[bossId];
    if (!boss) {
      throw new Error(`Unknown boss metadata for: ${bossId}`);
    }

    const timeline = buildTimelineDocument(boss, OFFICIAL_TIMELINE_CONFIGS[bossId]);
    const targetPath = writeTimeline(bossId, timeline);
    writtenCount += 1;
    console.log(`Wrote ${targetPath}`);
  });

  console.log(`Generated ${writtenCount} official adaptive timelines.`);
}

main();
