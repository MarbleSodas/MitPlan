# Timeline Management Documentation Gap - Implementation Plan

## Objective

Create comprehensive documentation for the Timeline Management System to address the identified gap. The current documentation has basic references to timeline browsing, editing, and viewing, but lacks detailed coverage of the components, services, and workflows.

## Gap Analysis

### Current State

**Timeline Components:**
| File | Lines | Purpose |
|------|-------|---------|
| `components/timeline/TimelineBrowser.tsx` | 503 | Browse and search public timelines with filtering |
| `components/timeline/TimelineEditor.tsx` | 213 | Create/edit timelines with collaboration shell |
| `components/timeline/TimelineViewer.tsx` | 307 | View timelines with edit/share actions |
| `components/timeline/TimelineCreateHub.tsx` | 375 | Central hub for timeline creation |
| `components/timeline/TimelineEditorCore.tsx` | - | Core editor logic |
| `components/timeline/PlanTimelineEditor.tsx` | - | Plan-based timeline editor |

**Timeline Utilities:**
| File | Purpose |
|------|---------|
| `utils/timeline/phaseOverrideResolver.ts` | Phase override resolution |
| `utils/timeline/adaptiveTimelineUtils.ts` | Adaptive timeline handling |

**Timeline Services:**
| File | Lines | Purpose |
|------|-------|---------|
| `services/timelineService.ts` | 1116 | Full CRUD for timelines in Firebase |

**Routes:**
| Route | Component | Purpose |
|-------|-----------|---------|
| `/timelines/` | TimelineBrowser | Browse public timelines |
| `/timeline/edit/:timelineId` | TimelineEditor | Edit existing timeline |
| `/timeline/view/:timelineId` | TimelineViewer | View timeline details |
| `/timeline/create/` | TimelineCreateHub | Create new timeline |

### Documentation Gap
- Timeline browser features (search, filtering, sorting, likes, collections) not documented
- Timeline editor source types (timeline, plan-seed, timeline-seed) not explained
- Timeline create hub workflow paths not documented
- Phase override resolution not detailed
- Timeline service API not fully covered
- Database schema for `/timelines/` and `/userCollections/` not complete

## Implementation Plan

### Phase 1: Core Documentation Creation

- [ ] Create `documentation/11-timeline-management.md` with comprehensive coverage

**Document Structure:**
1. Overview - Timeline system purpose and scope
2. Components - TimelineBrowser, TimelineEditor, TimelineViewer, TimelineCreateHub
3. Routes - Navigation and route parameters
4. Data Flow - How timelines are created, edited, and displayed
5. Services - timelineService API
6. Utilities - phaseOverrideResolver, adaptiveTimelineUtils

### Phase 2: Component Documentation

- [ ] Document TimelineBrowser features:
  - Public timeline browsing with pagination
  - Search and filtering by boss tags
  - Sorting (popularity, recent, alphabetical)
  - Like system with user tracking
  - Collection management
  - Timeline preview and navigation

- [ ] Document TimelineEditor features:
  - Edit mode vs create mode
  - Source types (timeline, plan-seed, timeline-seed)
  - Collaboration presence shell integration
  - Read-only mode for official timelines
  - URL parameter handling for sources

- [ ] Document TimelineViewer features:
  - View-only display
  - Edit/copy navigation
  - Share link generation
  - Create MitPlan from timeline
  - Owner vs viewer permissions

- [ ] Document TimelineCreateHub features:
  - Plan-seeded timelines
  - Timeline-seeded timelines
  - Official timeline browsing
  - Community timeline collection
  - Quick actions (copy, edit, view)

### Phase 3: Database Schema Update

- [ ] Update `05-database-schema.md` with complete timeline schema:
```
/timelines/{timelineId}/
├── name: string
├── description: string
├── bossId: string
├── bossTags: string[]
├── actions: BossAction[]
├── phases: TimelinePhase[]
├── ownerId: string
├── userId: string
├── isPublic: boolean
├── official: boolean
├── likes: number
├── likedBy: { [userId]: timestamp }
├── createdAt: timestamp
├── updatedAt: timestamp
├── version: string

/userCollections/{userId}/timelines/{timelineId}
├── addedAt: timestamp
├── liked: boolean
```

### Phase 4: Service API Documentation

- [ ] Document timelineService functions:
  - `getAllPublicTimelines(sortBy)` - Fetch public timelines
  - `getAllUniqueBossTags()` - Get available boss filters
  - `getTimeline(timelineId)` - Fetch single timeline
  - `createTimeline(timelineData, userId)` - Create new timeline
  - `updateTimeline(timelineId, updates)` - Update timeline
  - `deleteTimeline(timelineId)` - Delete timeline
  - `toggleLike(timelineId, userId)` - Like/unlike timeline
  - `hasUserLiked(timelineId, userId)` - Check like status
  - `addToCollection(userId, timelineId)` - Add to user collection
  - `removeFromCollection(userId, timelineId)` - Remove from collection
  - `getCollectionTimelineIds(userId)` - Get user's collection
  - `getOfficialTimelines()` - Fetch official timelines
  - `getUserTimelines(userId)` - Fetch user's timelines

### Phase 5: Utility Documentation

- [ ] Document phaseOverrideResolver:
  - `resolvePhaseAwareTimeline(timeline, phaseOverrides)`
  - ResolvedPhaseAwareTimeline interface
  - Phase skipping logic
  - Time offset calculations

- [ ] Document adaptiveTimelineUtils:
  - `createFlatTimelineCopy(timeline)` - Flatten nested timelines
  - `normalizeTimelineRecord(timeline)` - Normalize for storage
  - `prepareTimelineForStorage(timeline)` - Prepare for Firebase

## Verification Criteria

1. New documentation file covers all major timeline components
2. Route parameters and navigation flow are accurately documented
3. Timeline service API functions are documented with signatures
4. Database schema matches actual Firebase structure
5. Phase override resolution logic is explained
6. User workflows (browse, create, edit, view) are clear

## Dependencies

- `src/components/timeline/TimelineBrowser.tsx`
- `src/components/timeline/TimelineEditor.tsx`
- `src/components/timeline/TimelineViewer.tsx`
- `src/components/timeline/TimelineCreateHub.tsx`
- `src/services/timelineService.ts`
- `src/utils/timeline/phaseOverrideResolver.ts`
- `src/utils/timeline/adaptiveTimelineUtils.ts`
- `src/types/index.ts` (Timeline, BossAction types)
- `src/data/timelines/` (official timeline data)

## Alternative Approaches

1. **Expand existing docs** - Add timeline section to `02-technical-implementation.md`
   - Trade-off: Would make that file longer; new file provides better organization

2. **Update architecture doc** - Add timeline flow to `03-architecture-overview.md`
   - Trade-off: Better for architectural understanding; less detail on components

3. **Add to feature inventory** - Expand timeline section in `01-feature-inventory.md`
   - Trade-off: Good for overview; insufficient for implementation details

## Selected Approach

Create dedicated `11-timeline-management.md` file with comprehensive coverage. This provides:
- Focused documentation for developers working on timeline features
- Easy reference without scrolling through architecture docs
- Clear separation from planner system (which it serves)
- Complete coverage of browse, create, edit, and view workflows