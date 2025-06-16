/**
 * Comprehensive Test Runner for Shared Plan Functionality
 * 
 * This script runs all tests related to the shared plan functionality fixes
 * and provides a detailed report of the results
 */

import PlanStorageService from '../services/PlanStorageService.js';
import PlanValidationService from '../services/PlanValidationService.js';
import ErrorHandlingService from '../services/ErrorHandlingService.js';

class SharedPlanTestRunner {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Run all shared plan functionality tests
   */
  async runAllTests() {
    console.log('%c🧪 Starting Shared Plan Functionality Tests', 'background: #2196F3; color: white; padding: 10px; border-radius: 5px; font-size: 16px; font-weight: bold;');
    console.log('');

    // Test categories
    await this.testPlanValidation();
    await this.testPlanNormalization();
    await this.testErrorHandling();
    await this.testDataIntegrity();
    await this.testCollaborationReadiness();

    // Generate final report
    this.generateReport();
  }

  /**
   * Test plan validation functionality
   */
  async testPlanValidation() {
    console.log('%c📋 Testing Plan Validation', 'background: #4CAF50; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Valid plan data
    await this.runTest('Valid plan data validation', () => {
      const validPlan = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: { 'boss-action-1': [{ id: 'mitigation-1', jobId: 'PLD' }] },
        selectedJobs: { 'PLD': true, 'WHM': true },
        tankPositions: { mainTank: 'PLD' }
      };

      const validation = PlanValidationService.validateForImport(validPlan);
      return validation.isValid && validation.canImport;
    });

    // Test 2: Invalid plan data
    await this.runTest('Invalid plan data detection', () => {
      const invalidPlan = {
        // Missing required fields
        assignments: 'invalid',
        selectedJobs: null
      };

      const validation = PlanValidationService.validateForImport(invalidPlan);
      return !validation.isValid && validation.issues.length > 0;
    });

    // Test 3: Collaboration validation
    await this.runTest('Collaboration readiness validation', () => {
      const sharedPlan = {
        id: 'test-plan-123',
        name: 'Shared Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isShared: true,
        isPublic: true
      };

      const validation = PlanValidationService.validateForCollaboration(sharedPlan);
      return validation.canCollaborate;
    });

    // Test 4: Non-collaborative plan detection
    await this.runTest('Non-collaborative plan detection', () => {
      const privatePlan = {
        id: 'test-plan-123',
        name: 'Private Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isShared: false,
        isPublic: false
      };

      const validation = PlanValidationService.validateForCollaboration(privatePlan);
      return !validation.canCollaborate && validation.collaborationIssues.length > 0;
    });
  }

  /**
   * Test plan normalization from database
   */
  async testPlanNormalization() {
    console.log('%c🔄 Testing Plan Normalization', 'background: #FF9800; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Database plan normalization
    await this.runTest('Database plan normalization', () => {
      const dbPlan = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isPublic: true,
        isShared: true,
        userId: 'user-123',
        createdAt: { toISOString: () => '2024-01-01T00:00:00.000Z' },
        updatedAt: { toISOString: () => '2024-01-01T00:00:00.000Z' }
      };

      const normalized = PlanStorageService.normalizePlanFromDatabase(dbPlan);
      
      return normalized.id === 'test-plan-123' &&
             normalized.isShared === true &&
             normalized.isPublic === true &&
             normalized.source === 'database';
    });

    // Test 2: Missing isShared flag preservation
    await this.runTest('isShared flag preservation', () => {
      const dbPlan = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isShared: true,
        createdAt: { toISOString: () => '2024-01-01T00:00:00.000Z' },
        updatedAt: { toISOString: () => '2024-01-01T00:00:00.000Z' }
      };

      const normalized = PlanStorageService.normalizePlanFromDatabase(dbPlan);
      return normalized.hasOwnProperty('isShared') && normalized.isShared === true;
    });

