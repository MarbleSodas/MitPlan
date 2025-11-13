# MitPlan Architecture Overview

## System Architecture

### High-Level Architecture
MitPlan follows a modern web application architecture with a React frontend, Firebase backend services, and real-time collaboration capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  React Application (Vite + React 18)                       │
│  ├── Components (UI Layer)                                 │
│  ├── Contexts (State Management)                           │
│  ├── Services (Business Logic)                             │
│  ├── Hooks (Reusable Logic)                               │
│  └── Utils (Helper Functions)                              │
├─────────────────────────────────────────────────────────────┤
│  Local Storage (Offline Fallback)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Firebase Services (Google Cloud)             │
├─────────────────────────────────────────────────────────────┤
│  ├── Firebase Authentication (User Management)             │
│  ├── Firebase Realtime Database (Real-time Collaboration)  │
│  ├── Firebase Analytics (Usage Tracking)                   │
│  └── Firebase Hosting (Static Asset Delivery)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ CDN
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                        │
├─────────────────────────────────────────────────────────────┤
│  ├── Static Site Hosting                                   │
│  ├── Edge Functions                                        │
│  ├── CDN Distribution                                       │
│  └── Automatic Deployments                                 │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **React 18**: Modern React with concurrent features
- **Vite**: Fast build tool and development server
- **Styled Components**: CSS-in-JS styling solution
- **React Router v6**: Client-side routing
- **@dnd-kit**: Drag and drop functionality
- **Firebase SDK**: Backend service integration

### Component Architecture
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Shared components (buttons, modals, etc.)
│   ├── landing/         # Landing page components
│   ├── dashboard/       # Dashboard-specific components
│   ├── planner/         # Mitigation planner components
│   ├── auth/           # Authentication components
│   ├── mobile/         # Mobile-specific components
│   └── styled/         # Styled component definitions
├── features/           # Feature-specific components
│   ├── jobs/           # Job selection feature
│   └── bosses/         # Boss selection feature
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── services/           # Business logic and API calls
├── utils/              # Helper functions and utilities
├── data/               # Static data (jobs, abilities, bosses)
└── styles/             # Global styles and themes
```

### State Management Pattern
MitPlan uses a hybrid state management approach:

1. **React Context API**: Global application state
2. **Local Component State**: Component-specific state
3. **Custom Hooks**: Reusable stateful logic
4. **Real-time Synchronization**: Firebase Realtime Database

#### Context Hierarchy
```
App
├── ThemeProvider (Theme state)
├── AuthProvider (Authentication state)
└── Router
    ├── PlanProvider (Plan management)
    └── RealtimeAppProvider (Real-time features)
        ├── CollaborationProvider (Session management)
        ├── RealtimePlanProvider (Plan synchronization)
        ├── RealtimeBossProvider (Boss state sync)
        ├── RealtimeJobProvider (Job state sync)
        ├── TankPositionProvider (Tank assignments)
        ├── EnhancedMitigationProvider (Mitigation logic)
        ├── FilterProvider (UI filters)
        └── TankSelectionModalProvider (Modal state)
```

## Backend Architecture

### Firebase Services

#### Firebase Realtime Database
**Purpose**: Real-time collaboration and plan storage
**Structure**:
```
/plans/{planId}/
├── metadata/
│   ├── name: "Plan Name"
│   ├── bossId: "ketuduke"
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── ownerId: "user_id"
│   └── accessedBy: ["user1", "user2"]
├── data/
│   ├── selectedJobs: {...}
│   ├── tankPositions: {...}
│   ├── assignments: {...}
│   └── bossId: "ketuduke"
└── collaboration/
    ├── activeUsers/
    │   └── {sessionId}/
    │       ├── userId: "user_id"
    │       ├── displayName: "User Name"
    │       ├── joinedAt: timestamp
    │       ├── lastActivity: timestamp
    │       └── isActive: true
    └── changes/
        └── {changeId}/
            ├── userId: "user_id"
            ├── sessionId: "session_id"
            ├── timestamp: timestamp
            ├── type: "assignment_added"
            └── data: {...}
