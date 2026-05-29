# Presence System Documentation Gap - Implementation Plan

## Objective

Create comprehensive documentation for the Presence System to address the identified gap. The current documentation mentions `PresenceContext` and `presenceService` but lacks detailed coverage of the architecture, data structures, and usage patterns.

## Gap Analysis

### Current State
- `PresenceContext.tsx` (545 lines) - fully implemented
- `presenceService.ts` (335 lines) - fully implemented
- `types/presence.ts` (307 lines) - comprehensive types defined
- `collaborationPaths.ts` (45 lines) - path utilities

### Documentation Gap
- Basic references exist in docs but no dedicated documentation
- No explanation of presence data structures
- No flow diagrams or architecture details
- No usage examples or integration patterns

## Implementation Plan

### Phase 1: Core Documentation Creation

- [ ] Create `documentation/10-presence-system.md` with comprehensive coverage

**Document Structure:**
1. Overview - What the presence system does
2. Architecture - How components connect
3. Data Structures - Type definitions and schemas
4. Firebase Path Structure - Database layout
5. Context API - PresenceContext usage
6. Service API - presenceService functions
7. Throttling & Performance - How updates are optimized
8. Integration Points - How it connects with CollaborationContext
9. UI Components - How presence data is rendered
10. Troubleshooting - Common issues

### Phase 2: Technical Details

- [ ] Document presence data flow from user action to Firebase
- [ ] Document throttling channels (activity, cursor, viewport)
- [ ] Document presence entity types (assignment, bossAction, job, etc.)
- [ ] Document collaboration surfaces (planner, timeline)

### Phase 3: Database Schema Update

- [ ] Update `05-database-schema.md` with presence path structure:
```
/planCollaboration/plan:{planId}/presence/{sessionId}/
├── activeTarget: { surface, entityType, entityId, field, slotId, panel, section, key }
├── interaction: 'hovering' | 'selected' | 'editing' | null
├── cursor: { surface, x, y, panel, containerWidth, containerHeight }
├── viewport: { surface, panel, section, scrollTop }
└── lastUpdated: timestamp
```

### Phase 4: Integration Documentation

- [ ] Document how PresenceProvider wraps CollaborationProvider
- [ ] Document heartbeat mechanism (10s interval for sticky presence)
- [ ] Document staleness timeout (30s)
- [ ] Document disconnect handler for cleanup

### Phase 5: Usage Examples

- [ ] Add code examples for `usePresence()` hook usage
- [ ] Add examples for `setActiveTarget`, `setInteraction`, `setCursor`
- [ ] Add examples for `getPresenceForTarget` and `isTargetActiveByOthers`

## Verification Criteria

1. New documentation file covers all major presence components
2. Firebase path structure is accurate with actual implementation
3. Type definitions are correctly documented
4. Integration with CollaborationContext is explained
5. Performance mechanisms (throttling, debouncing) are documented
6. Code examples compile and match actual API signatures

## Dependencies

- `src/contexts/PresenceContext.tsx`
- `src/services/presenceService.ts`
- `src/types/presence.ts`
- `src/services/collaborationPaths.ts`

## Alternative Approaches

1. **Expand existing docs** - Add presence section to `02-technical-implementation.md` instead of new file
   - Trade-off: Would make that file longer; new file provides better organization

2. **Update architecture doc** - Add presence flow diagram to `03-architecture-overview.md`
   - Trade-off: Better for architectural understanding; less detail on API

3. **Add to feature inventory** - Expand presence section in `01-feature-inventory.md`
   - Trade-off: Good for overview; insufficient for implementation details

## Selected Approach

Create dedicated `10-presence-system.md` file (numbered to match existing doc pattern) with comprehensive coverage. This provides:
- Focused documentation for developers implementing presence features
- Easy reference without scrolling through architecture docs
- Clear separation from collaboration system (which it builds upon)