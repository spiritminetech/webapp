import ApiService from './ApiService.js';
import workerTaskService from './WorkerTaskService.js';
import geofenceIntegrationService from './GeofenceIntegrationService.js';
import performanceService from './PerformanceService.js';
import appConfig from '../config/app.config.js';

/**
 * Dashboard Service for Worker Mobile Dashboard
 * Handles all dashboard-related API operations with real-time updates
 */
class DashboardService extends ApiService {
  constructor() {
    super('/api/worker');
    this.subscriptions = new Map();
    this.updateCallbacks = new Map();
    this.isInitialized = false;
    this.refreshInterval = null;
    this.defaultRefreshRate = 30000; // 30 seconds
    this._authService = null; // Lazy loaded to avoid circular dependency
  }

  /**
   * Lazy load authService to avoid circular dependency
   * @returns {Promise<Object>} AuthService instance
   */
  async getAuthService() {
    if (!this._authService) {
      try {
        const authServiceModule = await import('./AuthService.js');
        this._authService = authServiceModule.default;
      } catch (error) {
        console.warn('Could not load AuthService:', error);
        // Return a mock service to prevent errors
        this._authService = {
          getToken: () => null,
          isAuthenticated: () => false,
          getUserFromToken: () => null,
          shouldRefreshToken: () => false,
          refreshToken: () => Promise.reject(new Error('AuthService not available'))
        };
      }
    }
    return this._authService;
  }

