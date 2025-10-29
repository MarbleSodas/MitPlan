/**
 * Timeline Service
 * Handles CRUD operations for Boss Action Timelines in Firebase
 * Similar to realtimePlanService but without real-time collaboration features
 */

import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';

const TIMELINES_PATH = 'timelines';
const USER_COLLECTIONS_PATH = 'userCollections';

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
 * @typedef {Object} BossMetadata
 * @property {number} level - Boss level (e.g., 90, 100)
 * @property {string} [name] - Boss display name
 * @property {string} [icon] - Boss icon/emoji
 * @property {string} [description] - Boss description
 * @property {Object} [baseHealth] - Base health values for party and tank
 */

/**
 * @typedef {Object} Timeline
 * @property {string} id - Unique identifier for the timeline
 * @property {string} name - Name of the timeline
 * @property {string[]} [bossTags] - Optional array of boss tags/labels (can be official boss IDs or custom names)
 * @property {string} [bossId] - DEPRECATED: Legacy single boss ID (kept for backward compatibility)
 * @property {BossMetadata} [bossMetadata] - Boss metadata (level, name, icon, etc.) - overrides hardcoded boss data
 * @property {string} userId - ID of the user who created the timeline
 * @property {string} ownerId - ID of the owner (same as userId)
 * @property {BossAction[]} actions - Array of boss actions in the timeline
 * @property {string} [description] - Optional description of the timeline
 * @property {boolean} isPublic - Whether the timeline is publicly accessible
 * @property {boolean} [official] - Whether this is an official/predefined timeline (read-only)
 * @property {number} createdAt - Timestamp when the timeline was created
 * @property {number} updatedAt - Timestamp when the timeline was last updated
 * @property {number} version - Version number of the timeline data structure
 * @property {number} [likeCount] - Number of likes the timeline has received
 * @property {Object} [likedBy] - Map of user IDs who liked this timeline
 */

/**
 * @typedef {Object} TimelineData
 * @property {string} [name] - Name of the timeline
 * @property {string[]} [bossTags] - Optional array of boss tags
 * @property {string} [bossId] - DEPRECATED: Legacy single boss ID
 * @property {BossMetadata} [bossMetadata] - Boss metadata
 * @property {BossAction[]} [actions] - Array of boss actions
 * @property {string} [description] - Description of the timeline
 * @property {boolean} [isPublic] - Whether the timeline is public
 * @property {boolean} [official] - Whether this is an official timeline
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

    // Prepare timeline document with new flexible structure
    const timelineDoc = {
      name: timelineData.name || 'Untitled Timeline',
      // Support both new bossTags array and legacy bossId
      bossTags: timelineData.bossTags || (timelineData.bossId ? [timelineData.bossId] : []),
      bossId: timelineData.bossId || null, // Keep for backward compatibility
      // Store boss metadata if provided (level, name, icon, etc.)
      bossMetadata: timelineData.bossMetadata || null,
      userId: userId,
      ownerId: userId, // For backward compatibility
      actions: timelineData.actions || [], // Array of boss actions (both existing and custom)
      description: timelineData.description || '',
      isPublic: timelineData.isPublic || false,
      official: timelineData.official || false, // Mark official timelines
      createdAt: timelineData.createdAt || Date.now(),
      updatedAt: Date.now(),
      version: 2.1, // Increment version for boss metadata support
      likeCount: 0, // Initialize like count
      likedBy: {} // Initialize empty liked by map
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
 * Get all timelines for a user (includes owned timelines and collection references)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of timelines with metadata indicating ownership
 */
