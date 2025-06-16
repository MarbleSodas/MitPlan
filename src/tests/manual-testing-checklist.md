# Manual Testing Checklist for Shared Plan Functionality

This checklist covers all aspects of the shared plan functionality fixes to ensure everything works correctly for both authenticated and unauthenticated users.

## Prerequisites

- [ ] Development server running at localhost:5173
- [ ] Firebase project configured with Firestore and Realtime Database
- [ ] At least one test plan saved in the database with `isShared: true` and `isPublic: true`
- [ ] Browser developer tools open for monitoring console logs

## Test Plan Data Setup

Create test plans with the following characteristics:

### Test Plan 1: Complete Shared Plan
- [ ] Plan ID: `test-shared-plan-1`
- [ ] Name: "Complete Test Plan"
- [ ] Boss: Ketuduke
- [ ] Has mitigation assignments (at least 3-5 assignments)
- [ ] Has selected jobs (4-6 jobs including tanks)
- [ ] Has tank positions assigned
- [ ] `isShared: true`
- [ ] `isPublic: true`

### Test Plan 2: Minimal Shared Plan
- [ ] Plan ID: `test-shared-plan-2`
- [ ] Name: "Minimal Test Plan"
- [ ] Boss: Lala
- [ ] No mitigation assignments
- [ ] Few selected jobs
- [ ] No tank positions
- [ ] `isShared: true`
- [ ] `isPublic: true`

### Test Plan 3: Private Plan (Control)
- [ ] Plan ID: `test-private-plan-1`
- [ ] Name: "Private Test Plan"
- [ ] `isShared: false`
- [ ] `isPublic: false`

## 1. Plan Data Loading Tests

### 1.1 Shared Plan URL Access
- [ ] Navigate to `/plan/shared/test-shared-plan-1`
- [ ] Verify plan loads completely with all data:
  - [ ] Boss selection shows correct boss
  - [ ] Job cards show selected jobs
  - [ ] Mitigation assignments appear on boss actions
  - [ ] Tank positions are correctly assigned
- [ ] Check console for successful plan loading message
- [ ] Verify no validation errors in console

### 1.2 Invalid Plan ID
- [ ] Navigate to `/plan/shared/invalid-plan-id`
- [ ] Verify error notification appears
- [ ] Check error message is user-friendly
- [ ] Verify actionable buttons are present (Go to Home, etc.)

### 1.3 Private Plan Access
- [ ] Navigate to `/plan/shared/test-private-plan-1`
- [ ] Verify access denied error appears
- [ ] Check appropriate error message and actions

## 2. Data Validation Tests

### 2.1 Plan Data Integrity
- [ ] Open browser console
- [ ] Navigate to shared plan
- [ ] Look for validation log messages
- [ ] Verify no validation errors for complete plan
- [ ] Check warnings are logged for minimal plan

### 2.2 Collaboration Readiness
- [ ] Check console for collaboration validation messages
- [ ] Verify shared plans pass collaboration validation
- [ ] Confirm collaboration starts automatically for shared plans

## 3. Authentication State Tests

### 3.1 Unauthenticated User
- [ ] Ensure user is signed out
- [ ] Navigate to shared plan URL
- [ ] Verify plan loads in read-only mode
- [ ] Check read-only banner appears
- [ ] Verify collaboration onboarding appears
- [ ] Test that drag-and-drop is disabled
- [ ] Verify job selection is disabled
- [ ] Check remove buttons are hidden

### 3.2 Authenticated User
- [ ] Sign in to the application
- [ ] Navigate to shared plan URL
- [ ] Verify plan loads with edit capabilities
- [ ] Check collaboration features are enabled
- [ ] Test drag-and-drop functionality works
- [ ] Verify job selection works
- [ ] Check mitigation assignment/removal works

## 4. Collaboration Features Tests

### 4.1 Single User Collaboration
- [ ] Access shared plan as authenticated user
- [ ] Check collaboration indicator shows active
- [ ] Verify user presence indicator shows current user
- [ ] Look for collaboration success message

