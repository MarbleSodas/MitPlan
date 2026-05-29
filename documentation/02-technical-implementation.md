# MitPlan Technical Implementation Guide

## Overview
This document provides detailed technical information about how each feature in MitPlan is implemented, including file locations, key functions, data structures, and integration patterns.

## Core System Architecture

### Application Entry Point
**File**: `src/main.tsx`
- React 19 application bootstrap
- StrictMode wrapper for development
- Root DOM rendering

**File**: `src/App.tsx`
- Main application component with routing
- Global providers setup (Theme, Auth, Plan)
- Route protection and navigation logic

### Routing System
### Routing System
**Implementation**: React Router v7
**Key Files**:
- `src/App.tsx` - Main routing configuration with lazy-loaded routes
- `src/components/guards/` - Route protection components

**Route Structure**:
```javascript
// Public routes
/ -> LandingPage (redirects to /dashboard if authenticated)
/plan/view/:viewToken -> ConsolidatedView (public read-only frozen snapshot)

// Protected routes (authenticated users)
/dashboard -> Dashboard
/planner -> MitigationPlanner

// Plan editing routes (authenticated users)
/plan/edit/:planId -> MitigationPlanner
/planner/:planId -> MitigationPlanner
/plan/:planId -> MitigationPlanner
/plan/shared/:planId -> MitigationPlanner (isSharedPlan=true)

// Timeline routes (authenticated users)
/timeline/browse -> TimelineBrowser
/timeline/create -> TimelineCreateHub
/timeline/create/editor -> TimelineEditor
/timeline/edit/:timelineId -> TimelineEditor
/timeline/view/:timelineId -> TimelineViewer
/timeline/shared/:timelineId -> TimelineViewer (isShared=true)
```
## Feature Implementation Details

### 1. Mitigation Planning System

#### Core Components
#### Core Components
**File**: `src/components/planner/MitigationPlanner.tsx`
- Main planning interface
- Drag and drop context setup
- Real-time collaboration integration
- State management coordination

**File**: `src/components/planner/MobileBossTimeline.tsx`
- Mobile-specific boss timeline
- Bottom sheet mitigation selector
- Phase overrides panel integration

**File**: `src/components/planner/PhaseOverridesPanel.tsx`
- Phase override editing interface
- Phase anchor management
- Multi-hit sequence handling

**File**: `src/components/BossActionItem/BossActionItem.tsx`
- Individual boss action display
- Drop zone for mitigation abilities
- Mitigation percentage calculation
- Visual state management (selected/highlighted)
- Health projection integration

**File**: `src/components/MitigationItem/MitigationItem.tsx`
- Draggable mitigation ability component
- Cooldown status visualization
- Availability indicators (blue/red borders)
#### Drag and Drop System
**Implementation**: `src/components/planner/MitigationPlanner.tsx`
- Owns drag start/end handlers
- Integrates with @dnd-kit
- Triggers tank/class selection modals
- Coordinates mitigation assignment processing

**File**: `src/components/DragAndDrop/Draggable/Draggable.tsx`
- Reusable draggable wrapper component
- @dnd-kit integration
- Visual feedback during drag

#### State Management
**File**: `src/contexts/EnhancedMitigationContext.tsx`
- Mitigation assignment state
- Cooldown tracking integration
- Real-time synchronization

### 2. Cooldown Management System

#### Core Manager
#### Core Manager
**File**: `src/utils/cooldown/cooldownManager.ts`
- Main cooldown management class
- Cache optimization for performance
- Integration with specialized trackers
- Real-time sync support

**Key Class**: `CooldownManager`
```typescript
class CooldownManager {
  constructor(bossActions: BossAction[], bossLevel: number, selectedJobs: SelectedJobs, tankPositions: TankPositions)
  isAbilityAvailable(abilityId: string, targetTime: number, assignments: Assignment[]): boolean
  getUsageHistory(abilityId: string, assignments: Assignment[]): Assignment[]
  clearCache(): void // Performance optimization
  syncWithRealtime(assignments: Assignment[]): void // Real-time collaboration sync
}
```
#### Specialized Trackers
**File**: `src/utils/cooldown/chargesTracker.ts`
- Multi-charge ability tracking (e.g., Benediction)
- Charge consumption and regeneration logic

