# ADR-0002: Supabase-only backend collapse (Path A)

| Field | Value |
|---|---|
| **Status** | Accepted (2026-06-27) |
| **Date** | 2026-06-27 |
| **Author** | Architecture lead (ARC) |
| **Supersedes** | Portions of `docs/adr/0001-xivmitplan-v1-architecture-locked.md` (T-1, T-4, T-6 decisions) |
| **Deciders** | ARC, BE, FE, DATA, SRE leads |
| **Review date** | 2026-07-15 (post-Phase-0); 2026-07-19 (end of Phase 0) |

## Context

ADR-0001 (locked 2026-06-15) collapsed XIVMitPlan v1.0 to **Hocuspocus v4 on Cloudflare Durable Objects** for realtime, **Hono on Cloudflare Workers** for the API, **Upstash Redis** for the cache, and **Cloudflare R2** for backups. On 2026-06-27, an architectural review determined that the stack can be collapsed further into Supabase-managed services, eliminating three of the four application-tier vendors. This ADR records the lock and the new collapsed architecture.

The trigger for the review was:

1. The codebase is **pre-deploy scaffolding** — every route in `apps/server` returns `{ wiring: 'phase-0' }` placeholders. No Drizzle queries run, no outbound HTTP, no OAuth callbacks. The migration lands before the first production code, which makes the swap much cheaper than a post-deploy rewrite.
2. The "Hocuspocus on DO" runtime is actually `y-partyserver`'s `YServer` — the `@hocuspocus/*` extensions are declared in `package.json` but never imported. The swap replaces one Yjs server scaffold with another, not battle-tested Hocuspocus machinery.
3. No server-side Yjs validation runs today — `packages/crdt/validator.ts` is test-only. The migration doesn't regress this; it can introduce it.
4. Upstash Redis is wired but **never called** in any route. Dropping it is purely subtractive.
5. The user prefers free options (per [[user-prefers-free-options]]); the GA cost target should drop with vendor count.

The intended outcome: by end of Phase 0 (target: 2026-07-19), `apps/realtime` and `apps/server` are deleted, the Web app talks to Supabase directly via PostgREST + Realtime Broadcast + Edge Functions, Upstash is gone, and Cloudflare Workers + Durable Objects are retired.

## Decision

**The 2026-06-27 review is the build-from contract for XIVMitPlan v1.0.** Where ADR-0002 disagrees with ADR-0001 on T-1, T-4, T-6, ADR-0002 wins. ADR-0001 remains authoritative on T-2, T-3, T-5, T-7, T-8, T-9, T-10, the locked decisions §"Locked decisions," the success metrics, and the §"Compliance" §1-5 cut-list rules.

## Superseded decisions (from ADR-0001)

| # | ADR-0001 decision | ADR-0002 outcome |
|---|---|---|
| **T-1** | Yjs + Hocuspocus v4 on Cloudflare DO (via y-partyserver), pin `hocuspocus@^4.2.0` | **RETIRED**. New T-1: y-supabase on Supabase Realtime Broadcast |
| **T-4** | Hono on Cloudflare Workers, Workers Paid at ~100-300 active plans | **RETIRED**. New T-4: PostgREST + Supabase Edge Functions. Workers Paid is no longer required |
| **T-6** | Upstash Redis, 500K cmds/mo free | **RETIRED**. New T-6: Postgres UNLOGGED tables + `pg_cron` + `LISTEN/NOTIFY` for v1's cache + debounce set |
| **T-7** | Cloudflare R2 for backups, 10GB free | **CONFIRMED**. Retained for Yjs snapshot backups (zero egress is hard to beat) |

## Locked decisions (Path A)

| # | Decision | Reference |
|---|---|---|
| 1 | **Cut Live mode from v1. Ship Learn + Plan only.** (carried from ADR-0001) | ADR-0001 §1.1 #1 |
| 2 | **Monorepo from scratch. Not an in-place refactor of MitPlan v1.** (carried) | ADR-0001 §1.1 #2 |
| 3 | **Account-required auth. Drop anonymous support.** (carried) | ADR-0001 §1.1 #3 |
| 4 | **Cloudflare R2 for Yjs snapshot backups, 10GB free.** | This ADR §T-7 |
| 5 | **All three ingestion sources in v1: Cactbot .txt + Triggernometry XML + FFLogs GraphQL.** (carried) | ADR-0001 §1.1 #5 |
| 6 | **y-supabase + Supabase Realtime Broadcast for the Yjs wire protocol.** | This ADR §T-1 |
| 7 | **PostgREST + Supabase Edge Functions for the API surface.** | This ADR §T-4 |
| 8 | **Postgres-as-cache: materialized views + `pg_cron` for catalog; UNLOGGED + TTL for debounce set; `LISTEN/NOTIFY` for cross-instance invalidation.** | This ADR §T-6 |

