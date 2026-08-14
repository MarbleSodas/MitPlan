import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mitigationAbilities } from '../src/data/abilities/mitigationAbilities';
import { officialLocalTimelines } from '../src/data/officialTimelines';

const EXPECTED_JOBS = [
  'PLD', 'WAR', 'DRK', 'GNB',
  'WHM', 'SCH', 'AST', 'SGE',
  'MNK', 'DRG', 'NIN', 'SAM', 'RPR', 'VPR',
  'BRD', 'MCH', 'DNC',
  'BLM', 'SMN', 'RDM', 'PCT',
] as const;

const VOLATILE_KEYS = new Set([
  'createdAt',
  'generatedAt',
  'lastCheckedAt',
  'lastVerifiedAt',
  'likeCount',
  'likedBy',
  'observedAt',
  'updatedAt',
]);

const ENCOUNTER_CODES: Record<string, string> = {
  'dancing-green-m5s': 'M5S',
  'sugar-riot': 'M6S',
  'brute-abominator-m7s': 'M7S',
  'howling-blade-m8s': 'M8S',
  'vamp-fatale-m9s': 'M9S',
  'red-hot-deep-blue-m10s': 'M10S',
  'the-tyrant-m11s': 'M11S',
  'lindwurm-m12s': 'M12S',
  'lindwurm-ii-m12s': 'M12S-II',
};

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type Finding = { severity: 'error' | 'warning'; recordType: string; recordId: string; message: string };

function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function canonicalize(value: unknown): JsonValue {
  if (typeof value === 'string') return normalizeText(value);
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (Array.isArray(value)) {
    const items = value.map(canonicalize);
    if (items.every(item => typeof item === 'string')) {
      return [...items].sort((left, right) => String(left).localeCompare(String(right)));
    }
    if (items.every(item => item && typeof item === 'object' && !Array.isArray(item) && 'id' in item)) {
      return [...items].sort((left, right) =>
        String((left as Record<string, JsonValue>).id).localeCompare(String((right as Record<string, JsonValue>).id))
      );
    }
    return items;
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key, item]) => !VOLATILE_KEYS.has(key) && item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    ) as { [key: string]: JsonValue };
  }
  return String(value);
}

function semanticHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function duplicateValues(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))].sort();
}

function timelineSourceHashes(timeline: Record<string, unknown>): Record<string, string | null> {
  const analysisSources = (timeline.analysisSources as Array<Record<string, unknown>> | undefined) || [];
  const guideSources = (timeline.guideSources as Array<Record<string, unknown>> | undefined) || [];
  return {
    cactbotHash: semanticHash(analysisSources.filter(source => source.kind === 'cactbot')),
    fflogsSourceHash: semanticHash(analysisSources.filter(source => source.kind === 'fflogs')),
    guideSourceHash: semanticHash(guideSources),
    encounterDefinitionHash: semanticHash({
      bossId: timeline.bossId,
      bossTags: timeline.bossTags,
      bossMetadata: timeline.bossMetadata,
      phases: timeline.phases,
    }),
    fflogsPartition: null,
  };
}

