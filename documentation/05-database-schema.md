# MitPlan Database Schema Documentation

## Overview
MitPlan uses Firebase Realtime Database as the primary data store for real-time collaboration and plan persistence. This document outlines the complete database schema, data structures, and relationships.

## Firebase Realtime Database Structure

### Root Level Structure
```
/
├── plans/                    # All mitigation plans
│   └── {planId}/            # Individual plan data
├── timelines/                # User-created and official timelines
│   └── {timelineId}/        # Individual timeline data
└── users/                   # User-specific data (future use)
    └── {userId}/            # Individual user data
```

## Plans Collection Schema

### Plan Root Structure
```
/plans/{planId}/
├── metadata/                # Plan metadata and ownership
├── data/                   # Core plan data
├── collaboration/          # Real-time collaboration data
└── access/                 # Access control and history
```

### Metadata Schema
```javascript
/plans/{planId}/metadata/
{
  "name": "My Ketuduke Plan",           // Plan display name
  "bossId": "ketuduke",                 // Boss identifier
  "createdAt": 1703123456789,           // Creation timestamp
  "updatedAt": 1703123456789,           // Last update timestamp
  "ownerId": "user_abc123",             // Plan creator ID
  "accessedBy": [                       // Array of user IDs who accessed
    "user_abc123",
    "user_def456",
    "anonymous"
  ],
  "version": "1.0",                     // Plan format version
  "isPublic": true,                     // Public access flag
  "description": "Plan description"      // Optional plan description
}
```

### Core Plan Data Schema
```javascript
/plans/{planId}/data/
{
  "bossId": "ketuduke",                 // Selected boss
  "selectedJobs": {                     // Job selection state
    "tank": {
      "PLD": { "id": "PLD", "name": "Paladin", "selected": true },
      "WAR": { "id": "WAR", "name": "Warrior", "selected": false },
      "DRK": { "id": "DRK", "name": "Dark Knight", "selected": false },
      "GNB": { "id": "GNB", "name": "Gunbreaker", "selected": false }
    },
    "healer": {
      "WHM": { "id": "WHM", "name": "White Mage", "selected": true },
      "SCH": { "id": "SCH", "name": "Scholar", "selected": false },
      "AST": { "id": "AST", "name": "Astrologian", "selected": false },
      "SGE": { "id": "SGE", "name": "Sage", "selected": false }
    },
    "melee": { /* melee jobs */ },
    "ranged": { /* ranged jobs */ },
    "caster": { /* caster jobs */ }
  },
  "tankPositions": {                    // Tank position assignments
    "MT": "PLD",                        // Main Tank job ID
    "OT": null                          // Off Tank job ID (null if single tank)
  },
  "assignments": {                      // Mitigation assignments
    "boss_action_id_1": [               // Array of assignments per boss action
      {
        "mitigationId": "rampart",      // Ability ID
        "assignedAt": 1703123456789,    // Assignment timestamp
        "assignedBy": "user_abc123",    // User who assigned
        "tankPosition": "MT",           // Tank position (for tank abilities)
        "instanceId": "rampart_PLD",    // Instance identifier
        "metadata": {                   // Additional assignment data
          "duration": 20,
          "cooldown": 90,
          "mitigationValue": 0.20
        }
      }
    ]
  },
  "filters": {                          // UI filter states
    "showOnlyAvailable": false,
    "showOnlyRelevant": true,
    "hideOnCooldown": false
  }
}
```

### Collaboration Schema
```javascript
/plans/{planId}/collaboration/
{
  "activeUsers": {                      // Currently active users
    "session_abc123": {                 // Session ID as key
      "userId": "user_abc123",          // User ID (or "anonymous")
      "sessionId": "session_abc123",    // Session identifier
      "displayName": "John Doe",        // Display name
      "email": "john@example.com",      // Email (empty for anonymous)
      "isAnonymous": false,             // Anonymous user flag
      "userType": "authenticated",      // "authenticated" or "anonymous"
      "joinedAt": 1703123456789,        // Session start time
      "lastActivity": 1703123456789,    // Last activity timestamp
      "isActive": true                  // Active status
    }
  },
  "changes": {                          // Change history (optional)
    "change_abc123": {
      "userId": "user_abc123",
      "sessionId": "session_abc123",
      "timestamp": 1703123456789,
      "type": "assignment_added",       // Change type
      "data": {                         // Change-specific data
        "bossActionId": "boss_action_1",
        "mitigationId": "rampart",
        "tankPosition": "MT"
      }
    }
  },
  "settings": {                         // Collaboration settings
    "maxUsers": 10,                     // Maximum concurrent users
    "sessionTimeout": 300000,           // Session timeout (5 minutes)
    "enableChangeHistory": false        // Change tracking flag
  }
}
```

