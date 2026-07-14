# ADR-0004: Core Migration Release Scope

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-13 |
| Supersedes | None |
| Depends on | ADR-0002, ADR-0003 |

## Decision

The first release of the Supabase backend is a migration-focused core release.
It ships authenticated planning, collaboration, sharing, Firebase Auth import,
and legacy-plan claims before adding the remaining product surface.

## Implementation Update (2026-07-14)

The core implementation has progressed beyond the initial scope snapshot. The
repository now includes migrations `0010` through `0013`, planner catalog
metadata, plan-management Edge Functions, legacy-plan display/conversion
support, and responsive planner/editor improvements. The current planner also
has a recovery export action containing the current Yjs update, timeline, plan
metadata, and an optional server snapshot.

These additions do not change the deferred product boundary. The recovery
export is not the final schema-validated JSON import/export contract, and it
does not provide import, version browse/revert, party/tank/path workflows, or
R2 backup scheduling. Those capabilities still require a follow-up slice with
tests before being presented as complete.

The implementation status, verification results, and live-environment gaps are
tracked in [`docs/project-status.md`](../project-status.md).

## Included

- Supabase Auth with Discord, Google, and email flows.
- Firebase Auth import using Supabase's documented migration tooling.
- Firebase Realtime Database plan export, audited transformation, and
  identity-matched legacy claims.
- Plan creation, owner/editor collaboration, read-only viewers, opaque share
  links, Yjs snapshots, and private Supabase Realtime authorization.
- Reproducible Supabase migrations and Edge Function deployment.

## Deferred

- Public Learn routes and unauthenticated catalog access.
- Three-source ingestion operations and the full merged-timeline production
  workflow. Basic canonical timeline selection is already present in the Plan
  data-source adapter.
- Version browse/revert, full schema-validated JSON import/export UI,
  party/tank/path workflows, and R2 backup scheduling. The current recovery
  export is intentionally only a partial export surface.
- Live/ACT functionality remains excluded from v1 under ADR-0002.

Deferred work is not removed from the architecture. It requires a follow-up
ADR or implementation slice with tests before being presented as available.

## Release Gates

1. Apply migrations through `0013` to staging and production.
2. Disable Supabase Realtime public access and verify the `realtime.messages`
   policies for owner, editor, viewer, and unauthenticated sessions.
3. Complete the Firebase Auth import and plan-export reconciliation described
   in [`../firebase-migration.md`](../firebase-migration.md).
4. Verify Google and Discord browser OAuth callbacks on staging.
5. Run two-user staging collaboration tests, including a viewer attempting to
   publish an update and a late-joining client.
6. Deploy and smoke-test the plan-management Edge Functions introduced after
   `0009` (`plans-update`, `plans-delete`, and `plans-duplicate`).