function buildInventory(): Record<string, unknown> {
  const findings: Finding[] = [];
  const abilityIds = mitigationAbilities.map(ability => ability.id);
  for (const id of duplicateValues(abilityIds)) {
    findings.push({ severity: 'error', recordType: 'ability', recordId: id, message: 'Duplicate ability ID.' });
  }

  const knownAbilityIds = new Set(abilityIds);
  for (const ability of mitigationAbilities) {
    if (ability.availability === 'retired' && !ability.effectiveToPatch) {
      findings.push({
        severity: 'error',
        recordType: 'ability',
        recordId: ability.id,
        message: 'Retired abilities must declare effectiveToPatch.',
      });
    }
    const references = [
      ability.upgradedBy,
      ability.requiresActiveWindow?.abilityId,
      ...(ability.conditionalBarrierModifiers?.flatMap(modifier => modifier.conditionAbilityIds) || []),
      ...(ability.layeredMitigation?.flatMap(layer => layer.conditionAbilityIds || []) || []),
    ].filter((id): id is string => Boolean(id));
    for (const reference of references) {
      if (!knownAbilityIds.has(reference)) {
        findings.push({
          severity: 'error',
          recordType: 'ability',
          recordId: ability.id,
          message: `Unknown referenced ability ID: ${reference}.`,
        });
      }
    }
  }

  const jobs = [...new Set(mitigationAbilities.flatMap(ability => ability.jobs))].sort();
  const missingJobs = EXPECTED_JOBS.filter(job => !jobs.includes(job));
  const unsupportedJobs = jobs.filter(job => !EXPECTED_JOBS.includes(job as (typeof EXPECTED_JOBS)[number]));
  if (missingJobs.length || unsupportedJobs.length) {
    findings.push({
      severity: 'error',
      recordType: 'inventory',
      recordId: 'jobs',
      message: `Job coverage mismatch. Missing: ${missingJobs.join(', ') || 'none'}; unsupported: ${unsupportedJobs.join(', ') || 'none'}.`,
    });
  }

  const abilities = mitigationAbilities.map(ability => {
    const record = canonicalize({ ...ability, availability: ability.availability ?? 'active' }) as Record<string, JsonValue>;
    return { ...record, semanticHash: semanticHash(record) };
  });

  const timelineIds = officialLocalTimelines.map(timeline => timeline.id);
  for (const id of duplicateValues(timelineIds)) {
    findings.push({ severity: 'error', recordType: 'timeline', recordId: id, message: 'Duplicate timeline ID.' });
  }

  const timelines = officialLocalTimelines.map(timeline => {
    const bossId = String(timeline.bossId || '');
    const expectedId = `official-${bossId}`;
    if (timeline.id !== expectedId) {
      findings.push({
        severity: 'error',
        recordType: 'timeline',
        recordId: timeline.id,
        message: `Official timeline ID must be ${expectedId}.`,
      });
    }

    const actionIds = (timeline.actions || []).map(action => action.id);
    for (const id of duplicateValues(actionIds)) {
      findings.push({ severity: 'error', recordType: 'timeline', recordId: timeline.id, message: `Duplicate action ID: ${id}.` });
    }
    const branchIds = new Set((timeline.adaptiveModel?.branches || []).map(branch => branch.id));
    const phaseIds = (timeline.phases || []).map(phase => phase.id);
    for (const id of duplicateValues(phaseIds)) {
      findings.push({ severity: 'error', recordType: 'timeline', recordId: timeline.id, message: `Duplicate phase ID: ${id}.` });
    }
    for (const phase of timeline.phases || []) {
      if (!actionIds.includes(phase.anchorActionId)) {
        findings.push({
          severity: 'error',
          recordType: 'timeline',
          recordId: timeline.id,
          message: `Phase ${phase.id} references missing anchor action ${phase.anchorActionId}.`,
        });
      }
      for (const branchId of phase.branchIds) {
        if (!branchIds.has(branchId)) {
          findings.push({
            severity: 'error',
            recordType: 'timeline',
            recordId: timeline.id,
            message: `Phase ${phase.id} references missing branch ${branchId}.`,
          });
        }
      }
    }

    const record = canonicalize(timeline) as Record<string, JsonValue>;
    const phaseHashes = Object.fromEntries((timeline.phases || []).map(phase => [phase.id, semanticHash(phase)]));
    const actionHashes = Object.fromEntries((timeline.actions || []).map(action => [action.id, semanticHash(action)]));
    return {
      ...record,
      id: timeline.id,
      bossId,
      encounterCode: ENCOUNTER_CODES[bossId] || null,
      semanticHash: semanticHash(record),
      phaseHashes,
      actionHashes,
      sourceHashes: timelineSourceHashes(timeline as Record<string, unknown>),
    };
  });

  const evidencePath = resolve('data/official-data/timeline-evidence.json');
  if (!existsSync(evidencePath)) {
    findings.push({
      severity: 'error',
      recordType: 'evidence',
      recordId: 'timeline-evidence',
      message: 'Official timeline evidence manifests are missing.',
    });
  } else {
    const evidenceDocument = JSON.parse(readFileSync(evidencePath, 'utf8')) as {
      timelines?: Array<Record<string, unknown>>;
    };
    const evidenceRows = evidenceDocument.timelines || [];
    const evidenceByTimelineId = new Map(evidenceRows.map(row => [String(row.timelineId), row]));
    for (const timeline of timelines) {
      const timelineId = String(timeline.id);
      const manifest = evidenceByTimelineId.get(timelineId);
      if (!manifest) {
        findings.push({ severity: 'error', recordType: 'evidence', recordId: timelineId, message: 'Timeline evidence manifest is missing.' });
        continue;
      }
      if (semanticHash(manifest.sourceHashes) !== semanticHash(timeline.sourceHashes)) {
        findings.push({ severity: 'error', recordType: 'evidence', recordId: timelineId, message: 'Evidence source hashes are stale.' });
      }
      const evidence = (manifest.evidence || {}) as Record<string, unknown>;
      const revisions = (evidence.reportRevisions || []) as Array<Record<string, unknown>>;
      if (revisions.some(row => 'code' in row || 'reportCode' in row || 'playerName' in row)) {
        findings.push({ severity: 'error', recordType: 'evidence', recordId: timelineId, message: 'Evidence manifest contains unsanitized report or player identifiers.' });
      }
      const validation = (manifest.validation || {}) as Record<string, unknown>;
      if (validation.status === 'accepted') {
        const sampleCount = Number(evidence.sampleCount || 0);
        const revisionCount = Number(evidence.reportRevisionCount || 0);
        const unsupportedCount = Number(evidence.unsupportedEventCount || 0);
        const timingSpread = evidence.maximumTimingSpreadSeconds;
        if (sampleCount < 30 || revisionCount < sampleCount || unsupportedCount > 0 || timingSpread === null || Number(timingSpread) > 8) {
          findings.push({ severity: 'error', recordType: 'evidence', recordId: timelineId, message: 'Accepted evidence does not satisfy the clear, revision, support, or timing thresholds.' });
        }
      }
    }
    for (const timelineId of evidenceByTimelineId.keys()) {
      if (!timelineIds.includes(timelineId)) {
        findings.push({ severity: 'error', recordType: 'evidence', recordId: timelineId, message: 'Evidence manifest has no shipped official timeline.' });
      }
    }
  }

  const inventory: Record<string, unknown> = {
    schemaVersion: 1,
    counts: {
      jobs: jobs.length,
      abilities: abilities.length,
      timelines: timelines.length,
      errors: findings.filter(finding => finding.severity === 'error').length,
      warnings: findings.filter(finding => finding.severity === 'warning').length,
    },
    jobs,
    abilities,
    timelines,
    manualOverrides: mitigationAbilities.flatMap(ability =>
      (ability.provenance || [])
        .filter(provenance => provenance.source === 'manual-override')
        .map(provenance => ({ abilityId: ability.id, ...(canonicalize(provenance) as Record<string, JsonValue>) }))
    ),
    findings,
  };
  inventory.semanticHash = semanticHash(inventory);
  return inventory;
}

const args = process.argv.slice(2);
const outputFlag = args.indexOf('--output');
const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : undefined;
const inventory = buildInventory();
const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

if (outputPath) {
  await Bun.write(resolve(outputPath), serialized);
} else {
  process.stdout.write(serialized);
}

if (args.includes('--check') && (inventory.counts as Record<string, number>).errors > 0) {
  process.exitCode = 1;
}
