# XIVMitPlan v1.0

> **FFXIV raid mitigation planner.** Learn + Plan modes, real-time
> collaborative editing via Yjs, three-source timeline ingestion, free at
> the 1K-user tier.

## What works today

The Phase 0 + Path A Hardened build is a runnable, type-safe, test-green
monorepo with a stubbed-out UI. You can boot the dev server in ~150 ms,
click through every route, and exercise the realtime bridge against
mock supabase clients via Vitest. Cloud-side wiring (real Supabase, real
Realtime, OAuth apps) is the next phase — see **Next steps** below.

| Surface | State | Needs Supabase? |
|---|---|---|
| Web SPA shell + nav | ✅ Functional | No |
| Learn mode index (`/learn`) | ✅ Renders 3 placeholder encounters | No |
| Learn encounter view (`/learn/:id`) | 🟡 Stub — shows encounter ID | No |
| Plan editor shell (`/plan/:planId`) | 🟡 Stub — opens, wires Y.Doc + realtime bridge | Yes (for realtime to connect) |
| Plan list (`/plan`) | 🟡 Stub — shows "Phase 2+ lists your plans" | Yes (redirects to `/login`) |
| Login (`/login`) | ✅ Discord / Google / email CTAs render | Yes (to actually sign in) |
| OAuth callback (`/auth/callback`) | ✅ Handles the code-for-session exchange | Yes |
| Realtime bridge (`SupabaseBroadcastProvider`) | ✅ 31 unit/integration/contract tests pass | Mocked in tests |
| Snapshot persistence (`upsert_ydoc_snapshot`) | ✅ RPC defined + trigger installed | Yes (live Postgres) |
| Catalog API (`/v1/encounters` etc.) | ✅ 8 PostgREST RPCs in migration 0003 | Yes |
| Edge Functions (timeline ingest, share, plan CRUD) | ✅ Deno source under `apps/edge/functions/` | Yes |

## Quick links

- [Architecture (2026-06-14 lock)](2026-06-14-xivmitplan-v1-architecture.md) — the build-from spec.
- [ADR-0001](docs/adr/0001-xivmitplan-v1-architecture-locked.md) — the original architecture lock + tech review verdicts.
- [ADR-0002](docs/adr/0002-supabase-only-backend.md) — Path A (Supabase-only backend) collapse.
- [ADR-0003](docs/adr/0003-path-a-hardened-supabase-broadcast.md) — y-supabase replaced with our own `SupabaseBroadcastProvider`. **The current authoritative realtime decision** (2026-06-29).
- [Infrastructure setup](docs/infra-setup.md) — one-time manual walkthrough for Supabase + Cloudflare R2 + OAuth.

## Tech stack (Path A Hardened, ADR-0003)

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + dnd-timeline + visx |
| Realtime | Yjs + custom `SupabaseBroadcastProvider` on Supabase Realtime Broadcast (no third-party Yjs provider) |
| Persistence | Supabase Postgres + Drizzle ORM + `upsert_ydoc_snapshot` RPC (migration 0002) + `crdt_validate_plan_doc` trigger |
| API tier | PostgREST RPCs (catalog reads, migration 0003) + Supabase Edge Functions (timeline ingest, share-token, plan CRUD) |
| Auth | Supabase Auth (Discord + Google + email + magic link) |
| Realtime ACL gate | `realtime.check_plan_access()` Postgres function bound to `plan:*` channels |
| Snapshots | Cloudflare R2 (10GB free, zero egress) |
| Observability | Pino → Supabase Logs; Sentry (web); Honeycomb OTel |
| Tests | Vitest (unit) + Playwright (E2E) + fast-check (property) |

## Realtime — what changed in ADR-0003

**Before (Path A, ADR-0002):** `y-supabase` v0.0.4-7-alpha wrapped Supabase Realtime Broadcast.

**After (Path A Hardened, ADR-0003):** Our own `SupabaseBroadcastProvider` (~390 LOC, `apps/web/src/lib/supabase-broadcast-provider.ts`) talks to Supabase Realtime Broadcast directly. The y-supabase package is removed from `pnpm-workspace.yaml`'s catalog and `apps/web/package.json`.

Why: the y-supabase maintainer's own 2024 GitHub post on `supabase-community/y-supabase` reads *"I know this is no where near production ready but it works!"* — unsuitable for the production realtime tier. Supabase Realtime Broadcast itself is production-grade (Supabase-maintained), so the thin y-supabase wrapper was the only risk. Replacing it with code we own removes the third-party provider dependency without changing any other architectural decision.

The `RealtimeProvider` interface in `packages/crdt/src/provider.ts` is provider-agnostic. A future swap to Hocuspocus-on-DO (ADR-0003 §"v2 re-introduction triggers") is a single-PR mechanical change — `apps/web/src/lib/provider-contract.test.ts` enforces the contract surface for any future implementation.

