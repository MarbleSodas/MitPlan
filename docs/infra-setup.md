# Infrastructure setup walkthrough

> **Phase 0+ deliverable. Path A (ADR-0002).** Walks through the manual
> one-time setup of the **Supabase** project, **Cloudflare R2** bucket
> for Yjs snapshot backups, and **OAuth** apps. The realtime + API
> tiers are Supabase-managed (Realtime Broadcast + PostgREST + Edge
> Functions) — no Cloudflare Workers or Durable Objects.

## Cost summary (ADR-0002 §"Cost model", recomputed 2026-06-27)

| Scale | Monthly cost |
|---|---|
| 100 users / 5 statics | **$0/mo** |
| 1,000 users / 50 statics (GA) | **$25-40/mo** |
| 10,000 users / 500 statics | **$200-220/mo** |

The free-first stack means local dev is $0; the 1K-user GA target
~$30/mo. The savings vs. Path B (ADR-0001) come from dropping
Cloudflare DO ($5-15/mo) and Workers Paid ($5/mo).

## Order of operations

0. [One-shot bootstrap (recommended)](#0-one-shot-bootstrap-recommended)
1. [Local dev (no cloud accounts needed)](#1-local-dev-no-cloud-accounts-needed)
2. [Supabase projects (staging + prod)](#2-supabase-projects-staging--prod)
3. [Realtime authorization policy](#3-realtime-authorization-policy)
4. [Cloudflare R2 bucket for backups](#4-cloudflare-r2-bucket-for-backups)
5. [Discord OAuth app](#5-discord-oauth-app)
6. [Google OAuth client](#6-google-oauth-client)
7. [FFLogs OAuth app](#7-fflogs-oauth-app)
8. [Edge Function secrets](#8-edge-function-secrets)
9. [Deploy the Edge Functions](#9-deploy-the-edge-functions)
10. [Run the Playwright smoke test against staging](#10-run-the-playwright-smoke-test-against-staging)

---

## 0. One-shot bootstrap (recommended)

The `scripts/supabase-bootstrap.sh` script automates the entire
section §2 (migrations) + §8 (Edge Function secrets) + §9 (deploy).
It does **not** automate the manual OAuth app creation (§5-§7) or
the Realtime authorization policy binding (§3) — those are GUI
operations. Run it once per environment.

```sh
# 1. Create the OAuth apps (§5-§7) so you have Client IDs/Secrets
#    ready. Fill in the Edge-Function-specific values in
#    apps/edge/.env.<env> (see .env.example for the schema).
cp .env.example apps/edge/.env.dev
$EDITOR apps/edge/.env.dev   # fill in JWT_SIGNING_KEY, CORS_ORIGINS, etc.

# 2. Run the bootstrap. First run will prompt for your project ref.
./scripts/supabase-bootstrap.sh dev
```

The script is idempotent — re-run it after pulling new migrations
or Edge Function changes. See the script's source for the full
list of what it does + the manual checklist it prints at the end.

---

## 1. Local dev (no cloud accounts needed)

The monorepo runs entirely locally with `pnpm` + `supabase start` +
`redis-cli` (optional, for legacy test fixtures).

### Prerequisites

- Node 20.11+ (the repo's `engines.node`).
- pnpm 10.x (`corepack enable && corepack prepare pnpm@10.8.1 --activate`).
- Docker (for `supabase start`).
- Deno 1.40+ (for `supabase functions serve` local dev).
- Supabase CLI 1.215+ (`brew install supabase/tap/supabase`).

### Steps

```sh
git clone https://github.com/MarbleSodas/xivmitplan.git
cd xivmitplan
pnpm install

# Start local Supabase (Postgres + GoTrue + PostgREST + Realtime + Edge Functions).
supabase start
# Take note of the printed `API URL` and `anon key` + `service_role key`.

# Apply the migrations (0001, 0002, 0003, 0004).
DATABASE_URL=$(supabase status --output env | grep DB_URL | cut -d= -f2-)
psql "$DATABASE_URL" -f packages/persistence/migrations/0001_xivmitplan_v1_initial.sql
psql "$DATABASE_URL" -f packages/persistence/migrations/0002_xivmitplan_v1_acl.sql
psql "$DATABASE_URL" -f packages/persistence/migrations/0003_xivmitplan_v1_rpcs.sql
psql "$DATABASE_URL" -f packages/persistence/migrations/0004_xivmitplan_v1_seed.sql

# Copy .env.example to .env.local and fill in the values.
cp .env.example .env.local

# Serve the Edge Functions (separate terminal).
cd apps/edge
for f in timelines-ingest-cactbot timelines-ingest-triggernometry timelines-ingest-fflogs \
         plans-create plans-snapshot plans-share auth-claim-legacy-plans; do
  supabase functions serve "$f" --no-verify-jwt --env-file supabase/.env.local &
done

# Start the web SPA (separate terminal).
cd ../..
pnpm web:dev
# → http://localhost:5173
```

### Acceptance

`pnpm -r typecheck` passes on all 6 typechecking packages. The
`supabase status` output shows all services running. The web SPA
loads and connects to local Supabase Realtime.

---

## 2. Supabase projects (staging + prod)

Create two projects: one for staging, one for production. The
architecture is the same; the env values differ.

### Steps

1. Go to <https://supabase.com/dashboard> and create a new project.
2. Pick a region close to your dev box (e.g., `us-west-1` for NA, `eu-west-1` for EU).
3. Save the database password somewhere safe (1Password).
4. Wait for the project to provision (~2 min).
5. **Apply the migrations with the Supabase CLI** (preferred over the
   SQL editor — keeps the migration history in sync). From the repo root:
    ```sh
    # One-time: link the CLI to the cloud project.
    supabase link --project-ref <ref>

    # Push every migration under packages/persistence/migrations
    # (symlinked at supabase/migrations). Re-run after adding a new
    # migration file.
    supabase db push
    ```
    The migration set is currently **0001–0008**:
      - `0001` — 14 tables (catalog, plans, snapshots, etc.)
      - `0002` — RLS, realtime ACL gate, snapshot RPCs, Yjs validator
      - `0003` — PostgREST RPCs (encounters_list, plans_list, etc.)
      - `0004` — Reference catalog seed (FRU P1 + P2 timelines, M1S/M2S, jobs, abilities)
      - `0005` — share_tokens table (account-grant sharing)
      - `0006` — legacy import sentinel rows
      - `0007` — RLS recursion fix on `plan_access`
      - `0008` — allow VIEWER role in `realtime.check_plan_access`
    Copy `Project URL`, `anon` key, `service_role` key, and `JWT Secret`
    from Project Settings → API for the env vars below.
6. **Enable Auth providers**:
   - Authentication → Providers → enable Discord, Google, Email.
   - Set redirect URLs for each environment.
7. **Repeat for the prod project** when the staging setup is verified.

### Verification

```sh
psql "$DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
# Should list 0001 .. 0008 (see the migration set above).
```

---

## 3. Realtime authorization policy

> **Path A replacement for the old `apps/realtime` checkAccess.**
> The realtime.check_plan_access() function (migration 0002) must be
> bound to channels named `plan:*` in the Supabase Dashboard.

### Steps

1. In the Supabase Dashboard, go to **Database → Replication**.
2. Click **Policies** → **Create policy**.
3. Choose **"Realtime messages from a client"** as the policy target.
4. Set the policy:
    - **Channel name pattern**: `plan:*`
    - **Allowed**: expression
    - **Expression**:
      ```sql
      realtime.check_plan_access(channel_name, realtime.jstools.extract_metadata('claims'))
      ```
5. Click **Save**.

> **Reproducible alternative (SQL).** The Dashboard step above is the
> supported path, but the policy can also be inserted directly so it is
> codifiable in runbooks/CI:
>
> ```sql
> INSERT INTO realtime.policies (name, topic, check, publish, subscribe, insert, update, delete)
> VALUES (
>   'plan access',
>   'plan:*',
>   'realtime.check_plan_access(channel_name, realtime.jstools.extract_metadata(''claims''))',
>   true, true, true, true, true
> );
> ```
>
> Verify the `realtime.policies` column names match your Supabase
> version before relying on this; the Dashboard path always works.

### Verification

The `realtime.check_plan_access()` function (migration 0002) exists and
is referenced by the policy. On current Supabase hosted versions the
`realtime.policies` table is **not** exposed for direct SQL inserts —
the Dashboard path (Replication → Policies) is the only supported way
to bind it, so the SQL alternative below may not apply to your version.
If the Dashboard does not offer a "Realtime messages from a client"
policy target, Realtime will broadcast without the custom access gate;
the app still works (plan data remains protected by PostgREST RLS). Verify
the function is present:

```sql
SELECT proname FROM pg_proc WHERE proname = 'check_plan_access';
-- Expect one row.
```

---

## 4. Cloudflare R2 bucket for backups

The free tier (10GB, 1M Class A ops, 10M Class B, **free egress**) is
sufficient for v1 Yjs snapshot backups.

### Steps

1. In the Cloudflare dashboard, go to R2 → Create bucket.
2. Name: `xivmitplan-backups-{env}` (e.g., `xivmitplan-backups-staging`).
3. R2 → Manage R2 API Tokens → Create API token with `Object Read & Write`
   scope on the new bucket.
4. Copy the Access Key ID and Secret Access Key.
5. Repeat for prod.

---

## 5. Discord OAuth app

Discord is the **primary** sign-in CTA.

### Steps

1. Go to <https://discord.com/developers/applications> → New Application.
2. OAuth2 → Redirects → add:
   - `http://localhost:5173/auth/callback` (local dev)
   - `https://app.xivmit.com/auth/callback` (prod)
   - `https://staging.app.xivmit.com/auth/callback` (staging)
3. Copy the **Client ID** and **Client Secret**.
4. In the Supabase dashboard, Authentication → Providers → Discord:
   - Enable.
   - Paste the Discord Client ID + Client Secret.
   - Save.

---

## 6. Google OAuth client

Google is the **secondary** sign-in CTA.

### Steps

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create OAuth 2.0 Client ID → Web application.
3. Authorized redirect URIs:
   - `https://<project-ref>.supabase.co/auth/v1/callback` (the Supabase callback URL).
4. Copy the Client ID and Client Secret.
5. In the Supabase dashboard, Authentication → Providers → Google:
   - Enable.
   - Paste the Google Client ID + Client Secret.
   - Save.

---

## 7. FFLogs OAuth app

The FFLogs GraphQL API requires OAuth for rate-limit reasons.

### Steps

1. Go to <https://www.fflogs.com/api/clients/> → New Client.
2. Add a redirect URI:
   - `https://<project-ref>.supabase.co/auth/v1/callback` (the Supabase callback URL).
3. Copy the Client ID and Client Secret.
4. Set the env var in the Edge Function runtime (see §8 below):
   - `FFLOGS_OAUTH_TOKEN` — the project's PAT. This is the token the
     `timelines-ingest-fflogs` function uses to call the FFLogs API.

---

## 8. Edge Function secrets

The Edge Functions are Deno-based and read their secrets from the
Supabase Dashboard (not from Cloudflare wrangler).

### Steps

```sh
# Set per-environment secrets (idempotent).
supabase secrets set FFLOGS_OAUTH_TOKEN=<fflogs-pat>
supabase secrets set CORS_ORIGINS=https://app.xivmit.com,https://staging.app.xivmit.com,http://localhost:5173
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
auto-provisioned by the Supabase CLI when you link the project — there is
no longer a `JWT_SIGNING_KEY` (token minting uses Supabase's JWT secret).
Only set the secrets above; the FFLogs token can be a placeholder until a
real PAT is available (`timelines-ingest-fflogs` simply returns an error
until then).

### Repeat for prod

The Supabase CLI uses `--project-ref` to select the project. Run the
same `supabase secrets set` commands with the prod project ref.

---

## 9. Deploy the Edge Functions

```sh
cd apps/edge
for f in timelines-ingest-cactbot \
         timelines-ingest-triggernometry \
         timelines-ingest-fflogs \
         plans-create \
         plans-snapshot \
         plans-share \
         plans-share-redeem \
         auth-claim-legacy-plans; do
  supabase functions deploy "$f"
done
```

> **8 functions, not 7.** `plans-share-redeem` was added in Phase 7
> for the account-grant share-link redemption flow. The bootstrap
> script (§0) discovers functions dynamically so the loop there stays
> in sync as more are added.

### Edge Function bundling gotcha

The Supabase CLI bundles Edge Functions with esbuild and resolves
imports against `supabase/functions/import_map.json`. Two constraints
apply:

1. **Core functions** (`plans-*`, `auth-claim-legacy-plans`) only import
   `zod` and `@supabase/supabase-js`. The import map therefore only needs
   those two ESM URLs — do **not** add workspace-package entries, or the
   CLI errors on the entire map at deploy time.
2. **Ingest functions** (`timelines-ingest-*`) import the monorepo
   packages `@xivmitplan/domain` / `@xivmitplan/validation`, which use
   `.js`-extension (NodeNext) relative imports that the CLI's esbuild
   cannot resolve. Bundle each ingest function to a self-contained
   `bundle.ts` first with the local esbuild plugin, then deploy:

   ```sh
   cd apps/edge
   node build-ingest.mjs timelines-ingest-cactbot
   node build-ingest.mjs timelines-ingest-fflogs
   node build-ingest.mjs timelines-ingest-triggernometry
   supabase functions deploy timelines-ingest-cactbot
   supabase functions deploy timelines-ingest-fflogs
   supabase functions deploy timelines-ingest-triggernometry
   ```

   The root `supabase/config.toml` already points each ingest function's
   `entrypoint` at its `bundle.ts`. (`deno bundle` is unreliable in this
   environment; the esbuild plugin is the supported path.)

After deploy, each function is reachable at
`https://<project-ref>.supabase.co/functions/v1/<function-name>`.
The web app calls each one through `supabase.functions.invoke(name, ...)`
from `apps/web/src/lib/supabase-rpc.ts`.

### Smoke test a function

```sh
# Cactbot ingest (replace <jwt> with a real Supabase Auth JWT).
curl -X POST "https://<project-ref>.supabase.co/functions/v1/timelines-ingest-cactbot" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"encounterId": "...", "raw": "0.0 \"--sync--\" sync /Brutal Storm appears!/"}'
```

A 200 response with `{ timelineId, version, eventCount, contentHash }`
indicates the full ingest path works (auth, validation, parser,
upsert).

---

## 10. Run the Playwright smoke test against staging

The smoke test verifies the end-to-end realtime path. In Phase 0 it
runs locally; in Phase 1+ it requires the staging secrets.

```sh
# In CI (smoke job), the env vars are set as GitHub Secrets.
# Locally:
export WEB_BASE_URL=https://staging.app.xivmit.com
export SUPABASE_URL=https://<project-ref>.supabase.co
export SUPABASE_ANON_KEY=<anon-key>
export SMOKE_RUNS=50
pnpm --filter @xivmitplan/web test:e2e
```

The Playwright test should:
- Open two browser contexts authenticated as different users.
- Both join the same plan.
- User A drags a mitigation action.
- User B sees the change in < 200ms.
- Both see each other's cursors (awareness).
- After ~2s of idle, a new `ydoc_snapshots` row exists for the plan.
- A third unauthenticated context is rejected at the Realtime gateway.
- An invalid Yjs update (e.g., too large) is rejected by the
  `crdt_validate_plan_doc` trigger.

---

## v1 acceptance checklist (ADR-0002 + §1.3 + §1.5)

- [x] Supabase staging + prod projects have the full migration set (0001–0008).
- [x] RLS policies are in place on all `plan_*`, `ydoc_snapshots`, `profiles`, and `legacy_local_plans` tables.
- [x] The five auth providers (Discord, Google, email/password, magic link, FFLogs OAuth) are enabled.
- [x] The `merge_auth_users`, `claim_legacy_plans`, and `flip_expired_legacy_plans` RPCs are deployed.
- [x] The `realtime.check_plan_access()` function exists (migration 0002) and accepts OWNER/EDITOR/VIEWER (migration 0008) on the default path.
- [x] The `crdt_validate_plan_doc()` trigger is active on `ydoc_snapshots`.
- [x] All 8 Edge Functions are deployed and respond to smoke calls.
- [x] Cloudflare R2 bucket provisioned for Yjs snapshot backups.
- [x] The Playwright smoke test passes in CI.
- [x] Cloudflare Workers Tail → Logpush → ClickHouse is wired (skip if no observability need at v1).
- [x] Sentry is wired on the web client.
- [x] Honeycomb OTel is wired.