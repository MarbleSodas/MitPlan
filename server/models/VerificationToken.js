import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

class VerificationToken {
  /**
   * Create a new verification token
   * @param {string} userId - User ID
   * @returns {Object} Created token
   */
  static async create(userId) {
    const connection = await getConnection();
    try {
      // Delete any existing tokens for this user
      await r.table('verification_tokens')
        .getAll(userId, { index: 'userId' })
        .delete()
        .run(connection);
      
      // Create token
      const token = crypto.randomBytes(32).toString('hex');
      const verificationToken = {
        id: uuidv4(),
        userId,
        token,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
      
      // Insert token into database
      const result = await r.table('verification_tokens').insert(verificationToken).run(connection);
      
      if (result.inserted !== 1) {
        throw new Error('Failed to create verification token');
      }
      
      return verificationToken;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find a token by token string
   * @param {string} token - Token string
   * @returns {Object|null} Token or null if not found
   */
  static async findByToken(token) {
    const connection = await getConnection();
    try {
      const tokens = await r.table('verification_tokens')
        .getAll(token, { index: 'token' })
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      if (tokens.length === 0) {
        return null;
      }
      
      return tokens[0];
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Delete a token
   * @param {string} id - Token ID
   * @returns {boolean} True if deleted, false otherwise
   */
  static async delete(id) {
    const connection = await getConnection();
    try {
      const result = await r.table('verification_tokens').get(id).delete().run(connection);
      return result.deleted === 1;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Delete tokens for a user
   * @param {string} userId - User ID
   * @returns {boolean} True if deleted, false otherwise
   */
  static async deleteByUserId(userId) {
    const connection = await getConnection();
    try {
      const result = await r.table('verification_tokens')
        .getAll(userId, { index: 'userId' })
        .delete()
        .run(connection);
      
      return result.deleted > 0;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Verify a token
   * @param {string} token - Token string
   * @returns {Object|null} User ID if valid, null otherwise
   */
  static async verify(token) {
    const verificationToken = await this.findByToken(token);
    
    if (!verificationToken) {
      return null;
    }
    
    // Check if token is expired
    if (new Date(verificationToken.expiresAt) < new Date()) {
      await this.delete(verificationToken.id);
      return null;
    }
    
    // Delete token
    await this.delete(verificationToken.id);
    
    return { userId: verificationToken.userId };
  }
}

export default VerificationToken;