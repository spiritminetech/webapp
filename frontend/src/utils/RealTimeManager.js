import appConfig from '../config/app.config.js';
import authService from '../services/AuthService.js';

/**
 * Real-Time Update Manager
 * Handles WebSocket connections with polling fallback for supervisor dashboard updates
 * Requirements: 1.4, 2.3, 4.5, 5.3, 5.6
 */
class RealTimeManager {
  constructor(supervisorId) {
    this.supervisorId = supervisorId;
    this.websocket = null;
    this.pollingInterval = null;
    this.syncQueue = [];
    this.eventHandlers = new Map();
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.pollingIntervalMs = 30000; // 30 seconds as per requirements
    this.heartbeatInterval = null;
    this.heartbeatIntervalMs = 25000; // 25 seconds
    
    // Bind methods to preserve context
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
    this.handleWebSocketOpen = this.handleWebSocketOpen.bind(this);
    this.handleWebSocketClose = this.handleWebSocketClose.bind(this);
    this.handleWebSocketError = this.handleWebSocketError.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  /**
   * Initialize real-time updates with WebSocket primary and polling fallback
   */
  async initialize() {
    try {
      appConfig.log('RealTimeManager: Initializing for supervisor', this.supervisorId);
      
      // Validate authentication
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required for real-time updates');
      }
      
      // Try WebSocket first
      await this.initializeWebSocket();
      
    } catch (error) {
      appConfig.error('RealTimeManager: WebSocket initialization failed, falling back to polling', error);
      this.fallbackToPolling();
    }
  }

