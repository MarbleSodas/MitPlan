import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const projectRoot = join(__dirname, '..');
export const bossesDir = join(projectRoot, 'src', 'data', 'bosses');
export const timelinesDir = join(projectRoot, 'src', 'data', 'timelines');

export const BOSS_JSON_MAP = {
  'sugar-riot': 'sugar-riot_actions.json',
  'dancing-green-m5s': 'dancing-green_actions.json',
  'lala': 'lala_actions.json',
  'statice': 'statice_actions.json',
  'brute-abominator-m7s': 'brute-abominator_actions.json',
  'howling-blade-m8s': 'howling-blade_actions.json',
  'necron': 'necron_actions.json',
  'ketuduke': 'ketudukeActions.json',
  'vamp-fatale-m9s': 'vamp-fatale_actions.json',
  'red-hot-deep-blue-m10s': 'red-hot-deep-blue_actions.json'
};

export function loadActionsForBoss(
  bossId,
  {
    bossesDirectory = bossesDir,
    logger = console,
  } = {}
) {
  const filename = BOSS_JSON_MAP[bossId];
  if (!filename) {
    logger.warn(`  - No JSON mapping found for bossId: ${bossId}, skipping`);
    return null;
  }

  const filePath = join(bossesDirectory, filename);
  if (!existsSync(filePath)) {
    logger.warn(`  - JSON file not found: ${filePath}, skipping`);
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const actions = JSON.parse(content);
    if (!Array.isArray(actions)) {
      logger.warn(`  - JSON did not contain an array for ${bossId}, got ${typeof actions}`);
      return null;
    }
    return actions;
  } catch (error) {
    logger.warn(`  - Failed to load/parse actions for ${bossId}: ${error.message}`);
    return null;
  }
}

export function loadCanonicalTimelineForBoss(
  boss,
  {
    bossesDirectory = bossesDir,
    timelinesDirectory = timelinesDir,
    logger = console,
  } = {}
) {
  const timelinePath = join(timelinesDirectory, `${boss.id}.timeline.json`);
  if (existsSync(timelinePath)) {
    try {
      const content = readFileSync(timelinePath, 'utf8');
      const timeline = JSON.parse(content);
      return {
        ...timeline,
        bossId: timeline.bossId || boss.id,
        bossTags: Array.isArray(timeline.bossTags) && timeline.bossTags.length > 0 ? timeline.bossTags : [boss.id],
        bossMetadata: timeline.bossMetadata || {
          level: boss.level,
          name: boss.name,
          icon: boss.icon,
          description: boss.description,
          baseHealth: boss.baseHealth
        },
        actions: Array.isArray(timeline.actions) ? timeline.actions : [],
        adaptiveModel: timeline.adaptiveModel || null,
        resolution: timeline.resolution || null,
        phases: Array.isArray(timeline.phases) ? timeline.phases : [],
        analysisSources: Array.isArray(timeline.analysisSources) ? timeline.analysisSources : [],
        format: timeline.format || (timeline.adaptiveModel ? 'adaptive_damage' : 'legacy_flat'),
        schemaVersion: timeline.schemaVersion || 1,
        guideSources: Array.isArray(timeline.guideSources) ? timeline.guideSources : []
      };
    } catch (error) {
      logger.warn(`  - Failed to load/parse adaptive timeline for ${boss.id}: ${error.message}`);
    }
  }

  const actions = loadActionsForBoss(boss.id, { bossesDirectory, logger });
  return {
    name: `${boss.name} - Official Timeline`,
    description: `Official timeline for ${boss.name} encounter`,
    bossId: boss.id,
    bossTags: [boss.id],
    bossMetadata: {
      level: boss.level,
      name: boss.name,
      icon: boss.icon,
      description: boss.description,
      baseHealth: boss.baseHealth
    },
    actions,
    adaptiveModel: null,
    resolution: null,
    phases: [],
    analysisSources: [],
    format: 'legacy_flat',
    schemaVersion: 1,
    guideSources: []
  };
}

export function buildOfficialTimelineData(
  boss,
  timelineDefinition,
  {
    now = Date.now(),
    createdAt,
  } = {}
) {
  return {
    name: timelineDefinition.name || `${boss.name} - Official Timeline`,
    description: timelineDefinition.description || `Official timeline for ${boss.name} encounter`,
    bossId: timelineDefinition.bossId || boss.id,
    bossTags: timelineDefinition.bossTags || [boss.id],
    bossMetadata: timelineDefinition.bossMetadata || {
      level: boss.level,
      name: boss.name,
      icon: boss.icon,
      description: boss.description,
      baseHealth: boss.baseHealth
    },
    actions: timelineDefinition.actions || [],
    adaptiveModel: timelineDefinition.adaptiveModel || null,
    resolution: timelineDefinition.resolution || null,
    phases: timelineDefinition.phases || [],
    analysisSources: timelineDefinition.analysisSources || [],
    format: timelineDefinition.format || 'legacy_flat',
    schemaVersion: timelineDefinition.schemaVersion || 1,
    guideSources: timelineDefinition.guideSources || [],
    official: true,
    isPublic: true,
    userId: 'system',
    ownerId: 'system',
    createdAt: createdAt ?? now,
    updatedAt: now,
    version: timelineDefinition.format === 'adaptive_damage' ? 3.0 : 2.1
  };
}

export function selectTimelineToKeep(existingTimelines) {
  const sorted = [...existingTimelines].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return {
    toKeep: sorted[0] || null,
    duplicates: sorted.slice(1),
  };
}
