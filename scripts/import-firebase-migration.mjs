#!/usr/bin/env node
/**
 * Parameterized Firebase-to-Supabase importer.
 *
 * Reads artifacts created by prepare-firebase-migration.mjs and a local
 * Supabase pooler credential file. It never prints source user or plan data.
 *
 * Usage:
 *   node scripts/import-firebase-migration.mjs <prepared-dir> <service-json>
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';

const [preparedDir, serviceFile] = process.argv.slice(2);
if (!preparedDir || !serviceFile) {
  throw new Error('Usage: node scripts/import-firebase-migration.mjs <prepared-dir> <service-json>');
}

const readJson = async (file) => JSON.parse(await readFile(resolve(file), 'utf8'));
const users = await readJson(resolve(preparedDir, 'supabase-auth-users.json'));
const plans = await readJson(resolve(preparedDir, 'legacy-local-plans.json'));
const config = await readJson(serviceFile);
const sql = postgres(config, { max: 1, idle_timeout: 10 });
const BATCH_SIZE = 100;
const INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

const providerFor = (user) => {
  const google = user.providerData?.find((provider) => provider.providerId === 'google.com');
  if (google) {
    return {
      appMetadata: { provider: 'google', providers: ['google'] },
      userMetadata: {
        full_name: user.displayName ?? null,
        avatar_url: user.photoURL ?? null,
        provider_id: google.uid,
        firebase_uid: user.uid,
      },
    };
  }
  return {
    appMetadata: { provider: 'email', providers: ['email'] },
    userMetadata: {
      full_name: user.displayName ?? null,
      avatar_url: user.photoURL ?? null,
      firebase_uid: user.uid,
    },
  };
};

const batches = (items) => Array.from({ length: Math.ceil(items.length / BATCH_SIZE) }, (_, index) =>
  items.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
);

const countRows = async () => {
  const [authUsers] = await sql`select count(*)::int as count from auth.users`;
  const [legacyPlans] = await sql`select count(*)::int as count from public.legacy_local_plans`;
  return { authUsers: authUsers.count, legacyPlans: legacyPlans.count };
};

try {
  const before = await countRows();
  const existingUserRows = await sql`select lower(email) as email from auth.users where email is not null`;
  const existingEmails = new Set(existingUserRows.map((row) => row.email));
  const usersToImport = users.filter((user) => !existingEmails.has(user.email.toLowerCase()));
  const existingPlanRows = await sql`select id from public.legacy_local_plans`;
  const existingPlanIds = new Set(existingPlanRows.map((row) => row.id));
  const plansToImport = plans.filter((plan) => !existingPlanIds.has(plan.id));
  let insertedUsers = 0;
  for (const batch of batches(usersToImport)) {
    const inserted = await sql.begin(async (transaction) => {
      let count = 0;
      for (const user of batch) {
        const provider = providerFor(user);
        const result = await transaction`
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
          ) values (
            ${INSTANCE_ID}, gen_random_uuid(), 'authenticated', 'authenticated',
            ${user.email.toLowerCase()}, '',
            ${user.emailVerified ? user.metadata.creationTime : null},
            ${transaction.json(provider.appMetadata)}, ${transaction.json(provider.userMetadata)},
            ${user.metadata.creationTime}, ${user.metadata.lastSignInTime}
          ) on conflict do nothing
          returning id
        `;
        count += result.length;
      }
      return count;
    });
    insertedUsers += inserted;
  }

  let insertedPlans = 0;
  for (const batch of batches(plansToImport)) {
    const inserted = await sql.begin(async (transaction) => {
      let count = 0;
      for (const plan of batch) {
        const result = await transaction`
          insert into public.legacy_local_plans (
            id, owner_email, payload, captured_at, encounter_id, ydoc_b64
          ) values (
            ${plan.id}, ${plan.owner_email}, ${transaction.json(plan.payload)},
            ${plan.captured_at}, ${plan.encounter_id}, ${plan.ydoc_b64}
          ) on conflict (id) do nothing
          returning id
        `;
        count += result.length;
      }
      return count;
    });
    insertedPlans += inserted;
  }

  const after = await countRows();
  console.log(JSON.stringify({
    before,
    requestedUsers: users.length,
    usersToImport: usersToImport.length,
    insertedUsers,
    requestedPlans: plans.length,
    plansToImport: plansToImport.length,
    insertedPlans,
    after,
  }));
} finally {
  await sql.end({ timeout: 10 });
}
