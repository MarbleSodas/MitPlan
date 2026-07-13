# XIVMitPlan v1.0

> **FFXIV raid mitigation planner.** Learn + Plan modes, real-time
> collaborative editing via Yjs, three-source timeline ingestion, free at
> the 1K-user tier.

## What works today

The Phase 0 + Path A Hardened + Phase 1 build is a runnable, type-safe,
test-green monorepo. You can boot the dev server in ~150 ms, click
through every route, and exercise the realtime bridge against mock
Supabase clients via Vitest. With `VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY` set, the same code hits a live Supabase
project and the demo flow (create plan from FRU → anchor mitigations
→ realtime broadcast) works end-to-end.

The **working demo**: sign in, click **New plan**, pick **FRU P1**
(Light Rampant) as the base timeline, click any event on the timeline
to anchor a mitigation, and see it broadcast in real time to any other
browser tab joined to the same plan URL.

| Surface | State | Needs Supabase? |
|---|---|---|
| Web SPA shell + nav | ✅ Functional | No |
| Plan list (`/plan`) | ✅ Renders your plans via `rpc('plans_list')` | Yes (for live data) |
| "New plan" dialog | ✅ Encounter picker with FRU P1/P2 + M1S/M2S/P1S/P4S | No (falls back to seed) |
| Plan editor (`/plan/:planId`) | ✅ Timeline rail + mit assignment + realtime | Yes (for realtime to connect) |
| Login (`/login`) | ✅ Discord / Google / email CTAs render | Yes (to actually sign in) |
| OAuth callback (`/auth/callback`) | ✅ Handles the code-for-session exchange | Yes |
| Realtime bridge (`SupabaseBroadcastProvider`) | ✅ 36 unit/integration/contract tests pass | Mocked in tests |
| Snapshot persistence (`upsert_ydoc_snapshot`) | ✅ RPC + trigger installed | Yes (live Postgres) |
| Snapshot restore (`load_ydoc_snapshot`) | ✅ Wired into plan editor cold-load | Yes |
| Catalog API (`/v1/encounters` etc.) | ✅ 8 PostgREST RPCs in migration 0003 | Yes |
| FRU base timeline seed | ✅ Migration 0004 (~18 P1 + ~20 P2 events) | Yes |
| Edge Functions (timeline ingest, share, plan CRUD) | ✅ Deno source under `apps/edge/functions/` | Yes |
| Data-source facade | ✅ 16 unit tests (fallback + RPC mock) | Either |

## Quick links

- [Architecture (2026-06-14 lock)](2026-06-14-xivmitplan-v1-architecture.md) — the build-from spec.
- [ADR-0001](docs/adr/0001-xivmitplan-v1-architecture-locked.md) — the original architecture lock + tech review verdicts.
- [ADR-0002](docs/adr/0002-supabase-only-backend.md) — Path A (Supabase-only backend) collapse.
- [ADR-0003](docs/adr/0003-path-a-hardened-supabase-broadcast.md) — y-supabase replaced with our own `SupabaseBroadcastProvider`. **The current authoritative realtime decision** (2026-06-29).
- [ADR-0004](docs/adr/0004-core-release-scope.md) — the migration-focused core release boundary.
- [Infrastructure setup](docs/infra-setup.md) — one-time Supabase + OAuth walkthrough.
- [Firebase migration](docs/firebase-migration.md) — Supabase-supported Auth import plus legacy-plan cutover.

## Tech stack (Path A Hardened, ADR-0003)

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + dnd-timeline + visx |
| Realtime | Yjs + custom `SupabaseBroadcastProvider` on Supabase Realtime Broadcast (no third-party Yjs provider) |
| Persistence | Supabase Postgres + Drizzle ORM + `upsert_ydoc_snapshot` RPC (migration 0002) + `crdt_validate_plan_doc` trigger |
| API tier | PostgREST RPCs (catalog reads, migration 0003) + Supabase Edge Functions (timeline ingest, share-token, plan CRUD) |
| Auth | Supabase Auth (Discord + Google + email + magic link) |
| Realtime ACL gate | Private Supabase Realtime channels with `realtime.messages` RLS (migration 0009) |
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
#    Run `./scripts/supabase-bootstrap.sh dev` after creating a
#    project + Discord OAuth app per docs/infra-setup.md, then:
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key.
# Without this you'll see a one-time console.warn at module-load and
# any actual API call will fall back to in-memory sample data.