export const getUserTimelines = async (userId) => {
  try {
    console.log('[TimelineService] Fetching timelines for user:', userId);

    // Fetch owned timelines
    const timelinesRef = ref(database, TIMELINES_PATH);
    const userTimelinesQuery = query(timelinesRef, orderByChild('userId'), equalTo(userId));
    const ownedSnapshot = await get(userTimelinesQuery);

    const ownedTimelines = [];
    if (ownedSnapshot.exists()) {
      ownedSnapshot.forEach((childSnapshot) => {
        ownedTimelines.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
          isOwned: true,
          inCollection: false
        });
      });
    }

    // Fetch collection timeline IDs
    const collectionIds = await getCollectionTimelineIds(userId);

    // Fetch timeline data for collection references
    const collectionTimelines = [];
    for (const timelineId of collectionIds) {
      try {
        const timeline = await getTimeline(timelineId);
        if (timeline) {
          // Check if this timeline is already in owned timelines
          const isAlreadyOwned = ownedTimelines.some(t => t.id === timelineId);
          if (!isAlreadyOwned) {
            collectionTimelines.push({
              ...timeline,
              isOwned: false,
              inCollection: true
            });
          } else {
            // Mark owned timeline as also in collection
            const ownedTimeline = ownedTimelines.find(t => t.id === timelineId);
            if (ownedTimeline) {
              ownedTimeline.inCollection = true;
            }
          }
        }
      } catch (error) {
        console.warn('[TimelineService] Failed to fetch collection timeline:', timelineId, error);
        // Continue with other timelines even if one fails
      }
    }

    // Combine owned and collection timelines
    const allTimelines = [...ownedTimelines, ...collectionTimelines];

    // Sort by updatedAt (most recent first)
    allTimelines.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    console.log('[TimelineService] Retrieved timelines:', {
      owned: ownedTimelines.length,
      collection: collectionTimelines.length,
      total: allTimelines.length
    });

    return allTimelines;
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

/**
 * Get all official timelines
 * @returns {Promise<Array>} Array of official timelines
 */