**File**: `src/utils/cooldown/instancesTracker.ts`
- Role-shared ability instance management
- Multiple player tracking for same ability

**File**: `src/utils/cooldown/aetherflowTracker.ts`
- Scholar's Aetherflow stack system (0-3 stacks)
- Automatic 60-second refresh timing
- Stack consumption tracking

**File**: `src/utils/cooldown/lilyTracker.ts`
- White Mage's Lily system tracking
- Blood Lily accumulation

**File**: `src/utils/cooldown/addersgallTracker.ts`
- Sage's Addersgall tracking (0-3 charges)
- Automatic 20-second refresh timing

**Key Classes/Functions**:
```typescript
// ChargesTracker
getChargeInfo(abilityId: string, targetTime: number, assignments: Assignment[]): ChargeInfo
canUseAbility(abilityId: string, targetTime: number, assignments: Assignment[]): boolean

// InstancesTracker
getInstanceInfo(abilityId: string, targetTime: number, assignments: Assignment[], selectedJobs: SelectedJobs): InstanceInfo
assignUsagesToInstances(instances: Instance[], usages: Usage[], cooldownDuration: number): Assignment[]

// AetherflowTracker
calculateStacksAtTime(targetTime: number, assignments: Assignment[]): number
canUseAbility(abilityId: string, targetTime: number, assignments: Assignment[]): boolean
refreshAetherflowStacks(time: number): void

// LilyTracker
calculateLiliesAtTime(targetTime: number, assignments: Assignment[]): LilyState
getBloodLilyProgression(targetTime: number, assignments: Assignment[]): number

// AddersgallTracker
calculateChargesAtTime(targetTime: number, assignments: Assignment[]): number
canUseAbility(abilityId: string, targetTime: number, assignments: Assignment[]): boolean
refreshAddersgallCharges(time: number): void
```

### 3. Job System Implementation

#### Job Data Structure
**File**: `src/data/jobs/jobData.ts`
- FFXIV job definitions by role
- Job metadata (id, name, icon, selection state)

**Data Structure**:
```javascript
export const ffxivJobs = {
  tank: [
    { id: 'PLD', name: 'Paladin', icon: '/jobs-new/paladin.png', selected: false },
    // ... other tanks
  ],
  healer: [/* healer jobs */],
  melee: [/* melee DPS jobs */],
  ranged: [/* ranged DPS jobs */],
  caster: [/* caster DPS jobs */]
}
```

#### Job Selection Component
**File**: `src/features/jobs/JobSelector/JobSelector.tsx`
- Role-based job organization
- Real-time job selection synchronization
- Visual job selection interface

**File**: `src/contexts/RealtimeJobContext.tsx`
- Job selection state management
- Real-time synchronization with Firebase

### 4. Mitigation Abilities System

#### Ability Data Structure
**File**: `src/data/abilities/mitigationAbilities.js`
- Comprehensive FFXIV ability database
- Level-based ability variations
- Targeting and mitigation type definitions

**Ability Schema**:
```javascript
{
  id: 'ability_id',
  name: 'Ability Name',
  description: 'Ability description',
  levelRequirement: 50,
  levelDescriptions: { 50: 'Level 50 description' },
  duration: 10,
  cooldown: 120,
  jobs: ['PLD', 'WAR'],
  icon: '/abilities-gamerescape/ability.png',
  type: 'mitigation', // 'invulnerability', 'barrier', etc.
  mitigationValue: 0.20, // 20% mitigation
  damageType: 'both', // 'magical', 'physical', 'both'
  target: 'self', // 'single', 'party', 'area'
  forTankBusters: true,
  forRaidWide: true,
  isRoleShared: false, // Multiple instances for role
  count: 1, // Number of charges
  consumesAetherflow: false, // Scholar Aetherflow system
  isAetherflowProvider: false
}
```

### 5. Boss System Implementation

#### Boss Data Structure
**File**: `src/data/bosses/bossActions.js`
- Boss action imports and mapping
- Individual boss action JSON files

