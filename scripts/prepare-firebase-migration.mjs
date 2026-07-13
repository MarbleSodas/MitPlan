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
import { join } from 'node:path';
import * as Y from 'yjs';

const [inputDir, outputDir] = process.argv.slice(2);
if (!inputDir || !outputDir) {
  throw new Error('Usage: node scripts/prepare-firebase-migration.mjs <input-dir> <output-dir>');
}

const readJson = async (name) => JSON.parse(await readFile(join(inputDir, name), 'utf8'));
const usersExport = await readJson('firebase-users.json');
const plans = await readJson('firebase-plans.json');
const profiles = await readJson('firebase-user-profiles.json');
const users = Array.isArray(usersExport) ? usersExport : usersExport.users ?? [];

const LEGACY_SENTINEL_ENCOUNTER_ID = '00000000-0000-0000-0000-000000000003';

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

  // Keep the Yjs document small enough for the database constraint. The full
  // Firebase payload remains in JSONB for future assignment/timeline mapping.
  const doc = new Y.Doc();
  const meta = doc.getMap('meta');
  meta.set('id', id);
  meta.set('name', name);
  meta.set('legacyPlanId', firebasePlanId);
  meta.set('legacyBossId', boss);
  meta.set('legacyPayloadAvailable', true);
  meta.set('importedAt', new Date().toISOString());
  const ydocB64 = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
  doc.destroy();

  legacyPlans.push({
    id,
    owner_email: ownerEmail,
    payload: { ...plan, firebasePlanId, firebaseOwnerId: ownerUid },
    captured_at: normalizeTimestamp(plan.createdAt),
    encounter_id: LEGACY_SENTINEL_ENCOUNTER_ID,
    ydoc_b64: ydocB64,
  });
}

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
}, null, 2)}\n`);

console.log(JSON.stringify({
  authUsersPrepared: authUsers.length,
  legacyPlansPrepared: legacyPlans.length,
  skippedUnowned,
  skippedUnmappedOwner,
}));
