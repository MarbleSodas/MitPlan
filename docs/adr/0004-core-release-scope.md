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
- Canonical three-source ingestion and merged timeline selection.
- Version browse/revert, JSON import/export UI, party/tank/path workflows,
  and R2 backup scheduling.
- Live/ACT functionality remains excluded from v1 under ADR-0002.

Deferred work is not removed from the architecture. It requires a follow-up
ADR or implementation slice with tests before being presented as available.

## Release Gates

1. Apply migrations through `0009` to staging and production.
2. Disable Supabase Realtime public access and verify the `realtime.messages`
   policies for owner, editor, viewer, and unauthenticated sessions.
3. Complete the Firebase Auth import and plan-export reconciliation described
   in [`../firebase-migration.md`](../firebase-migration.md).
4. Verify Google and Discord browser OAuth callbacks on staging.
5. Run two-user staging collaboration tests, including a viewer attempting to
   publish an update and a late-joining client.