```

#### Firebase Authentication
**Purpose**: User management and access control
**Features**:
- Email/password authentication
- Anonymous user support
- Session management
- User profile data

#### Firebase Analytics
**Purpose**: Usage tracking and insights
**Metrics**:
- User engagement
- Feature usage
- Performance monitoring
- Error tracking

### Data Flow Architecture

#### Read Operations
```
Component Request
    ↓
Context/Hook
    ↓
Service Layer
    ↓
Firebase SDK
    ↓
Firebase Realtime Database
    ↓
Real-time Updates
    ↓
Context State Update
    ↓
Component Re-render
```

#### Write Operations
```
User Action
    ↓
Event Handler
    ↓
Context Action
    ↓
Service Layer (with batching/debouncing)
    ↓
Firebase SDK
    ↓
Firebase Realtime Database
    ↓
Real-time Broadcast
    ↓
All Connected Clients Update
```

## Authentication & Authorization

### Authentication Flow
```
User Access → Route Guard → Authentication Check
                              ↓
                         Authenticated?
                         ├── Yes → Protected Route
                         └── No → Anonymous Flow
                                   ↓
                              Anonymous User Creation
                                   ↓
                              Full App Access
```

### Authorization Patterns
- **Universal Edit Access**: Any user can edit any plan
- **Ownership Tracking**: Plans track original creator
- **Access History**: Track who accessed which plans
- **Anonymous Support**: Full functionality without accounts

## Performance Architecture

### Optimization Strategies

#### Frontend Optimizations
1. **Component Memoization**: React.memo for expensive components
2. **Context Splitting**: Separate contexts to minimize re-renders
3. **Lazy Loading**: Route-based code splitting
4. **Debounced Updates**: Reduce API call frequency
5. **Optimistic Updates**: Immediate UI feedback

#### Backend Optimizations
1. **Batched Writes**: Group Firebase operations
2. **Connection Pooling**: Efficient Firebase connections
3. **Data Denormalization**: Optimized read patterns
4. **Caching**: Multiple cache layers for performance

#### Caching Strategy
```
Browser Cache
    ↓
Component State Cache
    ↓
Context Cache
    ↓
Service Layer Cache
    ↓
Firebase Local Cache
    ↓
Firebase Server
```

## Security Architecture

### Security Measures
1. **Environment Variables**: Sensitive configuration
2. **Firebase Security Rules**: Database access control
3. **Input Validation**: Client and server-side validation
4. **HTTPS Enforcement**: Secure data transmission
5. **Content Security Policy**: XSS protection

### Firebase Security Rules
```javascript
{
  "rules": {
    "plans": {
      "$planId": {
        ".read": true,  // Universal read access
        ".write": "auth != null || auth.uid == 'anonymous'",
        "collaboration": {
          "activeUsers": {
            "$sessionId": {
              ".write": "$sessionId == auth.uid || auth.uid == 'anonymous'"
            }
          }
        }
      }
    }
  }
}
```

## Deployment Architecture

### Build Process
```
Source Code (GitHub)
    ↓
Vite Build Process
    ↓
Static Assets Generation
    ↓
Vercel Deployment
    ↓
CDN Distribution
    ↓
Global Edge Locations
```

### Environment Configuration
- **Development**: Local Vite server + Firebase Emulator
- **Staging**: Vercel preview deployments
- **Production**: Vercel production + Firebase production

### Monitoring & Observability
- **Firebase Analytics**: User behavior tracking
- **Vercel Analytics**: Performance monitoring
- **Console Logging**: Development debugging
- **Error Boundaries**: React error handling

## Scalability Considerations

### Current Limitations
- Firebase Realtime Database concurrent connections
- Client-side state management complexity
- Bundle size with feature growth

### Scaling Strategies
1. **Database Sharding**: Separate plans by region/user
2. **CDN Optimization**: Global asset distribution
3. **Code Splitting**: Feature-based lazy loading
4. **Service Workers**: Offline functionality
5. **Edge Computing**: Vercel Edge Functions

## Development Workflow

### Local Development
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test

# Build for production
bun run build
```

### Deployment Pipeline
```
Git Push → GitHub Actions → Vercel Build → Deployment → CDN Update
```

### Code Quality
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety (planned)
- **Testing**: Vitest + React Testing Library

This architecture overview provides a comprehensive understanding of MitPlan's system design, enabling developers to effectively work with and extend the application.
