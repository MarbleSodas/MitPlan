import { test, expect } from '@playwright/test';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { ffxivJobs } from '../utils/test-data.js';
import { waitForPageLoad, selectJobs } from '../utils/helpers.js';

test.describe('Job Selection', () => {
  let jobSelectorPage;

  test.beforeEach(async ({ page }) => {
    jobSelectorPage = new JobSelectorPage(page);
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Individual Job Selection', () => {
    test('should select and deselect tank jobs', async ({ page }) => {
      for (const job of ffxivJobs.tanks) {
        await jobSelectorPage.selectJob(job.id);
        await jobSelectorPage.verifyJobCardState(job.id, true);
        
        await jobSelectorPage.deselectJob(job.id);
        await jobSelectorPage.verifyJobCardState(job.id, false);
      }
    });

    test('should select and deselect healer jobs', async ({ page }) => {
      for (const job of ffxivJobs.healers) {
        await jobSelectorPage.selectJob(job.id);
        await jobSelectorPage.verifyJobCardState(job.id, true);
        
        await jobSelectorPage.deselectJob(job.id);
        await jobSelectorPage.verifyJobCardState(job.id, false);
      }
    });

    test('should select and deselect DPS jobs', async ({ page }) => {
      for (const job of ffxivJobs.dps.slice(0, 3)) { // Test first 3 DPS jobs
        await jobSelectorPage.selectJob(job.id);
        await jobSelectorPage.verifyJobCardState(job.id, true);
        
        await jobSelectorPage.deselectJob(job.id);
        await jobSelectorPage.verifyJobCardState(job.id, false);
      }
    });

    test('should display job icons correctly', async ({ page }) => {
      for (const job of ffxivJobs.tanks) {
        await jobSelectorPage.verifyJobIcon(job.id);
      }
    });

    test('should show job tooltips on hover', async ({ page }) => {
      await jobSelectorPage.verifyJobTooltip('PLD', 'Paladin');
      await jobSelectorPage.verifyJobTooltip('WHM', 'White Mage');
      await jobSelectorPage.verifyJobTooltip('BLM', 'Black Mage');
    });
  });

  test.describe('Multiple Job Selection', () => {
    test('should select multiple jobs from different roles', async ({ page }) => {
      const jobsToSelect = [
        ffxivJobs.tanks[0],
        ffxivJobs.healers[0],
        ffxivJobs.dps[0]
      ];

      await jobSelectorPage.selectMultipleJobs(jobsToSelect.map(job => job.id));

      for (const job of jobsToSelect) {
        await jobSelectorPage.verifyJobCardState(job.id, true);
      }
    });

    test('should update mitigation abilities when jobs are selected', async ({ page }) => {
      // Select Paladin
      await jobSelectorPage.selectJob('PLD');
      
      // Verify Paladin-specific abilities appear
      await jobSelectorPage.verifyMitigationAbilitiesUpdated(['rampart', 'sentinel', 'hallowed_ground']);
      
      // Select White Mage
      await jobSelectorPage.selectJob('WHM');
      
      // Verify healer abilities are added
      await jobSelectorPage.verifyMitigationAbilitiesUpdated(['divine_benison', 'temperance']);
    });

    test('should hide mitigation abilities when jobs are deselected', async ({ page }) => {
      // Select and then deselect Paladin
      await jobSelectorPage.selectJob('PLD');
      await jobSelectorPage.verifyMitigationAbilitiesUpdated(['rampart', 'sentinel']);
      
      await jobSelectorPage.deselectJob('PLD');
      await jobSelectorPage.verifyMitigationAbilityHidden('sentinel');
      await jobSelectorPage.verifyMitigationAbilityHidden('hallowed_ground');
    });

    test('should clear all selected jobs', async ({ page }) => {
      // Select multiple jobs
      await selectJobs(page, [
        { id: 'PLD' },
        { id: 'WHM' },
        { id: 'BLM' }
      ]);

      await jobSelectorPage.clearAllJobs();

      // Verify all jobs are deselected
      const selectedJobs = await jobSelectorPage.getSelectedJobs();
      expect(selectedJobs).toHaveLength(0);
    });
  });

  test.describe('Tank Position System', () => {
    test('should show tank position selector when 2 tanks are selected', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      
      // Tank position selector should appear
      await expect(page.locator('[data-testid="tank-position-selector"]')).toBeVisible();
    });

    test('should assign tank positions correctly', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Verify position assignments
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'OT');
    });

    test('should hide tank position selector when less than 2 tanks', async ({ page }) => {
      await jobSelectorPage.selectJob('PLD');
      
      // Tank position selector should not appear
      await expect(page.locator('[data-testid="tank-position-selector"]')).not.toBeVisible();
    });

    test('should handle tank position reassignment', async ({ page }) => {
      await jobSelectorPage.selectTankJobs(['PLD', 'WAR']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Reassign positions
      await jobSelectorPage.assignTankPositions('WAR', 'PLD');
      
      // Verify new assignments
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'OT');
    });
  });

  test.describe('Role Restrictions', () => {
    test('should enforce tank limit (max 2)', async ({ page }) => {
      // Try to select 3 tanks
      await jobSelectorPage.selectJob('PLD');
      await jobSelectorPage.selectJob('WAR');
      await jobSelectorPage.selectJob('DRK');
      
      // Third tank should show warning or be disabled
      await jobSelectorPage.verifyJobCardState('DRK', false, true);
    });

    test('should enforce healer limit (max 2)', async ({ page }) => {
      // Try to select 3 healers
      await jobSelectorPage.selectJob('WHM');
      await jobSelectorPage.selectJob('SCH');
      await jobSelectorPage.selectJob('AST');
      
      // Third healer should show warning or be disabled
      await jobSelectorPage.verifyJobCardState('AST', false, true);
    });

    test('should allow multiple DPS jobs', async ({ page }) => {
      // Select 4 DPS jobs (typical raid composition)
      const dpsJobs = ['BLM', 'SMN', 'DRG', 'NIN'];
      
      for (const jobId of dpsJobs) {
        await jobSelectorPage.selectJob(jobId);
        await jobSelectorPage.verifyJobCardState(jobId, true, false);
      }
    });
  });

  test.describe('Job Search and Filtering', () => {
    test('should filter jobs by search term', async ({ page }) => {
      await jobSelectorPage.searchJobs('Paladin');
      
      // Only Paladin should be visible
      await jobSelectorPage.verifyJobCardState('PLD', false, false);
      await expect(page.locator('[data-testid="job-card-WAR"]')).not.toBeVisible();
    });

    test('should filter jobs by role', async ({ page }) => {
      await jobSelectorPage.searchJobs('tank');
      
      // All tank jobs should be visible
      for (const job of ffxivJobs.tanks) {
        await expect(page.locator(`[data-testid="job-card-${job.id}"]`)).toBeVisible();
      }
      
      // Non-tank jobs should be hidden
      await expect(page.locator('[data-testid="job-card-WHM"]')).not.toBeVisible();
    });

    test('should clear search filter', async ({ page }) => {
      await jobSelectorPage.searchJobs('Paladin');
      await jobSelectorPage.searchJobs('');
      
      // All jobs should be visible again
      for (const job of [...ffxivJobs.tanks, ...ffxivJobs.healers, ...ffxivJobs.dps.slice(0, 3)]) {
        await expect(page.locator(`[data-testid="job-card-${job.id}"]`)).toBeVisible();
      }
    });
  });

  test.describe('Job Level Requirements', () => {
    test('should display correct job levels', async ({ page }) => {
      await jobSelectorPage.verifyJobLevel('PLD', 90);
      await jobSelectorPage.verifyJobLevel('WHM', 90);
      await jobSelectorPage.verifyJobLevel('BLM', 90);
    });

    test('should disable jobs below required level', async ({ page }) => {
      // Mock a lower level scenario
      await page.addInitScript(() => {
        window.__MOCK_PLAYER_LEVEL__ = 50;
      });
      
      await page.reload();
      await waitForPageLoad(page);
      
      // High-level abilities should be disabled
      await jobSelectorPage.verifyJobCardState('GNB', false, true); // Gunbreaker requires level 60
    });
  });

  test.describe('Responsive Design', () => {
    test('should display job cards correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Job cards should still be visible and functional
      await jobSelectorPage.selectJob('PLD');
      await jobSelectorPage.verifyJobCardState('PLD', true);
    });

    test('should maintain 2 cards per row layout', async ({ page }) => {
      // Verify job cards are displayed in rows of 2
      const jobCards = page.locator('[data-testid^="job-card-"]');
      const firstCard = jobCards.first();
      const secondCard = jobCards.nth(1);
      const thirdCard = jobCards.nth(2);
      
      const firstCardBox = await firstCard.boundingBox();
      const secondCardBox = await secondCard.boundingBox();
      const thirdCardBox = await thirdCard.boundingBox();
      
      // First two cards should be on the same row
      expect(Math.abs(firstCardBox.y - secondCardBox.y)).toBeLessThan(10);
      
      // Third card should be on a different row
      expect(thirdCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Focus first job card
      await page.keyboard.press('Tab');
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      
      // Select with Enter
      await page.keyboard.press('Enter');
      
      // Verify selection
      const focusedElement = page.locator(':focus');
      const testId = await focusedElement.getAttribute('data-testid');
      const jobId = testId.replace('job-card-', '');
      
      await jobSelectorPage.verifyJobCardState(jobId, true);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const jobCard = page.locator('[data-testid="job-card-PLD"]');
      
      await expect(jobCard).toHaveAttribute('role', 'button');
      await expect(jobCard).toHaveAttribute('aria-label', /Paladin/);
    });
  });
});
