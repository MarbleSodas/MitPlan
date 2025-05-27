import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';

class UserSelection {
  /**
   * Create or update a user selection
   * @param {Object} selectionData - Selection data
   * @returns {Object} Created or updated selection
   */
  static async upsert(selectionData) {
    const connection = await getConnection();
    try {
      // Check if selection exists for this user and plan
      const existingSelections = await r.table('user_selections')
        .getAll(selectionData.userId, { index: 'userId' })
        .filter({ planId: selectionData.planId })
        .run(connection)
        .then(cursor => cursor.toArray());
      
      if (existingSelections.length > 0) {
        // Update existing selection
        const existingSelection = existingSelections[0];
        
        const result = await r.table('user_selections')
          .get(existingSelection.id)
          .update({
            elementId: selectionData.elementId,
            elementType: selectionData.elementType,
            selectedText: selectionData.selectedText,
            selectionRange: selectionData.selectionRange,
            updatedAt: new Date()
          })
          .run(connection);
        
        if (result.replaced !== 1 && result.unchanged !== 1) {
          throw new Error('Failed to update user selection');
        }
        
        return await r.table('user_selections').get(existingSelection.id).run(connection);
      } else {
        // Create new selection
        const selection = {
          id: uuidv4(),
          planId: selectionData.planId,
          userId: selectionData.userId,
          username: selectionData.username,
          elementId: selectionData.elementId,
          elementType: selectionData.elementType,
          selectedText: selectionData.selectedText,
          selectionRange: selectionData.selectionRange,
          userColor: selectionData.userColor,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await r.table('user_selections').insert(selection).run(connection);
        
        if (result.inserted !== 1) {
          throw new Error('Failed to create user selection');
        }
        
        return selection;
      }
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find user selections for a plan
   * @param {string} planId - Plan ID
   * @returns {Array} Array of user selections
   */
  static async findByPlanId(planId) {
    const connection = await getConnection();
    try {
      const selections = await r.table('user_selections')
        .getAll(planId, { index: 'planId' })
        .run(connection)
        .then(cursor => cursor.toArray());
      
      return selections;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Remove a user selection
   * @param {string} userId - User ID
   * @param {string} planId - Plan ID
   * @returns {boolean} Success
   */
  static async remove(userId, planId) {
    const connection = await getConnection();
    try {
      const result = await r.table('user_selections')
        .getAll(userId, { index: 'userId' })
        .filter({ planId })
        .delete()
        .run(connection);
      
      return result.deleted >= 0;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Clear all selections for a plan
   * @param {string} planId - Plan ID
   * @returns {boolean} Success
   */
  static async clearByPlanId(planId) {
    const connection = await getConnection();
    try {
      const result = await r.table('user_selections')
        .getAll(planId, { index: 'planId' })
        .delete()
        .run(connection);
      
      return result.deleted >= 0;
    } finally {
      releaseConnection(connection);
    }
  }
}

export default UserSelection;
