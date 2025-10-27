/**
 * Timeline Service
 * Handles CRUD operations for Boss Action Timelines in Firebase
 * Similar to realtimePlanService but without real-time collaboration features
 */

import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';

const TIMELINES_PATH = 'timelines';

/**
 * @typedef {Object} BossAction
 * @property {string} id - Unique identifier for the action
 * @property {string} name - Name of the boss action
 * @property {number} time - Time in seconds when the action occurs
 * @property {string} description - Description of the action
 * @property {string} icon - Emoji icon representing the action
 * @property {string} damageType - Type of damage (magical/physical)
 * @property {string} importance - Importance level (critical/high/medium/low)
 * @property {string} [unmitigatedDamage] - Unmitigated damage value (optional)
 * @property {boolean} [isTankBuster] - Whether this is a tank buster (optional)
 * @property {boolean} [isDualTankBuster] - Whether this is a dual tank buster (optional)
 * @property {boolean} isCustom - Whether this is a custom action
 * @property {string} source - Source of the action ('boss' or 'custom')
 */

/**
 * @typedef {Object} Timeline
 * @property {string} id - Unique identifier for the timeline
 * @property {string} name - Name of the timeline
 * @property {string} bossId - ID of the boss this timeline is for
 * @property {string} userId - ID of the user who created the timeline
 * @property {string} ownerId - ID of the owner (same as userId)
 * @property {BossAction[]} actions - Array of boss actions in the timeline
 * @property {string} [description] - Optional description of the timeline
 * @property {boolean} isPublic - Whether the timeline is publicly accessible
 * @property {number} createdAt - Timestamp when the timeline was created
 * @property {number} updatedAt - Timestamp when the timeline was last updated
 * @property {number} version - Version number of the timeline data structure
 */

/**
 * @typedef {Object} TimelineData
 * @property {string} [name] - Name of the timeline
 * @property {string} [bossId] - ID of the boss
 * @property {BossAction[]} [actions] - Array of boss actions
 * @property {string} [description] - Description of the timeline
 * @property {boolean} [isPublic] - Whether the timeline is public
 * @property {number} [createdAt] - Creation timestamp
 */

/**
 * Create a new boss action timeline
 * @param {string} userId - The user ID (authenticated or anonymous)
 * @param {TimelineData} timelineData - Timeline data
 * @returns {Promise<Timeline>} Created timeline with ID
 */
export const createTimeline = async (userId, timelineData) => {
  try {
    console.log('[TimelineService] Creating timeline:', { userId, timelineData });

    if (!userId) {
      throw new Error('User ID is required to create a timeline');
    }

    // Prepare timeline document
    const timelineDoc = {
      name: timelineData.name || 'Untitled Timeline',
      bossId: timelineData.bossId || 'ketuduke',
      userId: userId,
      ownerId: userId, // For backward compatibility
      actions: timelineData.actions || [], // Array of boss actions (both existing and custom)
      description: timelineData.description || '',
      isPublic: timelineData.isPublic || false,
      createdAt: timelineData.createdAt || Date.now(),
      updatedAt: Date.now(),
      version: 1.0
    };

    // Create timeline in Firebase
    const timelinesRef = ref(database, TIMELINES_PATH);
    const newTimelineRef = push(timelinesRef);
    await set(newTimelineRef, timelineDoc);

    console.log('[TimelineService] Timeline created successfully with ID:', newTimelineRef.key);
    return { id: newTimelineRef.key, ...timelineDoc };
  } catch (error) {
    console.error('[TimelineService] Error creating timeline:', error);
    throw new Error('Failed to create timeline');
  }
};

/**
 * Get a timeline by ID
 * @param {string} timelineId - Timeline ID
 * @returns {Promise<object>} Timeline data
 */
