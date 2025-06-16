import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { PlanManagementPage } from '../page-objects/PlanManagementPage.js';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { testUsers, testPlans } from '../utils/test-data.js';
import { setupFirebaseMocks, mockNetworkFailure } from '../utils/firebase-mock.js';
import { waitForPageLoad, generatePlanName } from '../utils/helpers.js';

test.describe('Plan Persistence', () => {
  let authPage;
  let planManagementPage;
  let jobSelectorPage;
  let bossTimelinePage;
  let mitigationPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    planManagementPage = new PlanManagementPage(page);
    jobSelectorPage = new JobSelectorPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    mitigationPage = new MitigationPage(page);
    
    await setupFirebaseMocks(page);
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Authenticated User Plan Storage', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
    });

    test('should save plan to Firestore', async ({ page }) => {
      // Create a plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM']);
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Save the plan
      const planName = await planManagementPage.savePlan(generatePlanName(), 'Test plan description');
      
      await planManagementPage.verifyPlanSaved(planName);
      await planManagementPage.verifyStorageStatus('Saved to cloud');
    });

    test('should load saved plan from Firestore', async ({ page }) => {
      // First save a plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM']);
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Clear current state
      await page.reload();
      await waitForPageLoad(page);
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Load the plan
      const savedPlans = await planManagementPage.getSavedPlans();
      const savedPlan = savedPlans.find(plan => plan.name === planName);
      
      await planManagementPage.loadPlan(savedPlan.id);
      
      // Verify plan data is restored
      await planManagementPage.verifyPlanLoaded({
        bossId: 'ketuduke',
        selectedJobs: [{ id: 'PLD', selected: true }, { id: 'WHM', selected: true }]
      });
    });

    test('should update existing plan', async ({ page }) => {
      // Save initial plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Modify the plan
      await jobSelectorPage.selectJob('WHM');
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Save again (should update existing plan)
      await planManagementPage.savePlan(planName);
      
      await planManagementPage.verifyPlanSaved(planName);
    });

    test('should delete saved plan', async ({ page }) => {
      // Save a plan
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Get plan ID
      const savedPlans = await planManagementPage.getSavedPlans();
      const savedPlan = savedPlans.find(plan => plan.name === planName);
      
      // Delete the plan
      await planManagementPage.deletePlan(savedPlan.id);
      
      // Verify plan is removed from list
      const updatedPlans = await planManagementPage.getSavedPlans();
      const deletedPlan = updatedPlans.find(plan => plan.name === planName);
      expect(deletedPlan).toBeUndefined();
    });

    test('should show plan preview before loading', async ({ page }) => {
      // Save a plan with specific data
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM', 'BLM']);
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Get plan ID and verify preview
      const savedPlans = await planManagementPage.getSavedPlans();
      const savedPlan = savedPlans.find(plan => plan.name === planName);
      
      await planManagementPage.verifyPlanPreview(savedPlan.id, {
        bossName: 'Ketuduke',
        jobCount: 3,
        mitigationCount: 1
      });
    });

    test('should handle plan save errors gracefully', async ({ page }) => {
      // Mock network failure
      await mockNetworkFailure(page, '**/plans/**');
      
      await bossTimelinePage.selectBoss('ketuduke');
      
      try {
        await planManagementPage.savePlan(generatePlanName());
      } catch (error) {
        // Should show error message
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Failed to save plan');
      }
    });

    test('should sync plans across devices', async ({ page }) => {
      // Save plan on first "device"
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Simulate different device by clearing local state
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Plan should be available from cloud
      const savedPlans = await planManagementPage.getSavedPlans();
      const syncedPlan = savedPlans.find(plan => plan.name === planName);
      expect(syncedPlan).toBeDefined();
    });
  });

  test.describe('Unauthenticated User Local Storage', () => {
    test('should save plan to localStorage when not authenticated', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Save should use localStorage
      await planManagementPage.savePlan(generatePlanName());
      
      await planManagementPage.verifyStorageStatus('Saved locally');
    });

    test('should load plan from localStorage', async ({ page }) => {
      // Save plan locally
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Reload page
      await page.reload();
      await waitForPageLoad(page);
      
      // Load the plan
      const savedPlans = await planManagementPage.getSavedPlans();
      const localPlan = savedPlans.find(plan => plan.name === planName);
      
      await planManagementPage.loadPlan(localPlan.id);
      
      await planManagementPage.verifyPlanLoaded({
        bossId: 'ketuduke',
        selectedJobs: [{ id: 'PLD', selected: true }]
      });
    });

    test('should migrate localStorage plans to Firestore on login', async ({ page }) => {
      // Save plan locally while unauthenticated
      await bossTimelinePage.selectBoss('ketuduke');
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Login
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Handle migration dialog
      await planManagementPage.handleMigrationDialog(true);
      
      // Plan should now be in cloud storage
      await planManagementPage.verifyStorageStatus('Saved to cloud');
    });

    test('should allow skipping migration', async ({ page }) => {
      // Save plan locally
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      // Login and skip migration
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await planManagementPage.handleMigrationDialog(false);
      
      // Local plan should still exist
      const savedPlans = await planManagementPage.getSavedPlans();
      const localPlan = savedPlans.find(plan => plan.name === planName);
      expect(localPlan).toBeDefined();
    });
  });

  test.describe('Plan Data Integrity', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
    });

    test('should preserve all plan data accurately', async ({ page }) => {
      // Create comprehensive plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WAR', 'WHM', 'SCH']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Assign multiple mitigations
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.assignMitigationWithTankSelection('hallowed_ground', 'fluke_typhoon', 'MT');
      
      // Save and reload
      const planName = await planManagementPage.savePlan(generatePlanName());
      await page.reload();
      await waitForPageLoad(page);
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      const savedPlans = await planManagementPage.getSavedPlans();
      const savedPlan = savedPlans.find(plan => plan.name === planName);
      await planManagementPage.loadPlan(savedPlan.id);
      
      // Verify all data is preserved
      await jobSelectorPage.verifyJobCardState('PLD', true);
      await jobSelectorPage.verifyJobCardState('WAR', true);
      await jobSelectorPage.verifyJobCardState('WHM', true);
      await jobSelectorPage.verifyJobCardState('SCH', true);
      
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'OT');
      
      const hydrofallAssignments = await mitigationPage.getAssignedMitigations('hydrofall');
      expect(hydrofallAssignments).toContain('rampart');
      expect(hydrofallAssignments).toContain('reprisal');
      
      const flukeAssignments = await mitigationPage.getAssignedMitigations('fluke_typhoon');
      expect(flukeAssignments).toContain('hallowed_ground');
    });

    test('should handle corrupted plan data gracefully', async ({ page }) => {
      // Mock corrupted data
      await page.addInitScript(() => {
        window.__MOCK_CORRUPTED_PLAN__ = {
          bossId: 'invalid_boss',
          selectedJobs: { invalid: 'data' },
          assignments: null
        };
      });
      
      try {
        await planManagementPage.loadPlan('corrupted-plan-id');
      } catch (error) {
        // Should show error message
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Failed to load plan');
      }
    });

    test('should validate plan data before saving', async ({ page }) => {
      // Try to save plan with invalid data
      await page.addInitScript(() => {
        window.__MOCK_INVALID_PLAN_DATA__ = true;
      });
      
      try {
        await planManagementPage.savePlan(generatePlanName());
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Invalid plan data');
      }
    });
  });

  test.describe('Auto-save and Sync', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
    });

    test('should auto-save changes periodically', async ({ page }) => {
      // Enable auto-save
      await page.addInitScript(() => {
        window.__ENABLE_AUTO_SAVE__ = true;
      });
      
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Wait for auto-save
      await page.waitForTimeout(2000);
      
      await planManagementPage.verifyStorageStatus('Auto-saved');
    });

    test('should show sync status indicator', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.savePlan(generatePlanName());
      
      await planManagementPage.verifySyncStatus('Synced');
    });

    test('should handle sync conflicts', async ({ page }) => {
      // Mock sync conflict
      await page.addInitScript(() => {
        window.__MOCK_SYNC_CONFLICT__ = true;
      });
      
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.savePlan(generatePlanName());
      
      // Should show conflict resolution dialog
      await expect(page.locator('[data-testid="sync-conflict-dialog"]')).toBeVisible();
    });
  });

  test.describe('Performance and Limits', () => {
    test.beforeEach(async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
    });

    test('should handle large number of saved plans', async ({ page }) => {
      // Mock many saved plans
      await page.addInitScript(() => {
        const manyPlans = [];
        for (let i = 0; i < 50; i++) {
          manyPlans.push({
            id: `plan-${i}`,
            name: `Test Plan ${i}`,
            lastModified: new Date().toISOString()
          });
        }
        window.__MOCK_MANY_PLANS__ = manyPlans;
      });
      
      const savedPlans = await planManagementPage.getSavedPlans();
      expect(savedPlans.length).toBeGreaterThan(10);
      
      // Should still be responsive
      await planManagementPage.loadPlan(savedPlans[0].id);
    });

    test('should enforce plan size limits', async ({ page }) => {
      // Create very large plan
      await page.addInitScript(() => {
        window.__MOCK_LARGE_PLAN__ = true;
      });
      
      try {
        await planManagementPage.savePlan(generatePlanName());
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Plan too large');
      }
    });

    test('should load plans quickly', async ({ page }) => {
      const planName = await planManagementPage.savePlan(generatePlanName());
      
      const startTime = Date.now();
      
      const savedPlans = await planManagementPage.getSavedPlans();
      const savedPlan = savedPlans.find(plan => plan.name === planName);
      await planManagementPage.loadPlan(savedPlan.id);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });
  });
});
