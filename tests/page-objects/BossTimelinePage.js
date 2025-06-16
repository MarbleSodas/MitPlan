import { expect } from '@playwright/test';
import { waitForElement, clickAndWait, selectBoss, verifyHealthBar } from '../utils/helpers.js';

export class BossTimelinePage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.bossSelector = '[data-testid="boss-selector"]';
    this.bossDropdown = '[data-testid="boss-dropdown"]';
    this.bossOption = (bossId) => `[data-testid="boss-option-${bossId}"]`;
    this.selectedBossName = '[data-testid="selected-boss-name"]';
    
    // Timeline
    this.timeline = '[data-testid="boss-timeline"]';
    this.timelineContainer = '[data-testid="timeline-container"]';
    this.zoomInButton = '[data-testid="zoom-in"]';
    this.zoomOutButton = '[data-testid="zoom-out"]';
    this.resetZoomButton = '[data-testid="reset-zoom"]';
    
    // Boss actions
    this.bossActionsList = '[data-testid="boss-actions-list"]';
    this.bossAction = (actionId) => `[data-testid="boss-action-${actionId}"]`;
    this.bossActionName = (actionId) => `[data-testid="boss-action-name-${actionId}"]`;
    this.bossActionTime = (actionId) => `[data-testid="boss-action-time-${actionId}"]`;
    this.bossActionDamage = (actionId) => `[data-testid="boss-action-damage-${actionId}"]`;
    this.bossActionType = (actionId) => `[data-testid="boss-action-type-${actionId}"]`;
    this.bossActionDescription = (actionId) => `[data-testid="boss-action-description-${actionId}"]`;
    
    // Health bars
    this.healthBar = (actionId) => `[data-testid="health-bar-${actionId}"]`;
    this.healthBarFill = (actionId) => `[data-testid="health-bar-fill-${actionId}"]`;
    this.mitigationPercentage = (actionId) => `[data-testid="mitigation-percentage-${actionId}"]`;
    this.damageValue = (actionId) => `[data-testid="damage-value-${actionId}"]`;
    
    // Tank-specific health bars
    this.mainTankHealthBar = (actionId) => `[data-testid="mt-health-bar-${actionId}"]`;
    this.offTankHealthBar = (actionId) => `[data-testid="ot-health-bar-${actionId}"]`;
    this.partyHealthBar = (actionId) => `[data-testid="party-health-bar-${actionId}"]`;
    
    // Filters
    this.filterToggle = '[data-testid="filter-toggle"]';
    this.damageTypeFilter = '[data-testid="damage-type-filter"]';
    this.showAllActionsToggle = '[data-testid="show-all-actions"]';
    this.hideDamageActionsToggle = '[data-testid="hide-damage-actions"]';
    
    // Selection indicators
    this.selectedBossAction = '[data-testid="selected-boss-action"]';
    this.selectionIndicator = (actionId) => `[data-testid="selection-indicator-${actionId}"]`;
  }

  async selectBoss(bossId) {
    await selectBoss(this.page, bossId);
    
    // Verify boss is selected
    await expect(this.page.locator(this.selectedBossName)).toContainText(bossId);
    
    // Wait for boss actions to load
    await waitForElement(this.page, this.bossActionsList);
  }

  async openBossDropdown() {
    await clickAndWait(this.page, this.bossSelector);
    await waitForElement(this.page, this.bossDropdown);
  }

  async selectBossAction(actionId) {
    const action = this.page.locator(this.bossAction(actionId));
    await action.waitFor({ state: 'visible' });
    await action.click();
    
    // Verify action is selected
    await expect(action).toHaveClass(/selected/);
  }

  async deselectBossAction(actionId) {
    const action = this.page.locator(this.bossAction(actionId));
    await action.click();
    
    // Verify action is deselected
    await expect(action).not.toHaveClass(/selected/);
  }

  async verifyBossActionDetails(actionId, expectedDetails) {
    const action = this.page.locator(this.bossAction(actionId));
    await action.waitFor({ state: 'visible' });
    
    if (expectedDetails.name) {
      const nameElement = this.page.locator(this.bossActionName(actionId));
      await expect(nameElement).toContainText(expectedDetails.name);
    }
    
    if (expectedDetails.time) {
      const timeElement = this.page.locator(this.bossActionTime(actionId));
      await expect(timeElement).toContainText(expectedDetails.time.toString());
    }
    
    if (expectedDetails.damage) {
      const damageElement = this.page.locator(this.bossActionDamage(actionId));
      await expect(damageElement).toContainText(expectedDetails.damage.toString());
    }
    
    if (expectedDetails.type) {
      const typeElement = this.page.locator(this.bossActionType(actionId));
      await expect(typeElement).toContainText(expectedDetails.type);
    }
  }

  async verifyHealthBarCalculation(actionId, expectedMitigation, actionType = 'party') {
    let healthBarSelector;
    
    switch (actionType) {
      case 'tank-buster':
        healthBarSelector = this.mainTankHealthBar(actionId);
        break;
      case 'dual-tank':
        // Verify both tank health bars
        await verifyHealthBar(this.page, `mt-${actionId}`, expectedMitigation);
        await verifyHealthBar(this.page, `ot-${actionId}`, expectedMitigation);
        return;
      default:
        healthBarSelector = this.partyHealthBar(actionId);
    }
    
    await verifyHealthBar(this.page, actionId, expectedMitigation);
  }

  async zoomTimeline(direction) {
    const button = direction === 'in' ? this.zoomInButton : this.zoomOutButton;
    await clickAndWait(this.page, button);
    
    // Verify zoom level changed
    const timeline = this.page.locator(this.timeline);
    const transform = await timeline.getAttribute('style');
    expect(transform).toContain('scale');
  }

  async resetTimelineZoom() {
    await clickAndWait(this.page, this.resetZoomButton);
    
    // Verify zoom is reset
    const timeline = this.page.locator(this.timeline);
    const transform = await timeline.getAttribute('style');
    expect(transform).not.toContain('scale') || expect(transform).toContain('scale(1)');
  }

  async scrollTimeline(direction, amount = 100) {
    const timeline = this.page.locator(this.timelineContainer);
    
    if (direction === 'right') {
      await timeline.evaluate((el, scrollAmount) => {
        el.scrollLeft += scrollAmount;
      }, amount);
    } else {
      await timeline.evaluate((el, scrollAmount) => {
        el.scrollLeft -= scrollAmount;
      }, amount);
    }
  }

  async toggleDamageTypeFilter() {
    await clickAndWait(this.page, this.damageTypeFilter);
  }

  async toggleShowAllActions() {
    await clickAndWait(this.page, this.showAllActionsToggle);
  }

  async verifyActionVisibility(actionId, shouldBeVisible = true) {
    const action = this.page.locator(this.bossAction(actionId));
    
    if (shouldBeVisible) {
      await expect(action).toBeVisible();
    } else {
      await expect(action).not.toBeVisible();
    }
  }

  async verifyTimelineOrder() {
    const actions = this.page.locator('[data-testid^="boss-action-"]');
    const count = await actions.count();
    
    let previousTime = 0;
    for (let i = 0; i < count; i++) {
      const action = actions.nth(i);
      const timeElement = action.locator('[data-testid^="boss-action-time-"]');
      const timeText = await timeElement.textContent();
      const currentTime = parseInt(timeText);
      
      expect(currentTime).toBeGreaterThanOrEqual(previousTime);
      previousTime = currentTime;
    }
  }

  async verifyActionTypeIndicator(actionId, expectedType) {
    const typeIndicator = this.page.locator(this.bossActionType(actionId));
    await expect(typeIndicator).toContainText(expectedType);
    
    // Verify visual styling matches type
    const action = this.page.locator(this.bossAction(actionId));
    await expect(action).toHaveClass(new RegExp(expectedType.replace('-', '_')));
  }

  async hoverOverAction(actionId) {
    const action = this.page.locator(this.bossAction(actionId));
    await action.hover();
    
    // Verify tooltip appears
    const tooltip = this.page.locator('[data-testid="boss-action-tooltip"]');
    await expect(tooltip).toBeVisible();
  }

  async verifyActionTooltip(actionId, expectedContent) {
    await this.hoverOverAction(actionId);
    
    const tooltip = this.page.locator('[data-testid="boss-action-tooltip"]');
    await expect(tooltip).toContainText(expectedContent);
  }

  async getVisibleActions() {
    const visibleActions = this.page.locator('[data-testid^="boss-action-"]:visible');
    const count = await visibleActions.count();
    const actions = [];
    
    for (let i = 0; i < count; i++) {
      const action = visibleActions.nth(i);
      const testId = await action.getAttribute('data-testid');
      const actionId = testId.replace('boss-action-', '');
      actions.push(actionId);
    }
    
    return actions;
  }

  async verifyHealthBarColors(actionId, expectedColor) {
    const healthBarFill = this.page.locator(this.healthBarFill(actionId));
    const backgroundColor = await healthBarFill.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Convert expected color to RGB if needed and compare
    expect(backgroundColor).toContain(expectedColor);
  }
}