**Boss Action Schema**:
```javascript
{
  id: 'action_id',
  name: 'Action Name',
  time: 120, // Seconds from fight start
  description: 'Action description',
  unmitigatedDamage: '100,000',
  damageType: 'magical', // 'physical', 'magical'
  importance: 'high', // 'critical', 'high', 'medium', 'low'
  icon: '⚔️',
  isTankBuster: true,
  isDualTankBuster: false
}
```

#### Boss Context Management
**File**: `src/contexts/RealtimeBossContext.tsx`
- Boss selection state
- Boss action filtering and processing
- Timeline management

### 6. Real-Time Collaboration System
### 6. Real-Time Collaboration System:

#### Core Collaboration Context
**File**: `src/contexts/CollaborationContext.tsx`
- Session management
- Real-time user tracking
- Change origin tracking
- Performance optimization with batching

#### Presence Context
**File**: `src/contexts/PresenceContext.tsx`
- Live cursor position tracking
- Section presence indicators
- Collaborator state synchronization
- Selection indicators for shared editing

**Key Functions**:
```typescript
joinCollaborativeSession(planId: string, userDisplayName: string): Promise<void>
leaveCollaborativeSession(): void
debouncedUpdate(planId: string, updates: PlanUpdates, userId: string, sessionId: string): void
batchUpdate(planId: string, updates: PlanUpdates, userId: string, sessionId: string): void
updatePresence(cursorPosition: CursorPosition): void
subscribeToPresence(planId: string, callback: PresenceCallback): () => void
```

#### Presence Service
**File**: `src/services/presenceService.ts`
- Firebase-based presence synchronization
- Cursor position broadcasting
- Section visibility tracking
- Collaborator heartbeat management

**Key Functions**:
```typescript
initializePresence(planId: string, userId: string, displayName: string): Promise<PresenceSession>
updateCursorPosition(position: CursorPosition): void
updateSectionPresence(sections: SectionId[]): void
subscribeToPresenceUpdates(planId: string, callback: (users: PresenceUser[]) => void): Unsubscribe
cleanupPresence(): Promise<void>
```
#### Session Management Service
**File**: `src/services/sessionManager.ts`
- Firebase session lifecycle management
- Heartbeat system for connection monitoring
- Automatic cleanup of inactive sessions
- Presence synchronization

**Key Class**: `SessionManager`
```typescript
class SessionManager {
  startSession(planId: string, sessionId: string, userData: UserData): Promise<void>
  endSession(sessionId: string): Promise<void>
  startHeartbeat(planId: string, sessionId: string): void
  stopHeartbeat(): void
  subscribeToSessions(planId: string, callback: SessionCallback): Unsubscribe
  cleanupInactiveSessions(planId: string): Promise<void>
}
```

#### Real-Time Plan Service
**File**: `src/services/realtimePlanService.ts`
- Firebase Realtime Database operations
- Plan CRUD operations
- Batch update optimization
- Change tracking and conflict resolution
- Timeline layout management
- Phase override support

**Key Functions**:
```typescript
createPlan(userId: string, planData: PlanData): Promise<Plan>
updatePlanRealtime(planId: string, updates: PlanUpdates, userId: string, sessionId: string): Promise<void>
batchUpdatePlanRealtime(planId: string, updates: PlanUpdates, userId: string, sessionId: string): Promise<void>
subscribeToPlan(planId: string, callback: PlanCallback): Unsubscribe
updatePhaseOverrides(planId: string, overrides: PhaseOverride[]): Promise<void>
```

### 7. Health Projection System

#### Health Projection Utilities
**File**: `src/utils/health/healthProjectionUtils.ts`
- Calculate player health after boss mechanics
- Estimate required healing based on damage taken
- Damage projection based on mitigation assigned

**File**: `src/utils/health/healthBarUtils.ts`
- Health bar display calculations
- Color coding for health thresholds
- Healing amount visualization

#### Health Components
**File**: `src/components/common/HealingHealthBar/HealingHealthBar.tsx`
- Visual health bar component
- Damage and healing projection display
- Threshold indicators

### 8. Timeline System

#### Timeline Utilities
**File**: `src/utils/timeline/adaptiveTimelineUtils.ts`
- Adaptive timeline layout generation
- Phase-aware timeline construction
- Dynamic spacing for action rows

