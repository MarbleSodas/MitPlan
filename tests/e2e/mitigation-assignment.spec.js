import { test, expect } from '@playwright/test';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { mitigationAbilities } from '../utils/test-data.js';
import { waitForPageLoad, selectBoss, selectJobs, verifyMitigationAssignment } from '../utils/helpers.js';

test.describe('Mitigation Assignment', () => {
  let mitigationPage;
  let bossTimelinePage;
  let jobSelectorPage;

  test.beforeEach(async ({ page }) => {
    mitigationPage = new MitigationPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    jobSelectorPage = new JobSelectorPage(page);
    
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Set up basic scenario
    await bossTimelinePage.selectBoss('ketuduke');
    await selectJobs(page, [{ id: 'PLD' }, { id: 'WHM' }]);
  });

  test.describe('Basic Drag and Drop', () => {
    test('should assign mitigation to boss action via drag and drop', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      await verifyMitigationAssignment(page, 'hydrofall', 'rampart');
    });

    test('should only allow drag when boss action is selected', async ({ page }) => {
      // Try to drag without selecting boss action
      const mitigation = page.locator('[data-testid="mitigation-rampart"]');
      const bossAction = page.locator('[data-testid="boss-action-hydrofall"]');
      
      // Mitigation should not be draggable
      await expect(mitigation).toHaveAttribute('draggable', 'false');
      
      // Select boss action
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Now mitigation should be draggable
      await expect(mitigation).toHaveAttribute('draggable', 'true');
    });

    test('should prevent dropping on unselected boss actions', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Try to drop on different action
      await mitigationPage.dragMitigationToAction('rampart', 'fluke_typhoon');
      
      // Should not be assigned to unselected action
      const assignedMitigation = page.locator('[data-testid="assigned-mitigation-fluke_typhoon-rampart"]');
      await expect(assignedMitigation).not.toBeVisible();
    });

    test('should show visual feedback during drag operation', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      const mitigation = page.locator('[data-testid="mitigation-rampart"]');
      const bossAction = page.locator('[data-testid="boss-action-hydrofall"]');
      
      // Start drag
      await mitigation.hover();
      await page.mouse.down();
      
      // Verify drag preview appears
      await expect(page.locator('[data-testid="drag-preview"]')).toBeVisible();
      
      // Move over valid drop target
      await bossAction.hover();
      await expect(bossAction).toHaveClass(/drop-target/);
      
      // Complete drop
      await page.mouse.up();
    });
  });

  test.describe('Tank Selection Modal', () => {
    test.beforeEach(async ({ page }) => {
      // Select two tanks for tank selection scenarios
      await selectJobs(page, [{ id: 'WAR' }]); // Add second tank
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
    });

    test('should show tank selection modal for tank-specific abilities', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.dragMitigationToAction('rampart', 'fluke_typhoon');
      
      // Tank selection modal should appear
      await expect(page.locator('[data-testid="tank-selection-modal"]')).toBeVisible();
    });

    test('should assign mitigation to main tank', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'fluke_typhoon', 'MT');
      
      await mitigationPage.verifyTankPositionAssignment('rampart', 'fluke_typhoon', 'MT');
    });

    test('should assign mitigation to off tank', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.assignMitigationWithTankSelection('rampart', 'fluke_typhoon', 'OT');
      
      await mitigationPage.verifyTankPositionAssignment('rampart', 'fluke_typhoon', 'OT');
    });

    test('should cancel tank selection', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.dragMitigationToAction('rampart', 'fluke_typhoon');
      
      await mitigationPage.cancelTankSelection();
      
      // Mitigation should not be assigned
      const assignedMitigation = page.locator('[data-testid="assigned-mitigation-fluke_typhoon-rampart"]');
      await expect(assignedMitigation).not.toBeVisible();
    });

    test('should bypass tank selection for party-wide abilities', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      // Tank selection modal should not appear for party-wide abilities
      await expect(page.locator('[data-testid="tank-selection-modal"]')).not.toBeVisible();
      
      // Mitigation should be assigned directly
      await verifyMitigationAssignment(page, 'hydrofall', 'reprisal');
    });
  });

  test.describe('Cooldown System', () => {
    test('should track ability cooldowns after assignment', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Rampart should be on cooldown
      await mitigationPage.verifyMitigationOnCooldown('rampart', 90);
    });

    test('should prevent using abilities on cooldown', async ({ page }) => {
      // Assign rampart to first action
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Try to assign to second action within cooldown window
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      
      // Rampart should be disabled
      await mitigationPage.verifyMitigationAvailable('rampart', false);
    });

    test('should show cooldown timer', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Cooldown timer should be visible
      const cooldownTimer = page.locator('[data-testid="cooldown-timer-rampart"]');
      await expect(cooldownTimer).toBeVisible();
      await expect(cooldownTimer).toContainText('90s');
    });

    test('should make ability available again after cooldown', async ({ page }) => {
      // Mock fast cooldown for testing
      await page.addInitScript(() => {
        window.__MOCK_FAST_COOLDOWN__ = true;
      });
      
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Wait for cooldown to expire (mocked)
      await page.waitForTimeout(1000);
      
      // Ability should be available again
      await mitigationPage.verifyMitigationAvailable('rampart', true);
    });
  });

  test.describe('Charge-Based Abilities', () => {
    test('should handle abilities with multiple charges', async ({ page }) => {
      // Mock an ability with charges
      await page.addInitScript(() => {
        window.__MOCK_CHARGE_ABILITY__ = {
          id: 'lustrate',
          name: 'Lustrate',
          charges: 3,
          maxCharges: 3
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await selectJobs(page, [{ id: 'SCH' }]);
      
      await mitigationPage.verifyChargeBasedAbility('lustrate', 3);
    });

    test('should consume charges when abilities are used', async ({ page }) => {
      await page.addInitScript(() => {
        window.__MOCK_CHARGE_ABILITY__ = {
          id: 'lustrate',
          charges: 3,
          maxCharges: 3
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await selectJobs(page, [{ id: 'SCH' }]);
      
      // Use one charge
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('lustrate', 'hydrofall');
      
      // Should have 2 charges remaining
      await mitigationPage.verifyChargeBasedAbility('lustrate', 2);
    });
  });

  test.describe('Scholar Aetherflow System', () => {
    test.beforeEach(async ({ page }) => {
      await selectJobs(page, [{ id: 'SCH' }]);
    });

    test('should display Aetherflow stacks', async ({ page }) => {
      await mitigationPage.verifyAetherflowStacks(3);
    });

    test('should consume Aetherflow stacks when using abilities', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('lustrate', 'hydrofall');
      
      // Should have 2 stacks remaining
      await mitigationPage.verifyAetherflowStacks(2);
    });

    test('should prevent using Aetherflow abilities without stacks', async ({ page }) => {
      // Mock no Aetherflow stacks
      await page.addInitScript(() => {
        window.__MOCK_AETHERFLOW_STACKS__ = 0;
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await selectJobs(page, [{ id: 'SCH' }]);
      
      // Aetherflow abilities should be disabled
      await mitigationPage.verifyMitigationAvailable('lustrate', false);
    });
  });

  test.describe('Mitigation Removal', () => {
    test('should remove assigned mitigation', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      await mitigationPage.removeMitigation('hydrofall', 'rampart');
      
      // Mitigation should no longer be assigned
      const assignedMitigation = page.locator('[data-testid="assigned-mitigation-hydrofall-rampart"]');
      await expect(assignedMitigation).not.toBeVisible();
    });

    test('should restore ability availability when removed', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Verify on cooldown
      await mitigationPage.verifyMitigationAvailable('rampart', false);
      
      await mitigationPage.removeMitigation('hydrofall', 'rampart');
      
      // Should be available again
      await mitigationPage.verifyMitigationAvailable('rampart', true);
    });
  });

  test.describe('Multiple Mitigation Assignment', () => {
    test('should allow multiple mitigations on same action', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      // Both mitigations should be assigned
      await verifyMitigationAssignment(page, 'hydrofall', 'rampart');
      await verifyMitigationAssignment(page, 'hydrofall', 'reprisal');
    });

    test('should show mitigation overlap indicator', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      await mitigationPage.verifyMitigationOverlap('hydrofall', ['rampart', 'reprisal']);
    });

    test('should calculate combined mitigation percentage', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      // Should show combined mitigation (20% + 10% = 30%)
      await bossTimelinePage.verifyHealthBarCalculation('hydrofall', 30);
    });
  });

  test.describe('Mitigation Filtering', () => {
    test('should filter mitigations by action type', async ({ page }) => {
      await bossTimelinePage.selectBossAction('fluke_typhoon'); // Tank buster
      
      await mitigationPage.toggleMitigationFilter();
      
      // Only tank and party-wide mitigations should be visible
      await mitigationPage.verifyMitigationVisibility('rampart', true);
      await mitigationPage.verifyMitigationVisibility('reprisal', true);
      
      // DPS-specific mitigations should be hidden
      await mitigationPage.verifyMitigationVisibility('addle', false);
    });

    test('should show all mitigations when filter is disabled', async ({ page }) => {
      await mitigationPage.toggleShowAllMitigations();
      
      // All available mitigations should be visible
      await mitigationPage.verifyMitigationVisibility('rampart', true);
      await mitigationPage.verifyMitigationVisibility('reprisal', true);
      await mitigationPage.verifyMitigationVisibility('addle', true);
    });
  });

  test.describe('Mobile Interaction', () => {
    test('should support touch-based mitigation assignment on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Use tap instead of drag on mobile
      const mitigation = page.locator('[data-testid="mitigation-rampart"]');
      await mitigation.tap();
      
      // Should show assignment options
      await expect(page.locator('[data-testid="mobile-assignment-options"]')).toBeVisible();
      
      // Confirm assignment
      await page.locator('[data-testid="confirm-assignment"]').tap();
      
      await verifyMitigationAssignment(page, 'hydrofall', 'rampart');
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard-based mitigation assignment', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Focus mitigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Should trigger assignment
      await verifyMitigationAssignment(page, 'hydrofall', 'rampart');
    });

    test('should announce assignment changes to screen readers', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      const announcement = page.locator('[aria-live="polite"]');
      await expect(announcement).toContainText('Rampart assigned to Hydrofall');
    });
  });
});
