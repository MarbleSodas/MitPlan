import { expect } from '@playwright/test';
import { waitForElement, dragAndDrop, clickAndWait, verifyMitigationAssignment } from '../utils/helpers.js';

export class MitigationPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.mitigationSection = '[data-testid="mitigation-section"]';
    this.mitigationList = '[data-testid="mitigation-list"]';
    this.mitigationAbility = (abilityId) => `[data-testid="mitigation-${abilityId}"]`;
    this.mitigationIcon = (abilityId) => `[data-testid="mitigation-icon-${abilityId}"]`;
    this.mitigationName = (abilityId) => `[data-testid="mitigation-name-${abilityId}"]`;
    this.mitigationCooldown = (abilityId) => `[data-testid="mitigation-cooldown-${abilityId}"]`;
    this.mitigationDuration = (abilityId) => `[data-testid="mitigation-duration-${abilityId}"]`;
    this.mitigationPercentage = (abilityId) => `[data-testid="mitigation-percentage-${abilityId}"]`;
    
    // Assigned mitigations
    this.assignedMitigation = (actionId, abilityId) => `[data-testid="assigned-mitigation-${actionId}-${abilityId}"]`;
    this.removeMitigationButton = (actionId, abilityId) => `[data-testid="remove-mitigation-${actionId}-${abilityId}"]`;
    this.assignedMitigationsList = (actionId) => `[data-testid="assigned-mitigations-${actionId}"]`;
    
    // Tank selection modal
    this.tankSelectionModal = '[data-testid="tank-selection-modal"]';
    this.mainTankButton = '[data-testid="select-main-tank"]';
    this.offTankButton = '[data-testid="select-off-tank"]';
    this.cancelTankSelectionButton = '[data-testid="cancel-tank-selection"]';
    
    // Cooldown indicators
    this.cooldownIndicator = (abilityId) => `[data-testid="cooldown-indicator-${abilityId}"]`;
    this.cooldownTimer = (abilityId) => `[data-testid="cooldown-timer-${abilityId}"]`;
    this.availableIndicator = (abilityId) => `[data-testid="available-indicator-${abilityId}"]`;
    
    // Charge-based abilities
    this.chargeCounter = (abilityId) => `[data-testid="charge-counter-${abilityId}"]`;
    this.chargeIndicator = (abilityId, charge) => `[data-testid="charge-${charge}-${abilityId}"]`;
    
    // Aetherflow system (Scholar)
    this.aetherflowStacks = '[data-testid="aetherflow-stacks"]';
    this.aetherflowStack = (stack) => `[data-testid="aetherflow-stack-${stack}"]`;
    
    // Mitigation filters
    this.mitigationFilter = '[data-testid="mitigation-filter"]';
    this.showAllMitigationsToggle = '[data-testid="show-all-mitigations"]';
    this.filterByRoleToggle = '[data-testid="filter-by-role"]';
    
    // Tank position indicators
    this.tankPositionIndicator = (abilityId, position) => `[data-testid="tank-position-${position}-${abilityId}"]`;
  }

  async dragMitigationToAction(abilityId, actionId) {
    const mitigation = this.page.locator(this.mitigationAbility(abilityId));
    const bossAction = this.page.locator(`[data-testid="boss-action-${actionId}"]`);
    
    await mitigation.waitFor({ state: 'visible' });
    await bossAction.waitFor({ state: 'visible' });
    
    await dragAndDrop(this.page, this.mitigationAbility(abilityId), `[data-testid="boss-action-${actionId}"]`);
  }

  async assignMitigationWithTankSelection(abilityId, actionId, tankPosition) {
    await this.dragMitigationToAction(abilityId, actionId);
    
    // Wait for tank selection modal
    await waitForElement(this.page, this.tankSelectionModal);
    
    // Select tank position
    const tankButton = tankPosition === 'MT' ? this.mainTankButton : this.offTankButton;
    await clickAndWait(this.page, tankButton);
    
    // Verify assignment
    await verifyMitigationAssignment(this.page, actionId, abilityId);
  }

  async removeMitigation(actionId, abilityId) {
    const removeButton = this.page.locator(this.removeMitigationButton(actionId, abilityId));
    await removeButton.waitFor({ state: 'visible' });
    await removeButton.click();
    
    // Verify mitigation is removed
    const assignedMitigation = this.page.locator(this.assignedMitigation(actionId, abilityId));
    await expect(assignedMitigation).not.toBeVisible();
  }

  async verifyMitigationAvailable(abilityId, shouldBeAvailable = true) {
    const mitigation = this.page.locator(this.mitigationAbility(abilityId));
    
    if (shouldBeAvailable) {
      await expect(mitigation).not.toHaveClass(/disabled|on-cooldown/);
      const availableIndicator = this.page.locator(this.availableIndicator(abilityId));
      await expect(availableIndicator).toBeVisible();
    } else {
      await expect(mitigation).toHaveClass(/disabled|on-cooldown/);
    }
  }

  async verifyMitigationOnCooldown(abilityId, expectedCooldown) {
    const mitigation = this.page.locator(this.mitigationAbility(abilityId));
    await expect(mitigation).toHaveClass(/on-cooldown/);
    
    const cooldownTimer = this.page.locator(this.cooldownTimer(abilityId));
    await expect(cooldownTimer).toBeVisible();
    
    if (expectedCooldown) {
      await expect(cooldownTimer).toContainText(expectedCooldown.toString());
    }
  }

  async verifyChargeBasedAbility(abilityId, expectedCharges) {
    const chargeCounter = this.page.locator(this.chargeCounter(abilityId));
    await expect(chargeCounter).toBeVisible();
    await expect(chargeCounter).toContainText(expectedCharges.toString());
    
    // Verify individual charge indicators
    for (let i = 1; i <= expectedCharges; i++) {
      const chargeIndicator = this.page.locator(this.chargeIndicator(abilityId, i));
      await expect(chargeIndicator).toBeVisible();
    }
  }

  async verifyAetherflowStacks(expectedStacks) {
    const stacksContainer = this.page.locator(this.aetherflowStacks);
    await expect(stacksContainer).toBeVisible();
    
    for (let i = 1; i <= 3; i++) {
      const stack = this.page.locator(this.aetherflowStack(i));
      if (i <= expectedStacks) {
        await expect(stack).toHaveClass(/active/);
      } else {
        await expect(stack).not.toHaveClass(/active/);
      }
    }
  }

  async verifyMitigationDetails(abilityId, expectedDetails) {
    const mitigation = this.page.locator(this.mitigationAbility(abilityId));
    await mitigation.waitFor({ state: 'visible' });
    
    if (expectedDetails.name) {
      const nameElement = this.page.locator(this.mitigationName(abilityId));
      await expect(nameElement).toContainText(expectedDetails.name);
    }
    
    if (expectedDetails.cooldown) {
      const cooldownElement = this.page.locator(this.mitigationCooldown(abilityId));
      await expect(cooldownElement).toContainText(expectedDetails.cooldown.toString());
    }
    
    if (expectedDetails.duration) {
      const durationElement = this.page.locator(this.mitigationDuration(abilityId));
      await expect(durationElement).toContainText(expectedDetails.duration.toString());
    }
    
    if (expectedDetails.mitigation) {
      const mitigationElement = this.page.locator(this.mitigationPercentage(abilityId));
      await expect(mitigationElement).toContainText(`${expectedDetails.mitigation}%`);
    }
  }

  async verifyTankPositionAssignment(abilityId, actionId, expectedPosition) {
    const assignedMitigation = this.page.locator(this.assignedMitigation(actionId, abilityId));
    await expect(assignedMitigation).toBeVisible();
    
    const positionIndicator = this.page.locator(this.tankPositionIndicator(abilityId, expectedPosition));
    await expect(positionIndicator).toBeVisible();
  }

  async hoverOverMitigation(abilityId) {
    const mitigation = this.page.locator(this.mitigationAbility(abilityId));
    await mitigation.hover();
    
    // Verify tooltip appears
    const tooltip = this.page.locator('[data-testid="mitigation-tooltip"]');
    await expect(tooltip).toBeVisible();
  }

  async verifyMitigationTooltip(abilityId, expectedContent) {
    await this.hoverOverMitigation(abilityId);
    
    const tooltip = this.page.locator('[data-testid="mitigation-tooltip"]');
    await expect(tooltip).toContainText(expectedContent);
  }

  async toggleMitigationFilter() {
    await clickAndWait(this.page, this.mitigationFilter);
  }

  async toggleShowAllMitigations() {
    await clickAndWait(this.page, this.showAllMitigationsToggle);
  }

  async verifyMitigationVisibility(abilityId, shouldBeVisible = true) {
    const mitigation = this.page.locator(this.mitigationAbility(abilityId));
    
    if (shouldBeVisible) {
      await expect(mitigation).toBeVisible();
    } else {
      await expect(mitigation).not.toBeVisible();
    }
  }

  async getAssignedMitigations(actionId) {
    const assignedList = this.page.locator(this.assignedMitigationsList(actionId));
    const mitigations = assignedList.locator('[data-testid^="assigned-mitigation-"]');
    const count = await mitigations.count();
    const assignments = [];
    
    for (let i = 0; i < count; i++) {
      const mitigation = mitigations.nth(i);
      const testId = await mitigation.getAttribute('data-testid');
      const parts = testId.split('-');
      const abilityId = parts[parts.length - 1];
      assignments.push(abilityId);
    }
    
    return assignments;
  }

  async verifyMitigationOverlap(actionId, abilityIds) {
    for (const abilityId of abilityIds) {
      await verifyMitigationAssignment(this.page, actionId, abilityId);
    }
    
    // Verify overlap indicator if multiple mitigations are assigned
    if (abilityIds.length > 1) {
      const overlapIndicator = this.page.locator(`[data-testid="mitigation-overlap-${actionId}"]`);
      await expect(overlapIndicator).toBeVisible();
    }
  }

  async cancelTankSelection() {
    await waitForElement(this.page, this.tankSelectionModal);
    await clickAndWait(this.page, this.cancelTankSelectionButton);
    
    // Verify modal is closed
    await expect(this.page.locator(this.tankSelectionModal)).not.toBeVisible();
  }
}
