import { r, getConnection, releaseConnection } from '../config/db.cjs';

class Version {
  /**
   * Get versions for a plan
   * @param {string} planId - Plan ID
   * @returns {Array} Array of versions
   */
  static async getVersions(planId) {
    const connection = await getConnection();
    try {
      const versions = await r.table('versions')
        .getAll(planId, { index: 'planId' })
        .orderBy(r.desc('version'))
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return versions;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Get a specific version
   * @param {string} planId - Plan ID
   * @param {number} version - Version number
   * @returns {Object|null} Version or null if not found
   */
  static async getVersion(planId, version) {
    const connection = await getConnection();
    try {
      const versions = await r.table('versions')
        .getAll(planId, { index: 'planId' })
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
   * Get the latest version for a plan
   * @param {string} planId - Plan ID
   * @returns {Object|null} Latest version or null if not found
   */
  static async getLatestVersion(planId) {
    const connection = await getConnection();
    try {
      const versions = await r.table('versions')
        .getAll(planId, { index: 'planId' })
        .orderBy(r.desc('version'))
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return versions.length > 0 ? versions[0] : null;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Compare two versions
   * @param {string} planId - Plan ID
   * @param {number} version1 - First version number
   * @param {number} version2 - Second version number
   * @returns {Object} Differences between versions
   */
  static async compareVersions(planId, version1, version2) {
    const v1 = await this.getVersion(planId, version1);
    const v2 = await this.getVersion(planId, version2);
    
    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }
    
    // Compare assignments
    const assignments1 = v1.data.assignments || {};
    const assignments2 = v2.data.assignments || {};
    
    const differences = {
      added: {},
      removed: {},
      modified: {}
    };
    
    // Find added and modified assignments
    for (const actionId in assignments2) {
      if (!assignments1[actionId]) {
        differences.added[actionId] = assignments2[actionId];
      } else {
        // Check if assignments for this action have changed
        const action1 = JSON.stringify(assignments1[actionId].sort((a, b) => a.id.localeCompare(b.id)));
        const action2 = JSON.stringify(assignments2[actionId].sort((a, b) => a.id.localeCompare(b.id)));
        
        if (action1 !== action2) {
          differences.modified[actionId] = {
            from: assignments1[actionId],
            to: assignments2[actionId]
          };
        }
      }
    }
    
    // Find removed assignments
    for (const actionId in assignments1) {
      if (!assignments2[actionId]) {
        differences.removed[actionId] = assignments1[actionId];
      }
    }
    
    return {
      version1: {
        version: v1.version,
        createdAt: v1.createdAt,
        userId: v1.userId
      },
      version2: {
        version: v2.version,
        createdAt: v2.createdAt,
        userId: v2.userId
      },
      differences
    };
  }
}

export default Version;