/**
 * Test Data Service for Real-Time Collaboration Testing
 * Creates and manages actual Firebase test data for collaboration tests
 */

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { ref, set, remove } from 'firebase/database';
import { db, realtimeDb, auth } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

class TestDataService {
  constructor() {
    this.testPlans = new Map();
    this.testUsers = new Map();
    this.cleanupQueue = [];
  }

  /**
   * Create a test plan in Firebase for collaboration testing
   */
  async createTestPlan(planName = null, options = {}) {
    try {
      const testPlanId = `test-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const testUserId = options.userId || `test-user-${Date.now()}`;
      
      const planData = {
        id: testPlanId,
        name: planName || `Test Plan ${Date.now()}`,
        description: 'Test plan for collaboration testing',
        bossId: options.bossId || 'ketuduke',
        selectedJobs: options.selectedJobs || {
          tank: ['PLD', 'WAR'],
          healer: ['WHM', 'SCH'],
          dps: ['BLM', 'DRG']
        },
        assignments: options.assignments || {
          'hydrofall': [
            {
              id: 'test-assignment-1',
              abilityId: 'rampart',
              jobId: 'PLD',
              tank: 'MT',
              timestamp: Date.now()
            }
          ]
        },
        tankPositions: options.tankPositions || {
          mainTank: 'PLD',
          offTank: 'WAR'
        },
        userId: testUserId,
        isPublic: true,
        isShared: true,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        accessedAt: serverTimestamp(),
        // Test metadata
        isTestData: true,
        testCreatedAt: new Date().toISOString(),
        testId: uuidv4()
      };

      // Create the plan in Firestore
      await setDoc(doc(db, 'plans', testPlanId), planData);

      // Initialize collaboration data in Realtime Database
      await this.initializeCollaborationData(testPlanId);

      // Track for cleanup
      this.testPlans.set(testPlanId, {
        ...planData,
        createdAt: new Date()
      });
      this.cleanupQueue.push({ type: 'plan', id: testPlanId });

      console.log(`Created test plan: ${testPlanId}`);

      return {
        success: true,
        planId: testPlanId,
        planData,
        shareUrl: `${window.location.origin}/plan/shared/${testPlanId}`,
        message: 'Test plan created successfully'
      };
    } catch (error) {
      console.error('Create test plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Initialize collaboration data structure in Realtime Database
   */
  async initializeCollaborationData(planId) {
    try {
      const collaborationRef = ref(realtimeDb, `collaboration/${planId}`);
      
      const collaborationData = {
        session: {
          id: `session-${Date.now()}`,
          ownerId: `test-user-${Date.now()}`,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          currentVersion: 1,
          isTestSession: true
        },
        activeUsers: {},
        selections: {},
        planUpdates: {},
        sessionParticipants: {},
        sessionChanges: {},
        sessionVersions: {}
      };

      await set(collaborationRef, collaborationData);
      
      // Track for cleanup
      this.cleanupQueue.push({ type: 'collaboration', id: planId });

      console.log(`Initialized collaboration data for plan: ${planId}`);
    } catch (error) {
      console.error('Initialize collaboration data error:', error);
      throw error;
    }
  }

  /**
   * Create a test user for collaboration testing
   */
  async createTestUser(displayName = null, options = {}) {
    try {
      const testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const userData = {
        uid: testUserId,
        email: options.email || `${testUserId}@test.mitplan.dev`,
        displayName: displayName || `Test User ${Date.now()}`,
        profilePictureBase64: null,
        profilePictureUrl: null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        emailVerified: true,
        preferences: {
          theme: 'dark',
          defaultBoss: 'ketuduke',
          notifications: true
        },
        // Test metadata
        isTestUser: true,
        testCreatedAt: new Date().toISOString(),
        testId: uuidv4()
      };

      // Create user document in Firestore
      await setDoc(doc(db, 'users', testUserId), userData);

      // Track for cleanup
      this.testUsers.set(testUserId, {
        ...userData,
        createdAt: new Date()
      });
      this.cleanupQueue.push({ type: 'user', id: testUserId });

      console.log(`Created test user: ${testUserId}`);

      return {
        success: true,
        userId: testUserId,
        userData,
        message: 'Test user created successfully'
      };
    } catch (error) {
      console.error('Create test user error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get a test plan by ID
   */
  async getTestPlan(planId) {
    try {
      const planDoc = await getDoc(doc(db, 'plans', planId));
      
      if (!planDoc.exists()) {
        return {
          success: false,
          message: 'Test plan not found'
        };
      }

      const planData = planDoc.data();
      
      return {
        success: true,
        plan: {
          id: planDoc.id,
          ...planData,
          createdAt: planData.createdAt?.toDate(),
          updatedAt: planData.updatedAt?.toDate(),
          accessedAt: planData.accessedAt?.toDate()
        }
      };
    } catch (error) {
      console.error('Get test plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update a test plan with new data
   */
  async updateTestPlan(planId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        version: (updates.version || 1) + 1
      };

      await setDoc(doc(db, 'plans', planId), updateData, { merge: true });

      console.log(`Updated test plan: ${planId}`);

      return {
        success: true,
        planId,
        updates: updateData,
        message: 'Test plan updated successfully'
      };
    } catch (error) {
      console.error('Update test plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Create multiple test plans for multi-user testing
   */
  async createMultipleTestPlans(count = 3, baseOptions = {}) {
    const plans = [];
    
    for (let i = 0; i < count; i++) {
      const planName = `Multi-User Test Plan ${i + 1}`;
      const options = {
        ...baseOptions,
        userId: `test-user-${Date.now()}-${i}`,
        bossId: ['ketuduke', 'lala', 'statice'][i % 3]
      };
      
      const result = await this.createTestPlan(planName, options);
      if (result.success) {
        plans.push(result);
      }
    }

    return {
      success: true,
      plans,
      count: plans.length,
      message: `Created ${plans.length} test plans`
    };
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData() {
    console.log(`Starting cleanup of ${this.cleanupQueue.length} test items...`);
    
    const batch = writeBatch(db);
    let cleanedCount = 0;

    try {
      // Clean up Firestore documents
      for (const item of this.cleanupQueue) {
        if (item.type === 'plan') {
          batch.delete(doc(db, 'plans', item.id));
          cleanedCount++;
        } else if (item.type === 'user') {
          batch.delete(doc(db, 'users', item.id));
          cleanedCount++;
        }
      }

      // Commit Firestore batch
      if (cleanedCount > 0) {
        await batch.commit();
      }

      // Clean up Realtime Database collaboration data
      for (const item of this.cleanupQueue) {
        if (item.type === 'collaboration') {
          try {
            await remove(ref(realtimeDb, `collaboration/${item.id}`));
            cleanedCount++;
          } catch (error) {
            console.warn(`Failed to clean collaboration data for ${item.id}:`, error);
          }
        }
      }

      // Clear tracking
      this.testPlans.clear();
      this.testUsers.clear();
      this.cleanupQueue = [];

      console.log(`Cleaned up ${cleanedCount} test items successfully`);

      return {
        success: true,
        cleanedCount,
        message: 'Test data cleanup completed'
      };
    } catch (error) {
      console.error('Cleanup test data error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Clean up test data older than specified age
   */
  async cleanupOldTestData(maxAgeMinutes = 60) {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
      let cleanedCount = 0;

      // Clean up old test plans
      for (const [planId, planData] of this.testPlans.entries()) {
        if (planData.createdAt < cutoffTime) {
          try {
            await deleteDoc(doc(db, 'plans', planId));
            await remove(ref(realtimeDb, `collaboration/${planId}`));
            this.testPlans.delete(planId);
            cleanedCount++;
          } catch (error) {
            console.warn(`Failed to clean old test plan ${planId}:`, error);
          }
        }
      }

      // Clean up old test users
      for (const [userId, userData] of this.testUsers.entries()) {
        if (userData.createdAt < cutoffTime) {
          try {
            await deleteDoc(doc(db, 'users', userId));
            this.testUsers.delete(userId);
            cleanedCount++;
          } catch (error) {
            console.warn(`Failed to clean old test user ${userId}:`, error);
          }
        }
      }

      console.log(`Cleaned up ${cleanedCount} old test items`);

      return {
        success: true,
        cleanedCount,
        message: 'Old test data cleanup completed'
      };
    } catch (error) {
      console.error('Cleanup old test data error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get statistics about test data
   */
  getTestDataStats() {
    return {
      testPlans: this.testPlans.size,
      testUsers: this.testUsers.size,
      cleanupQueue: this.cleanupQueue.length,
      oldestPlan: this.testPlans.size > 0 ? 
        Math.min(...Array.from(this.testPlans.values()).map(p => p.createdAt.getTime())) : null,
      newestPlan: this.testPlans.size > 0 ? 
        Math.max(...Array.from(this.testPlans.values()).map(p => p.createdAt.getTime())) : null
    };
  }
}

// Export singleton instance
export default new TestDataService();
