import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';

class Operation {
  /**
   * Create a new operation
   * @param {Object} operationData - Operation data
   * @returns {Object} Created operation
   */
  static async create(operationData) {
    const connection = await getConnection();
    try {
      // Create operation object
      const operation = {
        id: uuidv4(),
        planId: operationData.planId,
        userId: operationData.userId,
        username: operationData.username,
        clientId: operationData.clientId,
        type: operationData.type,
        data: operationData.data,
        timestamp: new Date(),
        version: operationData.version
      };
      
      // Insert operation into database
      const result = await r.table('operations').insert(operation).run(connection);
      
      if (result.inserted !== 1) {
        throw new Error('Failed to create operation');
      }
      
      return operation;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Get operations for a plan since a specific version
   * @param {string} planId - Plan ID
   * @param {number} sinceVersion - Version to get operations since
   * @returns {Array} Array of operations
   */
  static async getOperationsSince(planId, sinceVersion) {
    const connection = await getConnection();
    try {
      const operations = await r.table('operations')
        .getAll(planId, { index: 'planId' })
        .filter(r.row('version').gt(sinceVersion))
        .orderBy('timestamp')
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return operations;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Get the latest operations for a plan
   * @param {string} planId - Plan ID
   * @param {number} limit - Maximum number of operations to return
   * @returns {Array} Array of operations
   */
  static async getLatestOperations(planId, limit = 50) {
    const connection = await getConnection();
    try {
      const operations = await r.table('operations')
        .getAll(planId, { index: 'planId' })
        .orderBy(r.desc('timestamp'))
        .limit(limit)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return operations.reverse(); // Return in chronological order
    } finally {
      releaseConnection(connection);
    }
  }
}

export default Operation;