## Repo layout

```
xivmitplan/
├── apps/
│   ├── web/                 # React 19 + Vite SPA
│   └── edge/                # Supabase Edge Functions (Deno; timeline ingests + share-token + plan CRUD)
├── packages/
│   ├── domain/              # Pure TypeScript: entities, ports, math, parsers
│   ├── persistence/         # Drizzle + Postgres (no Redis; no UNLOGGED tables in v1)
│   ├── crdt/                # Yjs document shape + awareness + provider interface
│   ├── validation/          # Zod schemas (single source of truth)
│   └── shared/              # i18n, time, Result, branded IDs
├── data/                    # Versioned game data (added in Phase 1+)
├── docs/
│   ├── adr/                 # 0001 + 0002 + 0003
│   ├── infra-setup.md       # Deploy walkthrough
│   └── archive/             # Historical records
├── package.json             # pnpm workspace root
├── pnpm-workspace.yaml      # catalog: pins the locked versions
├── turbo.json
├── tsconfig.base.json
├── drizzle.config.ts
└── 2026-06-14-xivmitplan-v1-architecture.md   # historical reference
```

## Quickstart (local dev)

The dev server boots **without any cloud accounts**. All routes mount
and return 200; only `/login`'s OAuth buttons and the realtime bridge
need real Supabase credentials.

```sh
# 1. Install
pnpm install

# 2. (Optional) Set up Supabase for login + realtime
#    Follow docs/infra-setup.md §1–§8, then:
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key.
# Without this you'll see a one-time console.warn at module-load and
# any actual API call will fail with a clear error from supabase-js.

# 3. Boot the dev server
pnpm --filter @xivmitplan/web dev
# → http://localhost:5173
```

