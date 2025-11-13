# MitPlan User Workflows

## Overview
This document outlines the key user journeys and workflows within the MitPlan application, covering both authenticated and anonymous user experiences.

## Primary User Workflows

### 1. New User Onboarding

#### First-Time Visitor (Unauthenticated)
```
Landing Page → Account Creation OR Anonymous Mode
    ↓
Dashboard/Anonymous Dashboard
    ↓
Create First Plan
    ↓
Plan Creation Workflow
```

**Landing Page Experience**:
- Clean, minimalistic design with FFXIV theming
- Authentication form (email/password)
- "Continue as Guest" option for anonymous access
- Theme toggle (light/dark mode)
- Ko-fi donation and Discord community buttons

**Decision Points**:
- Create account for persistent plans and collaboration
- Continue anonymously for immediate access

#### Account Creation Flow
```
Email/Password Input → Firebase Authentication → Dashboard Redirect
```

**Features**:
- Email validation
- Password requirements
- Automatic login after registration
- Plan migration from anonymous session (if applicable)

#### Anonymous User Flow
```
"Continue as Guest" → Auto-generated Display Name → Anonymous Dashboard
```

**Anonymous User Features**:
- Auto-generated display name (e.g., "Quick Warrior 123")
- Full application functionality
- Local storage for plan persistence
- Real-time collaboration participation
- Account creation prompts (non-intrusive)

### 2. Plan Creation Workflow

#### Authenticated User Plan Creation
```
Dashboard → "Create New Plan" → Boss Selection → Plan Editor
```

#### Anonymous User Plan Creation
```
Anonymous Dashboard → "Create New Plan" → Boss Selection → Plan Editor
```

#### Boss Pre-Selection Flow
```
Dashboard → Boss Selector → "Create Plan with [Boss]" → Pre-populated Plan Editor
```

**Plan Creation Steps**:
1. **Plan Naming**: Auto-generated or custom name
2. **Boss Selection**: Choose from available boss encounters
3. **Initial Setup**: Plan metadata and configuration
4. **Redirect**: Navigate to plan editor with pre-populated data

### 3. Plan Editing Workflow

#### Core Editing Flow
```
Plan Selection → Plan Editor → Job Selection → Boss Timeline → Mitigation Assignment
```

#### Detailed Editing Steps

**Step 1: Job Selection**
```
Job Selector → Role Categories → Individual Job Selection → Ability Updates
```
- Select jobs by role (Tank, Healer, Melee, Ranged, Caster)
- Visual job icons with selection states
- Real-time ability list updates based on selected jobs
- Tank position assignment (MT/OT) for tank jobs

**Step 2: Boss Timeline Review**
```
Boss Actions List → Action Details → Damage Type Classification
```
- Chronological boss action timeline
- Action importance levels (critical, high, medium, low)
- Damage type indicators (magical, physical)
- Tank buster vs raid-wide categorization

**Step 3: Mitigation Assignment**
```
Select Boss Action → Drag Mitigation Ability → Drop on Timeline → Validation
```

**Assignment Process**:
1. **Action Selection**: Click boss action to highlight
2. **Ability Selection**: Choose from available mitigation abilities
3. **Drag Operation**: Drag ability to boss action
4. **Validation**: Automatic cooldown and compatibility checks
5. **Confirmation**: Visual feedback and assignment completion

**Tank Selection Modal** (for applicable abilities):
```
Single-Target Ability + Dual Tank Buster → Tank Selection Modal → MT/OT Choice
```

### 4. Collaborative Editing Workflow

#### Joining Collaborative Session
```
Plan URL Access → Authentication Check → Session Join → Real-time Sync
```

**Authenticated User Collaboration**:
```
Plan URL → Login Check → Session Creation → Real-time Collaboration
```

**Anonymous User Collaboration**:
```
Plan URL → Display Name Prompt → Anonymous Session → Real-time Collaboration
```

#### Real-time Collaboration Features
- **Live User Indicators**: See other active users with avatars
- **Real-time Updates**: Instant synchronization of all changes
- **Conflict Resolution**: Automatic handling of simultaneous edits
- **Session Management**: Automatic cleanup of inactive users

#### Collaborative Actions
```
User Action → Local Update → Firebase Sync → Broadcast to All Users → UI Update
```

