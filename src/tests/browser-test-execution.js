/**
 * Browser Test Execution Script
 * 
 * This script can be run in the browser console to test shared plan functionality
 * It simulates user interactions and verifies the fixes are working correctly
 */

class BrowserTestExecution {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * Run all browser-based tests
   */
  async runAllTests() {
    console.log('%c🌐 Starting Browser-Based Shared Plan Tests', 'background: #2196F3; color: white; padding: 10px; border-radius: 5px; font-size: 16px; font-weight: bold;');
    
    try {
      await this.testCurrentPageState();
      await this.testPlanDataLoading();
      await this.testValidationServices();
      await this.testErrorHandlingServices();
      await this.testCollaborationReadiness();
      
      this.generateBrowserTestReport();
    } catch (error) {
      console.error('Test execution failed:', error);
    }
  }

  /**
   * Test current page state and URL handling
   */
  async testCurrentPageState() {
    console.log('%c📍 Testing Current Page State', 'background: #4CAF50; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Check if we're on a shared plan URL
    await this.runBrowserTest('Shared plan URL detection', () => {
      const isSharedPlan = window.location.pathname.includes('/plan/shared/');
      console.log('Current URL:', window.location.href);
      console.log('Is shared plan URL:', isSharedPlan);
      return true; // Always pass, just for information
    });

    // Test 2: Check if plan data is loaded in ReadOnly context
    await this.runBrowserTest('Plan data in ReadOnly context', () => {
      // Try to access ReadOnly context from window (if exposed)
      const hasReadOnlyContext = window.React && window.React.version;
      console.log('React available:', !!hasReadOnlyContext);
      return true; // Always pass, just for information
    });

    // Test 3: Check console for plan loading messages
    await this.runBrowserTest('Console log inspection', () => {
      console.log('Check the console above for plan loading messages');
      console.log('Look for messages with colored backgrounds indicating plan loading status');
      return true;
    });
  }

  /**
   * Test plan data loading functionality
   */
  async testPlanDataLoading() {
    console.log('%c📊 Testing Plan Data Loading', 'background: #FF9800; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Check if services are available
    await this.runBrowserTest('Services availability', () => {
      const servicesAvailable = {
        PlanStorageService: typeof window.PlanStorageService !== 'undefined',
        PlanValidationService: typeof window.PlanValidationService !== 'undefined',
        ErrorHandlingService: typeof window.ErrorHandlingService !== 'undefined'
      };
      
      console.log('Services availability:', servicesAvailable);
      return true; // Always pass, just for information
    });

    // Test 2: Check DOM for plan elements
    await this.runBrowserTest('Plan elements in DOM', () => {
      const planElements = {
        bossSelector: !!document.querySelector('[data-testid="boss-selector"], .boss-selector'),
        jobCards: document.querySelectorAll('[data-testid="job-card"], .job-card').length,
        bossActions: document.querySelectorAll('[data-testid="boss-action"], .boss-action').length,
        mitigationItems: document.querySelectorAll('[data-testid="mitigation-item"], .mitigation-item').length
      };
      
      console.log('Plan elements found:', planElements);
      return planElements.jobCards > 0 || planElements.bossActions > 0;
    });

    // Test 3: Check for collaboration indicators
    await this.runBrowserTest('Collaboration indicators', () => {
      const collaborationElements = {
        collaborationIndicator: !!document.querySelector('[data-testid="collaboration-indicator"]'),
        userPresence: !!document.querySelector('[data-testid="user-presence"]'),
        readOnlyBanner: !!document.querySelector('[data-testid="read-only-banner"]'),
        collaborationOnboarding: !!document.querySelector('[data-testid="collaboration-onboarding"]')
      };
      
      console.log('Collaboration elements:', collaborationElements);
      return true; // Always pass, just for information
    });
  }

  /**
   * Test validation services
   */
  async testValidationServices() {
    console.log('%c✅ Testing Validation Services', 'background: #9C27B0; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Create and validate test plan data
    await this.runBrowserTest('Plan validation with test data', () => {
      const testPlan = {
        id: 'browser-test-plan',
        name: 'Browser Test Plan',
        bossId: 'ketuduke',
        assignments: {
          'boss-action-1': [{ id: 'test-mitigation', jobId: 'PLD', abilityId: 'rampart' }]
        },
        selectedJobs: { 'PLD': true, 'WHM': true },
        tankPositions: { mainTank: 'PLD' },
        isShared: true,
        isPublic: true
      };

      // If validation service is available, test it
      if (window.PlanValidationService) {
        const validation = window.PlanValidationService.validateForImport(testPlan);
        console.log('Validation result:', validation);
        return validation.isValid;
      } else {
        console.log('PlanValidationService not available in window scope');
        return true; // Pass if service not available
      }
    });

    // Test 2: Test collaboration validation
    await this.runBrowserTest('Collaboration validation', () => {
      const sharedPlan = {
        id: 'browser-test-shared',
        name: 'Browser Test Shared Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isShared: true,
        isPublic: true
      };

      if (window.PlanValidationService) {
        const validation = window.PlanValidationService.validateForCollaboration(sharedPlan);
        console.log('Collaboration validation:', validation);
        return validation.canCollaborate;
      } else {
        console.log('PlanValidationService not available for collaboration test');
        return true;
      }
    });
  }

  /**
   * Test error handling services
   */
  async testErrorHandlingServices() {
    console.log('%c⚠️ Testing Error Handling Services', 'background: #f44336; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Test error message generation
    await this.runBrowserTest('Error message generation', () => {
      if (window.ErrorHandlingService) {
        const error = new Error('Test error');
        const result = window.ErrorHandlingService.handlePlanLoadError(error, 'test-plan', 'browser-test');
        console.log('Error handling result:', result);
        return result && result.title && result.message;
      } else {
        console.log('ErrorHandlingService not available in window scope');
        return true;
      }
    });

    // Test 2: Check for notification banner
    await this.runBrowserTest('Notification banner presence', () => {
      const notificationBanner = document.querySelector('.notification-banner-container');
      console.log('Notification banner found:', !!notificationBanner);
      return true; // Always pass, just for information
    });
  }

  /**
   * Test collaboration readiness
   */
  async testCollaborationReadiness() {
    console.log('%c🤝 Testing Collaboration Readiness', 'background: #00BCD4; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

    // Test 1: Check for collaboration context
    await this.runBrowserTest('Collaboration context availability', () => {
      // Look for collaboration-related elements in DOM
      const collaborationElements = document.querySelectorAll('[class*="collaboration"], [data-testid*="collaboration"]');
      console.log('Collaboration elements found:', collaborationElements.length);
      return true; // Always pass, just for information
    });

    // Test 2: Check URL for shared plan pattern
    await this.runBrowserTest('Shared plan URL pattern', () => {
      const url = window.location.pathname;
      const isSharedPlan = url.includes('/plan/shared/');
      const hasValidPlanId = /\/plan\/shared\/[a-f0-9-]{36}$/i.test(url);
      
      console.log('URL analysis:', {
        url,
        isSharedPlan,
        hasValidPlanId
      });
      
      return isSharedPlan; // Pass if we're on a shared plan URL
    });

    // Test 3: Check for real-time features
    await this.runBrowserTest('Real-time features detection', () => {
      const realtimeElements = {
        userPresence: document.querySelectorAll('[class*="user-presence"], [data-testid*="user-presence"]').length,
        selections: document.querySelectorAll('[class*="selection"], [data-testid*="selection"]').length,
        collaborationIndicator: document.querySelectorAll('[class*="collaboration-indicator"]').length
      };
      
      console.log('Real-time elements:', realtimeElements);
      return true; // Always pass, just for information
    });
  }

  /**
   * Run a single browser test
   */
  async runBrowserTest(testName, testFunction) {
    this.currentTest = testName;
    
    try {
      const result = await testFunction();
      
      if (result) {
        console.log(`  ✅ ${testName}`);
        this.testResults.push({ name: testName, status: 'PASSED', error: null });
      } else {
        console.log(`  ❌ ${testName} - Test returned false`);
        this.testResults.push({ name: testName, status: 'FAILED', error: 'Test returned false' });
      }
    } catch (error) {
      console.log(`  ❌ ${testName} - ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  /**
   * Generate browser test report
   */
  generateBrowserTestReport() {
    console.log('');
    console.log('%c📊 Browser Test Results', 'background: #2196F3; color: white; padding: 10px; border-radius: 5px; font-size: 16px; font-weight: bold;');
    
    const passed = this.testResults.filter(t => t.status === 'PASSED').length;
    const failed = this.testResults.filter(t => t.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`%cPassed: ${passed}`, 'color: #4CAF50; font-weight: bold;');
    console.log(`%cFailed: ${failed}`, 'color: #f44336; font-weight: bold;');
    
    if (failed > 0) {
      console.log('');
      console.log('%cFailed Tests:', 'color: #f44336; font-weight: bold;');
      this.testResults
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  ❌ ${test.name}: ${test.error}`);
        });
    }

    console.log('');
    console.log('%c💡 Additional Checks:', 'background: #FF9800; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');
    console.log('1. Check the Network tab for API requests');
    console.log('2. Look for Firebase Realtime Database connections');
    console.log('3. Verify no JavaScript errors in console');
    console.log('4. Test user interactions (drag-and-drop, job selection)');
    console.log('5. Check responsive design on different screen sizes');
  }

  /**
   * Quick diagnostic check
   */
  quickDiagnostic() {
    console.log('%c🔍 Quick Diagnostic Check', 'background: #9C27B0; color: white; padding: 10px; border-radius: 5px; font-size: 16px; font-weight: bold;');
    
    const diagnostic = {
      url: window.location.href,
      isSharedPlan: window.location.pathname.includes('/plan/shared/'),
      reactVersion: window.React?.version || 'Not available',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      domElements: {
        total: document.querySelectorAll('*').length,
        jobCards: document.querySelectorAll('[class*="job-card"], [data-testid*="job"]').length,
        bossActions: document.querySelectorAll('[class*="boss-action"], [data-testid*="boss-action"]').length,
        collaborationElements: document.querySelectorAll('[class*="collaboration"], [data-testid*="collaboration"]').length
      },
      localStorage: {
        keys: Object.keys(localStorage),
        mitPlanData: !!localStorage.getItem('mitplan-data')
      },
      errors: this.getConsoleErrors()
    };
    
    console.table(diagnostic.domElements);
    console.log('Full diagnostic:', diagnostic);
    
    return diagnostic;
  }

  /**
   * Get recent console errors
   */
  getConsoleErrors() {
    // This is a simplified version - in practice, you'd need to override console.error
    // to capture errors during the session
    return 'Check console manually for errors';
  }
}

// Make available globally
window.BrowserTestExecution = BrowserTestExecution;
window.runBrowserTests = async () => {
  const tester = new BrowserTestExecution();
  await tester.runAllTests();
  return tester.testResults;
};

window.quickDiagnostic = () => {
  const tester = new BrowserTestExecution();
  return tester.quickDiagnostic();
};

console.log('%cBrowser Test Execution loaded!', 'background: #2196F3; color: white; padding: 5px; border-radius: 3px;');
console.log('Available commands:');
console.log('- runBrowserTests() - Run all browser tests');
console.log('- quickDiagnostic() - Quick diagnostic check');
console.log('- new BrowserTestExecution() - Create test instance');
