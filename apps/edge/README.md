# XIVMitPlan Edge Functions

Deno-based Supabase Edge Functions. Path A (ADR-0002 §T-4) collapses the
Cloudflare Workers API tier into PostgREST + these 8 Edge Functions.

| Function | Method | Auth | Env vars |
|---|---|---|---|
| `timelines-ingest-cactbot` | POST | required | — |
| `timelines-ingest-triggernometry` | POST | required | — |
| `timelines-ingest-fflogs` | POST | required | `FFLOGS_OAUTH_TOKEN` |
| `plans-create` | POST | required | — |
| `plans-snapshot` | POST | required | — |
| `plans-share` | POST | required | — |
| `plans-share-redeem` | POST | required | — |
| `auth-claim-legacy-plans` | POST | required | — |

All functions share:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-provisioned by Supabase)
- `CORS_ORIGINS` (comma-separated; defaults to `http://localhost:5173`)

## Local development

```bash
brew install supabase/tap/supabase
supabase start
supabase functions serve timelines-ingest-cactbot --env-file supabase/.env.local
```

The `deno.json` import map points at the on-disk workspace packages.
When you `cd apps/edge` and run `deno cache`, Deno resolves those paths
directly — no build step.

## Deploy

```bash
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

supabase secrets set FFLOGS_OAUTH_TOKEN=...
supabase secrets set CORS_ORIGINS=https://xivmitplan.app
```

After deploy, each function is reachable at
`https://<project-ref>.supabase.co/functions/v1/<function-name>`. The
Web app's typed RPC client (`apps/web/src/lib/supabase-rpc.ts`) calls
each one through `supabase.functions.invoke(name, { body })`.

## Error envelope

```json
{ "error": { "code": "STRING_CODE", "message": "Human readable" } }
```

HTTP status: 400 (validation), 401 (auth), 403 (RLS denial), 404
(not-found), 500 (unexpected).
