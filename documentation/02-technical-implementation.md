# MitPlan Technical Implementation Guide

## Overview
This document provides detailed technical information about how each feature in MitPlan is implemented, including file locations, key functions, data structures, and integration patterns.

## Core System Architecture

### Application Entry Point
**File**: `src/main.jsx`
- React 18 application bootstrap
- StrictMode wrapper for development
- Root DOM rendering

**File**: `src/App.jsx`
- Main application component with routing
- Global providers setup (Theme, Auth, Plan)
- Route protection and navigation logic

### Routing System
**Implementation**: React Router v6
**Key Files**:
- `src/App.jsx` - Main routing configuration
- `src/components/routing/AppRouter.jsx` - Alternative router implementation
- `src/components/guards/UnauthenticatedPlanGuard.jsx` - Route protection

**Route Structure**:
```javascript
// Public routes
/ -> LandingPage (redirects to /dashboard if authenticated)

// Protected routes (authenticated users)
/dashboard -> Dashboard
/planner -> MitigationPlanner

// Plan editing routes (both authenticated and anonymous)
/plan/edit/:planId -> MitigationPlanner
/planner/:planId -> MitigationPlanner
/plan/:planId -> MitigationPlanner

// Shared plan routes
/plan/shared/:planId -> MitigationPlanner (isSharedPlan=true)

// Anonymous routes
/anonymous -> AnonymousDashboard
/anonymous/planner -> MitigationPlanner (isAnonymous=true)
/anonymous/plan/:planId -> MitigationPlanner (isAnonymous=true)
```

## Feature Implementation Details

### 1. Mitigation Planning System

#### Core Components
**File**: `src/components/planner/MitigationPlanner.jsx`
- Main planning interface
- Drag and drop context setup
- Real-time collaboration integration
- State management coordination

**File**: `src/components/BossActionItem/BossActionItem.jsx`
- Individual boss action display
- Drop zone for mitigation abilities
- Mitigation percentage calculation
- Visual state management (selected/highlighted)

**File**: `src/components/MitigationItem/MitigationItem.jsx`
- Draggable mitigation ability component
- Cooldown status visualization
- Availability indicators (blue/red borders)

#### Drag and Drop System
**File**: `src/hooks/useDragAndDrop.js`
- Custom hook for drag and drop logic
- Integration with @dnd-kit library
- Tank selection modal triggering
- Mitigation assignment processing

**Key Functions**:
```javascript
handleDragStart(event) // Sets active mitigation
handleDragEnd(event) // Processes drop and assignment
processMitigationAssignment() // Handles assignment logic
```

**File**: `src/components/dnd/Draggable/Draggable.jsx`
- Reusable draggable wrapper component
- @dnd-kit integration
- Visual feedback during drag

#### State Management
**File**: `src/contexts/MitigationContext.jsx` (Legacy)
**File**: `src/contexts/EnhancedMitigationContext.jsx` (Current)
- Mitigation assignment state
- Cooldown tracking integration
- Real-time synchronization

### 2. Cooldown Management System

#### Core Manager
**File**: `src/utils/cooldown/cooldownManager.js`
- Main cooldown management class
- Cache optimization for performance
- Integration with specialized trackers

**Key Class**: `CooldownManager`
```javascript
class CooldownManager {
  constructor(bossActions, bossLevel, selectedJobs, tankPositions)
  isAbilityAvailable(abilityId, targetTime, assignments)
  getUsageHistory(abilityId, assignments)
  clearCache() // Performance optimization
}
```

#### Specialized Trackers
**File**: `src/utils/cooldown/chargesTracker.js`
- Multi-charge ability tracking (e.g., Benediction)
- Charge consumption and regeneration logic

**File**: `src/utils/cooldown/instancesTracker.js`
- Role-shared ability instance management
- Multiple player tracking for same ability

**File**: `src/utils/cooldown/aetherflowTracker.js`
- Scholar's Aetherflow stack system (0-3 stacks)
- Automatic 60-second refresh timing
- Stack consumption tracking

**Key Classes**:
```javascript
class ChargesTracker {
  getChargeInfo(abilityId, targetTime, assignments)
  canUseAbility(abilityId, targetTime, assignments)
}

class InstancesTracker {
  getInstanceInfo(abilityId, targetTime, assignments, selectedJobs)
  assignUsagesToInstances(instances, usages, cooldownDuration)
}

class AetherflowTracker {
  calculateStacksAtTime(targetTime, assignments)
  canUseAbility(abilityId, targetTime, assignments)
  refreshAetherflowStacks(time)
}
```

### 3. Job System Implementation

#### Job Data Structure
**File**: `src/data/jobs/jobData.js`
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
**File**: `src/features/jobs/JobSelector/JobSelector.jsx`
- Role-based job organization
- Real-time job selection synchronization
- Visual job selection interface

