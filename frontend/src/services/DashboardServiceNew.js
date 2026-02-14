import { apiClient } from '../api/axios.js';
import appConfig from '../config/app.config.js';

/**
 * New Dashboard Service - Circular Dependency Free
 * Handles all dashboard-related API operations without circular dependencies
 */
class DashboardServiceNew {
  constructor() {
    this.client = apiClient;
    this.baseEndpoint = '/api/worker';
    this.subscriptions = new Map();
    this.updateCallbacks = new Map();
    this.refreshInterval = null;
    this.defaultRefreshRate = 30000; // 30 seconds
  }

  /**
   * Get complete dashboard data for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getDashboardData(workerId) {
    try {
      if (!workerId) {
        throw new Error('Worker ID is required');
      }

      appConfig.log('Fetching dashboard data for worker:', workerId);

      // Get dashboard data from multiple endpoints
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

      appConfig.log('Dashboard data fetched successfully:', workerId);
      return dashboardData;

    } catch (error) {
      appConfig.error('Failed to fetch dashboard data:', error);
      throw new Error(`Dashboard data fetch failed: ${error.message}`);
    }
  }

  /**
   * Get project information for a worker
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Project information
   */
  async getProjectInfo(workerId) {
    try {
      // Get today's tasks which includes project info
      const response = await this.client.get(`${this.baseEndpoint}/tasks/today`);
      const tasksData = response.data;
      
      if (!tasksData || !tasksData.success || !tasksData.data) {
        return {
          projectId: null,
          projectName: null,
          siteName: null,
          siteAddress: null,
          siteLocation: null,
          geofence: null,
          supervisorInfo: null
        };
      }

      const { project, supervisor } = tasksData.data;

      return {
        projectId: project?.id,
        projectName: project?.name,
        siteName: project?.siteName || project?.name,
        siteAddress: project?.address || project?.location,
        siteLocation: project?.location ? {
          latitude: project.location.latitude,
          longitude: project.location.longitude
        } : (project?.geofence ? {
          latitude: project.geofence.latitude,
          longitude: project.geofence.longitude
        } : null),
        geofence: project?.geofence ? {
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

    } catch (error) {
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
      appConfig.log('Fetching notifications for worker:', workerId);
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
      const response = await this.client.get(`${this.baseEndpoint}/tasks/today`);
      const tasksData = response.data;
      
      if (!tasksData || !tasksData.success || !tasksData.data || !tasksData.data.shift) {
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

      const { shift } = tasksData.data;

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
   * Clean up resources
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.updateCallbacks.clear();
    this.subscriptions.clear();
    
    appConfig.log('Dashboard service cleaned up');
  }
}

// Export singleton instance
const dashboardServiceNew = new DashboardServiceNew();
export default dashboardServiceNew;