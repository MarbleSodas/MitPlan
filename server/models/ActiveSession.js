import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';

class ActiveSession {
  /**
   * Create a new active session
   * @param {Object} sessionData - Session data
   * @returns {Object} Created session
   */
  static async create(sessionData) {
    const connection = await getConnection();
    try {
      // Create session object
      const session = {
        id: uuidv4(),
        planId: sessionData.planId,
        userId: sessionData.userId,
        username: sessionData.username,
        socketId: sessionData.socketId,
        clientId: sessionData.clientId,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        userColor: sessionData.userColor || this.generateRandomColor()
      };
      
      // Insert session into database
      const result = await r.table('active_sessions').insert(session).run(connection);
      
      if (result.inserted !== 1) {
        throw new Error('Failed to create active session');
      }
      
      return session;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find active sessions for a plan
   * @param {string} planId - Plan ID
   * @returns {Array} Array of active sessions
   */
  static async findByPlanId(planId) {
    const connection = await getConnection();
    try {
      const sessions = await r.table('active_sessions')
        .getAll(planId, { index: 'planId' })
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return sessions;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find an active session by user ID and plan ID
   * @param {string} userId - User ID
   * @param {string} planId - Plan ID
   * @returns {Object|null} Session or null if not found
   */
  static async findByUserAndPlan(userId, planId) {
    const connection = await getConnection();
    try {
      const sessions = await r.table('active_sessions')
        .getAll(userId, { index: 'userId' })
        .filter({ planId })
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return sessions.length > 0 ? sessions[0] : null;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Update a session's last active timestamp
   * @param {string} id - Session ID
   * @returns {Object} Updated session
   */
  static async updateActivity(id) {
    const connection = await getConnection();
    try {
      const result = await r.table('active_sessions')
        .get(id)
        .update({ lastActiveAt: new Date() })
        .run(connection);
      
      if (result.replaced !== 1 && result.unchanged !== 1) {
        throw new Error('Failed to update session activity');
      }
      
      return await r.table('active_sessions').get(id).run(connection);
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Remove a session
   * @param {string} id - Session ID
   * @returns {boolean} Success
   */
  static async remove(id) {
    const connection = await getConnection();
    try {
      const result = await r.table('active_sessions')
        .get(id)
        .delete()
        .run(connection);
      
      return result.deleted === 1;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Remove sessions by socket ID
   * @param {string} socketId - Socket ID
   * @returns {boolean} Success
   */
  static async removeBySocketId(socketId) {
    const connection = await getConnection();
    try {
      const result = await r.table('active_sessions')
        .filter({ socketId })
        .delete()
        .run(connection);
      
      return result.deleted >= 0;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Generate a random color for user identification
   * @returns {string} Hex color code
   */
  static generateRandomColor() {
    // List of distinct, visually pleasing colors
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#33A8FF',
      '#A833FF', '#FF8333', '#33FFC1', '#C133FF', '#FFFF33',
      '#33FFFF', '#FF33FF', '#7BFF33', '#FF337B', '#337BFF'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export default ActiveSession;
