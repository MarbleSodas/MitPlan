# Presence System Documentation

## Overview

The Presence System provides real-time awareness of collaborators in a planning session. It tracks cursor positions, active targets, interaction states, and viewport information, enabling features like live cursors, selection indicators, and section presence pills.

**Key Capabilities:**
- Live cursor tracking with throttled updates (75ms)
- Active target tracking with interaction states (hovering, selected, editing)
- Viewport/section presence (users viewing specific UI sections)
- Sticky presence for selected/editing states (heartbeat every 10s)
- Automatic cleanup on disconnect
- 30-second staleness timeout

## Architecture

### Component Hierarchy

```
CollaborationProvider (CollaborationContext.tsx)
    └── PresenceProvider (PresenceContext.tsx)
            └── PresenceContext
                    ├── Cursor tracking
                    ├── Active target tracking
                    ├── Interaction management
                    └── Viewport tracking
```

### Data Flow

```
User Action
    ↓
setActiveTarget / setCursor / setInteraction / setViewport
    ↓
updateMyPresence() → applyPresencePatch()
    ↓
publishPresence() (debounced based on channel)
    ↓
updatePresence() → Firebase RTDB
    ↓
subscribeToPresence() → All connected clients
    ↓
presenceMap update → UI components re-render
```

## Type Definitions

### Core Types (from `src/types/presence.ts`)

```typescript
// Collaboration surfaces
export type CollaborationSurface = 'planner' | 'timeline';

// Interaction states
export type CollaborationInteraction = 'hovering' | 'selected' | 'editing';

// Tracked entity types
export type PresenceEntityType =
  | 'assignment'
  | 'bossAction'
  | 'healthSetting'
  | 'job'
  | 'mitigation'
  | 'planMeta'
  | 'tankPosition'
  | 'timelineBossTag'
  | 'timelineEvent'
  | 'timelineLibrary'
  | 'timelineMeta';

// Presence target (what a user is focused on)
export interface PresenceTarget {
  surface: CollaborationSurface;
  entityType: PresenceEntityType;
  entityId: string;
  field?: string | null;
  slotId?: string | null;
  panel?: string | null;
  section?: string | null;
  key: string; // Composite key: "surface|entityType|entityId|field|slotId"
}

// Cursor position
export interface CursorPresence {
  surface: CollaborationSurface;
  x: number;
  y: number;
  panel?: string | null;
  containerWidth?: number | null;
  containerHeight?: number | null;
}

// Viewport/section information
export interface ViewportPresence {
  surface: CollaborationSurface;
  panel?: string | null;
  section?: string | null;
  scrollTop?: number | null;
}

// Full presence data for a user
export interface UserPresenceData {
  activeTarget: PresenceTarget | null;
  interaction: CollaborationInteraction | null;
  cursor: CursorPresence | null;
  viewport: ViewportPresence | null;
  lastUpdated: number;
}

// Enriched presence with user info (from collaborator map)
export interface UserPresence extends UserPresenceData {
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
}

// Presence for a specific target
export interface TargetPresence {
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
  isCurrentUser: boolean;
  interaction: CollaborationInteraction | null;
  target: PresenceTarget;
}

// Context value interface
export interface PresenceContextValue {
  presenceMap: Map<string, UserPresence>;
  isConnected: boolean;
  collaborationAvailable: boolean;
  collaborationError: string | null;
  currentSessionId: string | null;
  setActiveTarget: (target: PresenceTarget | null) => void;
  setInteraction: (interaction: CollaborationInteraction | null) => void;
  setCursor: (cursor: CursorPresence | null) => void;
  setViewport: (viewport: ViewportPresence | null) => void;
  getPresenceForTarget: (targetKey: string) => TargetPresence[];
  isTargetActiveByOthers: (targetKey: string, interaction?: CollaborationInteraction) => boolean;
  getMyPresence: () => UserPresenceData | null;
}
```

### Constants

```typescript
// User colors for presence indicators
export const USER_COLORS: readonly string[] = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  // ... 24 total colors
];

export const MAX_USERS_PER_PLAN = 24;

// Throttling delays per channel
export const PRESENCE_THROTTLE = {
  activity: 0,    // Immediate
  cursor: 75,     // 75ms
  viewport: 300,  // 300ms
} as const;

export const PRESENCE_STALE_TIMEOUT = 30000; // 30 seconds
export const PRESENCE_HEARTBEAT_INTERVAL = 10000; // 10 seconds

export const EMPTY_PRESENCE_DATA: UserPresenceData = {
  activeTarget: null,
  interaction: null,
  cursor: null,
  viewport: null,
  lastUpdated: 0,
};
```

