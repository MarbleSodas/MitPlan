# MitPlan Feature Inventory

## Overview
MitPlan is a comprehensive web application designed for Final Fantasy XIV players to plan and optimize raid mitigation strategies. This document catalogs all current features and their capabilities.

## Core Features

### 1. Mitigation Planning System
**Description**: The heart of the application - allows players to assign mitigation abilities to boss actions through an intuitive drag-and-drop interface.

**Key Capabilities**:
- Drag and drop mitigation abilities onto boss actions
- Automatic cooldown tracking and validation
- Visual indicators for abilities on cooldown (red border) vs available (blue border)
- Stacking mitigation calculation with percentage display
- Prevention of invalid assignments (cooldown conflicts)
- Real-time mitigation percentage calculation for each boss action
- Support for different mitigation types (invulnerability, damage reduction, barriers)

**User Experience**:
- Click to select boss actions (highlighted state)
- Drag mitigation abilities from sidebar to timeline
- Visual feedback during drag operations
- Automatic conflict resolution with future assignments

### 2. Multi-Boss Support
**Description**: Support for multiple FFXIV boss encounters with accurate timelines and mechanics.

**Supported Bosses**:
- Ketuduke (default)
- Lala
- Statice
- Dancing Green (M5S)
- Sugar Riot (M6S)
- Brute Abominator (M7S)
- Howling Blade (M8S)

**Boss Data Features**:
- Accurate action timelines with timestamps
- Damage type classification (magical/physical)
- Importance levels (critical, high, medium, low)
- Tank buster vs raid-wide damage categorization
- Dual-tank buster support
- Unmitigated damage estimates

### 3. FFXIV Job System Integration
**Description**: Comprehensive job selection system with accurate FFXIV job data and abilities.

**Job Categories**:
- **Tanks**: Paladin (PLD), Warrior (WAR), Dark Knight (DRK), Gunbreaker (GNB)
- **Healers**: White Mage (WHM), Scholar (SCH), Astrologian (AST), Sage (SGE)
- **Melee DPS**: Monk (MNK), Dragoon (DRG), Ninja (NIN), Samurai (SAM), Reaper (RPR), Viper (VPR)
- **Ranged DPS**: Bard (BRD), Machinist (MCH), Dancer (DNC)
- **Caster DPS**: Black Mage (BLM), Summoner (SMN), Red Mage (RDM), Pictomancer (PCT)

**Job Features**:
- Official FFXIV job icons
- Level-based ability filtering
- Job-specific mitigation abilities
- Role-shared abilities (multiple instances based on selected jobs)
- Accurate cooldowns, durations, and mitigation percentages

### 4. Advanced Mitigation Mechanics

#### Tank Position System
**Description**: Dual-tank support with main tank (MT) and off-tank (OT) position assignment.

**Features**:
- Tank position selection (MT/OT assignment)
- Real-time position synchronization in collaborative sessions
- Automatic mitigation reassignment when positions change
- Tank-specific ability filtering
- Single-target mitigation modal for dual-tank busters

#### Cooldown Management
**Description**: Sophisticated cooldown tracking system with multiple specialized trackers.

**Components**:
- **Basic Cooldown Tracker**: Standard ability cooldowns
- **Charges Tracker**: Multi-charge abilities (e.g., Benediction)
- **Instances Tracker**: Role-shared abilities with multiple instances
- **Aetherflow Tracker**: Scholar's Aetherflow stack system (0-3 stacks)

**Features**:
- Automatic 60-second Aetherflow refresh based on timeline timing
- Charge counting for abilities with multiple uses
- Instance tracking for role-shared abilities
- Cooldown conflict detection and resolution
- Cache optimization for performance

#### Ability Targeting System
**Description**: Smart targeting system for different ability types.

**Target Types**:
- **Self**: Only affects the caster
- **Single**: Can be cast on a single target (shows tank selection modal)
- **Party**: Affects the entire party
- **Area**: Affects players in a specific area

**Special Cases**:
- Rampart shows tank selection modal on dual-tank busters despite being self-target
- Single-target abilities show tank selection for dual-tank scenarios
- Auto-assignment for job-specific self-target abilities

### 5. Real-Time Collaboration System
**Description**: Firebase-powered real-time collaboration allowing multiple users to edit plans simultaneously.

**Core Features**:
- Real-time plan synchronization across all connected users
- Live cursor/activity indicators showing other users' actions
- Session management with automatic cleanup
- Conflict resolution for simultaneous edits
- Change origin tracking to prevent feedback loops

**Session Management**:
- Unique session IDs for each user
- Heartbeat system for connection monitoring
- Automatic disconnection handling
- Session cleanup after inactivity
- Real-time user list with avatars and display names

**Data Synchronization**:
- Batched updates for performance optimization
- Debounced writes to reduce Firebase calls
- Optimistic UI updates for responsiveness
- Automatic retry mechanisms for failed operations

### 6. Authentication & User Management
**Description**: Flexible authentication system supporting both authenticated and anonymous users.

