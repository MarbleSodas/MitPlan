import Plan from '../models/Plan.js';
import Version from '../models/Version.js';
import User from '../models/User.js';
import ActiveSession from '../models/ActiveSession.js';
import CursorPosition from '../models/CursorPosition.js';
import Operation from '../models/Operation.js';
import { r, getConnection, releaseConnection } from '../config/db.cjs';
import { v4 as uuidv4 } from 'uuid';
import { transformOperations } from '../utils/operationalTransformation.js';
import {
  prepareDataForTransmission,
  processReceivedData,
  generateDelta,
  applyDelta
} from '../utils/deltaUtils.js';

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

    // Handle cursor position updates separately (don't need version check or persistence)
    const cursorOps = operations.filter(op => op.type === 'cursor_move' || op.type === 'cursor_selection');
    const nonCursorOps = operations.filter(op => op.type !== 'cursor_move' && op.type !== 'cursor_selection');

    // Process cursor operations immediately
    if (cursorOps.length > 0) {
      for (const op of cursorOps) {
        if (op.type === 'cursor_move' || op.type === 'cursor_selection') {
          // Get user color from active session
          const session = await ActiveSession.findByUserAndPlan(user.id, docId);
          const userColor = session?.userColor || ActiveSession.generateRandomColor();

          // Update cursor position
          await CursorPosition.upsert({
            planId: docId,
            userId: user.id,
            username: user.username,
            position: op.position,
            selection: op.selection,
            userColor
          });

          // Broadcast cursor position to other users
          socket.to(`plan:${docId}`).emit('cursor_update', {
            userId: user.id,
            username: user.username,
            position: op.position,
            selection: op.selection,
            color: userColor
          });
        }
      }
    }

    // If there are no non-cursor operations, we're done
    if (nonCursorOps.length === 0) {
      return;
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
        const serverOps = await Operation.getOperationsSince(docId, version);

        // Transform client operations with enhanced OT algorithm
        const transformResult = transformOperations(nonCursorOps, serverOps);
        const transformedOps = transformResult.operations;

        // If all operations were filtered out during transformation, we're done
        if (transformedOps.length === 0) {
          return socket.emit('version_update', {
            docId,
            version: plan.version
          });
        }

        // If there are conflicts, notify the client
        if (transformResult.hasConflicts) {
          socket.emit('conflict_detected', {
            docId,
            conflicts: transformResult.conflicts,
            serverVersion: plan.version
          });
        }

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

        // Store operations for conflict resolution
        for (const op of transformedOps) {
          await Operation.create({
            planId: docId,
            userId: user.id,
            username: user.username,
            clientId,
            type: op.type,
            data: op,
            version: plan.version + 1
          });
        }

        // Prepare data for transmission using delta compression
        const transmissionData = prepareDataForTransmission(
          { version: plan.version, operations: [] },
          {
            docId,
            version: plan.version + 1,
            operations: transformedOps,
            userId: user.id,
            username: user.username,
            clientId
          },
          true // Use compression
        );

        // Broadcast to all clients including sender
        io.to(`plan:${docId}`).emit('operation', transmissionData);

        // Update active session
        await ActiveSession.updateActivity(socket.id);
      } else {
        // Version matches, apply operations directly
        const updatedPlan = applyOperations(plan, nonCursorOps);

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
          operations: nonCursorOps,
          userId: user.id,
          clientId,
          createdAt: new Date()
        }).run(connection);

        // Store operations for conflict resolution
        for (const op of nonCursorOps) {
          await Operation.create({
            planId: docId,
            userId: user.id,
            username: user.username,
            clientId,
            type: op.type,
            data: op,
            version: plan.version + 1
          });
        }

        // Prepare data for transmission using delta compression
        const transmissionData = prepareDataForTransmission(
          { version: plan.version, operations: [] },
          {
            docId,
            version: plan.version + 1,
            operations: nonCursorOps,
            userId: user.id,
            username: user.username,
            clientId
          },
          true // Use compression
        );

        // Broadcast to all clients including sender
        io.to(`plan:${docId}`).emit('operation', transmissionData);

        // Update active session
        await ActiveSession.updateActivity(socket.id);
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

  // Initialize assignments if not present
  if (!updatedPlan.assignments) {
    updatedPlan.assignments = {};
  }

  // Apply each operation
  for (const op of operations) {
    switch (op.type) {
      case 'add_mitigation':
        // Add mitigation to boss action
        if (!updatedPlan.assignments[op.bossActionId]) {
          updatedPlan.assignments[op.bossActionId] = [];
        }

        // Check if mitigation already exists to avoid duplicates
        const existingIndex = updatedPlan.assignments[op.bossActionId]
          .findIndex(m => m.id === op.mitigation.id);

        if (existingIndex === -1) {
          // Add new mitigation
          updatedPlan.assignments[op.bossActionId].push(op.mitigation);
        } else {
          // Replace existing mitigation (might have updated properties)
          updatedPlan.assignments[op.bossActionId][existingIndex] = op.mitigation;
        }
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
        if (op.title !== undefined) updatedPlan.title = op.title;
        if (op.description !== undefined) updatedPlan.description = op.description;
        if (op.bossId !== undefined) updatedPlan.bossId = op.bossId;
        if (op.isPublic !== undefined) updatedPlan.isPublic = op.isPublic;
        break;

      case 'update_tank_positions':
        // Update tank positions
        if (!updatedPlan.tankPositions) {
          updatedPlan.tankPositions = {};
        }
        updatedPlan.tankPositions = op.tankPositions;
        break;

      case 'clear_assignments':
        // Clear all assignments
        updatedPlan.assignments = {};
        break;

      case 'import_assignments':
        // Import assignments (replace all)
        updatedPlan.assignments = op.assignments;
        break;

      case 'cursor_move':
      case 'cursor_selection':
        // Cursor operations don't modify the plan state
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
    const { docId, clientId } = data;

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

      // Create or update active session
      const userColor = await ActiveSession.findByUserAndPlan(user.id, docId)
        .then(session => session?.userColor || ActiveSession.generateRandomColor());

      await ActiveSession.create({
        planId: docId,
        userId: user.id,
        username: user.username,
        socketId: socket.id,
        clientId: clientId || socket.id,
        userColor
      });

      // Get all active sessions for this plan
      const activeSessions = await ActiveSession.findByPlanId(docId);
      const activeUsers = activeSessions
        .filter(session => session.userId !== user.id)
        .map(session => ({
          id: session.userId,
          username: session.username,
          color: session.userColor,
          lastActive: session.lastActiveAt
        }));

      // Get cursor positions for all active users
      const cursorPositions = await CursorPosition.findByPlanId(docId);

      // Notify other users that a new user joined
      socket.to(`plan:${docId}`).emit('user_joined', {
        user: {
          id: user.id,
          username: user.username,
          color: userColor
        }
      });

      // Send initial state to the user
      socket.emit('session_joined', {
        plan,
        activeUsers,
        cursorPositions,
        canEdit: plan.userId === user.id ||
                (plan.sharedWith.includes(user.id) && plan.permissions[user.id]?.canEdit),
        userColor
      });

      // Get recent operations for context
      const recentOperations = await Operation.getLatestOperations(docId, 20);
      if (recentOperations.length > 0) {
        socket.emit('recent_operations', {
          operations: recentOperations
        });
      }
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

    // Remove active session
    await ActiveSession.removeBySocketId(socket.id);

    // Remove cursor position
    await CursorPosition.remove(user.id, docId);

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
