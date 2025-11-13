# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MitPlan is a React-based web application for planning FFXIV raid mitigation strategies with real-time collaboration. It uses Firebase Realtime Database for live synchronization and supports both authenticated and anonymous users with local storage fallback.

## Development Commands

### Essential Commands
```bash
# Start development server (default: http://localhost:5173)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run linting
bun run lint
```

### Testing Commands
```bash
# Run all tests in watch mode
bun run test

# Run all tests once
bun run test:run

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage

# Run specific test suites
bun run test:realtime          # Real-time sync tests
bun run test:collaboration     # Multi-user collaboration tests
bun run test:persistence       # Data persistence tests
bun run test:performance       # Performance tests
```

### Security & Deployment
```bash
# Run security checks
bun run security:check

# Pre-deployment (runs security check + build)
bun run predeploy
```

### Running Single Tests
Use Vitest's filtering:
```bash
# Run a specific test file
bun run test src/path/to/test.test.jsx

# Run tests matching a pattern
bun run test --grep "cooldown"
```

## Architecture Overview

### Dual Context System
MitPlan uses **two distinct context systems** that should never be mixed:

1. **Legacy/Local Context System** (`AppProvider`)
   - Used for non-collaborative, local-only plans
   - Located in `src/contexts/AppProvider.jsx`
   - Contexts: `BossContext`, `JobContext`, `LegacyEnhancedMitigationContext`, etc.

2. **Real-time Context System** (`RealtimeAppProvider`)
   - Used for Firebase-backed collaborative plans
   - Located in `src/contexts/RealtimeAppProvider.jsx`
   - Contexts: `RealtimePlanProvider`, `RealtimeBossProvider`, `RealtimeJobProvider`, `EnhancedMitigationProvider`, `CollaborationProvider`
   - **Critical**: Always wraps with `planId` prop for Firebase synchronization

**Important**: When working with real-time features, always use the Realtime variants of contexts. The `MitigationPlanner` component dynamically switches between these systems based on plan type.

### Service Layer Architecture

#### Unified Plan Service Pattern
The codebase uses a **unified service layer** that routes between Firebase and localStorage:

- **`unifiedPlanService.js`**: Routes operations based on user state (authenticated vs anonymous)
- **`realtimePlanService.js`**: Firebase Realtime Database operations with live sync
- **`localStoragePlanService.js`**: Browser localStorage for anonymous users
- **`planAccessService.js`**: Tracks plan ownership and access patterns

When implementing plan-related features, **always use `unifiedPlanService`** rather than calling Firebase or localStorage directly.

### Cooldown Management System

The **Enhanced Cooldown System** (`src/utils/cooldown/`) is the core mitigation logic:

#### Key Components
- **`cooldownManager.js`**: Central orchestrator for ability availability
- **`chargesTracker.js`**: Manages abilities with multiple charges (e.g., Tetragrammaton)
- **`instancesTracker.js`**: Tracks multiple instances of same ability
- **`aetherflowTracker.js`**: Scholar-specific Aetherflow stack management
- **`realtimeSync.js`**: Firebase synchronization for cooldown state

#### Critical Concepts
- Abilities can have **charges** (multiple uses before cooldown) or **instances** (separate cooldown timers)
- **Role-shared abilities**: Some abilities share cooldowns across job roles
- **Tank-specific abilities**: Self-target abilities are position-aware (MT/OT)
- **Duration windows**: Mitigations apply to all boss actions within their duration
- **Shared cooldown groups**: Abilities like Bloodwhetting and Nascent Flash share cooldowns

When modifying mitigation logic, always update the cooldown manager and ensure changes sync via `realtimeSync.js`.

### State Flow for Real-time Features

```
User Action
  ↓
Component Event Handler
  ↓
Realtime Context Action (e.g., RealtimeMitigationContext)
  ↓
Service Layer (realtimePlanService with debouncing)
  ↓
Firebase Realtime Database
  ↓
Firebase Real-time Broadcast
  ↓
All Connected Clients (via Firebase listeners)
  ↓
Context State Update
  ↓
Component Re-render
```

## Key Data Structures

### Boss Actions
Defined in `src/data/bosses/`:
- Each boss has a JSON file (e.g., `ketudukeActions.json`)
- Actions include: `id`, `name`, `time`, `tags` (damage type), `target` (single/party/tank)
- Boss data aggregated in `src/data/bosses/bossData.js`

### Job Abilities
Defined in `src/data/abilities/mitigationAbilities.js`:
- Organized by job/role
- Properties: `id`, `name`, `cooldown`, `duration`, `mitigation`, `levelRequired`, `charges`, `maxCharges`
- Use `abilityUtils.js` for level-based ability filtering

