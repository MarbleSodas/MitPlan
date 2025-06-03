/**
 * Utility functions for collaboration features
 */

/**
 * Generate a consistent color for a user based on their ID
 */
export const getUserColor = (userId) => {
  const colors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#F44336', // Red
    '#00BCD4', // Cyan
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#009688', // Teal
    '#FF5722', // Deep Orange
  ];

  // Create a simple hash from the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use the hash to select a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

/**
 * Generate user initials from display name
 */
export const getUserInitials = (name) => {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Check if two plan states have conflicts
 */
export const detectConflicts = (localState, remoteState, lastKnownState) => {
  const conflicts = [];

  // Check assignments conflicts
  if (localState.assignments && remoteState.assignments) {
    const localAssignments = JSON.stringify(localState.assignments);
    const remoteAssignments = JSON.stringify(remoteState.assignments);
    const lastKnownAssignments = JSON.stringify(lastKnownState?.assignments || {});

    if (localAssignments !== lastKnownAssignments && 
        remoteAssignments !== lastKnownAssignments && 
        localAssignments !== remoteAssignments) {
      conflicts.push({
        type: 'assignments',
        local: localState.assignments,
        remote: remoteState.assignments,
        lastKnown: lastKnownState?.assignments
      });
    }
  }

  // Check job selection conflicts
  if (localState.selectedJobs && remoteState.selectedJobs) {
    const localJobs = JSON.stringify(localState.selectedJobs);
    const remoteJobs = JSON.stringify(remoteState.selectedJobs);
    const lastKnownJobs = JSON.stringify(lastKnownState?.selectedJobs || {});

    if (localJobs !== lastKnownJobs && 
        remoteJobs !== lastKnownJobs && 
        localJobs !== remoteJobs) {
      conflicts.push({
        type: 'selectedJobs',
        local: localState.selectedJobs,
        remote: remoteState.selectedJobs,
        lastKnown: lastKnownState?.selectedJobs
      });
    }
  }

  // Check tank positions conflicts
  if (localState.tankPositions && remoteState.tankPositions) {
    const localTanks = JSON.stringify(localState.tankPositions);
    const remoteTanks = JSON.stringify(remoteState.tankPositions);
    const lastKnownTanks = JSON.stringify(lastKnownState?.tankPositions || {});

    if (localTanks !== lastKnownTanks && 
        remoteTanks !== lastKnownTanks && 
        localTanks !== remoteTanks) {
      conflicts.push({
        type: 'tankPositions',
        local: localState.tankPositions,
        remote: remoteState.tankPositions,
        lastKnown: lastKnownState?.tankPositions
      });
    }
  }

  return conflicts;
};

/**
 * Merge two plan states with conflict resolution
 */
export const mergePlanStates = (localState, remoteState, resolutionStrategy = 'remote_wins') => {
  const merged = { ...localState };

  switch (resolutionStrategy) {
    case 'remote_wins':
      return { ...localState, ...remoteState };
    
    case 'local_wins':
      return localState;
    
    case 'merge_additive':
      // For assignments, merge by combining both sets
      if (localState.assignments && remoteState.assignments) {
        merged.assignments = { ...localState.assignments, ...remoteState.assignments };
      }
      
      // For jobs, take union of selected jobs
      if (localState.selectedJobs && remoteState.selectedJobs) {
        merged.selectedJobs = {};
        const allRoles = new Set([
          ...Object.keys(localState.selectedJobs),
          ...Object.keys(remoteState.selectedJobs)
        ]);
        
        allRoles.forEach(role => {
          const localJobs = localState.selectedJobs[role] || [];
          const remoteJobs = remoteState.selectedJobs[role] || [];
          merged.selectedJobs[role] = [...new Set([...localJobs, ...remoteJobs])];
        });
      }
      
      // For tank positions, prefer remote (last writer wins)
      if (remoteState.tankPositions) {
        merged.tankPositions = remoteState.tankPositions;
      }
      
      return merged;
    
    default:
      return { ...localState, ...remoteState };
  }
};

/**
 * Debounce function for collaboration updates
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
 * Throttle function for high-frequency updates
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

/**
 * Generate a unique session ID
 */
export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if a user is currently active (based on last seen timestamp)
 */
export const isUserActive = (lastSeen, timeoutMs = 60000) => {
  if (!lastSeen) return false;
  
  const now = Date.now();
  const lastSeenTime = typeof lastSeen === 'object' && lastSeen.seconds 
    ? lastSeen.seconds * 1000 
    : lastSeen;
    
  return (now - lastSeenTime) < timeoutMs;
};

/**
 * Format user presence status
 */
export const formatUserPresence = (users) => {
  const activeUsers = users.filter(user => isUserActive(user.lastSeen));
  const totalUsers = users.length;
  
  if (totalUsers === 0) {
    return 'No users online';
  }
  
  if (activeUsers.length === totalUsers) {
    return `${totalUsers} user${totalUsers !== 1 ? 's' : ''} online`;
  }
  
  return `${activeUsers.length}/${totalUsers} users active`;
};

/**
 * Validate plan data for collaboration
 */
export const validatePlanData = (planData) => {
  const errors = [];
  
  if (!planData) {
    errors.push('Plan data is required');
    return errors;
  }
  
  if (!planData.assignments || typeof planData.assignments !== 'object') {
    errors.push('Invalid assignments data');
  }
  
  if (!planData.selectedJobs || typeof planData.selectedJobs !== 'object') {
    errors.push('Invalid selected jobs data');
  }
  
  if (planData.tankPositions && typeof planData.tankPositions !== 'object') {
    errors.push('Invalid tank positions data');
  }
  
  return errors;
};

export default {
  getUserColor,
  getUserInitials,
  detectConflicts,
  mergePlanStates,
  debounce,
  throttle,
  generateSessionId,
  isUserActive,
  formatUserPresence,
  validatePlanData
};