**Authentication Methods**:
- Firebase Authentication integration
- Email/password authentication
- Anonymous user support with full functionality

**Anonymous User Features**:
- Auto-generated display names (e.g., "Quick Warrior 123")
- Full editing capabilities without account creation
- Local storage fallback for offline functionality
- Seamless account migration upon registration
- Real-time collaboration participation

**User Experience**:
- Optional account creation prompts
- Seamless transition between anonymous and authenticated modes
- Plan ownership tracking for analytics
- Access history and plan sharing

### 7. Plan Management & Sharing
**Description**: Comprehensive plan creation, saving, and sharing system.

**Plan Features**:
- Create new plans with boss pre-selection
- Save plans to Firebase Realtime Database
- Local storage fallback for offline mode
- Plan naming and metadata management
- Access control and ownership tracking

**Sharing System**:
- Universal edit access (any user can edit any plan)
- Shareable URLs for plan access
- Read-only sharing for unauthenticated users
- Plan access history tracking
- Backward compatibility for older plan formats

**Dashboard Organization**:
- "My Plans" section for owned plans
- "Shared Plans" section for accessed plans
- Plan counts and empty states
- Quick access to recent plans

### 8. Import/Export System
**Description**: Plan portability through JSON import/export functionality.

**Export Features**:
- Complete plan data export to JSON
- Metadata preservation (creation date, boss, jobs)
- Mitigation assignments with timestamps
- Tank position data
- Backward compatibility support

**Import Features**:
- JSON file import with validation
- Automatic data migration for older formats
- Error handling for corrupted files
- Merge capabilities for partial imports
- Preview before import confirmation

### 9. Theme System
**Description**: Comprehensive light/dark mode support with consistent styling.

**Theme Features**:
- Light and dark theme variants
- Persistent theme preference storage
- Smooth transitions between themes
- Consistent color schemes across all components
- Accessibility-compliant contrast ratios

**Design System**:
- Responsive breakpoints for all device sizes
- Consistent spacing and typography scales
- Color variables for easy maintenance
- Component-level theme integration
- CSS custom properties for performance

### 10. Mobile Responsiveness
**Description**: Full mobile optimization with touch-friendly interfaces.

**Mobile Features**:
- Responsive design for all screen sizes
- Touch-optimized drag and drop
- Mobile-specific mitigation selector (bottom capsule view)
- Swipe gestures for navigation
- Optimized touch targets (44px minimum)

**Responsive Breakpoints**:
- Small Mobile: 320px+
- Mobile: 480px+
- Large Mobile: 640px+
- Tablet: 768px+
- Large Tablet: 992px+
- Desktop: 1200px+
- Large Desktop: 1440px+

**Mobile-Specific UI**:
- Collapsible sidebar on mobile
- Bottom-up mitigation selector
- Simplified navigation
- Touch-friendly buttons and controls
- Optimized scrolling and gestures

### 11. Performance Optimization
**Description**: Various optimizations for smooth user experience.

**Optimization Features**:
- Memoized components to prevent unnecessary re-renders
- Debounced API calls for real-time updates
- Cached cooldown calculations
- Lazy loading for large datasets
- Optimized Firebase queries
- Batched database writes

**Caching Systems**:
- Cooldown availability cache
- Usage history cache
- Component render optimization
- Local storage caching for offline support

### 12. Accessibility & UX
**Description**: Inclusive design with accessibility considerations.

**Accessibility Features**:
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus indicators
- ARIA labels and descriptions
- Semantic HTML structure

**User Experience Enhancements**:
- Loading states and spinners
- Error handling with user-friendly messages
- Confirmation dialogs for destructive actions
- Tooltips and help text
- Visual feedback for all interactions
- Consistent navigation patterns

## Integration Features

### XIVAPI Integration
**Description**: Integration with XIVAPI for official FFXIV data.

**Features**:
- Official job icons
- Ability icons and descriptions
- Level requirement data
- Accurate game data synchronization

### Ko-fi & Discord Integration
**Description**: Community and support features.

**Features**:
- Ko-fi donation button (ko-fi.com/goodfaithgames)
- Discord community button
- Clean, minimalistic styling
- Responsive design
- Platform-appropriate icons

## Technical Architecture Summary

### Frontend Stack
- **React 18** with functional components and hooks
- **Styled Components** for CSS-in-JS styling
- **React Router** for client-side routing
- **@dnd-kit** for drag and drop functionality
- **Vite** for build tooling and development server

### Backend Services
- **Firebase Realtime Database** for real-time collaboration
- **Firebase Authentication** for user management
- **Firebase Analytics** for usage tracking
- **Vercel** for hosting and deployment

### State Management
- **React Context API** for global state
- **Custom hooks** for feature-specific logic
- **Local storage** for offline functionality
- **Real-time synchronization** with Firebase

This feature inventory provides a comprehensive overview of MitPlan's capabilities, serving as a reference for developers and stakeholders to understand the application's scope and functionality.
