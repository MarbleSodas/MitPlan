#!/usr/bin/env node
/**
 * Convert read-only Firebase exports into artifacts for the documented
 * Supabase Auth importer and the legacy-plan loader. It never contacts either
 * database and intentionally excludes plans with no attributable owner.
 *
 * Usage:
 *   node scripts/prepare-firebase-migration.mjs <input-dir> <output-dir>
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { convertLegacyPlanToYDoc } from './lib/legacy-convert.mjs';

const [inputDir, outputDir, ...rest] = process.argv.slice(2);
if (!inputDir || !outputDir) {
  throw new Error('Usage: node scripts/prepare-firebase-migration.mjs <input-dir> <output-dir> [--catalog <catalog.json>]');
}

// Optional re-anchoring catalog (abilities/encounters/timelines). Without it
// the converter still preserves every assignment as a faithful placeholder row.
let catalogPath = rest[rest.indexOf('--catalog') + 1];
if (!catalogPath) {
  const defaultCatalog = join(inputDir, 'catalog.json');
  if (existsSync(defaultCatalog)) catalogPath = defaultCatalog;
}
const catalog = catalogPath ? JSON.parse(await readFile(resolve(catalogPath), 'utf8')) : {};

const readJson = async (name) => {
  const path = join(inputDir, name);
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf8'));
};
const usersExport = await readJson('firebase-users.json');
const plans = await readJson('firebase-plans.json');
const profiles = await readJson('firebase-user-profiles.json') ?? {};
const users = Array.isArray(usersExport) ? usersExport : (usersExport?.users ?? []);

const deterministicUuid = (namespace) => {
  const bytes = createHash('sha256').update(`xivmitplan:firebase-plan:${namespace}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const normalizeTimestamp = (value) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric < 100_000_000_000 ? numeric * 1_000 : numeric).toISOString();
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
};

const emailByFirebaseUid = new Map();
for (const [uid, profile] of Object.entries(profiles ?? {})) {
  if (typeof profile?.email === 'string' && profile.email) emailByFirebaseUid.set(uid, profile.email.toLowerCase());
}
for (const user of users) {
  if (typeof user.localId === 'string' && typeof user.email === 'string' && user.email) {
    emailByFirebaseUid.set(user.localId, user.email.toLowerCase());
  }
}

const authUsers = users
  .filter((user) => typeof user.localId === 'string' && typeof user.email === 'string' && user.email)
  .map((user) => ({
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified === true,
    displayName: user.displayName ?? null,
    photoURL: user.photoUrl ?? null,
    metadata: {
      creationTime: normalizeTimestamp(user.createdAt),
      lastSignInTime: normalizeTimestamp(user.lastSignedInAt),
    },
    providerData: (user.providerUserInfo ?? []).map((provider) => ({
      providerId: provider.providerId,
      uid: provider.rawId ?? user.localId,
      email: provider.email ?? user.email,
      displayName: provider.displayName ?? user.displayName ?? null,
      photoURL: provider.photoUrl ?? user.photoUrl ?? null,
    })),
  }));

const legacyPlans = [];
let skippedUnowned = 0;
let skippedUnmappedOwner = 0;
for (const [firebasePlanId, plan] of Object.entries(plans ?? {})) {
  if (!plan || typeof plan !== 'object') continue;
  const ownerUid = plan.ownerId ?? plan.userId;
  if (typeof ownerUid !== 'string' || !ownerUid) {
    skippedUnowned += 1;
    continue;
  }
  const ownerEmail = emailByFirebaseUid.get(ownerUid);
  if (!ownerEmail) {
    skippedUnmappedOwner += 1;
    continue;
  }

  const id = deterministicUuid(firebasePlanId);
  const name = String(plan.name ?? plan.title ?? 'Imported legacy plan').slice(0, 128);
  const boss = typeof plan.bossId === 'string'
    ? plan.bossId
    : typeof plan.selectedBoss?.id === 'string'
      ? plan.selectedBoss.id
      : null;

  // Convert the v1 plan into a real, re-anchored Yjs PlanDoc. The converter
  // preserves every assignment (placeholder rows when no ability/event match)
  // and keeps the full Firebase payload in meta for later mapping. The plan id
  // is forced to our deterministic UUID so it matches the auth/plan mapping.
  const { ydocB64, encounterId, report } = convertLegacyPlanToYDoc(
    { ...plan, id: firebasePlanId, firebasePlanId, firebaseOwnerId: ownerUid },
    catalog,
    { planId: id },
  );

  legacyPlans.push({
    id,
    owner_email: ownerEmail,
    payload: { ...plan, firebasePlanId, firebaseOwnerId: ownerUid },
    captured_at: normalizeTimestamp(plan.createdAt),
    encounter_id: encounterId,
    ydoc_b64: ydocB64,
    legacy_report: report,
  });
}

const reanchorTotals = legacyPlans.reduce(
  (acc, plan) => {
    const r = plan.legacy_report ?? {};
    acc.total += r.total ?? 0;
    acc.matchedAbility += r.matchedAbility ?? 0;
    acc.matchedEvent += r.matchedEvent ?? 0;
    acc.unmatchedAbility += r.unmatchedAbility ?? 0;
    acc.unmatchedEvent += r.unmatchedEvent ?? 0;
    return acc;
  },
  { total: 0, matchedAbility: 0, matchedEvent: 0, unmatchedAbility: 0, unmatchedEvent: 0 },
);

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'supabase-auth-users.json'), `${JSON.stringify(authUsers)}\n`);
await writeFile(join(outputDir, 'legacy-local-plans.json'), `${JSON.stringify(legacyPlans)}\n`);
await writeFile(join(outputDir, 'migration-report.json'), `${JSON.stringify({
  exportId: randomUUID(),
  generatedAt: new Date().toISOString(),
  firebaseUsers: users.length,
  authUsersPrepared: authUsers.length,
  firebasePlans: Object.keys(plans ?? {}).length,
  legacyPlansPrepared: legacyPlans.length,
  skippedUnowned,
  skippedUnmappedOwner,
  reanchoredWithCatalog: Boolean(catalogPath),
  reanchorTotals,
}, null, 2)}\n`);

console.log(JSON.stringify({
  authUsersPrepared: authUsers.length,
  legacyPlansPrepared: legacyPlans.length,
  reanchoredWithCatalog: Boolean(catalogPath),
  reanchorTotals,
  skippedUnowned,
  skippedUnmappedOwner,
}));
