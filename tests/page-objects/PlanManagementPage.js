import { expect } from '@playwright/test';
import { waitForElement, fillInput, clickAndWait, waitForToast, generatePlanName } from '../utils/helpers.js';

export class PlanManagementPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.importExportSection = '[data-testid="import-export-section"]';
    this.savePlanButton = '[data-testid="save-plan-button"]';
    this.loadPlanButton = '[data-testid="load-plan-button"]';
    this.exportPlanButton = '[data-testid="export-plan-button"]';
    this.importPlanButton = '[data-testid="import-plan-button"]';
    this.sharePlanButton = '[data-testid="share-plan-button"]';
    
    // Save plan modal
    this.savePlanModal = '[data-testid="save-plan-modal"]';
    this.planNameInput = '[data-testid="plan-name-input"]';
    this.planDescriptionInput = '[data-testid="plan-description-input"]';
    this.confirmSaveButton = '[data-testid="confirm-save-button"]';
    this.cancelSaveButton = '[data-testid="cancel-save-button"]';
    
    // Load plan modal
    this.loadPlanModal = '[data-testid="load-plan-modal"]';
    this.savedPlansList = '[data-testid="saved-plans-list"]';
    this.savedPlanItem = (planId) => `[data-testid="saved-plan-${planId}"]`;
    this.planPreview = '[data-testid="plan-preview"]';
    this.loadSelectedPlanButton = '[data-testid="load-selected-plan"]';
    this.deletePlanButton = (planId) => `[data-testid="delete-plan-${planId}"]`;
    
    // Import/Export
    this.importFileInput = '[data-testid="import-file-input"]';
    this.exportFormatSelect = '[data-testid="export-format-select"]';
    this.exportDataTextarea = '[data-testid="export-data-textarea"]';
    this.copyExportDataButton = '[data-testid="copy-export-data"]';
    this.downloadExportButton = '[data-testid="download-export"]';
    
    // Share plan
    this.sharePlanModal = '[data-testid="share-plan-modal"]';
    this.shareUrlInput = '[data-testid="share-url-input"]';
    this.copyShareUrlButton = '[data-testid="copy-share-url"]';
    this.sharePermissionsSelect = '[data-testid="share-permissions-select"]';
    this.enableCollaborationToggle = '[data-testid="enable-collaboration-toggle"]';
    
    // Storage status
    this.storageStatusIndicator = '[data-testid="storage-status-indicator"]';
    this.syncStatusIndicator = '[data-testid="sync-status-indicator"]';
    this.lastSavedIndicator = '[data-testid="last-saved-indicator"]';
    
    // Migration
    this.migrationDialog = '[data-testid="migration-dialog"]';
    this.migrateFromLocalStorageButton = '[data-testid="migrate-from-local-storage"]';
    this.skipMigrationButton = '[data-testid="skip-migration"]';
  }

  async savePlan(planName, description = '') {
    await clickAndWait(this.page, this.savePlanButton);
    await waitForElement(this.page, this.savePlanModal);
    
    const name = planName || generatePlanName();
    await fillInput(this.page, this.planNameInput, name);
    
    if (description) {
      await fillInput(this.page, this.planDescriptionInput, description);
    }
    
    await clickAndWait(this.page, this.confirmSaveButton);
    
    // Wait for save confirmation
    await waitForToast(this.page, 'Plan saved successfully');
    
    return name;
  }

  async loadPlan(planId) {
    await clickAndWait(this.page, this.loadPlanButton);
    await waitForElement(this.page, this.loadPlanModal);
    
    // Select plan from list
    const planItem = this.page.locator(this.savedPlanItem(planId));
    await planItem.click();
    
    // Verify plan preview appears
    await waitForElement(this.page, this.planPreview);
    
    // Load the plan
    await clickAndWait(this.page, this.loadSelectedPlanButton);
    
    // Wait for load confirmation
    await waitForToast(this.page, 'Plan loaded successfully');
  }

  async deletePlan(planId) {
    await clickAndWait(this.page, this.loadPlanButton);
    await waitForElement(this.page, this.loadPlanModal);
    
    const deleteButton = this.page.locator(this.deletePlanButton(planId));
    await deleteButton.click();
    
    // Confirm deletion in dialog
    await this.page.getByRole('button', { name: 'Delete' }).click();
    
    // Wait for deletion confirmation
    await waitForToast(this.page, 'Plan deleted successfully');
  }

  async exportPlan(format = 'json') {
    await clickAndWait(this.page, this.exportPlanButton);
    
    // Select export format
    await this.page.locator(this.exportFormatSelect).selectOption(format);
    
    // Wait for export data to be generated
    await waitForElement(this.page, this.exportDataTextarea);
    
    // Get export data
    const exportData = await this.page.locator(this.exportDataTextarea).inputValue();
    
    return exportData;
  }

  async importPlan(planData, format = 'json') {
    await clickAndWait(this.page, this.importPlanButton);
    
    if (typeof planData === 'string') {
      // Import from text data
      const textarea = this.page.locator('[data-testid="import-data-textarea"]');
      await textarea.fill(planData);
    } else {
      // Import from file
      const fileInput = this.page.locator(this.importFileInput);
      await fileInput.setInputFiles(planData);
    }
    
    // Confirm import
    await clickAndWait(this.page, '[data-testid="confirm-import-button"]');
    
    // Wait for import confirmation
    await waitForToast(this.page, 'Plan imported successfully');
  }

  async sharePlan(permissions = 'edit') {
    await clickAndWait(this.page, this.sharePlanButton);
    await waitForElement(this.page, this.sharePlanModal);
    
    // Set permissions
    await this.page.locator(this.sharePermissionsSelect).selectOption(permissions);
    
    // Enable collaboration if needed
    if (permissions === 'edit') {
      const collaborationToggle = this.page.locator(this.enableCollaborationToggle);
      const isChecked = await collaborationToggle.isChecked();
      if (!isChecked) {
        await collaborationToggle.click();
      }
    }
    
    // Generate share URL
    await clickAndWait(this.page, '[data-testid="generate-share-url"]');
    
    // Wait for URL to be generated
    await waitForElement(this.page, this.shareUrlInput);
    
    // Get share URL
    const shareUrl = await this.page.locator(this.shareUrlInput).inputValue();
    
    return shareUrl;
  }

  async copyShareUrl() {
    await clickAndWait(this.page, this.copyShareUrlButton);
    await waitForToast(this.page, 'Share URL copied to clipboard');
  }

  async verifyPlanSaved(planName) {
    // Check for save confirmation
    await waitForToast(this.page, 'Plan saved successfully');
    
    // Verify last saved indicator updates
    const lastSaved = this.page.locator(this.lastSavedIndicator);
    await expect(lastSaved).toContainText('just now');
  }

  async verifyPlanLoaded(expectedData) {
    // Wait for load confirmation
    await waitForToast(this.page, 'Plan loaded successfully');
    
    // Verify plan data is applied
    if (expectedData.bossId) {
      const selectedBoss = this.page.locator('[data-testid="selected-boss-name"]');
      await expect(selectedBoss).toContainText(expectedData.bossId);
    }
    
    if (expectedData.selectedJobs) {
      for (const job of expectedData.selectedJobs) {
        const jobCard = this.page.locator(`[data-testid="job-card-${job.id}"]`);
        if (job.selected) {
          await expect(jobCard).toHaveClass(/selected/);
        }
      }
    }
  }

  async verifyStorageStatus(expectedStatus) {
    const statusIndicator = this.page.locator(this.storageStatusIndicator);
    await expect(statusIndicator).toContainText(expectedStatus);
  }

  async verifySyncStatus(expectedStatus) {
    const syncIndicator = this.page.locator(this.syncStatusIndicator);
    await expect(syncIndicator).toContainText(expectedStatus);
  }

  async getSavedPlans() {
    await clickAndWait(this.page, this.loadPlanButton);
    await waitForElement(this.page, this.loadPlanModal);
    
    const planItems = this.page.locator('[data-testid^="saved-plan-"]');
    const count = await planItems.count();
    const plans = [];
    
    for (let i = 0; i < count; i++) {
      const item = planItems.nth(i);
      const testId = await item.getAttribute('data-testid');
      const planId = testId.replace('saved-plan-', '');
      const name = await item.locator('[data-testid="plan-name"]').textContent();
      const lastModified = await item.locator('[data-testid="plan-last-modified"]').textContent();
      
      plans.push({ id: planId, name, lastModified });
    }
    
    // Close modal
    await this.page.keyboard.press('Escape');
    
    return plans;
  }

  async verifyPlanPreview(planId, expectedData) {
    await clickAndWait(this.page, this.loadPlanButton);
    await waitForElement(this.page, this.loadPlanModal);
    
    // Select plan
    const planItem = this.page.locator(this.savedPlanItem(planId));
    await planItem.click();
    
    // Verify preview data
    const preview = this.page.locator(this.planPreview);
    await expect(preview).toBeVisible();
    
    if (expectedData.bossName) {
      await expect(preview).toContainText(expectedData.bossName);
    }
    
    if (expectedData.jobCount) {
      await expect(preview).toContainText(`${expectedData.jobCount} jobs selected`);
    }
    
    if (expectedData.mitigationCount) {
      await expect(preview).toContainText(`${expectedData.mitigationCount} mitigations assigned`);
    }
  }

  async handleMigrationDialog(shouldMigrate = true) {
    try {
      await waitForElement(this.page, this.migrationDialog, { timeout: 3000 });
      
      if (shouldMigrate) {
        await clickAndWait(this.page, this.migrateFromLocalStorageButton);
        await waitForToast(this.page, 'Plans migrated successfully');
      } else {
        await clickAndWait(this.page, this.skipMigrationButton);
      }
    } catch (error) {
      // Migration dialog might not appear if no local storage data exists
      console.log('No migration dialog appeared');
    }
  }

  async verifyExportData(exportData, expectedContent) {
    const parsedData = JSON.parse(exportData);
    
    expect(parsedData).toHaveProperty('version');
    expect(parsedData).toHaveProperty('planData');
    
    if (expectedContent.bossId) {
      expect(parsedData.planData.bossId).toBe(expectedContent.bossId);
    }
    
    if (expectedContent.selectedJobs) {
      expect(parsedData.planData.selectedJobs).toEqual(expectedContent.selectedJobs);
    }
    
    if (expectedContent.assignments) {
      expect(parsedData.planData.assignments).toEqual(expectedContent.assignments);
    }
  }

  async downloadExport() {
    const downloadPromise = this.page.waitForEvent('download');
    await clickAndWait(this.page, this.downloadExportButton);
    const download = await downloadPromise;
    
    return download;
  }
}
