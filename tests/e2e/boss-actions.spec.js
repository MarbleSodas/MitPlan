import { test, expect } from '@playwright/test';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { bosses } from '../utils/test-data.js';
import { waitForPageLoad, selectBoss, selectJobs } from '../utils/helpers.js';

test.describe('Boss Actions and Timeline', () => {
  let bossTimelinePage;
  let jobSelectorPage;

  test.beforeEach(async ({ page }) => {
    bossTimelinePage = new BossTimelinePage(page);
    jobSelectorPage = new JobSelectorPage(page);
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Boss Selection', () => {
    test('should select boss from dropdown', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      
      await expect(page.locator('[data-testid="selected-boss-name"]')).toContainText('Ketuduke');
      await expect(page.locator('[data-testid="boss-actions-list"]')).toBeVisible();
    });

    test('should load boss actions when boss is selected', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Verify specific boss actions are loaded
      await bossTimelinePage.verifyActionVisibility('hydrofall', true);
      await bossTimelinePage.verifyActionVisibility('fluke_typhoon', true);
    });

    test('should switch between different bosses', async ({ page }) => {
      // Select first boss
      await bossTimelinePage.selectBoss('ketuduke');
      await bossTimelinePage.verifyActionVisibility('hydrofall', true);
      
      // Switch to second boss
      await bossTimelinePage.selectBoss('lala');
      await bossTimelinePage.verifyActionVisibility('inferno_theorem', true);
      
      // Previous boss actions should not be visible
      await bossTimelinePage.verifyActionVisibility('hydrofall', false);
    });

    test('should display boss dropdown options', async ({ page }) => {
      await bossTimelinePage.openBossDropdown();
      
      // Verify boss options are available
      await expect(page.locator('[data-testid="boss-option-ketuduke"]')).toBeVisible();
      await expect(page.locator('[data-testid="boss-option-lala"]')).toBeVisible();
    });
  });

  test.describe('Boss Action Details', () => {
    test.beforeEach(async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
    });

    test('should display boss action information correctly', async ({ page }) => {
      const hydrofallDetails = {
        name: 'Hydrofall',
        time: 15,
        damage: 85000,
        type: 'raid-wide'
      };

      await bossTimelinePage.verifyBossActionDetails('hydrofall', hydrofallDetails);
    });

    test('should show boss action tooltips on hover', async ({ page }) => {
      await bossTimelinePage.verifyActionTooltip('hydrofall', 'Raid-wide magical damage');
      await bossTimelinePage.verifyActionTooltip('fluke_typhoon', 'Tank buster with knockback');
    });

    test('should display actions in chronological order', async ({ page }) => {
      await bossTimelinePage.verifyTimelineOrder();
    });

    test('should show correct action type indicators', async ({ page }) => {
      await bossTimelinePage.verifyActionTypeIndicator('hydrofall', 'raid-wide');
      await bossTimelinePage.verifyActionTypeIndicator('fluke_typhoon', 'tank-buster');
    });
  });

  test.describe('Boss Action Selection', () => {
    test.beforeEach(async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
    });

    test('should select and deselect boss actions', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      const action = page.locator('[data-testid="boss-action-hydrofall"]');
      await expect(action).toHaveClass(/selected/);
      
      await bossTimelinePage.deselectBossAction('hydrofall');
      await expect(action).not.toHaveClass(/selected/);
    });

    test('should allow only one action to be selected at a time', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      
      // First action should be deselected
      const hydrofallAction = page.locator('[data-testid="boss-action-hydrofall"]');
      await expect(hydrofallAction).not.toHaveClass(/selected/);
      
      // Second action should be selected
      const flukeAction = page.locator('[data-testid="boss-action-fluke_typhoon"]');
      await expect(flukeAction).toHaveClass(/selected/);
    });

    test('should maintain selection state during page interactions', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // Interact with other elements
      await jobSelectorPage.selectJob('PLD');
      
      // Selection should persist
      const action = page.locator('[data-testid="boss-action-hydrofall"]');
      await expect(action).toHaveClass(/selected/);
    });
  });

  test.describe('Health Bar System', () => {
    test.beforeEach(async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await selectJobs(page, [{ id: 'PLD' }, { id: 'WHM' }]);
    });

    test('should display health bars for boss actions', async ({ page }) => {
      // Raid-wide action should show party health bar
      await expect(page.locator('[data-testid="party-health-bar-hydrofall"]')).toBeVisible();
      
      // Tank buster should show tank health bar
      await expect(page.locator('[data-testid="mt-health-bar-fluke_typhoon"]')).toBeVisible();
    });

    test('should calculate damage correctly without mitigation', async ({ page }) => {
      await bossTimelinePage.verifyHealthBarCalculation('hydrofall', 0, 'party');
      await bossTimelinePage.verifyHealthBarCalculation('fluke_typhoon', 0, 'tank-buster');
    });

    test('should show different health bars for different action types', async ({ page }) => {
      // Select two tanks for dual-tank testing
      await selectJobs(page, [{ id: 'WAR' }]); // Add second tank
      
      // Mock a dual-tank buster action
      await page.addInitScript(() => {
        window.__MOCK_DUAL_TANK_ACTION__ = {
          id: 'dual_buster',
          name: 'Dual Tank Buster',
          type: 'dual-tank'
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Should show both MT and OT health bars
      await bossTimelinePage.verifyHealthBarCalculation('dual_buster', 0, 'dual-tank');
    });

    test('should update health bar colors based on damage', async ({ page }) => {
      // High damage should show red/orange colors
      await bossTimelinePage.verifyHealthBarColors('fluke_typhoon', 'rgb(255, 0, 0)');
      
      // Lower damage should show yellow/green colors
      await bossTimelinePage.verifyHealthBarColors('hydrofall', 'rgb(255, 255, 0)');
    });
  });

  test.describe('Timeline Zoom and Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
    });

    test('should zoom in and out of timeline', async ({ page }) => {
      await bossTimelinePage.zoomTimeline('in');
      await bossTimelinePage.zoomTimeline('in');
      
      // Verify zoom level increased
      const timeline = page.locator('[data-testid="boss-timeline"]');
      const transform = await timeline.getAttribute('style');
      expect(transform).toContain('scale');
      
      await bossTimelinePage.zoomTimeline('out');
      await bossTimelinePage.resetTimelineZoom();
    });

    test('should reset timeline zoom', async ({ page }) => {
      await bossTimelinePage.zoomTimeline('in');
      await bossTimelinePage.resetTimelineZoom();
      
      const timeline = page.locator('[data-testid="boss-timeline"]');
      const transform = await timeline.getAttribute('style');
      expect(transform).not.toContain('scale') || expect(transform).toContain('scale(1)');
    });

    test('should scroll timeline horizontally', async ({ page }) => {
      await bossTimelinePage.scrollTimeline('right', 200);
      
      const timelineContainer = page.locator('[data-testid="timeline-container"]');
      const scrollLeft = await timelineContainer.evaluate(el => el.scrollLeft);
      expect(scrollLeft).toBeGreaterThan(0);
      
      await bossTimelinePage.scrollTimeline('left', 100);
    });
  });

  test.describe('Action Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
    });

    test('should filter actions by damage type', async ({ page }) => {
      await bossTimelinePage.toggleDamageTypeFilter();
      
      // Only damage-dealing actions should be visible
      await bossTimelinePage.verifyActionVisibility('hydrofall', true);
      await bossTimelinePage.verifyActionVisibility('fluke_typhoon', true);
    });

    test('should toggle show all actions', async ({ page }) => {
      await bossTimelinePage.toggleShowAllActions();
      
      // All actions including non-damage should be visible
      const visibleActions = await bossTimelinePage.getVisibleActions();
      expect(visibleActions.length).toBeGreaterThan(2);
    });

    test('should hide non-damage actions when filter is active', async ({ page }) => {
      // Mock a non-damage action
      await page.addInitScript(() => {
        window.__MOCK_NON_DAMAGE_ACTION__ = {
          id: 'phase_transition',
          name: 'Phase Transition',
          damage: 0,
          type: 'mechanic'
        };
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Non-damage action should be hidden by default
      await bossTimelinePage.verifyActionVisibility('phase_transition', false);
      
      // Show all actions
      await bossTimelinePage.toggleShowAllActions();
      await bossTimelinePage.verifyActionVisibility('phase_transition', true);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display timeline correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Timeline should be visible and scrollable
      await expect(page.locator('[data-testid="boss-timeline"]')).toBeVisible();
      
      // Actions should be selectable
      await bossTimelinePage.selectBossAction('hydrofall');
      const action = page.locator('[data-testid="boss-action-hydrofall"]');
      await expect(action).toHaveClass(/selected/);
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Simulate touch interaction
      const action = page.locator('[data-testid="boss-action-hydrofall"]');
      await action.tap();
      
      await expect(action).toHaveClass(/selected/);
    });
  });

  test.describe('Performance', () => {
    test('should load boss actions quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await bossTimelinePage.selectBoss('ketuduke');
      await expect(page.locator('[data-testid="boss-actions-list"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    });

    test('should handle large number of boss actions', async ({ page }) => {
      // Mock a boss with many actions
      await page.addInitScript(() => {
        const manyActions = [];
        for (let i = 0; i < 50; i++) {
          manyActions.push({
            id: `action_${i}`,
            name: `Action ${i}`,
            time: i * 10,
            damage: 50000,
            type: 'raid-wide'
          });
        }
        window.__MOCK_MANY_ACTIONS__ = manyActions;
      });
      
      await page.reload();
      await waitForPageLoad(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Should still be responsive
      const visibleActions = await bossTimelinePage.getVisibleActions();
      expect(visibleActions.length).toBeGreaterThan(10);
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
    });

    test('should support keyboard navigation for boss actions', async ({ page }) => {
      // Focus first boss action
      await page.keyboard.press('Tab');
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      
      // Select with Enter
      await page.keyboard.press('Enter');
      
      // Verify selection
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveClass(/selected/);
    });

    test('should have proper ARIA labels for boss actions', async ({ page }) => {
      const action = page.locator('[data-testid="boss-action-hydrofall"]');
      
      await expect(action).toHaveAttribute('role', 'button');
      await expect(action).toHaveAttribute('aria-label', /Hydrofall/);
    });

    test('should announce selection changes to screen readers', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      const announcement = page.locator('[aria-live="polite"]');
      await expect(announcement).toContainText('Hydrofall selected');
    });
  });
});
