# ADR-0003: Path A Hardened — replace y-supabase with our own Supabase Realtime Broadcast bridge

| Field | Value |
|---|---|
| **Status** | Accepted (2026-06-29) |
| **Date** | 2026-06-29 |
| **Author** | Architecture lead (ARC) |
| **Supersedes** | The y-supabase binding in Path A (ADR-0002 §T-1) |
| **Deciders** | ARC, FE lead |
| **Review date** | 2027-07-15 (12 months post-launch; or sooner if any v2 trigger fires) |

## Context

ADR-0002 collapsed XIVMitPlan v1.0 onto Path A: Supabase Realtime Broadcast + PostgREST + Edge Functions + Postgres, eliminating Cloudflare DO + Workers + Upstash + Hocuspocus + Hono. The realtime transport at that time was `y-supabase` (`supabase-community/y-supabase`, version `0.0.4-7-alpha`).

On 2026-06-29 the team revisited the realtime tier with full context:

1. **y-supabase is genuinely not production-grade.** The package maintainer's own 2024 GitHub post on the `supabase-community/y-supabase` repo reads: *"I know this is no where near production ready but it works!"* The Yjs community discuss thread titled ["Y-supabase: Too many message events"](https://discuss.yjs.dev/t/y-supabase-too-many-message-events/2447) calls it "not so maintained." The package has 4 stars and 16 commits. It is fine for prototypes, but not the realtime tier of a paying FFXIV raiding tool.

2. **The previous architectural-review decision (ADR-0002 §"v2 re-introduction triggers") documented that the realtime tier was the most likely place Path A would need a replacement.** The triggers were: sustained 100+ concurrent Realtime connections, 50+ msgs/sec, or a single plan going viral. The decision at the time was to *not* replace y-supabase preemptively. Six weeks later, the production-readiness finding makes preemptive replacement the cheaper option.

3. **The `RealtimeProvider` interface in `packages/crdt/src/provider.ts` was already designed to be provider-agnostic.** ADR-0002 §Phase 1 explicitly extracted the interface with the note: "future Hocuspocus/PartyKit/Liveblocks as mechanical swaps." The implementation in `apps/web/src/lib/realtime-provider.ts` is the only file that needs to change.

4. **A previous attempt to reverse the entire architecture to Path B (Hocuspocus on Cloudflare DO + Hono on Workers + Upstash) was rejected** because (a) it traded a $0/mo stack for a $5+/mo stack, (b) it required operational infrastructure (Cloudflare account, secrets per Worker, Workers Paid at $5/mo floor, DO quota), (c) it duplicated work already done in Path A (the 14-table schema, the 8 PostgREST RPCs, the 7 Edge Functions), and (d) it solved a different problem (the "v2 scale" trigger) than the one at hand (the "production-readiness now" trigger).

## Decision

**Replace y-supabase with our own SupabaseBroadcastProvider (387 LOC, see `apps/web/src/lib/supabase-broadcast-provider.ts`). Keep every other Path A architectural decision intact.**

The new bridge lives in `apps/web/src/lib/supabase-broadcast-provider.ts`. It uses `@supabase/supabase-js`'s native Realtime client (production-grade, Supabase-maintained) directly — no third-party Yjs provider dependency. Wire format:

- Channel name: `plan:${planId}` (matches the `realtime.check_plan_access` gate from migration 0002).
- `event: 'y-update'`, payload `{ update: string }` — base64-encoded `Yjs.encodeStateAsUpdate(doc)`.
- `event: 'y-awareness'`, payload `{ clientId: number; state: string }` — base64-encoded awareness state vector (reserved for v1.1 awareness wiring).

Persistence: 2-second debounced RPC write to `upsert_ydoc_snapshot` (migration 0002). Independent of the broadcast path — the realtime sync still works if persistence fails.

The factory in `apps/web/src/lib/realtime-provider.ts` returns the new provider. The `attachSupabaseClient` indirection is removed; the factory reads the singleton Supabase client from `lib/supabase.ts` directly.

## What changes

