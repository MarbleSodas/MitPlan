import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';

class CursorPosition {
  /**
   * Create or update a cursor position
   * @param {Object} positionData - Position data
   * @returns {Object} Created or updated position
   */
  static async upsert(positionData) {
    const connection = await getConnection();
    try {
      // Check if position exists
      const existingPositions = await r.table('cursor_positions')
        .getAll(positionData.userId, { index: 'userId' })
        .filter({ planId: positionData.planId })
        .run(connection)
        .then(cursor => cursor.toArray());
      
      if (existingPositions.length > 0) {
        // Update existing position
        const existingPosition = existingPositions[0];
        
        const result = await r.table('cursor_positions')
          .get(existingPosition.id)
          .update({
            position: positionData.position,
            selection: positionData.selection,
            updatedAt: new Date()
          })
          .run(connection);
        
        if (result.replaced !== 1 && result.unchanged !== 1) {
          throw new Error('Failed to update cursor position');
        }
        
        return await r.table('cursor_positions').get(existingPosition.id).run(connection);
      } else {
        // Create new position
        const position = {
          id: uuidv4(),
          planId: positionData.planId,
          userId: positionData.userId,
          username: positionData.username,
          position: positionData.position,
          selection: positionData.selection,
          userColor: positionData.userColor,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await r.table('cursor_positions').insert(position).run(connection);
        
        if (result.inserted !== 1) {
          throw new Error('Failed to create cursor position');
        }
        
        return position;
      }
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find cursor positions for a plan
   * @param {string} planId - Plan ID
   * @returns {Array} Array of cursor positions
   */
  static async findByPlanId(planId) {
    const connection = await getConnection();
    try {
      const positions = await r.table('cursor_positions')
        .getAll(planId, { index: 'planId' })
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return positions;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Remove a cursor position
   * @param {string} userId - User ID
   * @param {string} planId - Plan ID
   * @returns {boolean} Success
   */
  static async remove(userId, planId) {
    const connection = await getConnection();
    try {
      const result = await r.table('cursor_positions')
        .getAll(userId, { index: 'userId' })
        .filter({ planId })
        .delete()
        .run(connection);
      
      return result.deleted >= 0;
    } finally {
      releaseConnection(connection);
    }
  }
}

export default CursorPosition;
