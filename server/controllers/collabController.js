import Plan from '../models/Plan.js';
import Version from '../models/Version.js';
import User from '../models/User.js';
import ActiveSession from '../models/ActiveSession.js';
import UserSelection from '../models/UserSelection.js';
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
 * Check if collaboration should be enabled for a plan
 * @param {Object} plan - Plan object
 * @returns {boolean} Whether collaboration should be enabled
 */
const shouldEnableCollaboration = (plan) => {
  // Enable collaboration if:
  // 1. Plan is shared with other users (has sharedWith array with users)
  // 2. Plan is public
  // 3. Plan has a shareable link
  return (
    (plan.sharedWith && plan.sharedWith.length > 0) ||
    plan.isPublic ||
    (plan.shareableLink && plan.shareableLink.token)
  );
};

/**
 * Check if user has edit permissions for collaborative features
 * @param {Object} plan - Plan object
 * @param {string} userId - User ID
 * @returns {boolean} Whether user can participate in collaborative editing
 */
const hasCollaborativeEditAccess = (plan, userId) => {
  // Owner always has edit access
  if (plan.userId === userId) {
    return true;
  }

  // Check if user is shared with edit permissions
  if (plan.sharedWith && plan.sharedWith.includes(userId)) {
    return plan.permissions && plan.permissions[userId] && plan.permissions[userId].canEdit;
  }

  // Public plans are view-only by default unless explicitly shared with edit access
  return false;
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

    // Handle selection updates separately (don't need version check or persistence)
    const selectionOps = operations.filter(op => op.type === 'user_selection');
    const nonSelectionOps = operations.filter(op => op.type !== 'user_selection');

    // Get plan first to check collaboration status
    const connection = await getConnection();
    let plan;
    try {
      plan = await r.table('plans').get(docId).run(connection);
      if (!plan) {
        return socket.emit('error', { message: 'Plan not found' });
      }
    } finally {
      releaseConnection(connection);
    }

    // Check if collaboration should be enabled for this plan
    const collaborationEnabled = shouldEnableCollaboration(plan);
    const userHasEditAccess = hasCollaborativeEditAccess(plan, user.id);

    // Process selection operations only if collaboration is enabled and user has edit access
    if (collaborationEnabled && userHasEditAccess && selectionOps.length > 0) {
      for (const op of selectionOps) {
        if (op.type === 'user_selection') {
          // Get user color from active session
          const session = await ActiveSession.findByUserAndPlan(user.id, docId);
          const userColor = session?.userColor || ActiveSession.generateRandomColor();

          // Update user selection
          await UserSelection.upsert({
            planId: docId,
            userId: user.id,
            username: user.username,
            elementId: op.elementId,
            elementType: op.elementType,
            selectedText: op.selectedText,
            selectionRange: op.selectionRange,
            userColor
          });

          // Broadcast selection to other users
          socket.to(`plan:${docId}`).emit('selection_update', {
            userId: user.id,
            username: user.username,
            elementId: op.elementId,
            elementType: op.elementType,
            selectedText: op.selectedText,
            selectionRange: op.selectionRange,
            color: userColor
          });
        }
      }
    }

    // If there are no non-selection operations, we're done
    if (nonSelectionOps.length === 0) {
      return;
    }

    const connection2 = await getConnection();
    try {
      // Plan already retrieved above, use it for further operations

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
        const transformResult = transformOperations(nonSelectionOps, serverOps);
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
          .run(connection2);

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
        }).run(connection2);

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
        const updatedPlan = applyOperations(plan, nonSelectionOps);

        // Update plan
        await r.table('plans')
          .get(docId)
          .update({
            ...updatedPlan,
            version: plan.version + 1,
            updatedAt: new Date()
          })
          .run(connection2);

        // Create new version
        await r.table('versions').insert({
          id: uuidv4(),
          planId: docId,
          version: plan.version + 1,
          data: updatedPlan,
          operations: nonSelectionOps,
          userId: user.id,
          clientId,
          createdAt: new Date()
        }).run(connection2);

        // Store operations for conflict resolution
        for (const op of nonSelectionOps) {
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
            operations: nonSelectionOps,
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
      releaseConnection(connection2);
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

      case 'user_selection':
        // Selection operations don't modify the plan state
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

      // Check if collaboration should be enabled for this plan
      const collaborationEnabled = shouldEnableCollaboration(plan);
      const userHasEditAccess = hasCollaborativeEditAccess(plan, user.id);

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

      // Only set up collaboration features if collaboration is enabled
      let activeUsers = [];
      let userSelections = [];

      if (collaborationEnabled) {
        // Get all active sessions for this plan
        const activeSessions = await ActiveSession.findByPlanId(docId);
        activeUsers = activeSessions
          .filter(session => session.userId !== user.id)
          .map(session => ({
            id: session.userId,
            username: session.username,
            color: session.userColor,
            lastActive: session.lastActiveAt,
            canEdit: hasCollaborativeEditAccess(plan, session.userId)
          }));

        // Get user selections for all active users (only if user has edit access)
        if (userHasEditAccess) {
          userSelections = await UserSelection.findByPlanId(docId);
        }

        // Notify other users that a new user joined (only if collaboration is enabled)
        socket.to(`plan:${docId}`).emit('user_joined', {
          user: {
            id: user.id,
            username: user.username,
            color: userColor,
            canEdit: userHasEditAccess
          }
        });
      }

      // Send initial state to the user
      socket.emit('session_joined', {
        plan,
        activeUsers,
        userSelections,
        collaborationEnabled,
        canEdit: userHasEditAccess,
        userColor: collaborationEnabled ? userColor : null
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

    // Remove user selection
    await UserSelection.remove(user.id, docId);

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
