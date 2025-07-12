# Share Plan Feature Manual Test Guide

This guide provides step-by-step instructions to manually test the share plan feature and verify that accessed plans appear in the shared plans section.

## Test Scenario: Share Plan Access Tracking

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

#### Step 2: Share the Plan
1. On the dashboard, click the "Share" button for the created plan
2. Copy the share link (should be in format: `/plan/edit/{planId}`)
3. Verify the share modal shows the correct URL

#### Step 3: Access Plan as Different User (User B)
1. Log out from User A
2. Log in as User B (or use anonymous mode)
3. Navigate directly to the share URL copied in Step 2
4. Verify the plan loads correctly
5. Make a small change (e.g., select a job or assign a mitigation)
6. Save the plan

#### Step 4: Verify Access Tracking
1. Open browser console and check for access tracking logs:
   - Look for `[RealtimePlanContext] Initial access tracked for authenticated user:`
   - Look for `[PlanAccessService] Tracked access to plan:`

#### Step 5: Check Shared Plans Section
1. Navigate to User B's dashboard
2. Verify the "Shared Plans" section appears (for authenticated users)
3. Check if the accessed plan appears in the "Shared Plans" section
4. Verify the plan count is correct
5. **Check Creator Display Name**: Verify that the plan card shows "Created by: [User A's display name]" between the created and updated dates

#### Step 6: Verify Database State
1. Check Firebase Realtime Database
2. Navigate to `plans/{planId}/accessedBy/{userBId}`
3. Verify access tracking data exists with:
   - `firstAccess`: timestamp
   - `lastAccess`: timestamp  
   - `accessCount`: number

### Expected Results

✅ **Access Tracking**: Console logs show access tracking is working
✅ **Plan Loading**: Shared plan loads correctly for User B
✅ **Shared Plans Section**: Plan appears in User B's "Shared Plans" section
✅ **Creator Display Name**: Plan card shows "Created by: [User A's display name]"
✅ **Database State**: Access data is stored in Firebase
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
   plans/
     {planId}/
       accessedBy/
         {userId}/
           firstAccess: timestamp
           lastAccess: timestamp
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

- **Anonymous users**: Shared plans section only shows for authenticated users
- **Access tracking**: Ensure plan is accessed via direct URL, not through dashboard
- **User context**: Verify unifiedPlanService has correct user context set
- **Firebase rules**: Ensure database rules allow read/write access

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