**Synchronized Elements**:
- Job selections
- Tank position assignments
- Mitigation assignments
- Boss action selections
- Plan metadata changes

### 5. Plan Sharing Workflow

#### Share Plan Creation
```
Plan Editor → "Share Plan" → Shareable URL Generation → URL Copy
```

#### Accessing Shared Plans
```
Shared URL → Access Check → Plan View/Edit Mode
```

**Sharing Features**:
- Universal edit access (any user can edit any plan)
- No permission restrictions
- Real-time collaboration on shared plans
- Access tracking for analytics

### 6. Import/Export Workflow

#### Export Plan
```
Plan Editor → "Export Plan" → JSON Generation → File Download
```

**Export Data Includes**:
- Plan metadata (name, boss, creation date)
- Job selections
- Tank positions
- Mitigation assignments
- Backward compatibility markers

#### Import Plan
```
Dashboard → "Import Plan" → File Selection → Validation → Plan Creation
```

**Import Process**:
1. **File Selection**: Choose JSON file
2. **Validation**: Check file format and compatibility
3. **Migration**: Update older plan formats
4. **Preview**: Show plan details before import
5. **Creation**: Create new plan with imported data

### 7. Mobile User Experience

#### Mobile-Specific Workflows
```
Mobile Access → Responsive Layout → Touch-Optimized Interactions
```

**Mobile Adaptations**:
- **Bottom Capsule View**: Mobile mitigation selector
- **Touch Targets**: Optimized button sizes (44px minimum)
- **Swipe Gestures**: Navigation and interaction
- **Responsive Layout**: Adaptive component arrangement

#### Mobile Mitigation Assignment
```
Boss Action Selection → Mobile Mitigation Selector → Touch Assignment
```

**Mobile-Specific Features**:
- Bottom-up mitigation selector panel
- Touch-friendly drag and drop
- Simplified navigation
- Optimized scrolling behavior

### 8. Theme and Personalization

#### Theme Switching
```
Any Page → Theme Toggle → Instant Theme Change → Preference Storage
```

**Theme Features**:
- Light and dark mode options
- Persistent theme preference
- Smooth transitions
- Consistent styling across all components

### 9. Error Handling and Recovery

#### Common Error Scenarios
```
Network Error → Offline Mode → Local Storage Fallback → Sync on Reconnection
```

**Error Recovery Workflows**:
- **Connection Loss**: Automatic retry with exponential backoff
- **Data Conflicts**: Conflict resolution with user notification
- **Invalid Operations**: Validation with helpful error messages
- **Session Expiry**: Automatic re-authentication or anonymous fallback

### 10. Advanced User Workflows

#### Tank Position Management
```
Tank Job Selection → Position Assignment → Mitigation Filtering → Assignment Updates
```

**Tank Position Features**:
- MT/OT assignment interface
- Real-time position synchronization
- Automatic mitigation reassignment on position changes
- Position-specific ability filtering

#### Cooldown Management
```
Ability Assignment → Cooldown Calculation → Conflict Detection → Future Assignment Removal
```

**Cooldown Workflow**:
1. **Assignment**: User assigns ability to boss action
2. **Calculation**: System calculates cooldown period
3. **Validation**: Check for conflicts with existing assignments
4. **Resolution**: Remove conflicting future assignments
5. **Feedback**: Visual indicators for ability availability

#### Aetherflow System (Scholar)
```
Scholar Selection → Aetherflow Tracking → Stack Management → Ability Availability
```

**Aetherflow Workflow**:
1. **Initialization**: Start with 3 Aetherflow stacks
2. **Consumption**: Abilities consume stacks when used
3. **Refresh**: Automatic refresh every 60 seconds
4. **Tracking**: Real-time stack count display
5. **Validation**: Prevent usage when no stacks available

## User Experience Principles

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast themes
- Focus indicators
- ARIA labels and descriptions

### Performance
- Optimistic UI updates
- Debounced API calls
- Cached calculations
- Lazy loading
- Progressive enhancement

### Usability
- Intuitive drag and drop
- Clear visual feedback
- Consistent navigation
- Helpful error messages
- Undo/redo capabilities (planned)

### Responsiveness
- Mobile-first design
- Touch-optimized interactions
- Adaptive layouts
- Performance optimization for all devices

This user workflow documentation provides a comprehensive guide to understanding how users interact with MitPlan across different scenarios and device types.
