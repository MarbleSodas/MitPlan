# MitPlan

MitPlan is a React + Firebase app for planning raid mitigation in Final Fantasy XIV. It combines encounter timelines, cooldown tracking, tank-role targeting, and real-time collaboration so groups can build and share mitigation plans together.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Firebase Realtime Database + Auth
- Vitest + Testing Library
- Bun for package management and local scripts

## Quick Start

### Prerequisites

- Node.js 18+
- Bun 1.3+
- A Firebase project if you want live auth/database features locally

### Install

```bash
git clone https://github.com/MarbleSodas/MitPlan.git
cd MitPlan
bun install
```

### Environment

Create `.env.local` with your Firebase web app values:

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

### Run

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

```bash
bun run dev
bun run build
bun run preview
bun run lint
bun run typecheck
bun run test
bun run test:run
bun run test:coverage
bun run security:check
bun run verify:database
```

## Project Layout

```text
src/
├── components/   # Route screens and shared UI
├── contexts/     # Auth, plan, theme, realtime, collaboration
├── data/         # Boss, ability, job, and timeline data
├── features/     # Newer feature-oriented slices
├── services/     # Firebase and domain services
├── tests/        # Shared test setup and manual test notes
├── types/        # Shared TS types
└── utils/        # Domain and UI helpers
```

## Testing

Vitest runs in `jsdom` and loads shared setup from [`src/tests/setup.ts`](/Users/eugene/Documents/Github/MitPlan/src/tests/setup.ts). Route screens are lazy-loaded, so route tests should wait for rendered content instead of assuming synchronous screen transitions.

## Notes

- The repo is Bun-first and keeps `bun.lock` as the source-of-truth lockfile.
- Firebase rules live in [`database.rules.json`](/Users/eugene/Documents/Github/MitPlan/database.rules.json).
- Additional project docs live under [`documentation/`](/Users/eugene/Documents/Github/MitPlan/documentation).
