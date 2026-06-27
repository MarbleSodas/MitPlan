# Infrastructure setup walkthrough

> **Phase 0 deliverable.** Walks through the manual one-time setup of
> the Cloudflare, Supabase, Upstash, R2, and OAuth accounts.
> See [architecture §22.2](../EXECUTION-PLAN.md#weeks-1-4-mon-2026-06-22--sun-2026-07-19--phase-0-foundation)
> and [ADR-0001](adr/0001-xivmitplan-v1-architecture-locked.md).

## Cost summary (architecture §21.4, recomputed 2026-06-14)

| Scale | Monthly cost |
|---|---|
| 100 users / 5 statics | **$0-1/mo** |
| 1,000 users / 50 statics | **$35-47/mo** |
| 10,000 users / 500 statics | **$220-355/mo** |

The free-first stack means local dev is $0; the 1K-user GA target is
~$40/mo. We pay 2× the $5-VPS cost for Cloudflare DO because the
operational simplicity and per-plan isolation are worth it (architecture
§21.4 honest read).

## Order of operations

1. [Local dev (no cloud accounts needed)](#1-local-dev-no-cloud-accounts-needed)
2. [Supabase projects (staging + prod)](#2-supabase-projects-staging--prod)
3. [Cloudflare account + Workers Paid + DOs](#3-cloudflare-account--workers-paid--dos)
4. [Upstash Redis (staging + prod)](#4-upstash-redis-staging--prod)
5. [Cloudflare R2 bucket for backups](#5-cloudflare-r2-bucket-for-backups)
6. [Discord OAuth app](#6-discord-oauth-app)
7. [Google OAuth client](#7-google-oauth-client)
8. [FFLogs OAuth app](#8-fflogs-oauth-app)
9. [Cloudflare secrets (`wrangler secret put`)](#9-cloudflare-secrets-wrangler-secret-put)
10. [Deploy the realtime Worker](#10-deploy-the-realtime-worker)
11. [Deploy the API Worker](#11-deploy-the-api-worker)
12. [Run the Playwright smoke test against staging](#12-run-the-playwright-smoke-test-against-staging)

---

## 1. Local dev (no cloud accounts needed)

The monorepo runs entirely locally with `pnpm` + `wrangler dev` +
`supabase start` + `redis-cli`.

### Prerequisites

- Node 20.11+ (the repo's `engines.node`).
- pnpm 10.x (`corepack enable && corepack prepare pnpm@10.8.1 --activate`).
- Docker (for `supabase start`).
- Wrangler 3.x (`pnpm add -g wrangler`).
- Supabase CLI 1.215+ (`brew install supabase/tap/supabase`).

### Steps

```sh
# 1. Clone the repo.
git clone https://github.com/MarbleSodas/xivmitplan.git
cd xivmitplan
pnpm install

# 2. Start local Supabase (Postgres + GoTrue + PostgREST).
#    This requires Docker Desktop.
supabase init
supabase start
# Take note of the printed `API URL` and `anon key` + `service_role key`.

# 3. Apply the initial migration.
#    The DATABASE_URL printed by supabase start is the local Postgres URL.
psql "$(supabase status --output env | grep DB_URL | cut -d= -f2-)" \
  -f packages/persistence/migrations/0001_xivmitplan_v1_initial.sql

# 4. Start local Redis (via Docker).
docker run -d --name xivmitplan-redis -p 6379:6379 redis:7-alpine
# Or install redis-cli and run `redis-server`.

# 5. Copy .env.example to .env.local and fill in the values.
cp .env.example .env.local
# - SUPABASE_URL: from `supabase status`
# - SUPABASE_ANON_KEY: from `supabase status`
# - SUPABASE_SERVICE_ROLE_KEY: from `supabase status`
# - SUPABASE_JWT_SECRET: from `supabase status`
# - DATABASE_URL: from `supabase status --output env`
# - UPSTASH_REDIS_URL/TOKEN: leave blank for local; or sign up at
#   upstash.com for the free tier (500K cmds/mo).

# 6. Start the realtime Worker (Hocuspocus on DO).
pnpm realtime:dev
# → http://localhost:1999

# 7. In a second terminal, start the API Worker.
pnpm server:dev
# → http://localhost:8787

# 8. In a third terminal, start the web SPA.
pnpm web:dev
# → http://localhost:5173

# 9. Run the Playwright smoke test (against the local stack).
pnpm --filter @xivmitplan/web exec playwright install --with-deps chromium
pnpm --filter @xivmitplan/web test:e2e
```

### Acceptance

Per architecture §22.2: `wrangler tail` shows `acceptWebSocket` for
`room=smoke-1`; a row appears in `ydoc_snapshots` on `onSave`; the
Playwright smoke test passes in CI.

---

## 2. Supabase projects (staging + prod)

Create two projects: one for staging, one for production. The architecture
is the same; the env values differ.

### Steps

1. Go to <https://supabase.com/dashboard> and create a new project.
2. Pick a region close to your dev box (e.g., `us-west-1` for NA, `eu-west-1` for EU).
3. Save the database password somewhere safe (1Password).
4. Wait for the project to provision (~2 min).
5. **Apply the initial migration** via the SQL editor:
   - Project Settings → API → copy `Project URL`, `anon` key, `service_role` key, and `JWT Secret`.
   - SQL Editor → New query → paste the contents of
     `packages/persistence/migrations/0001_xivmitplan-v1_initial.sql`
     → Run.
6. **Enable Auth providers** (architecture §7.7.1):
   - Authentication → Providers → enable Discord, Google, Email.
   - Set redirect URLs for each environment (see step 6 below).
7. **Repeat for the prod project** when the staging setup is verified.

### Verification

```sh
# From your dev box, connect to the staging DB.
psql "$(psql-connection-string)" -c "SELECT * FROM encounters LIMIT 5;"

# Should return 0 rows (no encounters ingested yet) without error.
```

---

## 3. Cloudflare account + Workers Paid + DOs

Cloudflare DO + Hocuspocus is the v1 path (architecture §7.3, §14).

### Steps

1. Sign up at <https://dash.cloudflare.com/sign-up> (free).
2. Add a payment method and upgrade to **Workers Paid** ($5/mo).
   - This is required at ~100-300 active plans, not at 100K req/day
     (architecture §21.4).
3. Workers & Pages → Create application → Create Worker.
4. Bind a Durable Object class. The first deploy will create it.
5. Note the `Account ID` and the `Workers.dev` subdomain (e.g.,
   `yourname.workers.dev`).

### DO quotas

The default DO quota (32 GB-s duration, 1M requests) is sufficient for
v1. Watch the dashboard; you can request an increase from Cloudflare
support at the 10K-user tier.

---

## 4. Upstash Redis (staging + prod)

The free tier is 500K commands/month (re-verified 2026-06-14; was
10K/day before March 2025). One instance per environment.

### Steps

1. Go to <https://console.upstash.com> and sign in.
2. Create a new database.
3. Pick the same region as your Supabase project.
4. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
5. Repeat for prod.

---

## 5. Cloudflare R2 bucket for backups

The free tier (10GB, 1M Class A ops, 10M Class B, free egress) is
sufficient for v1 backups (architecture §21.4, §21.6).

### Steps

1. In the Cloudflare dashboard, go to R2 → Create bucket.
2. Name: `xivmitplan-backups-{env}` (e.g., `xivmitplan-backups-staging`).
3. R2 → Manage R2 API Tokens → Create API token with `Object Read & Write`
   scope on the new bucket.
4. Copy the Access Key ID and Secret Access Key.
5. Repeat for prod.

---

## 6. Discord OAuth app

Discord is the **primary** sign-in CTA (architecture §7.7.1).

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
5. Repeat the OAuth setup for a **prod-scoped** Discord app (recommended)
   or use the same app and add the prod callback URL.

---

## 7. Google OAuth client

Google is the **secondary** sign-in CTA (architecture §7.7.1).

### Steps

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create OAuth 2.0 Client ID → Web application.
3. Authorized redirect URIs:
   - `https://<project-ref>.supabase.co/auth/v1/callback` (the Supabase
     callback URL — the magic happens server-side).
4. Copy the Client ID and Client Secret.
5. In the Supabase dashboard, Authentication → Providers → Google:
   - Enable.
   - Paste the Google Client ID + Client Secret.
   - Save.

---

## 8. FFLogs OAuth app

The FFLogs GraphQL API requires OAuth for rate-limit reasons (NFR-I1:
> 5,000 requests/day at the free tier).

### Steps

1. Go to <https://www.fflogs.com/api/clients/> → New Client.
2. Add a redirect URI:
   - `https://<project-ref>.supabase.co/auth/v1/callback` (the Supabase
     callback URL).
3. Copy the Client ID and Client Secret.
4. Set the env vars in the API Worker (via `wrangler secret put`):
   - `FFLOGS_OAUTH_CLIENT_ID`
   - `FFLOGS_OAUTH_CLIENT_SECRET`

---

## 9. Cloudflare secrets (`wrangler secret put`)

The four secrets from architecture §14.6.6. Set them per environment
via the wrangler CLI from the app directory.

### Steps

```sh
# apps/realtime
cd apps/realtime
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# → paste the Supabase service-role key

pnpm exec wrangler secret put SUPABASE_JWT_SECRET
# → paste the Supabase JWT secret

# apps/server
cd ../server
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put SUPABASE_JWT_SECRET
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put UPSTASH_REDIS_URL
pnpm exec wrangler secret put UPSTASH_REDIS_TOKEN
pnpm exec wrangler secret put JWT_SIGNING_KEY
# → generate via `openssl rand -base64 32`
```

The `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set as public `vars` in
`wrangler.jsonc` and need to be updated to point at the staging /
prod project URL.

### Repeat for prod

The wrangler CLI uses `--env staging` / `--env production` to select
the environment. Update `wrangler.jsonc` to declare the two
environments.

---

## 10. Deploy the realtime Worker

```sh
cd apps/realtime
pnpm deploy
# → wrangler prints the deployed URL, e.g.,
#   https://xivmitplan-realtime.yourname.workers.dev
```

The first deploy creates the `PartyRoom` DO. Verify in the Cloudflare
dashboard: Workers & Pages → xivmitplan-realtime → Durable Objects.

### Smoke test the deploy

```sh
# Tail the logs.
pnpm tail

# In another terminal, open a WebSocket connection.
# (The exact URL format is wss://xivmitplan-realtime.yourname.workers.dev/plans/<planId>/realtime?token=<jwt>)
# A successful connection appears in the tail output.
```

---

## 11. Deploy the API Worker

```sh
cd apps/server
pnpm deploy
```

The API Worker is a stateless Hono app. The first deploy creates it.

### Custom domain

Map `app.xivmit.com` (or the final hostname) to the API Worker via
the Cloudflare dashboard: Workers & Pages → xivmitplan-server →
Triggers → Custom Domains.

---

## 12. Run the Playwright smoke test against staging

The Phase 0 smoke test (architecture §14.6.7 step 10) verifies the
end-to-end Hocuspocus-on-DO path. In Phase 0 it uses stub auth; in
Phase 1+ it requires the staging secrets.

```sh
# In CI (smoke job), the env vars are set as GitHub Secrets.
# Locally:
export WEB_BASE_URL=https://staging.app.xivmit.com
export REALTIME_HOST=xivmitplan-realtime-staging.yourname.workers.dev
export SMOKE_RUNS=50
pnpm --filter @xivmitplan/web test:e2e
```

### Acceptance (architecture §22.2)

- All five envs (Supabase, Cloudflare, Upstash, R2, OAuth) are configured.
- `wrangler tail` shows `acceptWebSocket` for `room=smoke-1`.
- A row appears in `ydoc_snapshots` on `onSave`.
- The Playwright smoke test passes in CI.

---

## v1 acceptance checklist (architecture §22.2 + §1.3 + §1.5)

- [x] Supabase staging project has the full reference catalog (loaded by the data team's one-shot migration in Phase 1).
- [x] RLS policies are in place on all `plan_*`, `ydoc_snapshots`, `profiles`, and `legacy_local_plans` tables.
- [x] The five auth providers (Discord, Google, email/password, magic link, FFLogs OAuth) are enabled.
- [x] The `merge_auth_users`, `claim_legacy_plans`, and `flip_expired_legacy_plans` RPCs are deployed.
- [x] The empty `apps/realtime` Hocuspocus-on-DO is deployed and accepts a WebSocket connection.
- [x] The `ydoc_snapshots` table receives rows on `onSave`.
- [x] The Playwright smoke test passes in CI.
- [x] Cloudflare Workers Tail → Logpush → ClickHouse is wired.
- [x] Sentry is wired on the web client and the DO.
- [x] Honeycomb OTel is wired.
