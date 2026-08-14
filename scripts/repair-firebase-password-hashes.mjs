#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildFirebaseScryptHash } from './firebase-password-hash.mjs';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const firebaseProject = readArg('--firebase-project', 'xivmit');
const supabaseRef = readArg('--supabase-ref', 'lbagljsyffezsoaewxcl');
const apply = args.includes('--apply');
const workdir = mkdtempSync(join(tmpdir(), 'mitplan-auth-repair-'));
const usersFile = join(workdir, 'firebase-users.json');

const run = (command, commandArgs) => execFileSync(command, commandArgs, {
  encoding: 'utf8',
  maxBuffer: 128 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const getServiceRoleKey = () => {
  const response = JSON.parse(run('supabase', [
    'projects', 'api-keys', '--project-ref', supabaseRef, '--output', 'json',
  ]));
  const key = response.find((candidate) => candidate.name === 'service_role')?.api_key;
  if (!key) throw new Error('Supabase service role key was not returned by the CLI');
  return key;
};

const getFirebaseHashConfig = async () => {
  const accessToken = run('gcloud', ['auth', 'print-access-token']).trim();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${firebaseProject}/config`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-user-project': firebaseProject,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Firebase Auth configuration request failed (${response.status})`);
  }
  const config = await response.json();
  const hashConfig = config.signIn?.email?.hashConfig
    || config.signIn?.hashConfig
    || config.hashConfig;
  if (!hashConfig || hashConfig.algorithm !== 'SCRYPT') {
    throw new Error('Firebase SCRYPT configuration was not returned');
  }
  return {
    base64_signer_key: hashConfig.signerKey,
    base64_salt_separator: hashConfig.saltSeparator,
    rounds: hashConfig.rounds,
    mem_cost: hashConfig.memoryCost,
  };
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

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

try {
  run('firebase', [
    'auth:export', usersFile, '--project', firebaseProject, '--format=json',
  ]);

  const firebaseUsers = JSON.parse(readFileSync(usersFile, 'utf8')).users || [];
  const sourceByEmail = new Map(
    firebaseUsers
      .filter((user) => user.email)
      .map((user) => [user.email.trim().toLowerCase(), user])
  );
  const firebaseHashConfig = await getFirebaseHashConfig();
  const serviceRoleKey = getServiceRoleKey();
  const baseUrl = `https://${supabaseRef}.supabase.co`;
  const supabaseUsers = await fetchAllSupabaseUsers(baseUrl, serviceRoleKey);
  const flaggedUsers = supabaseUsers.filter(
    (user) => user.app_metadata?.password_reset_required === true
  );

  const repairs = [];
  let missingSourceAccounts = 0;
  let invalidSourceHashes = 0;
  let activeAccountsSkipped = 0;
  for (const user of flaggedUsers) {
    const source = sourceByEmail.get(user.email?.trim().toLowerCase());
    if (!source) {
      missingSourceAccounts += 1;
      continue;
    }
    if (user.last_sign_in_at) {
      activeAccountsSkipped += 1;
      continue;
    }
    try {
      repairs.push({
        id: user.id,
        passwordHash: buildFirebaseScryptHash(source, firebaseHashConfig),
      });
    } catch {
      invalidSourceHashes += 1;
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    flaggedAccounts: flaggedUsers.length,
    repairableAccounts: repairs.length,
    activeAccountsSkipped,
    missingSourceAccounts,
    invalidSourceHashes,
  };
  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply after reviewing the counts.');
  } else {
    if (
      repairs.length !== flaggedUsers.length
      || activeAccountsSkipped > 0
      || missingSourceAccounts > 0
      || invalidSourceHashes > 0
    ) {
      throw new Error('Apply stopped because not every flagged account is safely repairable');
    }

    let repairedAccounts = 0;
    for (const repair of repairs) {
      const sql = [
        'update auth.users',
        `set encrypted_password = ${sqlLiteral(repair.passwordHash)},`,
        "raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'password_reset_required')",
        "  || jsonb_build_object('firebase_password_hash_migrated', true, 'password_migration_resolved', true),",
        'updated_at = now()',
        `where id = ${sqlLiteral(repair.id)}::uuid`,
        "and raw_app_meta_data->>'password_reset_required' = 'true';",
      ].join('\n');
      run('supabase', ['db', 'query', '--linked', sql]);
      repairedAccounts += 1;
    }

    const remainingUsers = await fetchAllSupabaseUsers(baseUrl, serviceRoleKey);
    const remainingFlags = remainingUsers.filter(
      (user) => user.app_metadata?.password_reset_required === true
    ).length;
    if (remainingFlags !== 0) {
      throw new Error(`Password hash repair left ${remainingFlags} unresolved account(s)`);
    }
    console.log(JSON.stringify({ repairedAccounts, remainingFlags }, null, 2));
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
