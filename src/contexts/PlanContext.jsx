import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

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
  
  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      
      // Create socket connection
      const newSocket = io(SOCKET_URL, {
        auth: { token }
      });
      
      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
      });
      
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });
      
      newSocket.on('user_joined', (data) => {
        setCollaborators(prev => [...prev, data.user]);
      });
      
      newSocket.on('user_left', (data) => {
        setCollaborators(prev => prev.filter(user => user.id !== data.user.id));
      });
      
      newSocket.on('operation', (data) => {
        // Handle incoming operation
        if (currentPlan && currentPlan.id === data.docId) {
          // Apply operation to current plan
          applyOperation(data);
        }
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
      
      const response = await axios.get(`${API_URL}/plans/${id}`);
      setCurrentPlan(response.data.plan);
      
      // Join collaboration session if socket is connected
      if (socket && socket.connected) {
        socket.emit('join_session', { docId: id });
        
        // Set up session joined handler
        socket.once('session_joined', (data) => {
          setCollaborators(data.activeUsers);
        });
      }
      
      return response.data.plan;
    } catch (error) {
      console.error('Get plan error:', error);
      setError(error.response?.data?.message || 'Failed to get plan');
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
  const sendOperation = (operation) => {
    if (!socket || !socket.connected || !currentPlan) {
      console.error('Cannot send operation: socket not connected or no current plan');
      return;
    }
    
    const operationData = {
      docId: currentPlan.id,
      version: currentPlan.version,
      operations: [operation],
      clientId: socket.id
    };
    
    socket.emit('operation', operationData);
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
    
    // Apply operations
    for (const op of data.operations) {
      switch (op.type) {
        case 'add_mitigation':
          // Add mitigation to boss action
          if (!updatedPlan.assignments[op.bossActionId]) {
            updatedPlan.assignments[op.bossActionId] = [];
          }
          updatedPlan.assignments[op.bossActionId].push(op.mitigation);
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
          if (op.title) updatedPlan.title = op.title;
          if (op.description) updatedPlan.description = op.description;
          if (op.bossId) updatedPlan.bossId = op.bossId;
          if (op.isPublic !== undefined) updatedPlan.isPublic = op.isPublic;
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
    }
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