**File**: `src/utils/timeline/phaseOverrideResolver.ts`
- Resolve phase overrides for boss encounters
- Phase anchor management
- Multi-hit sequence detection

**File**: `src/utils/timeline/planTimelineLayoutUtils.ts`
- Plan-specific timeline layout optimization
- Timeline zoom and pan support
- Mitigation assignment positioning

#### Timeline Services
**File**: `src/services/timelineService.ts`
- Timeline CRUD operations
- Public/private timeline management
- Timeline accuracy analysis (cactbot + FF Logs)

### 9. Plan Access System

#### Plan Access Service
**File**: `src/services/planAccessService.ts`
- Plan sharing and access control
- Edit token management
- View token generation
- Access history tracking

**Key Functions**:
```typescript
createEditLink(planId: string, userId: string): Promise<string>
createViewLink(planId: string): Promise<string>
checkAccessLevel(planId: string, userId: string): AccessLevel
recordAccess(planId: string, userId: string, accessType: AccessType): Promise<void>
```

### 10. Authentication System
### 10. Authentication System

#### Authentication Context
**File**: `src/contexts/AuthContext.tsx`
- Firebase Authentication integration
- Account migration handling for legacy local plans
- User session management

**Key Functions**:
```typescript
logout(): Promise<void>
checkForPendingMigration(): Promise<MigrationResult | null>
```

### 11. Data Persistence Layer

#### Unified Plan Service
**File**: `src/services/unifiedPlanService.ts`
- Firebase-backed facade for plan operations
- Maintains current authenticated user context

**Key Class**: `UnifiedPlanService`
```typescript
class UnifiedPlanService {
  async createPlan(planData: PlanData): Promise<Plan>
  async updatePlan(planId: string, updates: PlanUpdates): Promise<void>
  async updatePlanRealtime(planId: string, updates: PlanUpdates, userId: string, sessionId: string): Promise<void>
  async deletePlan(planId: string): Promise<void>
  async getUserPlans(): Promise<Plan[]>
  supportsRealtime(): boolean
  supportsSharing(): boolean
}
```

#### Firebase Plan Service
**File**: `src/services/realtimePlanService.ts`
- Firebase-specific plan operations
- Real-time subscription management
- Access control and ownership tracking

### 12. Theme System Implementation

#### Theme Context
**File**: `src/contexts/ThemeContext.tsx`
- Theme state management
- Light/dark mode switching
- Persistent theme storage
- CSS custom property integration

#### Global Styling
**File**: `src/tailwind.css`
- CSS custom properties for themes
- Responsive utilities
- Dark mode overrides
- Tailwind CSS v4 configuration
- Shadcn UI integration

### 13. Mobile Responsiveness

#### Mobile Components
**File**: `src/components/planner/MobileBossTimeline.tsx`
- Mobile-specific boss timeline
- Bottom sheet mitigation selector
- Touch-optimized interactions
- Phase overrides panel for mobile

#### Mobile Bottom Sheet
**File**: `src/components/planner/MitigationBottomSheet.tsx`
- Bottom-up mitigation ability selector
- Touch-friendly drag and drop
- Collapsible panel for mobile

## Performance Optimizations

### Caching Systems
- **Cooldown Cache**: `src/utils/cooldown/cooldownManager.ts`
- **Component Memoization**: React.memo usage throughout
- **Context Optimization**: Selective context subscriptions

### Database Optimizations
- **Batched Writes**: Grouped Firebase operations
- **Debounced Updates**: Reduced API call frequency
- **Optimistic Updates**: Immediate UI feedback

### Bundle Optimization
- **Code Splitting**: Route-based lazy loading
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and icon optimization

## Testing Strategy

### Test Files Location
**Directory**: `src/tests/`
- Unit tests for utility functions
- Integration tests for complex workflows
- Mock data for testing scenarios

### Testing Tools
- **Vitest**: Test runner and framework
- **React Testing Library**: Component testing
- **Firebase Emulator**: Backend testing

This technical implementation guide provides developers with the detailed information needed to understand, maintain, and extend the MitPlan application's codebase.
