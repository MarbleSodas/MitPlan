/**
 * Client-side delta utilities for efficient data synchronization
 * Uses JSON-Patch format (RFC 6902) for representing changes
 */
import jsonpatch from 'fast-json-patch';
import pako from 'pako';

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
 * Decompress data compressed with compressData
 * @param {string} compressedData - Base64-encoded compressed data
 * @returns {Object|Array|string} Decompressed data
 */
export const decompressData = (compressedData) => {
  const binaryString = atob(compressedData);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const decompressed = pako.inflate(bytes, { to: 'string' });
  
  try {
    return JSON.parse(decompressed);
  } catch (e) {
    return decompressed;
  }
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
