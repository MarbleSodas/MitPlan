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

## Codebase Orientation

```text
src/
├── components/   # Screens plus shared UI pieces
├── contexts/     # Auth, theme, planner, realtime, collaboration
├── data/         # Jobs, bosses, abilities, official timelines
├── features/     # Feature-oriented slices added during newer cleanup work
├── services/     # Firebase reads/writes and domain workflows
├── tests/        # Shared Vitest setup plus manual-test notes
├── types/        # Shared TypeScript contracts
└── utils/        # Cooldown, mitigation, timeline, permissions, storage helpers
```

## Maintenance Notes

- Use Bun commands in docs and examples.
- Vitest is configured in [`vite.config.js`](/Users/eugene/Documents/Github/MitPlan/vite.config.js) and shared mocks/polyfills live in [`src/tests/setup.ts`](/Users/eugene/Documents/Github/MitPlan/src/tests/setup.ts).
- When architecture changes, update the matching docs here instead of leaving historical stack details in place.
