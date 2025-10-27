# Boss Action Timelines Feature - Testing Checklist

## Pre-Testing Setup
- [ ] Ensure Firebase Realtime Database is running
- [ ] Deploy updated database rules to Firebase
- [ ] Clear browser cache and local storage
- [ ] Start development server (`bun run dev` or `npm run dev`)

## 1. Dashboard Integration

### Timeline Section Display
- [ ] Navigate to Dashboard
- [ ] Verify "Boss Action Timelines" section appears below "Shared Plans"
- [ ] Verify section shows timeline count badge
- [ ] Verify "Create Timeline" button is visible and styled correctly
- [ ] Verify empty state message when no timelines exist

### Timeline Cards
- [ ] Create a test timeline (see section 2)
- [ ] Verify timeline card displays:
  - [ ] Timeline name
  - [ ] Boss icon and name
  - [ ] Action count
  - [ ] Description (if provided)
  - [ ] Last updated date
- [ ] Verify action buttons are visible:
  - [ ] Edit button
  - [ ] View button
  - [ ] Create Mitplan button
  - [ ] Duplicate button
  - [ ] Copy Link button
  - [ ] Delete button

## 2. Timeline Creation

### Basic Creation Flow
- [ ] Click "Create Timeline" button
- [ ] Verify navigation to `/timeline/create`
- [ ] Verify page header shows "Create Timeline"
- [ ] Verify "Save Timeline" button is visible

### Timeline Settings
- [ ] Enter timeline name
- [ ] Select a boss from dropdown
- [ ] Enter optional description
- [ ] Verify all fields are editable

### Adding Boss Actions
- [ ] Verify boss actions list appears for selected boss
- [ ] Click on a boss action to add it
- [ ] Verify action appears in the timeline actions list
- [ ] Verify action shows correct time, icon, and name
- [ ] Add multiple boss actions
- [ ] Verify actions are sorted by time automatically

### Creating Custom Actions
- [ ] Click "Create Custom Action" button
- [ ] Verify modal opens with form fields
- [ ] Test required field validation:
  - [ ] Try to save without name (should show error)
  - [ ] Try to save with negative time (should show error)
- [ ] Fill in all fields:
  - [ ] Action name
  - [ ] Time (seconds)
  - [ ] Select an icon
  - [ ] Description
  - [ ] Damage type
  - [ ] Importance level
  - [ ] Unmitigated damage
  - [ ] Tank buster checkbox
  - [ ] Dual tank buster checkbox (if tank buster is checked)
- [ ] Click "Add Action"
- [ ] Verify custom action appears in timeline with "Custom" badge
- [ ] Verify custom action is sorted correctly by time

### Editing Custom Actions
- [ ] Click edit button (✏️) on a custom action
- [ ] Verify modal opens with existing data pre-filled
- [ ] Modify some fields
- [ ] Click "Update Action"
- [ ] Verify changes are reflected in the timeline

### Removing Actions
- [ ] Click delete button on an action
- [ ] Verify action is removed from the timeline
- [ ] Test removing both boss actions and custom actions

### Changing Boss
- [ ] Add some actions to the timeline
- [ ] Change the boss selection
- [ ] Verify confirmation dialog appears
- [ ] Click "Cancel" - verify boss doesn't change
- [ ] Change boss again and click "OK"
- [ ] Verify all actions are cleared
- [ ] Verify new boss actions list appears

### Saving Timeline
- [ ] Fill in all required fields
- [ ] Add at least one action
- [ ] Click "Save Timeline"
- [ ] Verify success toast appears
- [ ] Verify navigation to edit page with timeline ID in URL
- [ ] Verify timeline appears in Dashboard

### Validation
- [ ] Try to save without a name - verify error toast
- [ ] Try to save without any actions - verify error toast

## 3. Timeline Editing

### Edit Existing Timeline
- [ ] Click "Edit" on a timeline card in Dashboard
- [ ] Verify navigation to `/timeline/edit/{timelineId}`
- [ ] Verify page header shows "Edit Timeline"
- [ ] Verify all existing data is loaded:
  - [ ] Timeline name
  - [ ] Boss selection
  - [ ] Description
  - [ ] All actions
