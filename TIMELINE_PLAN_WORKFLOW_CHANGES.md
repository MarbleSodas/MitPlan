# Timeline and Plan Creation Workflow Changes

## Summary
This document outlines the changes made to enhance the timeline and plan creation workflow, including the addition of a level input field for timelines and a new custom timeline selection interface for plan creation.

## Changes Implemented

### 1. Added Level Input to Timeline Creation (TimelineEditor.jsx)

**File**: `src/components/timeline/TimelineEditor.jsx`

**Changes**:
- Added a new state variable `level` (default: 100) to store the timeline level
- Added a level dropdown selector in the timeline settings UI with options for Level 90 and Level 100
- Modified the `loadTimeline` function to load the level from `timeline.bossMetadata?.level`
- Updated the `handleSaveTimeline` function to save the level in `bossMetadata` when creating/updating timelines

**Code Additions**:
```javascript
// State
const [level, setLevel] = useState(100);

// Load level from timeline
setLevel(timeline.bossMetadata?.level || 100);

// Save level to timeline
const timelineData = {
  // ... other fields
  bossMetadata: {
    level: level
  }
};
```

**UI Addition**:
```jsx
<div>
  <label className="block text-sm font-medium mb-2">Level</label>
  <select
    value={level}
    onChange={(e) => setLevel(parseInt(e.target.value))}
    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
  >
    <option value={90}>Level 90</option>
    <option value={100}>Level 100</option>
  </select>
  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
    Select the level for this timeline (affects damage calculations)
  </p>
</div>
```

### 2. Created CustomTimelineSelectionModal Component

**File**: `src/components/dashboard/CustomTimelineSelectionModal.jsx`

**Purpose**: Display user's custom timelines as selectable cards with a "+" card for creating new timelines

**Features**:
- Fetches and displays all user's custom (non-official) timelines
- Shows timeline cards with:
  - Timeline name
  - Level badge (from bossMetadata or boss data)
  - Ownership status (Owned/Collection)
  - Boss information and tags
  - Description
  - Action count and last updated date
- Includes a "Create New Timeline" card with a "+" icon
- Clicking a timeline card triggers plan creation
- Clicking the "+" card navigates to timeline creation page

**Key Functions**:
```javascript
const loadUserTimelines = async () => {
  const userId = isAnonymousMode ? anonymousUser?.id : user?.uid;
  const userTimelines = await getUserTimelines(userId);
  const customTimelines = userTimelines.filter(t => !t.official);
  setTimelines(customTimelines);
};

const handleTimelineClick = (timeline) => {
  setSelectedTimeline(timeline);
  setTimeout(() => {
    onSelectTimeline(timeline);
  }, 150);
};

const handleCreateNewTimeline = () => {
  navigate('/timeline/create');
  onClose();
};
```

### 3. Updated Dashboard Workflow

**File**: `src/components/dashboard/Dashboard.jsx`

**Changes**:
- Imported `CustomTimelineSelectionModal` component
- Imported `useToast` hook for user feedback
- Added state for `showCustomTimelineModal`
- Modified `handleBossSelected` to show CustomTimelineSelectionModal when bossId is null (custom timeline option)
- Added `handleCustomTimelineModalClose` function
- Added `handleTimelineSelected` function to create a plan from the selected timeline
- Added the CustomTimelineSelectionModal to the JSX render

**Workflow Logic**:
```javascript
const handleBossSelected = (bossId) => {
  setSelectedBossForPlan(bossId);
  setShowBossSelectionModal(false);
  
  // If bossId is null, show custom timeline selection modal
  // Otherwise, show the regular create plan modal
  if (bossId === null) {
    setShowCustomTimelineModal(true);
  } else {
    setShowCreateModal(true);
  }
};
```

