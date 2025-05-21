import { r, getConnection, releaseConnection } from '../config/db.cjs';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async create(userData) {
    const connection = await getConnection();
    try {
      // Check if user with this email already exists
      const existingUser = await r.table('users')
        .getAll(userData.email, { index: 'email' })
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      if (existingUser.length > 0) {
        throw new Error('User with this email already exists');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user object
      const user = {
        id: uuidv4(),
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        preferences: {
          theme: 'light',
          defaultBossId: null,
          defaultJobs: []
        }
      };
      
      // Insert user into database
      const result = await r.table('users').insert(user).run(connection);
      
      if (result.inserted !== 1) {
        throw new Error('Failed to create user');
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User or null if not found
   */
  static async findById(id) {
    const connection = await getConnection();
    // DEBUG: Log connection state after initialization
    if (connection && typeof connection.isClosed === 'function') {
      console.log('[User.findById] Connection open:', !connection.isClosed());
    } else {
      console.log('[User.findById] Connection object missing or invalid:', connection);
    }
    try {
      const user = await r.table('users').get(id).run(connection);
      
      if (!user) {
        return null;
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Object|null} User or null if not found
   */
  static async findByEmail(email) {
    const connection = await getConnection();
    try {
      const users = await r.table('users')
        .getAll(email, { index: 'email' })
        .limit(1)
        .run(connection)
        .then(cursor => cursor.toArray());
      
      if (users.length === 0) {
        return null;
      }
      
      return users[0];
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  static async update(id, updateData) {
    const connection = await getConnection();
    try {
      // Don't allow updating email to an existing email
      if (updateData.email) {
        const existingUser = await r.table('users')
          .getAll(updateData.email, { index: 'email' })
          .filter(user => user('id').ne(id))
          .limit(1)
          .run(connection)
          .then(cursor => cursor.toArray());
        
        if (existingUser.length > 0) {
          throw new Error('User with this email already exists');
        }
      }
      
      // Hash password if provided
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }
      
      // Update user
      updateData.updatedAt = new Date();
      
      const result = await r.table('users')
        .get(id)
        .update(updateData)
        .run(connection);
      
      if (result.replaced !== 1 && result.unchanged !== 1) {
        throw new Error('Failed to update user');
      }
      
      // Get updated user
      const updatedUser = await r.table('users').get(id).run(connection);
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {boolean} True if deleted, false otherwise
   */
  static async delete(id) {
    const connection = await getConnection();
    try {
      const result = await r.table('users').get(id).delete().run(connection);
      return result.deleted === 1;
    } finally {
      releaseConnection(connection);
    }
  }
  
  /**
   * Verify user's password
   * @param {string} email - User email
   * @param {string} password - Password to verify
   * @returns {Object|null} User if password is correct, null otherwise
   */
  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return null;
    }
    
    // Update last login time
    const connection = await getConnection();
    try {
      await r.table('users')
        .get(user.id)
        .update({ lastLogin: new Date() })
        .run(connection);
    } finally {
      releaseConnection(connection);
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Mark user as verified
   * @param {string} id - User ID
   * @returns {Object} Updated user
   */
  static async markAsVerified(id) {
    return this.update(id, { isVerified: true });
  }
}

export default User;