    // Test 3: Validation during normalization
    await this.runTest('Validation during normalization', () => {
      const dbPlan = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        createdAt: { toISOString: () => '2024-01-01T00:00:00.000Z' },
        updatedAt: { toISOString: () => '2024-01-01T00:00:00.000Z' }
      };

      try {
        const normalized = PlanStorageService.normalizePlanFromDatabase(dbPlan);
        return normalized && typeof normalized === 'object';
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Test error handling functionality
   */
  async testErrorHandling() {
    console.log('%c⚠️ Testing Error Handling', 'background: #f44336; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Plan loading error handling
    await this.runTest('Plan loading error handling', () => {
      const error = new Error('Plan not found');
      const result = ErrorHandlingService.handlePlanLoadError(error, 'test-plan-123', 'test');
      
      return result.title === 'Plan Not Found' &&
             result.type === 'error' &&
             result.actions.length > 0;
    });

    // Test 2: Collaboration error handling
    await this.runTest('Collaboration error handling', () => {
      const error = new Error('Connection failed');
      const result = ErrorHandlingService.handleCollaborationError(error, 'test-plan-123', 'test');
      
      return result.type === 'warning' &&
             result.message.includes('collaboration is temporarily unavailable');
    });

    // Test 3: Validation error handling
    await this.runTest('Validation error handling', () => {
      const validationResult = {
        errors: ['Plan ID is missing'],
        warnings: ['No jobs selected']
      };
      
      const result = ErrorHandlingService.handleValidationError(validationResult, 'test');
      
      return result.title === 'Plan Data Issues' &&
             result.message.includes('1 issue(s)');
    });

    // Test 4: Success message handling
    await this.runTest('Success message handling', () => {
      const result = ErrorHandlingService.handleSuccess('plan_loaded', {
        planName: 'Test Plan',
        assignmentCount: 5
      });
      
      return result.title === 'Plan Loaded Successfully' &&
             result.message.includes('Test Plan') &&
             result.message.includes('5 mitigation assignments');
    });
  }

  /**
   * Test data integrity checks
   */
  async testDataIntegrity() {
    console.log('%c🔍 Testing Data Integrity', 'background: #9C27B0; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Assignment validation
    await this.runTest('Assignment structure validation', () => {
      const assignments = {
        'boss-action-1': [
          { id: 'mitigation-1', jobId: 'PLD', abilityId: 'rampart' }
        ]
      };

      const validation = PlanValidationService.validateAssignments(assignments);
      return validation.isValid && validation.totalAssignments === 1;
    });

    // Test 2: Job selection validation
    await this.runTest('Job selection validation', () => {
      const selectedJobs = {
        'PLD': true,
        'WHM': true,
        'DRG': true,
        'BLM': true
      };

      const validation = PlanValidationService.validateSelectedJobs(selectedJobs);
      return validation.isValid && validation.selectedCount === 4;
    });

    // Test 3: Tank position validation
    await this.runTest('Tank position validation', () => {
      const tankPositions = { mainTank: 'PLD' };
      const selectedJobs = { 'PLD': true, 'WHM': true };

      const validation = PlanValidationService.validateTankPositions(tankPositions, selectedJobs);
      return validation.isValid && validation.positionCount === 1;
    });

    // Test 4: Comprehensive validation report
    await this.runTest('Comprehensive validation report', () => {
      const planData = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: { 'boss-action-1': [{ id: 'mitigation-1', jobId: 'PLD' }] },
        selectedJobs: { 'PLD': true },
        tankPositions: { mainTank: 'PLD' }
      };

      const report = PlanValidationService.generateValidationReport(planData, 'test');
      
      return report.overall.isValid &&
             report.overall.canProceed &&
             report.sections.basic &&
             report.sections.assignments &&
             report.sections.selectedJobs;
    });
  }

  /**
   * Test collaboration readiness
   */
  async testCollaborationReadiness() {
    console.log('%c🤝 Testing Collaboration Readiness', 'background: #00BCD4; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Shared plan detection
    await this.runTest('Shared plan detection', () => {
      const sharedPlan = {
        id: 'test-plan-123',
        name: 'Shared Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isShared: true,
        isPublic: true
      };

      const validation = PlanValidationService.validateForCollaboration(sharedPlan);
      return validation.canCollaborate;
    });

    // Test 2: Plan data completeness for collaboration
    await this.runTest('Plan data completeness for collaboration', () => {
      const completePlan = {
        id: 'test-plan-123',
        name: 'Complete Plan',
        bossId: 'ketuduke',
        assignments: { 'boss-action-1': [{ id: 'mitigation-1', jobId: 'PLD' }] },
        selectedJobs: { 'PLD': true, 'WHM': true },
        tankPositions: { mainTank: 'PLD' },
        isShared: true,
        isPublic: true,
        userId: 'user-123'
      };

      const report = PlanValidationService.generateValidationReport(completePlan, 'collaboration');
      return report.overall.canProceed && report.sections.collaboration.canCollaborate;
    });
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    this.totalTests++;
    
    try {
      const result = await testFunction();
      
      if (result) {
        this.passedTests++;
        console.log(`  ✅ ${testName}`);
        this.testResults.push({ name: testName, status: 'PASSED', error: null });
      } else {
        this.failedTests++;
        console.log(`  ❌ ${testName} - Test returned false`);
        this.testResults.push({ name: testName, status: 'FAILED', error: 'Test returned false' });
      }
    } catch (error) {
      this.failedTests++;
      console.log(`  ❌ ${testName} - ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  /**
   * Generate final test report
   */
  generateReport() {
    console.log('');
    console.log('%c📊 Test Results Summary', 'background: #2196F3; color: white; padding: 10px; border-radius: 5px; font-size: 16px; font-weight: bold;');
    console.log('');
    
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`%cPassed: ${this.passedTests}`, 'color: #4CAF50; font-weight: bold;');
    console.log(`%cFailed: ${this.failedTests}`, 'color: #f44336; font-weight: bold;');
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
    
    if (this.failedTests > 0) {
      console.log('');
      console.log('%cFailed Tests:', 'color: #f44336; font-weight: bold;');
      this.testResults
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  ❌ ${test.name}: ${test.error}`);
        });
    }

    console.log('');
    if (this.failedTests === 0) {
      console.log('%c🎉 All tests passed! Shared plan functionality is working correctly.', 'background: #4CAF50; color: white; padding: 10px; border-radius: 5px; font-weight: bold;');
    } else {
      console.log('%c⚠️ Some tests failed. Please review the issues above.', 'background: #f44336; color: white; padding: 10px; border-radius: 5px; font-weight: bold;');
    }
  }
}

// Export for use in browser console or testing environment
export default SharedPlanTestRunner;

// Auto-run tests if this script is executed directly
if (typeof window !== 'undefined') {
  window.runSharedPlanTests = async () => {
    const testRunner = new SharedPlanTestRunner();
    await testRunner.runAllTests();
    return testRunner.testResults;
  };
  
  console.log('%cShared Plan Test Runner loaded!', 'background: #2196F3; color: white; padding: 5px; border-radius: 3px;');
  console.log('Run tests with: runSharedPlanTests()');
}