  /**
   * Initialize WebSocket connection
   */
  async initializeWebSocket() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      appConfig.log('RealTimeManager: WebSocket already connected');
      return;
    }

    this.connectionState = 'connecting';
    this.notifyConnectionStateChange();

    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Construct WebSocket URL
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = appConfig.api.baseURL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/supervisor/${this.supervisorId}/updates?token=${encodeURIComponent(token)}`;
      
      appConfig.log('RealTimeManager: Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      
      this.websocket = new WebSocket(wsUrl);
      this.websocket.onopen = this.handleWebSocketOpen;
      this.websocket.onmessage = this.handleWebSocketMessage;
      this.websocket.onclose = this.handleWebSocketClose;
      this.websocket.onerror = this.handleWebSocketError;
      
    } catch (error) {
      appConfig.error('RealTimeManager: WebSocket setup failed', error);
      this.connectionState = 'error';
      this.notifyConnectionStateChange();
      throw error;
    }
  }

  /**
   * Handle WebSocket connection opened
   */
  handleWebSocketOpen(event) {
    appConfig.log('RealTimeManager: WebSocket connected');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    // Stop polling if it was running
    this.stopPolling();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process any queued sync actions
    this.processSyncQueue();
    
    this.notifyConnectionStateChange();
  }

  /**
   * Handle WebSocket message received
   */
  handleWebSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      appConfig.log('RealTimeManager: Received WebSocket message:', data.type);
      
      // Handle heartbeat response
      if (data.type === 'pong') {
        return;
      }
      
      // Dispatch to registered handlers
      this.dispatchEvent(data.type, data.payload);
      
    } catch (error) {
      appConfig.error('RealTimeManager: Failed to process WebSocket message', error);
    }
  }

  /**
   * Handle WebSocket connection closed
   */
  handleWebSocketClose(event) {
    appConfig.log('RealTimeManager: WebSocket closed', event.code, event.reason);
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    
    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      // Fall back to polling
      this.fallbackToPolling();
    }
    
    this.notifyConnectionStateChange();
  }

  /**
   * Handle WebSocket error
   */
  handleWebSocketError(event) {
    appConfig.error('RealTimeManager: WebSocket error', event);
    this.connectionState = 'error';
    this.notifyConnectionStateChange();
  }

  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    appConfig.log(`RealTimeManager: Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.initializeWebSocket();
      } catch (error) {
        appConfig.error('RealTimeManager: Reconnection failed', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.fallbackToPolling();
        }
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Fallback to polling when WebSocket is unavailable
   */
  fallbackToPolling() {
    appConfig.log('RealTimeManager: Falling back to polling mode');
    this.connectionState = 'polling';
    this.stopWebSocket();
    
    // Start polling
    this.pollingInterval = setInterval(() => {
      this.fetchUpdates();
    }, this.pollingIntervalMs);
    
    this.notifyConnectionStateChange();
  }

  /**
   * Fetch updates via HTTP polling
   */
  async fetchUpdates() {
    try {
      if (!authService.isAuthenticated()) {
        this.stopPolling();
        return;
      }

      const response = await fetch(
        appConfig.getFullApiUrl(`/supervisor/${this.supervisorId}/updates`),
        {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          await authService.refreshToken();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updates = await response.json();
      
      // Process each update
      if (updates && Array.isArray(updates)) {
        updates.forEach(update => {
          this.dispatchEvent(update.type, update.payload);
        });
      }

    } catch (error) {
      appConfig.error('RealTimeManager: Polling failed', error);
      
      // If authentication failed, stop polling
      if (error.message.includes('401')) {
        this.stopPolling();
      }
    }
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      appConfig.log('RealTimeManager: Polling stopped');
    }
  }

  /**
   * Stop WebSocket connection
   */
  stopWebSocket() {
    this.stopHeartbeat();
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
  }

  /**
   * Register event handler for specific update types
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
    
    appConfig.log(`RealTimeManager: Registered handler for ${eventType}`);
  }

  /**
   * Unregister event handler
   */
  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        appConfig.log(`RealTimeManager: Unregistered handler for ${eventType}`);
      }
    }
  }

  /**
   * Dispatch event to registered handlers
   */
  dispatchEvent(eventType, payload) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          appConfig.error(`RealTimeManager: Handler error for ${eventType}`, error);
        }
      });
    } else {
      appConfig.log(`RealTimeManager: No handlers registered for ${eventType}`);
    }
  }

  /**
   * Queue action for offline sync
   */
  queueAction(action) {
    const queueItem = {
      ...action,
      timestamp: Date.now(),
      id: this.generateUUID()
    };
    
    this.syncQueue.push(queueItem);
    
    // Persist to localStorage
    try {
      localStorage.setItem(
        `supervisor_sync_queue_${this.supervisorId}`, 
        JSON.stringify(this.syncQueue)
      );
      appConfig.log('RealTimeManager: Action queued for sync', queueItem.id);
    } catch (error) {
      appConfig.error('RealTimeManager: Failed to persist sync queue', error);
    }
  }

  /**
   * Process queued sync actions
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0) {
      return;
    }

    appConfig.log(`RealTimeManager: Processing ${this.syncQueue.length} queued actions`);
    
    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const action of queue) {
      try {
        await this.executeQueuedAction(action);
        appConfig.log('RealTimeManager: Queued action executed', action.id);
      } catch (error) {
        appConfig.error('RealTimeManager: Failed to execute queued action', action.id, error);
        // Re-queue failed actions
        this.syncQueue.push(action);
      }
    }

    // Update localStorage
    try {
      localStorage.setItem(
        `supervisor_sync_queue_${this.supervisorId}`, 
        JSON.stringify(this.syncQueue)
      );
    } catch (error) {
      appConfig.error('RealTimeManager: Failed to update sync queue', error);
    }
  }

  /**
   * Execute a queued action
   */
  async executeQueuedAction(action) {
    const { type, payload } = action;
    
    switch (type) {
      case 'APPROVAL_DECISION':
        await this.syncApprovalDecision(payload);
        break;
      case 'ALERT_ACKNOWLEDGE':
        await this.syncAlertAcknowledge(payload);
        break;
      default:
        appConfig.log('RealTimeManager: Unknown queued action type', type);
    }
  }

  /**
   * Sync approval decision
   */
  async syncApprovalDecision(payload) {
    const response = await fetch(
      appConfig.getFullApiUrl(`/supervisor/approval/${payload.approvalId}/process`),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision: payload.decision,
          remarks: payload.remarks
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync approval decision: ${response.statusText}`);
    }
  }

  /**
   * Sync alert acknowledgment
   */
  async syncAlertAcknowledge(payload) {
    const response = await fetch(
      appConfig.getFullApiUrl(`/supervisor/alert/${payload.alertId}/acknowledge`),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync alert acknowledgment: ${response.statusText}`);
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, reduce activity
      this.stopHeartbeat();
    } else {
      // Page is visible, resume activity
      if (this.connectionState === 'connected') {
        this.startHeartbeat();
      } else if (this.connectionState === 'disconnected') {
        // Try to reconnect
        this.initialize();
      }
    }
  }

  /**
   * Handle network connectivity changes
   */
  handleNetworkChange(isOnline) {
    appConfig.log('RealTimeManager: Network status changed', isOnline ? 'online' : 'offline');
    
    if (isOnline) {
      // Network is back, try to reconnect
      if (this.connectionState !== 'connected') {
        this.initialize();
      }
    } else {
      // Network is down, prepare for offline mode
      this.stopWebSocket();
      this.stopPolling();
      this.connectionState = 'offline';
      this.notifyConnectionStateChange();
    }
  }

  /**
   * Notify connection state changes
   */
  notifyConnectionStateChange() {
    this.dispatchEvent('CONNECTION_STATE_CHANGED', {
      state: this.connectionState,
      timestamp: Date.now()
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return {
      state: this.connectionState,
      isConnected: this.connectionState === 'connected',
      isPolling: this.connectionState === 'polling',
      isOffline: this.connectionState === 'offline',
      queuedActions: this.syncQueue.length
    };
  }

  /**
   * Load sync queue from localStorage
   */
  loadSyncQueue() {
    try {
      const stored = localStorage.getItem(`supervisor_sync_queue_${this.supervisorId}`);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        appConfig.log(`RealTimeManager: Loaded ${this.syncQueue.length} queued actions`);
      }
    } catch (error) {
      appConfig.error('RealTimeManager: Failed to load sync queue', error);
      this.syncQueue = [];
    }
  }

  /**
   * Generate UUID for queue items
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    appConfig.log('RealTimeManager: Destroying instance');
    
    this.stopWebSocket();
    this.stopPolling();
    this.eventHandlers.clear();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', () => this.handleNetworkChange(true));
    window.removeEventListener('offline', () => this.handleNetworkChange(false));
  }
}

// Event type constants for supervisor dashboard updates
export const UPDATE_EVENTS = {
  // Workforce updates (Requirement 2.3)
  WORKFORCE_COUNT_CHANGED: 'workforce_count_changed',
  WORKER_STATUS_CHANGED: 'worker_status_changed',
  
  // Attendance updates (Requirement 1.4)
  ATTENDANCE_UPDATED: 'attendance_updated',
  GEOFENCE_VIOLATION: 'geofence_violation',
  LATE_CHECKIN: 'late_checkin',
  MISSING_CHECKOUT: 'missing_checkout',
  
  // Approval updates (Requirement 4.5)
  NEW_APPROVAL_REQUEST: 'new_approval_request',
  APPROVAL_PROCESSED: 'approval_processed',
  
  // Alert updates (Requirement 5.3, 5.6)
  CRITICAL_ALERT: 'critical_alert',
  ALERT_ESCALATED: 'alert_escalated',
  SAFETY_ALERT: 'safety_alert',
  
  // Project updates
  PROJECT_STATUS_CHANGED: 'project_status_changed',
  
  // Connection state
  CONNECTION_STATE_CHANGED: 'connection_state_changed'
};

export default RealTimeManager;