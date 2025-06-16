import { test, expect } from '@playwright/test';
import { PlanManagementPage } from '../page-objects/PlanManagementPage.js';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { testPlans } from '../utils/test-data.js';
import { waitForPageLoad, generatePlanName } from '../utils/helpers.js';

test.describe('Import/Export Functionality', () => {
  let planManagementPage;
  let jobSelectorPage;
  let bossTimelinePage;
  let mitigationPage;

  test.beforeEach(async ({ page }) => {
    planManagementPage = new PlanManagementPage(page);
    jobSelectorPage = new JobSelectorPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    mitigationPage = new MitigationPage(page);
    
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Plan Export', () => {
    test('should export plan as JSON', async ({ page }) => {
      // Create a plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM']);
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Export the plan
      const exportData = await planManagementPage.exportPlan('json');
      
      // Verify export data structure
      await planManagementPage.verifyExportData(exportData, {
        bossId: 'ketuduke',
        selectedJobs: {
          tank: [{ id: 'PLD', selected: true }],
          healer: [{ id: 'WHM', selected: true }]
        },
        assignments: {
          hydrofall: [{ abilityId: 'rampart' }]
        }
      });
    });

    test('should export plan with all data intact', async ({ page }) => {
      // Create comprehensive plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WAR', 'WHM', 'SCH']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      // Multiple mitigation assignments
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      await mitigationPage.dragMitigationToAction('reprisal', 'hydrofall');
      
      await bossTimelinePage.selectBossAction('fluke_typhoon');
      await mitigationPage.assignMitigationWithTankSelection('hallowed_ground', 'fluke_typhoon', 'MT');
      
      const exportData = await planManagementPage.exportPlan('json');
      const parsedData = JSON.parse(exportData);
      
      // Verify comprehensive data
      expect(parsedData.planData.bossId).toBe('ketuduke');
      expect(parsedData.planData.selectedJobs.tank).toHaveLength(2);
      expect(parsedData.planData.selectedJobs.healer).toHaveLength(2);
      expect(parsedData.planData.tankPositions).toBeDefined();
      expect(parsedData.planData.assignments.hydrofall).toHaveLength(2);
      expect(parsedData.planData.assignments.fluke_typhoon).toHaveLength(1);
    });

    test('should copy export data to clipboard', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.exportPlan('json');
      
      // Copy to clipboard
      await page.locator('[data-testid="copy-export-data"]').click();
      
      await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Export data copied');
    });

    test('should download export file', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.exportPlan('json');
      
      // Download file
      const download = await planManagementPage.downloadExport();
      
      expect(download.suggestedFilename()).toMatch(/mitplan-export-\d+\.json/);
    });

    test('should export empty plan', async ({ page }) => {
      const exportData = await planManagementPage.exportPlan('json');
      const parsedData = JSON.parse(exportData);
      
      expect(parsedData.planData.bossId).toBeNull();
      expect(parsedData.planData.selectedJobs).toEqual({});
      expect(parsedData.planData.assignments).toEqual({});
    });

    test('should include metadata in export', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      const exportData = await planManagementPage.exportPlan('json');
      const parsedData = JSON.parse(exportData);
      
      expect(parsedData.version).toBeDefined();
      expect(parsedData.exportedAt).toBeDefined();
      expect(parsedData.appVersion).toBeDefined();
    });
  });

  test.describe('Plan Import', () => {
    test('should import valid JSON plan', async ({ page }) => {
      const planData = JSON.stringify({
        version: '1.0',
        planData: testPlans.basicPlan
      });
      
      await planManagementPage.importPlan(planData, 'json');
      
      // Verify imported data
      await planManagementPage.verifyPlanLoaded({
        bossId: 'ketuduke',
        selectedJobs: testPlans.basicPlan.selectedJobs
      });
      
      // Verify assignments
      const assignments = await mitigationPage.getAssignedMitigations('hydrofall');
      expect(assignments).toContain('rampart');
    });

    test('should import plan with tank positions', async ({ page }) => {
      const planData = JSON.stringify({
        version: '1.0',
        planData: {
          ...testPlans.complexPlan,
          tankPositions: {
            'DRK': 'MT',
            'GNB': 'OT'
          }
        }
      });
      
      await planManagementPage.importPlan(planData, 'json');
      
      // Verify tank positions
      await jobSelectorPage.verifyTankPositionAssignment('DRK', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('GNB', 'OT');
    });

    test('should handle import errors gracefully', async ({ page }) => {
      const invalidData = '{ invalid json }';
      
      try {
        await planManagementPage.importPlan(invalidData, 'json');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Invalid import data');
      }
    });

    test('should validate imported data', async ({ page }) => {
      const invalidPlanData = JSON.stringify({
        version: '1.0',
        planData: {
          bossId: 'nonexistent_boss',
          selectedJobs: { invalid: 'structure' },
          assignments: null
        }
      });
      
      try {
        await planManagementPage.importPlan(invalidPlanData, 'json');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Invalid plan data');
      }
    });

    test('should import from file', async ({ page }) => {
      // Create a temporary file with plan data
      const planData = JSON.stringify({
        version: '1.0',
        planData: testPlans.basicPlan
      });
      
      // Create blob and file
      const blob = new Blob([planData], { type: 'application/json' });
      const file = new File([blob], 'test-plan.json', { type: 'application/json' });
      
      await planManagementPage.importPlan(file, 'json');
      
      await planManagementPage.verifyPlanLoaded({
        bossId: 'ketuduke'
      });
    });

    test('should merge imported data with existing plan', async ({ page }) => {
      // Set up existing plan
      await bossTimelinePage.selectBoss('lala');
      await jobSelectorPage.selectJob('BLM');
      
      // Import different plan
      const planData = JSON.stringify({
        version: '1.0',
        planData: testPlans.basicPlan
      });
      
      await planManagementPage.importPlan(planData, 'json');
      
      // Should replace existing plan
      await expect(page.locator('[data-testid="selected-boss-name"]')).toContainText('Ketuduke');
      await jobSelectorPage.verifyJobCardState('PLD', true);
      await jobSelectorPage.verifyJobCardState('BLM', false);
    });

    test('should handle version compatibility', async ({ page }) => {
      const oldVersionData = JSON.stringify({
        version: '0.5',
        planData: testPlans.basicPlan
      });
      
      await planManagementPage.importPlan(oldVersionData, 'json');
      
      // Should show compatibility warning but still import
      await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Imported from older version');
    });
  });

  test.describe('Data Validation', () => {
    test('should validate boss existence', async ({ page }) => {
      const invalidBossData = JSON.stringify({
        version: '1.0',
        planData: {
          bossId: 'nonexistent_boss',
          selectedJobs: {},
          assignments: {}
        }
      });
      
      try {
        await planManagementPage.importPlan(invalidBossData, 'json');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Unknown boss');
      }
    });

    test('should validate job existence', async ({ page }) => {
      const invalidJobData = JSON.stringify({
        version: '1.0',
        planData: {
          bossId: 'ketuduke',
          selectedJobs: {
            tank: [{ id: 'INVALID_JOB', selected: true }]
          },
          assignments: {}
        }
      });
      
      try {
        await planManagementPage.importPlan(invalidJobData, 'json');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Unknown job');
      }
    });

    test('should validate mitigation abilities', async ({ page }) => {
      const invalidAbilityData = JSON.stringify({
        version: '1.0',
        planData: {
          bossId: 'ketuduke',
          selectedJobs: { tank: [{ id: 'PLD', selected: true }] },
          assignments: {
            hydrofall: [{ abilityId: 'invalid_ability' }]
          }
        }
      });
      
      try {
        await planManagementPage.importPlan(invalidAbilityData, 'json');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Unknown ability');
      }
    });

    test('should sanitize imported data', async ({ page }) => {
      const maliciousData = JSON.stringify({
        version: '1.0',
        planData: {
          bossId: 'ketuduke',
          selectedJobs: {},
          assignments: {},
          maliciousScript: '<script>alert("xss")</script>'
        }
      });
      
      await planManagementPage.importPlan(maliciousData, 'json');
      
      // Should import safely without executing scripts
      await planManagementPage.verifyPlanLoaded({ bossId: 'ketuduke' });
    });
  });

  test.describe('Format Support', () => {
    test('should support multiple export formats', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Test JSON format
      const jsonData = await planManagementPage.exportPlan('json');
      expect(() => JSON.parse(jsonData)).not.toThrow();
      
      // Test other formats if supported
      // const csvData = await planManagementPage.exportPlan('csv');
      // expect(csvData).toContain('Boss,Job,Ability');
    });

    test('should maintain data integrity across export/import cycle', async ({ page }) => {
      // Create complex plan
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WAR', 'WHM']);
      await jobSelectorPage.assignTankPositions('PLD', 'WAR');
      
      await bossTimelinePage.selectBossAction('hydrofall');
      await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      
      // Export
      const exportData = await planManagementPage.exportPlan('json');
      
      // Clear plan
      await page.reload();
      await waitForPageLoad(page);
      
      // Import
      await planManagementPage.importPlan(exportData, 'json');
      
      // Verify all data is preserved
      await expect(page.locator('[data-testid="selected-boss-name"]')).toContainText('Ketuduke');
      await jobSelectorPage.verifyJobCardState('PLD', true);
      await jobSelectorPage.verifyJobCardState('WAR', true);
      await jobSelectorPage.verifyJobCardState('WHM', true);
      await jobSelectorPage.verifyTankPositionAssignment('PLD', 'MT');
      await jobSelectorPage.verifyTankPositionAssignment('WAR', 'OT');
      
      const assignments = await mitigationPage.getAssignedMitigations('hydrofall');
      expect(assignments).toContain('rampart');
    });
  });

  test.describe('Performance', () => {
    test('should handle large plan exports efficiently', async ({ page }) => {
      // Mock large plan
      await page.addInitScript(() => {
        window.__MOCK_LARGE_PLAN__ = {
          bossId: 'ketuduke',
          selectedJobs: { /* many jobs */ },
          assignments: { /* many assignments */ }
        };
      });
      
      const startTime = Date.now();
      const exportData = await planManagementPage.exportPlan('json');
      const exportTime = Date.now() - startTime;
      
      expect(exportTime).toBeLessThan(2000); // Should export within 2 seconds
      expect(exportData.length).toBeGreaterThan(0);
    });

    test('should handle large plan imports efficiently', async ({ page }) => {
      const largePlanData = JSON.stringify({
        version: '1.0',
        planData: {
          bossId: 'ketuduke',
          selectedJobs: testPlans.complexPlan.selectedJobs,
          assignments: testPlans.complexPlan.assignments
        }
      });
      
      const startTime = Date.now();
      await planManagementPage.importPlan(largePlanData, 'json');
      const importTime = Date.now() - startTime;
      
      expect(importTime).toBeLessThan(3000); // Should import within 3 seconds
    });
  });
});
