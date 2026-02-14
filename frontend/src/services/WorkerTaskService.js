import { apiClient } from '../api/axios.js';
import appConfig from '../config/app.config.js';

/**
 * Worker Task API Service
 * Handles all worker task-related API operations for mobile app
 */
class WorkerTaskService {
  constructor() {
    this.client = apiClient;
    this.baseEndpoint = '/api/worker';
  }

  /**
   * Get today's tasks for the current worker
   * @returns {Promise<Object>} Today's task data with project, supervisor, and task details
   */
  async getTodaysTasks() {
    try {
      const response = await this.client.get(`${this.baseEndpoint}/tasks/today`);
      // API returns { success: true, data: { project, supervisor, tasks, ... } }
      // Extract the data portion for compatibility
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      this.handleError('getTodaysTasks', error);
      throw error;
    }
  }

  /**
   * Start a task with geofence validation
   * @param {number} assignmentId - Task assignment ID
   * @param {Object} location - Current location {latitude, longitude, accuracy, timestamp}
   * @returns {Promise<Object>} Task start confirmation
   */
  async startTask(assignmentId, location) {
    try {
      const response = await this.client.post(`${this.baseEndpoint}/task/start`, {
        assignmentId,
        location
      });
      return response.data;
    } catch (error) {
      this.handleError('startTask', error);
      throw error;
    }
  }

  /**
   * Submit task progress update
   * @param {Object} progressData - Progress data including assignmentId, progressPercent, description, etc.
   * @returns {Promise<Object>} Progress update confirmation
   */
  async submitProgress(progressData) {
    try {
      const response = await this.client.post(`${this.baseEndpoint}/task-progress`, progressData);
      return response.data;
    } catch (error) {
      this.handleError('submitProgress', error);
      throw error;
    }
  }

  /**
   * Upload task photos
   * @param {number} assignmentId - Task assignment ID
   * @param {Array} photos - Array of photo files
   * @param {Array} captions - Array of photo captions
   * @param {Object} location - Current location
   * @param {Function} onUploadProgress - Progress callback
   * @returns {Promise<Object>} Photo upload confirmation
   */
  async uploadPhotos(assignmentId, photos, captions = [], location = null, onUploadProgress = null) {
    try {
      const formData = new FormData();
      formData.append('assignmentId', assignmentId);
      
      // Add photos
      photos.forEach((photo, index) => {
        formData.append('photos', photo, `photo_${index}.jpg`);
      });
      
      // Add captions
      captions.forEach((caption, index) => {
        formData.append('captions', caption || '');
      });
      
      // Add location if provided
      if (location) {
        formData.append('location', JSON.stringify(location));
      }

      const response = await this.client.post(`${this.baseEndpoint}/task/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress
      });
      
      return response.data;
    } catch (error) {
      this.handleError('uploadPhotos', error);
      throw error;
    }
  }

  /**
   * Validate current location against project geofence
   * @param {number} latitude - Current latitude
   * @param {number} longitude - Current longitude
   * @param {number} projectId - Project ID (optional)
   * @param {number} accuracy - GPS accuracy in meters (optional)
   * @returns {Promise<Object>} Geofence validation result
   */
  async validateGeofence(latitude, longitude, projectId = null, accuracy = null) {
    try {
      const params = { latitude, longitude };
      if (projectId) {
        params.projectId = projectId;
      }
      if (accuracy !== null && accuracy > 0) {
        params.accuracy = accuracy;
      }
      
      const response = await this.client.get(`${this.baseEndpoint}/geofence/validate`, { params });
      return response.data;
    } catch (error) {
      this.handleError('validateGeofence', error);
      throw error;
    }
  }

  /**
   * Report an issue with a task
   * @param {Object} issueData - Issue details including assignmentId, issueType, description, etc.
   * @returns {Promise<Object>} Issue report confirmation
   */
  async reportIssue(issueData) {
    try {
      const response = await this.client.post(`${this.baseEndpoint}/task/issue`, issueData);
      return response.data;
    } catch (error) {
      this.handleError('reportIssue', error);
      throw error;
    }
  }

  /**
   * Get tools and materials for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Tools and materials data
   */
  async getToolsAndMaterials(projectId) {
    try {
      const response = await this.client.get(`/api/project/tools-materials`, {
        params: { projectId }
      });
      return response.data;
    } catch (error) {
      this.handleError('getToolsAndMaterials', error);
      throw error;
    }
  }

  /**
   * Handle API errors with consistent logging
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   */
  handleError(operation, error) {
    const message = error.response?.data?.message || error.message;
    const status = error.response?.status;
    
    appConfig.error(`WorkerTaskService.${operation} failed:`, {
      message,
      status,
      endpoint: error.config?.url
    });

    // Add user-friendly error messages
    if (status === 400) {
      error.userMessage = 'Invalid request. Please check your input and try again.';
    } else if (status === 401) {
      error.userMessage = 'You are not authorized to perform this action.';
    } else if (status === 403) {
      error.userMessage = 'Access denied. Please contact your supervisor.';
    } else if (status === 404) {
      error.userMessage = 'The requested resource was not found.';
    } else if (status === 422) {
      error.userMessage = error.response?.data?.message || 'Validation failed. Please check your input.';
    } else if (status >= 500) {
      error.userMessage = 'Server error. Please try again later or contact support.';
    } else if (!status) {
      error.userMessage = 'Network error. Please check your internet connection.';
    } else {
      error.userMessage = 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get full URL for external use
   * @param {string} endpoint - Endpoint path
   * @returns {string} Full URL
   */
  getFullUrl(endpoint) {
    return appConfig.getFullApiUrl(`${this.baseEndpoint}${endpoint}`);
  }
}

// Export singleton instance
const workerTaskService = new WorkerTaskService();
export default workerTaskService;