### Plan Structure (Firebase)
```
/plans/{planId}/
  metadata/
    name, bossId, createdAt, updatedAt, ownerId, accessedBy[]
  data/
    selectedJobs, tankPositions, assignments, bossId
  collaboration/
    activeUsers/{sessionId}/ - Current editors
    changes/{changeId}/ - Change tracking
```

## Critical Implementation Patterns

### Adding Real-time Collaboration to Features
When adding collaborative features:

1. Create a Realtime context variant (e.g., `RealtimeXContext.jsx`)
2. Use Firebase `onValue` listeners for real-time updates
3. Implement optimistic updates with conflict resolution
4. Add to `RealtimeAppProvider.jsx` context hierarchy
5. Update `realtimePlanService.js` for persistence

### Tank Position System
- Tank mitigations require MT/OT position assignment
- Self-target abilities (e.g., Rampart) auto-assign to correct tank
- Single-target abilities on dual-tank busters show selection modal
- Shared abilities (e.g., Bloodwhetting/Nascent Flash) have linked cooldowns

### Anonymous User Support
- Anonymous users get full editing capabilities
- Plans stored in localStorage with Firebase-compatible structure
- `anonymousUserService.js` manages temporary user identities
- `planMigrationService.js` handles account creation with plan transfer

## Important Files to Review

### Core Application
- `src/App.jsx` - Routing and authentication guards
- `src/components/planner/MitigationPlanner.jsx` - Main planning interface
- `src/contexts/RealtimeAppProvider.jsx` - Real-time context setup

### Collaboration System
- `src/contexts/CollaborationContext.jsx` - Session management
- `src/components/collaboration/` - Active users, sharing UI
- `src/services/sessionManager.js` - Session lifecycle

### Mitigation Logic
- `src/utils/cooldown/cooldownManager.js` - Core availability logic
- `src/contexts/EnhancedMitigationContext.jsx` - Mitigation state management
- `src/utils/mitigation/autoAssignmentUtils.js` - Auto-optimization algorithm

## Environment Setup

### Required Environment Variables
Create `.env.local` with Firebase configuration:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase configuration is loaded via `src/config/firebase.js`.

## Testing Strategy

### Test Structure
- **Unit Tests**: Individual utility functions and components
- **Integration Tests**: Context interactions and service layer
- **Performance Tests**: Real-time sync under load
- Test files colocated with source (`.test.jsx` or `__tests__/` directories)

### Testing Real-time Features
- Use `src/tests/setup.js` for Firebase mock setup
- Tests run with Vitest + React Testing Library + jsdom
- Mock Firebase with in-memory data structures for deterministic tests

## Common Pitfalls

### Context Mixing
**Never import both Legacy and Realtime contexts in the same component.** The `MitigationPlanner` handles switching between systems.

### Direct Firebase Calls
**Always use service layer** (`unifiedPlanService`, `realtimePlanService`) instead of direct Firebase SDK calls. This ensures proper error handling, debouncing, and state management.

### Cooldown State Inconsistency
When updating assignments, **always recalculate cooldown state** through `cooldownManager` to maintain consistency across real-time updates.

### Tank Position Assumptions
**Never assume tank positions are set.** Always check `tankPositions` context and handle cases where MT/OT are undefined.

## Documentation Resources

Comprehensive documentation available in `/documentation`:
- `01-feature-inventory.md` - Complete feature list
- `02-technical-implementation.md` - Implementation details
- `03-architecture-overview.md` - System architecture diagrams
- `05-database-schema.md` - Firebase data structures
- `07-troubleshooting.md` - Common issues and solutions

## Build Configuration

- **Build Tool**: Vite 7 with React plugin
- **Styling**: Tailwind CSS 4 (configured in `src/tailwind.css`)
- **Package Manager**: Bun (npm also supported)
- **Target**: Modern browsers with ES2020+
- **Bundle**: Chunk size warning at 1600KB (configured in `vite.config.js`)

## Deployment

- **Hosting**: Vercel for frontend, Firebase for database
- **Build**: Automatic on push to main branch
- **Security**: Pre-deployment security check runs via `scripts/security-check.js`
- **Analytics**: Vercel Analytics + Speed Insights integrated

## Special Systems

### Aetherflow Tracking (Scholar)
Scholar's Aetherflow system tracks stacks (0-3) with automatic 60s refresh based on timeline timing. Abilities like Lustrate and Indomitability consume stacks, tracked via `aetherflowTracker.js`.

### Charge System
Abilities with charges (e.g., Essential Dignity, Tetragrammaton) allow multiple uses before cooldown. Tracked separately from regular cooldowns via `chargesTracker.js`.

### Timeline System
Custom timelines can be created and shared:
- `src/components/timeline/TimelineEditor.jsx` - Timeline creation UI
- `src/services/timelineService.js` - Timeline CRUD operations
- Plans can be created from both official boss timelines and custom user timelines