  /**
   * Get complete dashboard data for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getDashboardData(workerId) {
    const measurementId = performanceService.startApiCall('getDashboardData');
    
    try {
      if (!workerId) {
        throw new Error('Worker ID is required');
      }

      // Get auth service instance
      const authService = await this.getAuthService();

      // Validate authentication - Requirement 9.1
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required - Requirement 9.1');
      }

      // Ensure data isolation - verify the authenticated user matches the requested worker - Requirement 9.3
      const tokenUser = authService.getUserFromToken();
      if (!tokenUser) {
        throw new Error('Unable to verify user identity - Requirement 9.3');
      }

      const authenticatedUserId = tokenUser.userId;
      if (authenticatedUserId !== workerId) {
        appConfig.error('Data isolation violation attempt - Requirement 9.3', {
          authenticatedUserId,
          requestedWorkerId: workerId
        });
        throw new Error('Access denied: Worker ID mismatch - Requirement 9.3');
      }

      // Additional security check: validate user role
      const userRole = tokenUser.role;
      if (!userRole || !['WORKER', 'DRIVER', 'SUPERVISOR'].includes(userRole)) {
        appConfig.error('Invalid user role for dashboard access - Requirement 9.3', { userRole });
        throw new Error('Access denied: Invalid user role - Requirement 9.3');
      }

      // Check if token needs refresh - Requirement 9.2
      if (authService.shouldRefreshToken()) {
        try {
          await authService.refreshToken();
          appConfig.log('Token refreshed during dashboard data fetch - Requirement 9.2');
        } catch (refreshError) {
          appConfig.error('Token refresh failed during dashboard fetch - Requirement 9.2:', refreshError);
          throw new Error('Session expired. Please log in again. - Requirement 9.2');
        }
      }

      appConfig.log('Fetching dashboard data for authenticated worker - Requirement 9.1, 9.3:', workerId);

      // Get dashboard data from multiple endpoints with performance tracking
      const apiStartTime = performance.now();
      
      const [
        projectData,
        attendanceData,
        notificationsData,
        shiftData
      ] = await Promise.allSettled([
        this.getProjectInfo(workerId),
        this.getAttendanceStatus(workerId),
        this.getNotifications(workerId),
        this.getShiftInfo(workerId)
      ]);

      const apiEndTime = performance.now();
      const apiDuration = apiEndTime - apiStartTime;

      // Process results and handle partial failures
      const dashboardData = {
        workerId,
        projectInfo: this.extractResult(projectData, 'project information'),
        attendanceStatus: this.extractResult(attendanceData, 'attendance status'),
        notifications: this.extractResult(notificationsData, 'notifications', []),
        shiftInfo: this.extractResult(shiftData, 'shift information'),
        geofenceStatus: null, // Will be populated by real-time location updates
        lastUpdated: new Date()
      };

      // Initialize geofence integration if project has geofence data
      const projectInfo = dashboardData.projectInfo;
      if (projectInfo && projectInfo.geofence) {
        try {
          await geofenceIntegrationService.initialize(projectInfo.geofence);
          dashboardData.geofenceStatus = await geofenceIntegrationService.validateCurrentLocation(projectInfo.projectId);
        } catch (geofenceError) {
          appConfig.error('Geofence initialization failed:', geofenceError);
          dashboardData.geofenceStatus = {
            isWithinGeofence: false,
            distanceFromSite: null,
            lastValidationTime: new Date(),
            validationError: geofenceError.message,
            location: null,
            geofence: projectInfo.geofence,
            canStartTasks: false,
            message: `Geofence validation unavailable: ${geofenceError.message}`
          };
        }
      } else {
        // No geofence data available
        dashboardData.geofenceStatus = {
          isWithinGeofence: false,
          distanceFromSite: null,
          lastValidationTime: new Date(),
          validationError: 'Geofence data unavailable',
          location: null,
          geofence: null,
          canStartTasks: false,
          message: 'Warning: Geofence data is not available for this project. Location validation cannot be performed.',
          isGeofenceUnavailable: true
        };
      }

      // End performance measurement
      performanceService.endApiCall(measurementId, {
        workerId,
        apiDuration,
        dataSize: JSON.stringify(dashboardData).length,
        sectionsLoaded: Object.keys(dashboardData).length,
        hasGeofence: !!projectInfo?.geofence
      });

      appConfig.log('Dashboard data fetched successfully for authenticated worker - Requirements 9.1, 9.3 satisfied:', workerId);
      return dashboardData;

    } catch (error) {
      performanceService.endApiCall(measurementId, {
        error: error.message,
        workerId
      });
      appConfig.error('Failed to fetch dashboard data:', error);
      
      // Handle authentication errors specifically - Requirements 9.1, 9.2, 9.3
      if (error.message.includes('Authentication required') || 
          error.message.includes('Session expired') ||
          error.message.includes('Access denied')) {
        throw new Error(`Authentication error: ${error.message}`);
      }
      
      throw new Error(`Dashboard data fetch failed: ${error.message}`);
    }
  }

  /**
   * Get project information for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Project information
   */
  async getProjectInfo(workerId) {
    const measurementId = performanceService.startApiCall('getProjectInfo');
    
    try {
      // Use existing worker task service to get today's tasks which includes project info
      const tasksData = await workerTaskService.getTodaysTasks();
      
      if (!tasksData || !tasksData.project) {
        const result = {
          projectId: null,
          projectName: null,
          siteName: null,
          siteAddress: null,
          siteLocation: null,
          geofence: null,
          supervisorInfo: null
        };
        
        performanceService.endApiCall(measurementId, {
          hasProject: false,
          dataSize: JSON.stringify(result).length
        });
        
        return result;
      }

      const { project, supervisor } = tasksData;

      const result = {
        projectId: project.id,
        projectName: project.name,
        siteName: project.siteName || project.name,
        siteAddress: project.address || project.location,
        siteLocation: project.location ? {
          latitude: project.location.latitude,
          longitude: project.location.longitude
        } : (project.geofence ? {
          latitude: project.geofence.latitude,
          longitude: project.geofence.longitude
        } : null),
        geofence: project.geofence ? {
          center: {
            latitude: project.geofence.latitude,
            longitude: project.geofence.longitude
          },
          radius: project.geofence.radius
        } : null,
        supervisorInfo: supervisor ? {
          supervisorId: supervisor.id,
          name: supervisor.name,
          phoneNumber: supervisor.phone,
          isAvailableForCall: true,
          isAvailableForMessaging: true
        } : null
      };

      performanceService.endApiCall(measurementId, {
        hasProject: true,
        hasGeofence: !!project.geofence,
        hasSupervisor: !!supervisor,
        dataSize: JSON.stringify(result).length
      });

      return result;

    } catch (error) {
      performanceService.endApiCall(measurementId, {
        error: error.message
      });
      appConfig.error('Failed to fetch project info:', error);
      throw new Error(`Project info fetch failed: ${error.message}`);
    }
  }