**Plan Creation from Timeline**:
```javascript
const handleTimelineSelected = async (timeline) => {
  setShowCustomTimelineModal(false);
  
  try {
    const planData = {
      name: `${timeline.name} - Plan`,
      description: timeline.description || '',
      bossId: timeline.bossId || null,
      bossTags: timeline.bossTags || [],
      assignments: {},
      selectedJobs: {},
      tankPositions: {
        mainTank: null,
        offTank: null
      },
      sourceTimelineId: timeline.id,
      sourceTimelineName: timeline.name,
      bossMetadata: timeline.bossMetadata || null
    };

    const newPlan = await unifiedPlanService.createPlan(planData);
    
    addToast({
      type: 'success',
      title: 'Plan created!',
      message: `Plan created from timeline "${timeline.name}"`,
      duration: 3000
    });

    loadCategorizedPlans();
    handleNavigateToPlanner(newPlan.id);
  } catch (error) {
    addToast({
      type: 'error',
      title: 'Failed to create plan',
      message: error.message || 'Please try again.',
      duration: 4000
    });
  }
};
```

## User Flow

### Creating a Timeline with Level

1. User navigates to timeline creation page
2. User fills in timeline name
3. **NEW**: User selects level (90 or 100) from dropdown
4. User adds boss tags (optional)
5. User adds description (optional)
6. User adds boss actions
7. User saves timeline
8. Level is stored in `bossMetadata.level`

### Creating a Plan from Custom Timeline

1. User clicks "Create New Plan" on Dashboard
2. BossSelectionModal appears
3. User clicks "Custom Timeline" option (no boss)
4. **NEW**: CustomTimelineSelectionModal appears showing:
   - All user's custom timelines as cards
   - A "+" card to create new timeline
5. User has two options:
   
   **Option A - Select Existing Timeline**:
   - User clicks on a timeline card
   - A new empty plan is created with:
     - Timeline reference (sourceTimelineId, sourceTimelineName)
     - Boss metadata (including level)
     - Empty assignments and job selections
   - User is navigated to the plan editor
   - Success toast notification appears
   
   **Option B - Create New Timeline**:
   - User clicks the "+" card
   - User is navigated to timeline creation page
   - After creating timeline, user can return to dashboard and select it

## Data Structure Changes

### Timeline Object (bossMetadata)
```javascript
{
  id: "timeline_id",
  name: "Timeline Name",
  bossTags: ["boss_id"],
  bossId: "boss_id", // Legacy
  description: "Description",
  actions: [...],
  bossMetadata: {
    level: 100  // NEW: Level field (90 or 100)
  },
  // ... other fields
}
```

### Plan Object (from Timeline)
```javascript
{
  id: "plan_id",
  name: "Timeline Name - Plan",
  description: "Description",
  bossId: "boss_id",
  bossTags: ["boss_id"],
  assignments: {},
  selectedJobs: {},
  tankPositions: {
    mainTank: null,
    offTank: null
  },
  sourceTimelineId: "timeline_id",
  sourceTimelineName: "Timeline Name",
  bossMetadata: {
    level: 100  // Inherited from timeline
  },
  // ... other fields
}
```

## Benefits

1. **Level Tracking**: Timelines now store level information, which can be used for accurate damage calculations
2. **Improved UX**: Visual card-based interface for selecting timelines is more intuitive than a dropdown
3. **Quick Plan Creation**: Users can quickly create plans from their custom timelines without filling out forms
4. **Clear Workflow**: The "+" card makes it obvious how to create new timelines
5. **Metadata Preservation**: Boss metadata (including level) is properly passed from timeline to plan
6. **User Feedback**: Toast notifications provide clear feedback on success/failure

## Testing Checklist

- [x] Timeline creation with level selection works
- [x] Level is saved to bossMetadata
- [x] Level is loaded when editing existing timeline
- [ ] CustomTimelineSelectionModal displays user's timelines
- [ ] "+" card navigates to timeline creation
- [ ] Selecting a timeline creates a new plan
- [ ] Plan inherits timeline's bossMetadata (including level)
- [ ] Toast notifications appear on success/error
- [ ] Navigation to plan editor works after creation
- [ ] Works for both authenticated and anonymous users

## Files Modified

1. `src/components/timeline/TimelineEditor.jsx` - Added level input and storage
2. `src/components/dashboard/CustomTimelineSelectionModal.jsx` - New component (created)
3. `src/components/dashboard/Dashboard.jsx` - Updated workflow and plan creation

## Dependencies

- Existing: `getUserTimelines` from `timelineService.js`
- Existing: `unifiedPlanService.createPlan` method
- Existing: `useToast` hook for notifications
- Existing: `useAuth` hook for user context