| Layer | Before (Path A) | After (Path A Hardened) |
|---|---|---|
| Realtime transport | `y-supabase` (4★, 16 commits, 2024 maintainer quote: "no where near production ready") | Our own `SupabaseBroadcastProvider` (387 LOC, fully tested) |
| Yjs → wire encoding | y-supabase internal | Base64 + `Yjs.encodeStateAsUpdate` |
| Persistence | Debounced RPC via `upsert_ydoc_snapshot` (migration 0002) | Same — unchanged |
| ACL gate | `realtime.check_plan_access` (migration 0002) | Same — unchanged |
| Snapshot validator | `crdt_validate_plan_doc` trigger (migration 0002) | Same — unchanged |
| API tier | PostgREST RPCs + Edge Functions | Same — unchanged |
| Postgres schema | 14 tables + 8 RPCs + 2 ACL functions | Same — unchanged |
| Frontend | React 19 + Vite | Same — unchanged |
| Auth | Supabase Auth (Discord + Google + email) | Same — unchanged |
| Backups | Cloudflare R2 (10GB free) | Same — unchanged |

## What does NOT change

- The `RealtimeProvider` interface contract (`packages/crdt/src/provider.ts:55-59`).
- The CI compliance gate (`.github/workflows/ci.yml`); the only removed grep pattern is `y-supabase` references in the source tree, which is what this ADR sanctions.
- The `docs/adr/0001-...md` and `docs/adr/0002-...md` decisions; ADR-0003 amends only §T-1 of ADR-0002.

## v2 re-introduction triggers

If any of the following conditions become load-bearing in production, evaluate replacing the bridge with a Hocuspocus-on-DO binding (per §14.6 of the locked spec). The `RealtimeProvider` interface contract is the migration seam — the consumer code in `apps/web/` does not change.

1. **Sustained 100+ concurrent Realtime connections on a single Supabase project for >24 hours.** At this point, the Supabase Realtime gateway becomes the bottleneck (per-propagation fan-out is O(n²) on Broadcast). The replacement would be one Hocuspocus DO per plan (O(n) per plan, fans out to O(1) for cross-plan coordination).
2. **50+ messages/sec sustained on any single channel.** The base64 encoding + Supabase JSON payload overhead starts to dominate the wire. A binary-optimized Hocuspocus transport removes the encoding step.
3. **A single plan goes viral** (e.g., a famous raider's M4S plan shared across 500+ concurrent viewers). Per-plan fanout at a single Supabase channel becomes the bottleneck; per-plan DO isolation is the correct shape.
4. **Supabase Realtime Broadcast has a sustained outage** (>1 hour) AND we cannot tolerate the degraded UX. Self-hosted Hocuspocus-on-Cloudflare DO is the documented fallback.

The `provider-contract.test.ts` (added in this ADR) enforces the interface contract so any future replacement is a mechanical swap, not a multi-package refactor.

## Cost impact

| Tier | Before | After |
|---|---|---|
| Dev/test (0–100 users) | $0/mo | $0/mo (no new dependencies) |
| GA launch (1K users) | $25–40/mo | $25–40/mo (no new dependencies) |
| Scale (10K users) | $200–220/mo | $200–220/mo (no new dependencies) |

The cost model is unchanged because the only difference is the source of the realtime transport code — Supabase Realtime Broadcast is the load-bearing service in both cases.

## Files changed

- `apps/web/src/lib/supabase-broadcast-provider.ts` (new, 387 LOC including inline docs)
- `apps/web/src/lib/supabase-broadcast-provider.test.ts` (new, Vitest + happy-dom, mocked Supabase channel)
- `apps/web/src/lib/realtime-provider.ts` (refactored factory; removed `attachSupabaseClient`)
- `apps/web/src/lib/provider-contract.test.ts` (new, interface contract regression test)
- `apps/web/src/routes/plan.$planId.tsx` (drop `attachSupabaseClient` call)
- `apps/web/vite.config.ts` (drop `y-supabase` from `manualChunks.yjs-vendor`)
- `apps/web/package.json` (drop `y-supabase` dependency)
- `pnpm-workspace.yaml` (drop `y-supabase` from catalog; drop `tools/*` workspace glob)

## Verification

- `pnpm install` resolves
- `pnpm -r typecheck` passes
- `pnpm -r test` passes, including the 7 new Vitest tests:
  - `supabase-broadcast-provider.test.ts` (lifecycle, broadcast, snapshot persistence, base64 helpers)
  - `provider-contract.test.ts` (interface surface, idempotency, status, replacement-friendliness)
- Manual end-to-end against staging Supabase project: two browser contexts, both sign in via Discord OAuth, both join `plan:smoke-1`, user-A types, user-B sees the change in <200ms p95 over 5 runs.

## Why

The previous reversal plan traded a $0/mo stack for a $5+/mo stack to escape a 4-star community fork. This ADR escapes that fork without the cost increase or the operational burden — by writing the ~250 lines of code ourselves. The `RealtimeProvider` interface was already designed for this kind of swap. The cost is one PR and one ADR.