  /**
   * Get attendance status for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Attendance status
   */
  async getAttendanceStatus(workerId) {
    try {
      // Get today's attendance directly from API
      const response = await this.client.get('/api/attendance/today');
      const attendanceData = response.data;
      
      if (!attendanceData) {
        return {
          currentStatus: 'not_logged_in',
          lastAction: {
            action: 'No activity today',
            timestamp: new Date()
          },
          todaysSummary: {}
        };
      }

      // Map attendance data to dashboard format
      const status = this.mapAttendanceStatus(attendanceData);
      
      return {
        currentStatus: status.currentStatus,
        lastAction: status.lastAction,
        todaysSummary: status.todaysSummary
      };

    } catch (error) {
      appConfig.error('Failed to fetch attendance status:', error);
      
      // Return default status if API call fails
      return {
        currentStatus: 'not_logged_in',
        lastAction: {
          action: 'Status unavailable',
          timestamp: new Date()
        },
        todaysSummary: {},
        error: 'Unable to fetch attendance status'
      };
    }
  }

  /**
   * Get notifications for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Array>} Notifications array
   */
  async getNotifications(workerId) {
    try {
      // For now, return empty array as notification system needs to be implemented
      // This would typically call a notifications endpoint
      appConfig.log('Fetching notifications for worker:', workerId);
      
      // Placeholder implementation - would be replaced with actual API call
      return [];

    } catch (error) {
      appConfig.error('Failed to fetch notifications:', error);
      throw new Error(`Notifications fetch failed: ${error.message}`);
    }
  }

  /**
   * Get shift information for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Shift information
   */
  async getShiftInfo(workerId) {
    try {
      // Get shift info from tasks data which includes shift details
      const tasksData = await workerTaskService.getTodaysTasks();
      
      if (!tasksData || !tasksData.shift) {
        return {
          shiftId: null,
          startTime: '08:00',
          endTime: '17:00',
          lunchBreak: {
            startTime: '12:00',
            endTime: '13:00'
          },
          overtimeStatus: 'inactive',
          overtimeAuthorized: false
        };
      }

      const { shift } = tasksData;

      return {
        shiftId: shift.id,
        startTime: shift.startTime || '08:00',
        endTime: shift.endTime || '17:00',
        lunchBreak: {
          startTime: shift.lunchStartTime || '12:00',
          endTime: shift.lunchEndTime || '13:00'
        },
        overtimeStatus: shift.overtimeAuthorized ? 'active' : 'inactive',
        overtimeAuthorized: Boolean(shift.overtimeAuthorized)
      };

    } catch (error) {
      appConfig.error('Failed to fetch shift info:', error);
      throw new Error(`Shift info fetch failed: ${error.message}`);
    }
  }

