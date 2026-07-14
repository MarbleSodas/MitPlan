# Project Status

> Status snapshot: 2026-07-14. This document records the implementation state
> and the decisions currently in force. It is a living status page, not a
> replacement for the accepted ADRs.

## Current Position

XIVMitPlan has a working authenticated Plan core built on Supabase, Yjs, and a
custom Supabase Realtime Broadcast provider. The web application supports local
sample-data development without cloud credentials and has a production build,
workspace typechecks, and automated tests passing.

The core is not production-released. A live Supabase environment, migrations,
Edge Functions, OAuth providers, private Realtime policies, and two-user browser
smoke tests still need to be verified together.

## Implemented

### Product Surface

- Authenticated plan list and plan creation with encounter selection.
- Plan editor with a responsive timeline rail, searchable ability picker, drag
  and drop assignment, assignment removal, and realtime status.
- Owner, editor, and viewer roles. Viewers cannot edit names, add or remove
  assignments, publish Yjs updates, or track write-capable presence.
- Share-link creation and redemption through account-granted plan access.
- Plan rename, duplicate, owner-only delete, and current-plan export actions.
- Legacy MitPlan v1 conversion, preserved provenance, and an expandable legacy
  details view for imported plans.
- Accessible focus states, empty/error/loading states, and a stacked mobile
  editor layout.

### Planner Data And Evaluation

- Catalog fields for damage type, target, charges, job abbreviation, raid name,
  and raid tier are available through the data-source facade.
- Canonical timeline selection prefers `CURRENT`, then manual source, then
  supported imported sources, with explicit fallback behavior.
- Mitigation evaluation accounts for ability duration, target kind, and
  damage-type fields when richer event payloads supply them, plus multi-hit
  timing, shields, invulnerability, and recast-window double bookings. The
  current timeline adapter reliably exposes target and timing fields; richer
  damage metadata is still a data-ingestion follow-up.
- Event cards retain available notes, duration, hit count, confidence, variance,
  and source provenance instead of hiding partial backend data.

### Persistence And API

- Migration files `0001` through `0013` exist in the repository.
- `0010` and `0011` harden Auth/GoTrue null handling.
- `0012` adds planner catalog fields and expanded catalog RPC responses.
- `0013` adds plan snapshot export support.
- `plans-update`, `plans-delete`, and `plans-duplicate` Edge Functions are
  present. Update and delete retain user-scoped RLS after endpoint ACL checks;
  duplicate rolls back the new plan if snapshot transfer fails.
- Yjs snapshots restore before realtime connection and persist through the
  debounced `upsert_ydoc_snapshot` path.

## Decisions In Force

| Decision          | Current rule                                                                                                                                                                                                          | Record                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Backend           | Use Supabase Postgres, PostgREST RPCs, Realtime Broadcast, and Edge Functions. Do not reintroduce the deleted server/realtime stack for v1.                                                                           | [ADR-0002](adr/0002-supabase-only-backend.md)              |
| Realtime          | Use the owned `SupabaseBroadcastProvider`, not `y-supabase`. Keep the provider interface as the future migration seam.                                                                                                | [ADR-0003](adr/0003-path-a-hardened-supabase-broadcast.md) |
| Auth and ACL      | Require an authenticated account. Owners/editors write; viewers are read-only. Never infer write access from a URL token.                                                                                             | ADR-0002, ADR-0004                                         |
| Local development | Keep a sample-data fallback so the SPA and planner can be exercised without cloud credentials. Local-created plans are memory-only.                                                                                   | README and `apps/web/src/lib/data-source.ts`               |
| Planner export    | The current export is a recovery artifact containing the current Yjs update, timeline, metadata, and an optional server snapshot. Full schema-validated JSON import/export and version browse/revert remain deferred. | ADR-0004 implementation update                             |
| Live mode         | Do not add ACT/Live functionality to v1.                                                                                                                                                                              | ADR-0002, ADR-0004                                         |

## Deferred Or Unverified

- Apply migrations `0001-0013` to staging and production, then deploy all
  required Edge Functions.
- Configure and verify Discord, Google, and email Auth flows in a live
  environment.
- Disable public Realtime access and verify owner/editor/viewer behavior with
  two authenticated browser sessions.
- Add Edge Function integration tests for plan update, delete, and duplicate
  authorization paths.
- Add the full Learn route, timeline-ingestion UI, three-source ingestion
  operations, and awareness cursors.
- Add party/job/tank/path workflows, health projections, phase editing, and
  version browse/revert.
- Add full JSON import and schema-validated re-import. The current export must
  not be described as a complete round-trip import format.
- Add R2 snapshot backup scheduling and verify the documented backup path.
- Fix repository tooling gaps: the web lint script currently runs ESLint 9
  without an `eslint.config.*` file, and the full repository has existing
  Prettier failures.

## Verification Baseline

The following checks passed on 2026-07-14:

```text
pnpm typecheck                         6 workspace packages passed
pnpm test                              all workspace tests passed
pnpm --filter @xivmitplan/web test    106 tests in 7 files passed
pnpm --filter @xivmitplan/web build   production bundle passed
deno check ...                         plan CRUD Edge Functions passed with the project import map
git diff --check                       passed
```

The web build still reports non-blocking Vite sourcemap, circular-chunk, and
large-chunk warnings. Live Supabase and Playwright staging verification have not
been run in this workspace.

## Release Sequence

1. Apply and inspect migrations `0001-0013` in a disposable Supabase project.
2. Deploy Edge Functions and configure Auth plus private Realtime policies.
3. Run owner/editor/viewer, late-join, snapshot-restore, and legacy-claim
   browser smoke tests.
4. Record the staging results and decide whether the deferred planner workflows
   need a follow-up ADR before public beta.
