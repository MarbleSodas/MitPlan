import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import { processReceivedData } from '../utils/deltaUtils';
import {
  savePlanOffline,
  getPlanOffline,
  savePendingOperation,
  getSyncStatus
} from '../utils/offlineStorage';
import syncManager from '../utils/syncManager';

// Create context
const PlanContext = createContext();

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const PlanProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userPlans, setUserPlans] = useState([]);
  const [sharedPlans, setSharedPlans] = useState([]);
  const [publicPlans, setPublicPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [cursorPositions, setCursorPositions] = useState([]);
  const [userColor, setUserColor] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('online');
  const [syncError, setSyncError] = useState(null);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online');
      setIsOnline(true);
      setSyncStatus('online');
    };

    const handleOffline = () => {
      console.log('App is offline');
      setIsOnline(false);
      setSyncStatus('offline');
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize sync manager
    syncManager.init(socket, (status, planId, error) => {
      setSyncStatus(status);
      if (error) {
        setSyncError(error);
      } else {
        setSyncError(null);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [socket]);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');

      // Create socket connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        // Clear collaborators on disconnect
        setCollaborators([]);
        setCursorPositions([]);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setError(error.message || 'Socket error');
      });

      newSocket.on('user_joined', (data) => {
        console.log('User joined:', data.user);
        setCollaborators(prev => {
          // Only add if not already in the list
          if (!prev.some(u => u.id === data.user.id)) {
            return [...prev, data.user];
          }
          return prev;
        });
      });

      newSocket.on('user_left', (data) => {
        console.log('User left:', data.user);
        setCollaborators(prev => prev.filter(user => user.id !== data.user.id));
        setCursorPositions(prev => prev.filter(pos => pos.userId !== data.user.id));
      });

      newSocket.on('operation', (transmissionData) => {
        // Handle incoming operation with delta processing
        if (currentPlan) {
          // Process the received data (decompress and apply delta if needed)
          const data = processReceivedData(
            { version: currentPlan.version, operations: [] },
            transmissionData
          );

          if (currentPlan.id === data.docId) {
            // Skip operations from this client
            if (data.clientId === newSocket.id) {
              return;
            }

            // Apply operation to current plan
            applyOperation(data);

            // Log bandwidth savings
            if (transmissionData.originalSize && transmissionData.transmittedSize) {
              const savings = Math.round(
                (1 - transmissionData.transmittedSize / transmissionData.originalSize) * 100
              );
              console.log(`Delta compression saved ${savings}% bandwidth`);
            }
          }
        }
      });

      newSocket.on('cursor_update', (data) => {
        // Handle cursor position updates
        if (currentPlan) {
          setCursorPositions(prev => {
            // Update existing position or add new one
            const existingIndex = prev.findIndex(pos => pos.userId === data.userId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            } else {
              return [...prev, data];
            }
          });
        }
      });

      newSocket.on('version_update', (data) => {
        // Handle version update notification
        if (currentPlan && currentPlan.id === data.docId) {
          setCurrentPlan(prev => ({
            ...prev,
            version: data.version
          }));
        }
      });

      newSocket.on('conflict_detected', (data) => {
        // Handle conflict detection
        if (currentPlan && currentPlan.id === data.docId) {
          console.log('Conflict detected:', data.conflicts);
          setConflicts(data.conflicts);
          setShowConflictModal(true);

          // Update current plan version to match server
          setCurrentPlan(prev => ({
            ...prev,
            version: data.serverVersion
          }));
        }
      });

      newSocket.on('session_joined', (data) => {
        console.log('Session joined:', data);
        setCollaborators(data.activeUsers || []);
        setCursorPositions(data.cursorPositions || []);
        setUserColor(data.userColor);
        setCanEdit(data.canEdit);

        // Update current plan with latest version if needed
        if (currentPlan && data.plan && currentPlan.version !== data.plan.version) {
          setCurrentPlan(data.plan);
        }
      });

      newSocket.on('recent_operations', (data) => {
        console.log('Recent operations:', data);
        // Could be used to show recent activity or history
      });

      setSocket(newSocket);

      // Clean up on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  // Fetch user plans when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserPlans();
      fetchSharedPlans();
    }
  }, [isAuthenticated]);

  // Fetch public plans
  useEffect(() => {
    fetchPublicPlans();
  }, []);

  /**
   * Fetch user plans
   */
  const fetchUserPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/plans/user`);
      setUserPlans(response.data.plans);
    } catch (error) {
      console.error('Fetch user plans error:', error);
      setError(error.response?.data?.message || 'Failed to fetch user plans');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch shared plans
   */
  const fetchSharedPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/plans/shared`);
      setSharedPlans(response.data.plans);
    } catch (error) {
      console.error('Fetch shared plans error:', error);
      setError(error.response?.data?.message || 'Failed to fetch shared plans');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch public plans
   */
  const fetchPublicPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/plans/public`);
      setPublicPlans(response.data.plans);
    } catch (error) {
      console.error('Fetch public plans error:', error);
      setError(error.response?.data?.message || 'Failed to fetch public plans');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new plan
   * @param {Object} planData - Plan data
   * @returns {Promise} Creation result
   */
  const createPlan = async (planData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/plans`, planData);

      // Add to user plans
      setUserPlans(prev => [response.data.plan, ...prev]);

      return response.data;
    } catch (error) {
      console.error('Create plan error:', error);
      setError(error.response?.data?.message || 'Failed to create plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get a plan by ID
   * @param {string} id - Plan ID
   * @returns {Promise} Plan data
   */
  const getPlan = async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Leave any existing collaboration session
      if (socket && socket.connected && currentPlan) {
        leaveCollaborationSession();
      }

      let plan;

      // Try to get from server first
      if (isOnline) {
        try {
          const response = await axios.get(`${API_URL}/plans/${id}`);
          plan = response.data.plan;

          // Save to offline storage
          await savePlanOffline(plan);

          // Join collaboration session if socket is connected
          if (socket && socket.connected) {
            // Generate a unique client ID
            const clientId = `${socket.id}-${Date.now()}`;

            // Join the session
            socket.emit('join_session', {
              docId: id,
              clientId
            });
          }
        } catch (err) {
          console.error('Failed to get plan from server, trying offline storage:', err);

          // If server request fails, try offline storage
          plan = await getPlanOffline(id);

          if (!plan) {
            throw new Error('Plan not available offline');
          }

          setSyncStatus('offline');
        }
      } else {
        // If offline, try to get from offline storage
        plan = await getPlanOffline(id);

        if (!plan) {
          throw new Error('Plan not available offline');
        }

        setSyncStatus('offline');
      }

      setCurrentPlan(plan);

      // Get sync status
      const status = await getSyncStatus(id);
      setSyncStatus(status.status);
      setSyncError(status.error);

      return plan;
    } catch (error) {
      console.error('Get plan error:', error);
      setError(error.message || 'Failed to get plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a plan
   * @param {string} id - Plan ID
   * @param {Object} planData - Plan data
   * @returns {Promise} Update result
   */
  const updatePlan = async (id, planData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.put(`${API_URL}/plans/${id}`, planData);

      // Update current plan if it's the same
      if (currentPlan && currentPlan.id === id) {
        setCurrentPlan(response.data.plan);
      }

      // Update in user plans
      setUserPlans(prev => prev.map(plan =>
        plan.id === id ? response.data.plan : plan
      ));

      // Update in shared plans
      setSharedPlans(prev => prev.map(plan =>
        plan.id === id ? response.data.plan : plan
      ));

      return response.data;
    } catch (error) {
      console.error('Update plan error:', error);
      setError(error.response?.data?.message || 'Failed to update plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a plan
   * @param {string} id - Plan ID
   * @returns {Promise} Deletion result
   */
  const deletePlan = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.delete(`${API_URL}/plans/${id}`);

      // Remove from user plans
      setUserPlans(prev => prev.filter(plan => plan.id !== id));

      // Clear current plan if it's the same
      if (currentPlan && currentPlan.id === id) {
        setCurrentPlan(null);
      }

      return response.data;
    } catch (error) {
      console.error('Delete plan error:', error);
      setError(error.response?.data?.message || 'Failed to delete plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Share a plan with a user
   * @param {string} id - Plan ID
   * @param {string} email - User email
   * @param {Object} permissions - Permissions
   * @returns {Promise} Sharing result
   */
  const sharePlan = async (id, email, permissions) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/plans/${id}/share`, {
        email,
        permissions
      });

      // Update current plan if it's the same
      if (currentPlan && currentPlan.id === id) {
        setCurrentPlan(response.data.plan);
      }

      // Update in user plans
      setUserPlans(prev => prev.map(plan =>
        plan.id === id ? response.data.plan : plan
      ));

      return response.data;
    } catch (error) {
      console.error('Share plan error:', error);
      setError(error.response?.data?.message || 'Failed to share plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove sharing for a user
   * @param {string} id - Plan ID
   * @param {string} userId - User ID
   * @returns {Promise} Removal result
   */
  const removeSharing = async (id, userId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.delete(`${API_URL}/plans/${id}/share/${userId}`);

      // Update current plan if it's the same
      if (currentPlan && currentPlan.id === id) {
        setCurrentPlan(response.data.plan);
      }

      // Update in user plans
      setUserPlans(prev => prev.map(plan =>
        plan.id === id ? response.data.plan : plan
      ));

      return response.data;
    } catch (error) {
      console.error('Remove sharing error:', error);
      setError(error.response?.data?.message || 'Failed to remove sharing');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a shareable link for a plan
   * @param {string} id - Plan ID
   * @param {Object} options - Link options
   * @returns {Promise} Link creation result
   */
  const createShareableLink = async (id, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/plans/${id}/link`, options);

      return response.data;
    } catch (error) {
      console.error('Create shareable link error:', error);
      setError(error.response?.data?.message || 'Failed to create shareable link');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get a plan by shareable link
   * @param {string} token - Link token
   * @returns {Promise} Plan data
   */
  const getPlanByShareableLink = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/plans/share/${token}`);
      setCurrentPlan(response.data.plan);

      return response.data.plan;
    } catch (error) {
      console.error('Get plan by shareable link error:', error);
      setError(error.response?.data?.message || 'Failed to get plan by shareable link');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send an operation to the server
   * @param {Object} operation - Operation data
   */
  const sendOperation = async (operation) => {
    if (!currentPlan) {
      console.error('Cannot send operation: no current plan');
      return;
    }

    const operationData = {
      docId: currentPlan.id,
      version: currentPlan.version,
      operations: [operation],
      clientId: socket?.id || `offline-${Date.now()}`
    };

    // Apply operation locally first
    applyOperation({
      ...operationData,
      userId: user?.id,
      username: user?.username
    });

    // Save plan to offline storage
    await savePlanOffline(currentPlan);

    // If online, send to server
    if (isOnline && socket && socket.connected) {
      socket.emit('operation', operationData);
      setSyncStatus('synced');
    } else {
      // If offline, queue for later sync
      console.log('Offline mode: queueing operation for later sync');
      await savePendingOperation(currentPlan.id, operation);
      syncManager.queueOperation(currentPlan.id, operation, currentPlan);
      setSyncStatus('pending');
    }
  };

  /**
   * Apply an operation to the current plan
   * @param {Object} data - Operation data
   */
  const applyOperation = (data) => {
    if (!currentPlan || currentPlan.id !== data.docId) {
      return;
    }

    // Clone current plan
    const updatedPlan = JSON.parse(JSON.stringify(currentPlan));

    // Initialize assignments if not present
    if (!updatedPlan.assignments) {
      updatedPlan.assignments = {};
    }

    // Apply operations
    for (const op of data.operations) {
      switch (op.type) {
        case 'add_mitigation':
          // Add mitigation to boss action
          if (!updatedPlan.assignments[op.bossActionId]) {
            updatedPlan.assignments[op.bossActionId] = [];
          }

          // Check if mitigation already exists to avoid duplicates
          const existingIndex = updatedPlan.assignments[op.bossActionId]
            .findIndex(m => m.id === op.mitigation.id);

          if (existingIndex === -1) {
            // Add new mitigation
            updatedPlan.assignments[op.bossActionId].push(op.mitigation);
          } else {
            // Replace existing mitigation (might have updated properties)
            updatedPlan.assignments[op.bossActionId][existingIndex] = op.mitigation;
          }
          break;

        case 'remove_mitigation':
          // Remove mitigation from boss action
          if (updatedPlan.assignments[op.bossActionId]) {
            updatedPlan.assignments[op.bossActionId] = updatedPlan.assignments[op.bossActionId]
              .filter(m => m.id !== op.mitigationId);

            // Remove empty arrays
            if (updatedPlan.assignments[op.bossActionId].length === 0) {
              delete updatedPlan.assignments[op.bossActionId];
            }
          }
          break;

        case 'update_jobs':
          // Update selected jobs
          updatedPlan.selectedJobs = op.selectedJobs;
          break;

        case 'update_metadata':
          // Update plan metadata
          if (op.title !== undefined) updatedPlan.title = op.title;
          if (op.description !== undefined) updatedPlan.description = op.description;
          if (op.bossId !== undefined) updatedPlan.bossId = op.bossId;
          if (op.isPublic !== undefined) updatedPlan.isPublic = op.isPublic;
          break;

        case 'update_tank_positions':
          // Update tank positions
          if (!updatedPlan.tankPositions) {
            updatedPlan.tankPositions = {};
          }
          updatedPlan.tankPositions = op.tankPositions;
          break;

        case 'clear_assignments':
          // Clear all assignments
          updatedPlan.assignments = {};
          break;

        case 'import_assignments':
          // Import assignments (replace all)
          updatedPlan.assignments = op.assignments;
          break;

        case 'cursor_move':
        case 'cursor_selection':
          // Cursor operations are handled separately
          break;

        default:
          // Unknown operation type
          console.warn('Unknown operation type:', op.type);
      }
    }

    // Update version
    updatedPlan.version = data.version;

    // Update current plan
    setCurrentPlan(updatedPlan);
  };

  /**
   * Leave the current collaboration session
   */
  const leaveCollaborationSession = () => {
    if (socket && socket.connected && currentPlan) {
      socket.emit('leave_session', { docId: currentPlan.id });
      setCollaborators([]);
      setCursorPositions([]);
      setUserColor(null);
      setCanEdit(false);
    }
  };

  /**
   * Resolve a conflict
   * @param {Object} conflict - Conflict data
   * @param {string} resolution - Resolution type ('client' or 'server')
   */
  const resolveConflict = (conflict, resolution) => {
    if (!socket || !socket.connected || !currentPlan) {
      console.error('Cannot resolve conflict: socket not connected or no current plan');
      return;
    }

    // If resolution is 'server', we don't need to do anything as the server version is already applied
    if (resolution === 'server') {
      return;
    }

    // If resolution is 'client', we need to reapply the client operation
    if (resolution === 'client') {
      // Create a new operation based on the client operation
      const clientOp = conflict.clientOp;

      // Add a flag to indicate this is a conflict resolution
      const resolvedOp = {
        ...clientOp,
        isConflictResolution: true,
        conflictId: conflict.serverOp.id
      };

      // Send the resolved operation
      sendOperation(resolvedOp);
    }

    // Clear the conflict from the list
    setConflicts(prev => prev.filter(c =>
      c.clientOp.id !== conflict.clientOp.id ||
      c.serverOp.id !== conflict.serverOp.id
    ));

    // If no more conflicts, hide the modal
    if (conflicts.length <= 1) {
      setShowConflictModal(false);
    }
  };

  /**
   * Send cursor position update
   * @param {Object} position - Cursor position data
   */
  const sendCursorPosition = (position) => {
    if (!socket || !socket.connected || !currentPlan || !canEdit) {
      return;
    }

    const operation = {
      type: 'cursor_move',
      position
    };

    sendOperation(operation);
  };

  /**
   * Send cursor selection update
   * @param {Object} selection - Selection range data
   */
  const sendCursorSelection = (selection) => {
    if (!socket || !socket.connected || !currentPlan || !canEdit) {
      return;
    }

    const operation = {
      type: 'cursor_selection',
      selection
    };

    sendOperation(operation);
  };

  // Context value
  const value = {
    userPlans,
    sharedPlans,
    publicPlans,
    currentPlan,
    loading,
    error,
    collaborators,
    cursorPositions,
    userColor,
    canEdit,
    conflicts,
    showConflictModal,
    setShowConflictModal,
    isOnline,
    syncStatus,
    syncError,
    fetchUserPlans,
    fetchSharedPlans,
    fetchPublicPlans,
    createPlan,
    getPlan,
    updatePlan,
    deletePlan,
    sharePlan,
    removeSharing,
    createShareableLink,
    getPlanByShareableLink,
    sendOperation,
    sendCursorPosition,
    sendCursorSelection,
    resolveConflict,
    leaveCollaborationSession
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

// Custom hook to use plan context
export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};

export default PlanContext;