## Tech review verdicts (Path A)

| # | Choice | Verdict | Pin | Rationale |
|---|---|---|---|---|
| T-1 | y-supabase on Supabase Realtime Broadcast | **CONFIRMED with migration trigger** | `y-supabase@^0.1.0` (re-evaluate at 2026-07-15 ADR review) | The package is v0.1.0 with 4★ and 16 commits. Free tier (200 CC, 2M msgs/mo) fits 100-user scale but hard-caps at GA. Migration to Pro ($25/mo, 5M msgs) when concurrent connections exceed 100 sustained or msgs/sec exceed 50 |
| T-4 | PostgREST + Supabase Edge Functions | **CONFIRMED** | `@supabase/supabase-js@^2.46.0` | PostgREST covers 8 CRUD-shaped routes via RPCs; Edge Functions (Deno, free tier 500K/mo) cover 7 non-CRUD routes (3 timeline ingests + 4 mutation flows). Trade-off: lose tRPC end-to-end type-safety — mitigated with Zod-typed `supabase.rpc<TArgs, TReturn>()` wrappers |
| T-6 | Postgres UNLOGGED + `pg_cron` + `LISTEN/NOTIFY` | **CONFIRMED with v2 trigger** | `pg_cron` extension (Supabase built-in) | No atomic primitives required at v1 scale. Re-introduction trigger documented below |
| T-7 | Cloudflare R2 | **CONFIRMED** | n/a (Cloudflare-managed) | 10GB free handles v1 backups; zero egress is hard to beat |
| T-2 | Supabase Auth (Discord + Google + email) | **CONFIRMED** (carried) | `@supabase/supabase-js@^2.46.0` | JWT verification is native to PostgREST/Realtime/Storage; no custom verify code |
| T-3 | dnd-timeline + @dnd-kit + visx | **CONFIRMED** (carried) | `dnd-timeline@3.1.1` | No change |
| T-5 | Supabase Postgres + Drizzle ORM | **CONFIRMED** (carried) | `drizzle-orm@^0.36.0` | The 14-table schema and Drizzle definitions stay; only the runtime access pattern changes |
| T-8 | React 19 + Vite + tooling stack | **CONFIRMED** (carried) | `react@^19.0.0` | No change |
| T-9 | FFXIV 8.0 / Evercold data-model | **CONFIRMED** (carried) | n/a | No change |
| T-10 | xivapi.com primary game-data | **CONFIRMED** (carried) | n/a | No change |

## Server-side Yjs validation (Path A addition)

The Path B architecture accepted any client-submitted Yjs update on the DO. Path A introduces server-side validation via a `BEFORE INSERT` Postgres trigger on `ydoc_snapshots`:

```sql
CREATE FUNCTION crdt_validate_plan_doc(update bytea) RETURNS boolean AS $$
  -- PL/pgSQL wrapper that re-implements the Zod PlanSnapshotShape
  -- against the decoded Yjs update. Returns false on shape mismatch.
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TRIGGER ydoc_snapshots_validate
  BEFORE INSERT ON ydoc_snapshots
  FOR EACH ROW EXECUTE FUNCTION crdt_validate_plan_doc(NEW.update);
```

The trigger only fires on the debounced persistence write (every 2-10s), not on every broadcast. Latency impact: zero on the realtime path.

## ACL gate re-implementation (Path A addition)

The Path B DO enforced `checkAccess` (read `plans.owner_id` + `plan_access` with service-role key, 30s cache) before forwarding WebSocket upgrades. Path A encodes the same `OWNER | EDITOR | read-only` semantics in Supabase Realtime authorization via a Postgres function:

