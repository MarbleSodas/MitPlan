# XIVMitPlan v1.0

> **FFXIV raid mitigation planner.** Authenticated Plan core with Yjs
> collaboration, Supabase persistence, legacy-plan migration, and a sample-data
> fallback for local development. Learn, full ingestion, and Live/ACT surfaces
> remain staged work.

## What works today

The current build is a runnable, type-safe monorepo with an authenticated Plan
core. The dev server and sample-data fallback work without cloud credentials;
the realtime bridge, catalog adapters, legacy conversion, plan management, and
mitigation evaluator are covered by automated tests. A live Supabase project is
still required for authentication, persistence, sharing, and cross-client
realtime verification.

The **working demo**: sign in, click **New plan**, pick **FRU P1**
(Light Rampant) as the base timeline, click any event on the timeline
to anchor a mitigation, and use the plan actions menu to rename, duplicate,
export, or delete the plan according to the current role. With Supabase
configured, the same plan can be opened in another authenticated browser
session for realtime collaboration.

| Surface | State | Needs Supabase? |
|---|---|---|
| Web SPA shell + nav | Functional | No |
| Plan list and creation (`/plan`) | Functional with sample fallback and live RPC path | Live data needs it |
| Plan editor (`/plan/:planId`) | Timeline, picker, assignments, responsive UI, role-aware editing | Realtime and persistence need it |
| Plan management | Rename, duplicate, owner-only delete, recovery export | Live mutations need it |
| Login and OAuth callback | UI and callback exchange are implemented | Yes, for sign-in |
| Realtime bridge | Custom `SupabaseBroadcastProvider`, unit/integration/contract covered | Live Supabase for browser sync |
| Snapshot restore and persistence | Cold-load restore plus debounced Yjs snapshots | Live Postgres |
| Catalog and timeline adapters | Planner metadata, canonical selection, malformed-row handling | Live RPCs for production data |
| Legacy migration | Conversion, provenance display, and claim path | Live Auth/DB for claims |
| Edge Functions | Timeline ingest, sharing, legacy claim, and plan CRUD source | Deploy required |
| Data-source facade | Sample fallback plus typed RPC adapters | Either |

## Quick links

- [Architecture (2026-06-14 lock)](2026-06-14-xivmitplan-v1-architecture.md) — the build-from spec.
- [ADR-0001](docs/adr/0001-xivmitplan-v1-architecture-locked.md) — the original architecture lock + tech review verdicts.
- [ADR-0002](docs/adr/0002-supabase-only-backend.md) — Path A (Supabase-only backend) collapse.
- [ADR-0003](docs/adr/0003-path-a-hardened-supabase-broadcast.md) — y-supabase replaced with our own `SupabaseBroadcastProvider`. **The current authoritative realtime decision** (2026-06-29).
- [ADR-0004](docs/adr/0004-core-release-scope.md) — the migration-focused core release boundary.
- [Project status](docs/project-status.md) — current implementation state, decisions in force, verification, and release gaps.
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
│   ├── adr/                 # Architecture and scope decisions
│   ├── project-status.md    # Current implementation state and release gaps
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
# Expected: 106 pass (7 test files)
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
pnpm typecheck             # all 6 packages typecheck clean
pnpm --filter @xivmitplan/web build   # production bundle
```

The production build passes. Vite currently reports non-blocking sourcemap,
circular-chunk, and large-chunk warnings. No Hocuspocus / Hono / Upstash /
wrangler / Cloudflare DO code is included in the bundle (CI compliance gate
enforces this - see `.github/workflows/ci.yml`).

## Roadmap And Release Work

The authenticated Plan core is implemented, but the project is not yet a
production release. See [Project status](docs/project-status.md) for the
current implementation state, decisions, verification baseline, and release
gaps. The following roadmap remains open.

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
      link, applies migrations 0001-0013, deploys Edge Functions,
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

## Verification (2026-07-14)

```
pnpm typecheck                                      → 6 packages, all pass
pnpm test                                           → all workspace tests pass
pnpm --filter @xivmitplan/web test                  → 106 pass (7 test files)
pnpm --filter @xivmitplan/web build                 → production bundle passes with Vite warnings
deno check --no-lock --import-map=supabase/functions/import_map.json \
  apps/edge/functions/plans-update/index.ts             → pass
deno check --no-lock --import-map=supabase/functions/import_map.json \
  apps/edge/functions/plans-delete/index.ts             → pass
deno check --no-lock --import-map=supabase/functions/import_map.json \
  apps/edge/functions/plans-duplicate/index.ts         → pass
```

The web lint script is currently blocked because ESLint 9 expects an
`eslint.config.*` file that is not present. Full-repository Prettier also has
existing failures; the files changed in the current slice are formatted.
Live Supabase, Edge Function deployment, and Playwright staging verification
remain outstanding.

## License

TBD.
