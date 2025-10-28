/**
 * Boss Actions Library
 * A centralized collection of all unique boss actions that can be reused across timelines
 * This library allows users to pick and customize actions for their custom timelines
 */

import sugarRiotActions from './bosses/sugar-riot_actions.json';
import dancingGreenActions from './bosses/dancing-green_actions.json';
import lalaActions from './bosses/lala_actions.json';
import staticeActions from './bosses/statice_actions.json';
import bruteAbominatorActions from './bosses/brute-abominator_actions.json';
import howlingBladeActions from './bosses/howling-blade_actions.json';
import necronActions from './bosses/necron_actions.json';
import ketudukeActions from './bosses/ketudukeActions.json';

/**
 * All boss actions organized by boss ID
 * This maintains the original boss-specific organization for reference
 */
export const bossActionsMap = {
  'sugar-riot': sugarRiotActions,
  'dancing-green-m5s': dancingGreenActions,
  'lala': lalaActions,
  'statice': staticeActions,
  'brute-abominator-m7s': bruteAbominatorActions,
  'howling-blade-m8s': howlingBladeActions,
  'necron': necronActions,
  'ketuduke': ketudukeActions
};

/**
 * Extract all unique boss actions from all bosses
 * Creates a flat library of all available actions
 * Only includes one instance of each action name (first occurrence)
 */
const extractAllActions = () => {
  const allActions = [];
  const seenActionNames = new Set();

  Object.entries(bossActionsMap).forEach(([bossId, actions]) => {
    actions.forEach(action => {
      // Only add actions with unique names (first occurrence wins)
      if (!seenActionNames.has(action.name)) {
        // Add boss source information to each action
        const actionWithSource = {
          ...action,
          sourceBoss: bossId,
          libraryId: `${bossId}_${action.id}` // Unique ID for library
        };

        allActions.push(actionWithSource);
        seenActionNames.add(action.name);
      }
    });
  });

  return allActions;
};

/**
 * Categorize actions by type for easier browsing
 */
const categorizeActions = (actions) => {
  const categories = {
    tankBusters: [],
    raidwide: [],
    mechanics: [],
    all: actions
  };

  actions.forEach(action => {
    if (action.isTankBuster || action.isDualTankBuster) {
      categories.tankBusters.push(action);
    } else if (action.importance === 'high' || action.importance === 'critical') {
      categories.raidwide.push(action);
    } else {
      categories.mechanics.push(action);
    }
  });

  return categories;
};

/**
 * Get actions by damage type
 */
const getActionsByDamageType = (actions, damageType) => {
  return actions.filter(action => action.damageType === damageType);
};

/**
 * Get actions by importance level
 */
const getActionsByImportance = (actions, importance) => {
  return actions.filter(action => action.importance === importance);
};

/**
 * Search actions by name or description
 */
const searchActions = (actions, searchTerm) => {
  const term = searchTerm.toLowerCase();
  return actions.filter(action => 
    action.name.toLowerCase().includes(term) ||
    (action.description && action.description.toLowerCase().includes(term))
  );
};

/**
 * Get unique action names (for template selection)
 */
const getUniqueActionNames = (actions) => {
  const uniqueNames = new Set();
  const uniqueActions = [];

  actions.forEach(action => {
    if (!uniqueNames.has(action.name)) {
      uniqueNames.add(action.name);
      uniqueActions.push(action);
    }
  });

  return uniqueActions;
};

// Generate the library
export const bossActionsLibrary = extractAllActions();
export const categorizedActions = categorizeActions(bossActionsLibrary);
export const uniqueActionTemplates = getUniqueActionNames(bossActionsLibrary);

// Export utility functions
export const libraryUtils = {
  getActionsByDamageType,
  getActionsByImportance,
  searchActions,
  categorizeActions,
  getUniqueActionNames
};

/**
 * Create a custom action template
 * This provides a base structure for users to create their own actions
 */
export const createCustomActionTemplate = (overrides = {}) => {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name: overrides.name || 'Custom Action',
    time: overrides.time || 0,
    description: overrides.description || '',
    icon: overrides.icon || '⚔️',
    damageType: overrides.damageType || 'magical',
    importance: overrides.importance || 'medium',
    unmitigatedDamage: overrides.unmitigatedDamage || '',
    isTankBuster: overrides.isTankBuster || false,
    isDualTankBuster: overrides.isDualTankBuster || false,
    isCustom: true,
    source: 'custom',
    ...overrides
  };
};

/**
 * Clone an action from the library with custom modifications
 */
export const cloneActionFromLibrary = (libraryAction, modifications = {}) => {
  return {
    ...libraryAction,
    id: `cloned_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    isCloned: true,
    originalLibraryId: libraryAction.libraryId,
    ...modifications
  };
};

export default {
  bossActionsLibrary,
  categorizedActions,
  uniqueActionTemplates,
  bossActionsMap,
  libraryUtils,
  createCustomActionTemplate,
  cloneActionFromLibrary
};

