# XIVMitPlan v1.0

> **FFXIV raid mitigation planner.** Learn + Plan modes, real-time
> collaborative editing, three-source timeline ingestion, free at the
> 1K-user tier.

## Quick links

- [Architecture](2026-06-14-xivmitplan-v1-architecture-locked.md) — the
  build-from spec, locked 2026-06-14.
- [Execution plan](EXECUTION-PLAN.md) — the 36-week buildable schedule.
- [ADR-0001](docs/adr/0001-xivmitplan-v1-architecture-locked.md) — the
  architecture lock + tech review verdicts + success metrics.
- [Infrastructure setup](docs/infra-setup.md) — the one-time manual
  walkthrough of the Cloudflare, Supabase, Upstash, R2, and OAuth
  accounts.
- [Previous draft (archived)](docs/archive/2026-06-06-hearthstone-v1-architecture-locked.md) — the
  2026-06-06 Hearthstone draft; superseded by the 2026-06-14 spec.

## Tech stack

| Layer | Tech | Source |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + dnd-timeline + visx | §7.1, §7.10 |
| Backend | PostgREST + Supabase Edge Functions | ADR-0002 §T-4 |
| Realtime | Yjs + y-supabase on Supabase Realtime Broadcast | ADR-0002 §T-1 |
| Database | Supabase Postgres + Drizzle ORM | §7.4 |
| Cache | Postgres UNLOGGED + `pg_cron` + `LISTEN/NOTIFY` | ADR-0002 §T-6 |
| Auth | Supabase Auth (Discord + Google + email) | §7.7 |
| Snapshots | Cloudflare R2 (10GB free) | §7.6 |
| Tests | Vitest + Playwright + fast-check + Testcontainers | §7.9, §20 |
| Build | pnpm workspaces + Turborepo | §7.12 |
| Observability | Pino → Supabase Logs; Sentry; Honeycomb | §7.8, §21.3 |

## Repo layout

```
xivmitplan/
├── apps/
│   ├── web/                 # React 19 + Vite SPA
│   └── edge/                # Supabase Edge Functions (Deno; timeline ingests + share-token)
├── packages/
│   ├── domain/              # Pure TypeScript: entities, ports, math, parsers
│   ├── persistence/         # Drizzle + Postgres (no Redis)
│   ├── crdt/                # Yjs document shape + awareness + provider interface
│   ├── validation/          # Zod schemas (single source of truth)
│   └── shared/              # i18n, time, Result, branded IDs
├── data/                    # Versioned game data (added in Phase 1)
├── docs/
│   ├── adr/                 # Architecture decision records (ADR-0001 + ADR-0002)
│   ├── infra-setup.md       # Deploy walkthrough
│   └── archive/             # Historical records
├── tools/                   # One-shot scripts (added in Phase 1+)
├── package.json             # pnpm workspace root
├── pnpm-workspace.yaml      # catalog: pins the locked versions
├── turbo.json
├── tsconfig.base.json
├── drizzle.config.ts
└── 2026-06-14-xivmitplan-v1-architecture.md   # historical record (superseded by ADR-0002)
```

## Quickstart (local dev)

```sh
pnpm install
# Then follow docs/infra-setup.md §1 to start the local stack.
```

## Phase 0 status

- [x] Monorepo scaffolded (pnpm + Turborepo + catalog:)
- [x] Architecture locks recorded (ADR-0001 + ADR-0002 / Path A)
- [x] Drizzle schema + migrations 0001, 0002 (ACL/RPCs/validation trigger)
- [x] Yjs CRDT package (PlanDoc, awareness, validator, provider interface)
- [x] Domain package (entities, ports, parsers, math)
- [x] Realtime: y-supabase on Supabase Realtime Broadcast (replaces Hocuspocus+DO)
- [x] Persistence: Drizzle + Postgres + `upsert_ydoc_snapshot` RPC + size validator
- [x] Web SPA scaffold (React 19 + Vite + React Router 7) with y-supabase binding
- [x] Zod validation package (single source of truth)
- [x] Deno compat verified for the timeline-ingest Edge Functions path
- [x] Infrastructure setup walkthrough (docs/infra-setup.md)
- [ ] Phase 4: Edge Functions + PostgREST RPCs + delete apps/server
- [ ] Phase 5: CI compliance gates + docs slim + memory updates
- [ ] Live Supabase + Cloudflare R2 + OAuth accounts (out-of-band)

Next: create the live accounts per [docs/infra-setup.md](docs/infra-setup.md) and run the first deploy.

## License

TBD.