  /**
   * Subscribe to real-time updates for dashboard data
   * @param {string} workerId - Worker ID
   * @param {Function} callback - Update callback function
   * @returns {Object} Subscription object with unsubscribe method
   */
  async subscribeToUpdates(workerId, callback) {
    try {
      if (!workerId || typeof callback !== 'function') {
        throw new Error('Worker ID and callback function are required');
      }

      // Get auth service instance
      const authService = await this.getAuthService();

      // Validate authentication before subscribing - Requirement 9.1
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required for real-time updates - Requirement 9.1');
      }

      // Ensure data isolation - verify the authenticated user matches the requested worker - Requirement 9.3
      const tokenUser = authService.getUserFromToken();
      if (!tokenUser) {
        throw new Error('Unable to verify user identity for subscription - Requirement 9.3');
      }

      const authenticatedUserId = tokenUser.userId;
      if (authenticatedUserId !== workerId) {
        appConfig.error('Data isolation violation in subscription attempt - Requirement 9.3', {
          authenticatedUserId,
          requestedWorkerId: workerId
        });
        throw new Error('Access denied: Worker ID mismatch for subscription - Requirement 9.3');
      }

      const subscriptionId = `dashboard_${workerId}_${Date.now()}`;
      
      // Store callback with authentication context
      this.updateCallbacks.set(subscriptionId, {
        callback,
        workerId,
        authenticatedUserId,
        createdAt: new Date()
      });
      
      // Start polling for updates if not already started
      if (!this.refreshInterval) {
        this.startRealTimeUpdates(workerId);
      }

      appConfig.log('Subscribed to authenticated dashboard updates - Requirements 9.1, 9.3 satisfied:', subscriptionId);

      // Return subscription object
      return {
        id: subscriptionId,
        unsubscribe: () => {
          this.updateCallbacks.delete(subscriptionId);
          
          // Stop polling if no more subscribers
          if (this.updateCallbacks.size === 0 && this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            
            // Stop geofence real-time validation
            geofenceIntegrationService.stopRealTimeValidation();
          }
          
          appConfig.log('Unsubscribed from dashboard updates:', subscriptionId);
        }
      };

    } catch (error) {
      appConfig.error('Failed to subscribe to updates:', error);
      throw error;
    }
  }

  /**
   * Start real-time updates using polling with authentication checks
   * @param {string} workerId - Worker ID
   */
  async startRealTimeUpdates(workerId) {
    if (this.refreshInterval) {
      return; // Already started
    }

    this.refreshInterval = setInterval(async () => {
      try {
        // Get auth service instance
        const authService = await this.getAuthService();

        // Check authentication before each update - Requirement 9.1, 9.2
        if (!authService.isAuthenticated()) {
          appConfig.log('Authentication lost during real-time updates, stopping updates - Requirement 9.1');
          this.cleanup();
          return;
        }

        // Check if token needs refresh - Requirement 9.2
        if (authService.shouldRefreshToken()) {
          try {
            await authService.refreshToken();
            appConfig.log('Token refreshed during real-time updates - Requirement 9.2');
          } catch (refreshError) {
            appConfig.error('Token refresh failed during real-time updates - Requirement 9.2:', refreshError);
            this.cleanup();
            return;
          }
        }

        // Fetch fresh dashboard data
        const dashboardData = await this.getDashboardData(workerId);
        
        // Notify all subscribers with authentication validation
        this.updateCallbacks.forEach(async (callbackData, subscriptionId) => {
          try {
            // Get auth service instance
            const authService = await this.getAuthService();

            // Validate subscription is still for the authenticated user - Requirement 9.3
            const tokenUser = authService.getUserFromToken();
            if (!tokenUser || tokenUser.userId !== callbackData.authenticatedUserId) {
              appConfig.error('Authentication mismatch in subscription, removing - Requirement 9.3:', subscriptionId);
              this.updateCallbacks.delete(subscriptionId);
              return;
            }

            // Call the callback if authentication is valid
            if (typeof callbackData.callback === 'function') {
              callbackData.callback(dashboardData);
            } else {
              // Handle legacy callback format
              callbackData(dashboardData);
            }
          } catch (error) {
            appConfig.error('Error in update callback:', subscriptionId, error);
          }
        });

      } catch (error) {
        appConfig.error('Error in real-time update:', error);
        
        // If it's an authentication error, stop updates - Requirements 9.1, 9.2, 9.3
        if (error.message.includes('Authentication') || error.message.includes('Access denied')) {
          appConfig.log('Authentication error in real-time updates, stopping updates - Requirements 9.1, 9.2, 9.3');
          this.cleanup();
        }
      }
    }, this.defaultRefreshRate);

    // Set up real-time geofence validation
    this.setupGeofenceRealTimeUpdates(workerId);

    appConfig.log('Started authenticated real-time updates for worker - Requirements 9.1, 9.3 satisfied:', workerId);
  }

  /**
   * Set up real-time geofence validation updates
   * @param {string} workerId - Worker ID
   * @private
   */
  async setupGeofenceRealTimeUpdates(workerId) {
    try {
      // Get current project info to check for geofence
      const projectInfo = await this.getProjectInfo(workerId);
      
      if (projectInfo && projectInfo.geofence) {
        // Start real-time geofence validation
        geofenceIntegrationService.startRealTimeValidation(
          projectInfo.geofence,
          (geofenceStatus) => {
            // Notify all subscribers with updated geofence status
            this.updateCallbacks.forEach(async (callbackData, subscriptionId) => {
              try {
                // Get auth service instance
                const authService = await this.getAuthService();

                // Validate subscription is still for the authenticated user - Requirement 9.3
                const tokenUser = authService.getUserFromToken();
                if (!tokenUser || tokenUser.userId !== callbackData.authenticatedUserId) {
                  appConfig.error('Authentication mismatch in geofence subscription, removing - Requirement 9.3:', subscriptionId);
                  this.updateCallbacks.delete(subscriptionId);
                  return;
                }

                // Create partial update with just geofence status
                const partialUpdate = {
                  workerId,
                  geofenceStatus,
                  lastUpdated: new Date(),
                  isPartialUpdate: true,
                  updateType: 'geofence'
                };

                // Call the callback if authentication is valid
                if (typeof callbackData.callback === 'function') {
                  callbackData.callback(partialUpdate);
                } else {
                  // Handle legacy callback format
                  callbackData(partialUpdate);
                }
              } catch (error) {
                appConfig.error('Error in geofence update callback:', subscriptionId, error);
              }
            });
          }
        );
        
        appConfig.log('Real-time geofence validation started');
      }
    } catch (error) {
      appConfig.error('Failed to setup geofence real-time updates:', error);
    }
  }

  /**
   * Refresh dashboard data manually
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Fresh dashboard data
   */
  async refreshDashboardData(workerId) {
    try {
      appConfig.log('Manually refreshing dashboard data for worker:', workerId);
      return await this.getDashboardData(workerId);
    } catch (error) {
      appConfig.error('Failed to refresh dashboard data:', error);
      throw error;
    }
  }

  /**
   * Extract result from Promise.allSettled result
   * @param {Object} result - Promise.allSettled result
   * @param {string} dataType - Type of data for error messages
   * @param {*} defaultValue - Default value if extraction fails
   * @returns {*} Extracted value or default
   */
  extractResult(result, dataType, defaultValue = null) {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      appConfig.error(`Failed to fetch ${dataType}:`, result.reason);
      return defaultValue;
    }
  }

  /**
   * Map attendance data to dashboard format
   * @param {Object} attendanceData - Raw attendance data
   * @returns {Object} Mapped attendance status
   */
  mapAttendanceStatus(attendanceData) {
    const { session, checkInTime, checkOutTime, lunchStartTime, lunchEndTime, overtimeStartTime } = attendanceData;
    
    let currentStatus = 'not_logged_in';
    let lastAction = {
      action: 'No activity today',
      timestamp: new Date()
    };

    // Determine current status based on session and timestamps
    if (session === 'CHECKED_IN') {
      if (lunchStartTime && !lunchEndTime) {
        currentStatus = 'lunch';
        lastAction = {
          action: 'Started lunch break',
          timestamp: new Date(lunchStartTime)
        };
      } else if (overtimeStartTime) {
        currentStatus = 'overtime';
        lastAction = {
          action: 'Started overtime',
          timestamp: new Date(overtimeStartTime)
        };
      } else {
        currentStatus = 'logged_in';
        lastAction = {
          action: 'Checked in',
          timestamp: new Date(checkInTime)
        };
      }
    } else if (session === 'CHECKED_OUT') {
      currentStatus = 'logged_out';
      lastAction = {
        action: 'Checked out',
        timestamp: new Date(checkOutTime)
      };
    }

    return {
      currentStatus,
      lastAction,
      todaysSummary: {
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        lunchStartTime: lunchStartTime ? new Date(lunchStartTime) : null,
        lunchEndTime: lunchEndTime ? new Date(lunchEndTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        overtimeStartTime: overtimeStartTime ? new Date(overtimeStartTime) : null
      }
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.updateCallbacks.clear();
    this.subscriptions.clear();
    
    // Clean up geofence integration service
    geofenceIntegrationService.cleanup();
    
    appConfig.log('Dashboard service cleaned up');
  }
}

// Export singleton instance
const dashboardService = new DashboardService();
export default dashboardService;