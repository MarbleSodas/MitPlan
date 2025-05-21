import Plan from '../models/Plan.js';
import Version from '../models/Version.js';
import User from '../models/User.js';
import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Apply operational transformation to resolve conflicts
 * @param {Array} clientOps - Client operations
 * @param {Array} serverOps - Server operations
 * @returns {Array} Transformed client operations
 */
const transformOperations = (clientOps, serverOps) => {
  // Simple last-writer-wins strategy for now
  // In a real implementation, this would use a more sophisticated OT algorithm
  return clientOps;
};

/**
 * Handle real-time collaboration operations
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket connection
 * @param {Object} data - Operation data
 * @param {Object} user - User data
 */
export const handleOperation = async (io, socket, data, user) => {
  try {
    const { docId, version, operations, clientId } = data;
    
    if (!docId || !version || !operations || !clientId) {
      return socket.emit('error', { message: 'Invalid operation data' });
    }
    
    const connection = await getConnection();
    try {
      // Get plan
      const plan = await r.table('plans').get(docId).run(connection);
      
      if (!plan) {
        return socket.emit('error', { message: 'Plan not found' });
      }
      
      // Check if user has access
      if (plan.userId !== user.id && 
          !(plan.sharedWith.includes(user.id) && plan.permissions[user.id]?.canEdit)) {
        return socket.emit('error', { message: 'You do not have edit access to this plan' });
      }
      
      // Check version
      if (plan.version !== version) {
        // Version mismatch, need to transform operations
        const latestVersion = await Version.getLatestVersion(docId);
        
        if (!latestVersion) {
          return socket.emit('error', { message: 'Could not retrieve latest version' });
        }
        
        // Get operations since client version
        const serverOps = []; // In a real implementation, this would be extracted from version history
        
        // Transform client operations
        const transformedOps = transformOperations(operations, serverOps);
        
        // Apply transformed operations
        const updatedPlan = applyOperations(plan, transformedOps);
        
        // Update plan
        await r.table('plans')
          .get(docId)
          .update({
            ...updatedPlan,
            version: plan.version + 1,
            updatedAt: new Date()
          })
          .run(connection);
        
        // Create new version
        await r.table('versions').insert({
          id: uuidv4(),
          planId: docId,
          version: plan.version + 1,
          data: updatedPlan,
          operations: transformedOps,
          userId: user.id,
          clientId,
          createdAt: new Date()
        }).run(connection);
        
        // Broadcast update to all clients in the room
        io.to(`plan:${docId}`).emit('operation', {
          docId,
          version: plan.version + 1,
          operations: transformedOps,
          userId: user.id,
          clientId
        });
      } else {
        // Version matches, apply operations directly
        const updatedPlan = applyOperations(plan, operations);
        
        // Update plan
        await r.table('plans')
          .get(docId)
          .update({
            ...updatedPlan,
            version: plan.version + 1,
            updatedAt: new Date()
          })
          .run(connection);
        
        // Create new version
        await r.table('versions').insert({
          id: uuidv4(),
          planId: docId,
          version: plan.version + 1,
          data: updatedPlan,
          operations,
          userId: user.id,
          clientId,
          createdAt: new Date()
        }).run(connection);
        
        // Broadcast update to all clients in the room
        io.to(`plan:${docId}`).emit('operation', {
          docId,
          version: plan.version + 1,
          operations,
          userId: user.id,
          clientId
        });
      }
    } finally {
      releaseConnection(connection);
    }
  } catch (error) {
    console.error('Handle operation error:', error);
    socket.emit('error', { message: 'Server error' });
  }
};

/**
 * Apply operations to a plan
 * @param {Object} plan - Plan data
 * @param {Array} operations - Operations to apply
 * @returns {Object} Updated plan
 */
const applyOperations = (plan, operations) => {
  // Clone plan to avoid modifying the original
  const updatedPlan = JSON.parse(JSON.stringify(plan));
  
  // Apply each operation
  for (const op of operations) {
    switch (op.type) {
      case 'add_mitigation':
        // Add mitigation to boss action
        if (!updatedPlan.assignments[op.bossActionId]) {
          updatedPlan.assignments[op.bossActionId] = [];
        }
        updatedPlan.assignments[op.bossActionId].push(op.mitigation);
        break;
        
      case 'remove_mitigation':
        // Remove mitigation from boss action
        if (updatedPlan.assignments[op.bossActionId]) {
          updatedPlan.assignments[op.bossActionId] = updatedPlan.assignments[op.bossActionId]
            .filter(m => m.id !== op.mitigationId);
          
          // Remove empty arrays
          if (updatedPlan.assignments[op.bossActionId].length === 0) {
            delete updatedPlan.assignments[op.bossActionId];
          }
        }
        break;
        
      case 'update_jobs':
        // Update selected jobs
        updatedPlan.selectedJobs = op.selectedJobs;
        break;
        
      case 'update_metadata':
        // Update plan metadata
        if (op.title) updatedPlan.title = op.title;
        if (op.description) updatedPlan.description = op.description;
        if (op.bossId) updatedPlan.bossId = op.bossId;
        if (op.isPublic !== undefined) updatedPlan.isPublic = op.isPublic;
        break;
        
      default:
        // Unknown operation type
        console.warn('Unknown operation type:', op.type);
    }
  }
  
  return updatedPlan;
};

/**
 * Join a collaboration session
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket connection
 * @param {Object} data - Session data
 * @param {Object} user - User data
 */
export const joinSession = async (io, socket, data, user) => {
  try {
    const { docId } = data;
    
    if (!docId) {
      return socket.emit('error', { message: 'Document ID is required' });
    }
    
    const connection = await getConnection();
    try {
      // Get plan
      const plan = await r.table('plans').get(docId).run(connection);
      
      if (!plan) {
        return socket.emit('error', { message: 'Plan not found' });
      }
      
      // Check if user has access
      const hasAccess = plan.userId === user.id || 
                        plan.sharedWith.includes(user.id) || 
                        plan.isPublic;
      
      if (!hasAccess) {
        return socket.emit('error', { message: 'You do not have access to this plan' });
      }
      
      // Join room
      socket.join(`plan:${docId}`);
      
      // Get active users in the room
      const sockets = await io.in(`plan:${docId}`).fetchSockets();
      const activeUsers = sockets.map(s => s.user).filter(u => u.id !== user.id);
      
      // Notify other users that a new user joined
      socket.to(`plan:${docId}`).emit('user_joined', {
        user: {
          id: user.id,
          username: user.username
        }
      });
      
      // Send initial state to the user
      socket.emit('session_joined', {
        plan,
        activeUsers,
        canEdit: plan.userId === user.id || 
                (plan.sharedWith.includes(user.id) && plan.permissions[user.id]?.canEdit)
      });
    } finally {
      releaseConnection(connection);
    }
  } catch (error) {
    console.error('Join session error:', error);
    socket.emit('error', { message: 'Server error' });
  }
};

/**
 * Leave a collaboration session
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket connection
 * @param {Object} data - Session data
 * @param {Object} user - User data
 */
export const leaveSession = async (io, socket, data, user) => {
  try {
    const { docId } = data;
    
    if (!docId) {
      return;
    }
    
    // Leave room
    socket.leave(`plan:${docId}`);
    
    // Notify other users that a user left
    socket.to(`plan:${docId}`).emit('user_left', {
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Leave session error:', error);
  }
};
