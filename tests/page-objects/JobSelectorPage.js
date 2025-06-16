import { expect } from '@playwright/test';
import { waitForElement, clickAndWait, verifyJobSelection } from '../utils/helpers.js';

export class JobSelectorPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.jobSelector = '[data-testid="job-selector"]';
    this.tankSection = '[data-testid="tank-jobs"]';
    this.healerSection = '[data-testid="healer-jobs"]';
    this.dpsSection = '[data-testid="dps-jobs"]';
    this.jobSearchInput = '[data-testid="job-search"]';
    this.clearAllButton = '[data-testid="clear-all-jobs"]';
    this.selectAllButton = '[data-testid="select-all-jobs"]';
    
    // Job cards
    this.jobCard = (jobId) => `[data-testid="job-card-${jobId}"]`;
    this.jobIcon = (jobId) => `[data-testid="job-icon-${jobId}"]`;
    this.jobName = (jobId) => `[data-testid="job-name-${jobId}"]`;
    this.jobLevel = (jobId) => `[data-testid="job-level-${jobId}"]`;
    
    // Tank position selector (appears when 2 tanks selected)
    this.tankPositionSelector = '[data-testid="tank-position-selector"]';
    this.mainTankButton = '[data-testid="main-tank-button"]';
    this.offTankButton = '[data-testid="off-tank-button"]';
    
    // Mitigation abilities section
    this.mitigationSection = '[data-testid="mitigation-abilities"]';
    this.mitigationAbility = (abilityId) => `[data-testid="mitigation-${abilityId}"]`;
  }

  async selectJob(jobId) {
    const jobCard = this.page.locator(this.jobCard(jobId));
    await jobCard.waitFor({ state: 'visible' });
    await jobCard.click();
    
    // Verify selection
    await verifyJobSelection(this.page, jobId, true);
  }

  async deselectJob(jobId) {
    const jobCard = this.page.locator(this.jobCard(jobId));
    await jobCard.waitFor({ state: 'visible' });
    await jobCard.click();
    
    // Verify deselection
    await verifyJobSelection(this.page, jobId, false);
  }

  async selectMultipleJobs(jobIds) {
    for (const jobId of jobIds) {
      await this.selectJob(jobId);
      // Small delay to prevent rapid clicking issues
      await this.page.waitForTimeout(100);
    }
  }

  async selectTankJobs(tankJobs) {
    for (const jobId of tankJobs) {
      await this.selectJob(jobId);
    }
    
    // If exactly 2 tanks are selected, tank position selector should appear
    if (tankJobs.length === 2) {
      await waitForElement(this.page, this.tankPositionSelector);
    }
  }

  async assignTankPositions(mainTankJob, offTankJob) {
    // Ensure tank position selector is visible
    await waitForElement(this.page, this.tankPositionSelector);
    
    // Click on main tank job and assign as MT
    await this.page.locator(this.jobCard(mainTankJob)).click();
    await clickAndWait(this.page, this.mainTankButton);
    
    // Click on off tank job and assign as OT
    await this.page.locator(this.jobCard(offTankJob)).click();
    await clickAndWait(this.page, this.offTankButton);
  }

  async searchJobs(searchTerm) {
    await this.page.locator(this.jobSearchInput).fill(searchTerm);
    
    // Wait for search results to update
    await this.page.waitForTimeout(300);
  }

  async clearAllJobs() {
    await clickAndWait(this.page, this.clearAllButton);
    
    // Verify all jobs are deselected
    const selectedJobs = this.page.locator('[data-testid^="job-card-"].selected');
    await expect(selectedJobs).toHaveCount(0);
  }

  async selectAllJobs() {
    await clickAndWait(this.page, this.selectAllButton);
    
    // Verify jobs are selected (should be limited by role restrictions)
    const selectedJobs = this.page.locator('[data-testid^="job-card-"].selected');
    await expect(selectedJobs.count()).toBeGreaterThan(0);
  }

  async verifyJobCardState(jobId, shouldBeSelected = true, shouldBeDisabled = false) {
    const jobCard = this.page.locator(this.jobCard(jobId));
    await jobCard.waitFor({ state: 'visible' });
    
    if (shouldBeSelected) {
      await expect(jobCard).toHaveClass(/selected/);
    } else {
      await expect(jobCard).not.toHaveClass(/selected/);
    }
    
    if (shouldBeDisabled) {
      await expect(jobCard).toHaveClass(/disabled/);
    } else {
      await expect(jobCard).not.toHaveClass(/disabled/);
    }
  }

  async verifyMitigationAbilitiesUpdated(expectedAbilities) {
    await waitForElement(this.page, this.mitigationSection);
    
    for (const abilityId of expectedAbilities) {
      const ability = this.page.locator(this.mitigationAbility(abilityId));
      await expect(ability).toBeVisible();
    }
  }

  async verifyMitigationAbilityHidden(abilityId) {
    const ability = this.page.locator(this.mitigationAbility(abilityId));
    await expect(ability).not.toBeVisible();
  }

  async verifyJobIcon(jobId) {
    const icon = this.page.locator(this.jobIcon(jobId));
    await expect(icon).toBeVisible();
    
    // Verify icon has proper src attribute
    const src = await icon.getAttribute('src');
    expect(src).toContain(jobId.toLowerCase());
  }

  async verifyJobLevel(jobId, expectedLevel) {
    const levelElement = this.page.locator(this.jobLevel(jobId));
    await expect(levelElement).toContainText(expectedLevel.toString());
  }

  async verifyTankPositionAssignment(jobId, position) {
    const jobCard = this.page.locator(this.jobCard(jobId));
    const positionIndicator = jobCard.locator(`[data-testid="tank-position-${position.toLowerCase()}"]`);
    await expect(positionIndicator).toBeVisible();
  }

  async verifyRoleRestrictions() {
    // Verify that selecting too many tanks shows appropriate feedback
    const tankJobs = ['PLD', 'WAR', 'DRK'];
    
    for (const jobId of tankJobs) {
      await this.selectJob(jobId);
    }
    
    // Third tank should show warning or be disabled
    const thirdTankCard = this.page.locator(this.jobCard('DRK'));
    await expect(thirdTankCard).toHaveClass(/warning|disabled/);
  }

  async getSelectedJobs() {
    const selectedCards = this.page.locator('[data-testid^="job-card-"].selected');
    const count = await selectedCards.count();
    const jobs = [];
    
    for (let i = 0; i < count; i++) {
      const card = selectedCards.nth(i);
      const testId = await card.getAttribute('data-testid');
      const jobId = testId.replace('job-card-', '');
      jobs.push(jobId);
    }
    
    return jobs;
  }

  async verifyJobTooltip(jobId, expectedTooltip) {
    const jobCard = this.page.locator(this.jobCard(jobId));
    await jobCard.hover();
    
    const tooltip = this.page.locator('[data-testid="job-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(expectedTooltip);
  }
}