### Access Control Schema
```javascript
/plans/{planId}/access/
{
  "permissions": {                      // Access permissions
    "public": true,                     // Public access flag
    "allowAnonymous": true,             // Anonymous user access
    "allowEdit": true,                  // Edit permissions
    "allowShare": true                  // Share permissions
  },
  "history": {                          // Access history
    "access_abc123": {
      "userId": "user_abc123",
      "accessType": "edit",             // "view", "edit", "share"
      "timestamp": 1703123456789,
      "sessionId": "session_abc123",
      "userAgent": "Mozilla/5.0...",    // Browser info
      "ipAddress": "192.168.1.1"       // IP address (if available)
    }
  },
  "statistics": {                       // Access statistics
    "totalViews": 15,
    "totalEdits": 8,
    "uniqueUsers": 5,
    "lastAccessed": 1703123456789
  }
}
```

## Presence System Schema

### Presence Collection Structure
```
/planCollaboration/
└── plan:{planId}/               # Room ID format for plans
│   └── presence/
│       └── {sessionId}/
│           ├── activeTarget/
│           │   ├── surface: "planner" | "timeline"
│           │   ├── entityType: "bossAction" | "assignment" | "job" | etc.
│           │   ├── entityId: string
│           │   ├── field?: string
│           │   ├── slotId?: string
│           │   ├── panel?: string
│           │   ├── section?: string
│           │   └── key: "surface|entityType|entityId|field|slotId"
│           ├── interaction: "hovering" | "selected" | "editing" | null
│           ├── cursor/
│           │   ├── surface: "planner" | "timeline"
│           │   ├── x: number
│           │   ├── y: number
│           │   ├── panel?: string
│           │   ├── containerWidth?: number
│           │   └── containerHeight?: number
│           ├── viewport/
│           │   ├── surface: "planner" | "timeline"
│           │   ├── panel?: string
│           │   ├── section?: string
│           │   └── scrollTop?: number
│           └── lastUpdated: timestamp
│
└── timeline:{timelineId}/       # Room ID format for timelines
    └── presence/
        └── {sessionId}/
            └── (same structure as plan presence)
```

### Presence Data Schema
```javascript
/planCollaboration/plan:{planId}/presence/{sessionId}/
{
  "activeTarget": {                     // What the user is focused on
    "surface": "planner",               // Collaboration surface
    "entityType": "bossAction",         // Type of entity
    "entityId": "tidal_roar_1",         // Entity identifier
    "field": null,                      // Optional field within entity
    "slotId": null,                     // Optional slot identifier
    "panel": "timeline",                // UI panel (derived from entityType)
    "section": "timeline",               // UI section (derived from entityType)
    "key": "planner|bossAction|tidal_roar_1||" // Composite lookup key
  },
  "interaction": "selected",            // Current interaction state
  "cursor": {                           // Cursor position
    "surface": "planner",
    "x": 450,
    "y": 320,
    "panel": "timeline",
    "containerWidth": 800,
    "containerHeight": 600
  },
  "viewport": {                         // Viewport/section info
    "surface": "planner",
    "panel": "timeline",
    "section": "timeline",
    "scrollTop": 150
  },
  "lastUpdated": 1703123456789          // Timestamp for staleness detection
}
```

