/**
 * CollaborationTestUtils - Testing utilities for real-time collaboration features
 * 
 * Provides tools for:
 * - Multi-user simulation
 * - Session cleanup testing
 * - Real-time synchronization verification
 * - Connection recovery testing
 */

import OptimizedPlanSyncService from '../services/OptimizedPlanSyncService';
import SessionManagementService from '../services/SessionManagementService';
import SessionCleanupService from '../services/SessionCleanupService';

class CollaborationTestUtils {
  constructor() {
    this.testSessions = new Map(); // planId -> test session data
    this.simulatedUsers = new Map(); // userId -> user simulation data
    this.testResults = [];
  }

  /**
   * Simulate multiple users joining a collaboration session
   */
  async simulateMultipleUsers(planId, userCount = 3) {
    console.log(`🧪 Simulating ${userCount} users joining plan: ${planId}`);
    
    const users = [];
    const joinPromises = [];

    for (let i = 0; i < userCount; i++) {
      const userId = `test_user_${i}_${Date.now()}`;
      const userName = `Test User ${i + 1}`;
      
      const userInfo = {
        displayName: userName,
        userId: userId
      };

      users.push({ userId, userName, userInfo });
      
      // Simulate joining with slight delays to avoid race conditions
      const joinPromise = new Promise(resolve => {
        setTimeout(async () => {
          try {
            const result = await RealtimeCollaborationService.joinPlan(planId, userInfo);
            resolve({ userId, userName, result });
          } catch (error) {
            resolve({ userId, userName, error: error.message });
          }
        }, i * 100); // 100ms delay between joins
      });

      joinPromises.push(joinPromise);
    }

    const results = await Promise.all(joinPromises);
    
    this.testSessions.set(planId, {
      users,
      joinResults: results,
      startTime: Date.now()
    });

    console.log(`✅ Multi-user simulation complete for plan: ${planId}`, results);
    return results;
  }

