/**
 * Firebase Helper Utilities
 *
 * Common utility functions for Firebase operations
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Convert Firestore timestamp to JavaScript Date
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds || 0).toDate();
  }
  return new Date(timestamp);
};

/**
 * Convert JavaScript Date to Firestore timestamp
 */
export const dateToTimestamp = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  return Timestamp.fromDate(new Date(date));
};

/**
 * Sanitize data for Firestore (remove undefined values)
 */
export const sanitizeForFirestore = (data) => {
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore).filter(item => item !== undefined);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    Object.keys(data).forEach(key => {
      const value = sanitizeForFirestore(data[key]);
      if (value !== undefined) {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }

  return data;
};

/**
 * Convert plan data from Firestore format to application format
 */
export const normalizePlanFromFirestore = (planData) => {
  if (!planData) return null;

  return {
    ...planData,
    createdAt: timestampToDate(planData.createdAt),
    updatedAt: timestampToDate(planData.updatedAt),
    accessedAt: timestampToDate(planData.accessedAt),
    // Ensure required fields have default values
    assignments: planData.assignments || {},
    selectedJobs: planData.selectedJobs || [],
    tankPositions: planData.tankPositions || {},
    isPublic: planData.isPublic || false,
    version: planData.version || 1
  };
};

/**
 * Convert plan data from application format to Firestore format
 */
export const normalizePlanForFirestore = (planData) => {
  if (!planData) return null;

  const normalized = {
    ...planData,
    // Convert dates to timestamps if they exist
    createdAt: planData.createdAt ? dateToTimestamp(planData.createdAt) : null,
    updatedAt: planData.updatedAt ? dateToTimestamp(planData.updatedAt) : null,
    accessedAt: planData.accessedAt ? dateToTimestamp(planData.accessedAt) : null
  };

  // Remove undefined values and client-only fields
  delete normalized.id; // Firestore document ID is separate

  return sanitizeForFirestore(normalized);
};

/**
 * Convert user data from Firestore format to application format
 */
export const normalizeUserFromFirestore = (userData) => {
  if (!userData) return null;

  return {
    ...userData,
    createdAt: timestampToDate(userData.createdAt),
    lastLogin: timestampToDate(userData.lastLogin),
    updatedAt: timestampToDate(userData.updatedAt),
    // Ensure required fields have default values
    preferences: userData.preferences || {
      theme: 'dark',
      defaultBoss: 'ketuduke',
      notifications: true
    },
    emailVerified: userData.emailVerified || false,
    // Handle legacy avatar_url field and new profile picture fields
    profilePictureUrl: userData.profilePictureUrl || userData.avatarUrl || null,
    profilePicturePath: userData.profilePicturePath || null,
    // Keep legacy field for backward compatibility
    avatar_url: userData.profilePictureUrl || userData.avatarUrl || null,
    display_name: userData.displayName || userData.display_name || null
  };
};

/**
 * Convert user data from application format to Firestore format
 */
export const normalizeUserForFirestore = (userData) => {
  if (!userData) return null;

  const normalized = {
    ...userData,
    // Convert dates to timestamps if they exist
    createdAt: userData.createdAt ? dateToTimestamp(userData.createdAt) : null,
    lastLogin: userData.lastLogin ? dateToTimestamp(userData.lastLogin) : null,
    updatedAt: userData.updatedAt ? dateToTimestamp(userData.updatedAt) : null
  };

  // Remove undefined values and client-only fields
  delete normalized.id; // Firestore document ID is separate

  return sanitizeForFirestore(normalized);
};

/**
 * Generate a shareable URL for a plan
 */
export const generateShareUrl = (planId, baseUrl = window.location.origin) => {
  return `${baseUrl}/plan/shared/${planId}`;
};

/**
 * Extract plan ID from a share URL
 */
export const extractPlanIdFromUrl = (url) => {
  const match = url.match(/\/plan\/shared\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

/**
 * Sanitize plan ID for Firebase Realtime Database paths
 * Firebase Realtime Database keys cannot contain: . $ # [ ] /
 * and some other special characters
 */
export const sanitizePlanIdForRealtimeDb = (planId) => {
  if (!planId) return null;

  // Replace any problematic characters with safe alternatives
  // Firebase Realtime Database allows: a-z A-Z 0-9 - _
  return planId
    .replace(/[.#$[\]/]/g, '_') // Replace forbidden characters with underscore
    .replace(/[^a-zA-Z0-9-_]/g, '_'); // Replace any other special characters
};

/**
 * Generate a Firebase Realtime Database safe path for collaboration
 */
export const getCollaborationPath = (planId, ...pathSegments) => {
  const sanitizedPlanId = sanitizePlanIdForRealtimeDb(planId);
  const basePath = `collaboration/${sanitizedPlanId}`;

  if (pathSegments.length > 0) {
    return `${basePath}/${pathSegments.join('/')}`;
  }

  return basePath;
};

/**
 * Validate plan data structure
 */
export const validatePlanData = (planData) => {
  const errors = [];

  if (!planData.name || typeof planData.name !== 'string' || planData.name.trim().length === 0) {
    errors.push('Plan name is required');
  }

  if (!planData.bossId || typeof planData.bossId !== 'string') {
    errors.push('Boss ID is required');
  }

  if (!planData.userId || typeof planData.userId !== 'string') {
    errors.push('User ID is required');
  }

  if (planData.selectedJobs && !Array.isArray(planData.selectedJobs)) {
    errors.push('Selected jobs must be an array');
  }

  if (planData.assignments && typeof planData.assignments !== 'object') {
    errors.push('Assignments must be an object');
  }

  if (planData.tankPositions && typeof planData.tankPositions !== 'object') {
    errors.push('Tank positions must be an object');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user data structure
 */
export const validateUserData = (userData) => {
  const errors = [];

  if (!userData.email || typeof userData.email !== 'string' || !userData.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!userData.displayName || typeof userData.displayName !== 'string' || userData.displayName.trim().length === 0) {
    errors.push('Display name is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Handle Firebase errors and convert to user-friendly messages
 */
export const handleFirebaseError = (error) => {
  console.error('Firebase error:', error);

  // Common Firebase error codes and their user-friendly messages
  const errorMessages = {
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'The requested resource was not found',
    'already-exists': 'This resource already exists',
    'resource-exhausted': 'Too many requests. Please try again later',
    'failed-precondition': 'The operation failed due to a conflict',
    'aborted': 'The operation was aborted due to a conflict',
    'out-of-range': 'The operation was attempted past the valid range',
    'unimplemented': 'This operation is not implemented',
    'internal': 'An internal error occurred',
    'unavailable': 'The service is currently unavailable',
    'data-loss': 'Unrecoverable data loss or corruption',
    'unauthenticated': 'You must be signed in to perform this action'
  };

  const code = error.code || error.message;
  return errorMessages[code] || error.message || 'An unexpected error occurred';
};

/**
 * Retry a Firebase operation with exponential backoff
 */
export const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain error types
      if (error.code === 'permission-denied' ||
          error.code === 'not-found' ||
          error.code === 'unauthenticated') {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Debounce function for real-time updates
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for frequent operations
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