### Presence Constants (from `src/types/presence.ts`)
```javascript
{
  "MAX_USERS_PER_PLAN": 24,             // Maximum collaborators
  "PRESENCE_STALE_TIMEOUT": 30000,      // 30 seconds until stale
  "PRESENCE_HEARTBEAT_INTERVAL": 10000, // 10 seconds heartbeat for sticky presence
  "PRESENCE_THROTTLE": {
    "activity": 0,      // Immediate updates
    "cursor": 75,       // 75ms throttle
    "viewport": 300     // 300ms throttle
  },
  "USER_COLORS": [                     // 24 distinct colors for users
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
    "#14b8a6", "#eab308", "#f43f5e", "#a855f7", "#0ea5e9",
    "#22c55e", "#fb923c", "#e879f9", "#38bdf8", "#4ade80",
    "#fbbf24", "#fb7185", "#c084fc", "#2dd4bf"
  ]
}
```

### Entity Type to Panel/Section Mapping
```javascript
// Planner surface
const PLANNER_PANEL_BY_ENTITY = {
  "assignment": "timeline",
  "bossAction": "timeline",
  "healthSetting": "jobs",
  "job": "jobs",
  "mitigation": "mitigations",
  "planMeta": "header",
  "tankPosition": "jobs"
};

const PLANNER_SECTION_BY_ENTITY = {
  "assignment": "timeline",
  "bossAction": "timeline",
  "healthSetting": "jobs",
  "job": "jobs",
  "mitigation": "mitigations",
  "planMeta": "planMeta",
  "tankPosition": "jobs"
};

// Timeline surface
const TIMELINE_PANEL_BY_ENTITY = {
  "timelineBossTag": "metadata",
  "timelineEvent": "timeline",
  "timelineLibrary": "library",
  "timelineMeta": "metadata"
};

const TIMELINE_SECTION_BY_ENTITY = {
  "timelineBossTag": "metadata",
  "timelineEvent": "timeline",
  "timelineLibrary": "library",
  "timelineMeta": "metadata"
};
```

## Timeline Collection Schema

### Timeline Root Structure
```
/timelines/{timelineId}/
├── metadata/                # Timeline metadata and ownership
├── actions/                 # Timeline actions/boss abilities
├── phaseAnchors/           # Phase boundary definitions
└── officialData/           # Source data (cactbot, FF Logs)
```

### Timeline Metadata Schema
```javascript
/timelines/{timelineId}/metadata/
{
  "name": "Vamp Fatale M9S Timeline",    // Timeline display name
  "bossId": "vamp-fatale-m9s",           // Boss identifier
  "createdBy": "user_abc123",            // Creator ID
  "createdAt": 1703123456789,             // Creation timestamp
  "updatedAt": 1703123456789,             // Last update timestamp
  "isPublic": true,                      // Public access flag
  "isOfficial": false,                    // Official/verified flag
  "sourceUrl": "https://...",             // cactbot/FF Logs source URL
  "description": "Timeline description",  // Optional description
  "version": "1.0"                        // Timeline format version
}
```

### Timeline Actions Schema
```javascript
/timelines/{timelineId}/actions/
{
  "action_abc123": {
    "name": "Killer Voice",              // Action name
    "time": 120,                         // Seconds from fight start
    "damageType": "magical",             // 'magical' | 'physical' | 'both'
    "importance": "high",                // 'critical' | 'high' | 'medium' | 'low'
    "isTankBuster": true,               // Tank buster flag
    "isDualTankBuster": false,           // Dual tank buster flag
    "isRaidWide": false,                 // Raid-wide damage flag
    "unmitigatedDamage": "100000",      // Damage estimate
    "hits": 1,                          // Number of hits (for multi-hit)
    "sourceAbilities": ["Killer Voice"], // Source ability names (normalized)
    "phase": 1                          // Associated phase
  }
}
```

### Phase Anchors Schema
```javascript
/timelines/{timelineId}/phaseAnchors/
{
  "anchor_abc123": {
    "name": "Phase 2 Transition",       // Anchor name
    "time": 600,                        // Phase transition time
    "hpThreshold": 70,                 // HP percentage trigger
    "sourceAbility": "Boss Enrage"     // Triggering ability
  }
}
```

### Official Data Schema
```javascript
/timelines/{timelineId}/officialData/
{
  "analysisSources": [
    {
      "kind": "cactbot",
      "url": "https://...",
      "lastVerified": 1703123456789
    }
  ],
  "guideSources": [
    {
      "site": "cactbot",
      "url": "https://...",
      "lastChecked": 1703123456789
    }
  ],
  "accuracyReport": {
    "lastRun": 1703123456789,
    "status": "passing",
    "issues": []
  }
}
```

