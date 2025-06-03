/**
 * Utility functions for URL operations and link sharing
 */

import { mitigationAbilities, ffxivJobs } from '../../data';

/**
 * Compress a string using base64 encoding
 *
 * @param {string} str - The string to compress
 * @returns {string} - The compressed string
 */
export const compressString = (str) => {
  try {
    // Use built-in btoa function to encode to base64
    return btoa(encodeURIComponent(str));
  } catch (error) {
    console.error('Error compressing string:', error);
    return '';
  }
};

/**
 * Decompress a base64 encoded string
 *
 * @param {string} compressed - The compressed string
 * @returns {string} - The decompressed string
 */
export const decompressString = (compressed) => {
  try {
    // Use built-in atob function to decode from base64
    return decodeURIComponent(atob(compressed));
  } catch (error) {
    console.error('Error decompressing string:', error);
    return '';
  }
};

/**
 * Generate a shareable URL with plan data
 *
 * @param {Object} planData - The plan data to encode in the URL
 * @param {string} baseUrl - The base URL of the application
 * @returns {string} - The shareable URL
 */
export const generateShareableUrl = (planData, baseUrl = window.location.origin) => {
  try {
    console.log('%c[URL UTILS] Generating shareable URL for plan data', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', planData);

    // Create a minimal version of the plan data to keep the URL short
    const minimalPlanData = {
      v: planData.version || '1.2', // Version
      b: planData.bossId, // Boss ID
      a: planData.assignments, // Assignments
      j: planData.selectedJobs, // Selected jobs
      t: planData.tankPositions // Tank positions
    };

    // Log the minimal plan data
    console.log('%c[URL UTILS] Minimal plan data for URL', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', minimalPlanData);

    // Verify that selectedJobs contains job IDs
    if (minimalPlanData.j) {
      Object.entries(minimalPlanData.j).forEach(([roleKey, jobIds]) => {
        console.log(`%c[URL UTILS] Role ${roleKey} has job IDs:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jobIds);

        // Ensure jobIds is an array
        if (!Array.isArray(jobIds)) {
          console.error(`%c[URL UTILS] ERROR: Job IDs for role ${roleKey} is not an array!`, 'background: red; color: white; padding: 2px 5px; border-radius: 3px;');
        }
      });
    }

    // Convert to JSON and compress
    const jsonString = JSON.stringify(minimalPlanData);
    console.log('%c[URL UTILS] JSON string length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jsonString.length);

    const compressedData = compressString(jsonString);
    console.log('%c[URL UTILS] Compressed data length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', compressedData.length);

    // Create the URL with the compressed data as a query parameter
    const url = `${baseUrl}?plan=${compressedData}`;
    console.log('%c[URL UTILS] Generated URL:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', url);

    return url;
  } catch (error) {
    console.error('Error generating shareable URL:', error);
    return '';
  }
};

/**
 * Parse a shareable URL and extract the plan data
 *
 * @param {string} url - The URL to parse
 * @returns {Object|null} - The parsed plan data or null if invalid
 */
export const parseShareableUrl = (url) => {
  try {
    console.log('%c[URL UTILS] Parsing shareable URL', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', url);

    // Create a URL object to easily extract query parameters
    const urlObj = new URL(url);
    const compressedData = urlObj.searchParams.get('plan');

    if (!compressedData) {
      console.log('%c[URL UTILS] No plan data found in URL', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      return null;
    }

    console.log('%c[URL UTILS] Compressed data length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', compressedData.length);

    // Decompress the data
    const decompressedData = decompressString(compressedData);
    console.log('%c[URL UTILS] Decompressed data length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', decompressedData.length);

    // Parse the JSON
    const minimalPlanData = JSON.parse(decompressedData);
    console.log('%c[URL UTILS] Parsed minimal plan data:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', minimalPlanData);

    // Verify that selectedJobs contains job IDs
    if (minimalPlanData.j) {
      Object.entries(minimalPlanData.j).forEach(([roleKey, jobIds]) => {
        console.log(`%c[URL UTILS] Role ${roleKey} has job IDs:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jobIds);

        // Ensure jobIds is an array
        if (!Array.isArray(jobIds)) {
          console.error(`%c[URL UTILS] ERROR: Job IDs for role ${roleKey} is not an array!`, 'background: red; color: white; padding: 2px 5px; border-radius: 3px;');
        }
      });
    }

    // Convert back to the full plan data format
    const result = {
      version: minimalPlanData.v,
      bossId: minimalPlanData.b,
      assignments: minimalPlanData.a,
      selectedJobs: minimalPlanData.j,
      tankPositions: minimalPlanData.t || {},
      importDate: new Date().toISOString()
    };

    console.log('%c[URL UTILS] Parsed plan data result:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', result);

    return result;
  } catch (error) {
    console.error('Error parsing shareable URL:', error);
    return null;
  }
};

/**
 * Check if the current URL contains plan data
 *
 * @returns {Object|null} - The parsed plan data or null if no plan data in URL
 */
export const checkUrlForPlanData = () => {
  try {
    // Get the current URL
    const currentUrl = window.location.href;

    // Parse the URL
    return parseShareableUrl(currentUrl);
  } catch (error) {
    console.error('Error checking URL for plan data:', error);
    return null;
  }
};

/**
 * Reconstruct full mitigation objects from IDs
 *
 * @param {Object} assignments - The assignments object with mitigation IDs (supports both old and new formats)
 * @returns {Object} - The reconstructed assignments with full mitigation objects
 */
export const reconstructMitigations = (assignments) => {
  console.log('%c[RECONSTRUCT] Starting mitigation reconstruction', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', assignments);

  const reconstructedAssignments = {};

  Object.entries(assignments).forEach(([bossActionId, mitigationData]) => {
    console.log(`%c[RECONSTRUCT] Processing boss action ${bossActionId}`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', mitigationData);

    // Check if the data is in the new format (with tankPosition) or old format (array of IDs)
    if (Array.isArray(mitigationData)) {
      // Old format - just an array of mitigation IDs
      console.log(`%c[RECONSTRUCT] Using old format (array) for ${bossActionId}`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      reconstructedAssignments[bossActionId] = mitigationData.map(id => {
        const mitigation = mitigationAbilities.find(m => m.id === id);
        if (!mitigation) {
          console.warn(`Mitigation with ID ${id} not found`);
          return null;
        }
        return mitigation;
      }).filter(Boolean); // Remove null values
    } else if (typeof mitigationData === 'object' && mitigationData !== null) {
      // New format - object with tankPosition keys
      console.log(`%c[RECONSTRUCT] Using new format (tank positions) for ${bossActionId}`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      reconstructedAssignments[bossActionId] = [];

      // Process each tank position's mitigations
      Object.entries(mitigationData).forEach(([position, mitigationIds]) => {
        if (!Array.isArray(mitigationIds)) {
          console.warn(`Expected array of mitigation IDs for position ${position}, got:`, mitigationIds);
          return;
        }

        mitigationIds.forEach(id => {
          const mitigation = mitigationAbilities.find(m => m.id === id);
          if (mitigation) {
            reconstructedAssignments[bossActionId].push({
              ...mitigation,
              tankPosition: position
            });
          } else {
            console.warn(`Mitigation with ID ${id} not found for position ${position}`);
          }
        });
      });
    } else {
      console.warn(`Unknown mitigation data format for boss action ${bossActionId}:`, mitigationData);
      reconstructedAssignments[bossActionId] = [];
    }
  });

  console.log('%c[RECONSTRUCT] Reconstruction completed', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', reconstructedAssignments);
  return reconstructedAssignments;
};

/**
 * Reconstruct full job objects from IDs
 *
 * @param {Object} selectedJobs - The selected jobs object with job IDs
 * @returns {Object} - The reconstructed selected jobs with full job objects
 */
export const reconstructJobs = (selectedJobs) => {
  console.log('%c[URL UTILS] Reconstructing jobs from IDs', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', selectedJobs);

  const reconstructedJobs = {};

  // Initialize with the full job structure
  Object.entries(ffxivJobs).forEach(([roleKey, jobs]) => {
    reconstructedJobs[roleKey] = jobs.map(job => ({
      ...job,
      selected: false // Default to not selected
    }));
  });

  // Update selected status based on the imported data
  Object.entries(selectedJobs).forEach(([roleKey, jobIds]) => {
    console.log(`%c[URL UTILS] Processing role ${roleKey} with job IDs`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jobIds);

    if (reconstructedJobs[roleKey]) {
      reconstructedJobs[roleKey] = reconstructedJobs[roleKey].map(job => {
        const isSelected = jobIds.includes(job.id);
        console.log(`%c[URL UTILS] Job ${job.id} selected:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', isSelected);

        return {
          ...job,
          selected: isSelected
        };
      });
    }
  });

  console.log('%c[URL UTILS] Reconstructed jobs result', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', reconstructedJobs);

  return reconstructedJobs;
};

// Create an index file for easier imports
export default {
  compressString,
  decompressString,
  generateShareableUrl,
  parseShareableUrl,
  checkUrlForPlanData,
  reconstructMitigations,
  reconstructJobs
};