```sql
CREATE FUNCTION realtime.check_plan_access(channel_name text, claims jsonb)
  RETURNS boolean AS $$
  -- Parses plan_id from channel_name (format: plan:<uuid>),
  -- reads plans.owner_id + plan_access.role with the caller's JWT claims,
  -- returns true iff claims.sub = owner_id OR plan_access.role IN ('EDITOR', 'OWNER')
  -- OR claims.plan_access = 'read' (share-link path).
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

The function is registered as a Realtime authorization policy bound to channels named `plan:*`. Calls happen in the Realtime gateway before message delivery — 0ms client-side latency cost.

## Cost model (Path A recomputed 2026-06-27)

| Scale | Path B (ADR-0001) | Path A (this ADR) | Savings |
|---|---|---|---|
| 100 users / 5 statics | $0-1/mo | $0/mo | ~$0 |
| **1K users / 50 statics (GA target)** | $35-47/mo | $25-40/mo | **$5-15/mo** |
| 10K users / 500 statics | $220-355/mo | $200-220/mo | **$80-150/mo** |

GA composition: Supabase Pro $25 + R2 $0 + Edge Functions within free (500K/mo invocations) + Auth within free (100K MAU). The $5-15/mo savings come primarily from dropping the Cloudflare DO ($5-15/mo) and Workers Paid ($5/mo) line items.

10K composition: Pro $25 + Medium compute $60 + Realtime overages (10K peak CC × $10/1K over included + ~25M msgs over included × $2.50/M ≈ $113) + Edge Functions $6 + Auth $0. The realtime overages dominate; this is the migration trigger for v2's y-party-server or Liveblocks path.

## v2 re-introduction triggers

The collapsed architecture is the right call at v1's scale. Document the conditions under which to re-introduce the dropped components:

| Component | Re-introduce when |
|---|---|
| **Upstash Redis** | (a) p95 read latency on the catalog materialized view exceeds 5ms; (b) the rate-limit primitive on plan-write attempts requires atomic `INCR + EXPIRE` semantics; (c) the dirty-plan set membership exceeds 10K active keys |
| **Cloudflare Workers / DO / Hocuspocus** | (a) concurrent connections exceed 5K sustained; (b) per-update server-side validation needed that can reject without roundtripping through a function; (c) any payload > 3MB (Realtime Broadcast hard cap is 3MB on Pro) |
| **Liveblocks (managed Yjs)** | (a) the in-house realtime path becomes a maintenance burden; (b) Liveblocks free tier (3,000 collab-min/mo) covers the active static count at that time |

## Success metrics

Carried unchanged from ADR-0001 §"Success metrics":

- 5,000 registered users (no anonymous users)
- 500 weekly active plans
- 100 daily active statics
- p95 edit sync < 200ms
- Median plan-construction time < 20 min for a Savage floor
- Zero data-loss conflicts in collaborative editing (§20.3 stress-test suite)
- Timeline data < 48h stale post-patch
- < 5% of plans reference a removed ability at any 8.0 patch point

Cost target: < $50/mo at 1K weekly active plans. Path A puts the honest read at **$25-40/mo** at 1K users.

## Compliance (Path A enforcement)

Builds are compliant with this ADR when:

1. No `apps/realtime` directory exists.
2. No `apps/server` directory exists.
3. No `apps/act-ingester` package exists.
4. No `live_sessions` or `act_events` tables exist.
5. No anonymous edit tokens or `is_anonymous` user flag.
6. The CI workflow fails any PR that:
   - Adds a dependency matching `y-partyserver`, `@hocuspocus/*`, `hono`, `@hono/*`, `@upstash/*`, `@hono/*`, `@trpc/*`.
   - Re-introduces a `wrangler.jsonc` with `durable_objects` bindings or `nodejs_compat`.
   - Re-introduces an `apps/realtime`, `apps/server`, or `apps/act-ingester` directory.
   - Adds a `live_sessions`, `act_events`, or `is_anonymous` reference.
   - Adds a `wrangler.toml` or `wrangler.jsonc` outside of any future approved Cloudflare app.
7. The Phase 0-5 migrations (`0001_xivmitplan_v1_initial.sql`, `0002_xivmitplan_v1_acl.sql`, `0003_xivmitplan_v1_rpcs.sql`) are applied in order on every Supabase project (staging + prod).
8. The `realtime.check_plan_access()` function and the `crdt_validate_plan_doc()` trigger are deployed on staging and prod.

## References

- [`docs/adr/0001-xivmitplan-v1-architecture-locked.md`](0001-xivmitplan-v1-architecture-locked.md) — the locked base architecture
- [`docs/infra-setup.md`](../infra-setup.md) — manual setup walkthrough (will be slimmed in Phase 5)
- The full migration plan that operationalizes this ADR: `/Users/eugene/.claude/plans/fizzy-growing-falcon.md`
- [[xivmitplan-v1-tech-review]] — the 2026-06-14 re-verification that Path A re-evaluates
- [[user-prefers-free-options]] — user preference that motivated the Path A choice

---

**End of ADR-0002.** Next review: 2026-07-15 (post-Phase-0).