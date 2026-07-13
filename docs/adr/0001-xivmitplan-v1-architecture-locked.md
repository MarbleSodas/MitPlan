# ADR-0001: XIVMitPlan v1.0 architecture lock

| Field | Value |
|---|---|
| **Status** | Accepted (2026-06-15) |
| **Date** | 2026-06-15 |
| **Author** | Architecture lead (ARC) |
| **Supersedes** | `docs/archive/2026-06-06-hearthstone-v1-architecture-locked.md` (renamed: Hearthstone → XIVMitPlan) |
| **Deciders** | ARC, BE, FE, DATA, SRE, QA, PM leads |
| **Review date** | 2026-07-15 (end of Phase 0) |

## Context

The 2026-06-05 aspirational draft of the FFXIV raid-mit-planner architecture was reviewed and locked on 2026-06-06 as "Hearthstone v1." The 2026-06-14 review pass renamed the project to **XIVMitPlan v1.0**, retired the dnd-timeline + React 19 risk, updated the cost model to current Cloudflare/Supabase/Upstash pricing, and tightened the migration plan with owners + acceptance criteria. This ADR records the lock and the 5 locked decisions, the 10 tech review verdicts, the 8 success metrics, and the 8 "next steps" from §1.5 of the architecture doc.

The source of truth is [`2026-06-14-xivmitplan-v1-architecture-locked.md`](../../2026-06-14-xivmitplan-v1-architecture-locked.md) (2065 lines, 26 sections). This ADR is the index.

## Decision

**The 2026-06-14 specification is the build-from contract for XIVMitPlan v1.0.** Where the 2026-06-14 spec disagrees with the 2026-06-06 draft, the 2026-06-14 spec wins.

## Locked decisions (architecture §1.1)

| # | Decision | Reference |
|---|---|---|
| 1 | **Cut Live mode from v1. Ship Learn + Plan only.** | §1.1 #1, §1.2, §3.3 |
| 2 | **Monorepo from scratch. Not an in-place refactor of MitPlan v1.** | §1.1 #2, §11 |
| 3 | **Account-required auth. Drop anonymous support.** | §1.1 #3, §7.7 |
| 4 | **Cloudflare DO for Hocuspocus from day one. Reject $5 VPS fallback.** | §1.1 #4, §7.3, §14 |
| 5 | **All three ingestion sources in v1: Cactbot .txt + Triggernometry XML + FFLogs GraphQL.** | §1.1 #5, §12 |

## Tech review verdicts (architecture §1.4)

| # | Choice | Verdict | Pin |
|---|---|---|---|
| T-1 | Yjs + Hocuspocus v4 on Cloudflare DO (via y-partyserver) | CONFIRMED | `hocuspocus@^4.2.0` (re-evaluate in 60 days) |
| T-2 | Supabase Auth (Discord + Google + email) | CONFIRMED with citation fix | 20–35% social-OAuth lift (replaces 1.6–1.8× Discord-vs-email) |
| T-3 | dnd-timeline + @dnd-kit + visx | KEEP — risk RETIRED | `dnd-timeline@3.1.1`, `@dnd-kit/core@6.3.1`, `@visx/{axis,scale}@4.0.0` |
| T-4 | Hono on Cloudflare Workers | CONFIRMED | `hono@^4.6`, Workers Paid at ~100–300 active plans |
| T-5 | Supabase Postgres + Drizzle ORM | CONFIRMED with PITR decision | `drizzle-orm@^0.36`; 15-min cron to R2 (free) replaces PITR $100/mo |
| T-6 | Upstash Redis | CONFIRMED with detail fix | 500K cmds/mo (was 10K/day before Mar 2025) |
| T-7 | Cloudflare R2 | CONFIRMED | Free 10GB handles v1 backups |
| T-8 | React 19 + Vite + TypeScript + tRPC + zustand + Zod + Vitest + Playwright + fast-check + Testcontainers + Pact + Pino + Sentry + Honeycomb | CONFIRMED | `react@^19`, `vite@^5`, `typescript@^5.6` |
| T-9 | FFXIV 8.0 / Evercold data-model | UPDATE | `(jobId, abilityId, mode)` composite key; 8.0 launches Jan 2027 |
| T-10 | xivapi.com as primary game-data source | CONFIRMED | SaintCoinach is the documented fallback |

## Success metrics (architecture §1.3)

12 months post-GA:

- 5,000 registered users (no anonymous users)
- 500 weekly active plans
- 100 daily active statics
- p95 edit sync < 200ms
- Median plan-construction time < 20 min for a Savage floor
- Zero data-loss conflicts in collaborative editing (§20.3 stress-test suite)
- Timeline data < 48h stale post-patch
- < 5% of plans reference a removed ability at any 8.0 patch point

Cost target: < $50/mo at 1K weekly active plans. The 2026-06-14 recompute (§21.4) puts the honest read at **$35-47/mo** at 1K users.

## Concrete next steps (architecture §1.5)

1. Initialize the monorepo at `github.com/MarbleSodas/xivmitplan`.
2. Stand up the Supabase + Cloudflare + Upstash accounts with the three-project split.
3. Deploy the empty `apps/realtime` Hocuspocus-on-DO.
4. Migrate the v1 MitPlan reference catalog into the new Supabase project.
5. Author the locked package versions in `pnpm-workspace.yaml` `catalog:`.

The 36-week execution plan that operationalizes this is [`EXECUTION-PLAN.md`](../../EXECUTION-PLAN.md).

## Consequences

- The untracked files in the current MitPlan working tree are **not** migrated. Their work informs the new code but is rewritten against the new architecture. (§1.1 #2)
- MitPlan v1's "Universal Edit Access" model is replaced by an account-claim flow (§7.7.5, §17.7, §22.7).
- The 7-week "Phase 5 — Live mode" block in the 2026-06-05 draft §22.6 is removed and the time is redistributed.
- The `$5 VPS self-host` Hocuspocus path is rejected. The 2× cost delta is paid on purpose for operational simplicity and per-plan isolation. (§1.1 #4, §21.4)

## Compliance

Builds are compliant with this ADR when:

1. No `apps/act-ingester` package exists.
2. No `LiveSession` bounded context exists; no `live_sessions` or `act_events` tables exist.
3. No `is_anonymous` user flag, no anonymous edit token, no anonymous plan claim at edit time.
4. `apps/realtime` is deployed as a Durable Object Worker with one DO per plan room, not as a self-hosted Node process.
5. `packages/domain/parsers/{cactbot,triggernometry,fflogs}/` are all built and wired.
6. The `pnpm-workspace.yaml` `catalog:` pins the locked versions from the table above.

The CI workflow must fail any PR that introduces a dependency or table from the cut list.

## References

- [`2026-06-14-xivmitplan-v1-architecture-locked.md`](../../2026-06-14-xivmitplan-v1-architecture-locked.md) — the build-from spec
- [`EXECUTION-PLAN.md`](../../EXECUTION-PLAN.md) — the 36-week buildable plan
- [`docs/archive/2026-06-06-hearthstone-v1-architecture-locked.md`](../archive/2026-06-06-hearthstone-v1-architecture-locked.md) — the previous locked draft (historical record)
- Architecture §7.7.5 (Supabase Auth + Discord/Google/email provider matrix)
- Architecture §14.6 (Production deployment playbook for Hocuspocus on Cloudflare DO)
- Architecture §22 (Concrete migration plan with owners + acceptance criteria)

---

**End of ADR-0001.** Next review: 2026-07-15 (post-Phase-0).
