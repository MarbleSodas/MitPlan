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
5. **Apply the four migrations** in order via the SQL editor:
   - Project Settings → API → copy `Project URL`, `anon` key, `service_role` key, and `JWT Secret`.
   - SQL Editor → New query → paste the contents of each migration file → Run.
   - Migrations:
     - `0001_xivmitplan_v1_initial.sql` — 14 tables (catalog, plans, snapshots, etc.)
     - `0002_xivmitplan_v1_acl.sql` — RLS, realtime ACL gate, snapshot RPCs, Yjs validator
     - `0003_xivmitplan_v1_rpcs.sql` — 8 PostgREST RPCs (encounters_list, plans_list, etc.)
     - `0004_xivmitplan_v1_seed.sql` — Reference catalog seed (FRU P1 + P2 timelines, M1S/M2S, jobs, abilities). **Required for the demo to show FRU as a base timeline option.**
6. **Enable Auth providers**:
   - Authentication → Providers → enable Discord, Google, Email.
   - Set redirect URLs for each environment.
7. **Repeat for the prod project** when the staging setup is verified.

### Verification

```sh
psql "$DATABASE_URL" -c "SELECT name FROM _xivmitplan_migrations ORDER BY id;"
# Should list: 0001_xivmitplan_v1_initial, 0002_xivmitplan_v1_acl,
#              0003_xivmitplan_v1_rpcs, 0004_xivmitplan_v1_seed
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

### Verification

From the Supabase SQL editor:
```sql
SELECT * FROM realtime.policies WHERE name LIKE '%plan%';
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
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_ANON_KEY=<anon-key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set FFLOGS_OAUTH_TOKEN=<fflogs-pat>
supabase secrets set JWT_SIGNING_KEY=$(openssl rand -base64 32)
supabase secrets set CORS_ORIGINS=https://app.xivmit.com,https://staging.app.xivmit.com,http://localhost:5173
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
auto-provisioned by the Supabase CLI when you link the project, but
setting them explicitly makes the env self-documenting.

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
         auth-claim-legacy-plans; do
  supabase functions deploy "$f"
done
```

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

- [x] Supabase staging + prod projects have the full migration set (0001, 0002, 0003).
- [x] RLS policies are in place on all `plan_*`, `ydoc_snapshots`, `profiles`, and `legacy_local_plans` tables.
- [x] The five auth providers (Discord, Google, email/password, magic link, FFLogs OAuth) are enabled.
- [x] The `merge_auth_users`, `claim_legacy_plans`, and `flip_expired_legacy_plans` RPCs are deployed.
- [x] The `realtime.check_plan_access()` function is bound to channels named `plan:*` (Dashboard → Replication → Policies).
- [x] The `crdt_validate_plan_doc()` trigger is active on `ydoc_snapshots`.
- [x] All 7 Edge Functions are deployed and respond to smoke calls.
- [x] Cloudflare R2 bucket provisioned for Yjs snapshot backups.
- [x] The Playwright smoke test passes in CI.
- [x] Cloudflare Workers Tail → Logpush → ClickHouse is wired (skip if no observability need at v1).
- [x] Sentry is wired on the web client.
- [x] Honeycomb OTel is wired.