#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildFirebaseScryptHash,
  inspectFirebasePasswordUsers,
  validateFirebaseHashConfig,
} from './firebase-password-hash.mjs';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const firebaseProject = readArg('--firebase-project', 'xivmit');
const supabaseRef = readArg('--supabase-ref', 'lbagljsyffezsoaewxcl');
const apply = args.includes('--apply');
const keepExports = args.includes('--keep-exports');
const firebaseHashConfigPath = readArg('--firebase-hash-config');
const workdir = mkdtempSync(join(tmpdir(), 'mitplan-migration-'));
const databaseFile = join(workdir, 'firebase-rtdb.json');
const usersFile = join(workdir, 'firebase-users.json');
const manifestFile = join(workdir, 'SHA256SUMS.json');

const run = (command, commandArgs, options = {}) => execFileSync(command, commandArgs, {
  encoding: 'utf8',
  maxBuffer: 128 * 1024 * 1024,
  stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'inherit'],
});

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const countObject = (value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.keys(value).length
  : 0;

const readFirebaseHashConfig = (path) => {
  if (!path) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return validateFirebaseHashConfig(parsed);
};

const identityValueFields = new Set([
  'ownerId', 'userId', 'lastModifiedBy', 'createdBy', 'updatedBy', 'claimedBy', 'uid',
]);
const identityKeyContainers = new Set([
  'collaborators', 'accessedBy', 'likedBy', 'viewers',
]);
const identityRootCollections = new Set([
  'userProfiles', 'userCollections', 'planCollaborationsByUser',
]);

const transformIdentities = (value, idMap, parentKey = null) => {
  if (Array.isArray(value)) return value.map((item) => transformIdentities(item, idMap));
  if (!value || typeof value !== 'object') return value;

  const next = {};
  for (const [key, child] of Object.entries(value)) {
    const transformedKey = identityKeyContainers.has(parentKey) ? (idMap.get(key) || key) : key;
    if (identityValueFields.has(key) && typeof child === 'string') {
      next[transformedKey] = idMap.get(child) || child;
    } else {
      next[transformedKey] = transformIdentities(child, idMap, key);
    }
  }
  return next;
};

const getServiceRoleKey = () => {
  const response = JSON.parse(run('supabase', [
    'projects', 'api-keys', '--project-ref', supabaseRef, '--output', 'json',
  ], { capture: true }));
  const key = response.find((candidate) => candidate.name === 'service_role')?.api_key;
  if (!key) throw new Error('Supabase service role key was not returned by the CLI');
  return key;
};

const fetchAllSupabaseUsers = async (baseUrl, serviceRoleKey) => {
  const users = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${baseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok) throw new Error(`Supabase Auth export failed (${response.status})`);
    const batch = (await response.json()).users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
};

const createMissingSupabaseUsers = async (
  baseUrl,
  serviceRoleKey,
  firebaseUsers,
  existingSupabaseUsers,
  firebaseHashConfig
) => {
  const existingEmails = new Set(
    existingSupabaseUsers
      .map((user) => user.email?.trim().toLowerCase())
      .filter(Boolean)
  );
  const missingUsers = firebaseUsers.filter((user) => {
    const email = user.email?.trim().toLowerCase();
    return email && !existingEmails.has(email);
  });

  let created = 0;
  let passwordHashesMigrated = 0;
  for (const user of missingUsers) {
    const email = user.email.trim().toLowerCase();
    const firebaseProviders = (user.providerUserInfo || [])
      .map((provider) => provider.providerId)
      .filter(Boolean);
    const providers = [
      ...(user.passwordHash ? ['email'] : []),
      ...(firebaseProviders.includes('google.com') ? ['google'] : []),
    ];
    const normalizedProviders = [...new Set(providers.length ? providers : ['email'])];
    const provider = normalizedProviders.includes('google') ? 'google' : normalizedProviders[0];
    const passwordHash = user.passwordHash
      ? buildFirebaseScryptHash(user, firebaseHashConfig)
      : undefined;
    const response = await fetch(`${baseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        email_confirm: Boolean(user.emailVerified),
        ...(passwordHash ? { password_hash: passwordHash } : {}),
        user_metadata: {
          ...(user.displayName ? { display_name: user.displayName, full_name: user.displayName } : {}),
          ...(user.photoUrl ? { avatar_url: user.photoUrl } : {}),
        },
        app_metadata: {
          provider,
          providers: normalizedProviders,
          firebase_migrated: true,
          ...(passwordHash ? { firebase_password_hash_migrated: true } : {}),
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      // A concurrent migration may have created the same normalized email.
      if (response.status !== 422 && !/already.*registered/i.test(body)) {
        throw new Error(`Supabase Auth user creation failed (${response.status})`);
      }
    } else {
      created += 1;
      if (passwordHash) passwordHashesMigrated += 1;
    }
  }

  return { missing: missingUsers.length, created, passwordHashesMigrated };
};

const splitBatches = (rows, maxRows = 100, maxBytes = 3_000_000) => {
  const batches = [];
  let batch = [];
  let bytes = 2;
  for (const row of rows) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row)) + 1;
    if (batch.length > 0 && (batch.length >= maxRows || bytes + rowBytes > maxBytes)) {
      batches.push(batch);
      batch = [];
      bytes = 2;
    }
    batch.push(row);
    bytes += rowBytes;
  }
  if (batch.length) batches.push(batch);
  return batches;
};

const upsertRows = async (baseUrl, serviceRoleKey, rows) => {
  const batches = splitBatches(rows);
  for (let index = 0; index < batches.length; index += 1) {
    const response = await fetch(
      `${baseUrl}/rest/v1/app_documents?on_conflict=collection,key`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batches[index]),
      }
    );
    if (!response.ok) {
      throw new Error(`Supabase data import failed (${response.status}): ${await response.text()}`);
    }
    process.stdout.write(`\rImported ${index + 1}/${batches.length} batches`);
  }
  process.stdout.write('\n');
};

const purgeRemappedRootKeys = async (baseUrl, serviceRoleKey, idMap) => {
  const staleKeys = [...idMap.entries()]
    .filter(([sourceId, targetId]) => sourceId !== targetId)
    .map(([sourceId]) => sourceId);
  let deleted = 0;

  for (const collection of identityRootCollections) {
    for (const batch of splitBatches(staleKeys, 100, 100_000)) {
      const keyFilter = encodeURIComponent(`in.(${batch.join(',')})`);
      const response = await fetch(
        `${baseUrl}/rest/v1/app_documents?collection=eq.${collection}&key=${keyFilter}`,
        {
          method: 'DELETE',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Prefer: 'return=representation',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Could not remove remapped ${collection} keys (${response.status})`);
      }
      deleted += (await response.json()).length;
    }
  }

  return deleted;
};

