# Troubleshooting

## Missing Supabase configuration

If authentication or database calls target the test fallback, verify `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then restart `bun run dev`. Do not use a secret/service-role key in the browser.

## Row-level security errors

An error containing `42501`, `permission_denied`, or “row-level security” means the caller does not satisfy the deployed policy.

```bash
supabase migration list
supabase db push
```

Confirm the local and remote migration lists match. Then verify the plan or timeline contains a Supabase UUID in `ownerId`/`userId`, not an unmapped Firebase UID.

## User signs in but sees no plans

- Confirm the Auth user email was mapped during the migration dry run.
- Inspect the profile and plan owner IDs through a service-role-only administrative workflow.
- Re-run the data migration in dry-run mode and compare unmapped identity counts.
- Do not loosen RLS to expose orphaned data; repair the identity mapping instead.

## Existing password does not work

Firebase password hashes require the official Firebase Auth migration procedure or a first-login bridge. If the target account exists but its password credential was not imported, use “Forgot password?” to establish a Supabase password. Google users should use Google sign-in after the provider and redirect URLs are configured in Supabase Auth.

## OAuth callback problems

Add both local and production callback URLs to Supabase Auth redirect settings:

```text
http://localhost:3000/auth/callback
https://YOUR_DOMAIN/auth/callback
```

Verify the Google provider is enabled and its Google Cloud callback points to the Supabase Auth callback supplied by the dashboard.

## Realtime updates do not arrive

- Confirm the authenticated caller has plan membership and the deployed `realtime.messages` policies can authorize `plan:<uuid>`.
- Check the browser websocket and private-channel subscription status.
- Confirm the Auth token was supplied to Realtime and refreshed after Auth state changes.
- Compare the workspace revision with `plan_changes`; a gap should trigger a missing-change fetch or snapshot reload.
- Anonymous share routes intentionally do not receive realtime updates.

## Local Supabase CLI reports a Docker error

Linked commands such as `supabase db push` can still complete even if the optional local catalog cache cannot inspect Docker. Commands that run the local stack (`supabase start`, `db reset`) require Docker Desktop.

## Next.js build problems

```bash
rm -rf .next
bun install
bun run build
```

Browser-only modules must be imported below a `'use client'` boundary. Route screens should use `src/lib/navigation.tsx`, not React Router.

## Migration reconciliation fails

Run the dry run again while source writes are paused. The Firebase database is live, so counts can change between independent exports. Review the per-collection source and target counts, resolve missing Auth mappings, then re-run `--apply`; imports use `(collection,key)` upserts and are repeatable.