## Firebase Path Structure

### Collaboration Paths (from `src/services/collaborationPaths.ts`)

```
/planCollaboration/plan:{planId}/
├── activeUsers/          # CollaborationContext active users
│   └── {sessionId}/
│       ├── userId
│       ├── displayName
│       └── ...
├── presence/             # Presence data (this system)
│   └── {sessionId}/
│       ├── activeTarget/
│       │   ├── surface: "planner"
│       │   ├── entityType: "bossAction"
│       │   ├── entityId: "tidal_roar_1"
│       │   ├── key: "planner|bossAction|tidal_roar_1||"
│       │   ├── panel: "timeline"
│       │   └── section: "timeline"
│       ├── interaction: "selected"
│       ├── cursor/
│       │   ├── surface: "planner"
│       │   ├── x: 450
│       │   ├── y: 320
│       │   ├── panel: "timeline"
│       │   └── containerWidth: 800
│       ├── viewport/
│       │   ├── surface: "planner"
│       │   ├── panel: "timeline"
│       │   ├── section: "timeline"
│       │   └── scrollTop: 150
│       └── lastUpdated: 1703123456789
└── jobAssignments/        # Job assignment sync
    └── {jobId}/
```

### Timeline Collaboration

```
/planCollaboration/timeline:{timelineId}/
├── activeUsers/
├── presence/
│   └── {sessionId}/
│       ├── activeTarget/
│       │   ├── surface: "timeline"
│       │   ├── entityType: "timelineEvent"
│       │   ├── entityId: "event_123"
│       │   └── section: "timeline"
│       └── ...
└── jobAssignments/
```

## Context API

### Hook Usage

```typescript
import { usePresence } from '../../contexts/PresenceContext';

// Basic usage
const {
  presenceMap,           // Map<sessionId, UserPresence>
  isConnected,           // boolean - connected to presence
  collaborationAvailable,// boolean - feature available
  collaborationError,    // string | null
  currentSessionId,       // string | null
  setActiveTarget,        // (target) => void
  setInteraction,         // (interaction) => void
  setCursor,              // (cursor) => void
  setViewport,            // (viewport) => void
  getPresenceForTarget,   // (targetKey) => TargetPresence[]
  isTargetActiveByOthers, // (targetKey, interaction?) => boolean
  getMyPresence,          // () => UserPresenceData | null
} = usePresence();

// For optional presence (when provider might not exist)
import { usePresenceOptional } from '../../contexts/PresenceContext';
const presence = usePresenceOptional(); // Returns null if outside provider
```

### Setting Active Target

```typescript
// Track user focusing on a boss action
setActiveTarget({
  surface: 'planner',
  entityType: 'bossAction',
  entityId: 'tidal_roar_1',
});

// Track user editing a mitigation assignment
setActiveTarget({
  surface: 'planner',
  entityType: 'assignment',
  entityId: 'rampart_assigned_to_tidal_roar',
  field: 'mitigationId',
});

// Clear active target
setActiveTarget(null);
```

### Setting Interaction State

```typescript
// User is hovering over an element
setInteraction('hovering');

// User has selected an element
setInteraction('selected');

// User is actively editing
setInteraction('editing');

// User stopped interacting
setInteraction(null);
```

### Setting Cursor Position

```typescript
// Track cursor with container dimensions
setCursor({
  surface: 'planner',
  x: 450,
  y: 320,
  panel: 'timeline',
  containerWidth: 800,
  containerHeight: 600,
});

// Clear cursor
setCursor(null);
```

### Setting Viewport

```typescript
// Track which section/section user is viewing
setViewport({
  surface: 'planner',
  panel: 'timeline',
  section: 'timeline',
  scrollTop: 150,
});

// Clear viewport
setViewport(null);
```

### Querying Presence

```typescript
// Get all users viewing a specific target
const viewers = getPresenceForTarget('planner|bossAction|tidal_roar_1||');

// Check if target is selected/edited by others
const isSelected = isTargetActiveByOthers('planner|assignment|123|', 'selected');
const isBeingEdited = isTargetActiveByOthers('planner|assignment|123|', 'editing');
const isEngaged = isTargetActiveByOthers('planner|assignment|123|'); // any interaction

// Get current user's presence data
const myPresence = getMyPresence();
```