const getTargetCount = async (baseUrl, serviceRoleKey, collection) => {
  const response = await fetch(
    `${baseUrl}/rest/v1/app_documents?select=key&collection=eq.${encodeURIComponent(collection)}&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'count=exact',
      },
    }
  );
  if (!response.ok) throw new Error(`Could not reconcile ${collection} (${response.status})`);
  return Number((response.headers.get('content-range') || '0/0').split('/')[1] || 0);
};

try {
  console.log(`Exporting Firebase Auth and Realtime Database from ${firebaseProject}...`);
  run('firebase', ['auth:export', usersFile, '--project', firebaseProject, '--format=json']);
  run('firebase', ['database:get', '/', '--project', firebaseProject, '--output', databaseFile]);

  const manifest = {
    generatedAt: new Date().toISOString(),
    firebaseProject,
    files: {
      'firebase-users.json': { bytes: statSync(usersFile).size, sha256: sha256(usersFile) },
      'firebase-rtdb.json': { bytes: statSync(databaseFile).size, sha256: sha256(databaseFile) },
    },
  };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

  const firebaseUsersPayload = JSON.parse(readFileSync(usersFile, 'utf8'));
  const firebaseUsers = firebaseUsersPayload.users || [];
  const firebaseHashConfig = readFirebaseHashConfig(firebaseHashConfigPath);
  const passwordHashAudit = inspectFirebasePasswordUsers(firebaseUsers, firebaseHashConfig);
  const source = JSON.parse(readFileSync(databaseFile, 'utf8'));
  const serviceRoleKey = getServiceRoleKey();
  const baseUrl = `https://${supabaseRef}.supabase.co`;
  let supabaseUsers = await fetchAllSupabaseUsers(baseUrl, serviceRoleKey);
  const existingEmails = new Set(
    supabaseUsers.map((user) => user.email?.trim().toLowerCase()).filter(Boolean)
  );
  const missingPasswordUsers = firebaseUsers.filter((user) => {
    const email = user.email?.trim().toLowerCase();
    return Boolean(email && user.passwordHash && !existingEmails.has(email));
  });
  if (apply && missingPasswordUsers.length > 0 && !firebaseHashConfig) {
    throw new Error(
      'Apply stopped: --firebase-hash-config is required before creating password-backed users'
    );
  }
  if (apply && passwordHashAudit.invalidPasswordHashes > 0) {
    throw new Error('Apply stopped: one or more Firebase password hashes are invalid');
  }
  const authCreation = apply
    ? await createMissingSupabaseUsers(
        baseUrl,
        serviceRoleKey,
        firebaseUsers,
        supabaseUsers,
        firebaseHashConfig
      )
    : {
        missing: firebaseUsers.filter((user) => {
          const email = user.email?.trim().toLowerCase();
          return email && !supabaseUsers.some(
            (target) => target.email?.trim().toLowerCase() === email
          );
        }).length,
        created: 0,
        passwordHashesMigrated: 0,
      };
  if (authCreation.created > 0) {
    supabaseUsers = await fetchAllSupabaseUsers(baseUrl, serviceRoleKey);
  }

  const supabaseIdByEmail = new Map(
    supabaseUsers
      .filter((user) => user.email)
      .map((user) => [user.email.trim().toLowerCase(), user.id])
  );
  const firebaseIdMap = new Map();
  for (const user of firebaseUsers) {
    const email = user.email?.trim().toLowerCase();
    const targetId = email ? supabaseIdByEmail.get(email) : null;
    if (user.localId && targetId) firebaseIdMap.set(user.localId, targetId);
  }
  const authMappedUsers = firebaseIdMap.size;

  // Some historical records outlived their Firebase Auth row but still have
  // an email in userProfiles. Reconcile those IDs to an existing Supabase
  // account before classifying them as orphaned.
  for (const [firebaseId, profile] of Object.entries(source.userProfiles || {})) {
    const email = profile?.email?.trim().toLowerCase();
    const targetId = email ? supabaseIdByEmail.get(email) : null;
    if (targetId && !firebaseIdMap.has(firebaseId)) firebaseIdMap.set(firebaseId, targetId);
  }

  const rows = [];
  const sourceCounts = {};
  const unmappedOwnerIds = new Set();
  for (const [collection, records] of Object.entries(source)) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) continue;
    sourceCounts[collection] = countObject(records);
    for (const [sourceKey, sourceData] of Object.entries(records)) {
      const key = identityRootCollections.has(collection)
        ? (firebaseIdMap.get(sourceKey) || sourceKey)
        : sourceKey;
      const data = transformIdentities(sourceData, firebaseIdMap);
      for (const ownerField of ['ownerId', 'userId']) {
        const originalOwner = sourceData?.[ownerField];
        if (originalOwner && !firebaseIdMap.has(originalOwner)) unmappedOwnerIds.add(originalOwner);
      }
      rows.push({ collection, key, data });
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    exportDirectory: keepExports ? workdir : '(temporary; use --keep-exports to retain)',
    sourceAuthUsers: firebaseUsers.length,
    targetAuthUsers: supabaseUsers.length,
    mappedAuthUsers: authMappedUsers,
    unmappedAuthUsers: firebaseUsers.length - authMappedUsers,
    missingTargetAuthUsers: authCreation.missing,
    createdTargetAuthUsers: authCreation.created,
    createdUsersWithFirebasePasswordHash: authCreation.passwordHashesMigrated,
    existingUsersRequiringPasswordReset: supabaseUsers.filter(
      (user) => user.app_metadata?.password_reset_required === true
    ).length,
    passwordHashAudit,
    totalIdentityMappings: firebaseIdMap.size,
    unmappedOwnerIds: unmappedOwnerIds.size,
    sourceCounts,
    documentRows: rows.length,
    manifest,
  };
  console.log(JSON.stringify(report, null, 2));

  if (apply) {
    const purgedRemappedIdentityRows = await purgeRemappedRootKeys(
      baseUrl,
      serviceRoleKey,
      firebaseIdMap
    );
    console.log(JSON.stringify({ purgedRemappedIdentityRows }, null, 2));
    await upsertRows(baseUrl, serviceRoleKey, rows);
    const targetCounts = {};
    for (const collection of Object.keys(sourceCounts)) {
      targetCounts[collection] = await getTargetCount(baseUrl, serviceRoleKey, collection);
      if (targetCounts[collection] !== sourceCounts[collection]) {
        throw new Error(
          `Reconciliation failed for ${collection}: target ${targetCounts[collection]} !== source ${sourceCounts[collection]}`
        );
      }
    }
    console.log(JSON.stringify({ reconciliation: 'passed', targetCounts }, null, 2));
  } else {
    console.log('Dry run complete. Re-run with --apply after reviewing the report.');
  }
} finally {
  if (!keepExports) rmSync(workdir, { recursive: true, force: true });
  else console.log(`Migration exports retained at ${workdir}`);
}