**File**: `src/contexts/JobContext.jsx` (Legacy)
**File**: `src/contexts/RealtimeJobContext.jsx` (Current)
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
**File**: `src/contexts/BossContext.jsx`
- Boss selection state
- Boss action filtering and processing
- Timeline management

### 6. Real-Time Collaboration System

#### Core Collaboration Context
**File**: `src/contexts/CollaborationContext.jsx`
- Session management
- Real-time user tracking
- Change origin tracking
- Performance optimization with batching

**Key Functions**:
```javascript
joinCollaborativeSession(planId, userDisplayName)
leaveCollaborativeSession()
debouncedUpdate(planId, updates, userId, sessionId)
batchUpdate(planId, updates, userId, sessionId)
```

#### Session Management Service
**File**: `src/services/sessionManager.js`
- Firebase session lifecycle management
- Heartbeat system for connection monitoring
- Automatic cleanup of inactive sessions

**Key Class**: `SessionManager`
```javascript
class SessionManager {
  startSession(planId, sessionId, userData)
  endSession(sessionId)
  startHeartbeat(planId, sessionId)
  subscribeToSessions(planId, callback)
  cleanupInactiveSessions(planId)
}
```

#### Real-Time Plan Service
**File**: `src/services/realtimePlanService.js`
- Firebase Realtime Database operations
- Plan CRUD operations
- Batch update optimization
- Change tracking and conflict resolution

**Key Functions**:
```javascript
createPlan(userId, planData)
updatePlanRealtime(planId, updates, userId, sessionId)
batchUpdatePlanRealtime(planId, updates, userId, sessionId)
subscribeToPlan(planId, callback)
```

### 7. Authentication System

#### Authentication Context
**File**: `src/contexts/AuthContext.jsx`
- Firebase Authentication integration
- Anonymous user management
- Account migration handling

**Key Functions**:
```javascript
initializeAnonymousUser(displayName)
enableAnonymousMode()
disableAnonymousMode()
getCurrentUser() // Returns authenticated or anonymous user
```

#### Anonymous User Service
**File**: `src/services/anonymousUserService.js`
- Anonymous user lifecycle management
- Local storage persistence
- Display name generation
- Plan access tracking

**Key Class**: `AnonymousUser`
```javascript
class AnonymousUser {
  static initialize()
  setDisplayName(name)
  addPlan(planId)
  trackPlanAccess(planId, accessType)
  exportForMigration()
}
```

### 8. Data Persistence Layer

#### Unified Plan Service
**File**: `src/services/unifiedPlanService.js`
- Abstraction layer for different storage backends
- Automatic fallback between Firebase and localStorage
- Mode switching based on authentication state

**Key Class**: `UnifiedPlanService`
```javascript
class UnifiedPlanService {
  async createPlan(planData)
  async updatePlan(planId, updates)
  async updatePlanRealtime(planId, updates, userId, sessionId)
  async deletePlan(planId)
  async getUserPlans()
  supportsRealtime()
  supportsSharing()
}
```

#### Firebase Plan Service
**File**: `src/services/firebasePlanService.js`
- Firebase-specific plan operations
- Real-time subscription management
- Access control and ownership tracking

#### Local Storage Plan Service
**File**: `src/services/localStoragePlanService.js`
- Browser localStorage operations
- Offline functionality
- Data serialization and validation

### 9. Theme System Implementation

#### Theme Context
**File**: `src/contexts/ThemeContext.jsx`
- Theme state management
- Light/dark mode switching
- Persistent theme storage
- CSS custom property integration

**Theme Structure**:
```javascript
const lightTheme = {
  colors: {
    primary: '#3399ff',
    background: '#f5f5f5',
    text: '#333333',
    // ... other colors
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1200px',
    // ... other breakpoints
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px',
    // ... responsive spacing
  }
}
```

#### Global Styling
**File**: `src/styles/global.css`
- CSS custom properties for themes
- Responsive utilities
- Dark mode overrides
- Accessibility enhancements

### 10. Mobile Responsiveness

#### Device Detection
**File**: `src/hooks/useDeviceDetection.js`
- Mobile device detection
- Responsive breakpoint monitoring
- Throttled resize handling

#### Mobile Components
**File**: `src/components/mobile/MobileMitigationSelector/MobileMitigationSelector.jsx`
- Mobile-specific mitigation selector
- Bottom capsule view
- Touch-optimized interactions

#### Responsive Styled Components
**Files**: `src/components/styled/*.jsx`
- Responsive component definitions
- Breakpoint-based styling
- Mobile-first design approach

## Performance Optimizations

### Caching Systems
- **Cooldown Cache**: `src/utils/cooldown/cooldownManager.js`
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
