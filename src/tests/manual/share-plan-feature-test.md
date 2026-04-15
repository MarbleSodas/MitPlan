# Share Plan Feature Manual Test Guide

This guide provides step-by-step instructions to manually test the public edit link plus frozen snapshot sharing model and verify that editable and read-only shared plans appear correctly.

## Test Scenario: Public Edit + Frozen Snapshot Sharing

### Prerequisites
- Firebase project configured
- Two different user accounts (or one authenticated + one anonymous)
- Development server running

### Test Steps

#### Step 1: Create a Plan (User A)
1. Log in as User A
2. Navigate to Dashboard
3. Create a new plan with a distinctive name (e.g., "Test Plan for Sharing")
4. Add some job selections and mitigation assignments
5. Save the plan
6. Note the plan ID from the URL

#### Step 2: Configure Sharing
1. On the dashboard, click the "Share" button for the created plan
2. Copy the editable link (should be in format: `/plan/shared/{planId}`)
3. Enable the public edit link if needed and verify it uses `/plan/shared/{planId}`
4. Enable the read-only snapshot link
5. Copy the view link (should be in format: `/plan/view/{viewToken}`)
6. Verify the share modal shows separate public edit and snapshot URLs

#### Step 3: Access the Read-Only View as Different User (User B)
1. Log out from User A
2. Navigate directly to the view URL copied in Step 2 as a guest
4. Verify the plan loads correctly
5. Verify there is no way to edit the original plan from this page
6. Verify the page exposes print functionality
7. Sign in as User B
8. Verify the page now shows "Make a Copy"
9. Create a copy and verify User B is taken to a new editable plan

#### Step 4: Verify Public Edit Access
1. Log back in as User A
2. Re-open the share modal and confirm the public edit link is still enabled
3. Log in as User B
4. Navigate to the editable link (`/plan/shared/{planId}`)
5. Verify the original plan opens in the editor
6. Make a small change and verify it saves successfully

#### Step 5: Verify Frozen Snapshot Behavior
1. Log back in as User A
2. Edit the original plan again after the snapshot link already exists
3. Open the existing snapshot link and verify it still shows the older captured state
4. Re-open the share modal and regenerate the snapshot link
5. Open the new snapshot link and verify it reflects the latest plan changes

#### Step 6: Verify Access Tracking
1. Open browser console and check for access tracking logs where applicable
2. Verify User B's read-only access was tracked after opening the public view
3. Verify edit-link access was tracked as editable shared access

#### Step 7: Check Shared Plans Section
1. Navigate to User B's dashboard
2. Verify the "Shared Plans" section appears (for authenticated users)
3. Verify the viewed plan appears as read-only and opens the `/plan/view/{viewToken}` route
4. Verify the editable shared plan appears and opens the `/plan/shared/{planId}` route
5. Verify the plan count is correct
5. **Check Creator Display Name**: Verify that the plan card shows "Created by: [User A's display name]" between the created and updated dates

#### Step 8: Verify Database State
1. Check Firebase Realtime Database
2. Navigate to `planShareViews/{viewToken}`
3. Verify a sanitized frozen snapshot record exists for the shared view
4. Verify the record includes `snapshotCreatedAt` and `sourcePlanUpdatedAt`
4. Navigate to `planShareViewTracking/{viewToken}/viewers/{userBId}`
5. Verify viewer tracking data exists with:
   - `firstAccess`: timestamp
   - `lastAccess`: timestamp  
   - `accessCount`: number
6. Navigate to `plans/{planId}`
7. Verify `isPublic: true` while the public edit link is enabled
8. Verify `shareSettings.viewToken` and `shareSettings.viewEnabled` match the active snapshot link

### Expected Results

✅ **Read-Only View**: Snapshot link loads a static frozen view-only page
✅ **Print**: View page prints correctly
✅ **Make a Copy**: Signed-in viewers can create a private copy
✅ **Editor Access**: Any signed-in user with the public edit link can open the editable shared route
✅ **Frozen Snapshot**: Existing snapshot links do not change after later plan edits
✅ **Shared Plans Section**: Viewed and editable shared plans appear correctly in User B's "Shared Plans" section
✅ **Creator Display Name**: Plan card shows "Created by: [User A's display name]"
✅ **Database State**: Share view snapshot metadata and viewer tracking data are stored in Firebase
✅ **Plan Counts**: Dashboard shows correct counts for owned vs shared plans

### Debugging

If the shared plans section is empty:

1. Check console logs for:
   - `[Dashboard] Loading categorized plans for user:`
   - `[PlanAccessService] Getting categorized plans for user:`
   - `[PlanAccessService] All accessible plans for user:`
   - `[PlanAccessService] Found shared plan:`

2. Verify Firebase data structure:
   ```
   planShareViews/
     {viewToken}/
       planId: ...
       snapshotCreatedAt: ...
       sourcePlanUpdatedAt: ...
       viewEnabled: true
   planShareViewTracking/
     {viewToken}/
       viewers/
         {userId}/
           firstViewedAt: timestamp
           lastViewedAt: timestamp
           accessCount: number
   ```

3. Check user authentication state and ensure User B is properly authenticated

If the creator display name is not showing:

1. Check console logs for:
   - `[PlanCard] Fetching creator display name for shared plan:`
   - `[PlanCard] Creator display name fetched:`
   - `[UserService] Getting display name for user:`
   - `[UserService] Found display name from collaboration data:` (if available)

2. Verify the plan has `ownerId` or `userId` field in Firebase
3. Check that User A has a display name set in their Firebase Auth profile
4. Note: Due to Firebase Auth security restrictions, display names for other users may show as "User" unless found in collaboration data
5. For best results, ensure User A has been active in real-time collaboration (which stores display names)

### Common Issues

- **Anonymous users**: Guests can view and print, but they must sign in before creating a copy
- **Editable route denied**: Verify the plan still has `isPublic: true` and User B is authenticated
- **Shared plans missing**: Verify `userProfiles/{userId}/accessedPlans` is populated
- **Firebase rules**: Ensure the new rules for `/plans`, `/planShareViews`, and `/planShareViewTracking` are deployed

### Expected Display Name Behavior

Due to Firebase Auth security restrictions, the creator display name will show:

1. **Current User's Plans**: Accurate display name (from Firebase Auth profile)
2. **Other Users' Plans**:
   - "User A's Display Name" if found in collaboration data
   - "User" as fallback if no collaboration data exists
   - "Anonymous User" for anonymous creators
3. **Loading State**: Shows "Loading creator..." while fetching

### Test Variations

1. **Anonymous to Authenticated**: Access plan as anonymous user, then log in
2. **Multiple Access**: Access same plan multiple times, verify accessCount increments
3. **Different Plans**: Access multiple different plans, verify all appear in shared section
4. **Collaboration Data**: Have User A join a real-time collaboration session to populate collaboration data, then test display name fetching
