/**
 * Utility functions for local storage operations
 */

/**
 * Save data to localStorage with error handling
 * 
 * @param {string} key - The key to store the data under
 * @param {any} data - The data to store (will be JSON stringified)
 * @returns {boolean} - Whether the operation was successful
 */
export const saveToLocalStorage = (key, data) => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * Load data from localStorage with error handling
 * 
 * @param {string} key - The key to retrieve data from
 * @param {any} defaultValue - The default value to return if the key doesn't exist or there's an error
 * @returns {any} - The parsed data or the default value
 */
export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return defaultValue;
    }
    return JSON.parse(serializedData);
  } catch (error) {
    console.error(`Error loading from localStorage (key: ${key}):`, error);
    return defaultValue;
  }
};

/**
 * Remove data from localStorage with error handling
 * 
 * @param {string} key - The key to remove
 * @returns {boolean} - Whether the operation was successful
 */
export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * Clear all data from localStorage with error handling
 * 
 * @returns {boolean} - Whether the operation was successful
 */
export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

export default {
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  clearLocalStorage
};
