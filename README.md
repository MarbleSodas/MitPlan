# MitPlan

MitPlan is a Final Fantasy XIV raid-mitigation planner with encounter timelines, cooldown tracking, tank-role targeting, plan sharing, and live multi-user collaboration.

## Stack

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- Supabase Auth, Postgres, Row Level Security, RPCs, and Realtime
- Vercel Analytics and Speed Insights
- Vitest and Testing Library
- Bun for dependency management and scripts

## Local development

Install Bun and the Supabase CLI, then:

```bash
bun install
cp .env.example .env.local
supabase link --project-ref YOUR_PROJECT_REF
bun run dev
```

Set the public browser credentials in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Open [http://localhost:3000](http://localhost:3000). Never place a Supabase service-role or secret key in a `NEXT_PUBLIC_` variable.

## Database

The checked-in migrations under [`supabase/migrations`](./supabase/migrations) are the source of truth. Apply them to the linked project with:

```bash
bun run verify:database
bun run deploy:database
```

For local schema verification and generated TypeScript definitions, start a
Docker-compatible container runtime and run:

```bash
supabase start
supabase db reset
bun run types:database
```

Plans use normalized tables and server-authoritative operation RPCs. Each accepted operation is committed atomically, advances a contiguous plan revision, records an inverse change, and broadcasts its canonical delta on the private `plan:<uuid>` channel. Presence and optional cursors are ephemeral. Anonymous share URLs call a token-gated snapshot RPC and never join the private channel.

`public.app_documents` remains a read-only recovery source during the cutover window for legacy timeline data, but the collaborative plan runtime no longer reads or writes plan documents through that adapter. All browser access is protected by explicit grants and RLS.

See [the normalized planning cutover runbook](./documentation/10-collaborative-planning-cutover.md) before deploying the schema or running the one-time plan backfill.

## Firebase cutover

The one-time migration utility uses the authenticated Firebase and Supabase CLIs. It exports Auth and Realtime Database data into a temporary directory, creates missing email-address accounts through Supabase Admin Auth during `--apply`, maps Firebase UIDs to Supabase UUIDs by normalized email, rewrites identity references, imports document rows, and reconciles collection counts.

```bash
# Inspect counts and unmapped identities; does not write
bun run migrate:firebase:dry-run -- \
  --firebase-project YOUR_FIREBASE_PROJECT \
  --supabase-ref YOUR_SUPABASE_PROJECT_REF

# Apply only after reviewing the report
bun run migrate:firebase:apply -- \
  --firebase-project YOUR_FIREBASE_PROJECT \
  --supabase-ref YOUR_SUPABASE_PROJECT_REF \
  --firebase-hash-config /secure/path/firebase-password-hash.json
```

The hash configuration file must contain Firebase's `base64_signer_key`, `base64_salt_separator`, `rounds`, and `mem_cost` values and must remain outside source control. Password-backed users are created with Supabase's native Firebase SCRYPT hash support, so their existing password continues to work without recovery. Apply mode stops before creating users if hash material is missing or invalid. Add `--keep-exports` only when an encrypted, access-controlled export is explicitly required; otherwise the temporary Auth and database exports are removed.

If a previous catch-up run created an account before hash preservation was enabled, audit it without exposing account details, then explicitly apply the repair. Accounts with any successful Supabase sign-in are skipped so an established password is never overwritten:

```bash
bun run repair:firebase-passwords -- \
  --firebase-project YOUR_FIREBASE_PROJECT \
  --supabase-ref YOUR_SUPABASE_PROJECT_REF

bun run repair:firebase-passwords -- \
  --firebase-project YOUR_FIREBASE_PROJECT \
  --supabase-ref YOUR_SUPABASE_PROJECT_REF \
  --apply
```

## Useful commands

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run typecheck
bun run test:run
bun run security:check
bun run verify:database
bun run deploy:database
```

## Repository layout

```text
app/                 # Next.js App Router entry points
src/components/      # Route screens and shared UI
src/contexts/        # Auth, plan, theme, realtime, collaboration
src/data/            # Boss, job, ability, and official timeline data
src/features/        # Feature-oriented UI and domain slices
src/services/        # Plan, timeline, presence, and profile workflows
src/lib/             # Next navigation and Supabase compatibility layers
supabase/migrations/ # Postgres schema, RLS, RPC, and realtime migrations
scripts/             # Migration, timeline, and verification utilities
documentation/       # Longer-form product and engineering notes
```

The Bun lockfile is authoritative. Environment files and generated Next.js/Supabase state are ignored.