# 3. Boot the dev server
pnpm --filter @xivmitplan/web dev
# → http://localhost:5173
```

Dev server boots in ~150 ms. With no env vars set, you can browse
`/plan`, `/plan/:any-uuid`, and `/login` (CTAs render but won't
complete). The plan editor renders the FRU base timeline in fallback
mode using sample data; mit assignments persist in the Y.Doc for the
session but aren't synced across tabs. Add `VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY` to enable the full sign-in flow + realtime
sync + cross-tab broadcast.

## Manual test checklist

What you can verify by hand against this build (no cloud accounts
required for most of these):

### Smoke test — every route (no Supabase)

```sh
pnpm --filter @xivmitplan/web dev
# In a second terminal:
curl -s -o /dev/null -w "/             → %{http_code}\n"        http://localhost:5173/
curl -s -o /dev/null -w "/plan         → %{http_code}\n"        http://localhost:5173/plan
curl -s -o /dev/null -w "/plan/<id>    → %{http_code}\n"        http://localhost:5173/plan/00000000-0000-0000-0000-000000000001
curl -s -o /dev/null -w "/login        → %{http_code}\n"        http://localhost:5173/login
```

All four should return `200`. The root `/` redirects to `/plan`
(client-side, so curl sees `200` for both).

### Browser walk-through (no Supabase) — FRU demo flow

1. Open http://localhost:5173/ — redirects to `/plan`.
2. Without a session, `/plan` redirects to `/login`. Pick any auth
   method (or click "Sign in" and sign in via your Supabase project
   if env vars are set).
3. Once signed in, on `/plan` click **New plan**. The dialog opens
   with an encounter picker showing FRU P1 (Light Rampant), FRU P2
   (Darklit Dragonsong), M1S, M2S, P1S, P4S grouped by raid.
4. Type a plan name (e.g. "FRU P1 prog day 1"), select **Light
   Rampant**, click **Create**. The URL becomes
   `/plan/<new-uuid>?name=…&encounterId=…`.
5. The plan editor opens. The right-side timeline rail shows the
   ~18-event FRU P1 base timeline (Pull → Hello World → Light
   Rampant tank buster → Darklit Dragonsong raidwide → … →
   Crystallize Time → Enrage buster → Phase 1 clear), grouped by
   minute (00:00, 01:00, 02:00, …).
6. Click any event — the ability picker slides in from the right,
   pre-anchored to that event. Pick a mit (e.g. Reprisal) → **Add
   to plan**. The left-side mitigations rail updates with the new
   row.
7. The realtime status badge in the top bar flips `connecting` →
   `Live` (or `Error` after 10s if no Supabase).
8. Click another event, add another mit. Both rows persist in the
   Y.Doc and (when Supabase is connected) are debounced into
   `ydoc_snapshots` via the `upsert_ydoc_snapshot` RPC.
9. Open the same `/plan/<uuid>` URL in a second browser profile.
   When both are connected to Supabase, the second profile sees the
   first profile's mitigations appear within ~100ms.

### Without Supabase env vars

Without `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set, the
`data-source` facade falls back to in-memory sample data:
- `listEncounters()` returns 6 sample encounters
- `listAbilities()` returns 23 sample abilities
- `listMyPlans()` returns 3 sample plans
- `getTimelineForEncounter()` returns the sample-data events
- `createPlan()` mints a UUID locally (no persistence)
- `getYDocSnapshot()` returns null (no restore on cold load)

The dev server boots and the plan editor renders the timeline +
ability picker; mitigations persist in the Y.Doc for the session
but aren't synced to other tabs (no realtime).

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

## Next steps (Phase 2+)

Phase 1 is complete: the plan editor renders the encounter's base
timeline, the encounter picker ships FRU P1/P2 as default options,
and every Supabase RPC + Edge Function has a live code path with a
sample-data fallback for offline dev. The product work to get to a
usable v1 beta continues into Phase 2.

### Phase 2 — Learn mode (read-only encounter browser)

The lowest-risk next slice. Renders the catalog API + timeline view
+ action cards with confidence badges. No write paths.

- [ ] Add `/learn` route + `/learn/:id` detail (consumes
      `data-source.listEncounters()` + `getTimelineForEncounter()`).
- [ ] Render the encounter detail page with the timeline graph
      (`packages/domain` `TimelineGraph`) — visx axes + dnd-timeline
      shell.
- [ ] Add action cards with confidence badges (per-source fan-in from
      cactbot / triggernometry / fflogs sources).
- [ ] Add a Vitest + Playwright spec covering the encounter browse
      → detail navigation.

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

### Cloud setup (Phase 0+, blocker for end-to-end testing)

