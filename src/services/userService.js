import { auth, database } from '../config/firebase';
import { ref, get } from 'firebase/database';
import anonymousUserService from './anonymousUserService';

/**
 * Enhanced User Service for fetching user information
 * Handles both authenticated Firebase users and anonymous users
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
 * Try to get display name from collaboration data in Firebase
 * This looks for recent collaboration sessions where the user might have been active
 */
const getDisplayNameFromCollaboration = async (userId) => {
  try {
    // Look through recent plans to find collaboration data for this user
    const plansRef = ref(database, 'plans');
    const plansSnapshot = await get(plansRef);

    if (plansSnapshot.exists()) {
      const plans = plansSnapshot.val();

      // Search through plans for collaboration data
      for (const planId in plans) {
        const plan = plans[planId];
        if (plan.collaboration && plan.collaboration.activeUsers) {
          const activeUsers = plan.collaboration.activeUsers;

          // Look for sessions by this user
          for (const sessionId in activeUsers) {
            const session = activeUsers[sessionId];
            if (session.userId === userId && session.displayName) {
              console.log('[UserService] Found display name from collaboration data:', session.displayName);
              return session.displayName;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[UserService] Error fetching from collaboration data:', error);
    return null;
  }
};

/**
 * Get display name for a user by their ID
 * @param {string} userId - The user ID (Firebase UID or anonymous user ID)
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

    // Handle anonymous users (IDs start with 'anon_')
    if (userId && userId.startsWith('anon_')) {
      const anonymousUser = anonymousUserService.getCurrentUser();
      if (anonymousUser && anonymousUser.id === userId) {
        displayName = anonymousUser.displayName || 'Anonymous User';
        console.log('[UserService] Found current anonymous user display name:', displayName);
      } else {
        // For other anonymous users, try to find them in collaboration data
        displayName = await getDisplayNameFromCollaboration(userId);
        if (!displayName) {
          displayName = 'Anonymous User';
        }
      }
    } else {
      // Handle authenticated Firebase users
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.uid === userId) {
        // This is the current authenticated user
        displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
        console.log('[UserService] Found current authenticated user display name:', displayName);
      } else {
        // For other authenticated users, try collaboration data first
        displayName = await getDisplayNameFromCollaboration(userId);

        if (!displayName) {
          // Fallback: try to extract a meaningful name from the user ID or use generic name
          if (userId && userId.includes('@')) {
            // If the userId looks like an email, use the part before @
            displayName = userId.split('@')[0];
          } else {
            displayName = 'User';
          }
        }
        console.log('[UserService] Using fallback display name for other user:', displayName);
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

  // Check for anonymous user
  const anonymousUser = anonymousUserService.getCurrentUser();
  if (anonymousUser) {
    return anonymousUser.displayName || 'Anonymous User';
  }

  return 'Unknown User';
};

/**
 * Check if a user ID belongs to an anonymous user
 * @param {string} userId - The user ID to check
 * @returns {boolean} True if the user is anonymous
 */
export const isAnonymousUserId = (userId) => {
  return userId && userId.startsWith('anon_');
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
  getCacheStats
};
