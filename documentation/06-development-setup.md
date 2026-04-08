# MitPlan Development Setup Guide

## Prerequisites

- Node.js 18 or newer
- Bun 1.3 or newer
- Git
- A Firebase project if you want realtime auth/database features locally

## Install

```bash
git clone https://github.com/MarbleSodas/MitPlan.git
cd MitPlan
bun install
```

Verify Bun:

```bash
bun --version
```

## Environment Setup

Create `.env.local` in the repo root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

MitPlan expects a Firebase web app plus Realtime Database/Auth enabled in that project.

## Daily Commands

```bash
bun run dev
bun run build
bun run preview
bun run lint
bun run typecheck
bun run test
bun run test:run
bun run test:coverage
```

## Testing Setup

Vitest is configured directly in [`vite.config.js`](/Users/eugene/Documents/Github/MitPlan/vite.config.js):

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/tests/setup.ts'],
}
```

Shared test setup responsibilities:

- Firebase config mocking
- `matchMedia` and `ResizeObserver` shims
- `localStorage` shim/reset
- Testing Library cleanup
- `@testing-library/jest-dom` matchers

If a test needs app-level providers, prefer reusing this shared setup and only mock the domain-specific edges required by that suite.

## Firebase Notes

- Realtime Database rules are stored in [`database.rules.json`](/Users/eugene/Documents/Github/MitPlan/database.rules.json).
- Project config for deploy targets is in [`firebase.json`](/Users/eugene/Documents/Github/MitPlan/firebase.json) and [`.firebaserc`](/Users/eugene/Documents/Github/MitPlan/.firebaserc).
- Validate rules before or after deploy with:

```bash
bun run verify:database
```

- Deploy database rules with:

```bash
bun run deploy:database-rules
```

## Codebase Notes

- Route screens in [`src/App.tsx`](/Users/eugene/Documents/Github/MitPlan/src/App.tsx) are lazy-loaded, so route tests should wait for resolved UI rather than assuming sync renders.
- The repo is Bun-first; `bun.lock` is the canonical lockfile.
- Shared utilities and contexts contain a mix of legacy and newer patterns, so prefer focused refactors over large folder migrations unless a task explicitly calls for reorganization.
