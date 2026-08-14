# Evercold and composable planning

## Outcome

MitPlan now treats encounter timing and job-action mode as independent plan
dimensions:

```text
immutable timeline version
  + selected fight route
  + plan phase overrides
  + plan custom events
  = resolved encounter timeline

resolved encounter timeline
  + CURRENT / REBORN / EVOLVED ability catalog
  + party composition
  = mitigation workspace
```

This prevents the Evercold battle-system choice from duplicating encounter
timelines. A plan pins one timeline version and route, owns only its overlays,
and independently selects the ability mode used for new assignments.

The official Evercold site describes Reborn Mode as based on the current
combat system and Evolved Mode as emphasizing job identity. It also states
that Evercold jobs are Evolved-only and limited jobs do not use these modes.
The feature remains in development, so MitPlan must not invent Evolved action
data before Square Enix publishes authoritative job guides:
[FINAL FANTASY XIV: Evercold](https://na.finalfantasyxiv.com/evercold/).

## Implemented compatibility rules

- Existing plans and imported documents normalize to `CURRENT`.
- Existing untagged ability definitions are available in `CURRENT` and
  `REBORN`, because Reborn is explicitly based on the current system.
- Untagged abilities are not exposed in `EVOLVED`.
- New definitions can declare `modes: ['EVOLVED']`, `['REBORN']`, or `['ALL']`.
- Jobs can declare `evolvedOnly` or an explicit `availableModes` list.
- Evolved plans can be created now, but the planner displays an honest empty
  catalog state until verified Evolved mitigation data is checked in.
- Plan mode is selected at creation and is intentionally immutable in the
  current UI. Silently switching a populated plan could make its assignments
  semantically invalid; a reviewed mode-migration workflow should precede any
  editable mode selector.

The database migration adds versioned RPCs so a frontend/database rolling
deployment is safe. Current plans may fall back to the v1 RPC surface, while
Reborn or Evolved creation fails clearly until the new migration is deployed.

## Unfinished work found in the audit

### Release blockers

1. `bun run typecheck` currently reports 774 errors across the pre-existing
   JavaScript-to-TypeScript conversion. The focused Evercold and composition
   tests pass, but the project-wide type gate is not green.
2. The new Supabase migration still needs an applied local migration-chain
   test and advisor pass. Docker Desktop was unavailable during this audit,
   and the linked database connection also timed out.
3. The Evolved action catalog cannot be completed until official job guides
   expose stable action names, IDs, recasts, durations, mitigation values, and
   equivalence mappings.

### Legacy infrastructure still to retire

1. Collaborative plans now use normalized tables and atomic operations, but
   community timeline CRUD still goes through the `app_documents`
   compatibility adapter in `timelineService`.
2. `public.timelines` and `public.timeline_versions` overlap. New work should
   target immutable `timeline_versions`; the older table should remain only
   until timeline backfill and reconciliation are complete.
3. The recovery-window runbook calls for deleting `app_documents`, its adapter
   RPCs, and unused Yjs snapshot infrastructure after archival verification.
   That cleanup is destructive and must be a separate forward migration after
   production checksums and backups are confirmed.
4. The official-data evidence inventory still marks some legacy timelines for
   revision audit. Those should not be promoted to a new published timeline
   version until their evidence status is clear.

## Recommended sequence

1. Start Docker Desktop, run `supabase db reset`, exercise the v2 mode RPCs,
   and run database security/performance advisors.
2. Reduce the TypeScript error baseline to zero, beginning with context and
   component prop contracts that account for most cascading errors.
3. Add a normalized community-timeline authoring/publishing service, backfill
   the 75 legacy timeline documents, and compare content hashes and counts.
4. After the archive window is verified, ship the separate destructive
   cleanup migration for document compatibility and obsolete Yjs tables.
5. Import verified Evercold job data as mode-specific definitions and add
   explicit equivalence mappings for Reborn-to-Evolved assignment migration.
6. Add a reviewed “fork plan into another mode” flow that previews retained,
   replaced, removed, and ambiguous abilities before committing.
