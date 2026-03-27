import { auth, database } from '../config/firebase';
import { ref, get, set } from 'firebase/database';

/**
 * Enhanced User Service for fetching user information
 * Handles authenticated Firebase users
 * Implements caching and multiple lookup strategies
 */

// Cache for user display names to avoid repeated lookups
const displayNameCache = new Map();
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map();

/**
 * Check if cached data is still valid
 */
const isCacheValid = (userId) => {
  const timestamp = cacheTimestamps.get(userId);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_EXPIRY_TIME;
};

/**
 * Set cache with timestamp
 */
const setCache = (userId, displayName) => {
  displayNameCache.set(userId, displayName);
  cacheTimestamps.set(userId, Date.now());
};

/**
 * Collaboration display names should come from the current active session,
 * not from scanning every plan in the database.
 */
const getDisplayNameFromCollaboration = async (userId) => {
  return null;
};

/**
 * Try to get display name from user profiles stored in Firebase
 * This looks up user profile data that we store when users first interact with the system
 */
const getDisplayNameFromUserProfile = async (userId) => {
  try {
    const userProfileRef = ref(database, `userProfiles/${userId}`);
    const snapshot = await get(userProfileRef);

    if (snapshot.exists()) {
      const profile = snapshot.val();
      console.log('[UserService] Found display name from user profile:', profile.displayName);
      return profile.displayName;
    }

    return null;
  } catch (error) {
    console.error('[UserService] Error fetching from user profiles:', error);
    return null;
  }
};

/**
 * Store or update user profile information
 * This is called when a user first interacts with the system or updates their profile
 */
export const storeUserProfile = async (userId, displayName, email = null) => {
  try {
    const userProfileRef = ref(database, `userProfiles/${userId}`);
    const profileData = {
      displayName,
      email: email || null,
      lastUpdated: Date.now(),
      lastSeen: Date.now()
    };

    await set(userProfileRef, profileData);
    console.log('[UserService] User profile stored for:', userId, displayName);

    // Update cache
    setCache(userId, displayName);
  } catch (error) {
    console.error('[UserService] Error storing user profile:', error);
  }
};

/**
 * Update user's last seen timestamp
 */
export const updateUserLastSeen = async (userId) => {
  try {
    const userProfileRef = ref(database, `userProfiles/${userId}/lastSeen`);
    await set(userProfileRef, Date.now());
  } catch (error) {
    console.error('[UserService] Error updating last seen:', error);
  }
};

/**
 * Get display name for a user by their ID
 * @param {string} userId - The user ID (Firebase UID)
 * @returns {Promise<string>} The user's display name
 */
export const getUserDisplayName = async (userId) => {
  try {
    console.log('[UserService] Getting display name for user:', userId);

    // Check cache first
    if (displayNameCache.has(userId) && isCacheValid(userId)) {
      console.log('[UserService] Using cached display name');
      return displayNameCache.get(userId);
    }

    let displayName = null;

    const currentUser = auth.currentUser;

    if (currentUser && currentUser.uid === userId) {
      displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      console.log('[UserService] Found current authenticated user display name:', displayName);
    } else {
      displayName = await getDisplayNameFromUserProfile(userId);

      if (!displayName) {
        displayName = await getDisplayNameFromCollaboration(userId);
      }

      if (!displayName) {
        if (userId && userId.includes('@')) {
          displayName = userId.split('@')[0];
          console.log('[UserService] Using email-based display name for user:', displayName);
        } else if (userId && userId.length > 0) {
          displayName = `User (${userId.substring(0, 8)}...)`;
          console.log('[UserService] Using ID-based display name for user:', displayName);
        } else {
          displayName = 'Unknown User';
          console.log('[UserService] Using unknown user fallback');
        }
        console.log('[UserService] Final display name for other user:', displayName);
      }
    }

    // Cache the result
    setCache(userId, displayName);

    console.log('[UserService] Final display name for', userId, ':', displayName);
    return displayName;
  } catch (error) {
    console.error('[UserService] Error getting user display name:', error);
    return 'Unknown User';
  }
};

/**
 * Get display name for multiple users with batch optimization
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Object mapping user IDs to display names
 */
export const getUserDisplayNames = async (userIds) => {
  try {
    const displayNames = {};
    const uncachedUserIds = [];

    // Check cache first for all users
    userIds.forEach(userId => {
      if (displayNameCache.has(userId) && isCacheValid(userId)) {
        displayNames[userId] = displayNameCache.get(userId);
      } else {
        uncachedUserIds.push(userId);
      }
    });

    // Fetch display names for uncached users
    if (uncachedUserIds.length > 0) {
      await Promise.all(
        uncachedUserIds.map(async (userId) => {
          displayNames[userId] = await getUserDisplayName(userId);
        })
      );
    }

    return displayNames;
  } catch (error) {
    console.error('[UserService] Error getting user display names:', error);
    return {};
  }
};

/**
 * Clear the display name cache
 * Useful when user information might have changed
 */
export const clearDisplayNameCache = () => {
  displayNameCache.clear();
  cacheTimestamps.clear();
  console.log('[UserService] Display name cache cleared');
};

/**
 * Clear cache for a specific user
 * @param {string} userId - The user ID to clear from cache
 */
export const clearUserFromCache = (userId) => {
  displayNameCache.delete(userId);
  cacheTimestamps.delete(userId);
  console.log('[UserService] Cleared cache for user:', userId);
};

/**
 * Get the current user's display name
 * @returns {string} Current user's display name
 */
export const getCurrentUserDisplayName = () => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    return currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  }

  return 'Unknown User';
};

/**
 * Legacy helper retained for compatibility after anonymous mode removal.
 * @param {string} userId - The user ID to check
 * @returns {boolean} Always false
 */
export const isAnonymousUserId = (userId) => {
  return false;
};

/**
 * Preload display names for a list of users
 * Useful for warming up the cache before rendering components
 * @param {string[]} userIds - Array of user IDs to preload
 */
export const preloadUserDisplayNames = async (userIds) => {
  try {
    console.log('[UserService] Preloading display names for users:', userIds);
    await getUserDisplayNames(userIds);
  } catch (error) {
    console.error('[UserService] Error preloading user display names:', error);
  }
};

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  return {
    cacheSize: displayNameCache.size,
    cachedUsers: Array.from(displayNameCache.keys()),
    cacheTimestamps: Array.from(cacheTimestamps.entries())
  };
};

export default {
  getUserDisplayName,
  getUserDisplayNames,
  clearDisplayNameCache,
  clearUserFromCache,
  getCurrentUserDisplayName,
  isAnonymousUserId,
  preloadUserDisplayNames,
  getCacheStats,
  storeUserProfile,
  updateUserLastSeen
};