## Data Types and Validation
### Plan ID Format
- **Pattern**: `plan_[timestamp]_[random]`
- **Example**: `plan_1703123456789_abc123`
- **Length**: 20-30 characters

### User ID Format
- **Authenticated**: Firebase Auth UID (28 characters)
- **Anonymous**: `"anonymous"` string literal
- **Session**: `session_[timestamp]_[random]`

### Timestamp Format
- **Type**: Unix timestamp (milliseconds)
- **Example**: `1703123456789`
- **Usage**: All time-based fields

### Boss Action ID Format
- **Pattern**: `[boss_name]_[action_name]_[sequence]`
- **Example**: `ketuduke_tidal_roar_1`
- **Validation**: Must exist in boss actions data

### Mitigation ID Format
- **Pattern**: Snake case ability names
- **Example**: `rampart`, `hallowed_ground`, `sacred_soil`
- **Validation**: Must exist in mitigation abilities data

## Firebase Security Rules

### Current Security Rules
```javascript
{
  "rules": {
    "plans": {
      "$planId": {
        // Universal read access
        ".read": true,
        
        // Write access for authenticated and anonymous users
        ".write": "auth != null || auth.uid == 'anonymous'",
        
        "collaboration": {
          "activeUsers": {
            "$sessionId": {
              // Users can only write their own session data
              ".write": "$sessionId == auth.uid || auth.uid == 'anonymous'"
            }
          }
        },
        
        "metadata": {
          // Only owner can modify metadata
          ".write": "auth != null && (auth.uid == data.child('ownerId').val() || !data.exists())"
        }
      }
    }
  }
}
```

## Data Relationships

### Plan → Boss Actions
```
Plan.data.bossId → Boss Actions Data (Static)
Plan.data.assignments[bossActionId] → Boss Action
```

### Plan → Mitigation Abilities
```
Plan.data.assignments[].mitigationId → Mitigation Abilities Data (Static)
```

### Plan → Jobs
```
Plan.data.selectedJobs → Job Data (Static)
Plan.data.tankPositions → Selected Tank Jobs
```

### User → Plans
```
User.uid → Plan.metadata.ownerId
User.uid → Plan.metadata.accessedBy[]
User.sessionId → Plan.collaboration.activeUsers[sessionId]
```

## Indexing Strategy

### Firebase Realtime Database Indexing
```javascript
{
  "rules": {
    "plans": {
      ".indexOn": ["metadata/ownerId", "metadata/createdAt", "metadata/updatedAt"]
    }
  }
}
```

### Query Optimization
- **User Plans**: Index on `metadata/ownerId`
- **Recent Plans**: Index on `metadata/updatedAt`
- **Public Plans**: Index on `metadata/isPublic`

## Data Migration Strategy

### Version Management
```javascript
// Plan version tracking
{
  "metadata": {
    "version": "1.0",           // Current: 1.0
    "migrationHistory": [       // Migration log
      {
        "fromVersion": "0.9",
        "toVersion": "1.0",
        "migratedAt": 1703123456789,
        "changes": ["Added tankPositions", "Updated assignments schema"]
      }
    ]
  }
}
```

### Backward Compatibility
- Support for older plan formats
- Automatic migration on plan load
- Graceful degradation for unsupported features

## Performance Considerations

### Read Optimization
- Denormalized data structure for faster reads
- Minimal nesting depth
- Efficient query patterns

### Write Optimization
- Batched writes for multiple updates
- Debounced real-time updates
- Optimistic UI updates

### Connection Management
- Connection pooling
- Automatic reconnection
- Offline support with local caching

## Backup and Recovery

### Data Backup Strategy
- Firebase automatic backups
- Export functionality for user data
- Plan data portability through JSON export

### Recovery Procedures
- Plan restoration from exports
- User data migration
- Conflict resolution for corrupted data

This database schema documentation provides a complete reference for understanding and working with MitPlan's data structures and Firebase integration.
