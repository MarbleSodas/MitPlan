# XIVMitPlan v1.0 — Architecture (LOCKED, v1.0 review)

## 0. Document Metadata

| Field | Value |
|---|---|
| Product name | **XIVMitPlan v1.0** (previously code-named "Hearthstone"; renamed 2026-06-14) |
| Source project | MitPlan (`xivmit.com`) |
| Document type | v1.0 Architecture (LOCKED, post-review) |
| Version | v1.0 (supersedes the 2026-06-06 "Hearthstone" locked draft and the 2026-06-05 aspirational draft) |
| Author | Architecture team |
| Date | 2026-06-14 |
| Status | Locked — ready to build |
| Target launch | 2026-Q4 pre-Evercold beta; 2027-Q1 GA aligned with FFXIV 8.0 (Evercold) |
| Pre-launch beta | 2026-Q4 |
| Locked decisions | See §1.1 |
| Tech review verdicts | See §1.4 (added 2026-06-14 after re-verification) |
| Feasibility drilldown | See §14.7 (added 2026-06-14) |
| Concrete migration plan | See §22 (tightened 2026-06-14 with owners + acceptance criteria) |
| Open questions | See §23 |
| Supersedes | `docs/archive/2026-06-06-hearthstone-v1-architecture-locked.md` (historical record); `plans/2026-06-05-ffxiv-timeline-ingestion-platform-design-v1.md` |
| Companion | `plans/2026-06-06-hearthstone-architecture-gap-analysis-v1.md` (cut rationale) |

This is the build-from spec. Every section is actionable. The 2026-06-14 review pass renamed the project, retired the React 19 dnd-timeline risk, updated the cost model to current Cloudflare/Supabase/Upstash pricing, and tightened the migration plan. Where it disagrees with the 2026-06-06 draft, the 2026-06-14 spec wins.

---

## 1. Executive Summary

XIVMitPlan v1.0 is a **Learn + Plan** FFXIV raid mitigation planner, shipped behind **account-required Discord OAuth**, with **three ingestion sources** (Cactbot `.txt`, Triggernometry XML, FFLogs GraphQL) feeding a single canonical timeline, with real-time collaborative editing via **Yjs + Hocuspocus on Cloudflare Durable Objects from day one**, all in a fresh **pnpm + Turborepo monorepo** that is *not* an in-place refactor of the existing MitPlan v1 React/Firebase codebase.

The single most important design decision is the CRDT. MitPlan v1's Firebase-RTDB collaboration has a last-write-wins data-loss bug under concurrent edits (gap analysis §2.1 G4; original draft §1.5). Hocuspocus on Cloudflare Durable Objects with Yjs field-level CRDTs is the only published path that fixes it at v1 scale without a self-hosted Node process.

Cost model at 1K weekly active plans: **$25-50/mo** — driven by Cloudflare DO request pricing for Hocuspocus rooms, Supabase Pro at $25/mo, and Upstash Redis. The cost is roughly 2x the $5-15/mo we would have paid on a $5 VPS Hocuspocus, and we are paying it on purpose. The DO deployment buys per-plan isolation, near-zero idle cost via the hibernation API, and a documented migration path off the operational burden of running a long-lived WebSocket server. The research report on DO + Hocuspocus (`research/cloudflare-do-hocuspocus.md`, summarized in §7.3) verified that the deployment is documented but young; v1 is the right time to take the bet.

Three timeline sources, not one. The 2026-06-05 draft lists Cactbot, Triggernometry, and FFLogs as equal citizens (FR-1/2/3) but the gap analysis §3.3-§3.4 deferred Triggernometry and FFLogs to v2 on the theory that the FFLogs scraper's main consumer was the live-deviation detector. That call is overridden. All three ship in v1 because: (a) Triggernometry XML folders are how a meaningful fraction of serious raiders author timelines; (b) FFLogs is the only source with per-pull variance data, needed for the "this timeline is 5% off the FFLogs consensus" validator signal; (c) the merge pipeline is the same shape regardless of source count.

The build is opinionated, dense, and bounded. No Live mode. No anonymous editing. No $5 VPS fallback. No in-place refactor. Every deferred item has a trigger metric in §22 and §23.

### 1.1 Locked decisions (user's answers, 2026-06-06)

| # | Decision | Consequence | Citation |
|---|---|---|---|
| 1 | **Cut Live mode from v1. Ship Learn + Plan only.** | All of `apps/act-ingester`, the `LiveSession` bounded context, the `live_sessions` / `act_events` tables, the `DeviationDetector` / `PlanAdvancer` ports, the `features/live/` directory, the `plan.$planId.live.tsx` route, the ACT ingest WebSocket, and the ACT plugin are deleted. The 7-week "Phase 5 — Live mode" block in the 2026-06-05 draft §22.6 is removed and the time is redistributed. | Gap analysis §1, §2.2 L1-L17, §3.3 |
| 2 | **Monorepo from scratch. Not an in-place refactor.** | New XIVMitPlan repo initialized at `github.com/MarbleSodas/xivmitplan` (placeholder) on day 1, separate from `MitPlan`. MitPlan v1 is frozen at a tag and stays live as `xivmit.com` until cutover week 33-36 (§22.7). The untracked files in the current MitPlan working tree are *not* migrated; their work informs the new code but is rewritten against the new architecture. | Gap analysis §2.1 G8, §5 decision 2 |
| 3 | **Account-required auth. Drop anonymous support.** | Every plan is owned by a Supabase `auth.users` row. The 5,000-user success metric in the 2026-06-05 draft §1.5 is re-scoped to 5,000 *registered* users. MitPlan v1's "Universal Edit Access" model is replaced by an account-claim flow (§22.7). The Yjs/Hocuspocus connection requires a Supabase Auth JWT (§7.7). | Gap analysis §2.1 G4, §5 decision 3; auth research |
| 4 | **Cloudflare DO for Hocuspocus from day one. Not the $5 VPS first.** | `apps/realtime` is deployed as a Durable Object Worker with one DO per plan room. The hibernation API is used from the start; idle rooms are near-zero cost. The $5 VPS self-host path is rejected. | Gap analysis §3.4; DO research |
| 5 | **All three ingestion sources in v1. Cactbot .txt + Triggernometry XML + FFLogs GraphQL.** | `packages/domain/parsers/{cactbot,triggernometry,fflogs}/` are all built and wired. The merge orchestrator produces a single `Timeline` with per-event confidence from all three. Cactbot remains primary (lowest-noise, structured); Triggernometry and FFLogs add validation. | Gap analysis §3.4; Triggernometry + FFLogs research |

### 1.2 What v1 is NOT

- **Live mode** — ACT ingester, `LiveSession` context, `DeviationDetector`/`PlanAdvancer`, ACT plugin, `plan.$planId.live.tsx`, `features/live/`, ACT ingest WebSocket, NFR-2, `live_sessions`/`act_events` tables, R2 raw ACT lifecycle. Deferred to v2.
- **Anonymous support** — no `is_anonymous` user flag, no anonymous edit token, no anonymous plan claim at edit time. MitPlan v1's "Universal Edit Access" is not preserved.
- **Hocuspocus on a $5 VPS** — self-hosted Node Hocuspocus is out. Cloudflare DO from the first plan edit.
- **Cactbot-only ingestion** — two more parsers ship in v1.
- **In-place MitPlan v1 refactor** — the new code lives in a new monorepo; the existing codebase is not the target.
- **Variance / branch authoring UI** — data model in v1 (`Branch`, `JoinPoint`, `BranchCondition`); the dual-pane graph editor and path-lock UI are v2.1. v1.0 renders the linear path; branches are visible in the API and the data but not in the editor UI.
- **Trigger system** — the 2026-06-05 draft §6.4 `Trigger`/`TriggerAction`/`MARK_TIMELINE`/`FLAG_DEVIATION` types are out. Triggers have no event source without Live mode. Deferred to v2.2.
- **FFXIV 8.0 mode toggle (REBORN/EVOLVED/CURRENT) in v1.0** — the data model supports it (`mode` column on `abilities`, `mode` on `plan_meta`); the UI toggle ships in v1.1, gated on 8.0 dat-mined data. v1.0 ships in 7.x CURRENT mode.
- **SSR for Learn mode** — Learn stays a SPA. SEO for the encounter browser is nice-to-have, not required. Deferred to v3.
- **TanStack Query (the framework)** — the 2026-06-05 draft §15.4 mentioned TanStack Query but the gap analysis §2.1 G9 flagged this as unjustified. v1 uses **tRPC + zustand for server state and Yjs for realtime state**.
- **R2 for ACT log storage** — defer. R2 stays in the stack for v2; v1 has no raw ACT payloads. (R2 is still used for backups; see §21.)
- **Firebase as the integration platform** — three hard blockers: (a) Firebase Auth has no native Discord OAuth provider (the primary auth choice in §7.7.1), only a Cloud Function workaround; (b) Firebase Storage was removed from the Spark (free) plan in November 2024, closing the free community-upload path; (c) Firebase RTDB has LWW semantics — the exact bug MitPlan v1 ships today and the stated reason for the rewrite (gap analysis §2.1 G4). See `2026-06-06-hearthstone-firebase-rejection-v1.md` for the full evaluation. Firebase remains in scope for peripheral services only (Crashlytics for client errors is the one recommended swap; the Sentry line in §7.8 is the candidate).

### 1.3 Success metrics (12 months post-GA)

- **5,000 registered users.** (No anonymous users exist; the number is the user count, not the visitor count.) Unchanged from 2026-06-05 draft §1.5.
- **500 weekly active plans.**
- **100 daily active statics.**
- **p95 edit sync < 200ms.** (Cloudflare DO target; §7.3, §14.)
- **Median plan-construction time < 20 min for a Savage floor.**
- **Zero data-loss conflicts in collaborative editing** under the published stress-test suite (100+ concurrent-edit scenarios; §20.3).
- **Timeline data < 48h stale post-patch** for any new ability added by Square Enix.
- **< 5% of plans reference a removed ability** at any 8.0 patch point. (New metric; mode toggle and "convert to Reborn" CTA are the mechanism.)

Cost target: < $50/mo at 1K weekly active plans. The 2026-06-14 recompute (see §21.4) puts the honest read at **$35-47/mo** at 1K users — comfortably under NFR-13.

### 1.4 Tech review verdicts (2026-06-14 re-verification)

Eight days after the 2026-06-06 lock, every load-bearing technology choice was re-verified against current (2026-06-14) pricing, package versions, and ecosystem state. The verdicts:

| # | Choice | Verdict | One-line rationale |
|---|---|---|---|
| T-1 | **Yjs + Hocuspocus v4 on Cloudflare DO** (via `y-partyserver`) | **CONFIRMED** | Hocuspocus v4.2.0 (released 2026-06-12, 2 days before this review) shipped three additive patch releases since the May 20 HN launch. No API break, no revert of the edge path, no production-blocker reports on the HN thread. Cloudflare DO hibernation billing rules unchanged: "Idle, hibernation-eligible DOs are not billed." |
| T-2 | **Supabase Auth (Discord + Google + email)** | **CONFIRMED with citation fix** | Discord OAuth is still free in 2026 (GetStream 2026 social-API review); Supabase Auth added Passkeys (May 28 2026) and Custom OAuth/OIDC (June 6 2026) as additive v1.1 candidates. The doc's 1.6–1.8× Discord-vs-email ratio is replaced with the more defensible 20–35% social-OAuth lift (Auth0 / InfluenceFlow 2026 industry data). |
| T-3 | **`dnd-timeline` + `@dnd-kit` + `visx`** | **KEEP — risk RETIRED** | `dnd-timeline@3.1.1` (May 16 2026), `@dnd-kit/core@6.3.1` (peer `react >=16.8.0`), and `@visx/axis@4.0.0` + `@visx/scale@4.0.0` (Jun 11 2026, explicit React 19 peers) are all React 19-clean. Zero open React 19 issues. Pragmatic DnD was evaluated and rejected — no horizontal-axis timeline preset, no win over the existing stack. |
| T-4 | **Hono on Cloudflare Workers** | **CONFIRMED** | No 2026 regressions. Hono is the de-facto Workers framework. 100K req/day Free / 10M req/day Paid ($5/mo) — Workers Paid is required at ~100–300 active plans, not 100K req/day, because DO request volume + API volume exceed 100K/day well before 1K users. |
| T-5 | **Supabase Postgres + Drizzle ORM** | **CONFIRMED** | No 2026 alternative with comparable DX. The Supabase PITR add-on ($100/mo, 7-day window) is NOT included in Pro $25/mo; v1 must commit to either paying for PITR at the 10K-user tier or running a 15-min cron-snapshot to R2 as a free alternative. |
| T-6 | **Upstash Redis** | **CONFIRMED with detail fix** | Free tier changed in March 2025 to **500K commands/month** (was 10K/day). 1K-user tier stays at $0-2/mo. Cloudflare Workers KV could replace Upstash for the ability-catalog cache alone (100K reads/day free), but cannot replace it for the Yjs-snapshot debounce set (no native SET/SADD). Keep Upstash for v1. |
| T-7 | **Cloudflare R2** | **CONFIRMED** | Free tier (10GB, 1M Class A ops, 10M Class B, free egress) is sufficient for v1 nightly backups. Cost becomes real ($3-4/mo) only when the Supabase DB exceeds 8GB and we are storing 30+ monthly snapshots. |
| T-8 | **React 19 + Vite + TypeScript + tRPC + zustand + Zod + Vitest + Playwright + fast-check + Testcontainers + Pact + Pino + Sentry + Honeycomb** | **CONFIRMED** | All standard 2026 choices for a TypeScript-everywhere edge monorepo. No 2026 alternative warrants a swap. |
| T-9 | **FFXIV 8.0 / Evercold data-model assumptions** | **UPDATE** | Confirmed at NA Fan Fest (Apr 24 2026): 8.0 launches Jan 2027; level cap 100 → 110; the two new jobs (Tank, Physical Ranged DPS) are Evolved-mode-only; Evolved mode is built around a 16-action hotbar with context-sensitive consolidation; the 2-minute burst meta is being deprecated. Berlin Fan Fest is Jul 25-26 2026; Tokyo Fan Fest is **Oct 31 – Nov 1 2026** (corrected; the event spans into November). |
| T-10 | **xivapi.com as primary game-data source** | **CONFIRMED** | v2 docs at v2.xivapi.com/docs live; patch data still ingests within hours of the datamine. SaintCoinach is the documented fallback. |

The four with "UPDATE" or "CONFIRMED with citation fix" have a one-line patch applied inline in the relevant section. The §7.10 dnd-timeline + React 19 risk is retired (moved to §23 "Risks retired this revision"). The §19.1 Tokyo dates, level cap, and `(jobId, abilityId, mode)` composite-key implication are all added.

### 1.5 Concrete next steps (the top five things to do in the next two weeks)

This is the "what do I do Monday morning" list, derived from §22. The full week-by-week plan is in §22.

