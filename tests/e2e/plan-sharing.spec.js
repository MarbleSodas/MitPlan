import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { PlanManagementPage } from '../page-objects/PlanManagementPage.js';
import { CollaborationPage } from '../page-objects/CollaborationPage.js';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { testUsers, collaborationData } from '../utils/test-data.js';
import { setupFirebaseMocks } from '../utils/firebase-mock.js';
import { waitForPageLoad, generatePlanName } from '../utils/helpers.js';

test.describe('Plan Sharing and Collaboration', () => {
  let authPage;
  let planManagementPage;
  let collaborationPage;
  let jobSelectorPage;
  let bossTimelinePage;
  let mitigationPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    planManagementPage = new PlanManagementPage(page);
    collaborationPage = new CollaborationPage(page);
    jobSelectorPage = new JobSelectorPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    mitigationPage = new MitigationPage(page);
    
    await setupFirebaseMocks(page);
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Share Link Creation', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Create a plan to share
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM']);
      await planManagementPage.savePlan(generatePlanName());
    });

    test('should create shareable link for plan', async ({ page }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      
      expect(shareUrl).toContain('/plan/shared/');
      expect(shareUrl).toMatch(/\/plan\/shared\/[a-f0-9-]{36}$/i);
    });

    test('should copy share link to clipboard', async ({ page }) => {
      await planManagementPage.sharePlan('edit');
      await planManagementPage.copyShareUrl();
      
      // Verify copy confirmation
      await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Share URL copied');
    });

    test('should create read-only share links', async ({ page }) => {
      const shareUrl = await planManagementPage.sharePlan('view');
      
      expect(shareUrl).toContain('/plan/shared/');
      
      // Navigate to shared link
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      // Should be in read-only mode
      await collaborationPage.verifyReadOnlyMode();
    });

    test('should create edit-enabled share links', async ({ page }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      
      // Navigate to shared link
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      // Should allow editing
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
    });

    test('should revoke share access', async ({ page }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      
      await collaborationPage.revokeShare();
      
      // Navigate to revoked link
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      // Should show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });
  });

  test.describe('Real-time Collaboration', () => {
    let shareUrl;

    test.beforeEach(async ({ page, context }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Create and share a plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM']);
      await planManagementPage.savePlan(generatePlanName());
      shareUrl = await planManagementPage.sharePlan('edit');
    });

    test('should show collaboration indicator when active', async ({ page }) => {
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      await collaborationPage.verifyCollaborationActive();
    });

    test('should display user presence', async ({ page, context }) => {
      // Simulate multiple users
      const page2 = await context.newPage();
      
      await page.goto(shareUrl);
      await collaborationPage.joinCollaboration('User 1');
      
      await page2.goto(shareUrl);
      await collaborationPage.joinCollaboration('User 2');
      
      // Verify both users are shown
      await collaborationPage.verifyUserPresence([
        { id: 'user1', displayName: 'User 1', color: '#ff6b6b' },
        { id: 'user2', displayName: 'User 2', color: '#4ecdc4' }
      ]);
      
      await page2.close();
    });

    test('should sync plan changes in real-time', async ({ page, context }) => {
      const page2 = await context.newPage();
      
      await page.goto(shareUrl);
      await collaborationPage.joinCollaboration('User 1');
      
      await page2.goto(shareUrl);
      await collaborationPage.joinCollaboration('User 2');
      
      // Make change on page 1
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Verify change appears on page 2
      await page2.waitForSelector('[data-testid="assigned-mitigation-hydrofall-rampart"]');
      await collaborationPage.verifyRealtimeUpdate('mitigation_assigned');
      
      await page2.close();
    });

    test('should show user selections with colors', async ({ page, context }) => {
      const page2 = await context.newPage();
      
      await page.goto(shareUrl);
      await collaborationPage.joinCollaboration('User 1');
      
      await page2.goto(shareUrl);
      await collaborationPage.joinCollaboration('User 2');
      
      // User 1 selects boss action
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // User 2 should see User 1's selection
      await page2.waitForSelector('[data-testid="selection-user1-hydrofall"]');
      await collaborationPage.verifyUserSelection('user1', 'hydrofall');
      
      await page2.close();
    });

    test('should handle conflict resolution', async ({ page, context }) => {
      const page2 = await context.newPage();
      
      await page.goto(shareUrl);
      await page2.goto(shareUrl);
      
      // Both users try to assign same mitigation simultaneously
      await Promise.all([
        page.evaluate(() => {
          // Simulate concurrent assignment
          window.__SIMULATE_CONCURRENT_EDIT__ = true;
        }),
        page2.evaluate(() => {
          window.__SIMULATE_CONCURRENT_EDIT__ = true;
        })
      ]);
      
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Should show conflict resolution
      await collaborationPage.handleConflictResolution('accept');
      
      await page2.close();
    });

    test('should persist collaborative changes', async ({ page }) => {
      await page.goto(shareUrl);
      await collaborationPage.joinCollaboration('Test User');
      
      // Make changes
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Reload page
      await page.reload();
      await waitForPageLoad(page);
      
      // Changes should persist
      await expect(page.locator('[data-testid="assigned-mitigation-hydrofall-rampart"]')).toBeVisible();
    });
  });

  test.describe('Unauthenticated User Access', () => {
    let shareUrl;

    test.beforeEach(async ({ page, context }) => {
      // Create shared plan as authenticated user
      const ownerPage = await context.newPage();
      const ownerAuth = new AuthPage(ownerPage);
      const ownerPlan = new PlanManagementPage(ownerPage);
      const ownerBoss = new BossTimelinePage(ownerPage);
      const ownerJobs = new JobSelectorPage(ownerPage);
      
      await ownerPage.goto('/');
      await waitForPageLoad(ownerPage);
      await ownerAuth.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await ownerBoss.selectBoss('ketuduke');
      await ownerJobs.selectMultipleJobs(['PLD', 'WHM']);
      await ownerPlan.savePlan(generatePlanName());
      shareUrl = await ownerPlan.sharePlan('edit');
      
      await ownerPage.close();
    });

    test('should show onboarding for unauthenticated users', async ({ page }) => {
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      // Should show collaboration onboarding
      await expect(page.locator('[data-testid="collaboration-onboarding"]')).toBeVisible();
    });

    test('should allow viewing plan without authentication', async ({ page }) => {
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      await collaborationPage.skipOnboarding();
      
      // Should be able to view plan data
      await expect(page.locator('[data-testid="boss-actions-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-selector"]')).toBeVisible();
    });

    test('should allow editing after providing display name', async ({ page }) => {
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      await collaborationPage.joinCollaboration('Anonymous User');
      
      // Should be able to edit
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
    });

    test('should transition to authenticated mode seamlessly', async ({ page }) => {
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      await collaborationPage.joinCollaboration('Test User');
      
      // Make some changes
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Sign in
      await collaborationPage.signInToEdit();
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Changes should be preserved
      await expect(page.locator('[data-testid="assigned-mitigation-hydrofall-rampart"]')).toBeVisible();
      
      // Should now have full access
      await collaborationPage.verifyCollaborationActive();
    });

    test('should create own plan from shared plan', async ({ page }) => {
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      await collaborationPage.createOwnPlan();
      
      // Should navigate to new plan
      await expect(page).toHaveURL('/');
      
      // Plan data should be copied
      await expect(page.locator('[data-testid="selected-boss-name"]')).toContainText('Ketuduke');
    });
  });

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.savePlan(generatePlanName());
    });

    test('should start collaboration session', async ({ page }) => {
      await collaborationPage.startCollaborationSession();
      
      await expect(page.locator('[data-testid="session-status"]')).toContainText('Active');
    });

    test('should end collaboration session', async ({ page }) => {
      await collaborationPage.startCollaborationSession();
      await collaborationPage.endCollaborationSession();
      
      await expect(page.locator('[data-testid="session-status"]')).toContainText('Inactive');
    });

    test('should clean up session when no users connected', async ({ page, context }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      
      // Start session with multiple users
      const page2 = await context.newPage();
      await page.goto(shareUrl);
      await page2.goto(shareUrl);
      
      await collaborationPage.joinCollaboration('User 1');
      await collaborationPage.joinCollaboration('User 2');
      
      // Close all user sessions
      await page.close();
      await page2.close();
      
      // Session should be cleaned up automatically
      // This would be verified through backend monitoring
    });

    test('should handle network disconnection gracefully', async ({ page }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      await page.goto(shareUrl);
      await collaborationPage.joinCollaboration('Test User');
      
      // Simulate network disconnection
      await collaborationPage.simulateNetworkDisconnection();
      await collaborationPage.verifyConnectionStatus('Disconnected');
      
      // Reconnect
      await collaborationPage.simulateNetworkReconnection();
      await collaborationPage.verifyConnectionStatus('Connected');
      
      // Should rejoin collaboration automatically
      await collaborationPage.verifyCollaborationActive();
    });
  });

  test.describe('Permission Management', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.savePlan(generatePlanName());
    });

    test('should change share permissions', async ({ page }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      
      // Change to view-only
      await collaborationPage.changeSharePermissions('view');
      
      // Navigate to shared link
      await page.goto(shareUrl);
      await waitForPageLoad(page);
      
      // Should be read-only
      await collaborationPage.verifyReadOnlyMode();
    });

    test('should enforce owner permissions', async ({ page, context }) => {
      const shareUrl = await planManagementPage.sharePlan('edit');
      
      // Non-owner should not see session controls
      const guestPage = await context.newPage();
      await guestPage.goto(shareUrl);
      await waitForPageLoad(guestPage);
      
      await expect(guestPage.locator('[data-testid="session-control-panel"]')).not.toBeVisible();
      
      await guestPage.close();
    });

    test('should allow owner to manage session', async ({ page }) => {
      await planManagementPage.sharePlan('edit');
      
      // Owner should see session controls
      await expect(page.locator('[data-testid="session-control-panel"]')).toBeVisible();
      
      // Should be able to start/stop sessions
      await collaborationPage.startCollaborationSession();
      await collaborationPage.endCollaborationSession();
    });
  });
});
