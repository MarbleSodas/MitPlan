# MitPlan documentation

- [Feature inventory](./01-feature-inventory.md)
- [Technical implementation](./02-technical-implementation.md)
- [Architecture overview](./03-architecture-overview.md)
- [User workflows](./04-user-workflows.md)
- [Database schema](./05-database-schema.md)
- [Development setup](./06-development-setup.md)
- [Troubleshooting](./07-troubleshooting.md)
- [Contributing](./08-contributing.md)
- [Firebase cutover report](./09-firebase-cutover-report.md)
- [Collaborative planning cutover](./10-collaborative-planning-cutover.md)
- [Evercold and composable planning](./11-evercold-composable-planning.md)

## Current platform

MitPlan runs on Next.js 16 and React 19. Supabase provides Auth, Postgres persistence, row-level authorization, transaction RPCs, and realtime database notifications. Vitest remains the unit-test runner, and Bun is the package manager and script runner.

The primary entry points are:

```text
app/                  Next.js routes and provider boundary
src/components/       screens and shared UI
src/contexts/         auth, planner, theme, and collaboration state
src/services/         application workflows
src/lib/              navigation and database adapters
supabase/migrations/  backend schema and security source of truth
```

Historical document shapes remain only as a recovery archive and for legacy timeline workflows. Collaborative plans now use normalized tables, transactional operations, ordered changes, private Broadcast, and ephemeral Presence. Treat mentions of Firebase or document-based plan collaboration in older feature history as legacy context.
