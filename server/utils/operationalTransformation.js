/**
 * Advanced Operational Transformation (OT) utility for handling concurrent edits
 * Based on the principles of transformation functions and operation composition
 */

/**
 * Transform a client operation against a server operation
 * @param {Object} clientOp - Client operation
 * @param {Object} serverOp - Server operation
 * @returns {Object} Transformed client operation
 */
const transformOperation = (clientOp, serverOp) => {
  // Skip if operations are from the same client
  if (clientOp.clientId === serverOp.clientId) {
    return clientOp;
  }

  // Clone the client operation to avoid modifying the original
  const transformedOp = { ...clientOp };

  // Handle different operation types
  switch (clientOp.type) {
    case 'add_mitigation':
      if (serverOp.type === 'add_mitigation' && 
          serverOp.bossActionId === clientOp.bossActionId && 
          serverOp.mitigation.id === clientOp.mitigation.id) {
        // Both operations add the same mitigation to the same boss action
        // Mark as conflicting and keep server's version (last-writer-wins)
        transformedOp.skip = true;
        transformedOp.conflictsWith = serverOp.id;
        transformedOp.conflictType = 'duplicate_mitigation';
      }
      break;
      
    case 'remove_mitigation':
      if (serverOp.type === 'remove_mitigation' && 
          serverOp.bossActionId === clientOp.bossActionId && 
          serverOp.mitigationId === clientOp.mitigationId) {
        // Both operations remove the same mitigation
        transformedOp.skip = true;
      } else if (serverOp.type === 'add_mitigation' && 
                serverOp.bossActionId === clientOp.bossActionId && 
                serverOp.mitigation.id === clientOp.mitigationId) {
        // Client tries to remove what server just added
        // Mark as conflicting and keep server's version (last-writer-wins)
        transformedOp.skip = true;
        transformedOp.conflictsWith = serverOp.id;
        transformedOp.conflictType = 'remove_after_add';
      }
      break;
      
    case 'update_jobs':
      if (serverOp.type === 'update_jobs') {
        // Merge job selections with priority to server's changes
        transformedOp.selectedJobs = mergeJobSelections(
          clientOp.selectedJobs, 
          serverOp.selectedJobs
        );
        transformedOp.merged = true;
      }
      break;
      
    case 'update_metadata':
      if (serverOp.type === 'update_metadata') {
        // Merge metadata fields with priority to server's changes
        transformedOp.title = serverOp.title !== undefined ? serverOp.title : clientOp.title;
        transformedOp.description = serverOp.description !== undefined ? serverOp.description : clientOp.description;
        transformedOp.bossId = serverOp.bossId !== undefined ? serverOp.bossId : clientOp.bossId;
        transformedOp.isPublic = serverOp.isPublic !== undefined ? serverOp.isPublic : clientOp.isPublic;
        transformedOp.merged = true;
      }
      break;
      
    case 'update_tank_positions':
      if (serverOp.type === 'update_tank_positions') {
        // Merge tank positions with priority to server's changes
        transformedOp.tankPositions = mergeTankPositions(
          clientOp.tankPositions, 
          serverOp.tankPositions
        );
        transformedOp.merged = true;
      }
      break;
      
    case 'clear_assignments':
      if (serverOp.type === 'add_mitigation' || 
          serverOp.type === 'remove_mitigation' || 
          serverOp.type === 'clear_assignments' ||
          serverOp.type === 'import_assignments') {
        // Mark as conflicting if server has modified assignments
        transformedOp.conflictsWith = serverOp.id;
        transformedOp.conflictType = 'concurrent_assignment_change';
      }
      break;
      
    case 'import_assignments':
      if (serverOp.type === 'add_mitigation' || 
          serverOp.type === 'remove_mitigation' || 
          serverOp.type === 'clear_assignments' ||
          serverOp.type === 'import_assignments') {
        // Mark as conflicting if server has modified assignments
        transformedOp.conflictsWith = serverOp.id;
        transformedOp.conflictType = 'concurrent_assignment_change';
      }
      break;
      
    // Cursor operations don't conflict
    case 'cursor_move':
    case 'cursor_selection':
      break;
      
    default:
      // Unknown operation type, no transformation needed
      break;
  }
  
  return transformedOp;
};

/**
 * Transform client operations against server operations
 * @param {Array} clientOps - Client operations
 * @param {Array} serverOps - Server operations
 * @returns {Object} Transformed operations and conflict information
 */
const transformOperations = (clientOps, serverOps) => {
  if (!serverOps || serverOps.length === 0) {
    return { 
      operations: clientOps,
      hasConflicts: false,
      conflicts: []
    };
  }
  
  // Clone client operations to avoid modifying the original
  let transformedOps = JSON.parse(JSON.stringify(clientOps));
  const conflicts = [];
  
  // Apply transformations for each client operation against all server operations
  for (let i = 0; i < transformedOps.length; i++) {
    const clientOp = transformedOps[i];
    
    for (const serverOp of serverOps) {
      const transformedOp = transformOperation(clientOp, serverOp);
      
      // Check if this operation has conflicts
      if (transformedOp.conflictsWith) {
        conflicts.push({
          clientOp: clientOp,
          serverOp: serverOp,
          conflictType: transformedOp.conflictType
        });
      }
      
      // Update the operation in the array
      transformedOps[i] = transformedOp;
    }
  }
  
  // Filter out operations marked to skip
  transformedOps = transformedOps.filter(op => !op.skip);
  
  return {
    operations: transformedOps,
    hasConflicts: conflicts.length > 0,
    conflicts
  };
};

/**
 * Merge job selections from client and server
 * @param {Array} clientJobs - Client job selections
 * @param {Array} serverJobs - Server job selections
 * @returns {Array} Merged job selections
 */
const mergeJobSelections = (clientJobs, serverJobs) => {
  // Create a set of all jobs from both client and server
  return [...new Set([...clientJobs, ...serverJobs])];
};

/**
 * Merge tank positions from client and server
 * @param {Object} clientPositions - Client tank positions
 * @param {Object} serverPositions - Server tank positions
 * @returns {Object} Merged tank positions
 */
const mergeTankPositions = (clientPositions, serverPositions) => {
  // Prefer server positions for conflicts
  return { ...clientPositions, ...serverPositions };
};

export { transformOperation, transformOperations };