- [ ] Modify timeline name
- [ ] Add new actions
- [ ] Remove some actions
- [ ] Click "Save Timeline"
- [ ] Verify success toast appears
- [ ] Verify changes are saved (check Dashboard)

## 4. Timeline Viewing

### View Timeline (Authenticated)
- [ ] Click "View" on a timeline card
- [ ] Verify navigation to `/timeline/view/{timelineId}`
- [ ] Verify timeline details are displayed:
  - [ ] Timeline name
  - [ ] Boss icon and name
  - [ ] Description (if provided)
  - [ ] All actions sorted by time
  - [ ] Timeline stats (total actions, custom actions, tank busters)
- [ ] Verify action buttons are visible:
  - [ ] Edit button (if owner)
  - [ ] Share button
  - [ ] Create Mitplan button
- [ ] Verify actions display all details:
  - [ ] Icon, name, time
  - [ ] Custom badge (if custom)
  - [ ] Tank buster badges
  - [ ] Damage type and importance
  - [ ] Description
  - [ ] Unmitigated damage (if provided)

### View Shared Timeline (Anonymous)
- [ ] Copy shareable link from a timeline
- [ ] Open link in incognito/private browser window
- [ ] Verify timeline loads at `/timeline/shared/{timelineId}`
- [ ] Verify all timeline details are visible
- [ ] Verify Edit button is NOT visible (read-only)
- [ ] Verify Share and Create Mitplan buttons are visible

## 5. Timeline Sharing

### Copy Shareable Link
- [ ] Click "Copy Link" on a timeline card
- [ ] Verify success toast appears
- [ ] Paste link in browser - verify it works
- [ ] Verify link format: `{baseUrl}/timeline/shared/{timelineId}`

### Share Button in Viewer
- [ ] Open timeline viewer
- [ ] Click "Share" button
- [ ] Verify link is copied to clipboard
- [ ] Verify success toast appears

## 6. Create Mitplan from Timeline

### From Timeline Card
- [ ] Click "Create Mitplan" on a timeline card
- [ ] Verify navigation to `/plan/create-from-timeline/{timelineId}`
- [ ] Verify page shows:
  - [ ] Timeline preview with all actions
  - [ ] Plan settings form
  - [ ] Pre-populated plan name (timeline name + " - Mitplan")
  - [ ] Pre-populated description (from timeline)
  - [ ] Boss selection (read-only, from timeline)
  - [ ] Info box explaining what happens next

### From Timeline Viewer
- [ ] Open timeline viewer
- [ ] Click "Create Mitplan" button
- [ ] Verify same flow as above

### Create Mitplan Flow
- [ ] Modify plan name if desired
- [ ] Modify description if desired
- [ ] Click "Create Mitplan"
- [ ] Verify success toast appears
- [ ] Verify navigation to mitplan editor (`/plan/{planId}`)
- [ ] Verify new plan has:
  - [ ] Correct name
  - [ ] Correct boss
  - [ ] Correct description
  - [ ] Boss actions available in the planner
- [ ] Verify new plan appears in Dashboard under "My Plans"

### Validation
- [ ] Try to create mitplan without a name - verify error toast

## 7. Timeline Duplication

### Duplicate Timeline
- [ ] Click "Duplicate" on a timeline card
- [ ] Verify success toast appears
- [ ] Verify new timeline appears in Dashboard
- [ ] Verify duplicated timeline has:
  - [ ] Name with " (Copy)" suffix
  - [ ] Same boss
  - [ ] Same description
  - [ ] Same actions
  - [ ] Different timeline ID
  - [ ] Current timestamp for createdAt/updatedAt

## 8. Timeline Deletion

### Delete Timeline
- [ ] Click "Delete" on a timeline card
- [ ] Verify confirmation modal appears
- [ ] Click "Cancel" - verify timeline is NOT deleted
- [ ] Click "Delete" again
- [ ] Click "Confirm" in modal
- [ ] Verify success toast appears
- [ ] Verify timeline is removed from Dashboard
- [ ] Verify timeline is removed from Firebase

