# Development setup

## Prerequisites

- Bun 1.3 or newer
- Node.js 22 or newer for ecosystem tooling
- Supabase CLI
- Docker Desktop only when running the complete local Supabase stack

## Install and configure

```bash
bun install
cp .env.example .env.local
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Fill in `.env.local` with the project URL and browser-safe publishable key. The secret key is used only by server-side operational scripts and must never use a `NEXT_PUBLIC_` name.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Start the Next.js development server:

```bash
bun run dev
```

The app is available at `http://localhost:3000`.

## Database workflow

Remote migration status and deployment:

```bash
bun run verify:database
bun run deploy:database
```

For fully local backend development, run `supabase start` with Docker, obtain local credentials from `supabase status`, and use those values in `.env.local`. Apply migrations locally with `supabase db reset`.

After the normalized planning migration is present, follow the [collaborative planning cutover runbook](./10-collaborative-planning-cutover.md). Do not run the backfill concurrently with plan mutations.

## Quality checks

```bash
bun run test:run
bun run typecheck
bun run lint
bun run build
bun run security:check
```

Vitest configuration lives in `vitest.config.ts`; shared DOM setup is in `src/tests/setup.ts`. Next.js production compilation is configured in `next.config.ts`.

## Firebase migration prerequisites

The cutover script is intentionally separate from normal development. It requires authenticated `firebase` and `supabase` CLI sessions. Run the dry-run command first and review user mappings, missing target accounts, orphan IDs, document totals, and collection counts before using `--apply`. Apply mode creates missing email-address Auth accounts before rewriting document identities; newly created password accounts require password recovery.

Exports are temporary by default because they include sensitive authentication and user data. Do not commit them.