export const getTimeline = async (timelineId) => {
  try {
    console.log('[TimelineService] Fetching timeline:', timelineId);

    const timelineRef = ref(database, `${TIMELINES_PATH}/${timelineId}`);
    const snapshot = await get(timelineRef);

    if (snapshot.exists()) {
      const timelineData = snapshot.val();
      console.log('[TimelineService] Retrieved timeline:', {
        id: timelineId,
        name: timelineData.name,
        bossId: timelineData.bossId,
        actionsCount: timelineData.actions?.length || 0
      });

      return { id: timelineId, ...timelineData };
    } else {
      throw new Error('Timeline not found');
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching timeline:', error);
    throw error;
  }
};

/**
 * Update an existing timeline
 * @param {string} timelineId - Timeline ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateTimeline = async (timelineId, updates) => {
  try {
    console.log('[TimelineService] Updating timeline:', { timelineId, updates });

    // Prepare updates object
    const updateData = {
      ...updates,
      updatedAt: Date.now()
    };

    const timelineRef = ref(database, `${TIMELINES_PATH}/${timelineId}`);
    await update(timelineRef, updateData);

    console.log('[TimelineService] Timeline updated successfully');
  } catch (error) {
    console.error('[TimelineService] Error updating timeline:', error);
    throw new Error('Failed to update timeline');
  }
};

/**
 * Delete a timeline
 * @param {string} timelineId - Timeline ID
 * @param {string} userId - User ID (for permission check)
 * @returns {Promise<void>}
 */
export const deleteTimeline = async (timelineId, userId) => {
  try {
    console.log('[TimelineService] Deleting timeline:', { timelineId, userId });

    // First, verify ownership
    const timeline = await getTimeline(timelineId);
    if (timeline.userId !== userId && timeline.ownerId !== userId) {
      throw new Error('You do not have permission to delete this timeline');
    }

    const timelineRef = ref(database, `${TIMELINES_PATH}/${timelineId}`);
    await remove(timelineRef);

    console.log('[TimelineService] Timeline deleted successfully');
  } catch (error) {
    console.error('[TimelineService] Error deleting timeline:', error);
    throw error;
  }
};

/**
 * Get all timelines for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of timelines
 */
export const getUserTimelines = async (userId) => {
  try {
    console.log('[TimelineService] Fetching timelines for user:', userId);

    const timelinesRef = ref(database, TIMELINES_PATH);
    const userTimelinesQuery = query(timelinesRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(userTimelinesQuery);

    if (snapshot.exists()) {
      const timelines = [];
      snapshot.forEach((childSnapshot) => {
        timelines.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Sort by updatedAt (most recent first)
      timelines.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      console.log('[TimelineService] Retrieved timelines:', timelines.length);
      return timelines;
    } else {
      console.log('[TimelineService] No timelines found for user');
      return [];
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching user timelines:', error);
    throw error;
  }
};

/**
 * Duplicate a timeline
 * @param {string} timelineId - Timeline ID to duplicate
 * @param {string} userId - User ID creating the duplicate
 * @param {string} newName - Optional new name for the duplicate
 * @returns {Promise<object>} New timeline with ID
 */
export const duplicateTimeline = async (timelineId, userId, newName = null) => {
  try {
    console.log('[TimelineService] Duplicating timeline:', { timelineId, userId });

    const originalTimeline = await getTimeline(timelineId);

    const duplicateData = {
      name: newName || `${originalTimeline.name} (Copy)`,
      bossId: originalTimeline.bossId,
      actions: originalTimeline.actions || [],
      description: originalTimeline.description || '',
      isPublic: false, // Duplicates are private by default
      duplicatedFrom: timelineId,
      duplicatedAt: Date.now()
    };

    return await createTimeline(userId, duplicateData);
  } catch (error) {
    console.error('[TimelineService] Error duplicating timeline:', error);
    throw new Error('Failed to duplicate timeline');
  }
};

/**
 * Generate a shareable link for a timeline
 * @param {string} timelineId - Timeline ID
 * @returns {string} Shareable URL
 */
export const getShareableLink = (timelineId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/timeline/shared/${timelineId}`;
};

/**
 * Export timeline data for backup/sharing
 * @param {string} timelineId - Timeline ID
 * @returns {Promise<object>} Timeline export data
 */
export const exportTimeline = async (timelineId) => {
  try {
    const timeline = await getTimeline(timelineId);

    return {
      version: '1.0',
      type: 'timeline',
      exportedAt: new Date().toISOString(),
      data: {
        name: timeline.name,
        bossId: timeline.bossId,
        actions: timeline.actions,
        description: timeline.description
      }
    };
  } catch (error) {
    console.error('[TimelineService] Error exporting timeline:', error);
    throw new Error('Failed to export timeline');
  }
};

/**
 * Import timeline data
 * @param {object} importData - Timeline export data
 * @param {string} userId - User ID
 * @param {string} timelineName - Optional name for imported timeline
 * @returns {Promise<object>} Created timeline
 */
export const importTimeline = async (importData, userId, timelineName = null) => {
  try {
    console.log('[TimelineService] Importing timeline');

    if (!importData.data) {
      throw new Error('Invalid timeline import data');
    }

    const timelineData = {
      name: timelineName || importData.data.name || 'Imported Timeline',
      bossId: importData.data.bossId,
      actions: importData.data.actions || [],
      description: importData.data.description || '',
      importedAt: Date.now(),
      originalVersion: importData.version || 'unknown'
    };

    return await createTimeline(userId, timelineData);
  } catch (error) {
    console.error('[TimelineService] Error importing timeline:', error);
    throw new Error('Failed to import timeline');
  }
};

export default {
  createTimeline,
  getTimeline,
  updateTimeline,
  deleteTimeline,
  getUserTimelines,
  duplicateTimeline,
  getShareableLink,
  exportTimeline,
  importTimeline
};

