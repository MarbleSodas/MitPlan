/**
 * Delta-based update utilities for efficient data synchronization
 * Uses JSON-Patch format (RFC 6902) for representing changes
 */
import jsonpatch from 'fast-json-patch';
import { deflate, inflate } from 'pako';

/**
 * Generate a delta between two objects
 * @param {Object} oldObj - Original object
 * @param {Object} newObj - New object
 * @returns {Array} Array of operations in JSON-Patch format
 */
export const generateDelta = (oldObj, newObj) => {
  return jsonpatch.compare(oldObj, newObj);
};

/**
 * Apply a delta to an object
 * @param {Object} obj - Object to apply delta to
 * @param {Array} delta - Array of operations in JSON-Patch format
 * @returns {Object} Updated object
 */
export const applyDelta = (obj, delta) => {
  return jsonpatch.applyPatch(obj, delta).newDocument;
};

/**
 * Compress data using deflate algorithm
 * @param {Object|Array|string} data - Data to compress
 * @returns {string} Base64-encoded compressed data
 */
export const compressData = (data) => {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const compressed = deflate(jsonString, { to: 'string' });
  return Buffer.from(compressed).toString('base64');
};

/**
 * Decompress data compressed with compressData
 * @param {string} compressedData - Base64-encoded compressed data
 * @returns {Object|Array|string} Decompressed data
 */
export const decompressData = (compressedData) => {
  const buffer = Buffer.from(compressedData, 'base64');
  const decompressed = inflate(buffer, { to: 'string' });
  try {
    return JSON.parse(decompressed);
  } catch (e) {
    return decompressed;
  }
};

/**
 * Determine if delta-based update should be used based on data size
 * @param {Object} oldObj - Original object
 * @param {Object} newObj - New object
 * @returns {boolean} True if delta-based update should be used
 */
export const shouldUseDelta = (oldObj, newObj) => {
  // Convert objects to strings to compare sizes
  const oldStr = JSON.stringify(oldObj);
  const newStr = JSON.stringify(newObj);
  
  // Generate delta
  const delta = generateDelta(oldObj, newObj);
  const deltaStr = JSON.stringify(delta);
  
  // Use delta if it's smaller than sending the full object
  // Add a 20% threshold to account for overhead
  return deltaStr.length < (newStr.length * 0.8);
};

/**
 * Prepare data for transmission with optional compression and delta generation
 * @param {Object} oldObj - Original object (for delta generation)
 * @param {Object} newObj - New object to transmit
 * @param {boolean} useCompression - Whether to use compression
 * @returns {Object} Prepared data with metadata
 */
export const prepareDataForTransmission = (oldObj, newObj, useCompression = true) => {
  // Determine if delta should be used
  const useDelta = oldObj && shouldUseDelta(oldObj, newObj);
  
  let data;
  if (useDelta) {
    // Generate delta
    data = generateDelta(oldObj, newObj);
  } else {
    // Use full object
    data = newObj;
  }
  
  // Compress if requested
  let finalData = data;
  if (useCompression) {
    finalData = compressData(data);
  }
  
  return {
    data: finalData,
    useDelta,
    useCompression,
    originalSize: JSON.stringify(newObj).length,
    transmittedSize: typeof finalData === 'string' ? finalData.length : JSON.stringify(finalData).length
  };
};

/**
 * Process received data based on metadata
 * @param {Object} baseObj - Base object to apply delta to (if delta was used)
 * @param {Object} receivedData - Data received from transmission
 * @returns {Object} Processed data
 */
export const processReceivedData = (baseObj, receivedData) => {
  const { data, useDelta, useCompression } = receivedData;
  
  // Decompress if compressed
  let processedData = data;
  if (useCompression) {
    processedData = decompressData(data);
  }
  
  // Apply delta if delta was used
  if (useDelta) {
    return applyDelta(baseObj, processedData);
  } else {
    return processedData;
  }
};