export const getOfficialTimelines = async () => {
  try {
    console.log('[TimelineService] Fetching official timelines');

    const timelinesRef = ref(database, TIMELINES_PATH);
    const officialTimelinesQuery = query(timelinesRef, orderByChild('official'), equalTo(true));
    const snapshot = await get(officialTimelinesQuery);

    if (snapshot.exists()) {
      const timelines = [];
      snapshot.forEach((childSnapshot) => {
        timelines.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Sort by name
      timelines.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      console.log('[TimelineService] Retrieved official timelines:', timelines.length);
      return timelines;
    } else {
      console.log('[TimelineService] No official timelines found');
      return [];
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching official timelines:', error);
    throw error;
  }
};

/**
 * Add a boss tag to a timeline
 * @param {string} timelineId - Timeline ID
 * @param {string} bossTag - Boss tag to add (can be boss ID or custom name)
 * @returns {Promise<void>}
 */
export const addBossTag = async (timelineId, bossTag) => {
  try {
    const timeline = await getTimeline(timelineId);
    const currentTags = timeline.bossTags || [];

    // Avoid duplicates
    if (!currentTags.includes(bossTag)) {
      const updatedTags = [...currentTags, bossTag];
      await updateTimeline(timelineId, { bossTags: updatedTags });
    }
  } catch (error) {
    console.error('[TimelineService] Error adding boss tag:', error);
    throw new Error('Failed to add boss tag');
  }
};

/**
 * Remove a boss tag from a timeline
 * @param {string} timelineId - Timeline ID
 * @param {string} bossTag - Boss tag to remove
 * @returns {Promise<void>}
 */
export const removeBossTag = async (timelineId, bossTag) => {
  try {
    const timeline = await getTimeline(timelineId);
    const currentTags = timeline.bossTags || [];
    const updatedTags = currentTags.filter(tag => tag !== bossTag);
    await updateTimeline(timelineId, { bossTags: updatedTags });
  } catch (error) {
    console.error('[TimelineService] Error removing boss tag:', error);
    throw new Error('Failed to remove boss tag');
  }
};

/**
 * Update a specific action in a timeline
 * @param {string} timelineId - Timeline ID
 * @param {string} actionId - Action ID to update
 * @param {object} updates - Fields to update in the action
 * @returns {Promise<void>}
 */
export const updateTimelineAction = async (timelineId, actionId, updates) => {
  try {
    const timeline = await getTimeline(timelineId);
    const updatedActions = timeline.actions.map(action =>
      action.id === actionId ? { ...action, ...updates } : action
    );
    await updateTimeline(timelineId, { actions: updatedActions });
  } catch (error) {
    console.error('[TimelineService] Error updating timeline action:', error);
    throw new Error('Failed to update timeline action');
  }
};

/**
 * Get timelines by boss tag (for both official and custom timelines)
 * @param {string} bossTag - Boss tag to filter by
 * @param {boolean} officialOnly - If true, only return official timelines
 * @returns {Promise<Array>} Array of timelines matching the boss tag
 */
export const getTimelinesByBossTag = async (bossTag, officialOnly = false) => {
  try {
    console.log('[TimelineService] Fetching timelines for boss tag:', bossTag);

    const timelinesRef = ref(database, TIMELINES_PATH);
    const snapshot = await get(timelinesRef);

    if (snapshot.exists()) {
      const timelines = [];
      snapshot.forEach((childSnapshot) => {
        const timeline = childSnapshot.val();
        const bossTags = timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []);

        // Check if timeline matches the boss tag and official filter
        const matchesBossTag = bossTags.includes(bossTag);
        const matchesOfficialFilter = !officialOnly || timeline.official === true;

        if (matchesBossTag && matchesOfficialFilter) {
          timelines.push({
            id: childSnapshot.key,
            ...timeline
          });
        }
      });

      // Sort by official first, then by name
      timelines.sort((a, b) => {
        if (a.official && !b.official) return -1;
        if (!a.official && b.official) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      console.log('[TimelineService] Retrieved timelines for boss tag:', timelines.length);
      return timelines;
    } else {
      console.log('[TimelineService] No timelines found');
      return [];
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching timelines by boss tag:', error);
    throw error;
  }
};

/**
 * Get all unique boss tags from all timelines
 * @returns {Promise<Array<string>>} Array of unique boss tags
 */
export const getAllUniqueBossTags = async () => {
  try {
    console.log('[TimelineService] Fetching all unique boss tags');

    const timelinesRef = ref(database, TIMELINES_PATH);
    const snapshot = await get(timelinesRef);

    if (snapshot.exists()) {
      const tagsSet = new Set();

      snapshot.forEach((childSnapshot) => {
        const timeline = childSnapshot.val();
        const bossTags = timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []);

        bossTags.forEach(tag => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      });

      const uniqueTags = Array.from(tagsSet).sort();
      console.log('[TimelineService] Retrieved unique boss tags:', uniqueTags.length);
      return uniqueTags;
    } else {
      console.log('[TimelineService] No timelines found');
      return [];
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching unique boss tags:', error);
    throw error;
  }
};

/**
 * Get all public timelines with optional sorting
 * @param {string} sortBy - Sort method: 'popularity', 'recent', 'name', 'actions'
 * @returns {Promise<Array>} Array of public timelines
 */
export const getAllPublicTimelines = async (sortBy = 'popularity') => {
  try {
    console.log('[TimelineService] Fetching all public timelines, sortBy:', sortBy);

    const timelinesRef = ref(database, TIMELINES_PATH);
    const publicTimelinesQuery = query(timelinesRef, orderByChild('isPublic'), equalTo(true));
    const snapshot = await get(publicTimelinesQuery);

    if (snapshot.exists()) {
      const timelines = [];
      snapshot.forEach((childSnapshot) => {
        timelines.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Sort based on the sortBy parameter
      switch (sortBy) {
        case 'popularity':
          // Sort by like count, then by official status, then by name
          timelines.sort((a, b) => {
            const likesA = a.likeCount || 0;
            const likesB = b.likeCount || 0;
            if (likesA !== likesB) return likesB - likesA;
            if (a.official && !b.official) return -1;
            if (!a.official && b.official) return 1;
            return (a.name || '').localeCompare(b.name || '');
          });
          break;
        case 'recent':
          // Sort by most recently updated
          timelines.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          break;
        case 'name':
          // Sort alphabetically by name
          timelines.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'actions':
          // Sort by number of actions (descending)
          timelines.sort((a, b) => {
            const actionsA = a.actions?.length || 0;
            const actionsB = b.actions?.length || 0;
            return actionsB - actionsA;
          });
          break;
        default:
          // Default to popularity
          timelines.sort((a, b) => {
            const likesA = a.likeCount || 0;
            const likesB = b.likeCount || 0;
            if (likesA !== likesB) return likesB - likesA;
            if (a.official && !b.official) return -1;
            if (!a.official && b.official) return 1;
            return (a.name || '').localeCompare(b.name || '');
          });
      }

      console.log('[TimelineService] Retrieved public timelines:', timelines.length);
      return timelines;
    } else {
      console.log('[TimelineService] No public timelines found');
      return [];
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching public timelines:', error);
    throw error;
  }
};

/**
 * Make all timelines public (batch update)
 * @returns {Promise<number>} Number of timelines updated
 */
export const makeAllTimelinesPublic = async () => {
  try {
    console.log('[TimelineService] Making all timelines public');

    const timelinesRef = ref(database, TIMELINES_PATH);
    const snapshot = await get(timelinesRef);

    if (!snapshot.exists()) {
      console.log('[TimelineService] No timelines found');
      return 0;
    }

    const updates = {};
    let count = 0;

    snapshot.forEach((childSnapshot) => {
      const timelineId = childSnapshot.key;
      const timeline = childSnapshot.val();

      // Only update if not already public
      if (!timeline.isPublic) {
        updates[`${TIMELINES_PATH}/${timelineId}/isPublic`] = true;
        updates[`${TIMELINES_PATH}/${timelineId}/updatedAt`] = Date.now();
        count++;
      }
    });

    if (count > 0) {
      await update(ref(database), updates);
      console.log('[TimelineService] Successfully made', count, 'timelines public');
    } else {
      console.log('[TimelineService] All timelines are already public');
    }

    return count;
  } catch (error) {
    console.error('[TimelineService] Error making timelines public:', error);
    throw error;
  }
};

/**
 * Toggle like on a timeline
 * @param {string} timelineId - Timeline ID
 * @param {string} userId - User ID
 * @returns {Promise<{liked: boolean, likeCount: number}>} New like state and count
 */
export const toggleLike = async (timelineId, userId) => {
  try {
    console.log('[TimelineService] Toggling like:', { timelineId, userId });

    if (!timelineId || !userId) {
      throw new Error('Timeline ID and User ID are required');
    }

    const timelineRef = ref(database, `${TIMELINES_PATH}/${timelineId}`);
    const likedByRef = ref(database, `${TIMELINES_PATH}/${timelineId}/likedBy/${userId}`);

    // Check if user already liked
    const likedSnapshot = await get(likedByRef);
    const hasLiked = likedSnapshot.exists();

    // Get current timeline data
    const timelineSnapshot = await get(timelineRef);
    if (!timelineSnapshot.exists()) {
      throw new Error('Timeline not found');
    }

    const timeline = timelineSnapshot.val();
    const currentLikeCount = timeline.likeCount || 0;

    // Update like status
    const updates = {};
    if (hasLiked) {
      // Unlike
      updates[`${TIMELINES_PATH}/${timelineId}/likedBy/${userId}`] = null;
      updates[`${TIMELINES_PATH}/${timelineId}/likeCount`] = Math.max(0, currentLikeCount - 1);
    } else {
      // Like
      updates[`${TIMELINES_PATH}/${timelineId}/likedBy/${userId}`] = {
        timestamp: Date.now(),
        userId: userId
      };
      updates[`${TIMELINES_PATH}/${timelineId}/likeCount`] = currentLikeCount + 1;
    }

    await update(ref(database), updates);

    const newLikeCount = hasLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1;

    console.log('[TimelineService] Like toggled successfully:', {
      liked: !hasLiked,
      likeCount: newLikeCount
    });

    return {
      liked: !hasLiked,
      likeCount: newLikeCount
    };
  } catch (error) {
    console.error('[TimelineService] Error toggling like:', error);
    throw new Error('Failed to toggle like');
  }
};

/**
 * Check if user has liked a timeline
 * @param {string} timelineId - Timeline ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether user has liked the timeline
 */
export const hasUserLiked = async (timelineId, userId) => {
  try {
    if (!timelineId || !userId) {
      return false;
    }

    const likedByRef = ref(database, `${TIMELINES_PATH}/${timelineId}/likedBy/${userId}`);
    const snapshot = await get(likedByRef);
    return snapshot.exists();
  } catch (error) {
    console.error('[TimelineService] Error checking like status:', error);
    return false;
  }
};

/**
 * Get like count for a timeline
 * @param {string} timelineId - Timeline ID
 * @returns {Promise<number>} Like count
 */
export const getLikeCount = async (timelineId) => {
  try {
    if (!timelineId) {
      return 0;
    }

    const likeCountRef = ref(database, `${TIMELINES_PATH}/${timelineId}/likeCount`);
    const snapshot = await get(likeCountRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (error) {
    console.error('[TimelineService] Error getting like count:', error);
    return 0;
  }
};

/**
 * Add a timeline to user's collection (creates a reference, not a copy)
 * @param {string} userId - User ID
 * @param {string} timelineId - Timeline ID to add to collection
 * @returns {Promise<void>}
 */
export const addToCollection = async (userId, timelineId) => {
  try {
    console.log('[TimelineService] Adding timeline to collection:', { userId, timelineId });

    // Verify timeline exists
    const timeline = await getTimeline(timelineId);
    if (!timeline) {
      throw new Error('Timeline not found');
    }

    // Add reference to user's collection
    const collectionRef = ref(database, `${USER_COLLECTIONS_PATH}/${userId}/timelines/${timelineId}`);
    await set(collectionRef, {
      addedAt: Date.now(),
      timelineId: timelineId
    });

    console.log('[TimelineService] Timeline added to collection successfully');
  } catch (error) {
    console.error('[TimelineService] Error adding timeline to collection:', error);
    throw new Error('Failed to add timeline to collection');
  }
};

/**
 * Remove a timeline from user's collection
 * @param {string} userId - User ID
 * @param {string} timelineId - Timeline ID to remove from collection
 * @returns {Promise<void>}
 */
export const removeFromCollection = async (userId, timelineId) => {
  try {
    console.log('[TimelineService] Removing timeline from collection:', { userId, timelineId });

    const collectionRef = ref(database, `${USER_COLLECTIONS_PATH}/${userId}/timelines/${timelineId}`);
    await remove(collectionRef);

    console.log('[TimelineService] Timeline removed from collection successfully');
  } catch (error) {
    console.error('[TimelineService] Error removing timeline from collection:', error);
    throw new Error('Failed to remove timeline from collection');
  }
};

/**
 * Check if a timeline is in user's collection
 * @param {string} userId - User ID
 * @param {string} timelineId - Timeline ID to check
 * @returns {Promise<boolean>}
 */
export const isInCollection = async (userId, timelineId) => {
  try {
    const collectionRef = ref(database, `${USER_COLLECTIONS_PATH}/${userId}/timelines/${timelineId}`);
    const snapshot = await get(collectionRef);
    return snapshot.exists();
  } catch (error) {
    console.error('[TimelineService] Error checking collection:', error);
    return false;
  }
};

/**
 * Get timeline IDs in user's collection
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of timeline IDs
 */
export const getCollectionTimelineIds = async (userId) => {
  try {
    console.log('[TimelineService] Fetching collection timeline IDs for user:', userId);

    const collectionRef = ref(database, `${USER_COLLECTIONS_PATH}/${userId}/timelines`);
    const snapshot = await get(collectionRef);

    if (snapshot.exists()) {
      const timelineIds = [];
      snapshot.forEach((childSnapshot) => {
        timelineIds.push(childSnapshot.key);
      });
      console.log('[TimelineService] Retrieved collection timeline IDs:', timelineIds.length);
      return timelineIds;
    } else {
      console.log('[TimelineService] No collection timelines found for user');
      return [];
    }
  } catch (error) {
    console.error('[TimelineService] Error fetching collection timeline IDs:', error);
    throw error;
  }
};

/**
 * Toggle the public/private status of a timeline
 * @param {string} timelineId - Timeline ID
 * @param {boolean} isPublic - New public status
 * @returns {Promise<void>}
 */
export const togglePublicStatus = async (timelineId, isPublic) => {
  try {
    console.log('[TimelineService] Toggling public status for timeline:', timelineId, 'to:', isPublic);

    await updateTimeline(timelineId, { isPublic });

    console.log('[TimelineService] Public status updated successfully');
  } catch (error) {
    console.error('[TimelineService] Error toggling public status:', error);
    throw new Error('Failed to update timeline visibility');
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
  importTimeline,
  getOfficialTimelines,
  addBossTag,
  removeBossTag,
  updateTimelineAction,
  getTimelinesByBossTag,
  getAllUniqueBossTags,
  getAllPublicTimelines,
  makeAllTimelinesPublic,
  toggleLike,
  hasUserLiked,
  getLikeCount,
  addToCollection,
  removeFromCollection,
  isInCollection,
  getCollectionTimelineIds,
  togglePublicStatus
};

