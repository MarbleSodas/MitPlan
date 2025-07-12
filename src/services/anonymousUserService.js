/**
 * Anonymous User Service
 * Manages anonymous user sessions, temporary IDs, and localStorage data
 */

import { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '../utils/storage/storageUtils';

// Constants for localStorage keys
const ANONYMOUS_USER_KEY = 'mitplan_anonymous_user';
const ANONYMOUS_PLANS_KEY = 'mitplan_anonymous_plans';
const ANONYMOUS_DISPLAY_NAME_KEY = 'mitplan_display_name';
const ANONYMOUS_SESSION_KEY = 'mitplan_anonymous_session';

/**
 * Generate a unique anonymous user ID
 */
export const generateAnonymousUserId = () => {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a unique session ID for anonymous users
 */
export const generateAnonymousSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a default display name for anonymous users
 */
export const generateAnonymousDisplayName = () => {
  const adjectives = ['Quick', 'Smart', 'Brave', 'Swift', 'Clever', 'Bold', 'Wise', 'Sharp'];
  const nouns = ['Warrior', 'Scholar', 'Healer', 'Guardian', 'Mage', 'Ranger', 'Knight', 'Sage'];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;

  return `${adjective} ${noun} ${number}`;
};

/**
 * Anonymous User class to manage anonymous user state
 */
class AnonymousUser {
  constructor() {
    this.id = null;
    this.displayName = null;
    this.sessionId = null;
    this.createdAt = null;
    this.isAnonymous = true;
    this.plans = [];
    this.accessedPlans = [];
    this.planAccess = {}; // Track detailed access information
  }

  /**
   * Initialize anonymous user from localStorage or create new
   */
  static initialize() {
    const existingUser = loadFromLocalStorage(ANONYMOUS_USER_KEY);
    const user = new AnonymousUser();

    if (existingUser) {
      user.id = existingUser.id;
      user.displayName = existingUser.displayName;
      user.sessionId = existingUser.sessionId;
      user.createdAt = existingUser.createdAt;
      user.plans = existingUser.plans || [];
      user.accessedPlans = existingUser.accessedPlans || [];
      user.planAccess = existingUser.planAccess || {};

      // Auto-generate display name if missing
      if (!user.displayName || user.displayName.trim() === '') {
        user.displayName = generateAnonymousDisplayName();
        user.save();
      }
    } else {
      user.id = generateAnonymousUserId();
      user.sessionId = generateAnonymousSessionId();
      user.createdAt = new Date().toISOString();
      user.displayName = generateAnonymousDisplayName(); // Auto-generate display name
      user.save();
    }

    return user;
  }

  /**
   * Save anonymous user data to localStorage
   */
  save() {
    const userData = {
      id: this.id,
      displayName: this.displayName,
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      isAnonymous: this.isAnonymous,
      plans: this.plans,
      accessedPlans: this.accessedPlans,
      planAccess: this.planAccess || {}
    };

    saveToLocalStorage(ANONYMOUS_USER_KEY, userData);
    
    // Also save display name separately for easy access
    if (this.displayName) {
      saveToLocalStorage(ANONYMOUS_DISPLAY_NAME_KEY, this.displayName);
    }
  }

  /**
   * Set display name for anonymous user
   */
  setDisplayName(name) {
    this.displayName = name;
    this.save();
  }

  /**
   * Add a plan to the user's created plans
   */
  addPlan(planId) {
    if (!this.plans.includes(planId)) {
      this.plans.push(planId);
      this.save();
    }
  }

  /**
   * Add a plan to the user's accessed plans
   */
  addAccessedPlan(planId) {
    if (!this.accessedPlans.includes(planId)) {
      this.accessedPlans.push(planId);
      this.save();
    }
  }

  /**
   * Remove a plan from user's plans
   */
  removePlan(planId) {
    this.plans = this.plans.filter(id => id !== planId);
    this.accessedPlans = this.accessedPlans.filter(id => id !== planId);
    this.save();
  }

  /**
   * Check if user owns a plan
   */
  ownsPlan(planId) {
    return this.plans.includes(planId);
  }

  /**
   * Check if user has accessed a plan
   */
  hasAccessedPlan(planId) {
    return this.accessedPlans.includes(planId);
  }

  /**
   * Get all plans (owned and accessed)
   */
  getAllPlans() {
    return [...new Set([...this.plans, ...this.accessedPlans])];
  }

  /**
   * Clear all anonymous user data
   */
  clear() {
    removeFromLocalStorage(ANONYMOUS_USER_KEY);
    removeFromLocalStorage(ANONYMOUS_DISPLAY_NAME_KEY);
    removeFromLocalStorage(ANONYMOUS_SESSION_KEY);
  }

  /**
   * Export user data for migration to authenticated account
   */
  exportForMigration() {
    return {
      anonymousUserId: this.id,
      displayName: this.displayName,
      createdAt: this.createdAt,
      ownedPlans: this.plans,
      accessedPlans: this.accessedPlans,
      planAccess: this.planAccess || {},
      migrationTimestamp: new Date().toISOString()
    };
  }
}

/**
 * Anonymous User Service
 */
class AnonymousUserService {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Initialize the service and get current anonymous user
   */
  initialize() {
    this.currentUser = AnonymousUser.initialize();
    return this.currentUser;
  }

  /**
   * Get current anonymous user
   */
  getCurrentUser() {
    if (!this.currentUser) {
      this.currentUser = AnonymousUser.initialize();
    }
    return this.currentUser;
  }

  /**
   * Set display name for current user
   */
  setDisplayName(name) {
    const user = this.getCurrentUser();
    user.setDisplayName(name);
    return user;
  }

  /**
   * Get display name from localStorage
   */
  getDisplayName() {
    return loadFromLocalStorage(ANONYMOUS_DISPLAY_NAME_KEY);
  }

  /**
   * Check if user is anonymous
   */
  isAnonymous() {
    return true; // This service only handles anonymous users
  }

  /**
   * Generate a new session ID for the current user
   */
  generateNewSessionId() {
    const user = this.getCurrentUser();
    user.sessionId = generateAnonymousSessionId();
    user.save();
    return user.sessionId;
  }

  /**
   * Clear all anonymous user data (for account migration)
   */
  clearAnonymousData() {
    if (this.currentUser) {
      this.currentUser.clear();
      this.currentUser = null;
    }
  }

  /**
   * Prepare data for migration to authenticated account
   */
  prepareMigrationData() {
    const user = this.getCurrentUser();
    return user.exportForMigration();
  }
}

// Create and export singleton instance
const anonymousUserService = new AnonymousUserService();

export default anonymousUserService;
export { AnonymousUser };