## 9. Edge Cases & Error Handling

### Network Errors
- [ ] Disconnect from internet
- [ ] Try to create a timeline - verify error toast
- [ ] Try to load timelines - verify error handling
- [ ] Reconnect and verify functionality resumes

### Invalid Timeline IDs
- [ ] Navigate to `/timeline/view/invalid-id`
- [ ] Verify error toast appears
- [ ] Verify redirect to Dashboard

### Permission Checks
- [ ] Create a timeline with User A
- [ ] Copy timeline ID
- [ ] Login as User B
- [ ] Try to edit User A's timeline
- [ ] Verify appropriate access control (should only allow viewing)

### Empty States
- [ ] Create a timeline with no actions
- [ ] Try to save - verify error toast
- [ ] View a timeline with no description
- [ ] Verify description section is hidden or shows appropriate message

### Long Content
- [ ] Create a timeline with a very long name (100+ characters)
- [ ] Verify validation limits name length
- [ ] Create a timeline with a very long description (500+ characters)
- [ ] Verify validation limits description length
- [ ] Add many actions (20+)
- [ ] Verify scrolling works correctly

## 10. UI/UX Verification

### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] Verify all components are responsive
- [ ] Verify touch interactions work on mobile

### Theme Support
- [ ] Switch to dark mode
- [ ] Verify all timeline components use correct theme colors
- [ ] Switch to light mode
- [ ] Verify all timeline components use correct theme colors

### Loading States
- [ ] Verify loading spinner appears when loading timelines
- [ ] Verify loading spinner appears when creating/saving timeline
- [ ] Verify loading spinner appears when creating mitplan

### Toast Notifications
- [ ] Verify success toasts for:
  - [ ] Timeline created
  - [ ] Timeline updated
  - [ ] Timeline duplicated
  - [ ] Timeline deleted
  - [ ] Link copied
  - [ ] Mitplan created
- [ ] Verify error toasts for:
  - [ ] Validation errors
  - [ ] Network errors
  - [ ] Permission errors

### Accessibility
- [ ] Test keyboard navigation
- [ ] Verify all buttons are keyboard accessible
- [ ] Verify form inputs have proper labels
- [ ] Verify modals can be closed with Escape key

## 11. Integration with Existing Features

### Dashboard Integration
- [ ] Verify timeline section doesn't break existing plan sections
- [ ] Verify "My Plans" section still works
- [ ] Verify "Shared Plans" section still works
- [ ] Verify plan creation still works

### Mitplan Editor Integration
- [ ] Create a mitplan from a timeline
- [ ] Verify boss actions from timeline are available
- [ ] Verify you can assign mitigations to boss actions
- [ ] Verify mitplan saving works correctly

### Authentication Integration
- [ ] Test with authenticated user
- [ ] Test with anonymous user (viewing shared timelines)
- [ ] Verify logout doesn't break timeline viewing
- [ ] Verify login/signup flow still works

## 12. Firebase Integration

### Database Rules
- [ ] Verify timelines are stored under `/timelines/{timelineId}`
- [ ] Verify timeline data structure matches schema
- [ ] Verify validation rules are enforced
- [ ] Verify read/write permissions work correctly

### Data Persistence
- [ ] Create a timeline
- [ ] Refresh the page
- [ ] Verify timeline still appears
- [ ] Edit the timeline
- [ ] Refresh the page
- [ ] Verify changes are persisted

## Post-Testing

### Cleanup
- [ ] Delete test timelines
- [ ] Delete test mitplans
- [ ] Clear browser cache
- [ ] Verify no console errors

### Documentation
- [ ] Review TIMELINE_FEATURE_SUMMARY.md
- [ ] Verify all features are documented
- [ ] Update user documentation if needed

## Issues Found
(Document any issues found during testing here)

---

**Testing Date:** _______________
**Tested By:** _______________
**Environment:** _______________
**Status:** ⬜ Pass | ⬜ Fail | ⬜ Partial