## Service API

### presenceService Functions (from `src/services/presenceService.ts`)

```typescript
import {
  updatePresence,
  setFullPresence,
  clearPresence,
  setupDisconnectHandler,
  subscribeToPresence,
  getPresence,
  cleanupStalePresence,
  applyPresencePatch,
  arePresenceStatesEqual,
  presenceDebouncer,
} from '../../services/presenceService';

// Update presence data (writes to Firebase)
await updatePresence(roomId, sessionId, presenceData);

// Set full presence state (wrapper for updatePresence)
await setFullPresence(roomId, sessionId, presenceData);

// Clear presence on disconnect
await clearPresence(roomId, sessionId);

// Setup automatic cleanup when connection drops
await setupDisconnectHandler(roomId, sessionId);

// Subscribe to presence updates (returns unsubscribe function)
const unsubscribe = subscribeToPresence(roomId, (presenceMap) => {
  // presenceMap: Map<sessionId, UserPresenceData & { sessionId }>
  // Handle updates
});

// Get presence for a specific user
const presence = await getPresence(roomId, sessionId);

// Cleanup stale presence entries (>30s old)
await cleanupStalePresence(roomId);

// Apply partial update to presence data
const updated = applyPresencePatch(currentPresence, { interaction: 'selected' });

// Check if two presence states are equal
const isEqual = arePresenceStatesEqual(presenceA, presenceB);
```

### Presence Debouncer

```typescript
import { presenceDebouncer } from '../../services/presenceService';

// Debounce presence updates per channel
presenceDebouncer.debounce('update-key', () => {
  // Update logic
}, 75); // delay in ms

// Clear pending update for a key
presenceDebouncer.clear('update-key');

// Clear all pending updates
presenceDebouncer.clearAll();
```

## Throttling & Performance

### Throttling Channels

Presence updates are sent through different channels with varying throttle delays:

| Channel | Delay | Use Case |
|---------|-------|----------|
| `activity` | 0ms | Target changes, interactions (immediate) |
| `cursor` | 75ms | Cursor position updates (high frequency) |
| `viewport` | 300ms | Viewport/scroll changes (lower frequency) |

### Sticky Presence Heartbeat

When a user has a "sticky" presence state (`selected` or `editing`), a heartbeat is sent every 10 seconds to maintain visibility:

```typescript
// Heartbeat interval logic (from PresenceContext)
if (hasStickyPresence(myPresence)) {
  heartbeatIntervalRef.current = setInterval(() => {
    publishPresence('activity', { force: true }); // Force immediate update
  }, PRESENCE_HEARTBEAT_INTERVAL); // 10000ms
}
```

### Staleness Detection

Presence entries older than 30 seconds are considered stale:

```typescript
export const PRESENCE_STALE_TIMEOUT = 30000; // 30 seconds

// During subscription, stale entries are filtered out
if (presence.lastUpdated && now - presence.lastUpdated < PRESENCE_STALE_TIMEOUT) {
  presenceMap.set(sessionId, presence);
}
```

### Debouncing

The `PresenceDebouncer` class prevents duplicate updates within the throttle window:

```typescript
debounce(key: string, fn: () => void, delay: number): void {
  // Clear any existing timer for this key
  const existingTimer = this.timers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    this.timers.delete(key);
    fn();
  }, Math.max(0, delay));

  this.timers.set(key, timer);
}
```

## Integration Points

### With CollaborationContext

The PresenceContext depends on CollaborationContext for:

```typescript
const collaboration = useCollaboration() as {
  sessionId: string;
  collaborators: Array<{ sessionId: string; userId: string; displayName: string; color?: string }>;
  isCollaborating: boolean;
  collaborationAvailable?: boolean;
  collaborationError?: string | null;
};
```

Presence data is enriched with collaborator information from CollaborationContext to produce the final `UserPresence` objects with `displayName` and `color`.

### With Firebase RTDB

- **Writes**: `set()` for presence updates
- **Reads**: `onValue()` subscription for real-time updates
- **Cleanup**: `onDisconnect().remove()` for automatic cleanup
- **Staleness**: Manual cleanup via `cleanupStalePresence()`

### With UI Components

Presence data flows to UI components through:

1. **`getPresenceForTarget()`** - Query presence for specific targets
2. **`isTargetActiveByOthers()`** - Check engagement state
3. **`presenceMap`** - Access all presence data directly

Example UI component pattern:

```typescript
const PresenceIndicator = ({ targetKey }: { targetKey: string }) => {
  const { getPresenceForTarget } = usePresence();
  const viewers = getPresenceForTarget(targetKey);

  return (
    <div>
      {viewers.map(v => (
        <PresenceBadge key={v.sessionId} user={v} />
      ))}
    </div>
  );
};
```

## UI Components Using Presence

### Collaboration Components (from `src/components/collaboration/`)

| Component | Purpose |
|-----------|---------|
| `ActiveUsersDisplay.tsx` | Shows list of active collaborators |
| `CollaboratorsList.tsx` | Sorted list with edit status |
| `PresenceSurface.tsx` | Wraps sections with presence tracking |
| `PresenceTarget.tsx` | Presence indicator for specific targets |
| `PresenceOutline.tsx` | Visual outline for presence |
| `PresenceBadgeGroup.tsx` | Grouped presence badges |
| `RemoteCursorLayer.tsx` | Renders remote cursors |
| `SelectionIndicator.tsx` | Shows selection state |
| `SelectionBorder.tsx` | Border for selected items |
| `CollaborationStatusNotice.tsx` | Error/connection status |

## Error Handling

### Permission Denied

When Firebase rules deny write access:

```typescript
const isPermissionError = isPermissionDeniedError(error);
const message = isPermissionError
  ? COLLABORATION_UNAVAILABLE_MESSAGE
  : 'Realtime collaboration encountered an unexpected error.';

// Presence is disabled, updates stop
presenceDisabledRef.current = true;
setPresenceAvailable(false);
setPresenceError(message);
```

### Graceful Degradation

- Presence failures don't crash the app
- Collaboration continues without presence indicators
- Error is surfaced via `collaborationError` context value

## Troubleshooting

### Presence Not Updating

1. Check `collaborationAvailable` is `true`
2. Check `collaborationError` for permission issues
3. Verify Firebase connection
4. Check browser console for errors

### Cursor Laggy

- Verify throttle is working (75ms is intentional)
- Check for excessive re-renders
- Monitor presenceMap size (many users = more updates)

### Stale Presence Lingering

- Check `PRESENCE_STALE_TIMEOUT` (30s default)
- Verify `cleanupStalePresence()` is being called
- Check Firebase rules allow writes

### Connection Drops Frequently

- PresenceContext auto-reconnects on sessionId change
- Check `setupDisconnectHandler()` completed successfully
- Verify Firebase security rules allow presence writes

## Best Practices

### Target Key Generation

Always use the helper functions for consistent keys:

```typescript
import { createPresenceTarget, buildPresenceTargetKey } from '../../types/presence';

// Create a full target with derived panel/section
const target = createPresenceTarget({
  surface: 'planner',
  entityType: 'bossAction',
  entityId: 'tidal_roar_1',
});

// Or build key manually (use helper for consistency)
const key = buildPresenceTargetKey({ surface, entityType, entityId, field, slotId });
```

### Debouncing Heavy Operations

For components that call presence updates frequently:

```typescript
// In component
const throttledSetCursor = useMemo(
  () => debounce((cursor: CursorPresence) => {
    setCursor(cursor);
  }, 100),
  [setCursor]
);

// Mouse move handler
onMouseMove={(e) => {
  throttledSetCursor({ surface: 'planner', x: e.clientX, y: e.clientY });
}}
```

### Cleaning Up on Unmount

The PresenceContext handles cleanup automatically, but components should clear local state:

```typescript
useEffect(() => {
  return () => {
    setActiveTarget(null);
    setInteraction(null);
  };
}, []);
```

### Max Users Enforcement

```typescript
import { MAX_USERS_PER_PLAN } from '../../types/presence';

if (collaborators.length >= MAX_USERS_PER_PLAN) {
  // Show warning or prevent new connections
}
```

## Related Documentation

- [Feature Inventory](../01-feature-inventory.md) - Presence as collaboration feature
- [Technical Implementation](../02-technical-implementation.md) - PresenceContext and presenceService locations
- [Architecture Overview](../03-architecture-overview.md) - Context hierarchy
- [Database Schema](../05-database-schema.md) - Firebase paths
- [Troubleshooting](../07-troubleshooting.md) - Collaboration issues