The bootstrap script automates migrations + Edge Function deploy.
The OAuth apps + Realtime policy binding are still manual GUI steps.

- [ ] Run `./scripts/supabase-bootstrap.sh dev` (creates the project
      link, applies migrations 0001-0004, deploys Edge Functions,
      prints a manual checklist).
- [ ] Create a Discord OAuth app, point the Supabase project's
      "Discord" provider at it.
- [ ] Bind the Realtime authorization policy in the Supabase Dashboard
      (Dashboard → Replication → Policies).
- [ ] Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local`.

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
pnpm --filter @xivmitplan/web test                 → 52 pass (5 test files)
pnpm --filter @xivmitplan/persistence test         → 0 (no tests yet; runs vitest in no-files mode)
pnpm --filter @xivmitplan/shared test              → 16 pass
pnpm --filter @xivmitplan/validation test          → 16 pass
pnpm --filter @xivmitplan/domain test              → 21 pass
pnpm --filter @xivmitplan/crdt test                → 2 pass
pnpm --filter @xivmitplan/web build                → 690 kB main + 79 kB yjs + 50 kB react vendor
pnpm --filter @xivmitplan/web dev                  → boots in ~150 ms; all 4 routes return 200
```

Test breakdown for the realtime + data path:
- 19 unit tests (`supabase-broadcast-provider.test.ts`)
- 4 cross-client integration tests (`supabase-broadcast-provider.integration.test.ts`)
- 8 contract tests enforcing the `RealtimeProvider` interface (`provider-contract.test.ts`)
- 16 data-source tests (8 fallback + 5 RPC + 1 internal, in `data-source.test.ts`)
- 5 usePlanDoc tests (Y.Doc binding + add/remove + reactive observe)

Note: `pnpm -r test` currently fails on `persistence` (no test files
yet) — filter with `--filter=!@xivmitplan/persistence` or run per-package
as shown above until persistence tests land in Phase 2.

## Phase 1 status (complete as of 2026-06-30)

- [x] Monorepo scaffolded (pnpm + Turborepo + catalog:)
- [x] Architecture locks recorded (ADR-0001 + ADR-0002 + ADR-0003)
- [x] Drizzle schema + 4 migrations (initial + ACL/RPC/validator + 8 PostgREST RPCs + reference seed)
- [x] Yjs CRDT package (`PlanDoc`, `ThrottledAwareness`, `PlanSnapshotShape`, `RealtimeProvider` interface)
- [x] Domain package (entities, ports, math, parsers, merger)
- [x] Realtime: custom `SupabaseBroadcastProvider` (~390 LOC) on Supabase Realtime Broadcast, debounced `upsert_ydoc_snapshot` + `crdt_validate_plan_doc` trigger
- [x] Web SPA scaffolded (React 19 + Vite + React Router 7) with the realtime bridge wired
- [x] **Data-source facade** (`apps/web/src/lib/data-source.ts`) — unified read/write API with sample-data fallback when no Supabase env vars are set
- [x] **Plan editor** renders the encounter's base timeline as a clickable rail of event cards; click an event → opens the ability picker pre-anchored
- [x] **Snapshot restore** via `load_ydoc_snapshot` RPC on cold load, before the realtime provider connects
- [x] **Encounter picker** in the "New plan" dialog — FRU P1, FRU P2, M1S, M2S, P1S, P4S are default options
- [x] **FRU seed migration** (`0004_xivmitplan_v1_seed.sql`) — 18 FRU P1 events + 20 FRU P2 events + 8 jobs + 23 abilities + 5 roles + 2 expansions
- [x] **Bootstrap script** (`scripts/supabase-bootstrap.sh`) — one-shot migrations + Edge Function deploy
- [x] 52 tests pass (19 realtime unit + 4 integration + 8 contract + 16 data-source + 5 usePlanDoc)
- [x] Production build passes (`vite build` produces a valid bundle)
- [x] Dev server boots in ~150 ms; all 4 routes return 200
- [x] Deno compat verified for the Edge Functions path
- [x] CI compliance gate enforces Path A (blocks re-introduction of y-supabase / Hocuspocus / Hono / Upstash / wrangler)
- [ ] Live Supabase + R2 + Discord OAuth accounts (out-of-band; follow `docs/infra-setup.md`)

Next: run `scripts/supabase-bootstrap.sh dev` against a live Supabase
project, configure the Realtime authorization policy in the Dashboard,
and demo the create-plan-from-FRU flow end-to-end with a second
browser tab joined to the same plan URL.

## License

TBD.
