import workerTaskService from './WorkerTaskService.js';
import photoService from './PhotoService.js';
import offlineService from './OfflineService.js';
import geofenceService from './GeofenceService.js';
import appConfig from '../config/app.config.js';

/**
 * Worker Mobile API Service
 * High-level API service that integrates all worker mobile functionality
 * Handles offline/online modes, error handling, and retry logic
 */
class WorkerMobileApiService {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.requestTimeout = 30000; // 30 seconds
  }

  /**
   * Get today's tasks with offline support
   * @param {boolean} forceRefresh - Force refresh from server
   * @returns {Promise<Object>} Task data
   */
  async getTodaysTasks(forceRefresh = false) {
    try {
      // Try to get fresh data if online and not forced offline
      if (!offlineService.isOffline() || forceRefresh) {
        try {
          const taskData = await this.executeWithRetry(() => 
            workerTaskService.getTodaysTasks()
          );
          
          // Cache the data for offline use
          offlineService.cacheTaskData(taskData);
          
          return taskData;
        } catch (error) {
          appConfig.warn('Failed to fetch fresh task data, trying cache:', error.message);
        }
      }

      // Fallback to cached data
      const cachedData = offlineService.getCachedTaskData();
      if (cachedData) {
        appConfig.log('Using cached task data');
        return {
          ...cachedData,
          _cached: true,
          _cacheTimestamp: Date.now()
        };
      }

      throw new Error('No task data available offline');
    } catch (error) {
      appConfig.error('Failed to get today\'s tasks:', error);
      throw error;
    }
  }

  /**
   * Start a task with geofence validation and offline support
   * @param {number} assignmentId - Task assignment ID
   * @param {Object} location - Current location (optional, will get current if not provided)
   * @returns {Promise<Object>} Start task result
   */
  async startTask(assignmentId, location = null) {
    try {
      // Get current location if not provided
      if (!location) {
        location = await geofenceService.getCurrentLocation();
      }

      // Validate geofence first
      const geofenceResult = await geofenceService.validateLocation(
        location.latitude, 
        location.longitude
      );

      if (!geofenceResult.data.canStartTasks) {
        throw new Error(`Cannot start task: ${geofenceResult.data.message}`);
      }

      const taskData = { assignmentId, location };

      // Try to start task online
      if (!offlineService.isOffline()) {
        try {
          return await this.executeWithRetry(() => 
            workerTaskService.startTask(assignmentId, location)
          );
        } catch (error) {
          appConfig.warn('Failed to start task online, queuing for offline sync:', error.message);
        }
      }

      // Queue for offline sync
      offlineService.queueOperation({
        type: 'startTask',
        data: taskData
      });

      return {
        success: true,
        data: {
          assignmentId,
          status: 'queued_for_sync',
          startTime: new Date().toISOString(),
          geofenceValidation: geofenceResult.data
        },
        message: 'Task start queued for synchronization'
      };
    } catch (error) {
      appConfig.error('Failed to start task:', error);
      throw error;
    }
  }

  /**
   * Submit task progress with offline support
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Progress submission result
   */
  async submitProgress(progressData) {
    try {
      // Add current location if not provided
      if (!progressData.location) {
        try {
          progressData.location = await geofenceService.getCurrentLocation();
        } catch (locationError) {
          appConfig.warn('Could not get current location for progress update:', locationError.message);
        }
      }

      // Try to submit online
      if (!offlineService.isOffline()) {
        try {
          return await this.executeWithRetry(() => 
            workerTaskService.submitProgress(progressData)
          );
        } catch (error) {
          appConfig.warn('Failed to submit progress online, queuing for offline sync:', error.message);
        }
      }

      // Queue for offline sync
      offlineService.queueOperation({
        type: 'submitProgress',
        data: progressData
      });

      return {
        success: true,
        data: {
          assignmentId: progressData.assignmentId,
          progressPercent: progressData.progressPercent,
          status: 'queued_for_sync',
          submittedAt: new Date().toISOString()
        },
        message: 'Progress update queued for synchronization'
      };
    } catch (error) {
      appConfig.error('Failed to submit progress:', error);
      throw error;
    }
  }

  /**
   * Upload task photos with compression and offline support
   * @param {number} assignmentId - Task assignment ID
   * @param {Array} photoFiles - Array of photo files
   * @param {Array} captions - Array of photo captions
   * @param {Object} location - Current location
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Photo upload result
   */
  async uploadTaskPhotos(assignmentId, photoFiles, captions = [], location = null, onProgress = null) {
    try {
      // Get current location if not provided
      if (!location) {
        try {
          location = await geofenceService.getCurrentLocation();
        } catch (locationError) {
          appConfig.warn('Could not get current location for photo upload:', locationError.message);
        }
      }

      // Try to upload online
      if (!offlineService.isOffline()) {
        try {
          return await photoService.uploadTaskPhotos(
            assignmentId, 
            photoFiles, 
            captions, 
            location, 
            onProgress
          );
        } catch (error) {
          appConfig.warn('Failed to upload photos online, queuing for offline sync:', error.message);
        }
      }

      // For offline mode, we need to store photos locally
      // This is a simplified implementation - in production, you might want to use IndexedDB
      const photoData = {
        assignmentId,
        photos: photoFiles,
        captions,
        location,
        timestamp: Date.now()
      };

      offlineService.queueOperation({
        type: 'uploadPhotos',
        data: photoData
      });

      return {
        success: true,
        data: {
          assignmentId,
          photoCount: photoFiles.length,
          status: 'queued_for_sync',
          uploadedAt: new Date().toISOString()
        },
        message: 'Photo upload queued for synchronization'
      };
    } catch (error) {
      appConfig.error('Failed to upload photos:', error);
      throw error;
    }
  }

  /**
   * Report an issue with offline support
   * @param {Object} issueData - Issue data
   * @returns {Promise<Object>} Issue report result
   */
  async reportIssue(issueData) {
    try {
      // Add current location if not provided
      if (!issueData.location) {
        try {
          const currentLocation = await geofenceService.getCurrentLocation();
          issueData.location = {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            workArea: issueData.workArea || 'Unknown'
          };
        } catch (locationError) {
          appConfig.warn('Could not get current location for issue report:', locationError.message);
        }
      }

      // Try to report online
      if (!offlineService.isOffline()) {
        try {
          return await this.executeWithRetry(() => 
            workerTaskService.reportIssue(issueData)
          );
        } catch (error) {
          appConfig.warn('Failed to report issue online, queuing for offline sync:', error.message);
        }
      }

      // Queue for offline sync
      offlineService.queueOperation({
        type: 'reportIssue',
        data: issueData
      });

      return {
        success: true,
        data: {
          assignmentId: issueData.assignmentId,
          issueType: issueData.issueType,
          status: 'queued_for_sync',
          reportedAt: new Date().toISOString(),
          ticketNumber: `OFFLINE_${Date.now()}`
        },
        message: 'Issue report queued for synchronization'
      };
    } catch (error) {
      appConfig.error('Failed to report issue:', error);
      throw error;
    }
  }

  /**
   * Validate current location against geofence
   * @param {number} projectId - Project ID (optional)
   * @returns {Promise<Object>} Geofence validation result
   */
  async validateCurrentLocation(projectId = null) {
    try {
      return await geofenceService.validateCurrentLocation(projectId);
    } catch (error) {
      appConfig.error('Failed to validate current location:', error);
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
      return await this.executeWithRetry(() => 
        workerTaskService.getToolsAndMaterials(projectId)
      );
    } catch (error) {
      appConfig.error('Failed to get tools and materials:', error);
      throw error;
    }
  }

  /**
   * Sync all offline data
   * @returns {Promise<Object>} Sync results
   */
  async syncOfflineData() {
    try {
      return await offlineService.syncQueuedOperations();
    } catch (error) {
      appConfig.error('Failed to sync offline data:', error);
      throw error;
    }
  }

  /**
   * Get offline status and statistics
   * @returns {Object} Offline status
   */
  getOfflineStatus() {
    return {
      isOffline: offlineService.isOffline(),
      queuedOperations: offlineService.getQueuedOperationsCount(),
      cacheStatus: offlineService.getCacheStatus(),
      locationStatus: geofenceService.getLocationStatus()
    };
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {number} attempts - Number of attempts (default: this.retryAttempts)
   * @returns {Promise} Operation result
   */
  async executeWithRetry(operation, attempts = this.retryAttempts) {
    let lastError;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
          )
        ]);
      } catch (error) {
        lastError = error;
        
        if (i < attempts - 1) {
          const delay = this.retryDelay * Math.pow(2, i); // Exponential backoff
          appConfig.warn(`Operation failed, retrying in ${delay}ms (attempt ${i + 1}/${attempts}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Initialize the service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Request location permissions
      await geofenceService.requestLocationPermission();
      
      // Sync any pending offline operations
      if (!offlineService.isOffline()) {
        await offlineService.syncQueuedOperations();
      }
      
      appConfig.log('WorkerMobileApiService initialized successfully');
    } catch (error) {
      appConfig.warn('WorkerMobileApiService initialization warning:', error.message);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    geofenceService.cleanup();
    appConfig.log('WorkerMobileApiService cleaned up');
  }
}

// Export singleton instance
const workerMobileApiService = new WorkerMobileApiService();
export default workerMobileApiService;