Dev server boots in ~150 ms. With no env vars set, you can browse
`/learn`, `/learn/:id`, `/plan/:any-uuid`, and `/login` (CTAs render
but won't complete). Add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
to enable the full sign-in flow + realtime sync.

## Manual test checklist

What you can verify by hand against this build (no cloud accounts
required for most of these):

### Smoke test — every route (no Supabase)

```sh
pnpm --filter @xivmitplan/web dev
# In a second terminal:
curl -s -o /dev/null -w "/             → %{http_code}\n"        http://localhost:5173/
curl -s -o /dev/null -w "/learn        → %{http_code}\n"        http://localhost:5173/learn
curl -s -o /dev/null -w "/learn/<id>   → %{http_code}\n"        http://localhost:5173/learn/00000000-0000-0000-0000-000000000001
curl -s -o /dev/null -w "/plan         → %{http_code}\n"        http://localhost:5173/plan
curl -s -o /dev/null -w "/plan/<id>    → %{http_code}\n"        http://localhost:5173/plan/00000000-0000-0000-0000-000000000001
curl -s -o /dev/null -w "/login        → %{http_code}\n"        http://localhost:5173/login
```

All seven should return `200`. The root `/` redirects to `/learn`
(client-side, so curl sees `200` for both).

### Browser walk-through (no Supabase)

1. Open http://localhost:5173/ — should redirect to `/learn`.
2. Verify the app header has the **XIVMitPlan** title, **Learn** +
   **Plans** nav links, and a **Sign in** link in the account slot.
3. On `/learn`, click each of the 3 placeholder encounters. Each
   `/learn/:id` page renders an `<h1>` with the encounter ID's first
   8 chars (e.g. `Encounter 00000000`) and a "Phase 1+ renders the
   timeline" hint.
4. Navigate to `/plan/<any-uuid>` directly. The plan editor stub
   opens with the title `Plan <first-8-of-id>` and a `<span
   class="status status-connecting">connecting</span>` status badge
   that flips to `error` after ~10s (no Supabase to subscribe to).
   Without a session the page shows "Please sign in." above the stub.
5. Navigate to `/plan` while signed out — redirects to
   `/login?next=/plan`.
6. Visit `/login` — Discord / Google buttons render; clicking them
   surfaces a supabase-js error (since env vars are missing).

### Realtime bridge — no Supabase needed (vitest)

```sh
pnpm --filter @xivmitplan/web test
# Expected: 31 pass (3 test files)
```

The test harness drives the Supabase Realtime client with hand-rolled
mock channels (`apps/web/src/lib/__test__/realtime-fixtures.ts`), so you
can exercise every code path in `SupabaseBroadcastProvider` without a
live Supabase project:

- **Lifecycle**: connecting → connected / error / disconnected on
  SUBSCRIBED / CHANNEL_ERROR / CLOSED; idempotent connect; idempotent
  disconnect; SUBSCRIBE_TIMEOUT; unrecognized-status fallback.
- **Broadcast**: local Y.Doc updates broadcast as base64 diffs
  (ADR-0003 §"Wire format"); remote updates apply without echo-back
  (origin-loop guard); channel named `plan:<planId>`.
- **Snapshot persistence**: 2s debounce → `upsert_ydoc_snapshot` RPC;
  5s retry on failure; no retry on success; pending RPC + disconnect
  → no leak.
- **Cross-client**: two providers sharing a relay channel converge to
  identical Y.Doc state after bidirectional edits, with no broadcast
  loops.
- **Contract**: `RealtimeProvider` interface enforced (idempotency,
  status surface, transition callback) — the same tests will pass for
  any future Hocuspocus / Liveblocks / PartyKit binding.

### Realtime bridge — two-browser manual test (needs Supabase)

Once you have a live Supabase project + Discord OAuth app per
`docs/infra-setup.md`, the full smoke is:

1. Open two browser profiles (or one normal + one incognito).
2. Sign in both on `/login`.
3. Navigate both to the same `/plan/<uuid>` URL.
4. Type in the editor on one — the other should see the change
   within ~100 ms (Supabase Realtime Broadcast round-trip).
5. Close one tab — the other should see the `status` badge stay
   `connected` (the server-side snapshot is the source of truth for
   the cold-reopen case).

### Build + typecheck

```sh
pnpm -r typecheck         # all 6 packages typecheck clean
pnpm --filter @xivmitplan/web build   # production bundle
```

The build emits 458 kB main + 79 kB yjs + 49 kB react vendor chunks
(gzip: 128 kB + 24 kB + 17 kB). No Hocuspocus / Hono / Upstash /
wrangler / Cloudflare DO code in the bundle (CI compliance gate
enforces this — see `.github/workflows/ci.yml`).

## Next steps (Phase 1+)

The build is a runnable, tested foundation. The product work to get
to a usable v1 beta falls into four phases. Pick one to start.

### Phase 1 — Learn mode (read-only encounter browser)

The lowest-risk first slice. Renders the catalog API + timeline view
+ action cards with confidence badges. No write paths.

- [ ] Wire `/learn` to `rpc('list_encounters')` (migration 0003) +
      zod-validated `Encounter` schema from `packages/validation`.
- [ ] Render the encounter detail page at `/learn/:id` with the
      timeline graph (`packages/domain` `TimelineGraph`) — visx axes
      + dnd-timeline shell.
- [ ] Add action cards with confidence badges (per-source fan-in from
      cactbot / triggernometry / fflogs sources).
- [ ] Migrate the 3 hardcoded `PLACEHOLDER_ENCOUNTERS` in
      `apps/web/src/routes/learn.index.tsx` to live data.
- [ ] Add a Vitest + Playwright spec covering the encounter browse
      → detail navigation.

### Phase 2 — Plan mode (the dual-pane editor)

The flagship surface. Plan CRUD + the Y.Doc-backed editor + mit
assignments + tank state. Realtime is already wired via the bridge.

- [ ] Wire `/plan` to list the user's plans via `rpc('list_my_plans')`.
- [ ] Add `plans-create` Edge Function (already scaffolded at
      `apps/edge/functions/plans-create/index.ts`) for the "New plan"
      CTA — generates a UUID, inserts `plans` row, returns share token.
- [ ] Replace the `PlanEditor` stub at `apps/web/src/routes/plan.$planId.tsx`
      with the dual-pane layout: timeline (left) + mit palette +
      tank-state panel (right).
- [ ] Render the Y.Doc shape (`PlanDoc` from `packages/crdt`) via
      zustand selectors; bind the existing `realtimeProvider()`.
- [ ] Add a `plans-snapshot` restore path — on cold load, fetch the
      latest `ydoc_snapshots.update`, decode, apply to a fresh Y.Doc
      before `provider.connect()`.
- [ ] Wire share-link UX (read-only viewer + edit-with-token) via
      the `plan_access` table + `share_token` Edge Function.

### Phase 3 — Awareness / presence (v1.1, ADR-0003 §"v2 re-introduction triggers")

The realtime bridge is in v1.0, but the awareness broadcast
listener was intentionally left out (see simplify-cleanup notes —
the `applyRemoteAwareness` no-op was removed; the v1.1 wiring will
add it back in one commit).

- [ ] Re-introduce `awareness?: Awareness` on `RealtimeProviderOptions`.
- [ ] Add `'y-awareness'` broadcast event + `ThrottledAwareness`
      producer/consumer (the class is already in
      `packages/crdt/src/awareness.ts`, ready to wire).
- [ ] Render remote cursors on the timeline.

### Phase 4 — Timeline ingestion (the three sources)

Cactbot / Triggernometry / FFLogs. The Edge Functions are scaffolded
in `apps/edge/functions/timelines-ingest-*` but not yet wired to a UI
ingestion path.

- [ ] cactbot CactbotEvent websocket listener → `timelines-ingest-cactbot`.
- [ ] Triggernometry HTTP poll → `timelines-ingest-triggernometry`.
- [ ] FFLogs OAuth flow → `timelines-ingest-fflogs`.
- [ ] `TimelineMerger` from `packages/domain` to fuse multi-source
      timelines with confidence weighting.

### Cloud setup (any phase, blocker for end-to-end testing)

Until this is done, the manual realtime test (two browsers) won't
work — only the mocked test paths will exercise the bridge.

- [ ] Create the live Supabase project (free tier is fine for dev).
- [ ] Apply the three SQL migrations against the live DB.
- [ ] Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local`.
- [ ] Create a Discord OAuth app, point the Supabase project's
      "Discord" provider at it.
- [ ] (Optional, for backups) Cloudflare R2 bucket + keys.

Full walkthrough: [docs/infra-setup.md](docs/infra-setup.md).

## Cost (verified against Supabase 2026 pricing)

| Tier | Stage | Monthly |
|---|---|---|
| 0 | Dev / staging (1 user) | **$0** (Supabase Free tier covers everything; Cloudflare R2 free) |
| 1 | Public beta (10–100 users) | **$0** (still on Supabase Free) |
| 2 | GA launch (~1K users) | **$25–40** (Supabase Pro $25/mo floor; + R2 $0; + domain ~$1) |
| 3 | Scale (~10K users) | **$200–220** (Pro $25 + Medium compute $60 + Realtime overages ~$113 + Edge Functions $6 + R2 $3 + domain) |

No Cloudflare account required. No Hocuspocus / Hono / Upstash / Durable Objects. R2 is used only for backups.

## Verification (final green)

```
pnpm -r typecheck                                  → 6 packages, all pass
pnpm --filter @xivmitplan/web test                 → 31 pass (3 test files)
pnpm --filter @xivmitplan/persistence test         → 0 (no tests yet; runs vitest in no-files mode)
pnpm --filter @xivmitplan/shared test              → 16 pass
pnpm --filter @xivmitplan/validation test          → 16 pass
pnpm --filter @xivmitplan/domain test              → 21 pass
pnpm --filter @xivmitplan/crdt test                → 2 pass
pnpm --filter @xivmitplan/web build                → 458 kB main + 79 kB yjs + 49 kB react vendor
pnpm --filter @xivmitplan/web dev                  → boots in ~150 ms; all 7 routes return 200
```

Test count for the realtime bridge: 19 unit tests
(`supabase-broadcast-provider.test.ts`), 4 cross-client integration
tests (`supabase-broadcast-provider.integration.test.ts`), and 8
contract tests enforcing the `RealtimeProvider` interface
(`provider-contract.test.ts`). Total: **31 tests on the realtime
path**.

Note: `pnpm -r test` currently fails on `persistence` (no test files
yet) — filter with `--filter=!@xivmitplan/persistence` or run per-package
as shown above until Phase 1+ adds persistence tests.

## Phase 0 status (working base to go off of)

- [x] Monorepo scaffolded (pnpm + Turborepo + catalog:)
- [x] Architecture locks recorded (ADR-0001 + ADR-0002 + ADR-0003)
- [x] Drizzle schema + 3 migrations (initial + ACL/RPC/validator + 8 PostgREST RPCs)
- [x] Yjs CRDT package (`PlanDoc`, `ThrottledAwareness`, `PlanSnapshotShape`, `RealtimeProvider` interface)
- [x] Domain package (entities, ports, math, parsers, merger)
- [x] Realtime: custom `SupabaseBroadcastProvider` (~390 LOC) on Supabase Realtime Broadcast, debounced `upsert_ydoc_snapshot` + `crdt_validate_plan_doc` trigger
- [x] Web SPA scaffolded (React 19 + Vite + React Router 7) with the realtime bridge wired
- [x] 31 realtime tests pass (19 unit + 4 integration + 8 contract)
- [x] Production build passes (`vite build` produces a valid bundle)
- [x] Dev server boots in ~150 ms; all 7 routes mount without Supabase
- [x] Deno compat verified for the Edge Functions path
- [x] CI compliance gate enforces Path A (blocks re-introduction of y-supabase / Hocuspocus / Hono / Upstash / wrangler)
- [ ] Live Supabase + R2 + Discord OAuth accounts (out-of-band; follow `docs/infra-setup.md`)

Next: create the live accounts per `docs/infra-setup.md` and run the first end-to-end against staging.

## License

TBD.
