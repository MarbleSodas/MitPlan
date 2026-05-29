# MitPlan Documentation

This folder contains the longer-form docs for the MitPlan codebase and product behavior.

## Start Here

- [01. Feature Inventory](./01-feature-inventory.md): Product capabilities and user-facing behavior.
- [03. Architecture Overview](./03-architecture-overview.md): High-level app structure, data flow, and deployment shape.
- [06. Development Setup Guide](./06-development-setup.md): Local environment, scripts, testing, and Firebase setup.
- [08. Contributing Guide](./08-contributing.md): Contribution expectations and review guidance.

## Current Stack Snapshot

- React 19
- React Router 7
- TypeScript
- Vite
- Tailwind CSS v4
- Firebase Realtime Database + Auth
- Vitest + Testing Library
- Bun package manager / script runner
- @dnd-kit for drag and drop
- Radix UI primitives
- Lucide React icons
- Sonner for toast notifications
- Vercel for hosting and analytics

## Codebase Orientation

```text
src/
├── config/          # Firebase config and version info
├── contexts/        # Auth, theme, planner, realtime, collaboration, presence
├── data/            # Jobs, bosses, abilities, official timelines
├── features/        # Feature-oriented slices (bosses, jobs, plans)
├── hooks/           # Custom React hooks
├── lib/             # Third-party library configs
├── pages/           # Standalone page components
├── services/        # Firebase reads/writes, session management, presence, plan access
├── tests/           # Shared Vitest setup plus manual-test notes
├── types/           # Shared TypeScript contracts
├── utils/           # Cooldown, mitigation, timeline, health, permissions, storage helpers
└── components/      # Screens plus shared UI pieces
    ├── ui/          # Shadcn/radix primitives (button, dialog, sheet, etc.)
    ├── common/      # Shared components (TankSelectionModal, KofiButton, HealingHealthBar)
    ├── layout/      # AppLayout, HeaderLayout, Footer
    ├── landing/     # LandingPage
    ├── dashboard/   # Dashboard, PlanCard, CreatePlanModal, ImportPlanModal
    ├── planner/     # MitigationPlanner, MobileBossTimeline, PhaseOverridesPanel
    ├── timeline/    # TimelineEditor, TimelineViewer, TimelineBrowser, TimelineCreateHub
    ├── auth/        # AuthForm
    ├── collaboration/  # SharePlanModal, CollaboratorsList, ActiveUsersDisplay
    ├── guards/       # Route protection components
    ├── admin/        # Admin utilities
    ├── consolidated/ # ConsolidatedView for print-safe snapshots
    └── DragAndDrop/  # Draggable, Droppable, DragPreview
```

## Key Documentation Files

| File | Purpose |
|------|---------|
| [00-documentation-index.md](./00-documentation-index.md) | Master index and navigation |
| [01-feature-inventory.md](./01-feature-inventory.md) | All features and capabilities |
| [02-technical-implementation.md](./02-technical-implementation.md) | Implementation details, file locations, key functions |
| [03-architecture-overview.md](./03-architecture-overview.md) | System design, data flow, deployment |
| [04-user-workflows.md](./04-user-workflows.md) | User journeys and interaction flows |
| [05-database-schema.md](./05-database-schema.md) | Firebase RTDB structure and security rules |
| [06-development-setup.md](./06-development-setup.md) | Dev environment and testing |
| [07-troubleshooting.md](./07-troubleshooting.md) | Common issues and solutions |
| [08-contributing.md](./08-contributing.md) | Code standards and PR process |
| [09-timeline-accuracy.md](./09-timeline-accuracy.md) | Timeline accuracy analyzer usage |
| [10-presence-system.md](./10-presence-system.md) | Real-time presence and collaboration |

## Maintenance Notes

### Update Workflow
When touching the codebase, the following documentation updates are **required**:

1. **Identify affected docs** - Check which files cover changed areas
2. **Update minimally but accurately** - Only modify sections that changed
3. **Verify file paths** - Confirm referenced paths still exist
4. **Update dates** - Set "Last Updated" to current date

**Change Triggers:**
| Change Type | Documentation Action |
|-------------|---------------------|
| New component/feature | Update 01-feature-inventory.md, 02-technical-implementation.md |
| New service | Add to 02-technical-implementation.md |
| New context | Update 03-architecture-overview.md context hierarchy |
| New route | Update 02-technical-implementation.md routing section |
| New database collection | Add to 05-database-schema.md |
| New utility module | Add to 02-technical-implementation.md utilities section |
| User-facing workflow change | Update 04-user-workflows.md |
| Presence/collaboration changes | Update 10-presence-system.md |

### General Notes
- Use Bun commands in docs and examples.
- Vitest is configured in [`vite.config.js`](/Users/eugene/Documents/Github/MitPlan/vite.config.js) and shared mocks/polyfills live in [`src/tests/setup.ts`](/Users/eugene/Documents/Github/MitPlan/src/tests/setup.ts).
- The codebase is predominantly TypeScript (`.ts` and `.tsx`).
- Contexts contain cooldown trackers (`src/utils/cooldown/`) for charges, instances, aetherflow, lily, and addersgall systems.
- Health projection utilities live in `src/utils/health/` for healing estimation.
- Timeline utilities in `src/utils/timeline/` handle adaptive layouts and phase overrides.
- Presence system tracks live cursors and collaborator states via `PresenceContext` and `presenceService` (see [10-presence-system.md](./10-presence-system.md)).
- When architecture changes, update the matching docs here instead of leaving historical stack details in place.
