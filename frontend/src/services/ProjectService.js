import ApiService from './ApiService.js';
import appConfig from '../config/app.config.js';

/**
 * Project Service
 * Handles project-related API operations for supervisors with real-time updates
 */
class ProjectService extends ApiService {
  constructor() {
    super(appConfig.api.endpoints.projects);
    this.websocket = null;
    this.pollingInterval = null;
    this.subscribers = new Map();
    this.isOnline = navigator.onLine;
    this.cache = new Map();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.reconnectWebSocket();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.closeWebSocket();
    });
  }

  /**
   * Get projects assigned to a specific supervisor
   * @param {string} supervisorId - The supervisor's ID
   * @returns {Promise<Array<ProjectData>>} Array of assigned projects with complete information
   */
  async getAssignedProjects(supervisorId) {
    try {
      const cacheKey = `assigned_projects_${supervisorId}`;
      
      // Return cached data if offline
      if (!this.isOnline && this.cache.has(cacheKey)) {
        appConfig.log('Returning cached assigned projects (offline mode)');
        return this.cache.get(cacheKey);
      }

      const response = await this.client.get(`${appConfig.api.endpoints.supervisors}/${supervisorId}/projects`);
      
      // Transform response to match ProjectData interface
      const projects = response.data.map(project => ({
        projectId: project._id || project.projectId,
        projectName: project.name || project.projectName,
        siteLocation: {
          address: project.location?.address || project.siteLocation?.address || '',
          coordinates: project.location?.coordinates || project.siteLocation?.coordinates || [0, 0]
        },
        status: project.status || 'active',
        workerCount: project.workerCount || project.assignedWorkers?.length || 0,
        lastUpdated: new Date(project.lastUpdated || project.updatedAt || Date.now())
      }));

      // Cache the data
      this.cache.set(cacheKey, projects);
      
      return projects;
    } catch (error) {
      // Return cached data if available during error
      const cacheKey = `assigned_projects_${supervisorId}`;
      if (this.cache.has(cacheKey)) {
        appConfig.log('Returning cached assigned projects due to error');
        return this.cache.get(cacheKey);
      }
      
      this.handleError('getAssignedProjects', error);
      throw error;
    }
  }

  /**
   * Get detailed project information
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Project details
   */
  async getProjectDetails(projectId) {
    try {
      const response = await this.client.get(`${this.endpoint}/${projectId}`);
      return response.data;
    } catch (error) {
      this.handleError('getProjectDetails', error);
      throw error;
    }
  }

  /**
   * Get project workforce count
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Workforce count data
   */
  async getProjectWorkforceCount(projectId) {
    try {
      const response = await this.client.get(`${this.endpoint}/${projectId}/workforce-count`);
      return response.data;
    } catch (error) {
      this.handleError('getProjectWorkforceCount', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time project updates
   * @param {string} supervisorId - The supervisor's ID
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToProjectUpdates(supervisorId, callback) {
    if (!supervisorId || typeof callback !== 'function') {
      throw new Error('supervisorId and callback are required for project updates subscription');
    }

    const subscriptionId = `${supervisorId}_${Date.now()}`;
    this.subscribers.set(subscriptionId, { supervisorId, callback });

    // Initialize WebSocket connection if not already connected
    if (!this.websocket && this.isOnline) {
      this.initializeWebSocket(supervisorId);
    } else if (!this.isOnline) {
      // Start polling as fallback when offline
      this.startPolling(supervisorId);
    }

    appConfig.log(`Subscribed to project updates for supervisor: ${supervisorId}`);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriptionId);
      appConfig.log(`Unsubscribed from project updates: ${subscriptionId}`);
      
      // Close WebSocket if no more subscribers
      if (this.subscribers.size === 0) {
        this.closeWebSocket();
        this.stopPolling();
      }
    };
  }

  /**
   * Initialize WebSocket connection for real-time updates
   * @private
   */
  initializeWebSocket(supervisorId) {
    try {
      const wsUrl = appConfig.api.baseURL.replace('http', 'ws') + `/supervisor/${supervisorId}/updates`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        appConfig.log('WebSocket connected for project updates');
        this.stopPolling(); // Stop polling when WebSocket is connected
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          appConfig.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        appConfig.log('WebSocket connection closed, falling back to polling');
        this.websocket = null;
        if (this.subscribers.size > 0 && this.isOnline) {
          this.startPolling(supervisorId);
        }
      };

      this.websocket.onerror = (error) => {
        appConfig.error('WebSocket error:', error);
        this.websocket = null;
        if (this.subscribers.size > 0 && this.isOnline) {
          this.startPolling(supervisorId);
        }
      };
    } catch (error) {
      appConfig.error('Failed to initialize WebSocket:', error);
      if (this.subscribers.size > 0) {
        this.startPolling(supervisorId);
      }
    }
  }

  /**
   * Handle WebSocket messages
   * @private
   */
  handleWebSocketMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'PROJECT_STATUS_CHANGED':
      case 'WORKFORCE_COUNT_CHANGED':
      case 'PROJECT_UPDATED':
        this.notifySubscribers(data);
        this.invalidateCache(payload.supervisorId);
        break;
      default:
        appConfig.log('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Start polling as fallback for real-time updates
   * @private
   */
  startPolling(supervisorId) {
    if (this.pollingInterval) {
      return; // Already polling
    }

    appConfig.log('Starting polling for project updates');
    this.pollingInterval = setInterval(async () => {
      try {
        const projects = await this.getAssignedProjects(supervisorId);
        this.notifySubscribers({
          type: 'PROJECT_POLLING_UPDATE',
          payload: { supervisorId, projects }
        });
      } catch (error) {
        appConfig.error('Polling error:', error);
      }
    }, 30000); // 30-second intervals as per requirements
  }

  /**
   * Stop polling
   * @private
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      appConfig.log('Stopped polling for project updates');
    }
  }

  /**
   * Close WebSocket connection
   * @private
   */
  closeWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      appConfig.log('WebSocket connection closed');
    }
  }

  /**
   * Reconnect WebSocket after coming back online
   * @private
   */
  reconnectWebSocket() {
    if (this.subscribers.size > 0) {
      const supervisorId = Array.from(this.subscribers.values())[0].supervisorId;
      this.initializeWebSocket(supervisorId);
    }
  }

  /**
   * Notify all subscribers of updates
   * @private
   */
  notifySubscribers(data) {
    this.subscribers.forEach(({ callback }) => {
      try {
        callback(data);
      } catch (error) {
        appConfig.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Invalidate cache for a supervisor
   * @private
   */
  invalidateCache(supervisorId) {
    const cacheKey = `assigned_projects_${supervisorId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.closeWebSocket();
    this.stopPolling();
    this.subscribers.clear();
    this.cache.clear();
    
    window.removeEventListener('online', this.reconnectWebSocket);
    window.removeEventListener('offline', this.closeWebSocket);
  }
}

// Export singleton instance
const projectService = new ProjectService();
export default projectService;