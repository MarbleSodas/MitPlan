# Collaborative planning cutover

This runbook moves plan collaboration from Firebase-shaped documents to normalized, server-authoritative plan operations. The schema source is `supabase/migrations/20260728134713_normalized_collaborative_planning.sql`.

## Preflight

1. Take a restorable database backup and export `public.app_documents`.
2. Confirm the application secret is available only to the operator running the backfill.
3. Run:

   ```bash
   bun run security:check
   bun run data:validate
   bun run test:collaboration
   supabase migration list
   supabase db push --dry-run --include-all
   ```

4. On a current local Supabase stack, run `supabase db reset` and test the complete migration chain. A local reset requires Docker.

## Initial backfill

1. Apply the forward migration.
2. Set server-only environment values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
   ```

3. Run `bun run migrate:plans:backfill`.
4. Review every `plan_backfill_reports` row. Resolve unknown timeline/version/route, ability, and stable-event mappings. Compare plan IDs, assignment counts, and checksums with the source export.

The script is repeatable and the migration preserves source plan IDs where they are valid UUIDs. Existing anonymous tokens are stored only as hashes.

## Final cutover

1. Put plan mutation routes into maintenance/read-only mode.
2. Run the backfill again to capture the final delta.
3. Remove `app_documents` from the `supabase_realtime` publication.
4. Deploy the client that uses `normalizedPlanService`, atomic operation RPCs, and private plan channels.
5. Verify:

   - owners/editors can mutate and viewers cannot;
   - unrelated users cannot load the plan;
   - anonymous tokens expose only a sanitized refresh-only snapshot;
   - two clients changing different and identical assignments converge in revision order;
   - reconnect catches up missed revisions and replays idempotent outbox entries;
   - a reopened plan restores preferences but starts fresh Presence;
   - route and timeline-version mutations are disabled while offline;
   - database security and performance advisors have no unresolved plan-schema findings.

6. Re-enable plan editing.

## Recovery window

Keep `app_documents` read-only for 30 days. It must not receive realtime plan subscriptions or dual writes. Retain the source export, reconciliation report, deployment revision, and timestamp needed for rollback.

After 30 days, verify the archive export and normalized checksums again, then add a separate forward migration to delete `app_documents`, its compatibility adapter/RPCs, and unused Yjs snapshot infrastructure. Do not place that destructive cleanup in the initial cutover migration.