1. **Initialize the monorepo** at `github.com/MarbleSodas/xivmitplan` with `apps/{web,server,realtime}` and `packages/{domain,persistence,crdt,validation,shared}`. Per §14.6.7, day 1 = `pnpm init` + `pnpm-workspace.yaml` + `turbo.json` + `tsconfig.base.json` + CI scaffolding. **Acceptance:** `pnpm -r typecheck` and `pnpm -r test` pass on an empty workspace.
2. **Stand up the Supabase + Cloudflare + Upstash accounts** with the three-project split (dev / staging / prod). Enable Discord OAuth, Google OAuth, and email/password on Supabase Auth. Set the FFLogs OAuth client. **Acceptance:** a Supabase-staging project exists, the Workers Paid plan is activated, and a Redis instance is reachable from a Worker.
3. **Deploy the empty `apps/realtime` Hocuspocus-on-DO** (the §14.6.4 `PartyRoom` class) with the `onSave` persistence to Supabase wired but no UI consuming it. **Acceptance:** `wrangler tail` shows a successful `acceptWebSocket` for a `room=smoke-1` connection, and a row appears in `ydoc_snapshots` on `onSave`.
4. **Migrate the v1 MitPlan reference catalog** (`abilities`, `jobs`, `roles`, `encounters`, `expansions`, `raids`) into the new Supabase project via a one-shot Drizzle migration. **Acceptance:** all five tables are populated, RLS policies from §17.3 are in place, and the data-team seed file matches MitPlan v1's `src/data/abilities/mitigationAbilities.ts` byte-for-byte.
5. **Author the locked package versions** in `pnpm-workspace.yaml`'s `catalog:` (a pnpm 9.5+ feature). The exact pins, derived from the 2026-06-14 verification:
   - `hocuspocus@^4.2.0` (pin to 4.2.0 in `package.json`; float to `^4` only after the maintainer's edge-path feedback thread closes; re-evaluate in 60 days)
   - `yjs@^13.6` and `y-partyserver@^2.2.0` (verified)
   - `dnd-timeline@^3.1.1` and `@dnd-kit/core@^6.3.1` and `@visx/{axis,scale}@^4.0.0` (verified React 19-clean)
   - `react@^19.0.0` and `react-dom@^19.0.0`
   - `hono@^4.6` and `drizzle-orm@^0.36` and `@supabase/supabase-js@^2.46` and `supabase@^1.215` (CLI)
   - **Acceptance:** the lockfile resolves cleanly with `pnpm install` and the build is reproducible across two machines.

---

## 2. Goals and Non-Goals

### 2.1 Goals (v1, in priority order)

1. **Timeline data is authoritative, versioned, and three-source-merged.** Every plan references a `TimelineId` whose `version`, `contentHash`, and `source` are pinned. Cactbot is the primary ingestion boundary; Triggernometry and FFLogs are secondary validation sources. The merge orchestrator produces a per-event confidence score.
2. **Variance is in the data model; UI is later.** The `TimelineGraph` data structure (events, branches, joins, conditions) ships in v1. The runtime resolver ships in v1. The dual-pane graph authoring UI is v2.1.
3. **Real-time collaboration is conflict-free.** Two users editing the same plan always converge. Yjs field-level CRDTs + Hocuspocus on Cloudflare DO + a JWT-authenticated connection path. The MitPlan v1 LWW bug is dead.
4. **Account-required from the first click.** Every user signs in via Discord OAuth (primary) or email/password (fallback) before creating a plan.
5. **FFXIV 8.0 ships day-one — in the data model.** The schema is decoupled from concrete abilities. The mode toggle is deferred to v1.1 (8.0 reveal at Berlin Fan Fest in July 2026), but the schema is ready.
6. **The math is correct.** The `MultiplicativeMitStackEvaluator` is pure, property-based-tested with `fast-check`, and uses the FFXIV formula `1.0 × ∏(1 - effectPct/100)` for percent mits, then additive shield after mit.
7. **Two modes are real; the third is a v2 banner.** Learn and Plan are distinct views backed by the same Yjs document with different affordances. Live is a v2 banner.
8. **Monorepo from scratch.** A new `pnpm + Turborepo` workspace, initialized empty, populated by the §22 migration plan.

### 2.2 Non-Goals (v1)

- We are not a damage parser (FFLogs / XivAnalysis do this; we *consume* FFLogs GraphQL).
- We are not a gear planner (Ariyala, Etro, Xivgear own this; we link out).
- We are not a strategy site (Materia Raiding, NAUR, Ultimate Uncoiled own this).
- We are not a multi-game tool (FFXIV only; the data model is FFXIV-shaped).
- We are not a CDN for raw ACT logs (deferred with Live mode).
- We are not a competitive strategy tool (MitPlan is for "we wiped because we didn't plan the mit," not "we wiped because we were slow on the raid DPS check").
- We are not a generic Yjs host (the realtime layer is purpose-built for plans; no "open it up as a service" road).
- We are not a real-time-only system (plans must be loadable, snapshot-revertable, and shareable as JSON without an open socket).

---

## 3. The Three Modes

The 2026-06-05 draft §1.3 names three modes (Learn, Plan, Live). v1 ships two. The third is explicit and forward-looking.

### 3.1 Learn mode (v1, shipped)

- **Goal:** Solo, read-mostly. A player studying a fight before joining a static, or just to learn. Tooltips explaining *why* a cooldown covers a hit. Sees the multiplicative mit math.
- **Inputs:** The encounter catalog, the ability catalog.
- **Outputs:** Read-only horizontal-axis timeline (linear path with branch alternatives surfaced as annotations), tooltip system, ability palette (read-only), per-event "what covers this?" view.
- **Surface:** Static React route `learn.$encounterId.tsx`. Hydrates the encounter + timeline from a tRPC query. No Yjs connection. No collaboration. Cached at the CDN.
- **Constraints:** No sign-in *required* to view the encounter browser — sign-in is required to interact (create a plan, save favorites). The Learn mode index page (`/learn`) is a public route.

### 3.2 Plan mode (v1, shipped, the default)

- **Goal:** A static of 2-8 players builds a shared plan with real-time presence, conflict-free editing, and a tank-position model. This is the product.
- **Inputs:** A `Plan` document (Yjs, hydrated from the latest Postgres snapshot on load), the ability catalog, the timeline.
- **Outputs:** A dual-pane editor (timeline + mit assignments), real-time cursor presence, the tank-state panel, the mit-stack visualization, version history, JSON import/export, share links.
- **Surface:** React route `plan.$planId.tsx`. Yjs document opened via a Hocuspocus WebSocket connection to a Cloudflare Durable Object. The DO is named after the plan ID (`realtime-do-$planId`). Snapshots are debounced to Postgres via the DO's storage API.
- **Constraints:** Sign-in *required*. Read-only share-link viewers are public (a JWT-minted, scope-narrowed token allows read access without a Supabase session — see §7.7).

### 3.3 Live mode (v2, NOT BUILT in v1)

Live mode is the missing third mode. It is mentioned here for completeness with a clear v2 banner. Full scope: ACT ingester Worker (`apps/act-ingester`); R2 raw ACT payload storage (30-day rolling); the `LiveSession` bounded context; the `DeviationDetector`; the `PlanAdvancer`; the XIVMitPlan ACT plugin; the `plan.$planId.live.tsx` route and `features/live/` directory; the `live_sessions` and `act_events` tables; NFR-2 (p95 ACT ingest latency < 500ms). The v1 architecture has no stubs for any of this. The first commit to a `LiveSession` aggregate or an `apps/act-ingester` package is a v2 commit.

---

## 4. User Personas and Stories

### 4.1 Personas

- **Static leader (Raid Leader).** A raider organizing a static of 8 players preparing for a Savage floor. Builds the plan, shares it, updates it on the fly. **Plan** mode 90%.
- **Solo learner (Learner).** A player studying a fight before joining a static, or just to learn. **Learn** mode.
- **Streamer / static member (Watcher).** A player in the static who is not the raid leader. Sees the plan, asks "what if X happens?", verifies during a pull. **Learn** and **Plan**.
- **Signed-up user (new persona for v1).** Anyone who has created an account. This is the *floor* persona — every v1 user is a signed-up user, by construction. Owns the JWT, the row in `auth.users`, the Supabase RLS-visible record, and the Discord linkage.
- **(v2) Raid-day operator (Operator).** Removed from v1. Re-homed to v2. (Gap analysis §2.2 L15.)

### 4.2 Stories (representative)

- **Story 1 (RL).** "I want to build a mit plan for FRU P1 with my static. I sign in with Discord, open the planner, select the encounter, pick the 8 jobs, and start dragging mits onto the timeline. My co-RL sees my changes in real time and adjusts the tank swap. The Cactbot timeline loaded automatically; I cross-checked it against the FFLogs consensus and one event was flagged 'low confidence' so I checked the Triggernometry version to confirm."
- **Story 2 (Learner).** "I'm studying FRU P1. I open the Learn mode, hover on a buster, see the multiplicative math, see why 2 mits stack multiplicatively, and see what happens if I use a different ability. I don't need to sign in to do this."
- **Story 3 (RL on patch day).** "7.25 just shipped. I open my old plan, the tool says 'This plan is in CURRENT mode. 14 abilities used in this plan have new Evolved-mode variants. Click to preview the diff.' I click; the diff is clear; I either keep CURRENT or migrate to REBORN." (Note: the actual *toggle* is v1.1, but the data model and the *ability-changed* detection are in v1.0.)
- **Story 4 (Migration).** "I had plans on MitPlan v1. I sign in with Discord on XIVMitPlan for the first time. The site asks 'We found 4 plans associated with your Discord ID. Claim them?' I click yes. My v1 plans are now XIVMitPlan plans, with a 'migrated from MitPlan v1' badge on the version history."

---

## 5. Functional Requirements

The 2026-06-05 draft §5 lists 20 FRs. v1 takes 17, defers 3, adds 7.

| # | Requirement | Status in v1 |
|---|---|---|
| FR-1 | Ingest a Cactbot `.txt` timeline and produce a validated `Timeline`. | **In v1** (primary source) |
| FR-2 | Ingest a Triggernometry XML folder and produce a validated `Timeline`. | **In v1** (validation source) |
| FR-3 | Ingest a FFLogs report and infer a canonical timeline from casts. | **In v1** (variance + validation) |
| FR-4 | Display a `Timeline` as a horizontal axis with branches rendered as forks. | **In v1** (linear render only; fork annotations visible) |
| FR-5 | Drag a `MitigationAbility` from the palette onto a `TimelineEvent`. | **In v1** |
| FR-6 | Compute the mit stack and residual damage for a given `Assignment` set. | **In v1** |
| FR-7 | Detect mit double-booking conflicts and surface them in the UI. | **In v1** |
| FR-8 | Track tank position as an explicit interval and reassign buster targets. | **In v1** |
| FR-9 | Model a boss encounter as a directed graph of events with branches. | **In v1** (data model + linear render; authoring UI is v2.1) |
| FR-10 | Lock a path through a branched timeline. | **Deferred to v2.1** (data model is in v1) |
| FR-11 | Subscribe to live ACT events and advance the timeline cursor. | **Deferred to v2** (Live mode) |
| FR-12 | Detect deviations between planned and observed events. | **Deferred to v2** (Live mode) |
| FR-13 | Re-validate a plan when the underlying game data changes (patch day). | **In v1** (manual "Re-validate now" button; proactive background job is v2) |
| FR-14 | Support a `mode: REBORN | EVOLVED | CURRENT` toggle on a plan. | **Partial in v1** (data model + ability-version resolution; UI toggle is v1.1) |
| FR-15 | Support anonymous users (no account) with full planning capability. | **Removed** (account-required) |
| FR-16 | Export a plan as JSON, import a plan from JSON, with schema migration. | **In v1** |
| FR-17 | Share a plan via a read-only link and an edit-token link. | **In v1** (read-only public-with-token; edit-token requires sign-in) |
| FR-18 | Provide a REST API for external integrations. | **In v1** |
| FR-19 | Provide a WebSocket endpoint for real-time plan sync. | **In v1** (Hocuspocus on DO; JWT-authenticated) |
| FR-20 | Provide a WebSocket endpoint for ACT ingester events. | **Deferred to v2** (Live mode) |
| FR-A1 | Account-required sign-in (Discord OAuth or email). | **In v1** |
| FR-A2 | Account migration path for MitPlan v1 anonymous users. | **In v1** (one-time claim flow on first sign-in) |
| FR-I1 | Ingest a Triggernometry XML folder and produce a `Timeline` with per-event timing. | **In v1** (per-event contract explicit) |
| FR-I2 | Ingest a FFLogs report and infer a `Timeline` from casts with per-event variance. | **In v1** (per-event variance requirement new) |
| FR-I3 | Merge three sources into one canonical `Timeline` with per-event confidence. | **In v1** |
| FR-D1 | Hocuspocus on Cloudflare DO from day one. | **In v1** |
| FR-D2 | JWT auth on Hocuspocus connection with Supabase Auth JWT. | **In v1** |

Dropped from the 2026-06-05 draft: FR-10, FR-11, FR-12, FR-15, FR-20. Each drop has a v2 trigger metric in §22 and §23.

---

## 6. Non-Functional Requirements

The 2026-06-05 draft §6 lists 15 NFRs. v1 takes 14, defers 1, adds 3.

| # | Requirement | Target | Status |
|---|---|---|---|
| NFR-1 | Plan edit sync latency (p95) | < 200ms globally | **In v1** (Cloudflare DO target) |
| NFR-2 | ACT event ingest latency (p95) | < 500ms end-to-end | **Deferred to v2** (Live mode) |
| NFR-3 | Median plan-construction time for a Savage floor | < 20 min | **In v1** |
| NFR-4 | Concurrent collaborative users per plan | 2-8 (designed for 2-8, supports up to 16) | **In v1** |
| NFR-5 | Daily active statics | 100 at 12 months post-GA | **In v1** |
| NFR-6 | Patch data staleness for any new ability | < 48h post-patch | **In v1** (three-source merge helps) |
| NFR-7 | 99th percentile plan-load time | < 1s | **In v1** |
| NFR-8 | Browser support | Last 2 versions of Chrome, Firefox, Safari, Edge | **In v1** |
| NFR-9 | Accessibility | WCAG 2.1 AA | **In v1** |
| NFR-10 | Mobile | Fully responsive, touch-optimized | **In v1** |
| NFR-11 | Data-loss conflicts in collaborative editing | Zero (verifiable by stress test; 100+ scenarios) | **In v1** |
| NFR-12 | Test coverage on `packages/domain/` | 90% lines | **In v1** |
| NFR-13 | Cost at 1K active users | < $50/mo | **In v1** (recompute: $25-50/mo; §21) |
| NFR-14 | Recovery point objective (RPO) | 15 minutes | **In v1** |
| NFR-15 | Recovery time objective (RTO) | 1 hour | **In v1** |
| NFR-A1 | Sign-in to first-plan-creation time | < 30 seconds (Discord OAuth is one click) | **New** |
| NFR-I1 | FFLogs rate-limit budget | > 5,000 requests/day at the free tier | **New** |
| NFR-D1 | DO cold-start to first-editable-plan | < 1 second (p95) | **New** |

---

## 7. Tech Stack (with v1-cut choices)

The 2026-06-05 draft §7 enumerated 11 tech-stack choices. v1 keeps 10, modifies 2 (Hocuspocus deployment target; auth subsystem), and adds 1 (Supabase Auth, §7.7). R2 is conditional (§7.6).

### 7.1 Frontend — React 19 + Vite + TypeScript

Unchanged from the 2026-06-05 draft §7.1. Mirrors MitPlan v1's stack to preserve component muscle memory. Vite cold start ~200ms, HMR < 50ms. React 19's `useOptimistic`, transitions, and the new compiler are directly relevant to the planner UI. `@dnd-kit` is the DnD primitive.

**v1 note on TanStack Query:** The 2026-06-05 draft §15.4 mentioned TanStack Query for server state. Gap analysis §2.1 G9 flagged this as unjustified. v1 uses **tRPC for typed RPC, zustand for client state, and Yjs for realtime state** — no TanStack Query. We add it only if a screens-loads-too-slow problem forces our hand.

### 7.2 Backend API — Hono on Cloudflare Workers

Unchanged from the 2026-06-05 draft §7.2. Hono is a tiny (~13KB) router with first-class TypeScript and Zod integration. Cloudflare Workers have a 100K-req/day free tier and a global edge deployment. Cold start < 5ms. WebSocket support is native (used by the Hocuspocus DO, not the API Worker itself). The 30s CPU cap on free-tier Workers is irrelevant for our request patterns; the long-lived socket lives on a DO (§7.3).

**v1 composition root:** `apps/server/src/composition.ts` is the only file that imports concrete classes. It wires the Drizzle client, the Upstash Redis client, the AbilityCatalog, the TimelineService (with the three parsers), the PlanService, the AuthService, and the Supabase Auth client. Everything else imports interfaces from `packages/domain/ports/`. (2026-06-05 draft §8.3; Liskov example in §24.)

### 7.3 Real-time collaboration — Yjs + Hocuspocus on Cloudflare Durable Objects

**This is the architectural decision that v1 owns.** It is the one most likely to be wrong. We are betting that Hocuspocus on DO is production-ready in 2026-Q4.

**Re-verified 2026-06-14 (Tech Review T-1, CONFIRMED):** Hocuspocus v4.2.0 released 2026-06-12 (three days before this review), the third v4 patch release since the May 20 2026 HN edge-path launch. No API breaks, no revert of the edge path, no production-blocker reports on the HN thread (item 48208834). Pin to `^4.2.0` in `pnpm-workspace.yaml`'s `catalog:`; re-evaluate in 60 days. See §14.7.1 for the full feasibility scorecard.

**Pros (from the DO + Hocuspocus research report):**

- **Yjs** is the de facto CRDT library (22K stars, the largest ecosystem). Field-level CRDTs handle 99% of conflicts correctly out of the box.
- **Hocuspocus** is the production-ready Yjs server with auth, persistence, and webhook extensions. The research report verified that it has a Cloudflare DO recipe.
- **Durable Objects** give one DO per plan; the hibernation API keeps idle rooms at near-zero cost. The DO is named after the plan ID, and Cloudflare's routing layer delivers WebSocket connections to the right DO. Sub-50ms global latency.
- **Per-plan isolation.** A bad plan cannot exhaust another plan's resources. Blast radius of any single bug is one plan.
- **The migration path off a self-hosted Node process is gone.** No more 3am pager for "the Hocuspocus server is OOMing again." The 2026-06-05 draft §23.4 mitigation ("self-hosted Hocuspocus on a $5 VPS as the primary") is rejected per gap analysis §1.1 decision 4.

**Cons (acknowledged honestly):**

- Hocuspocus on DO is documented but young. The primary community deployment is still self-hosted Node. Risk of a Cloudflare-specific bug that the maintainers cannot reproduce locally. (DO research report risk #1.)
- Yjs doc size can grow with heavy edits. Mitigated with snapshots and periodic rebuilds (NFR-11 + §20.3 stress-test suite).
- Vendor lock-in to Yjs. Mitigated by the `PlanDocument` interface being the only place that knows Yjs is the CRDT.
- DO request pricing for 1K active plans is *not* free. The hibernation API is near-zero for idle rooms, but per-message and per-connection pricing is the cost of the bet. See §21.

**Deployment playbook (from the DO research report):**

- One DO per plan. The DO class extends `DurableObject` and holds the Hocuspocus server in a field.
- The DO listens for WebSocket upgrades on a path like `/plans/$planId/realtime`.
- JWT validation runs *inside* the DO's `fetch` handler before `hocuspocus.handleConnection(websocket)`. The JWT is a Supabase Auth access token; the DO validates the signature with a public key fetched from Supabase's JWKS endpoint (cached with a 1-hour TTL). The DO also checks that the `sub` claim is in the plan's `access` list.
- Hibernation API: the DO calls `state.acceptWebSocket(websocket)` and the WebSocket is re-attached across hibernation cycles. Idle rooms with no connections hibernate and cost ~zero.
- Persistence: Hocuspocus's `Database` extension writes Yjs doc updates to the DO's `state.storage`. The DO is the source of truth for the live doc; Postgres is the snapshot history. Snapshots are debounced (5s of idle) and written to Supabase via a Worker fetch from the DO.
- Scaling pitfalls: a single DO has a CPU limit (30s wall-time per request) and a memory limit (128MB on the standard plan). For our use case (Yjs update fanout, validation, snapshot writing), 30s is comfortable. If we hit it, the fix is to move the snapshot-write to a separate Worker and the DO is just the in-memory Yjs state.
- JWT shape: standard Supabase Auth JWT. Claims: `sub` (user ID), `email`, `aud` (authenticated), `exp` (1-hour expiry), plus a custom `plan_access` claim minted by our AuthService when a share-token is redeemed. The DO validates the signature, the expiry, and the `plan_access` claim against the plan's access list.
- Cost model at 1K active plans: see §21. The honest read is that we are paying $20-40/mo more than we would on a $5 VPS. We are paying it for the operational simplicity and the per-plan isolation.

**Rejected alternatives:** Firebase RTDB (LWW data loss), Supabase Realtime (no native CRDT), Liveblocks ($0.002/user-minute hostile to long sessions), Automerge 2.0 (more verbose, WASM-bound), $5 VPS self-hosted Hocuspocus (rejected per gap analysis §1.1 decision 4; the 7x cost delta is worth the operational simplicity).

#### 7.3.1 Production feasibility verdict

The 2026-06-06 Hocuspocus-on-Cloudflare-DO deep-dive research verified that **shipping DO + Hocuspocus on day one is the right call**, with two named guardrails. The verdict was reached by synthesizing Cloudflare's official Durable Objects documentation (lifecycle, WebSocket Hibernation, limits, pricing) and the May 2026 Hocuspocus v4 release that shipped first-class edge-runtime support via `crossws` and the new `Hocuspocus.handleConnection(ws, request, context)` API. The production-proven wrapper in 2026 is `y-partyserver` — a `YServer` subclass of PartyKit's `Server` (which itself extends `DurableObject`) — rather than a hand-rolled DO adapter. This is the only documented path that gets Hibernation-aware WebSocket plumbing and a Y.Doc lifecycle that survives eviction without writing DO plumbing by hand.

**Key feasibility findings:**

- **Supabase Postgres is the source of truth; the DO is a hot in-memory layer.** The `ydoc_snapshots` table is the persistence target, written via `@hocuspocus/extension-database` (debounce 2s, maxWait 10s). This mirrors the architecture Liveblocks open-sourced in February 2026 and is battle-tested at sub-50ms steady-state.
- **Hibernation is the cost lever.** Idle rooms with no connections hibernate and incur near-zero duration charges. WebSocket connection-hours on a hibernated DO are billed at zero — that is the entire economic case for the DO-day-one commitment.
- **Cold start is the only real latency cost.** A hibernated DO reloads its Y.Doc from Postgres on every wake, costing **150–400ms on first tab open**. This is the price of the architecture; the editor must surface a "Reconnecting…" toast during that window (see §14.x for the production deployment playbook).
- **Auth is the edge-validated JWT pattern.** Hocuspocus `onAuthenticate` verifies a Supabase-issued JWT via `jose` + `createRemoteJWKSet`, with the JWKS endpoint cached automatically in the DO. We use the HS256 + JWT secret path for v1 (one `crypto.subtle.verify` call, no network roundtrip); the JWKS path is the v2 upgrade if/when Supabase's signing-key rotation timeline makes it worth the small cache complexity.
- **The escape hatch is server-URL-only.** Hocuspocus's client provider is identical on DO and on a self-hosted Node target, so falling back to a $5 VPS Hocuspocus if DO-in-production misbehaves is a 1-week swap that changes the WebSocket URL and nothing else. The `ydoc_snapshots` table is the single source of truth on both backends.

**The two named guardrails:**

1. **Pin a specific Hocuspocus v4.x.** The v4 edge path is brand new (May 2026 HN launch; the maintainer explicitly invited feedback). Float `@hocuspocus/server` only after the maintainer's edge-path feedback thread closes. Use `^4.0.0` only for the first 60 days of v1 production, then re-evaluate.
2. **Surface the cold-start window in the UI.** Every plan editor shows a "Reconnecting…" toast for the 150–400ms window while a hibernated DO reloads its Y.Doc state from Supabase Postgres. This is a v1 feature in `AppShell`, not a workaround — the alternative is DO eviction silently eating the doc, which is much worse.

**Cost model (verified from Cloudflare pricing docs, May 2026):** the hibernation API keeps the per-room economics near-zero. At 1K active plans, total DO cost is ~$40/mo; at 10K, ~$355/mo. We will not approach the 10K break-even in year one (see §21.4 for the recomputed cost model). The full deployment playbook — repo layout, `partykit.json`, `wrangler.jsonc`, server code, auth verification, client wiring, env vars, fallback — is in §14.x.

### 7.4 Persistence — Supabase Postgres + Drizzle ORM

Unchanged from the 2026-06-05 draft §7.4. Postgres is the right shape: normalized reference catalog, JSONB for plan snapshots, materialized views for analytics. Drizzle is TypeScript-first with zero runtime overhead. `drizzle-zod` generates Zod schemas from Drizzle tables.

**v1 note on RLS:** Supabase Row-Level Security is enabled on all `plan_*` tables. RLS policies enforce: (a) a user can read a plan if they are the owner, are listed in `plan_access`, or hold a valid read-share-token; (b) a user can write a plan if they are the owner or hold an edit-share-token; (c) `users` rows are readable by the owner only. The Drizzle client is called with the user's JWT, so RLS is enforced at the database boundary. (Auth research report §3.)

**v1 note on PITR (added 2026-06-14, Tech Review T-5):** Supabase Pro ($25/mo) does **not** include Point-in-Time Recovery; the 7-day PITR add-on is $100/mo. The v1 design uses a **15-min cron snapshot to Cloudflare R2** as the free alternative that satisfies NFR-14 (RPO 15 min). The cron is a Cloudflare Worker triggered by Cron Triggers; the snapshot writes the latest `ydoc_snapshots` and the latest `plan_meta` + `plan_snapshots` to R2. R2 storage stays trivial ($3-4/mo at 10K users).

### 7.5 Cache and pub/sub — Upstash Redis

**Mostly unchanged, with a v1-cut caveat and a 2026-06-14 detail fix.** The 2026-06-05 draft §7.5 used Redis for: ingester pub/sub (Live mode), ability catalog cache, ACT session metadata cache. v1 keeps the ability catalog cache (60s TTL; hot key sub-millisecond) and adds a Yjs-snapshot-debounce buffer.

**The Yjs-snapshot-debounce argument:** When a plan is idle for 5 seconds, the Hocuspocus server (inside the DO) fires an `onChange` callback that writes the new Yjs state to Supabase. With 1K active plans editing at peak, the naïve approach is one Postgres write per plan-edit-session. The debounce in Redis (a "dirty plan" set with a 5s TTL) means we batch writes: one Worker reads the dirty set every 30s, drains it, and writes batched snapshots to Supabase. This keeps the per-plan DO small and the per-edit Postgres write rate bounded.

**v1 cut:** Without Live mode, we do not need the ingester pub/sub channel. Without ACT session metadata, we do not need the ACT cache. Redis is still in the stack for the ability catalog cache and the Yjs-snapshot debounce buffer.

**Upstash Redis free tier (Tech Review T-6, 2026-06-14):** changed in March 2025 from 10K commands/day to **500K commands/month** (256MB storage, 10GB bandwidth). The 1K-user tier stays at $0-2/mo. Cloudflare Workers KV could replace Upstash for the ability-catalog cache alone (100K reads/day free, 1GB storage) but cannot replace the debounce set (no native SET/SADD semantics in KV). Keep Upstash for v1; revisit at the 10K-user tier.

### 7.6 Object storage — Cloudflare R2 (deferred to v2; in v1 only as an optional upload target)

The 2026-06-05 draft §7.6 used R2 for raw ACT session payloads, community-uploaded timeline files, and FFLogs event exports. v1 has no raw ACT payloads. v1 *might* use R2 for community-uploaded timeline files (a Triggernometry XML folder can be megabytes; storing it in Supabase Postgres as JSONB is wasteful).

**v1 cut:** R2 is not a hard requirement. If v1 sees < 5 community uploads per week (likely, since Cactbot is a fetch-URL and FFLogs is OAuth-scoped), we can skip R2 and use a Supabase Storage bucket (S3-with-a-fancy-URL, included in the $25/mo Pro plan).

**Decision:** R2 is a v2 add. In v1, community uploads go to Supabase Storage. If usage grows past 100 uploads/day, we move to R2.

### 7.7 Auth — Supabase Auth + Discord (primary), Google (secondary), email/password (tertiary)

**This is a new v1 section.** The 2026-06-05 draft did not have an auth subsection; it assumed a custom JWT-issuing `AuthService` using `jose`. The gap analysis §1.1 decision 3 (account-required, drop anonymous) makes auth load-bearing. The 2026-06-06 auth deep-dive verified that **Supabase Auth with a three-provider matrix — Discord (primary CTA), Google (secondary CTA), email/password (tertiary, in "More options" expander) — is the right shape.** This flips the 2026-06-06 locked version's prior ordering (Discord primary, email/password fallback, no Google) to add Google as a secondary OAuth identity for the long tail of users who don't have a Discord tied to their gaming email.

#### 7.7.1 Provider matrix

| Provider | Role | UX path | Conversion baseline (gaming-adjacent) | RLS path |
|---|---|---|---|---|
| **Discord OAuth** | Primary CTA (~45% target) | 1 click → Discord consent → session | 20–35% social-OAuth lift (Auth0 / InfluenceFlow 2026 industry data) | `auth.uid()` → `users.discord_id` |
| **Google OAuth** | Secondary CTA (~12% target) | 1 click → Google consent → session | Same social-OAuth range; Chrome/Android default identity | `auth.uid()` → `users.google_id` |
| **Email + password** | Tertiary (~8% target) | 4 fields + confirm email magic link | Baseline; ~24% cart-abandonment-equivalent from "site wants account" (Baymard 2024) | `auth.uid()` |
| **Magic link (email OTP)** | Tertiary alternative (~5% target) | Email + click link | Slightly higher than password on mobile; same friction on desktop | `auth.uid()` |

**Why Discord is primary:** FFXIV raiding is concentrated on Discord. The /r/ffxiv Discord, Balance, various statics, and most pug groups are on Discord. A typical FFXIV raider has Discord open during raid. One-click consent gives us `identify` (username, global_name, avatar) and a verified `email` for free. Discord OAuth remains free in 2026 (GetStream 2026 social-API review; Discord is the only social API in the comparison with no tiered plans or per-call charges). The Feb 23 2026 Discord permission split affects bot/gateway permissions, not OAuth2 sign-in scopes — Supabase's Discord provider is unaffected.

**Why Google is secondary:** the 5–10% of FFXIV players who are console-only, first-time-MMO, or gaming-Discord-averse fall through to Google's universal identity. Chrome/Android users have a Google identity by default; published conversion data shows social-OAuth reduces sign-in abandonment by 20–35% versus email baseline (Auth0 published study; 2025 industry study cited by InfluenceFlow Feb 27 2026; Logto 2023 "social login can boost conversion rates 20–40% on average").

**Why email/password is tertiary, not the front door:** password friction costs 24% in forced-account scenarios per Baymard's 2024 cart-abandonment data, with a 24-37% range from the 2024-2026 practitioner audits. MojoAuth's 25-30% password-friction figure is adjacent evidence that supports the same conclusion. The "account-required" decision is correct, but the implementation must put the lowest-friction option on the largest button.

#### 7.7.2 Concrete sign-in code (client)

The sign-in page (`apps/web/src/routes/login.tsx`) calls `supabase.auth.signInWithOAuth` for Discord and Google, and `supabase.auth.signInWithPassword` for the email/password expander:

```ts
// Discord and Google (identical pattern, different provider)
async function oauth(provider: "discord" | "google") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) setError(error.message);
}

// Email + password
async function emailSignIn() {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) setError(error.message);
  else navigate(next);
}
```

#### 7.7.3 Callback route handler

The callback route (`apps/web/src/routes/auth.callback.tsx`) does the PKCE code-for-session exchange, runs the idempotent account-link attempt (`linkIfPossible` from §7.7.4), and redirects to `?next=` (defaults to `/plans`). The Supabase SDK persists the session in cookies/localStorage; the Hocuspocus DO pulls the access token via `supabase.auth.getSession()` on every WebSocket connect, so no JWT is touched client-side beyond what the SDK stores.

```tsx
useEffect(() => {
  (async () => {
    const code = search.get("code");
    if (!code) { setError("Missing OAuth code"); setStatus("error"); return; }
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError || !data.session) {
      setError(exchangeError?.message ?? "Session exchange failed");
      setStatus("error");
      return;
    }
    await linkIfPossible(data.session);          // §7.7.4
    setStatus("ok");
    navigate(next, { replace: true });
  })();
}, [search, navigate]);
```

#### 7.7.4 Account linking

Supabase's `auth.identities` table is the only authoritative source for which `(provider, provider_user_id)` tuples belong to which `auth.users.id`. The linking logic runs after every successful sign-in: if the new identity's `provider_user_id` is the only identity on the current user AND another `auth.users` row exists with the same verified email, auto-link the two via the `merge_auth_users(p_source, p_target, p_actor)` Postgres RPC. If the new identity has a verified email that does NOT match another account, no link is needed. The merge runs server-side, not client-side, to avoid leaking account-existence information.

```ts
// apps/web/src/lib/account-link.ts (client-side trigger)
export async function linkIfPossible(session: Session) {
  const user = session.user;
  if (!user?.email) return; // unverified, skip
  const { data: identities } = await supabase.auth.getUserIdentities();
  if ((identities?.identities?.length ?? 0) > 1) return; // already multi-identity

  const res = await fetch("/api/v1/account-link/eligible", {
    method: "POST",
    headers: { "Content-Type": "application/json",
               Authorization: `Bearer ${session.access_token}` }, 
    body: JSON.stringify({
      currentUserId: user.id,
      email: user.email,
      provider: identities?.identities?.[0]?.provider,
    }),
  });
  if (!res.ok) return;
  const { candidateUserId } = await res.json();
  if (!candidateUserId || candidateUserId === user.id) return;
  await fetch("/api/v1/account-link/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json",
               Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ candidateUserId }),
  });
}
```

The `merge_auth_users` RPC is a single transaction that re-validates `p_source.email = p_target.email AND p_target.email_confirmed_at IS NOT NULL`, reassigns all `plan_*` rows from `p_source` to `p_target`, and deletes `p_source` (which cascades into `auth.identities` via the FK). The full SQL is in §17.7 (new).

**MitPlan v1 plan claim is a separate flow.** It does not use `merge_auth_users`; it is a one-time prompt for any user whose Discord ID or email matches a captured v1 plan, with its own `legacy_local_plans` table and the `claim_legacy_plans` RPC (see §17.7 and §22.2 for the full design).

#### 7.7.5 Pros (from the auth deep-dive)

- **Supabase Auth** ships: email/password, magic link, 20+ OAuth providers, session management, RLS integration, and managed JWT issuance. We do not build any of this.
- **Discord OAuth** is the right primary for an FFXIV tool. The FFXIV community is on Discord; users expect a "Sign in with Discord" button. The OAuth flow is one click → Discord consent → Supabase issues a session. Discord's `email` scope gives us a verified email for free.
- **Google OAuth** is the universal-identity fallback. Chrome/Android users have a Google identity by default; published conversion data shows Google at ~1.3x email conversion on properties where the user demographic skews non-technical. The 5–10% of FFXIV players who are console-only or first-time-MMO fall through to Google, then to email/password.
- **Email/password** is the lowest-friction email path. Some users do not have Discord or Google. Magic link is also enabled as a tertiary alternative.
- **JWT shape:** standard Supabase Auth JWT. Claims: `sub` (user UUID), `email`, `aud = "authenticated"`, `role = "authenticated"`, `exp` (1-hour), `iat`, plus `session_id` (used to invalidate tokens on sign-out). Asymmetric signing keys (ES256) are the recommended v1 path so the Hocuspocus DO can verify JWTs on the edge without holding a symmetric secret.
- **RLS policies:** see §7.4 and the new §17.7 / Appendix D. The Postgres RLS layer is the authorization boundary; Supabase Auth is the authentication boundary.
- **Session management:** Supabase's `@supabase/supabase-js` SDK handles token refresh (auto-refresh ~60s before expiry), cookie storage, and sign-out. The web app uses the SDK on the client. The Hocuspocus DO uses the JWT directly (no SDK; just signature validation against the Supabase JWT secret via `crypto.subtle.verify`).
- **Account migration for MitPlan v1 anonymous users:** the auth deep-dive recommended **Option B** — on first sign-in, the system looks up any MitPlan v1 plans associated with the Discord ID or the email address. The user is prompted to claim them. The claim flow is a one-time UI: "We found 4 plans associated with your Discord ID. Claim them?" The claim updates the v1 plan's `owner_id` to the new Supabase user. The 90-day auto-flip is in §22.7 (new).

#### 7.7.6 Cons (acknowledged honestly)

- **Vendor lock-in to Supabase.** Mitigated by the `AuthService` port interface in `packages/domain/ports/auth.ts`; swapping to a self-hosted auth backend is a 1-week effort.
- **OAuth provider outages propagate.** Discord had a 4-hour API outage in Q1 2026; during such an outage, sign-in is degraded to email/password. Mitigation: the `/login` page detects outages via a 5-minute cached health check and surfaces a banner ("Discord sign-in is temporarily unavailable. Use email or Google.") without removing the button. Google has a similar pattern; we monitor both.
- **Discord and Google OAuth require a third-party account.** True of > 95% of the FFXIV community for Discord and > 99% for Google. The 1–5% who have neither fall through to email/password.
- **Email/password users churn at the verification step.** ~20–40% of email/password signups never verify. We mitigate by **not gating on email verification** — the 5K-user success metric is on account creation, not on verified email. Email verification is a separate "verified" flag used for sending digest emails.
- **The MitPlan v1 "Universal Edit Access" model is gone.** Some users will be upset. (Gap analysis §1.1 decision 3.)

**Rejected alternatives:** custom JWT with `jose` (we are not building auth when Supabase is right there), Clerk (we are already on Supabase for Postgres), Auth0 (too expensive at our scale).

### 7.8 Logging and observability — Pino → Workers Tail → ClickHouse

Unchanged from the 2026-06-05 draft §7.7. Pino is the fastest Node logger with structured JSON output. Workers Tail streams logs to ClickHouse via Logpush. Sentry on the web client and the realtime DO. Honeycomb for OpenTelemetry traces (free tier).

### 7.9 Test tooling — Vitest + Testing Library + Playwright + fast-check + Testcontainers + Pact

Unchanged from the 2026-06-05 draft §7.8. Vitest for unit, Playwright for E2E, fast-check for property-based, Testcontainers for real Postgres in integration, Pact for consumer-driven contracts.

**v1 cuts from the 2026-06-05 draft §20.2:** drop the ACT ingester integration tests (no ACT ingester in v1), drop the `ReplayActEventIngester` (no live replay in v1). Add FFLogs GraphQL contract tests (the new Triggernometry + FFLogs research report recommended a Pact contract with FFLogs; the v1 test surface includes a recorded FFLogs response fixture).

### 7.10 Timeline / DnD libraries — `@dnd-kit` + `dnd-timeline` + visx

**Re-verified 2026-06-14.** The React 19 compatibility risk on `dnd-timeline` (2026-06-05 draft §23.4) is **retired** — the library is healthy and React 19-clean as of 2026-06-14.

- **`dnd-timeline@^3.1.1`** (npm, published 2026-05-16). This is the actively-maintained `samuelarbibe/dnd-timeline` fork; the original `TimboKZ/dnd-timeline` was abandoned and `samuelarbibe` is the sole maintainer (346 commits, GitBook docs last updated 2026-03-14). The package declares no `peerDependencies` of its own; its only React-touching runtime deps are `@dnd-kit/core@^6.1.0` and `@dnd-kit/utilities@^3.2.2`.
- **`@dnd-kit/core@^6.3.1`** declares `react >=16.8.0` as a peer dependency — an open range that admits React 19 with no published incompatibilities. Zero open React 19 issues on the `samuelarbibe/dnd-timeline` tracker.
- **`@visx/axis@^4.0.0`** and **`@visx/scale@^4.0.0`** (both published 2026-06-11, three days before this review) ship with explicit `react: ^18.0.0 || ^19.0.0` peer dependencies. This is the first time both visx and dnd-timeline are simultaneously React 19-clean.
- **Pin in `pnpm-workspace.yaml` `catalog:`:** `dnd-timeline@3.1.1`, `@dnd-kit/core@6.3.1`, `@visx/axis@4.0.0`, `@visx/scale@4.0.0`.

**Considered and rejected alternative — Atlassian Pragmatic DnD (`@atlaskit/pragmatic-drag-and-drop@1.8.1`).** Pragmatic DnD is React 19-clean, has better perf for 1k+ items, and is the de-facto recommendation in 2026 Apr-Jun write-ups (Minimal UI's kanban migration; mikiwiik in Apr 2026 production migration; Atlassian's own examples). It was rejected for v1 because it ships **no horizontal-axis timeline preset** — to do the equivalent of dnd-timeline on top of Pragmatic DnD we would hand-roll horizontal-axis collision, edge auto-scroll, and row resize, which is the same engineering effort as the §15.2 vendor fallback (and dnd-timeline is itself essentially a thin dnd-kit wrapper plus virtualization, so the fallback IS dnd-timeline's source). No win.

**Considered and rejected alternative — raw `@dnd-kit/core`** (no `dnd-timeline` wrapper). This is what dnd-timeline already wraps. No timeline preset exists in `@dnd-kit/core` itself.

**Vendor-fallback spec (defense in depth, not an expected path).** If a future dnd-timeline release drops React 19 support or stalls > 90 days without commits while a new React major rises, the fallback is a one-page spec re-implementing dnd-timeline's `useTimelineDnd` on top of `@dnd-kit/core`'s `DndContext` + `useDraggable` + `restrictToHorizontalAxis` modifier + `closestCenter` collision strategy, plus `content-visibility: auto` virtualization. This is in §15.2.1 (TBD in Phase 0; one evening of work to spec, one week to build). Trigger thresholds for invoking: (a) dnd-timeline has not seen a release in 90+ days while a published React major rises above 19, (b) a blocking React-19 issue remains open on `samuelarbibe/dnd-timeline` for 30+ days with no maintainer response, or (c) we need a feature dnd-timeline won't add and the vendor cost is < 1 sprint.

### 7.11 Schema validation — Zod + drizzle-zod

Unchanged from the 2026-06-05 draft §7.10. One source of truth for HTTP request/response shapes, Yjs document field types, and FFLogs/Triggernometry parser payload validation.

### 7.12 Build and packaging — pnpm workspaces + Turborepo

Unchanged from the 2026-06-05 draft §7.11. The monorepo is initialized from scratch (gap analysis §1.1 decision 2): a clean `package.json` with `pnpm-workspace.yaml` listing the `apps/*` and `packages/*` directories.

---

## 8. High-Level Architecture

### 8.1 System diagram (v1)

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React 19 SPA)                     │
│   routes/  features/  ui/                                              │
│   └── uses domain ports only                                           │
└─────────────────────┬──────────────────────────┬────────────────────────┘
                      │ tRPC (HTTPS)             │ Yjs (WebSocket, JWT-auth)
                      ▼                          ▼
┌─────────────────────────────────┐  ┌────────────────────────────────────┐
│   Hono API on Cloudflare Worker │  │ Hocuspocus on Cloudflare Durable   │
│   - tRPC procedures             │  │ Object (one DO per plan)           │
│   - REST shim                   │  │ - Yjs sync v2                      │
│   - Public API for FFLogs sync  │  │ - Awareness (presence)             │
│   - Discord OAuth callback      │  │ - Hibernation API                  │
│   - Supabase Auth integration   │  │ - JWT auth on connect              │
└────────────────────┬────────────┘  └──────────────────┬─────────────────┘
                     │                                  │
                     ▼                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│   Supabase Postgres (durable)        Upstash Redis (cache + debounce)│
│   - reference catalog (normalized)  - ability catalog cache         │
│   - timelines                       - Yjs snapshot debounce set     │
│   - plan snapshots                  - rate-limit counters            │
│   - profiles (Supabase Auth) / parties / access                     │
│   - RLS policies enforce ownership                                   │
└──────────────────────────────────────────────────────────────────────┘
```

Compared to the 2026-06-05 draft §8.1: the **ACT Ingester (Cloudflare Worker)** box, the **Cloudflare R2** box, the **ACT client** box, and the "ACT ingest endpoint" line in the API box are removed. The "Discord OAuth callback" and "Supabase Auth integration" lines are added.

### 8.2 Subsystem responsibilities

- **`apps/web`** — Browser SPA. The only client. Talks to the API (HTTPS) and the realtime DO (WebSocket). Imports only from `packages/domain` ports.
- **`apps/server`** — Hono on Cloudflare Workers. tRPC router, REST shim, Discord OAuth callback, Supabase Auth integration. Imports from `packages/domain`, `packages/persistence`, `packages/validation`.
- **`apps/realtime`** — Hocuspocus on Cloudflare Durable Objects. One DO per `PlanId`. Imports from `packages/crdt` and `packages/validation`.
- **`packages/domain`** — Pure TypeScript, no I/O. Entities, value objects, ports, math (MitStackEvaluator), the three parsers (Cactbot, Triggernometry, FFLogs), merger, errors.
- **`packages/persistence`** — Drizzle schema + Postgres + Redis implementations of the domain ports.
- **`packages/crdt`** — Yjs document shape, awareness, validators.
- **`packages/validation`** — All Zod schemas. Single source of truth for HTTP, Yjs, FFLogs/Triggernometry parser input, and Drizzle types.
- **`packages/shared`** — Cross-cutting: i18n, time, Result, branded IDs.

The 2026-06-05 draft's `apps/act-ingester` is removed (gap analysis §3.3 CUT).

### 8.3 Dependency direction (enforced by package boundaries)

```
domain ← persistence ← server ← realtime
  ↑                       ↑
  └── crdt ──────────────┘
  ↑                       ↑
  └── validation ────────┘
  ↑                       ↑
  └── shared ────────────┘
  ↑
  └── web
```

The `domain` package imports nothing. The `persistence` package imports `domain`. The `server` package imports `persistence` and `domain`. The `web` package imports everything but only through port interfaces. The single exception: `apps/server/composition.ts` is the only file that imports concrete classes.

---

## 9. Domain Model

The 2026-06-05 draft §9 defines four bounded contexts. v1 has three. The `Live session` context is removed (gap analysis §2.2 L2).

| Bounded context | Aggregate roots | Lives in | Owned by |
|---|---|---|---|
| **Reference catalog** | `Expansion`, `Encounter`, `Ability`, `Job`, `Role` | Postgres (normalized) | Game data team / community contributors |
| **Timeline script** | `Timeline` (with embedded `TimelineEvent` + `Branch` + `JoinPoint`) | Postgres + Yjs overlay for edits | Strategy authors |
| **Mitigation plan** | `Plan` (with `Assignment`, `TankState`, `PlanSnapshot`) | Yjs document per plan, snapshotted to Postgres | Raid leaders |

The `Plan` aggregate gains a `mergedFromSources: { cactbot: boolean, triggernometry: boolean, fflogs: boolean }` provenance field and a per-event `confidence: number` field on `TimelineEvent` (new in v1, §12.3). The `Assignment` aggregate is unchanged.

---

## 10. SOLID Decomposition

The 2026-06-05 draft §10 decomposes the system along four axes. v1 has three (the live-session decomposition is removed).

### 10.1 Reference catalog (interfaces)

Unchanged from the 2026-06-05 draft §3.1. `AbilityCatalog`, `EncounterCatalog`, `JobCatalog`. Postgres implementations in `packages/persistence/`.

### 10.2 Timeline script (interfaces)

The 2026-06-05 draft §3.2 had one `TimelineParser` interface with three concrete implementations (Cactbot, Triggernometry, FFLogs). v1 keeps that shape, and the three parsers are all on the critical path (§1.1 decision 5). The `TimelineRepository` interface is unchanged. The `fork()` method on the repository is kept (forks are how the variance data model in §9 supports branch authoring in v2.1).

### 10.3 Mitigation plan (interfaces)

Unchanged from the 2026-06-05 draft §3.3. `PlanService`, `MitStackEvaluator`, `PlanDocument`. The `MultiplicativeMitStackEvaluator` is pure, property-based-tested with `fast-check`, and uses the FFXIV formula `1.0 × ∏(1 - effectPct/100)` for percent mits, then additive shield after mit.

### 10.4 (Removed) Live session (interfaces)

The 2026-06-05 draft §3.4 had `ActEventIngester`, `DeviationDetector`, `PlanAdvancer`. All three are removed in v1. The first commit to any of these interfaces in the v1 codebase is a v2 commit.

### 10.5 The composition root

Unchanged from the 2026-06-05 draft §3.5, with `actIngester`, `deviationDetector`, and `planAdvancer` removed. The composition root now wires: `db`, `cache`, `abilityCatalog`, `timelineService` (with three parsers), `planService`, `authService`, and the Hocuspocus server factory (which lives in `apps/realtime`).

The Liskov Substitution property is unchanged: tests substitute `InMemoryAbilityCatalog`, `InMemoryPlanService`, `MockAuthService` without touching the production code.

---

## 11. Module / Package Layout

The 2026-06-05 draft §11 has 4 apps and 5 packages. v1 has 3 apps and 5 packages (`apps/act-ingester` is removed).

```
xivmitplan/
├── apps/
│   ├── web/                          # React 19 + Vite SPA
│   ├── server/                       # Hono on Cloudflare Workers (routes, middleware, auth, composition.ts)
│   └── realtime/                     # Yjs WebSocket server (Hocuspocus on DO; durable-object.ts, extensions/, server.ts)
│
├── packages/
│   ├── domain/                       # Pure TypeScript, no I/O (entities, value-objects, ports, math, parsers, merge, errors)
│   ├── persistence/                  # Postgres + Drizzle (schema, repositories, migrations, ts)
│   ├── crdt/                         # Yjs document shape + awareness
│   ├── validation/                   # All Zod schemas (ability, timeline, plan, fflogs, triggernometry, auth)
│   └── shared/                       # i18n, time, result, ids
│
├── data/                             # Versioned game data (abilities/{7.5x, 8.0-evolved, 8.0-reborn}, encounters, timelines, seed)
├── docs/                             # Architecture, ADRs, plans
├── tools/                            # migrate-data, timeline-importer, fflogs-sync
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .github/workflows/                # CI: typecheck, test, build, deploy
```

**Dependency direction:** same as §8.3. The 2026-06-05 draft's `docker/` directory is removed (local dev uses `wrangler dev` for Workers and DOs, `supabase start` for Postgres).

---

## 12. Timeline Ingestion Pipeline

The 2026-06-05 draft §12 has four stages and one source. v1 has four stages and three sources. The four stages are unchanged in shape.

### 12.1 Stage 1: Source acquisition

Three sources, three acquirers:

- **Cactbot `.txt`** — `fetch` from cactbot raw GitHub URLs (e.g., `https://raw.githubusercontent.com/quisquous/cactbot/main/.../FRU_P1.txt`) or user upload. Port: `CactbotTimelineSourceAcquirer`.
- **Triggernometry XML folder** — user uploads a `.zip` containing the Triggernometry export. The acquirer reads `TriggernometryExport.xml` and any per-zone trigger files. Port: `TriggernometryTimelineSourceAcquirer`. (Triggernometry + FFLogs research report: Triggernometry's export format is a single `<TriggernometryExport>` root with `<Trigger>` children.)
- **FFLogs report** — user provides a `reportCode` (or full URL); we OAuth-scope to the FFLogs GraphQL API and query `reportData { events }` filtered by `begincast` type. Port: `FFLogsTimelineSourceAcquirer`. (Triggernometry + FFLogs research report: the FFLogs public API has a 5,000 req/day free tier; we batch queries and cache aggressively. NFR-I1.)
- (Optional, future) **Hand-authored JSON** — `JsonTimelineSourceAcquirer`. v1.1 if the community asks for it; not in v1.0.

### 12.2 Stage 2: Parsing

Three parsers, one canonical output. The canonical `TimelineEvent` shape is unchanged from the 2026-06-05 draft §9.2.

```typescript
interface TimelineParser {
  parse(raw: RawTimeline, options: ParseOptions): ParseResult<TimelineEvent[]>;
}
```

- **`CactbotTimelineParser`** — parses Cactbot's `0.0 "Brutal Rain" sync / ...` format. Already in the 2026-06-05 draft §25. v1 ships this.
- **`TriggernometryTimelineParser`** — parses a Triggernometry export and produces a list of `TimelineEvent` where the `name` is the trigger's `CategoryName` + the action's text, the `timestampMs` is *inferred* from the trigger's typical timing in the encounter (Triggernometry triggers are event-driven, not time-anchored — this is the research report's key finding). Outputs `confidence: 0.6` for inferred timestamps.
- **`FFLogsTimelineParser`** — takes the FFLogs `events` array (filtered to `begincast` types for the encounter's boss NPC) and infers timing from cast `beginCast - endCast` durations across all pulls in the report. Outputs `confidence: 0.7` and a per-event `varianceMs: number` capturing the spread across pulls.

Errors are typed (unchanged from 2026-06-05 draft §12.2, plus two new variants for FFLogs OAuth and Triggernometry XML errors).

### 12.3 Stage 3: Validation + cross-source merge

The 2026-06-05 draft §12.3 validated events against the reference catalog. v1 adds **cross-source merge** as a sub-stage of validation.

```typescript
interface TimelineMerger {
  merge(sources: { cactbot?: TimelineEvent[], triggernometry?: TimelineEvent[], fflogs?: TimelineEvent[] }): MergeResult<Timeline>;
}
```

The merger:

1. **Normalizes** each source's events to the canonical `TimelineEvent` shape (with per-event `confidence` from the source).
2. **Aligns** events across sources by name (fuzzy match on `normalizedNames`) and approximate timestamp (within 2s window).
3. **Picks** the canonical timestamp using a weighted vote: Cactbot (0.5) + Triggernometry (0.2) + FFLogs (0.3). If only one source has the event, kept with its single-source confidence.
4. **Flags** per-event `confidence: number` (0-1) and `mergedFromSources: { cactbot, triggernometry, fflogs }`.
5. **Emits** a `MergeResult` with the merged `Timeline` and a list of `MergeConflict` records (events where sources disagreed by > 500ms, or where one source had an event the others did not).

The merger is the same shape regardless of how many sources feed it. Adding a fourth source in v2 is a new `TimelineSourceAcquirer` + `TimelineParser`, not a merger change.

### 12.4 Stage 4: Normalization + persistence

Idempotent upsert. The canonical `Timeline` is upserted with a content hash. If the same (encounterId, version, source) triple exists with the same content hash, no-op. Per-event `confidence` is stored as a JSON column on `timelines.events`. The `mergedFromSources` field is a top-level field on the `Timeline` row.

### 12.5 Pipeline orchestrator

```typescript
class TimelineIngestionService {
  async ingestCactbot(url: string, authorId: UserId): Promise<Result<TimelineId, IngestionError>>;
  async ingestTriggernometry(xml: string, authorId: UserId): Promise<Result<TimelineId, IngestionError>>;
  async ingestFFLogs(reportCode: string, oauthToken: string, authorId: UserId): Promise<Result<TimelineId, IngestionError>>;
  async mergeAndPersist(sources: MergeInput, authorId: UserId): Promise<Result<TimelineId, IngestionError>>;
}
```

The orchestrator runs in a Cloudflare Worker triggered by HTTP (the upload handler) or by a BullMQ-on-Upstash cron job. Idempotent: re-running with the same input is a no-op (NFR-14). The orchestrator is the only place that knows about all three sources; the parser, validator, merger, and repository interfaces are source-agnostic.

---

## 13. Variance and Branching Engine

The 2026-06-05 draft §6 defines the variance data model. v1 keeps the **data model and runtime resolver**; the **authoring UI** is v2.1.

The data structure is unchanged:

```typescript
type TimelineGraph = {
  events: TimelineEvent[];
  branches: Branch[];
  joins: JoinPoint[];
};

type Branch = {
  id: BranchId;
  parentEventId: TimelineEventId;
  label: string;
  condition: BranchCondition;
  outcomes: BranchOutcome[];
};

type BranchCondition =
  | { type: 'ALWAYS' }
  | { type: 'RNG'; distribution: { outcomeId: OutcomeId; weight: number }[] }
  | { type: 'PARTY_ACTION'; preconditions: CompiledExpression }
  | { type: 'ROLE_COMP'; required: JobId[] }
  | { type: 'HP_GATE'; thresholdPct: number };
```

The `TimelinePathResolver` (2026-06-05 draft §6.2) is in v1 — it's needed to render the linear view in Plan mode. The resolver is deterministic given a `ResolutionContext`; the same context always produces the same path. Critical for testing.

**v1.0 ships:** the data model, the resolver, the JSON serialization, the API endpoints to read branches and outcomes.

**v1.0 does NOT ship:** the dual-pane graph editor (2026-06-05 draft §6.3), the path-lock UI (FR-10), the trigger editor (2026-06-05 draft §6.4). The data model is ready; the UX is the work.

**Triggers (§6.4) are removed entirely** in v1. Triggers have no event source without Live mode. The `Trigger`, `TriggerAction`, `MARK_TIMELINE`, `FLAG_DEVIATION` types are not in the v1 schema. Deferred to v2.2.

---

## 14. Real-Time Collaboration Architecture

### 14.1 The CRDT

The plan document is a Yjs document. The shape is unchanged from the 2026-06-05 draft §7.1:

```typescript
type PlanDoc = {
  meta: Y.Map<{ encounterId: string; partyId: string; mode: 'REBORN'|'EVOLVED'|'CURRENT'; name: Y.Text; createdAt: number; }>;
  events: Y.Array<Y.Map>;
  assignments: Y.Map<AssignmentId, Y.Map<{...}>>;
  tankStates: Y.Array<Y.Map<{...}>>;
  locks: Y.Map<BranchId, OutcomeId>;
};
```

**Why Yjs and not Postgres-native CRDTs:** Yjs has the largest ecosystem, the best performance for text editing, the awareness protocol, and is the de facto standard. Postgres-native solutions (Electric, Supabase Realtime) require us to write the merge logic — which is what we're trying to avoid.

### 14.2 Conflict resolution

Unchanged from the 2026-06-05 draft §7.2. Three classes:

1. **Different fields of the same assignment:** Yjs's `Y.Map` field-level CRDT merges correctly. No special handling.
2. **Two users drag the same assignment to a different event:** Yjs's positional CRDT resolves by last-write-wins on the parent key. Acceptable: in practice, two raid leaders fighting over the same assignment is rare, and the loser sees the move immediately.
3. **Double-booking the same `(abilityId, targetUserId, eventId)`:** Yjs preserves both; our conflict detector flags it. The UI shows: "H1 and H2 both assigned Reprisal at 1:30. Resolve?"

### 14.3 Presence

Unchanged from the 2026-06-05 draft §7.3. Awareness state shape: `userId`, `displayName`, `color` (hashed), `cursor`, `selection`, `view`. LWW per field is acceptable for cursors. Updates throttled to 100ms per client.

### 14.4 Server topology — Cloudflare Durable Objects

**This is the v1 change from the 2026-06-05 draft §7.4.** Hocuspocus is no longer self-hosted on a VPS. It runs inside a Cloudflare DO.

Deployment details (from the DO + Hocuspocus research report):

- **One DO per plan.** The DO class is `PlanRoomDO extends DurableObject`. The DO holds the Hocuspocus server in a field. The DO is named after the plan ID via the `state.id` mechanism.
- **WebSocket routing.** Cloudflare's routing layer delivers WebSocket connections to the right DO based on the URL path. The Worker entry point (`apps/realtime/src/server.ts`) inspects the request URL, derives the plan ID, gets the DO stub via `env.PLAN_ROOM.get(id)`, and forwards the request.
- **Hibernation API.** The DO calls `state.acceptWebSocket(websocket)` after a successful JWT validation. The WebSocket is re-attached across hibernation cycles. Idle rooms with no connections hibernate and cost ~zero. (DO research report: the hibernation API is the key cost lever; without it, a 1K-active-plan deployment would be ~$200/mo, not $20-40.)
- **Persistence.** Hocuspocus's `Database` extension writes Yjs doc updates to the DO's `state.storage` (key-value, transactional). The DO is the source of truth for the live doc; Postgres is the snapshot history. Snapshots are debounced (5s of idle) and written to Supabase via a `fetch` from the DO to the API Worker (which uses the service-role key to bypass RLS for the snapshot write).
- **JWT auth on connect.** The DO's `fetch` handler validates the JWT before calling `hocuspocus.handleConnection(websocket)`. The JWT is a Supabase Auth access token; the DO validates the signature with a public key fetched from Supabase's JWKS endpoint (cached with a 1-hour TTL). The DO also checks that the `sub` claim is in the plan's `access` list (fetched from Supabase via the service-role key, cached with a 30s TTL).
- **Scaling pitfalls.** A single DO has a CPU limit (30s wall-time per request) and a memory limit (128MB on the standard plan). For our use case (Yjs update fanout, validation, snapshot writing), 30s is comfortable. If we hit it, the fix is to move the snapshot-write to a separate Worker (the DO is just the in-memory Yjs state). The DO research report's risk #3 is "DO CPU limit during large diffs"; the mitigation is the snapshot-rebuild policy in §14.5.

### 14.5 Snapshots

Unchanged from the 2026-06-05 draft §7.5. Postgres stores snapshots of the plan at discrete points (every 5 minutes of idle, on explicit "Save version" user action, on every `Assignment` deletion). A snapshot is a serialized Yjs document state (`Y.encodeStateAsUpdate`). The version timeline shows the last 10 snapshots; revert works.

**Snapshot-rebuild policy:** the gap analysis §3.4 noted that the "Yjs doc size > N rebuild" policy was deferred. v1 includes a simple version: if a Yjs doc's encoded state exceeds 2MB, the next snapshot is taken with `gc: true` (Yjs garbage-collects tombstones) and the history before the rebuild is archived as a `PlanSnapshotArchive` row.

### 14.6 Production deployment playbook

The 2026-06-06 Hocuspocus-on-Cloudflare-DO deep-dive produced a concrete, end-to-end deployment playbook for shipping Hocuspocus v4 on Cloudflare Durable Objects from day one. The production-proven wrapper is **`y-partyserver`** (a `YServer` subclass of PartyKit's `Server` that itself extends `DurableObject`) — not a hand-rolled DO adapter. The full playbook, verbatim from the deep-dive:

#### 14.6.1 Repository layout (one repo, two deploys)

```
xivmitplan/                      (the v1.0 monorepo)
  apps/
    web/                          # React + Tiptap (existing)
    realtime/                     # NEW — Hocuspocus on PartyKit
      partykit.json
      wrangler.jsonc
      src/
        server.ts                 # YServer subclass with Supabase persistence
        auth.ts                   # Supabase JWT verification
        index.ts                  # Worker entry / fetch routing
  packages/
    shared/                       # Yjs schema, types
    domain/                       # Zod schemas, port interfaces
```

#### 14.6.2 `partykit.json`

```json
{
  "name": "xivmitplan-realtime",
  "main": "src/index.ts",
  "compatibilityDate": "2026-05-01"
}
```

#### 14.6.3 `wrangler.jsonc` (what PartyKit generates; verify these bindings)

```jsonc
{
  "name": "xivmitplan-realtime",
  "main": "src/index.ts",
  "durable_objects": {
    "bindings": [{ "name": "PARTYKIT_ROOM", "class_name": "PartyRoom" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["PartyRoom"] }],
  "vars": {
    "SUPABASE_URL": "https://xxx.supabase.co",
    "SUPABASE_JWT_JWKS_URL": "https://xxx.supabase.co/auth/v1/.well-known/jwks.json"
  }
}
```

#### 14.6.4 Server code (`apps/realtime/src/server.ts`)

Minimum viable Hocuspocus-on-PartyKit with Supabase persistence (debounce 2s, maxWait 10s) and HS256 JWT verification (recommended over JWKS for v1 — one `crypto.subtle.verify` call, no network roundtrip, no cache to manage):

```ts
import { YServer } from "y-partyserver";
import type * as Party from "partykit/server";
import * as Y from "yjs";
import { verifySupabaseJwt } from "./auth";

export class PartyRoom extends YServer {
  static async onLoad({ room, ctx }: Party.ServerHooks) { /* no-op */ }

  // Hocuspocus onAuthenticate equivalent — runs before Yjs handshake
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const token = new URL(ctx.request.url).searchParams.get("token");
    const claims = await verifySupabaseJwt(token);
    if (!claims) return new Response("Unauthorized", { status: 401 });
    return await super.onConnect(conn, ctx);
  }

  // Persist to Supabase Postgres every 2s, max 10s
  async onSave(doc: Y.Doc) {
    const update = Y.encodeStateAsUpdate(doc);
    const docId = this.party.id;
    await fetch(`${this.env.SUPABASE_URL}/rest/v1/ydoc_snapshots?on_conflict=doc_id`, {
      method: "POST",
      headers: {
        "apikey": this.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ doc_id: docId, update: btoa(String.fromCharCode(...update)) })
    });
  }

  async onLoad({ room }: Party.ServerHooks): Promise<Y.Doc | null> {
    const docId = room.id;
    const res = await fetch(
      `${this.env.SUPABASE_URL}/rest/v1/ydoc_snapshots?doc_id=eq.${docId}&select=update`,
      { headers: { "apikey": this.env.SUPABASE_ANON_KEY } }
    );
    const [row] = await res.json();
    if (!row) return null;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Uint8Array.from(atob(row.update), c => c.charCodeAt(0)));
    return doc;
  }
}
PartyRoom satisfies Party.Server;
```

#### 14.6.5 Frontend wiring

```ts
import YPartyKitProvider from "y-partyserver/provider";
const provider = new YPartyKitProvider({
  host: "xivmitplan-realtime.partykit.dev",
  room: planId,
  doc: ydoc,
  params: async () => ({ token: (await supabase.auth.getSession()).data.session?.access_token })
});
```

The `params` callback re-runs on every WebSocket reconnect, so a 1-hour access token expiry mid-session is handled by the `onAuthenticationFailed` listener — call `supabase.auth.refreshSession()`, then `provider.disconnect()` + `provider.connect()`. Latency cost is ~200ms; this is the recommended pattern from the deep-dive's mid-session-expiry table.

#### 14.6.6 Required env vars

| Variable | Source | Scope |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `vars` (public) |
| `SUPABASE_ANON_KEY` | Supabase project API key (anon) | `vars` (public; used for read-on-load) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project API key (service role) | `wrangler secret put` — DO only, never the client |
| `SUPABASE_JWT_SECRET` | Supabase project JWT secret (HS256) | `wrangler secret put` — for v1 HS256 path |
| `SUPABASE_JWT_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` | `vars` (v2 upgrade path only) |

#### 14.6.7 Week-1 deployment steps (DO + Hocuspocus from day-one)

**Day 1 — Repo bootstrap (the "from scratch" decision in §22.1)**
1. `mkdir xivmitplan && cd xivmitplan && git init && pnpm init` and set the workspace structure exactly as §14.6.1 prescribes: `apps/web` (existing React 19 + Vite, mirror of MitPlan v1), `apps/realtime` (NEW PartyKit Hocuspocus server), `apps/server` (NEW Hono on Cloudflare Workers API), `packages/domain` (Zod schemas, port interfaces, parsers), `packages/shared` (Yjs schema, types), `packages/validation` (the single source of truth for Drizzle / Yjs / REST).
2. Add `pnpm-workspace.yaml` listing all `apps/*` and `packages/*`. Add `turbo.json` with the build/dev/test/lint pipeline.
3. `pnpm add -w typescript@5.6 vite vitest fast-check zod drizzle-orm @supabase/supabase-js yjs y-protocols hono`.
4. `pnpm add -F realtime @hocuspocus/server@^4 partykit y-partyserver` — pin major versions; do not float to `^4.x` past 60 days of production.

**Day 2 — Realtime Worker scaffold**
5. `cd apps/realtime && pnpm create partykit@latest` (or scaffold by hand from §14.6.2–§14.6.3).
6. In `wrangler.jsonc`, set `compatibilityDate: "2026-05-01"`, bind the DO class `PartyRoom`, set the `migrations` entry for `new_sqlite_classes`, and put the env vars from §14.6.6 in place (the first three go via `wrangler secret put`, `SUPABASE_URL` is a `var`).
7. Implement `apps/realtime/src/server.ts` per §14.6.4.
8. Implement `apps/realtime/src/auth.ts` with `verifySupabaseJwt(token)` — one `crypto.subtle.verify` call against the JWT secret loaded from `this.env.SUPABASE_JWT_SECRET`.

**Day 3 — Yjs client wiring + first end-to-end smoke test**
9. In `apps/web`, add `y-partyserver/provider` and instantiate `YPartyKitProvider` per §14.6.5.
10. Write a Playwright smoke test: two browser contexts, both sign in, both join `plan:smoke-1`, user-A types, assert user-B sees the change in < 200ms p95 over 50 runs.
11. Deploy `apps/realtime` to Cloudflare with `pnpm partykit deploy`; verify in the dashboard that the `PartyRoom` DO is created on first connection.

**Day 4–5 — Snapshot persistence + auth closure**
12. Add the `ydoc_snapshots` table to Supabase via Drizzle migration (see §17.7 for the schema).
13. Add the `mid_session_refresh` reconnect path in `apps/web/src/realtime/provider.ts` — on `onAuthenticationFailed`, call `supabase.auth.refreshSession()`, then disconnect + reconnect the provider (latency budget ~200ms; this is the recommended pattern from the deep-dive's mid-session-expiry table).
14. Wire the `graceful_drain` script for deploys: stop accepting new connections, wait 30s, then `pnpm partykit deploy`. The every-deploy-disconnects-all-sockets footgun is real (see §23 Risks).

**Guardrail 1:** Pin Hocuspocus to `^4.2.0` (released 2026-06-12, three days before this review). The May 2026 v4 HN launch thread (item 48208834) is still open with no production-blocker feedback. Re-evaluate in 60 days; do not float to `^4.x` past that window.
**Guardrail 2:** Every plan editor shows a "Reconnecting…" toast for the 150–400ms cold-start window. This is a v1 feature in `AppShell` (§15.1), not a workaround — the alternative is DO eviction eating the doc, which is much worse.

#### 14.6.8 Known footguns (named in the deep-dive)

1. **Hibernation wipes the in-memory Y.Doc.** Anything not in DO storage or in `serializeAttachment` is lost. The `YServer` in `y-partyserver` handles this for the Y.Doc, but any custom Y.Doc wrappers must be re-loadable from `onLoad`.
2. **`setTimeout` / `setInterval` block hibernation entirely.** Use `ctx.storage.setAlarm` instead. The `YServer` callback's `debounceWait` is a `setTimeout`-style timer; check whether `y-partyserver` uses alarms for that. If it uses `setTimeout`, every active room stays awake and we pay duration charges.
3. **30s CPU cap per invocation.** Y.Doc application on a 2MB document could approach this. `encodeStateAsUpdate` is O(n) on doc size; a large `onLoad` could time out. Cache the loaded doc size and warn in dev.
4. **Per-DO soft throughput limit ~1,000 req/s.** A single viral plan (e.g., 50 users typing furiously) could hit this. Mitigation: 1 DO per plan, and a Hocuspocus debounce in front of every broadcast (do not re-broadcast a 1KB update if nothing has changed in 50ms).
5. **Code deploys disconnect every WebSocket.** Rolling deploys = every plan editor gets a reconnect toast simultaneously. Mitigate with the graceful-drain script in §14.6.7 step 14.
6. **The 16,384-byte `serializeAttachment` limit is per-WS, not per-DO.** User metadata (name, color, plan id) fits easily. Don't try to put the Y.Doc there.
7. **Supabase Realtime Broadcast authorization uses RLS** — if we later swap Y.Doc broadcast for Supabase Broadcast, the auth model is the same Postgres RLS, so the migration is cheap. Keep the auth layer Postgres-native.

#### 14.6.9 Fallback playbook (Hocuspocus on $5 VPS)

If within the first 2 weeks we hit any of the cost or scale symptoms in the deep-dive's fallback table, we move to **Hocuspocus v4 on a single $5–$10 VPS with Redis pubsub for multi-node scale**. A 1 vCPU + 1 GB RAM VPS handles ~3,000 concurrent users; the break-even is ~$355/month on Cloudflare = 50–70 $5 VPS instances, which we will not approach in year one. The migration is server-URL-only — the Hocuspocus provider on the client is identical, and the `ydoc_snapshots` Supabase table is the single source of truth on both backends, so the swap is `apps/realtime` Worker → Node process + change the `YPartyKitProvider` host. Bounded rollback, ~1 week of work.

---

### 14.7 Feasibility drilldown (added 2026-06-14)

This section is the explicit "could it actually work?" check that the 2026-06-06 lock did not formalize. It drills into the four points most likely to fail and assigns a confidence score to each.

### 14.7.1 Can Cloudflare DO + Hocuspocus v4 hold 50 concurrent plan rooms in production?

**Confidence: HIGH (0.85).** Confirmed by:

- Hocuspocus v4.2.0 (2026-06-12) is the third v4 release since the May 20 2026 HN edge-path launch — three additive patch releases in three weeks, no API breaks, no revert. The maintainer's edge-path feedback thread (HN item 48208834) has no production-blocker reports as of 2026-06-14.
- The `y-partyserver` wrapper (a `YServer` subclass of PartyKit's `Server`, which extends `DurableObject`) is the only documented path with Hibernation-aware WebSocket plumbing. It lives in the `cloudflare/partykit` monorepo at `packages/y-partyserver` (latest 2.2.0, 2026-04-24) — actively maintained, 1.2K stars.
- The DO hibernation billing rules, verified 2026-06-14 against the Cloudflare DO pricing page: "Idle, hibernation-eligible DOs are not billed." Wake-up cost is a single request charge + a few hundred ms of 128MB GB-s. The $20-40/mo DO cost at 1K active plans is supported by the doc's §21.4 recompute ($5-15/mo).
- The 50 active rooms at year-one target is 5% of the DO throughput ceiling. The failure mode is not 50 rooms; it is a single viral plan hitting the 1,000 req/s soft cap (footgun #4 in §14.6.8). Mitigation: 1 DO per plan + Hocuspocus broadcast debounce. The doc carries this mitigation.

**What could still go wrong:** a Yjs-doc-size regression that pushes the 2MB rebuild threshold into a daily occurrence (we have never run 1K active Yjs docs in production). Mitigation: the snapshot-rebuild policy in §14.5 and the §20.3 stress-test suite running nightly against staging.

### 14.7.2 Can the three-source timeline merger converge at 48h post-patch?

**Confidence: MEDIUM (0.7).** Proven by inference, not by execution.

- Cactbot is the most reliable source (lowest noise, structured format, community-maintained GitHub with a known cadence). The Cactbot poll job (§16.2) runs every 6h.
- Triggernometry is the most variable (event-driven not time-anchored, so per-event timestamps are inferred at confidence 0.6). The Triggernometry poll job runs every 24h against a community-curated index.
- FFLogs is gated on free-tier rate limits (5,000 req/day). At 1K active plans + 100 daily statics, we are well under the budget; at 10K we are over. The §16.4 R2-cron-snapshot pattern for the 10K tier does not affect ingest, only backup.
- The merge orchestrator runs idempotently; re-running with the same input is a no-op (NFR-14). The bottleneck is the slowest source (Triggernometry at 24h cadence) which is well within the 48h NFR-6.

**What could still go wrong:** Square Enix dropping a hotfix on Patch Day that renames 30+ abilities (the Wildcard case). The data team's job is to detect this in the 1-2h window between JP and EN patches; if they miss, plans render with stale names for up to 24h. Mitigation: the patch-day staging exercise in §19.3.

### 14.7.3 Can the data model absorb Evolved-mode design changes (16-action hotbar, 2-minute meta deprecation)?

**Confidence: HIGH (0.85).** Confirmed at the 2026-06-14 review.

- The `(jobId, abilityId, mode)` composite key (§19.2) is the right shape: one row per mode per ability, with the cross-mode equivalence map for renames/consolidations.
- 2-minute burst deprecation: the mit planner does not depend on burst windows. The burst-coordination features from the 2026-06-05 draft were already cut.
- 16-action hotbar consolidation: the planner does not depend on action-slot counts. The visual UI of the plan editor is timeline + mit assignments, not a hotbar mirror.
- New jobs (Tank + Physical Ranged DPS, Evolved-only): these are rows in the `jobs` table, scheduled to ship via a data-team Drizzle migration in Phase 4 (§22.6). The schema does not need to change.

**What could still go wrong:** Square Enix adding a third "combat mode" beyond Reborn and Evolved. The schema is mode-agnostic (a string enum), so this is a data-row addition, not a migration. The "patch-update banner" affordance in §19.3 step 4 is the UX mechanism.

### 14.7.4 Can we hit the 12-month success metrics (5K users, 500 weekly active plans) with the account-required cut?

**Confidence: MEDIUM (0.65).** The honest read.

- The 5K-user success metric is on account creation, not on verified email (§7.7.6).
- The 20-30% activation drop from account-required is the published risk (§23.2). Baymard 2024 anchors 24% as the conservative lower bound; the 24-37% range from 2024-2026 practitioner audits is the upper bound.
- MitPlan v1's "Universal Edit Access" was load-bearing for casual learners. The §22.7 migration claim flow converts anonymous v1 users into signed-in v1.0 users with one click.
- The Discord OAuth sign-in is one click, not a form. Discord is the primary CTA (~45% target). Google is the secondary CTA for the 5-10% gaming-Discord-averse (~12% target). Email is tertiary, gated to a "More options" expander.

**What could still go wrong:** the activation drop exceeds 30% in the first 60 days post-launch. The escape hatch is in §23.2: re-evaluate adding a "magic link" anonymous-tier in v1.1. The escape hatch is cheap (1 sprint of work to add the magic-link-anonymous flow as a Supabase Auth feature flag).

### 14.7.5 Summary feasibility scorecard

| Question | Confidence | Failure mode | Bounded rollback cost |
|---|---|---|---|
| DO + Hocuspocus v4 at 50 rooms | 0.85 | Single viral plan hits per-DO throughput cap | 1 week to swap to $5-VPS Hocuspocus |
| 3-source merger at 48h post-patch | 0.70 | Triggernometry 24h cadence + patch-day name churn | 24h stale timeline; acceptable per NFR-6 |
| 8.0 data-model absorption | 0.85 | SE adds a third combat mode | 1 row in a string enum, no migration |
| 5K-user target with account-required | 0.65 | Activation drop > 30% | 1 sprint to add magic-link-anonymous tier |

**Overall v1 feasibility:** HIGH. The two CONFIRMED 2026-06-14 verifications (Hocuspocus + DnD stack) and the one UPDATED fact (8.0 model) remove the two largest "documented but young" risks. The activation-drop risk is the only one that cannot be pre-mitigated; it is observable in the first 60 days post-launch.

---

## 15. Frontend Architecture

### 15.1 Component hierarchy

```
src/
├── routes/                      # React Router 7 file-based routes
│   ├── _layout.tsx              # App shell
│   ├── _auth.callback.tsx       # Discord OAuth callback (new in v1)
│   ├── learn._index.tsx         # Encounter browser
│   ├── learn.$encounterId.tsx   # Learn mode (read-mostly)
│   ├── plan._index.tsx          # User's plan list
│   ├── plan.new.tsx             # Create flow
│   ├── plan.$planId.tsx         # Plan mode (default)
│   ├── plan.$planId.versions.tsx
│   └── timeline._index.tsx
│
├── features/
│   ├── plan/        # components: PlanEditor, TimelinePane, PlanPane, MitigationPalette, TankStatePanel, ConflictBanner, SnapshotHistoryPanel. hooks: useYjsPlan, useAssignments, useMitStack, useAuth
│   ├── timeline/    # components: TimelineImporter, MergeConfidenceBadge, BranchAnnotations
│   ├── learn/       # components: MitStackVisualization, TooltipExplainer, EncounterCard
│   └── auth/        # components: SignInButton, ClaimPlansModal. hooks: useSession (new in v1)
│
├── ui/                          # Generic primitives (Button, Modal, ...)
└── domain/                      # Local copy of @xivmitplan/domain ports
```

Compared to the 2026-06-05 draft §15.1: `plan.$planId.live.tsx` is removed; `features/live/` is removed; `features/timeline/TimelineGraphEditor.tsx` is removed (v2.1); `features/timeline/TriggerEditor.tsx` is removed (v2.2); `features/auth/` and `_auth.callback.tsx` are added.

### 15.2 Timeline rendering and DnD

**Re-verified 2026-06-14; risk retired.** The interactive timeline is a `dnd-timeline@3.1.1` instance with viewport virtualization, `content-visibility: auto` on event cards, memoization by `(eventId, assignmentCount, mode)`, and 100ms-throttled awareness updates. Two drag contexts: palette → event card (standard `@dnd-kit/core@6.3.1`); event card → event card in the linear view (uses `dnd-timeline`'s `useTimelineDnd` hook; in v1.0, this is just "move an assignment between events" — branch retargeting is v2.1).

`@visx/axis@4.0.0` and `@visx/scale@4.0.0` (2026-06-11, React 19-clean) are used for the axis labels and time scale. The `dnd-timeline` + `@dnd-kit` + `visx` stack is React 19-clean; the vendor fallback (a one-page spec re-implementing `useTimelineDnd` on top of `@dnd-kit/core`'s `DndContext` + `useDraggable` + `restrictToHorizontalAxis` + `closestCenter`) is retained as defense in depth, not as the expected path. See §7.10 for the trigger thresholds.

#### 15.2.1 Vendor-fallback spec (one page)

The fallback, if invoked, re-implements dnd-timeline's `useTimelineDnd` on top of `@dnd-kit/core` directly. Concrete pieces:

- A `DndContext` with the `PointerSensor` and `restrictToHorizontalAxis` modifier, scoped to the timeline viewport.
- Each `TimelineEvent` is a `useDraggable` and `useDroppable`. The `data` payload carries `{ eventId, slotIndex }`.
- Collision strategy: `closestCenter` for single-event-to-event moves, `closestCorners` for multi-select (not used in v1.0).
- Edge auto-scroll: a `useEffect` that watches `event.over` and scrolls the viewport container by 8px/frame when the pointer is within 24px of either edge. Cancel on drag end.
- Resize handles: not needed in v1.0 (the linear view does not allow event duration editing).
- Virtualization: `content-visibility: auto` on `.timeline-event-card` with `contain-intrinsic-size: 96px` for off-screen cards. This is what dnd-timeline already does.
- Awareness: 100ms-throttled cursor + selection updates via the Yjs awareness protocol.

This is one sprint of work (not a from-scratch timeline canvas) and would only be invoked if dnd-timeline becomes unmaintained or React-incompatible. Triggers in §7.10.

### 15.3 State management

**Modified from the 2026-06-05 draft §15.4.** No TanStack Query. The state layers:

- **Server state:** tRPC + zustand. The `useQuery` zustand store wraps tRPC procedures and caches with a 60s TTL.
- **Real-time state:** Yjs + a thin zustand store. Exposes `assignments`, `tankStates`, `meta`, `locks` as plain objects; the store syncs to/from the Yjs doc.
- **UI state:** plain React state + a small zustand store for cross-component UI.
- **Auth state:** `@supabase/supabase-js`'s session + a `useSession` hook.
- **Theme:** ThemeContext from MitPlan v1, lifted into a zustand store.

**Single rule:** UI state never duplicates Yjs state. If the value needs to survive a reload, it lives in Yjs (and snapshots to Postgres). If it does not, it is plain React state.

### 15.4 Routing

```
/                                         → redirect to /plan (or /learn if not signed in)
/learn                                    → encounter browser
/learn/:encounterId                       → Learn mode
/plan                                     → list of user's plans
/plan/new?encounterId=...                 → create flow
/plan/:planId                             → Plan mode (default)
/plan/:planId/versions                    → version history
/timeline                                 → browse public timelines
/timeline/:timelineId                     → view a timeline
/timeline/:timelineId/edit                # edit a timeline (author only)
/encounter/:encounterId                   → encounter detail
/auth/callback                            → Discord OAuth callback
```

The `/plan/:planId` route loader fetches the plan snapshot, the encounter, the ability catalog slice, and the latest timeline version in parallel. The component hydrates the Yjs doc on mount.

### 15.5 Mode toggle (REBORN / EVOLVED / CURRENT)

**Partially in v1.** The data model supports it. The UI toggle is **deferred to v1.1**. In v1.0, plans are always in `CURRENT` mode. The "patch-update banner" with the "convert to Reborn" CTA (2026-06-05 draft §19.3) is in v1.1. **v1.0 includes:** the ability-version resolution logic (when a plan references an ability whose `effectiveTo` is in the past, the validator flags it). The UI shows a static "This ability has been updated in patch 7.25" badge on the assignment card; the user clicks it to see the diff and decide whether to swap.

### 15.6 Mobile, performance, accessibility

Unchanged from the 2026-06-05 draft §15.7-§15.9. Plan editor is fully responsive; on mobile, the dual-pane becomes a tabbed view (Timeline / Mitigations / Tank), the mitigation palette is a bottom sheet, the mit stack visualization is a vertical bar chart. Performance budget: initial JS bundle (gzipped) < 250 KB; TTI < 1.5s on cable; p95 frame time < 16ms; WebSocket reconnect < 1s. WCAG 2.1 AA; all drag-and-drop has a keyboard alternative; color is never the only signal.

---

## 16. Backend Architecture

### 16.1 Services

The backend is decomposed by bounded context. The 2026-06-05 draft §16.1 listed 6 services; v1 has 6 (the `ActIngestService` is replaced by `AuthService`).

- **PlanService** — implements `PlanService` port. Owns the Yjs doc lifecycle (via the realtime DO), snapshots, and search.
- **TimelineService** — implements `TimelineRepository` port. Owns the three parsers (Cactbot, Triggernometry, FFLogs), the merger, the validator, and the version chain.
- **CatalogService** — implements `AbilityCatalog`, `EncounterCatalog`, `JobCatalog`. Owns the reference catalog and the patch-day ingest.
- **UserService** — implements `UserRepository`. Owns users, parties, and access control.
- **AuthService** — implements the OAuth flow (Discord primary, email/password fallback), JWT minting/validation, the share-link token system, and the MitPlan v1 migration claim flow. Uses `@supabase/supabase-js` on the server side and `jose` for custom JWT minting (share-link tokens with `plan_access` claims). **New in v1.**
- **(Removed) ActIngestService** — deferred to v2.

### 16.2 Background jobs

BullMQ on Upstash Redis. Workers are Cloudflare Workers triggered by cron or HTTP. Job types (unchanged from 2026-06-05 draft §16.2, minus ACT-related):

- `analyze-timeline` — accuracy analyzer on a newly ingested timeline.
- `ingest-fflogs` — polls FFLogs for new reports on a watchlist of encounters.
- `revalidate-plans` — re-runs the plan validator on plans that reference abilities whose `effectiveTo` is in the past.
- `cactbot-poll` — every 6h, checks the cactbot repo for new commits.
- `triggernometry-poll` — every 24h, checks a community-curated Triggernometry index for new exports. (New in v1; the Triggernometry + FFLogs research report recommended polling rather than scraping.)
- **(Removed) `garbage-collect-act-sessions`** — deferred to v2.

### 16.3 Caching

Unchanged from the 2026-06-05 draft §16.3. Ability catalog: Redis 60s TTL. Encounter detail: Redis 5-min TTL. Yjs doc snapshots: Postgres, not cached. The plan itself is the Yjs doc; we do not cache it.

### 16.4 Security

**Modified from the 2026-06-05 draft §16.4.** Auth is Supabase Auth.

- **Auth:** Supabase Auth issues the JWT. The JWT is the session token. The realtime DO validates the JWT on connect. The API Worker validates the JWT on every request.
- **Authorization:** RLS per plan (enforced in Postgres, not in the application). `plan_access` grants are stored in Postgres; the Drizzle client is called with the user's JWT, so RLS is the boundary.
- **Share-link tokens:** minted by the AuthService as a separate JWT (signed with our own key, not Supabase's). The token has a `plan_access` claim (`read` or `edit`) and a 7-day expiry. The share-link is `/plan/$planId?token=...`; the client sends the token in the Authorization header when connecting to the DO; the DO validates the token and adds the token's `sub` (or a synthetic "guest" user ID for anonymous share links) to the plan's access list for the duration of the session.
- **Input validation:** every public endpoint validates its input with Zod before any handler runs. The Zod schemas are shared with the client (from `packages/validation/`).
- **Rate limiting:** Cloudflare's built-in rate limiting + a per-user token bucket for write endpoints.
- **CSP:** strict CSP. Nonce-based scripts. No `unsafe-inline`.
- **Secrets:** all secrets in Cloudflare Workers Secrets. No `.env` files in the repo.

### 16.5 Server composition root

```typescript
// apps/server/src/composition.ts — the only file that imports concrete classes.
export function buildAppContext(env: Env): AppContext {
  const db = new DrizzleClient(env.DATABASE_URL, { jwt: env.SUPABASE_JWT_SECRET });
  const supabaseAuth = new SupabaseAuthClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const cache = new UpstashRedisClient(env.UPSTASH_REDIS_URL, env.UPSTASH_REDIS_TOKEN);
  const storage = new SupabaseStorageClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const abilityCatalog = new CachedAbilityCatalog(
    new DrizzleAbilityCatalog(db), cache, { ttlMs: 60_000 }
  );

  const timelineService = new DrizzleTimelineService(
    {
      cactbot: new CactbotTimelineParser(),
      triggernometry: new TriggernometryTimelineParser(),
      fflogs: new FFLogsTimelineParser(env.FFLOGS_OAUTH_CLIENT_ID, env.FFLOGS_OAUTH_CLIENT_SECRET),
    },
    new TimelineMerger(),
    new CatalogTimelineValidator(abilityCatalog),
    db, cache
  );

  const planService = new DrizzlePlanService(db, cache);
  const authService = new SupabaseAuthService(supabaseAuth, db, env.JWT_SIGNING_KEY);

  return { abilityCatalog, timelineService, planService, authService, db, cache, storage };
}
```

The `actIngestService` line from the 2026-06-05 draft §16.5 is removed. The `authService` line is added.

---

## 17. Data Model and Schema

The 2026-06-05 draft §17 has 4 schema sections. v1 has 3 (the live-session schema is removed). All v1 tables have RLS enabled.

### 17.1 Reference catalog (Postgres, normalized)

Unchanged from the 2026-06-05 draft §17.1. The `abilities` table has `mode: REBORN|EVOLVED|CURRENT|ALL` and the indexes on `(job_id, mode)`, `(role_id, mode)`, `(game_action_id)` are unchanged.

The `users` table is replaced by Supabase's `auth.users` table. We do not own it. We add a `public.profiles` table that references `auth.users(id)` and holds the public display name, Discord ID, and migration-flag (see §17.5).

### 17.2 Timeline script (Postgres, with content hash)

Unchanged from the 2026-06-05 draft §17.2, with two new columns:

```sql
ALTER TABLE timelines ADD COLUMN merged_from_sources JSONB NOT NULL DEFAULT '{"cactbot": false, "triggernometry": false, "fflogs": false}';
ALTER TABLE timelines ADD COLUMN per_event_confidence JSONB;  -- map: eventId -> confidence
```

The `events` JSONB gains a `confidence: number` field on each `TimelineEvent`. The `varianceMs: number` field is added for events sourced from FFLogs. The `source` enum gains `TRIGGERNOMETRY` and `FFLOGS` (was `CACTBOT`, `MANUAL`, `IMPORTED`).

### 17.3 Plan (Postgres snapshots + Yjs live doc)

Unchanged from the 2026-06-05 draft §17.3. The `plan_meta`, `plan_snapshots`, and `plan_access` tables are the same. The `plan_access` table gains a `via_share_token: BOOLEAN` column to distinguish invited users (added by the owner) from share-link redeemers.

RLS policies on `plan_snapshots`, `plan_meta`, and `plan_access`:

```sql
-- plan_snapshots: a user can read snapshots of a plan if they are the owner or in plan_access
CREATE POLICY plan_snapshots_read ON plan_snapshots FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM plan_access pa WHERE pa.plan_id = plan_snapshots.plan_id AND pa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM plan_meta pm WHERE pm.plan_id = plan_snapshots.plan_id AND pm.owner_id = auth.uid())
  );

-- plan_meta: read if owner or in plan_access
CREATE POLICY plan_meta_read ON plan_meta FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM plan_access pa WHERE pa.plan_id = plan_meta.plan_id AND pa.user_id = auth.uid())
  );

-- plan_access: read your own access rows + access rows for plans you own
CREATE POLICY plan_access_read ON plan_access FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM plan_meta pm WHERE pm.plan_id = plan_access.plan_id AND pm.owner_id = auth.uid())
  );
```

### 17.4 (Removed) Live session (Postgres time-series + R2 raw)

The `live_sessions` and `act_events` tables from the 2026-06-05 draft §17.4 are removed. Deferred to v2.

### 17.5 Cross-cutting tables

The 2026-06-05 draft §17.5 `users` table is replaced by `public.profiles`. The profile table is now a 1:1 mirror of `auth.users(id)` and is keyed by three provider identities — Discord, Google, and email — to support the three-provider matrix from §7.7:

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  -- Three-provider identity columns; each is nullable, but at least one
  -- is populated by the time the profile is created. The corresponding
  -- row in auth.identities is the authoritative source; these columns
  -- are denormalized caches for fast RLS and migration lookups.
  discord_id    TEXT UNIQUE,
  google_id     TEXT UNIQUE,
  email         TEXT UNIQUE,                        -- populated for email/password and from any OAuth provider that shares an email
  email_verified_at TIMESTAMPTZ,                    -- null until magic-link / verification completes
  mitplan_v1_claim_done BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The auth.identities table (managed by Supabase, 1:N per auth.users row)
-- is the only authoritative source for which (provider, provider_user_id)
-- tuples belong to which auth.users row. The merge_auth_users RPC (§17.7)
-- reassigns auth.identities cascades on DELETE.

CREATE INDEX ON profiles (discord_id) WHERE discord_id IS NOT NULL;
CREATE INDEX ON profiles (google_id)  WHERE google_id  IS NOT NULL;
CREATE INDEX ON profiles (email)      WHERE email      IS NOT NULL;
```

The `parties` and `roles` tables are unchanged. A trigger on `auth.users` (or a `SECURITY DEFINER` function called by the `merge_auth_users` RPC) keeps the `profiles` denormalized columns in sync with `auth.identities`.

### 17.6 The Yjs live projection

Unchanged from the 2026-06-05 draft §17.6. The Yjs doc shape is the same: `meta`, `events`, `assignments`, `tankStates`, `locks`. The `mode` field on `meta` is in v1 (data model) but the UI toggle is v1.1.

### 17.7 Auth tables and account linking (new in v1)

The 2026-06-06 auth deep-dive produced a complete data-model for account linking and the MitPlan v1 anonymous migration. The new auth surface lives in two new tables (`legacy_local_plans` and the `ydoc_snapshots` projection referenced from §14.6) plus three Postgres functions (`merge_auth_users`, `claim_legacy_plans`, `flip_expired_legacy_plans`).

#### 17.7.1 `legacy_local_plans` (MitPlan v1 anonymous migration)

```sql
-- A MitPlan v1 plan, captured during the dual-write window
CREATE TABLE legacy_local_plans (
  id              UUID PRIMARY KEY,                 -- the v1 plan UUID
  owner_discord_id TEXT,                            -- from the v1 import scan
  owner_email     TEXT,                             -- from the v1 import scan
  payload         JSONB NOT NULL,                   -- the v1 plan JSON (full plan body)
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_by      UUID REFERENCES auth.users(id),   -- null until claimed
  claimed_at      TIMESTAMPTZ,
  -- 90-day auto-flip clock: this row auto-flips to a system-user-owned
  -- read-only XIVMitPlan plan when claimed_by is null and expires_at
  -- has passed. Generated from captured_at; the nightly pg_cron job
  -- reads expires_at (no recompute needed).
  expires_at      TIMESTAMPTZ NOT NULL
                  GENERATED ALWAYS AS (captured_at + interval '90 days') STORED
);

CREATE INDEX ON legacy_local_plans (owner_discord_id) WHERE claimed_by IS NULL;
CREATE INDEX ON legacy_local_plans (owner_email)     WHERE claimed_by IS NULL;
CREATE INDEX ON legacy_local_plans (expires_at)      WHERE claimed_by IS NULL;
```

#### 17.7.2 `ydoc_snapshots` (Hocuspocus persistence target)

The Hocuspocus DO writes the latest Yjs doc state to this table on every `onSave` (debounce 2s, maxWait 10s). The DO is the hot in-memory layer; this table is the source of truth that the DO reloads on cold start. Full RLS is in Appendix D.

```sql
CREATE TABLE ydoc_snapshots (
  plan_id     UUID PRIMARY KEY REFERENCES plan_meta(id) ON DELETE CASCADE,
  update      BYTEA NOT NULL,                       -- Y.encodeStateAsUpdate(doc)
  byte_size   INTEGER NOT NULL,                     -- for the §14.5 rebuild policy (2MB threshold)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 17.7.3 The `merge_auth_users` RPC (cross-provider account link)

Called by `/v1/auth/link` (new in v1) when a signed-in user has a verified email that matches another `auth.users` row. A single transaction that re-validates the link, reassigns all `plan_*` rows, and deletes the source user (cascading into `auth.identities`):

```sql
CREATE OR REPLACE FUNCTION merge_auth_users(
  p_source UUID,        -- the user being merged away
  p_target UUID,        -- the user being kept
  p_actor  UUID         -- must equal p_target; the user authorizing the merge
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_moved_plans INT;
  v_moved_access INT;
BEGIN
  IF p_actor <> p_target THEN
    RAISE EXCEPTION 'merge_auth_users: actor must equal target';
  END IF;

  -- Re-validate: target's email must be verified AND must match source's email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_target
      AND email_confirmed_at IS NOT NULL
      AND email = (SELECT email FROM auth.users WHERE id = p_source)
  ) THEN
    RAISE EXCEPTION 'merge_auth_users: target email unverified or does not match source';
  END IF;

  -- Reassign plan ownership
  UPDATE plan_meta     SET owner_id  = p_target WHERE owner_id  = p_source;
  GET DIAGNOSTICS v_moved_plans = ROW_COUNT;

  -- Reassign collaboration rows
  UPDATE plan_access   SET user_id   = p_target WHERE user_id   = p_source;
  GET DIAGNOSTICS v_moved_access = ROW_COUNT;

  -- Update profile denormalized columns to point at the target (trigger catches
  -- subsequent identity changes, but for the merge itself we want immediate).
  DELETE FROM profiles WHERE id = p_source;  -- FK cascade handles anything we missed

  -- Delete the source auth.users row; auth.identities cascades via FK
  DELETE FROM auth.users WHERE id = p_source;

  RETURN jsonb_build_object(
    'moved_plans',   v_moved_plans,
    'moved_access',  v_moved_access
  );
END;
$$;
```

#### 17.7.4 The `claim_legacy_plans` RPC (MitPlan v1 plan claim)

Called by `/v1/auth/claim` after the user confirms the "Claim your v1 plans" UI. Sets `claimed_by = p_user` and `claimed_at = now()` on the matching legacy rows; the corresponding `plan_meta` rows are inserted owned by the real user.

```sql
CREATE OR REPLACE FUNCTION claim_legacy_plans(
  p_user     UUID,
  p_plan_ids UUID[]
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH claimed AS (
    UPDATE legacy_local_plans
    SET claimed_by = p_user, claimed_at = now()
    WHERE id = ANY(p_plan_ids)
      AND claimed_by IS NULL
    RETURNING id, payload
  ),
  inserted AS (
    INSERT INTO plan_meta (id, owner_id, name, mode, is_legacy, created_at)
    SELECT
      c.id,
      p_user,
      COALESCE(c.payload->>'name', 'Imported plan'),
      'CURRENT',
      TRUE,
      COALESCE((c.payload->>'createdAt')::timestamptz, now())
    FROM claimed c
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;
```

#### 17.7.5 The `flip_expired_legacy_plans` function and the 90-day auto-flip

Runs nightly via `pg_cron` at 03:17 UTC (off the cron-hour-rounder for a low-traffic window). Materializes any unclaimed plan older than 90 days into a read-only `plan_meta` row owned by the system user, then deletes the legacy row. Idempotent. The system user has `id = '00000000-0000-0000-0000-000000000000'`, `email = 'system@xivmitplan.local'`, `encrypted_password = NULL`, and no login capability.

```sql
CREATE OR REPLACE FUNCTION flip_expired_legacy_plans()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sys_user UUID := '00000000-0000-0000-0000-000000000000';
  v_count  INTEGER;
BEGIN
  WITH expired AS (
    SELECT id, payload
    FROM legacy_local_plans
    WHERE claimed_by IS NULL
      AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  ),
  inserted AS (
    INSERT INTO plan_meta (id, owner_id, name, mode, is_legacy, created_at)
    SELECT
      e.id,
      sys_user,
      COALESCE(e.payload->>'name', 'Imported plan'),
      'CURRENT',
      TRUE,
      COALESCE((e.payload->>'createdAt')::timestamptz, now())
    FROM expired e
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ),
  snapshotted AS (
    INSERT INTO ydoc_snapshots (plan_id, update, byte_size, created_at, updated_at)
    SELECT i.id,
           decode(e.payload->>'ydoc_b64', 'base64'),
           COALESCE((e.payload->>'ydoc_byte_size')::int, 0),
           now(),
           now()
    FROM inserted i
    JOIN expired e ON e.id = i.id
    ON CONFLICT (plan_id) DO NOTHING
  )
  DELETE FROM legacy_local_plans
  WHERE id IN (SELECT id FROM expired);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Schedule for 03:17 UTC nightly
SELECT cron.schedule(
  'flip-expired-legacy-plans',
  '17 3 * * *',
  $$ SELECT flip_expired_legacy_plans(); $$
);
```

The 90-day clock starts at `captured_at`, not at sign-in — a user who has been sitting on a v1 plan for 3 years gets the full 90 days from when the migration scan first captured the plan, not 90 days from whenever they happen to sign in. The full RLS policies (including the read-only policies for system-user-owned legacy plans) are in Appendix D.

### 17.8 Migrations

Unchanged from the 2026-06-05 draft §17.7. Drizzle migrations are plain SQL files in `packages/persistence/migrations/`. Forward-only; corrections are new migrations. CI runs `drizzle-kit migrate` against staging, then production. The new `legacy_local_plans`, `ydoc_snapshots`, and profile-column changes are added in migration `20260606_xivmitplan_auth_v1.sql`.

---

## 18. API Design

### 18.1 Public REST/RPC surface (Hono on Cloudflare Workers)

Unchanged from the 2026-06-05 draft §18.1. RPC-first via tRPC, with a thin REST shim for non-TS clients. Schema-first via Zod. The `protectedProcedure` middleware validates the Supabase Auth JWT.

### 18.2 Public REST

```
GET  /v1/encounters
GET  /v1/encounters/:id
GET  /v1/encounters/:id/timeline?version=
GET  /v1/abilities?jobId=&mode=
POST /v1/plans/:id/snapshot
POST /v1/timelines/ingest/cactbot         # new in v1; body: { url, encounterId }
POST /v1/timelines/ingest/triggernometry  # new in v1; body: { xml, encounterId }
POST /v1/timelines/ingest/fflogs          # new in v1; body: { reportCode, encounterId }
```

Each route serves an OpenAPI-generated JSON Schema at `/v1/openapi.json`.

### 18.3 Real-time WebSocket (Hocuspocus on Cloudflare DO)

**Modified from the 2026-06-05 draft §18.3.** The endpoint is the same (`wss://realtime.xivmitplan.app/plans/:planId`), but the server is a DO, not a self-hosted Node process. The auth is JWT, validated inside the DO (§14.4).

```
GET wss://realtime.xivmitplan.app/plans/:planId  (Upgrade: websocket)
Headers:
  Authorization: Bearer <supabase-jwt>
  X-Plan-Access-Token: <share-link-token>  # optional, for share-link users
```

### 18.4 (Removed) ACT ingest

The ACT ingest WebSocket endpoint from the 2026-06-05 draft §18.4 is removed. Deferred to v2.

### 18.5 Auth endpoints (new in v1)

```
GET  /v1/auth/discord/callback   # Discord OAuth callback
GET  /v1/auth/me                 # current session
POST /v1/auth/signout            # sign out
POST /v1/auth/claim-mitplan-v1   # first-sign-in migration: claim v1 plans associated with the user's Discord ID or email
POST /v1/plans/:id/share         # mint a share-link token (read or edit)
```

The `claim-mitplan-v1` endpoint looks up MitPlan v1 plans by Discord ID (or email, for email/password users). The v1 MitPlan data is in a read-only Supabase schema (replicated once during §22.7 cutover). The endpoint returns the list of claimable plans; the user confirms via a UI modal; the `plan_meta.owner_id` is updated to the new Supabase user.

### 18.6 Schema-first contracts

Unchanged from the 2026-06-05 draft §18.5. All schemas live in `packages/validation/`. They are the single source of truth for: HTTP request/response shapes, Yjs document field types, FFLogs/Triggernometry parser input validation, and Drizzle insert/select types (via `drizzle-zod`).

---

## 19. FFXIV 8.0 Adaptation Strategy

### 19.1 What 8.0 changes

Re-verified 2026-06-14 against the Apr 24 2026 NA Fan Fest keynote, the dev panel summary, the official `na.finalfantasyxiv.com/evercold/` landing page, and the Square Enix Fan Fest 2026 announcement.

- **Launch:** January 2027 (Evercold expansion). Confirmed by SE, MMORPG.com keynote summary, Game Informer, Reddit/BlueGartr threads. No deviation announced.
- **Fan Fest dates:** Anaheim Apr 24-25 2026 (past), **Berlin Jul 25-26 2026**, **Tokyo Oct 31 – Nov 1 2026** (the event spans into November — corrected from the doc's "October 2026" line).
- **Level cap:** **100 → 110.** Confirmed on the official landing page.
- **Two new jobs:** one Tank, one Physical Ranged DPS, **original to FFXIV** (not ported from FF1-FF6). **Evolved-mode-only** — they do not exist in Reborn mode.
- **Reborn / Evolved modes for all 21 existing jobs.** Reborn mode is "based on the current 7.x combat system"; Evolved mode emphasizes job identity and uses a **16-action hotbar with context-sensitive consolidation** (a "single-button approach" to action consolidation, per the dev panel). The 2-minute burst meta is being deprecated.
- **Removed abilities in Evolved mode (WHM as worked example):** Cure III, Asylum, Dia. Other jobs have parallel removals; the Icy-Veins 2026-04-26 Evolved-mode guide lists them job-by-job.
- **New content:** new alliance raid "EVANGELION - Ghosts of Desire", new raid series, new Ultimate. Possible new 3rd raid difficulty is unconfirmed.
- **Platforms:** PS5, PS4, Xbox Series X|S, Nintendo Switch 2, Windows, Mac, Steam. All confirmed.
- **Game design direction:** Evolved mode is the balancing target for new content; Reborn mode is a legacy/compat option. The planner must surface this asymmetry.

### 19.2 How the data model absorbs these

**Updated 2026-06-14 to make `(jobId, abilityId, mode)` a first-class composite key** — the `mode` column on `abilities` is on the right track but is no longer sufficient because the same conceptual action can have different potency, recast, and range in Reborn vs Evolved mode. A Reborn-mode plan opened in Evolved mode must surface a "this assignment is in a different mode" warning, not silently drop it.

```sql
-- The composite key: a given abilityId can have multiple rows, one per mode.
CREATE TABLE abilities (
  id              UUID PRIMARY KEY,
  job_id          UUID NOT NULL REFERENCES jobs(id),
  ability_id      TEXT NOT NULL,                    -- the game-data ID, stable across patches
  mode            mode_enum NOT NULL,                -- 'REBORN' | 'EVOLVED' | 'CURRENT' | 'ALL'
  name            TEXT NOT NULL,
  -- ... existing fields (potency, recast_s, range_m, effect_pct, ...)
  effective_from  patch_version NOT NULL,
  effective_to    patch_version,                     -- null = current
  UNIQUE (job_id, ability_id, mode)
);
CREATE INDEX ON abilities (job_id, mode);

-- Cross-mode equivalence map for "the same action in another mode"
CREATE TABLE ability_equivalence (
  src_ability_id  UUID NOT NULL REFERENCES abilities(id),
  dst_ability_id  UUID NOT NULL REFERENCES abilities(id),
  relation        TEXT NOT NULL CHECK (relation IN ('EQUIVALENT','CONSOLIDATED','REMOVED','ADDED')),
  note            TEXT,
  PRIMARY KEY (src_ability_id, dst_ability_id)
);
```

The `mode` column on `plan_meta` and the `effectiveFrom` / `effectiveTo` columns on `abilities` and `encounters` are unchanged.

**v1.0 ships in 7.x CURRENT mode only.** The UI toggle is v1.1. The data model is ready.

### 19.3 The data-update pipeline on patch day

**Modified from the 2026-06-05 draft §19.3; re-specified 2026-06-14.** The Live-mode assumption in step 4 is removed; the cross-mode impact computation in step 4b is new.

1. **Data team ingests** the dat-mined `Action.json` from xivapi (fallback: SaintCoinach raw datamine if xivapi is unavailable on patch day; xivapi's SLA is best-effort). Diff against the current `abilities` table; new/changed rows are written.
2. **`tools/migrate-data`** validates the new abilities against the schema, computes `ability_equivalence` mappings for renamed or consolidated abilities, and emits a changelog.
3. **CI deploys** the new data. The new rows are immediately available to the planner.
4. **Existing plans** are re-validated by the `revalidate-plans` background job. Plans that reference removed abilities get a static "This ability has been updated in patch X.Y" badge on the assignment card. (The "patch-update banner" with the "convert to Reborn" CTA is v1.1.)
4b. **(New in 2026-06-14 review)** The revalidation job also computes per-mode impact: which plans in the user's history reference a Reborn-only ability that does not exist in Evolved mode, and vice versa. The plan card surfaces a "this plan was authored in [mode]; switch to [mode] to see all assignments" affordance.
5. **The reference catalog** has `effectiveFrom` / `effectiveTo` columns, so historical plans continue to render correctly with the abilities they were authored with.

The pipeline is exercised in staging on the JP patch-day data (1-2 hours before EN). This is the same cadence used for 7.x patches.

---

## 20. Testing Strategy

### 20.1 Unit tests (Vitest)

Unchanged from the 2026-06-05 draft §20.1. Coverage: 90% on `packages/domain/`, 80% on `packages/persistence/`, 70% on `apps/`. Focus: pure functions in `domain/math/`, all parsers (Cactbot, Triggernometry, FFLogs), all validators, the merger, the MitStackEvaluator. Strict ban on `vi.mock()` for domain code. Property-based testing with `fast-check`.

### 20.2 Integration tests (Vitest + Testcontainers)

**Modified from the 2026-06-05 draft §20.2.** Database: Testcontainers spins up real Postgres. Redis: same pattern. FFLogs sync: `msw` (Mock Service Worker) GraphQL handler with fixture responses. **ACT ingester integration tests are dropped** (no ACT ingester in v1). **FFLogs GraphQL contract tests are added** (the Triggernometry + FFLogs research report recommended a Pact contract with FFLogs; the v1 test surface includes a recorded FFLogs response fixture).

### 20.3 Concurrent-edit stress tests

**New section in v1.** The gap analysis §2.1 G12 noted that the 2026-06-05 draft's NFR-11 "zero data-loss conflicts" was not testable from outside the system. v1 includes a dedicated stress-test suite:

- **Setup:** spawn N (default: 4, max: 16) headless Yjs clients, each with a random seed, applying random edits to the same `PlanDoc` for 60 seconds.
- **Assertion:** after all clients converge, the merged doc must satisfy the Zod schema for the plan structure. All assignments must be present. No two assignments may have the same `(abilityId, targetUserId, eventId)` triple *except* the ones explicitly marked as double-booking test cases.
- **Coverage:** 100+ scenarios: simultaneous drag-drop, simultaneous delete-create, simultaneous tank-swap, simultaneous reconnect.
- **CI:** runs nightly against the staging DO deployment (not the dev DO; we want the same code path that production uses). A regression fails the build.

### 20.4 Contract tests (Pact or hand-rolled)

Unchanged from the 2026-06-05 draft §20.3. Consumer-driven contracts between `apps/server` and `apps/web` are pinned. The FFLogs GraphQL contract is pinned; CI replays against a recorded response.

### 20.5 Fuzz tests (for parsers)

Unchanged from the 2026-06-05 draft §20.4. Fuzz the Cactbot parser, the Triggernometry parser (new in v1), the FFLogs parser (new in v1). Fuzz the Yjs plan doc with random concurrent edits (overlaps with §20.3 but uses a different harness — quick-check, not Playwright).

### 20.6 End-to-end tests (Playwright)

**Modified from the 2026-06-05 draft §20.5.** Critical paths: sign in with Discord, create plan, drag a mitigation, see another user's edit, save version, revert. **The "see the live timeline advance" path is dropped** (no live mode). Visual regression: Playwright snapshots the timeline, the mitigations panel, and the sign-in flow.

### 20.7 The reference fixture library

Unchanged from the 2026-06-05 draft §20.6. A `data/fixtures/` directory holds: real Cactbot timeline files for tier 1 of the current patch; recorded Triggernometry exports (new in v1) for the same fights; recorded FFLogs report fixtures (new in v1) for the same fights; authored "expected" timeline graphs; hand-curated ability cards.

---

## 21. Deployment, Observability and Cost

### 21.1 Environments

| Env | Purpose | Infra |
|---|---|---|
| **dev** | Local dev | `wrangler dev` for Workers + DOs, `supabase start` for Postgres, `redis-cli` for Upstash |
| **ci** | PR checks | GitHub Actions, ephemeral |
| **staging** | Pre-prod | Cloudflare (Workers + DOs), Supabase Postgres (staging project), Upstash Redis (staging) |
| **prod** | Live | Cloudflare (Workers + DOs), Supabase Postgres, Upstash Redis |

### 21.2 The decision: Cloudflare + Supabase

Unchanged from the 2026-06-05 draft §21.2, with the v1 cuts applied. Hocuspocus on Cloudflare DO, one DO per plan. Hibernation API keeps idle rooms at near-zero cost. Supabase Postgres for plans, snapshots, reference catalog, profiles. Upstash Redis for the ability catalog cache and the Yjs-snapshot debounce set.

### 21.3 Observability

Unchanged from the 2026-06-05 draft §21.3. Pino → Workers Tail → Logpush → ClickHouse. Workers Analytics Engine. Honeycomb for OTel traces. Sentry for errors. Synthetic checks: a Playwright test runs every 5 minutes against staging.

### 21.4 Cost model (recomputed for v1, re-verified 2026-06-14)

The 2026-06-05 draft §21.4 had a "DO wall-time" line for ACT sessions that existed only because of Live mode. The 2026-06-14 re-verification recomputed the model against current Cloudflare/Supabase/Upstash pricing and added a column for the PITR add-on decision.

| User scale | Workers Paid | DO (req + duration + storage) | Supabase | Upstash Redis | R2 | **Total** |
|---|---|---|---|---|---|---|
| 100 users, 5 active statics | $0 (Free) | $0 (Free, hibernated) | $0 (Free) | $0 (500K cmds/mo) | $0 | **$0-1/mo** |
| 1,000 users, 50 active statics | $5 | $5-15 | Pro $25 | $0-2 | $0 | **$35-47/mo** |
| 10,000 users, 500 active statics | $5-8 | $80-150 | Pro $25 + PITR $100 (or R2 cron) | $5-15 | $3-4 | **$220-355/mo** |

**Line-item notes (2026-06-14):**

- **Workers Paid ($5/mo)** is required at **~100-300 active plans**, not 100K req/day, because DO request volume + API volume exceed 100K/day well before 1K users. The 1K-user tier is past this threshold.
- **DO billing for hibernated rooms is zero for duration.** Idle, hibernation-eligible DOs are not billed (Cloudflare DO pricing page, verified 2026-06-14). Wake-up cost = 1 request charge (1M/month free, then $0.15/M) + brief 128MB GB-s during the 150-400ms cold start. At our scale, the request charge is rounding error.
- **SQLite-backed DOs became free-tier-eligible** on 2025-04-07. v1's Hocuspocus DOs use SQLite (`migrations: new_sqlite_classes`) and CAN run on the Workers Free plan under 100K req/day, but the request cap is the binding constraint at the 1K-active-plan mark.
- **DO storage billing began 2026-01-07.** At 1K active plans, our Yjs snapshots (avg 200KB each) cost < 1GB total → still free. At 10K plans, ~2GB → still free. The cost cliff is at ~5GB of stored Yjs data.
- **Supabase Pro ($25/mo)** is **required at the 100-user tier** because of NFR-14 (RPO 15 min). Pro includes 100K MAU, 8GB disk, 250GB egress. PITR (point-in-time recovery) is **NOT** included in Pro — it is a $100/mo add-on for a 7-day PITR window. The v1 NFR-14 can be met by either paying for the add-on at the 10K tier or running a 15-min cron snapshot to R2 for free. The **v1 decision** (locked 2026-06-14): **use the R2-cron approach at all tiers**. It is sufficient for RPO 15 min, free, and the R2 cost stays trivial.
- **Upstash Redis free tier** was changed in March 2025 from 10K cmds/day to **500K cmds/month**. The 1K-user tier stays at $0-2/mo (the ability-catalog cache + Yjs debounce set fit comfortably). Cloudflare Workers KV could replace Upstash for the catalog cache alone, but cannot replace the debounce set (no native SET/SADD semantics in KV). Keep Upstash for v1.
- **R2 free tier** (10GB, 1M Class A, 10M Class B, free egress) handles v1 backups. At 10K users with a 8GB Supabase DB, we are over 10GB R2 storage and start paying $0.015/GB-month. Trivial.

**Honest read:** v1 at 1K users is **$35-47/mo**, comfortably under the NFR-13 target of < $50/mo. The gap analysis §1.1 decision 4 to pay 2× the $5-VPS cost is still the right call because:

1. **Operational simplicity.** No 3am pager for a Hocuspocus VPS that OOMed. The DO is managed; Cloudflare handles restarts, migrations, and capacity.
2. **Per-plan isolation.** A bad plan cannot exhaust another plan's resources. Blast radius is one plan.
3. **Documented migration path.** If DO on Hocuspocus turns out to be too young (the research report's risk #1), we can fall back to a $5 VPS Hocuspocus in 1 week: the `PlanDocument` interface is the only place that knows Yjs is the CRDT, and `apps/realtime` is one Worker to replace with a Node process. The rollback cost is bounded.
4. **Sub-50ms global latency.** A $5 VPS in `us-east-1` is fast for North American users and slow for everyone else. DO is global by default. The FFXIV community is meaningfully international (JP, NA, EU).

### 21.5 Deploy pipeline

Unchanged from the 2026-06-05 draft §21.5. CI on every PR: typecheck, unit, integration, contract, lint, stress test (§20.3). CD on merge to `main`: deploy web to Cloudflare Pages, deploy server to Workers, deploy realtime to DOs. Database migrations run via `drizzle-kit migrate` against staging, then production. Patch-day deploy: manual trigger, 30-min observation window.

### 21.6 Disaster recovery

Unchanged from the 2026-06-05 draft §21.6. Postgres: Supabase Pro PITR (7 days) + nightly snapshot to R2. (R2 for backups is fine; R2 for ACT logs is the v2 add.) DOs: state is rebuilt from Postgres on eviction. RTO: 1 hour. RPO: 15 minutes.

---

## 22. Concrete migration plan (36-week build-from-scratch schedule)

**The 2026-06-06 version of this section was a week-bucket plan. The 2026-06-14 version adds owners, explicit acceptance criteria, and checkboxes** so the team can track each work item. The schedule is **Mon 2026-06-15 → Sun 2027-02-22** (36 weeks; aligns with the FFXIV 8.0 launch in Jan 2027 and a 4-week post-launch hardening window).

Owner codes (used in the rows below):
- **ARC** = Architecture lead (1 person; cross-cutting)
- **BE** = Backend lead (1 person; server + realtime + persistence)
- **FE** = Frontend lead (1 person; web)
- **DATA** = Data team (1 person; reference catalog + parsers + ingest)
- **SRE** = Site reliability (0.5 FTE; deploy + monitoring + DO ops)
- **QA** = QA lead (0.5 FTE; test infra + E2E + stress test)
- **PM** = Product manager (0.5 FTE; cutover + comms)

Staffing: 3.5 engineers + 0.5 SRE + 0.5 QA + 0.5 PM = 5.0 FTE. The free-first stack (§21) means infra cost is $0-1/mo during dev and $35-47/mo at the 1K-user GA target.

### 22.1 Week 0 (Mon 2026-06-15 → Sun 2026-06-21): Lock + freeze

The lock pass. Everything here is "the architecture is now build-from."

- [ ] **ARC**: Sign the v1.0 architecture lock (this document, 2026-06-14).
- [ ] **ARC**: Move the old `2026-06-06-hearthstone-v1-architecture-locked.md` to `docs/archive/` for the historical record.
- [ ] **ARC**: Create the new GitHub repo `github.com/MarbleSodas/xivmitplan` and a matching Discord channel.
- [ ] **BE**: `pnpm init` + `pnpm-workspace.yaml` (catalog: section per §1.5) + `turbo.json` (build/dev/test/lint/typecheck pipeline) + `tsconfig.base.json` + `.editorconfig` + `.gitignore`.
- [ ] **BE**: Empty `apps/{web,server,realtime}` and `packages/{domain,persistence,crdt,validation,shared}` directories with placeholder `package.json` each.
- [ ] **BE**: GitHub Actions: `ci.yml` runs `pnpm install` + `pnpm -r typecheck` + `pnpm -r test` on every PR.
- [ ] **ARC**: Freeze MitPlan v1 at git tag `v1-lts`. Open a `v1-lts` branch for backports. Announce on the MitPlan v1 Discord that bug fixes are accepted, new features are not.
- [ ] **PM**: Kickoff meeting with the 5.0 FTE team. Lock the 36-week schedule.

**Acceptance:** `pnpm -r typecheck` and `pnpm -r test` pass on an empty workspace, and CI is green on the initial commit.

### 22.2 Weeks 1-4 (Mon 2026-06-22 → Sun 2026-07-19): Phase 0 — Foundation

Accounts, schemas, the Realtime DO.

- [ ] **SRE**: Create Cloudflare account; activate Workers Paid ($5/mo) and DO quotas for the staging + prod accounts. Create Upstash Redis (free tier) for staging + prod. Create Cloudflare R2 bucket for backups (`xivmitplan-backups-prod`).
- [ ] **BE**: Create Supabase project for staging and prod. Apply the §17.1 Drizzle migration (abilities, jobs, roles, encounters, expansions, raids). Apply the §17.3 RLS policies.
- [ ] **DATA**: One-shot migration of MitPlan v1's reference catalog from `src/data/abilities/mitigationAbilities.ts` (and friends) into the Supabase staging `abilities` table. Byte-for-byte assertion in CI.
- [ ] **BE**: Apply the §17.5 `profiles`, §17.7.1 `legacy_local_plans`, and §17.7.2 `ydoc_snapshots` migrations. Apply the §17.7.3 `merge_auth_users` and §17.7.4 `claim_legacy_plans` RPCs.
- [ ] **BE**: Apply the §17.7.5 `flip_expired_legacy_plans` function and the 03:17 UTC nightly `pg_cron` schedule.
- [ ] **BE**: Apply the §19.2 `(jobId, abilityId, mode)` composite-key migration on `abilities` (the v1.0-ready schema, even though v1.0 only ships in CURRENT mode).
- [ ] **BE**: Enable Supabase Auth providers: Discord OAuth, Google OAuth, email/password, magic link. Register the Discord app + Google OAuth client (owner: ARC for sign-off). Configure redirect URIs for staging and prod.
- [ ] **BE**: Register the FFLogs OAuth app and configure redirect URIs.
- [ ] **BE**: Scaffold `apps/realtime` per §14.6.2-§14.6.4. Implement `apps/realtime/src/server.ts` with the `PartyRoom` class. Implement `apps/realtime/src/auth.ts` with `verifySupabaseJwt(token)`. Wire `wrangler secret put` for the 4 secrets from §14.6.6.
- [ ] **BE**: Deploy `apps/realtime` to Cloudflare. Verify in the dashboard that the `PartyRoom` DO is created on first connection.
- [ ] **QA**: Write the first Playwright smoke test (two browser contexts, both sign in via Discord OAuth in staging, both join `plan:smoke-1`, user-A types, assert user-B sees the change in < 200ms p95 over 50 runs).
- [ ] **SRE**: Wire up Cloudflare Workers Tail → Logpush → ClickHouse. Set up Sentry on the web client and the DO. Set up Honeycomb OTel.
- [ ] **ARC**: First architecture review at the end of week 4. Lock decisions: (a) keep the v4.2.0 Hocuspocus pin, (b) keep the §14.6.9 $5-VPS fallback in the playbook.

**Acceptance:** Supabase staging project has the full reference catalog, the RLS policies, and the 5 auth providers enabled. The empty `apps/realtime` Hocuspocus-on-DO is deployed and accepts a WebSocket connection. `wrangler tail` shows `acceptWebSocket` for `room=smoke-1` and a row appears in `ydoc_snapshots` on `onSave`. The Playwright smoke test passes in CI.

### 22.3 Weeks 5-10 (Mon 2026-07-20 → Sun 2026-08-30): Phase 1 — Read-only viewer

Learn mode is live on one encounter.

- [ ] **FE**: Scaffold `apps/web` (React 19 + Vite + TypeScript + React Router 7). Routes: `/`, `/learn`, `/learn/:encounterId`, `/auth/callback`, `/plan`. Local copy of `@xivmitplan/domain` ports in `apps/web/src/domain/`.
- [ ] **FE**: Implement the encounter browser (`learn._index.tsx`) with the cached `/v1/encounters` tRPC query. Cached at the CDN (Cloudflare Pages).
- [ ] **FE**: Implement `learn.$encounterId.tsx` (read-only timeline view). The interactive DnD components are NOT in scope this phase.
- [ ] **FE**: Implement the sign-in flow: `auth.callback.tsx` does PKCE exchange, calls `linkIfPossible(session)` (per §7.7.4), and redirects to `?next=`. Banner on the Login page for Discord outage (§7.7.6).
- [ ] **DATA**: Cactbot parser end-to-end on FRU P1. Golden output snapshot committed. Parser runs in CI as an integration test.
- [ ] **DATA**: Triggernometry parser for FRU P1. Golden output committed. Integration test in CI.
- [ ] **DATA**: FFLogs parser for FRU P1. Golden output committed. Integration test in CI.
- [ ] **DATA**: Implement the §12.3 `TimelineMerger` and the §12.5 `TimelineIngestionService` orchestrator. Cactbot + Triggernometry + FFLogs merged for FRU P1 with per-event confidence.
- [ ] **DATA**: Set up the Cactbot poll job (every 6h), the Triggernometry poll job (every 24h), the FFLogs ingest job (every 1h, throttled to 1 report/min).
- [ ] **SRE**: Wire the BullMQ-on-Upstash cron. (The free-first stack recommends Cloudflare Cron Triggers; the locked v1 chose BullMQ. The Cron-Triggers swap is a 2-day refactor deferred to v1.1 if needed.)
- [ ] **QA**: Fuzz-test the three parsers (Cactbot, Triggernometry, FFLogs) with `fast-check` — 1000 random mutations per parser, expect graceful error.
- [ ] **PM**: Add 5 FFXIV raiders from the MitPlan v1 Discord to a private beta; collect UX feedback on the encounter browser.

**Acceptance:** Learn mode shows the encounter browser, the FRU P1 timeline is rendered with a "this timeline was built from Cactbot + Triggernometry + FFLogs" badge, and the three parsers pass their golden-snapshot tests in CI. p95 page load < 1s (NFR-7).

### 22.4 Weeks 11-18 (Mon 2026-08-31 → Sun 2026-10-25): Phase 2 — Edit migration

Plan mode is live with one timeline source.

- [ ] **BE**: Implement `DrizzlePlanService` (snapshots + meta). Implement `YjsPlanDocumentFactory` (Yjs doc per plan, hydrated from the latest Postgres snapshot on load).
- [ ] **BE**: Wire `apps/server` (Hono on Cloudflare Workers). tRPC router + REST shim per §18.1. `protectedProcedure` middleware validates the Supabase Auth JWT.
- [ ] **FE**: Implement `plan.$planId.tsx`. Wire `YPartyKitProvider` per §14.6.5. The 150-400ms cold-start "Reconnecting…" toast per §14.6.7 Guardrail 2.
- [ ] **FE**: Implement the mit palette (left pane), the timeline (center pane, `dnd-timeline` v3.1.1 + visx 4.0.0 axis), and the tank-state panel (right pane). Two drag contexts: palette → event card (dnd-kit), event card → event card in linear view (`useTimelineDnd`).
- [ ] **FE**: Implement the `MultiplicativeMitStackEvaluator` from `packages/domain/math/`. Property-based test with `fast-check` (100+ scenarios). UI shows mit stack as a horizontal bar; residual damage percentage updates live.
- [ ] **FE**: Implement conflict detection: double-booking the same `(abilityId, targetUserId, eventId)` shows a banner ("H1 and H2 both assigned Reprisal at 1:30. Resolve?").
- [ ] **FE**: JSON import/export with Zod validation per §18.1.
- [ ] **FE**: Share-link token redemption. The `/v1/plans/:id/share` endpoint mints a `plan_access` JWT; the read-only link `/plan/:id?token=...` renders the plan via the DO with the token's claims.
- [ ] **FE**: Sign-in-to-first-plan-creation time measured end-to-end (NFR-A1: < 30s). The Discord OAuth button → first drag is a 1-click flow.
- [ ] **BE**: Wire the `onAuthenticationFailed` reconnect path per §14.6.5 (mid-session-expiry).
- [ ] **BE**: Wire the §14.6.7 step 14 `graceful_drain` script for deploys.
- [ ] **QA**: Snapshot-rebuild policy test: synthesize a Yjs doc with > 2MB encoded state, verify the §14.5 rebuild path produces a `PlanSnapshotArchive` row.

**Acceptance:** A signed-in user can sign in with Discord, create a plan for FRU P1, drag a mit onto an event, save a snapshot, and share a read-only link. p95 edit sync < 200ms (NFR-1) verified over 50 runs in the Playwright smoke test. The §20.3 stress-test suite (4 headless clients × 60s random edits) passes with 0 schema violations and 0 unexpected (non-double-booked) conflicts.

### 22.5 Weeks 19-26 (Mon 2026-10-26 → Sun 2026-12-20): Phase 3 — Ingestion complete

All three sources wired into the plan editor UI.

- [ ] **FE**: Per-event confidence badges in the Plan mode UI. Each timeline event has a small dot colored by `confidence` (green ≥ 0.8, yellow 0.5-0.8, red < 0.5). Click → source-by-source breakdown.
- [ ] **FE**: "Merged from N sources" badge on each event with the source-list.
- [ ] **DATA**: Exercise the `mergeAndPersist` orchestrator in staging on three encounters (FRU P1, M1S, M2S) with all three sources. Document the per-encounter `varianceMs` spread.
- [ ] **BE**: Wire the §12.5 orchestrator's idempotency (re-running with the same input is a no-op, NFR-14).
- [ ] **QA**: Commit the §20.3 stress-test suite. Wire it into CI as a nightly run against the staging DO deployment (not the dev DO; we want the same code path that production uses).
- [ ] **PM**: Public beta opens to 50 selected MitPlan v1 users. Track: p95 edit sync, sign-in-to-first-plan time, mit drag count per session.
- [ ] **ARC**: Mid-project architecture review at the end of week 26. Re-verify: (a) Hocuspocus v4 still pinned to a specific version, (b) the 5K-user success metric on track (we are at < 100 users at this point; this is a directional check, not a hard gate).

**Acceptance:** Every event in a plan has a confidence badge. The stress-test suite passes nightly. The public beta reports p95 edit sync < 200ms and median plan-construction time < 20 min (NFR-3). Activation drop from account-required is < 30% in the first 60 days of beta (the §23.2 risk).

### 22.6 Weeks 27-32 (Mon 2026-12-21 → Sun 2027-02-07): Phase 4 — Patch-day hardening + 8.0 readiness

- [ ] **DATA**: Ingest the 8.0 data from xivapi (post Tokyo Fan Fest Oct 31 – Nov 1 2026). Add the two new jobs (Tank + Physical Ranged DPS, Evolved-only) as rows. Add the `(jobId, abilityId, mode)` rows for the Evolved mode abilities per the §19.2 composite key. Add the `ability_equivalence` rows for the Reborn → Evolved consolidations.
- [ ] **DATA**: The patch-day `revalidate-plans` job runs on every push to `data/abilities/`. Plans that reference removed abilities get a static "This ability has been updated in patch X.Y" badge. (The "patch-update banner" with "convert to Reborn" CTA is v1.1.)
- [ ] **DATA**: The revalidation job's step 4b (per-mode impact computation) is implemented. Plans authored in Reborn mode that reference Evolved-only abilities get a "this plan was authored in [mode]; switch to [mode] to see all assignments" affordance.
- [ ] **FE**: MitPlan v1 plan-import flow (per-plan URL import). Tested against the full set of MitPlan v1 plans during weeks 28-30.
- [ ] **BE**: The §17.7.5 `flip_expired_legacy_plans` runs nightly during the 90-day window; verified via a synthetic test that injects an expired row.
- [ ] **SRE**: Patch-day staging exercise (run on the JP patch-day data 1-2 hours before EN). Document the timeline in §19.3.
- [ ] **ARC**: Final architecture review at the end of week 32. Lock the v1.0 GA build.

**Acceptance:** v1.0 is buildable and deployable in CURRENT mode with the 8.0 data ingested. The data model is ready for the v1.1 mode toggle. The MitPlan v1 plan-import flow handles 100% of the existing MitPlan v1 plans. The 90-day legacy-flip clock is running.

### 22.7 Weeks 33-36 (Mon 2027-02-08 → Sun 2027-03-07): Phase 5 — Cutover + GA

- [ ] **PM**: DNS cutover from `xivmit.com` to `app.xivmit.com` (or the final hostname — TBD by PM in week 30). Set the `xivmit.com` A record to a Cloudflare Pages redirect with a banner pointing to the new tool.
- [ ] **ARC**: Archive MitPlan v1 codebase (tag `v1-lts` is the cut point; move the working tree to a frozen branch). Preserve the Firebase RTDB data indefinitely.
- [ ] **PM**: Account migration flow for anonymous users: on first sign-in, the `claim-mitplan-v1` endpoint looks up v1 plans by Discord ID or email. The user is prompted to claim them. The `plan_meta.owner_id` is updated via the `claim_legacy_plans` RPC.
- [ ] **SRE**: 30-min observation window after cutover. Watch Hocuspocus connection counts, Supabase latency, Redis command rate, Workers Tail errors. Page on any error.
- [ ] **PM**: Announce the cutover on the MitPlan v1 Discord, the /r/ffxiv Discord, the Balance, and any FFXIV strategy Discords. Direct-link to the new tool.
- [ ] **ARC**: v1.0 GA release notes published. v1.1 backlog (mode toggle, passkeys, ACT event markers) prioritized and gated on the §23 metrics.

**Acceptance:** XIVMitPlan is the live tool at the new hostname. MitPlan v1 is the read-only archive with a banner pointing to the new tool. p95 edit sync < 200ms in production. The §1.3 success-metric telemetry is on (5K users, 500 weekly active plans, 100 daily active statics, etc.). The 12-month clock for the success-metric check starts here.

### 22.8 Weeks 37+ (Mon 2027-03-08+): Post-launch operation

- [ ] **SRE**: Operate v1. Page on the SLOs in §21.3 (synthetic checks every 5min, error rate, latency).
- [ ] **ARC**: Track the v2 trigger metrics from §23.3. The "Live mode" v2.0 trigger (>1,000 weekly active plans for 2 consecutive months + >20% survey demand + a major static request) is the next architectural decision.
- [ ] **PM**: Monthly user-research sync. Activation rate, mit-construction time, p95 latency, error rate.
- [ ] **DATA**: Patch-day revalidation runs on every xivapi ingest. The 8.0 cycle runs every 6-8 weeks; the cadence is the same as 7.x.

### 22.9 Risk mitigation during migration

- [ ] **The new monorepo is initialized empty.** No code is migrated from MitPlan v1. The untracked files in the MitPlan v1 working tree inform the XIVMitPlan design but are not the basis for XIVMitPlan code.
- [ ] **The Firebase RTDB data is preserved indefinitely.** The v1-plan-import button in the XIVMitPlan UI imports an old plan by URL; this is tested against the full set of MitPlan v1 plans during Phase 4.
- [ ] **The cutover is at the DNS layer, not the data layer.** MitPlan v1 continues to serve read-only traffic from Firebase RTDB; XIVMitPlan serves write traffic from Supabase. There is no dual-write period.
- [ ] **Architecture reviews are pinned to weeks 4, 26, 32, and 36.** The ARC owner schedules them; the team attends. Decisions made are recorded in `docs/adr/`.
- [ ] **The Hocuspocus v4 pin is re-evaluated every 60 days.** First re-evaluation: 2026-08-12. If the maintainer's edge-path feedback thread closes without issues, we float to `^4.x`. If issues surface, we stay pinned.

---

## 23. Risks, Open Questions and Future Work

### 23.1 What we don't know yet

- **8.0 job names, kits, and ability consolidation details.** Until Berlin (Jul 25-26 2026) and Tokyo (Oct 31 – Nov 1 2026) Fan Fests reveal the full Evolved-mode kit, the schema models the structure but we cannot validate against the final ability set. **Mitigation:** the `(jobId, abilityId, mode)` composite key (§19.2) and the `ability_equivalence` map (§19.2) absorb renames and consolidations.
- **Whether the 2-minute burst deprecation is total or partial.** **Mitigation:** the burst-coordination features are not load-bearing.
- **Hocuspocus on Cloudflare DO production-readiness.** Re-verified 2026-06-14: v4.2.0 (released 2026-06-12) is the third v4 release since the May 20 2026 HN edge-path launch. No API break, no revert, no production-blocker reports on the HN thread (item 48208834). **Mitigation:** the rollback path is 1 week (replace `apps/realtime` with a Node Hocuspocus process; the `PlanDocument` interface is the only thing that changes). The cost of the rollback is bounded.
- **FFLogs rate-limit behavior at scale.** NFR-I1 says > 5K req/day. The Triggernometry + FFLogs research report verified this is the free tier. **Mitigation:** cache aggressively; only poll public reports; user-scoped OAuth tokens are minted per-user, not shared.
- **Triggernometry export format evolution.** **Mitigation:** our parser is versioned; the format is opaque to the rest of the system.
- **Cactbot timeline format evolution.** **Mitigation:** same as 2026-06-05 draft §23.1.
- **Evolved-mode-only jobs and the 16-action hotbar consolidation.** **Mitigation:** the §19.3 step 4b per-mode-impact computation surfaces "this plan was authored in [mode]" affordances. The 16-action hotbar does not affect the planner UI (timeline + mit assignments, not a hotbar mirror).

### 23.2 What could break

- **Yjs doc size.** A plan with 200 assignments is fine; a plan with 20,000 assignments (exotic case) bloats the Yjs doc. **Mitigation:** the §14.5 snapshot-rebuild policy.
- **Durable Object cold start.** A new DO starts in ~50ms; the first connection to a recently-evicted plan will see a brief delay. **Mitigation:** warn users ("Loading…") and prefetch on plan list view. NFR-D1.
- **FFLogs rate limits.** **Mitigation:** cache aggressively; only poll public reports; the `ingest-fflogs` cron job is throttled to 1 report per minute.
- **Fan translation drift.** EN ability names lag JP by hours. **Mitigation:** JP-first ingest pipeline; EN translations backfill.
- **The "tank invuln + DoT" gotcha.** **Mitigation:** the MitStackEvaluator has a `flagInvulnDoTConflict()` method; the UI shows a warning.
- **The "Cover" edge case.** **Mitigation:** the `Assignment.targetType` includes a `COVER` variant; the MitStackEvaluator swaps the player whose mit stack applies.
- **Account-required drops activation 20-30%.** This is the honest prediction from the auth research report: removing the anonymous edit path will cost us 20-30% of the activation rate. **Mitigation:** the migration claim flow (§22.7) converts anonymous MitPlan v1 users into signed-in XIVMitPlan users with one click. The Discord OAuth sign-in is one click, not a form. If activation drops more than 30% in the first 60 days post-launch, we re-evaluate adding a "magic link" anonymous-tier in v1.1.

### 23.3 Risks we are explicitly accepting

- **Three ingestion sources mean three parsers to maintain.** This is the cost of the user's decision (gap analysis §1.1 #5). Mitigations: the parsers are pure functions in `packages/domain/parsers/`, each with a golden-input test suite. The maintenance burden is real but bounded — the parsers are ~500 lines each, the test suites are ~200 lines each. **Staffing:** 1.0 engineer (DATA) for the timeline-ingestion track in v1.0; this is in the budget. The risk is *single-engineer bus factor* on any one parser; we mitigate with the test suites and the clear port boundaries.
- **Cloudflare DO + Hocuspocus is documented-but-young.** This is the cost of the user's decision (gap analysis §1.1 #4). Mitigations: the 1-week rollback path; the deployment playbook is well-understood; the hibernation API is the key cost lever. **Staffing:** 1 engineer (BE) with DO experience for the deployment + 1 SRE rotation for the first 30 days. Re-verified 2026-06-14; the v4.2.0 release confirms the May 2026 edge path.
- **We are a small team.** The architecture is designed for 5.0 FTE (3.5 engineers + 0.5 SRE + 0.5 QA + 0.5 PM). The "right" answer at higher scale (separate analytics DB, Kafka, GraphQL gateway) is not in scope.

### 23.4 Risks we are explicitly mitigating

- **Yjs maturity on Cloudflare DO:** **Mitigation:** the 1-week rollback path; the stress-test suite (§20.3); a "dev tools" panel in the UI that shows the raw Yjs state for debugging.
- **dnd-timeline + visx compatibility:** **Retired 2026-06-14.** Re-verified clean: `dnd-timeline@3.1.1` + `@dnd-kit/core@6.3.1` + `@visx/{axis,scale}@4.0.0` are all React 19-clean. The vendor-fallback spec is retained in §15.2.1 as defense in depth, not as an expected path. The trigger thresholds to invoke the fallback are in §7.10.
- **Real-time conflict resolution correctness:** bugs here lose user data. **Mitigation:** the §20.3 stress-test suite with 100+ concurrent-edit scenarios; property-based fuzzing; a "dev tools" panel in the UI that shows the raw Yjs state.
- **Account-required activation drop > 30% in the first 60 days.** **Mitigation:** the §22.7 migration claim flow converts anonymous v1 users with one click. If the drop exceeds 30% in the first 60 days of GA, the v1.1 escape hatch is a 1-sprint Supabase Auth feature flag for magic-link-anonymous tier (§23.2).
- **Supabase PITR is a $100/mo add-on; the 8.0 patch-day data volume will exceed the 7-day window.** **Mitigation:** the 15-min cron-snapshot to R2 (free) is the locked v1 design (§21.4). R2 storage stays trivial (< $4/mo at 10K users) because we only retain the latest 30 daily snapshots.

### 23.5 Risks retired this revision (2026-06-14)

For auditability, the risks the 2026-06-06 lock carried that the 2026-06-14 review retired or downgraded:

- **`dnd-timeline` + React 19 compatibility.** Re-verified clean. `dnd-timeline@3.1.1` (May 16 2026), `@dnd-kit/core@6.3.1` (peer `react >=16.8.0`), `@visx/axis@4.0.0` (Jun 11 2026), `@visx/scale@4.0.0` (Jun 11 2026) all admit React 19 with no published incompatibilities. The vendor fallback spec (§15.2.1) is retained as defense in depth, not as an expected path.
- **Hocuspocus v4 edge-path uncertainty.** Hocuspocus v4.2.0 (Jun 12 2026) is the third v4 release since the May 20 2026 HN edge-path launch. No API break, no revert, no production-blocker reports. Pin to `^4.2.0`; re-evaluate in 60 days.
- **The 1.6–1.8x Discord-vs-email claim.** Replaced with the more defensible 20–35% social-OAuth lift range from the Auth0 published study and the 2025 industry data cited by InfluenceFlow (Feb 27 2026).
- **The "October 2026" Tokyo Fan Fest date.** Corrected to Oct 31 – Nov 1 2026 (the event spans into November, per Square Enix's Aug 2025 announcement).
- **The 25–30% MojoAuth password-friction anchor.** Replaced with the Baymard 2024 24% cart-abandonment-from-forced-account-creation figure (conservative lower bound) and the 24–37% range from the 2024–2026 practitioner audits (upper bound).
- **The "(Removed) Deviation" and "(Removed) Trigger" glossary entries.** Confirmed removed; v2.0 and v2.2 trigger metrics are unchanged.

### 23.6 Future work

| Version | Scope | Trigger to start |
|---|---|---|
| **v1.1 — Patch-day hardening** | 8.0 mode toggle (REBORN/EVOLVED/CURRENT) in the UI; "convert to Reborn" CTA; expanded ability-version resolution; the "patch-update banner" with proactive background job. **Plus:** Supabase Passkeys (added May 28 2026) as a 1.1 alternative to email/password. | Triggered by Square Enix 8.0 launch (Jan 2027). The data model is ready in v1.0; the UI ships in v1.1. |
| **v1.2 — Variance data model, no UI** | Author the `Branch` graph for FRU P1-P4 in the data model; expose it through the API; no authoring UI yet. Plans reference a "variance graph" but the editor only shows the linear path. | Triggered when: (a) at least 3 community strategy sites publish structured variance descriptions we can ingest, OR (b) the static-Abilities-only model causes >5 user complaints per month about missing variance. |
| **v2.0 — Live mode** | ACT ingester Worker; R2 raw log storage (30-day rolling); `LiveSession` bounded context; `DeviationDetector`; `PlanAdvancer`; ACT plugin (Cactbot + OverlayPlugin); Live mode UI. | Triggered when: (a) v1 has >1,000 weekly active plans for at least 2 consecutive months, AND (b) >20% of users say "I need this during pulls" in a survey (N≥100), OR (c) at least one major static publicly requests Live mode. Cap at 6 months. |
| **v2.1 — Variance authoring UI** | Dual-pane graph editor; path locks; community-authored branches. | Triggered when: the variance data model from v1.2 has been in production for 3 months and ≥30% of plans reference a branch. |
| **v2.2 — Triggers** | `Trigger` data model from §6.4 (2026-06-05 draft); trigger editor; pure functional expression language; ACT-driven `MARK_TIMELINE` / `FLAG_DEVIATION` actions. | Triggered when: Live mode is in production for 3 months and at least 50 users have authored custom callouts. |
| **v3.0 — Scale + R2** | Migrate R2 from "backups only" to "ACT log storage"; SSR for Learn mode if Discord embeds become a real acquisition channel; paginate the Yjs doc with snapshots beyond the §14.5 2MB threshold. | Triggered when: (a) >10K weekly active users, OR (b) Discord embeds drive >30% of sign-ups, OR (c) the §14.5 snapshot-rebuild policy fires >5 times per week. |

---

## 24. Appendix A — SOLID Application Examples

Unchanged from the 2026-06-05 draft §24. Five examples:

1. **Single Responsibility (the Cactbot parser)** — four port interfaces (Acquirer, Parser, Validator, Repository) replace the "do everything" TimelineImporter class. In v1, the same shape applies to the Triggernometry and FFLogs parsers: each has a SourceAcquirer, a Parser, and shares the Validator, Merger, and Repository with Cactbot.
2. **Open/Closed (the MitStackEvaluator)** — the evaluator is parameterized by a sorted list of `MitEntry` discriminated unions; a new entry type extends the union without modifying the evaluator.
3. **Liskov Substitution (the timeline parser)** — v1 has three concrete parsers; any consumer of `TimelineParser` works with any of them. (In v1.0, the `ActEventIngester` Liskov example from the 2026-06-05 draft §24 example 3 is removed with the live-session decomposition.)
4. **Interface Segregation (the plan document)** — `ReadOnlyPlanDocument` exposes only the read methods; the public share-link viewer takes the read-only interface.
5. **Dependency Inversion (the MitStackEvaluator)** — the evaluator depends on `AbilityCatalog` (interface), not `PostgresAbilityCatalog` (concrete). The composition root wires the concrete implementation. Tests use an in-memory catalog.

---

## 25. Appendix B — Example Timeline File Formats

The 2026-06-05 draft §25 has Cactbot `.txt` and FFLogs examples. v1 adds a Triggernometry XML example and a canonical `TimelineEvent` example with the new `confidence` and `varianceMs` fields.

### B.1 Cactbot `.txt` (input)

```
### M1S: Sugar Riot
# -ii 4E20 4E21
# Hide all but the boss
hideall "--sync--"
0.0 "--sync--" sync "/NameOfTheEnemy appears!/"
10.0 "Brutal Rain" sync / 1[56]:Brutal Rain:/ window 10,10
30.0 "Brutal Rain" duration 3
50.0 "Sugar Riot" sync / 1[56]:Sugar Riot:/
55.0 "--sync--" sync / 1[56]:Sugar Riot:.*Brutal Strike:/
60.0 "Brutal Strike"
80.0 "Brutal Rain x3+" # multi-hit
```

### B.2 Triggernometry XML (input, partial)

```xml
<TriggernometryExport>
  <Triggers>
    <Trigger>
      <Id>1</Id>
      <Name>Brutal Rain Alert</Name>
      <CategoryName>Sugar Riot</CategoryName>
      <TriggerType>3</TriggerType>
      <Condition>${_ffxiventity[${_sourceid}].name}=Sugar Riot</Condition>
      <Actions>
        <Action>
          <ActionType>5</ActionType>
          <Text>TTS:(Brutal Rain)</Text>
        </Action>
      </Actions>
    </Trigger>
  </Triggers>
</TriggernometryExport>
```

The parser reads the `CategoryName` and `Condition` to derive the event identity. The `timestampMs` is *inferred* from the typical timing of the boss action in the encounter — Triggernometry triggers are event-driven, not time-anchored. The parser outputs `confidence: 0.6` for inferred timestamps. (Triggernometry + FFLogs research report: this is the key finding that distinguishes Triggernometry from Cactbot.)

### B.3 FFLogs GraphQL response (input, partial)

```json
{
  "data": {
    "reportData": {
      "report": {
        "code": "ABC123",
        "events": {
          "data": [
            { "beginCast": { "timestamp": 10000, "ability": { "gameID": 34567, "name": "Brutal Rain" }, "sourceID": 12345 }, "endCast": { "timestamp": 12500 } }
          ]
        }
      }
    }
  }
}
```

The parser reads the `beginCast` / `endCast` pairs for the encounter's boss NPC, infers the event timing as the median across all pulls in the report, and outputs `confidence: 0.7` and `varianceMs: <spread across pulls>`.

### B.4 Canonical `TimelineEvent` (output, after parsing + validation + merge)

```json
{
  "id": "evt_01HXY...",
  "position": 3,
  "timestampMs": 60000,
  "type": "MECHANIC",
  "name": "Brutal Strike",
  "normalizedNames": ["brutal strike"],
  "durationMs": null,
  "hitTimesMs": [60000],
  "targets": { "kind": "MAIN_TANK" },
  "mechanicId": null,
  "patchVersion": "7.20",
  "confidence": 0.95,
  "varianceMs": 120,
  "mergedFromSources": { "cactbot": true, "triggernometry": true, "fflogs": true }
}
```

A `confidence` of 0.95 means all three sources agreed within 500ms. A `confidence` of 0.6 means only one source had the event (typically Triggernometry or FFLogs in isolation). The `confidence`, `varianceMs`, and `mergedFromSources` fields are new in v1.

---

## 26. Appendix C — Glossary

| Term | Definition |
|---|---|
| **ACT** | Advanced Combat Tracker, the de facto FFXIV combat logging tool. (v2 context; not in v1.) |
| **Branch** | A point in the timeline where the encounter can take one of several paths. |
| **Burst window** | The 120-second alignment of major raid buffs in 7.x. Deprecation pending in 8.0. |
| **Cactbot** | A community-maintained ACT plugin for FFXIV timeline display. Primary timeline source in v1. |
| **Cover** | PLD ability that redirects damage from the cover-ee to the cover-er. |
| **CRDT** | Conflict-free Replicated Data Type. Yjs is a CRDT library. |
| **DSR** | Dragonsong's Reprise Ultimate. |
| **(Removed) Deviation** | A difference between the planned timeline and the observed ACT events during a live pull. (v2 concept; removed from v1.) |
| **Discord OAuth** | The primary authentication provider in v1. |
| **Drizzle** | TypeScript-first ORM for Postgres. |
| **Durable Object (DO)** | A Cloudflare compute primitive that hosts stateful, single-instance workloads with hibernation. Hosts Hocuspocus in v1. |
| **Evolved Mode** | The 8.0 option that uses new ability kits. |
| **Evercold** | The 8.0 expansion's working title, launching January 2027. |
| **FFLogs** | A community site that parses ACT logs and provides rankings/analysis. Timeline source in v1 (variance + validation). |
| **FRU** | Futures Rewritten Ultimate. |
| **XIVMitPlan** | The code name for this project. Locked in this document. |
| **Hibernation API** | Cloudflare's mechanism for keeping Durable Objects warm without paying for idle CPU. |
| **Hocuspocus** | A production-ready Yjs server with auth and persistence extensions. |
| **Join point** | A point where previously-branched paths reconverge. |
| **Light Rampant** | The add-spawn mechanic in FRU P1 used as the worked example. |
| **M1S–M4S** | Futures Rewritten raid tier encounters. |
| **Mechanic** | A boss action or sequence that requires specific player behavior. |
| **Merge confidence** | A per-event score (0-1) representing how well the three timeline sources agreed. New in v1. |
| **MitStack** | The set of mits active on a target at a given time, plus the residual damage percentage. |
| **(Removed) OverlayPlugin** | A framework for ACT plugins to expose WebSocket streams. (v2 context; removed from v1.) |
| **P5S, P6S, P7S, P8S, etc.** | Pandaemonium raid tier encounters (Abyssal Eddy). |
| **Path lock** | A user's choice to commit to a specific branch outcome for a plan, overriding the runtime resolver. (v2.1 concept; the data model is in v1.) |
| **RBAC** | Role-based access control. |
| **Reborn Mode** | The 8.0 option that preserves 7.x ability kits. |
| **Recitation** | SCH ability that makes the next Adloquium a crit and a 50% chance to be a free cast. |
| **Reprisal** | Tank role action: 10% party damage reduction for 10s, 60s recast. |
| **RLS** | Row-Level Security. Postgres feature used in v1 to enforce per-plan access. |
| **Soak** | To deliberately stand in a damage zone to absorb a hit, often for a shared pool. |
| **Spread** | A mechanic requiring players to stand apart from each other. |
| **Stack** | A mechanic requiring players to stand on top of each other. |
| **Supabase Auth** | The authentication provider in v1. Discord OAuth + email/password + magic link. |
| **TEA** | The Epic of Alexander Ultimate. |
| **Tether** | A line connecting a player to an add or another player, often requiring movement. |
| **Timeline** | An ordered set of `TimelineEvent`s for an encounter, plus `Branch` and `JoinPoint` edges. |
| **TTS** | Text-to-speech. Used for in-pull callouts. (v2 context; removed from v1.) |
| **TOP** | The Omega Protocol Ultimate. |
| **(Removed) Trigger** | A side-band rule that watches game state and fires actions. (v2.2 concept; removed from v1.) |
| **Triggernometry** | A community-maintained ACT plugin for advanced triggers. Timeline source in v1 (validation). |
| **Trust** | NPC party members. Used by solo players in certain duties. |
| **UCob** | The Unending Coil of Bahamut Ultimate. |
| **UWU** | The Weapon's Refrain Ultimate. |
| **(Removed) Warp** | A XIVMitPlan-specific term for a server-side Yjs doc patch. (v2 context; removed from v1.) |
| **WS** | WebSocket. |
| **xivapi** | A community-built API for FFXIV game data (actions, items, etc.). |
| **Yjs** | A high-performance CRDT library with text, map, array, and awareness primitives. |

---

**End of document.** Owner: Architecture. Reviewers: Backend, Frontend, Data, QA leads. Next review: 2026-07-15 (post-monorepo bootstrap, when the v1 cut of the foundation phase is reviewable).