  /**
   * Test session cleanup by simulating all users leaving
   */
  async testSessionCleanup(planId, timeoutMs = 15000) {
    console.log(`🧪 Testing session cleanup for plan: ${planId}`);
    
    const testSession = this.testSessions.get(planId);
    if (!testSession) {
      throw new Error('No test session found. Run simulateMultipleUsers first.');
    }

    // Start monitoring cleanup
    await SessionCleanupService.startMonitoring(planId);

    // Simulate all users leaving
    const leavePromises = testSession.users.map(async ({ userId }) => {
      try {
        await OptimizedPlanSyncService.cleanup(planId);
        return { userId, success: true };
      } catch (error) {
        return { userId, success: false, error: error.message };
      }
    });

    const leaveResults = await Promise.all(leavePromises);
    console.log(`👋 All users left plan: ${planId}`, leaveResults);

    // Wait for cleanup to occur
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        try {
          const status = await RealtimeCollaborationService.getCollaborationStatus(planId);
          const elapsed = Date.now() - startTime;

          if (!status.exists || elapsed > timeoutMs) {
            clearInterval(checkInterval);
            
            const result = {
              cleanedUp: !status.exists,
              elapsed,
              timedOut: elapsed > timeoutMs,
              finalStatus: status,
              leaveResults
            };

            console.log(`🧹 Session cleanup test complete:`, result);
            this.testResults.push({
              type: 'session_cleanup',
              planId,
              result,
              timestamp: Date.now()
            });

            resolve(result);
          }
        } catch (error) {
          clearInterval(checkInterval);
          resolve({
            cleanedUp: false,
            error: error.message,
            elapsed: Date.now() - startTime,
            leaveResults
          });
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Test real-time synchronization of plan updates
   */
  async testRealTimeSync(planId, updateCount = 5) {
    console.log(`🧪 Testing real-time sync for plan: ${planId} with ${updateCount} updates`);
    
    const testSession = this.testSessions.get(planId);
    if (!testSession || testSession.users.length < 2) {
      throw new Error('Need at least 2 users for sync testing. Run simulateMultipleUsers first.');
    }

    const updates = [];
    const receivedUpdates = new Map(); // userId -> received updates

    // Set up listeners for each user
    const listeners = testSession.users.map(({ userId }) => {
      receivedUpdates.set(userId, []);
      
      return RealtimeCollaborationService.subscribeToPlanUpdates(planId, (planUpdates) => {
        const userUpdates = receivedUpdates.get(userId) || [];
        userUpdates.push(...planUpdates);
        receivedUpdates.set(userId, userUpdates);
      });
    });

    // Send updates from different users
    for (let i = 0; i < updateCount; i++) {
      const senderIndex = i % testSession.users.length;
      const sender = testSession.users[senderIndex];
      
      const updateData = {
        type: 'test_update',
        data: {
          updateId: `test_${i}`,
          timestamp: Date.now(),
          sender: sender.userId,
          content: `Test update ${i + 1}`
        }
      };

      try {
        await RealtimeCollaborationService.broadcastPlanUpdate(
          planId,
          updateData,
          sender.userId,
          sender.userName
        );
        
        updates.push(updateData);
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to send update ${i}:`, error);
      }
    }

    // Wait for all updates to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clean up listeners
    listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    // Analyze results
    const syncResults = {
      totalUpdates: updates.length,
      userResults: {}
    };

    receivedUpdates.forEach((userUpdates, userId) => {
      syncResults.userResults[userId] = {
        received: userUpdates.length,
        percentage: (userUpdates.length / updates.length) * 100,
        updates: userUpdates
      };
    });

    console.log(`📡 Real-time sync test complete:`, syncResults);
    this.testResults.push({
      type: 'realtime_sync',
      planId,
      result: syncResults,
      timestamp: Date.now()
    });

    return syncResults;
  }

  /**
   * Test connection recovery scenarios
   */
  async testConnectionRecovery(planId) {
    console.log(`🧪 Testing connection recovery for plan: ${planId}`);
    
    const testSession = this.testSessions.get(planId);
    if (!testSession) {
      throw new Error('No test session found. Run simulateMultipleUsers first.');
    }

    const results = {
      healthChecks: [],
      reconnectionTests: []
    };

    // Test connection health
    try {
      const healthResult = await RealtimeCollaborationService.checkConnectionHealth(planId);
      results.healthChecks.push({
        timestamp: Date.now(),
        result: healthResult
      });
    } catch (error) {
      results.healthChecks.push({
        timestamp: Date.now(),
        error: error.message
      });
    }

    // Test session health
    try {
      const sessionHealth = await SessionManagementService.getSessionHealth(planId);
      results.sessionHealth = sessionHealth;
    } catch (error) {
      results.sessionHealth = { error: error.message };
    }

    console.log(`🔄 Connection recovery test complete:`, results);
    this.testResults.push({
      type: 'connection_recovery',
      planId,
      result: results,
      timestamp: Date.now()
    });

    return results;
  }

  /**
   * Run comprehensive collaboration test suite
   */
  async runFullTestSuite(planId, options = {}) {
    const {
      userCount = 3,
      updateCount = 5,
      cleanupTimeout = 15000
    } = options;

    console.log(`🧪 Running full collaboration test suite for plan: ${planId}`);
    
    const suiteResults = {
      planId,
      startTime: Date.now(),
      tests: {}
    };

    try {
      // Test 1: Multi-user simulation
      console.log('🧪 Test 1: Multi-user simulation');
      suiteResults.tests.multiUser = await this.simulateMultipleUsers(planId, userCount);

      // Test 2: Real-time synchronization
      console.log('🧪 Test 2: Real-time synchronization');
      suiteResults.tests.realTimeSync = await this.testRealTimeSync(planId, updateCount);

      // Test 3: Connection recovery
      console.log('🧪 Test 3: Connection recovery');
      suiteResults.tests.connectionRecovery = await this.testConnectionRecovery(planId);

      // Test 4: Session cleanup
      console.log('🧪 Test 4: Session cleanup');
      suiteResults.tests.sessionCleanup = await this.testSessionCleanup(planId, cleanupTimeout);

      suiteResults.endTime = Date.now();
      suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
      suiteResults.success = true;

    } catch (error) {
      suiteResults.error = error.message;
      suiteResults.success = false;
      suiteResults.endTime = Date.now();
      suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
    }

    console.log(`✅ Full test suite complete:`, suiteResults);
    this.testResults.push({
      type: 'full_suite',
      planId,
      result: suiteResults,
      timestamp: Date.now()
    });

    return suiteResults;
  }

  /**
   * Get all test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Clear test data
   */
  clearTestData() {
    this.testSessions.clear();
    this.simulatedUsers.clear();
    this.testResults = [];
    console.log('🧪 Test data cleared');
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const report = {
      totalTests: this.testResults.length,
      testTypes: {},
      summary: {
        passed: 0,
        failed: 0,
        duration: 0
      }
    };

    this.testResults.forEach(test => {
      const type = test.type;
      if (!report.testTypes[type]) {
        report.testTypes[type] = { count: 0, passed: 0, failed: 0 };
      }
      
      report.testTypes[type].count++;
      
      if (test.result.success !== false) {
        report.testTypes[type].passed++;
        report.summary.passed++;
      } else {
        report.testTypes[type].failed++;
        report.summary.failed++;
      }

      if (test.result.duration) {
        report.summary.duration += test.result.duration;
      }
    });

    return report;
  }
}

export default new CollaborationTestUtils();
