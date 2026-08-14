import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { mitigationAbilities } from '../src/data/abilities/mitigationAbilities';
import type { MitigationAbility } from '../src/types';

type Operation = {
  op: 'add' | 'remove' | 'replace' | 'retire';
  path: string;
  before?: unknown;
  after?: unknown;
  id?: string;
  availability?: 'retired';
  effectiveToPatch?: string;
};

type Differential = {
  blockedOperationCount: number;
  blockers: unknown[];
  operations: Operation[];
};

type PathSegment = { key: string; selectorKey?: string; selectorValue?: string };

const NON_RUNTIME_FIELDS = new Set([
  'actionHashes',
  'encounterCode',
  'phaseHashes',
  'semanticHash',
  'sourceHashes',
]);

function parseSegments(path: string): PathSegment[] {
  return path.split('.').filter(Boolean).map(segment => {
    const match = segment.match(/^([^\[]+)(?:\[([^=]+)=([^\]]+)\])?$/);
    if (!match) throw new Error(`Unsupported semantic path segment: ${segment}`);
    return { key: match[1]!, selectorKey: match[2], selectorValue: match[3] };
  });
}

function resolveSegment(parent: Record<string, unknown>, segment: PathSegment, create: boolean): unknown {
  if (!segment.selectorKey) {
    if (create && (parent[segment.key] === undefined || parent[segment.key] === null)) parent[segment.key] = {};
    return parent[segment.key];
  }
  const rows = parent[segment.key];
  if (!Array.isArray(rows)) throw new Error(`${segment.key} is not an array`);
  let row = rows.find(item => item && typeof item === 'object' && String(item[segment.selectorKey!]) === segment.selectorValue);
  if (!row && create) {
    row = { [segment.selectorKey]: segment.selectorValue };
    rows.push(row);
  }
  return row;
}

function applyNestedOperation(target: Record<string, unknown>, path: string, operation: Operation): void {
  const segments = parseSegments(path);
  if (!segments.length) throw new Error(`Operation has no writable field: ${operation.path}`);
  let parent: Record<string, unknown> = target;
  for (const segment of segments.slice(0, -1)) {
    const next = resolveSegment(parent, segment, operation.op !== 'remove');
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      throw new Error(`Could not resolve ${segment.key} in ${operation.path}`);
    }
    parent = next as Record<string, unknown>;
  }

  const leaf = segments.at(-1)!;
  if (leaf.selectorKey) {
    const rows = parent[leaf.key];
    if (!Array.isArray(rows)) throw new Error(`${leaf.key} is not an array`);
    const index = rows.findIndex(item => item && typeof item === 'object' && String(item[leaf.selectorKey!]) === leaf.selectorValue);
    if (operation.op === 'remove') {
      if (index >= 0) rows.splice(index, 1);
    } else if (index >= 0) {
      rows[index] = structuredClone(operation.after);
    } else {
      rows.push(structuredClone(operation.after));
    }
    return;
  }

  if (operation.op === 'remove') delete parent[leaf.key];
  else parent[leaf.key] = structuredClone(operation.after);
}

function stripInventoryMetadata(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !NON_RUNTIME_FIELDS.has(key)));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const diffIndex = args.indexOf('--diff');
  if (diffIndex < 0 || !args[diffIndex + 1]) throw new Error('--diff is required');
  const differential = JSON.parse(readFileSync(resolve(args[diffIndex + 1]!), 'utf8')) as Differential;
  if (differential.blockedOperationCount || differential.blockers?.length) {
    throw new Error('Refusing to apply a differential with blockers');
  }

  const dryRun = args.includes('--dry-run');
  const abilityById = new Map(
    mitigationAbilities.map(ability => [ability.id, structuredClone(ability) as Record<string, unknown>])
  );
  const changedAbilityIds = new Set<string>();
  const changedTimelineIds = new Set<string>();
  const timelineFiles = new Map<string, { path: string; value: Record<string, unknown> }>();
  for (const filename of readdirSync(resolve('src/data/timelines')).filter(name => name.endsWith('.timeline.json'))) {
    const path = resolve('src/data/timelines', filename);
    const value = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    timelineFiles.set(`official-${String(value.bossId || '')}`, { path, value });
  }

  for (const operation of differential.operations || []) {
    if (operation.op === 'retire') {
      const id = String(operation.id || '');
      const ability = abilityById.get(id);
      if (!ability) throw new Error(`Cannot retire unknown ability ${id}`);
      ability.availability = 'retired';
      ability.effectiveToPatch = operation.effectiveToPatch;
      changedAbilityIds.add(id);
      continue;
    }

    const recordMatch = operation.path.match(/^(abilities|timelines)\[id=([^\]]+)\](?:\.(.*))?$/);
    if (!recordMatch) throw new Error(`Unsupported differential path: ${operation.path}`);
    const [, collection, id, remainder] = recordMatch;
    if (collection === 'abilities') {
      if (!remainder && operation.op === 'add') {
        const record = stripInventoryMetadata(structuredClone(operation.after) as Record<string, unknown>);
        abilityById.set(id!, record);
        changedAbilityIds.add(id!);
        continue;
      }
      if (!remainder || NON_RUNTIME_FIELDS.has(remainder.split('.', 1)[0]!)) continue;
      const ability = abilityById.get(id!);
      if (!ability) throw new Error(`Unknown ability ${id}`);
      applyNestedOperation(ability, remainder, operation);
      changedAbilityIds.add(id!);
      continue;
    }

    if (!remainder || NON_RUNTIME_FIELDS.has(remainder.split('.', 1)[0]!)) continue;
    const timeline = timelineFiles.get(id!);
    if (!timeline) throw new Error(`Unknown official timeline ${id}`);
    applyNestedOperation(timeline.value, remainder, operation);
    changedTimelineIds.add(id!);
  }

  const overridePath = resolve('data/official-data/ability-overrides.json');
  const overrideDocument = existsSync(overridePath)
    ? JSON.parse(readFileSync(overridePath, 'utf8')) as { schemaVersion: number; overrides: Record<string, MitigationAbility> }
    : { schemaVersion: 1, overrides: {} as Record<string, MitigationAbility> };
  for (const id of changedAbilityIds) {
    overrideDocument.overrides[id] = stripInventoryMetadata(abilityById.get(id!)!) as unknown as MitigationAbility;
  }

  if (!dryRun) {
    await Bun.write(overridePath, `${JSON.stringify(overrideDocument, null, 2)}\n`);
    for (const id of changedTimelineIds) {
      const timeline = timelineFiles.get(id)!;
      await Bun.write(timeline.path, `${JSON.stringify(timeline.value, null, 2)}\n`);
    }
  }
  console.log(JSON.stringify({
    appliedOperations: differential.operations.length,
    changedAbilityIds: [...changedAbilityIds].sort(),
    changedTimelineIds: [...changedTimelineIds].sort(),
    dryRun,
  }));
}

await main();
