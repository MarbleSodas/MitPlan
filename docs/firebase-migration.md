# Firebase Migration

This runbook migrates the legacy Firebase Auth and Realtime Database data into
Supabase. It follows Supabase's [Firebase Auth migration guide](https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-auth).

## Scope

- Firebase Auth users are imported into Supabase Auth with Supabase's
  `firebase-to-supabase` tool.
- Firebase Realtime Database plans are exported as immutable evidence, then
  transformed and loaded into `legacy_local_plans`.
- A user claims an imported plan only after a Supabase sign-in with a verified
  email or matching Discord identity. Firebase UIDs are never authorization
  input in the new application.

Do not enable new writes on Firebase after the export begins. Keep the legacy
application read-only until the reconciliation and claim window are complete.

## Prerequisites

- The target Supabase project has migrations `0001` through `0009` applied.
- A Firebase Admin SDK service-account JSON exists outside this repository.
- A restricted Supabase database connection file exists outside this
  repository. Use the session pooler connection details specified by the
  Supabase guide.
- A secure, encrypted migration workspace is available for exports and audit
  reports. Do not commit user exports, service accounts, database credentials,
  or password hash parameters.

## Auth Users

1. Clone the official migration tool outside this repository:

   ```sh
   git clone https://github.com/supabase-community/firebase-to-supabase.git /secure/firebase-to-supabase
   ```

2. Place the Firebase Admin key at
   `/secure/firebase-to-supabase/auth/firebase-service.json` and the Supabase
   session-pooler credentials at
   `/secure/firebase-to-supabase/auth/supabase-service.json`.
3. In Firebase Authentication, record the SCRYPT password-hash parameters
   described in the Supabase guide before exporting.
4. Export and inspect users:

   ```sh
   cd /secure/firebase-to-supabase/auth
   node firestoreusers2json.js /secure/xivmitplan-migration/firebase-users.json 100
   jq 'length' /secure/xivmitplan-migration/firebase-users.json
   ```

5. Import to a disposable Supabase staging project first:

   ```sh
   node import_users.js /secure/xivmitplan-migration/firebase-users.json 100
   ```

The official importer creates Supabase Auth rows with new UUIDs. Do not rely
on a Firebase UID as a `plans.owner_id`; claims use verified email or Discord
identity instead. Validate the imported provider metadata and a password-reset
or sign-in path for each enabled Firebase provider before production. Do not
state that Firebase password hashes or Google identities are preserved unless
the staging sign-in test proves it for the installed tool version.

## Legacy Plans

1. Export the Realtime Database while the legacy app is read-only:

   ```sh
   firebase database:get /plans --project xivmit > /secure/xivmitplan-migration/firebase-plans.json
   firebase database:get /userProfiles --project xivmit > /secure/xivmitplan-migration/firebase-user-profiles.json
   shasum -a 256 /secure/xivmitplan-migration/firebase-*.json > /secure/xivmitplan-migration/SHA256SUMS
   ```

2. Build a reviewed transformer before loading production data. Each output
   row must contain:
   - The original plan UUID, or a deterministic UUID mapping.
   - `owner_email` and/or `owner_discord_id` obtained from the exported user
     profile, never a Firebase UID alone.
   - The original payload for audit and recovery.
   - A validated target `encounter_id`.
   - `ydoc_b64`, a Yjs update produced with the current `PlanDoc` schema.

3. Load transformed rows idempotently into `legacy_local_plans` with the
   service role. Run a dry run and report totals for imported, malformed,
   unclaimable, duplicate, and missing-encounter plans.
4. Reconcile source count, target count, UUID coverage, and SHA-256 manifest
   before enabling claims.
5. Test a matching and a non-matching account. The matching account must see
   only its own claimable rows; the non-matching account must see none.

## Cutover

1. Re-run the export and reconciliation during the write freeze.
2. Import Auth users, then legacy plans, into production.
3. Verify Google and Discord sign-in, plan creation, sharing, viewer
   immutability, and a legacy claim in production.
4. Point DNS to the new application. Keep Firebase data retained and the old
   app read-only for the documented claim period.

## Google OAuth

`gcloud` is useful for project selection, IAM, and API verification, but this
runbook does not rely on an unverified general OAuth-client creation command.
Create the Web OAuth client in Google Cloud Console with this redirect URI:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

Configure its client ID and secret in Supabase Authentication > Providers >
Google. Add each application URL to Supabase's redirect allowlist, then test
the complete browser callback on staging before production.
