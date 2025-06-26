/**
 * Connection Recovery Service
 * 
 * Handles Firebase Realtime Database connection recovery and error handling
 * Provides automatic reconnection, exponential backoff, and graceful degradation
 */

import { ref, onValue, off, get, serverTimestamp } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { retryOperation } from '../utils/firebaseHelpers';

class ConnectionRecoveryService {
  constructor() {
    this.realtimeDb = realtimeDb;
    this.connectionState = 'unknown';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.connectionListeners = new Set();
    this.isRecovering = false;
    this.lastSuccessfulConnection = null;
    this.connectionHealthCheck = null;
    
    this.initializeConnectionMonitoring();
  }

  /**
   * Initialize connection monitoring
   */
  initializeConnectionMonitoring() {
    // Monitor Firebase connection state
    const connectedRef = ref(this.realtimeDb, '.info/connected');
    
    onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val();
      const previousState = this.connectionState;
      this.connectionState = isConnected ? 'connected' : 'disconnected';
      
      console.log(`%c[CONNECTION RECOVERY] Connection state changed: ${previousState} → ${this.connectionState}`, 
        'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

      if (isConnected) {
        this.onConnectionRestored();
      } else {
        this.onConnectionLost();
      }

      // Notify all listeners
      this.notifyConnectionListeners(isConnected);
    });

    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Handle connection restored
   */
  onConnectionRestored() {
    this.lastSuccessfulConnection = Date.now();
    this.reconnectAttempts = 0;
    this.isRecovering = false;
    
    console.log('%c[CONNECTION RECOVERY] Connection restored successfully', 
      'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
  }

  /**
   * Handle connection lost
   */
  onConnectionLost() {
    console.log('%c[CONNECTION RECOVERY] Connection lost, starting recovery process', 
      'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    
    if (!this.isRecovering) {
      this.startRecoveryProcess();
    }
  }

  /**
   * Start the recovery process with exponential backoff
   */
  async startRecoveryProcess() {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    
    while (this.reconnectAttempts < this.maxReconnectAttempts && this.connectionState !== 'connected') {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      
      console.log(`%c[CONNECTION RECOVERY] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`, 
        'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        await this.testConnection();
        
        if (this.connectionState === 'connected') {
          console.log('%c[CONNECTION RECOVERY] Reconnection successful', 
            'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
          break;
        }
      } catch (error) {
        console.warn(`%c[CONNECTION RECOVERY] Reconnection attempt ${this.reconnectAttempts} failed:`, 
          'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', error.message);
      }
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('%c[CONNECTION RECOVERY] Max reconnection attempts reached, entering offline mode', 
        'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;');
      this.notifyConnectionListeners(false, 'max_attempts_reached');
    }
    
    this.isRecovering = false;
  }

  /**
   * Test Firebase connection
   */
  async testConnection() {
    try {
      const testRef = ref(this.realtimeDb, '.info/serverTimeOffset');
      await get(testRef);
      return true;
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
    }
    
    this.connectionHealthCheck = setInterval(async () => {
      if (this.connectionState === 'connected') {
        try {
          await this.testConnection();
        } catch (error) {
          console.warn('%c[CONNECTION RECOVERY] Health check failed, connection may be unstable', 
            'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', error.message);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
  }

  /**
   * Add connection state listener
   */
  addConnectionListener(callback) {
    this.connectionListeners.add(callback);
    
    // Immediately notify with current state
    callback(this.connectionState === 'connected', this.connectionState);
    
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  /**
   * Notify all connection listeners
   */
  notifyConnectionListeners(isConnected, reason = null) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(isConnected, this.connectionState, reason);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Execute operation with retry and recovery
   */
  async executeWithRecovery(operation, maxRetries = 3) {
    return retryOperation(async () => {
      if (this.connectionState !== 'connected') {
        throw new Error('Not connected to Firebase Realtime Database');
      }
      
      return await operation();
    }, maxRetries);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return {
      state: this.connectionState,
      isRecovering: this.isRecovering,
      reconnectAttempts: this.reconnectAttempts,
      lastSuccessfulConnection: this.lastSuccessfulConnection,
      canRetry: this.reconnectAttempts < this.maxReconnectAttempts
    };
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnect() {
    if (this.isRecovering) {
      console.log('%c[CONNECTION RECOVERY] Reconnection already in progress', 
        'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return;
    }
    
    console.log('%c[CONNECTION RECOVERY] Forcing reconnection attempt', 
      'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
    
    this.reconnectAttempts = 0; // Reset attempts for manual retry
    await this.startRecoveryProcess();
  }

  /**
   * Reset connection state
   */
  reset() {
    this.reconnectAttempts = 0;
    this.isRecovering = false;
    this.lastSuccessfulConnection = null;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopHealthChecks();
    this.connectionListeners.clear();
    this.reset();
  }
}

// Create singleton instance
const connectionRecoveryService = new ConnectionRecoveryService();

export default connectionRecoveryService;