### 4.2 Multi-User Collaboration (if possible)
- [ ] Open shared plan in multiple browser tabs/windows
- [ ] Use different user accounts or anonymous users
- [ ] Test real-time updates:
  - [ ] Add mitigation in one tab, verify it appears in others
  - [ ] Change job selection, verify sync across tabs
  - [ ] Modify tank positions, check synchronization

### 4.3 Anonymous User Collaboration
- [ ] Access shared plan without authentication
- [ ] Enter display name when prompted
- [ ] Verify collaboration features become available
- [ ] Test making changes and seeing them sync

## 5. Error Handling Tests

### 5.1 Network Errors
- [ ] Disconnect internet while loading shared plan
- [ ] Verify appropriate error message appears
- [ ] Check retry functionality works
- [ ] Test graceful degradation

### 5.2 Collaboration Errors
- [ ] Force collaboration failure (disable Firebase)
- [ ] Verify plan still loads and works locally
- [ ] Check warning message about collaboration unavailability
- [ ] Confirm user can still view and edit plan

### 5.3 Validation Errors
- [ ] Create plan with invalid data structure
- [ ] Navigate to shared plan URL
- [ ] Verify validation error notifications
- [ ] Check error messages are helpful

## 6. User Experience Tests

### 6.1 Success Notifications
- [ ] Load shared plan successfully
- [ ] Verify success notification appears
- [ ] Check notification contains plan name and assignment count
- [ ] Verify notification auto-dismisses

### 6.2 Error Recovery
- [ ] Trigger various error scenarios
- [ ] Test action buttons in error notifications:
  - [ ] "Go to Home" button works
  - [ ] "Sign In" button opens auth modal
  - [ ] "Retry" button reloads plan
  - [ ] "Create New Plan" button works

### 6.3 Loading States
- [ ] Monitor loading behavior
- [ ] Verify smooth transitions
- [ ] Check no flickering or layout shifts
- [ ] Confirm loading indicators work properly

## 7. Data Consistency Tests

### 7.1 Plan Data Integrity
- [ ] Load shared plan
- [ ] Compare displayed data with database data
- [ ] Verify all assignments are correctly reconstructed
- [ ] Check job selections match database
- [ ] Confirm tank positions are accurate

### 7.2 Collaboration Session Data
- [ ] Start collaboration session
- [ ] Verify session data matches loaded plan data
- [ ] Check no data loss during session creation
- [ ] Confirm all metadata is preserved

## 8. Performance Tests

### 8.1 Loading Performance
- [ ] Measure plan loading time
- [ ] Check for unnecessary duplicate requests
- [ ] Verify efficient data fetching
- [ ] Monitor console for performance warnings

### 8.2 Collaboration Performance
- [ ] Test real-time update responsiveness
- [ ] Check for excessive network requests
- [ ] Verify efficient data synchronization
- [ ] Monitor memory usage during collaboration

## 9. Browser Compatibility Tests

### 9.1 Different Browsers
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

### 9.2 Mobile Devices
- [ ] Test on mobile browsers
- [ ] Verify responsive design works
- [ ] Check touch interactions
- [ ] Test collaboration on mobile

## 10. Edge Cases

### 10.1 Concurrent Access
- [ ] Multiple users accessing same plan simultaneously
- [ ] Users joining and leaving collaboration
- [ ] Network interruptions during collaboration
- [ ] Browser refresh during active collaboration

### 10.2 Data Edge Cases
- [ ] Plans with no assignments
- [ ] Plans with many assignments (50+)
- [ ] Plans with unusual job combinations
- [ ] Plans with missing optional fields

## Test Results

### Summary
- [ ] All critical functionality works
- [ ] Error handling is robust
- [ ] User experience is smooth
- [ ] Performance is acceptable
- [ ] No data integrity issues

### Issues Found
Document any issues discovered during testing:

1. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to reproduce**: [Steps]
   - **Expected behavior**: [Expected]
   - **Actual behavior**: [Actual]

2. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to reproduce**: [Steps]
   - **Expected behavior**: [Expected]
   - **Actual behavior**: [Actual]

### Recommendations
- [ ] All tests pass - ready for production
- [ ] Minor issues found - address before release
- [ ] Major issues found - requires additional development

---

**Testing completed by**: [Name]  
**Date**: [Date]  
**Environment**: [Development/Staging/Production]  
**Browser**: [Browser and version]
