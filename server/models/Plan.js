import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';

class Plan {
  /**
   * Create a new mitigation plan
   * @param {Object} planData - Plan data
   * @returns {Object} Created plan
   */
  static async create(planData) {
    const connection = await getConnection();
    try {
      // Create plan object
      const plan = {
        id: uuidv4(),
        title: planData.title || 'Untitled Plan',
        description: planData.description || '',
        bossId: planData.bossId,
        selectedJobs: planData.selectedJobs || [],
        assignments: planData.assignments || {},
        userId: planData.userId,
        isPublic: planData.isPublic || false,
        sharedWith: planData.sharedWith || [],
        permissions: planData.permissions || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      
      // Insert plan into database
      const result = await r.table('plans').insert(plan).run(connection);
      
      if (result.inserted !== 1) {
        throw new Error('Failed to create plan');
      }
      
      // Create initial version
      await r.table('versions').insert({
        id: uuidv4(),
        planId: plan.id,
        version: 1,
        data: plan,
        userId: planData.userId,
        createdAt: new Date()
      }).run(connection);
      
      return plan;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find a plan by ID
   * @param {string} id - Plan ID
   * @returns {Object|null} Plan or null if not found
   */
  static async findById(id) {
    const connection = await getConnection();
    try {
      const plan = await r.table('plans').get(id).run(connection);
      return plan || null;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find plans by user ID
   * @param {string} userId - User ID
   * @returns {Array} Array of plans
   */
  static async findByUserId(userId) {
    const connection = await getConnection();
    try {
      const plans = await r.table('plans')
        .getAll(userId, { index: 'userId' })
        .orderBy(r.desc('updatedAt'))
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return plans;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find plans shared with a user
   * @param {string} userId - User ID
   * @returns {Array} Array of plans
   */
  static async findSharedWithUser(userId) {
    const connection = await getConnection();
    try {
      const plans = await r.table('plans')
        .getAll(userId, { index: 'sharedWith' })
        .orderBy(r.desc('updatedAt'))
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return plans;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find public plans
   * @returns {Array} Array of public plans
   */
  static async findPublicPlans() {
    const connection = await getConnection();
    try {
      const plans = await r.table('plans')
        .filter({ isPublic: true })
        .orderBy(r.desc('updatedAt'))
        .limit(100)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return plans;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Update a plan
   * @param {string} id - Plan ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated plan
   */
  static async update(id, updateData, userId) {
    const connection = await getConnection();
    try {
      // Get current plan
      const currentPlan = await r.table('plans').get(id).run(connection);
      
      if (!currentPlan) {
        throw new Error('Plan not found');
      }
      
      // Check if user has permission to update
      if (currentPlan.userId !== userId && 
          !(currentPlan.sharedWith.includes(userId) && 
            currentPlan.permissions[userId]?.canEdit)) {
        throw new Error('You do not have permission to update this plan');
      }
      
      // Update plan
      updateData.updatedAt = new Date();
      updateData.version = currentPlan.version + 1;
      
      const result = await r.table('plans')
        .get(id)
        .update(updateData)
        .run(connection);
      
      if (result.replaced !== 1 && result.unchanged !== 1) {
        throw new Error('Failed to update plan');
      }
      
      // Get updated plan
      const updatedPlan = await r.table('plans').get(id).run(connection);
      
      // Create new version
      await r.table('versions').insert({
        id: uuidv4(),
        planId: id,
        version: updatedPlan.version,
        data: updatedPlan,
        userId: userId,
        createdAt: new Date()
      }).run(connection);
      
      return updatedPlan;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Delete a plan
   * @param {string} id - Plan ID
   * @param {string} userId - User ID making the deletion
   * @returns {boolean} True if deleted, false otherwise
   */
  static async delete(id, userId) {
    const connection = await getConnection();
    try {
      // Get current plan
      const currentPlan = await r.table('plans').get(id).run(connection);
      
      if (!currentPlan) {
        throw new Error('Plan not found');
      }
      
      // Check if user has permission to delete
      if (currentPlan.userId !== userId) {
        throw new Error('You do not have permission to delete this plan');
      }
      
      // Delete plan
      const result = await r.table('plans').get(id).delete().run(connection);
      
      // Delete all versions
      await r.table('versions')
        .getAll(id, { index: 'planId' })
        .delete()
        .run(connection);
      
      return result.deleted === 1;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Share a plan with a user
   * @param {string} id - Plan ID
   * @param {string} ownerId - Owner user ID
   * @param {string} userId - User ID to share with
   * @param {Object} permissions - Permissions for the user
   * @returns {Object} Updated plan
   */
  static async sharePlan(id, ownerId, userId, permissions) {
    const connection = await getConnection();
    try {
      // Get current plan
      const currentPlan = await r.table('plans').get(id).run(connection);
      
      if (!currentPlan) {
        throw new Error('Plan not found');
      }
      
      // Check if user has permission to share
      if (currentPlan.userId !== ownerId) {
        throw new Error('You do not have permission to share this plan');
      }
      
      // Update shared users and permissions
      const sharedWith = [...new Set([...currentPlan.sharedWith, userId])];
      const updatedPermissions = {
        ...currentPlan.permissions,
        [userId]: permissions
      };
      
      // Update plan
      const result = await r.table('plans')
        .get(id)
        .update({
          sharedWith,
          permissions: updatedPermissions,
          updatedAt: new Date()
        })
        .run(connection);
      
      if (result.replaced !== 1 && result.unchanged !== 1) {
        throw new Error('Failed to share plan');
      }
      
      // Get updated plan
      return await r.table('plans').get(id).run(connection);
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Remove sharing for a user
   * @param {string} id - Plan ID
   * @param {string} ownerId - Owner user ID
   * @param {string} userId - User ID to remove sharing for
   * @returns {Object} Updated plan
   */
  static async removeSharing(id, ownerId, userId) {
    const connection = await getConnection();
    try {
      // Get current plan
      const currentPlan = await r.table('plans').get(id).run(connection);
      
      if (!currentPlan) {
        throw new Error('Plan not found');
      }
      
      // Check if user has permission to modify sharing
      if (currentPlan.userId !== ownerId) {
        throw new Error('You do not have permission to modify sharing for this plan');
      }
      
      // Update shared users and permissions
      const sharedWith = currentPlan.sharedWith.filter(id => id !== userId);
      const permissions = { ...currentPlan.permissions };
      delete permissions[userId];
      
      // Update plan
      const result = await r.table('plans')
        .get(id)
        .update({
          sharedWith,
          permissions,
          updatedAt: new Date()
        })
        .run(connection);
      
      if (result.replaced !== 1 && result.unchanged !== 1) {
        throw new Error('Failed to remove sharing');
      }
      
      // Get updated plan
      return await r.table('plans').get(id).run(connection);
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Get plan versions
   * @param {string} id - Plan ID
   * @returns {Array} Array of versions
   */
  static async getVersions(id) {
    const connection = await getConnection();
    try {
      const versions = await r.table('versions')
        .getAll(id, { index: 'planId' })
        .orderBy(r.desc('version'))
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return versions;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Get a specific version of a plan
   * @param {string} id - Plan ID
   * @param {number} version - Version number
   * @returns {Object|null} Version or null if not found
   */
  static async getVersion(id, version) {
    const connection = await getConnection();
    try {
      const versions = await r.table('versions')
        .getAll(id, { index: 'planId' })
        .filter({ version: parseInt(version) })
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return versions.length > 0 ? versions[0] : null;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Create a shareable link for a plan
   * @param {string} id - Plan ID
   * @param {string} userId - User ID
   * @param {Object} options - Options for the link
   * @returns {Object} Link data
   */
  static async createShareableLink(id, userId, options = {}) {
    const connection = await getConnection();
    try {
      // Get current plan
      const currentPlan = await r.table('plans').get(id).run(connection);
      
      if (!currentPlan) {
        throw new Error('Plan not found');
      }
      
      // Check if user has permission to create link
      if (currentPlan.userId !== userId) {
        throw new Error('You do not have permission to create a shareable link for this plan');
      }
      
      // Generate link token
      const linkToken = uuidv4();
      
      // Update plan with link token
      await r.table('plans')
        .get(id)
        .update({
          shareableLink: {
            token: linkToken,
            createdAt: new Date(),
            expiresAt: options.expiresAt || null,
            isViewOnly: options.isViewOnly || false
          },
          updatedAt: new Date()
        })
        .run(connection);
      
      return {
        token: linkToken,
        url: `${process.env.CLIENT_URL}/share/${linkToken}`
      };
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find a plan by shareable link token
   * @param {string} token - Link token
   * @returns {Object|null} Plan or null if not found or expired
   */
  static async findByShareableLink(token) {
    const connection = await getConnection();
    try {
      const plans = await r.table('plans')
        .filter(r.row('shareableLink')('token').eq(token))
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      if (plans.length === 0) {
        return null;
      }
      
      const plan = plans[0];
      
      // Check if link is expired
      if (plan.shareableLink.expiresAt && new Date(plan.shareableLink.expiresAt) < new Date()) {
        return null;
      }
      
      return plan;
    } finally {
      releaseConnection(connection);
    }
  }
}

export default Plan;