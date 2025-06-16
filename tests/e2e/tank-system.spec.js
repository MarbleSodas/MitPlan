import { test, expect } from '@playwright/test';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { waitForPageLoad, selectJobs } from '../utils/helpers.js';

test.describe('Tank System', () => {
  let jobSelectorPage;
  let mitigationPage;
  let bossTimelinePage;

  test.beforeEach(async ({ page }) => {
    jobSelectorPage = new JobSelectorPage(page);
    mitigationPage = new MitigationPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    
    await page.goto('/');
    await waitForPageLoad(page);
    await bossTimelinePage.selectBoss('ketuduke');
  });

  test.describe('Tank Selection and Positioning', () => {
    test('should allow selecting up to 2 tanks', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      await jobSelectorPage.verifyJobCardState('PLD', true);
      
      await jobSelectorPage.selectJob('WAR');
      await jobSelectorPage.verifyJobCardState('WAR', true);
      
      // Tank position selector should appear
      await expect(page.locator('[data-testid="tank-position-selector"]')).toBeVisible();
    });

    test('should prevent selecting more than 2 tanks', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      await jobSelectorPage.selectJob('WAR');
      await jobSelectorPage.selectJob('DRK');
      
      // Third tank should be disabled or show warning
      await jobSelectorPage.verifyJobCardState('DRK', false, true);
    });

    test('should assign tank positions correctly', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'OT');
    });

    test('should allow reassigning tank positions', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Reassign positions
      await jobSelectorPage.assignTankPositions('WAR', 'PLD');
      
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'OT');
    });

    test('should hide tank position selector with only one tank', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      
      await expect(page.locator('[data-testid="tank-position-selector"]')).not.toBeVisible();
    });

    test('should handle tank deselection', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Deselect one tank
      await jobSelectorPage.deselectJob('WAR');
      
      // Tank position selector should disappear
      await expect(page.locator('[data-testid="tank-position-selector"]')).not.toBeVisible();
      
      // PLD position assignment should be cleared
      const positionIndicator = page.locator('[data-testid="tank-position-MT-PLD"]');
      await expect(positionIndicator).not.toBeVisible();
    });
  });

  test.describe('Tank-Specific Mitigation Assignment', () => {
    test.beforeEach(async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
    });

    test('should assign self-only tank abilities to correct tank', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      
      // Assign Hallowed Ground (PLD-only ability)
      await mitigationPage.assignMitigationWithTankSelection('hallowed_ground', 'fluke_typhoon', 'MT');
      
      await mitigationPage.verifyTankPositionAssignment('hallowed_ground', 'fluke_typhoon', 'MT');
    });

    test('should assign single-target abilities to either tank', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      
      // Assign Rampart to OT
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'fluke_typhoon', 'OT');
      
      await mitigationPage.verifyTankPositionAssignment('rampart', 'fluke_typhoon', 'OT');
    });

    test('should bypass tank selection for party-wide abilities', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Reprisal should not trigger tank selection modal
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      await expect(page.locator('[data-testid="tank-selection-modal"]')).not.toBeVisible();
    });

    test('should show different mitigation options for each tank job', async ({ page }) => {
      // PLD should have Hallowed Ground
      await mitigationPage.verifyMitigationVisibility('hallowed_ground', true);
      
      // WAR should have Holmgang
      await mitigationPage.verifyMitigationVisibility('holmgang', true);
      
      // Each tank should only see their job-specific abilities
      await jobSelectorPage.deselectJob('WAR');
      await mitigationPage.verifyMitigationVisibility('holmgang', false);
    });
  });

  test.describe('Dual Tank Health Bars', () => {
    test.beforeEach(async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
    });

    test('should show MT health bar for single-target tank busters', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      
      // Should show only MT health bar
      await expect(page.locator('[data-testid="mt-health-bar-fluke_typhoon"]')).toBeVisible();
      await expect(page.locator('[data-testid="ot-health-bar-fluke_typhoon"]')).not.toBeVisible();
    });

    test('should show both tank health bars for dual-target attacks', async ({ page }) => {
      // Mock a dual-tank buster
      await page.addInitScript(() => {
        window.__MOCK_DUAL_TANK_BUSTER__ = {
          id: 'dual_buster',
          name: 'Dual Tank Buster',
          type: 'dual-tank',
          damage: 100000
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Both health bars should be visible
      await expect(page.locator('[data-testid="mt-health-bar-dual_buster"]')).toBeVisible();
      await expect(page.locator('[data-testid="ot-health-bar-dual_buster"]')).toBeVisible();
    });

    test('should show party health bar for raid-wide damage', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Should show party health bar, not individual tank bars
      await expect(page.locator('[data-testid="party-health-bar-hydrofall"]')).toBeVisible();
      await expect(page.locator('[data-testid="mt-health-bar-hydrofall"]')).not.toBeVisible();
    });

    test('should calculate separate mitigation for each tank', async ({ page }) => {
      // Mock dual-tank scenario
      await page.addInitScript(() => {
        window.__MOCK_DUAL_TANK_BUSTER__ = {
          id: 'dual_buster',
          type: 'dual-tank'
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      await bossTimelinePage.selectBossAction('dual_buster');
      
      // Assign different mitigations to each tank
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'dual_buster', 'MT');
      await mitigationPage.assignMitigationWithTankSelection('vengeance', 'dual_buster', 'OT');
      
      // Each tank should show different mitigation percentages
      const mtMitigation = page.locator('[data-testid="mt-mitigation-percentage-dual_buster"]');
      const otMitigation = page.locator('[data-testid="ot-mitigation-percentage-dual_buster"]');
      
      await expect(mtMitigation).toContainText('20%'); // Rampart
      await expect(otMitigation).toContainText('30%'); // Vengeance
    });
  });

  test.describe('Tank Swap Mechanics', () => {
    test.beforeEach(async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
    });

    test('should handle tank swap scenarios', async ({ page }) => {
      // Mock a tank swap mechanic
      await page.addInitScript(() => {
        window.__MOCK_TANK_SWAP__ = {
          id: 'tank_swap',
          name: 'Tank Swap Required',
          type: 'tank-swap',
          swapTarget: 'OT'
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      await bossTimelinePage.selectBossAction('tank_swap');
      
      // Should show swap indicator
      await expect(page.locator('[data-testid="tank-swap-indicator"]')).toBeVisible();
    });

    test('should update tank positions after swap', async ({ page }) => {
      // Simulate tank position swap
      await jobSelectorPage.assignTankPositions('WAR', 'PLD');
      
      // Verify positions are updated
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'OT');
      
      // Previous assignments should be updated
      const previousAssignments = await mitigationPage.getAssignedMitigations('fluke_typhoon');
      // Verify assignments are maintained with new positions
    });
  });

  test.describe('Tank Cooldown Coordination', () => {
    test.beforeEach(async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
    });

    test('should track cooldowns separately for each tank', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      
      // Assign Rampart to MT
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'fluke_typhoon', 'MT');
      
      // Rampart should be on cooldown for MT but available for OT
      await mitigationPage.verifyMitigationOnCooldown('rampart', 90);
      
      // Select another action and try to assign to OT
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'hydrofall', 'OT');
      
      // Should be allowed since it's a different tank
      await mitigationPage.verifyTankPositionAssignment('rampart', 'hydrofall', 'OT');
    });

    test('should show shared cooldowns for party-wide abilities', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      // Reprisal should be on cooldown for both tanks
      await mitigationPage.verifyMitigationOnCooldown('reprisal', 60);
      
      // Should not be available for either tank
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.verifyMitigationAvailable('reprisal', false);
    });
  });

  test.describe('Single Tank Scenarios', () => {
    test('should handle single tank compositions', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      
      // No tank position selector should appear
      await expect(page.locator('[data-testid="tank-position-selector"]')).not.toBeVisible();
      
      // Tank abilities should work without position selection
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.dragMitigationToAction('rampart', 'fluke_typhoon');
      
      // Should not show tank selection modal
      await expect(page.locator('[data-testid="tank-selection-modal"]')).not.toBeVisible();
    });

    test('should automatically assign to single tank', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.dragMitigationToAction('hallowed_ground', 'fluke_typhoon');
      
      // Should be assigned without position selection
      await expect(page.locator('[data-testid="assigned-mitigation-fluke_typhoon-hallowed_ground"]')).toBeVisible();
    });
  });

  test.describe('Tank Job Switching', () => {
    test('should update available abilities when switching tank jobs', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      await mitigationPage.verifyMitigationVisibility('hallowed_ground', true);
      
      // Switch to WAR
      await jobSelectorPage.deselectJob('PLD');
      await jobSelectorPage.selectJob('WAR');
      
      // PLD abilities should be hidden, WAR abilities should appear
      await mitigationPage.verifyMitigationVisibility('hallowed_ground', false);
      await mitigationPage.verifyMitigationVisibility('holmgang', true);
    });

    test('should preserve assignments when switching positions', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Assign mitigation to MT (PLD)
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'fluke_typhoon', 'MT');
      
      // Swap tank positions
      await jobSelectorPage.assignTankPositions('WAR', 'PLD');
      
      // Assignment should still exist but with updated position
      await expect(page.locator('[data-testid="assigned-mitigation-fluke_typhoon-rampart"]')).toBeVisible();
    });
  });
});
