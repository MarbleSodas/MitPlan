/**
 * Firestore Service
 *
 * Provides data operations using Firestore
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class FirestoreService {
  constructor() {
    this.db = db;
    this.auth = auth;
  }

  /**
   * Create a new plan
   */
  async createPlan(planData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to create plans');
      }

      const plan = {
        userId: user.uid,
        name: planData.name,
        description: planData.description || '',
        bossId: planData.bossId,
        selectedJobs: planData.selectedJobs || [],
        assignments: planData.assignments || {},
        tankPositions: planData.tankPositions || {},
        isPublic: false,
        isDeleted: false,
        folderId: planData.folderId || null,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        accessedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(this.db, 'plans'), plan);

      return {
        success: true,
        plan: {
          id: docRef.id,
          ...plan,
          createdAt: new Date(),
          updatedAt: new Date(),
          accessedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Create plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get a specific plan by ID
   * Supports both authenticated and unauthenticated access to public plans
   */
  async getPlan(planId) {
    try {
      const planDoc = await getDoc(doc(this.db, 'plans', planId));

      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data();
      const user = this.auth.currentUser;

      // Check access permissions
      // Allow access if:
      // 1. Plan is public (for shared plans)
      // 2. User is authenticated and owns the plan
      // 3. Plan is shared (isShared flag for collaborative editing)
      if (!planData.isPublic && !planData.isShared && (!user || planData.userId !== user.uid)) {
        throw new Error('Access denied');
      }

      // Update accessed time if user owns the plan (only for authenticated users)
      if (user && planData.userId === user.uid) {
        try {
          await updateDoc(doc(this.db, 'plans', planId), {
            accessedAt: serverTimestamp()
          });
        } catch (updateError) {
          // Don't fail the entire request if access time update fails
          console.warn('Failed to update access time:', updateError);
        }
      }

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
      console.error('Get plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get all plans for the current user
   */
  async getUserPlans() {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to get plans');
      }

      const q = query(
        collection(this.db, 'plans'),
        where('userId', '==', user.uid),
        where('isDeleted', '==', false),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const plans = [];

      querySnapshot.forEach((doc) => {
        const planData = doc.data();
        plans.push({
          id: doc.id,
          ...planData,
          createdAt: planData.createdAt?.toDate(),
          updatedAt: planData.updatedAt?.toDate(),
          accessedAt: planData.accessedAt?.toDate()
        });
      });

      return {
        success: true,
        plans
      };
    } catch (error) {
      console.error('Get user plans error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update an existing plan
   */
  async updatePlan(planId, updateData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to update plans');
      }

      // Get current plan to check ownership
      const planDoc = await getDoc(doc(this.db, 'plans', planId));
      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data();

      // Check if user owns the plan or if plan is public and user is authenticated
      if (planData.userId !== user.uid && !planData.isPublic) {
        throw new Error('Access denied');
      }

      // Prepare update data
      const updates = {
        ...updateData,
        updatedAt: serverTimestamp(),
        version: (planData.version || 1) + 1
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      await updateDoc(doc(this.db, 'plans', planId), updates);

      return {
        success: true,
        plan: {
          id: planId,
          ...planData,
          ...updates,
          updatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Update plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Delete a plan (soft delete)
   */
  async deletePlan(planId) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to delete plans');
      }

      // Get current plan to check ownership
      const planDoc = await getDoc(doc(this.db, 'plans', planId));
      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data();
      if (planData.userId !== user.uid) {
        throw new Error('Access denied');
      }

      await updateDoc(doc(this.db, 'plans', planId), {
        isDeleted: true,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Plan deleted successfully'
      };
    } catch (error) {
      console.error('Delete plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Make a plan public (for sharing) and start collaboration session
   */
  async sharePlan(planId) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to share plans');
      }

      // Get current plan to check ownership
      const planDoc = await getDoc(doc(this.db, 'plans', planId));
      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data();
      if (planData.userId !== user.uid) {
        throw new Error('Access denied');
      }

      // Update plan to be public and mark as shared
      await updateDoc(doc(this.db, 'plans', planId), {
        isPublic: true,
        isShared: true,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Import SessionManagementService dynamically to avoid circular imports
      const { default: SessionManagementService } = await import('./SessionManagementService');

      // Start collaboration session automatically
      const sessionResult = await SessionManagementService.startSession(planId, planData);

      const shareUrl = `${window.location.origin}/plan/shared/${planId}`;

      return {
        success: true,
        shareUrl,
        sessionId: sessionResult.success ? sessionResult.sessionId : null,
        collaborationEnabled: sessionResult.success,
        message: sessionResult.success
          ? 'Plan shared successfully with real-time collaboration enabled!'
          : 'Plan shared successfully (collaboration session failed to start)'
      };
    } catch (error) {
      console.error('Share plan error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get public plans (for discovery)
   */
  async getPublicPlans(limitCount = 20) {
    try {
      const q = query(
        collection(this.db, 'plans'),
        where('isPublic', '==', true),
        where('isDeleted', '==', false),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const plans = [];

      querySnapshot.forEach((doc) => {
        const planData = doc.data();
        plans.push({
          id: doc.id,
          ...planData,
          createdAt: planData.createdAt?.toDate(),
          updatedAt: planData.updatedAt?.toDate(),
          accessedAt: planData.accessedAt?.toDate()
        });
      });

      return {
        success: true,
        plans
      };
    } catch (error) {
      console.error('Get public plans error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Listen to real-time updates for a plan
   */
  subscribeToPlan(planId, callback) {
    const unsubscribe = onSnapshot(
      doc(this.db, 'plans', planId),
      (doc) => {
        if (doc.exists()) {
          const planData = doc.data();
          callback({
            success: true,
            plan: {
              id: doc.id,
              ...planData,
              createdAt: planData.createdAt?.toDate(),
              updatedAt: planData.updatedAt?.toDate(),
              accessedAt: planData.accessedAt?.toDate()
            }
          });
        } else {
          callback({
            success: false,
            message: 'Plan not found'
          });
        }
      },
      (error) => {
        console.error('Plan subscription error:', error);
        callback({
          success: false,
          message: error.message
        });
      }
    );

    return unsubscribe;
  }

  /**
   * Listen to real-time updates for user plans
   */
  subscribeToUserPlans(callback) {
    const user = this.auth.currentUser;
    if (!user) {
      callback({
        success: false,
        message: 'User must be authenticated'
      });
      return () => {};
    }

    const q = query(
      collection(this.db, 'plans'),
      where('userId', '==', user.uid),
      where('isDeleted', '==', false),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const plans = [];
        querySnapshot.forEach((doc) => {
          const planData = doc.data();
          plans.push({
            id: doc.id,
            ...planData,
            createdAt: planData.createdAt?.toDate(),
            updatedAt: planData.updatedAt?.toDate(),
            accessedAt: planData.accessedAt?.toDate()
          });
        });

        callback({
          success: true,
          plans
        });
      },
      (error) => {
        console.error('User plans subscription error:', error);
        callback({
          success: false,
          message: error.message
        });
      }
    );

    return unsubscribe;
  }

  /**
   * Save session changes back to the main plan
   */
  async saveSessionChangesToPlan(planId, sessionData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to save session changes');
      }

      // Get current plan to check ownership or public access
      const planDoc = await getDoc(doc(this.db, 'plans', planId));
      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data();

      // Check if user owns the plan or if plan is public and user is authenticated
      if (planData.userId !== user.uid && !planData.isPublic) {
        throw new Error('Access denied');
      }

      // Update plan with session data
      const updates = {
        assignments: sessionData.assignments || planData.assignments,
        selectedJobs: sessionData.selectedJobs || planData.selectedJobs,
        tankPositions: sessionData.tankPositions || planData.tankPositions,
        updatedAt: serverTimestamp(),
        version: (planData.version || 1) + 1,
        lastSessionId: sessionData.sessionId,
        lastSessionEndedAt: serverTimestamp()
      };

      await updateDoc(doc(this.db, 'plans', planId), updates);

      return {
        success: true,
        plan: {
          id: planId,
          ...planData,
          ...updates
        },
        message: 'Session changes saved to plan successfully'
      };
    } catch (error) {
      console.error('Save session changes error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Create a session backup of the plan
   */
  async createSessionBackup(planId, sessionId, planData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to create session backup');
      }

      const backupData = {
        planId,
        sessionId,
        planData,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      };

      const backupRef = doc(this.db, 'sessionBackups', `${planId}_${sessionId}`);
      await setDoc(backupRef, backupData);

      return {
        success: true,
        backupId: backupRef.id,
        message: 'Session backup created successfully'
      };
    } catch (error) {
      console.error('Create session backup error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Batch operations for multiple plans
   */
  async batchUpdatePlans(operations) {
    try {
      const batch = writeBatch(this.db);

      operations.forEach(({ type, planId, data }) => {
        const planRef = doc(this.db, 'plans', planId);

        switch (type) {
          case 'update':
            batch.update(planRef, {
              ...data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'delete':
            batch.update(planRef, {
              isDeleted: true,
              updatedAt: serverTimestamp()
            });
            break;
          default:
            throw new Error(`Unknown operation type: ${type}`);
        }
      });

      await batch.commit();

      return {
        success: true,
        message: 'Batch operations completed successfully'
      };
    } catch (error) {
      console.error('Batch update error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default new FirestoreService();
