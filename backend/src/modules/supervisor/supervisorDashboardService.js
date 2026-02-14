import Attendance from '../attendance/Attendance.js';
import Project from '../project/models/Project.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';
import LeaveRequest from '../leaveRequest/models/LeaveRequest.js';
import CompanyUser from '../companyUser/CompanyUser.js';
import alertService from './alertService.js';

/**
 * Supervisor Dashboard Service
 * Provides data aggregation and caching for supervisor dashboard functionality
 */
class SupervisorDashboardService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 1000; // 30 seconds in milliseconds
  }

  /**
   * Get complete dashboard data with caching
   * @param {Number} supervisorId - Supervisor employee ID
   * @returns {Object} Complete dashboard data
   */
  async getDashboardData(supervisorId) {
    const cacheKey = `dashboard_${supervisorId}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Validate supervisor
      await this.validateSupervisor(supervisorId);

      // Get current date boundaries
      const { todayStart, todayEnd } = this.getDateBoundaries();

      // Get assigned projects
      const projects = await this.getAssignedProjects(supervisorId);
      const projectIds = projects.map(p => p.id);

      // Aggregate all dashboard data
      const [workforceCount, attendanceRecords, pendingApprovals, alerts] = await Promise.all([
        this.getWorkforceCount(projectIds, todayStart, todayEnd),
        this.getAttendanceSummary(projectIds, todayStart, todayEnd),
        this.getPendingApprovals(supervisorId),
        this.getAlerts(projectIds, supervisorId, todayStart)
      ]);

      // Format dashboard response
      const dashboardData = {
        supervisorId,
        lastUpdated: new Date(),
        projects: projects.map(project => ({
          projectId: project.id,
          projectName: project.projectName,
          siteLocation: {
            address: project.address,
            coordinates: [project.longitude || 0, project.latitude || 0]
          },
          status: this.normalizeProjectStatus(project.status),
          workerCount: workforceCount.projectWorkerCounts[project.id] || 0,
          lastUpdated: new Date()
        })),
        workforceCount: {
          total: workforceCount.total,
          present: workforceCount.present,
          absent: workforceCount.absent,
          late: workforceCount.late,
          onLeave: workforceCount.onLeave,
          overtime: workforceCount.overtime,
          lastUpdated: new Date()
        },
        attendanceRecords,
        pendingApprovals: {
          total: pendingApprovals.length,
          items: pendingApprovals,
          lastUpdated: new Date()
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.priority === 'critical').length,
          warning: alerts.filter(a => a.priority === 'warning').length,
          info: alerts.filter(a => a.priority === 'info').length,
          items: alerts,
          lastUpdated: new Date()
        }
      };

      // Cache the result
      this.setCachedData(cacheKey, dashboardData);

      return dashboardData;

    } catch (error) {
      console.error('SupervisorDashboardService.getDashboardData error:', error);
      throw error;
    }
  }

  /**
   * Get assigned projects for supervisor
   * @param {Number} supervisorId - Supervisor employee ID
   * @returns {Array} Array of assigned projects
   */
  async getAssignedProjects(supervisorId) {
    const cacheKey = `projects_${supervisorId}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const projects = await Project.find({ 
        supervisorId: Number(supervisorId) 
      }).select('id projectName address status latitude longitude geofenceRadius');

      this.setCachedData(cacheKey, projects);
      return projects;

    } catch (error) {
      console.error('SupervisorDashboardService.getAssignedProjects error:', error);
      throw error;
    }
  }

  /**
   * Get workforce count breakdown
   * @param {Array} projectIds - Array of project IDs
   * @param {Date} todayStart - Start of today
   * @param {Date} todayEnd - End of today
   * @returns {Object} Workforce count data
   */
  async getWorkforceCount(projectIds, todayStart, todayEnd) {
    try {
      // Get all worker assignments for today across all projects
      const assignments = await WorkerTaskAssignment.find({
        projectId: { $in: projectIds },
        date: {
          $gte: todayStart.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          $lte: todayEnd.toISOString().split('T')[0]
        }
      }).distinct('employeeId');

      if (assignments.length === 0) {
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          overtime: 0,
          projectWorkerCounts: {}
        };
      }

      // Get attendance records for assigned workers
      const attendanceRecords = await Attendance.find({
        projectId: { $in: projectIds },
        employeeId: { $in: assignments },
        date: {
          $gte: todayStart,
          $lt: todayEnd
        }
      });

      // Get leave requests for today
      const leaveRequests = await LeaveRequest.find({
        employeeId: { $in: assignments },
        status: 'APPROVED',
        fromDate: { $lte: todayEnd },
        toDate: { $gte: todayStart }
      });

      const onLeaveEmployeeIds = leaveRequests.map(lr => lr.employeeId);

      // Calculate counts
      let present = 0;
      let absent = 0;
      let late = 0;
      let overtime = 0;
      const projectWorkerCounts = {};

      // Initialize project worker counts
      projectIds.forEach(projectId => {
        projectWorkerCounts[projectId] = 0;
      });

      // Process each assigned worker
      for (const employeeId of assignments) {
        // Check if on leave
        if (onLeaveEmployeeIds.includes(employeeId)) {
          continue; // Skip workers on leave
        }

        const attendance = attendanceRecords.find(a => a.employeeId === employeeId);
        
        if (attendance && attendance.checkIn) {
          present++;
          
          // Check if late (assuming 8:00 AM is standard start time)
          const standardStartTime = new Date(todayStart);
          standardStartTime.setHours(8, 0, 0, 0);
          
          if (attendance.checkIn > standardStartTime) {
            late++;
          }

          // Check for overtime (assuming 6:00 PM is standard end time)
          const standardEndTime = new Date(todayStart);
          standardEndTime.setHours(18, 0, 0, 0);
          
          if (attendance.checkOut && attendance.checkOut > standardEndTime) {
            overtime++;
          } else if (!attendance.checkOut && new Date() > standardEndTime) {
            overtime++;
          }

          // Count worker for project
          if (projectWorkerCounts.hasOwnProperty(attendance.projectId)) {
            projectWorkerCounts[attendance.projectId]++;
          }
        } else {
          absent++;
        }
      }

      return {
        total: assignments.length,
        present,
        absent,
        late,
        onLeave: onLeaveEmployeeIds.length,
        overtime,
        projectWorkerCounts
      };

    } catch (error) {
      console.error('SupervisorDashboardService.getWorkforceCount error:', error);
      return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        overtime: 0,
        projectWorkerCounts: {}
      };
    }
  }

  /**
   * Get attendance summary for assigned workers
   * @param {Array} projectIds - Array of project IDs
   * @param {Date} todayStart - Start of today
   * @param {Date} todayEnd - End of today
   * @returns {Array} Attendance records with worker details
   */
  async getAttendanceSummary(projectIds, todayStart, todayEnd) {
    try {
      // Get all worker assignments for today
      const assignments = await WorkerTaskAssignment.find({
        projectId: { $in: projectIds },
        date: {
          $gte: todayStart.toISOString().split('T')[0],
          $lte: todayEnd.toISOString().split('T')[0]
        }
      }).distinct('employeeId');

      if (assignments.length === 0) {
        return [];
      }

      // Get employee details
      const employees = await Employee.find({
        id: { $in: assignments }
      }).select('id fullName jobTitle');

      // Get attendance records
      const attendanceRecords = await Attendance.find({
        projectId: { $in: projectIds },
        employeeId: { $in: assignments },
        date: {
          $gte: todayStart,
          $lt: todayEnd
        }
      });

      // Get current task assignments
      const currentTasks = await WorkerTaskAssignment.find({
        employeeId: { $in: assignments },
        date: {
          $gte: todayStart.toISOString().split('T')[0],
          $lte: todayEnd.toISOString().split('T')[0]
        },
        status: 'in_progress'
      });

      // Build attendance summary
      const attendanceSummary = employees.map(employee => {
        const attendance = attendanceRecords.find(a => a.employeeId === employee.id);
        const currentTask = currentTasks.find(t => t.employeeId === employee.id);
        
        // Calculate if late
        const standardStartTime = new Date(todayStart);
        standardStartTime.setHours(8, 0, 0, 0);
        const isLate = attendance?.checkIn && attendance.checkIn > standardStartTime;

        // Calculate overtime
        const standardEndTime = new Date(todayStart);
        standardEndTime.setHours(18, 0, 0, 0);
        const isOvertime = attendance?.checkOut 
          ? attendance.checkOut > standardEndTime
          : (!attendance?.checkOut && attendance?.checkIn && new Date() > standardEndTime);

        // Calculate overtime duration in minutes
        let overtimeDuration = 0;
        if (isOvertime && attendance?.checkOut) {
          overtimeDuration = Math.max(0, (attendance.checkOut - standardEndTime) / (1000 * 60));
        } else if (isOvertime && attendance?.checkIn && !attendance?.checkOut) {
          overtimeDuration = Math.max(0, (new Date() - standardEndTime) / (1000 * 60));
        }

        return {
          workerId: employee.id,
          workerName: employee.fullName,
          jobTitle: employee.jobTitle,
          checkInTime: attendance?.checkIn || null,
          checkOutTime: attendance?.checkOut || null,
          locationStatus: attendance?.insideGeofenceAtCheckin 
            ? (attendance?.insideGeofenceAtCheckout !== false ? 'inside' : 'outside')
            : 'unknown',
          currentActivity: currentTask ? `Task ${currentTask.taskId}` : 'No active task',
          isLate,
          isOvertime,
          overtimeDuration: Math.round(overtimeDuration),
          hasGeofenceViolation: attendance ? 
            (!attendance.insideGeofenceAtCheckin || attendance.insideGeofenceAtCheckout === false) : false
        };
      });

      return attendanceSummary;

    } catch (error) {
      console.error('SupervisorDashboardService.getAttendanceSummary error:', error);
      return [];
    }
  }

  /**
   * Get pending approvals for supervisor
   * @param {Number} supervisorId - Supervisor ID
   * @returns {Array} Pending approval items
   */
  async getPendingApprovals(supervisorId) {
    try {
      // Get all projects assigned to this supervisor
      const supervisorProjects = await Project.find({ supervisorId: Number(supervisorId) });
      const projectIds = supervisorProjects.map(p => p.id);

      if (projectIds.length === 0) {
        return [];
      }

      // Get all worker assignments for supervisor's projects to identify supervised employees
      const assignments = await WorkerTaskAssignment.find({
        projectId: { $in: projectIds }
      }).distinct('employeeId');

      const supervisedEmployeeIds = assignments;

      if (supervisedEmployeeIds.length === 0) {
        return [];
      }

      // Get pending leave requests from supervised employees
      const pendingLeaveRequests = await LeaveRequest.find({
        employeeId: { $in: supervisedEmployeeIds },
        status: 'PENDING'
      });

      if (pendingLeaveRequests.length === 0) {
        return [];
      }

      // Get employee details for leave requests
      const employees = await Employee.find({
        id: { $in: supervisedEmployeeIds }
      }).select('id fullName');

      const employeeMap = {};
      employees.forEach(emp => {
        employeeMap[emp.id] = emp.fullName;
      });

      // Format approval items
      const approvalItems = pendingLeaveRequests.map(request => {
        const priority = this.calculateLeavePriority(request);
        
        return {
          approvalId: `leave_${request.id}`,
          type: 'leave',
          requesterId: request.employeeId,
          requesterName: employeeMap[request.employeeId] || 'Unknown Employee',
          submittedDate: request.requestedAt,
          priority: priority,
          details: {
            leaveType: request.leaveType,
            fromDate: request.fromDate,
            toDate: request.toDate,
            totalDays: request.totalDays,
            reason: request.reason
          },
          originalId: request.id
        };
      });

      return approvalItems;

    } catch (error) {
      console.error('SupervisorDashboardService.getPendingApprovals error:', error);
      return [];
    }
  }

  /**
   * Helper function to calculate leave request priority
   */
  calculateLeavePriority(leaveRequest) {
    const now = new Date();
    const fromDate = new Date(leaveRequest.fromDate);
    const daysUntilLeave = Math.ceil((fromDate - now) / (1000 * 60 * 60 * 24));

    // Emergency leave or medical leave gets high priority
    if (leaveRequest.leaveType === 'EMERGENCY' || leaveRequest.leaveType === 'MEDICAL') {
      return 'high';
    }

    // Leave starting within 3 days gets high priority
    if (daysUntilLeave <= 3) {
      return 'high';
    }

    // Leave starting within a week gets medium priority
    if (daysUntilLeave <= 7) {
      return 'medium';
    }

    // Everything else is low priority
    return 'low';
  }

  /**
   * Get alerts and notifications for supervisor
   * @param {Array} projectIds - Array of project IDs
   * @param {Number} supervisorId - Supervisor ID
   * @param {Date} todayStart - Start of today
   * @returns {Array} Alert items
   */
  async getAlerts(projectIds, supervisorId, todayStart) {
    try {
      const currentTime = new Date();
      const alertsToCreate = [];

      // First, get existing alerts from database
      const existingAlerts = await alertService.getAlertsForSupervisor(supervisorId, { isRead: false });

      // Check for geofence violations
      const geofenceViolations = await Attendance.find({
        projectId: { $in: projectIds },
        date: { $gte: todayStart },
        $or: [
          { insideGeofenceAtCheckin: false },
          { insideGeofenceAtCheckout: false }
        ]
      });

      for (const violation of geofenceViolations) {
        const alertId = `geofence_${violation._id}`;
        
        // Check if alert already exists
        const existingAlert = existingAlerts.find(a => a.alertId === alertId);
        if (!existingAlert) {
          const employee = await Employee.findOne({ id: violation.employeeId });
          alertsToCreate.push({
            type: 'geofence_violation',
            priority: 'critical',
            message: `Geofence violation detected for ${employee?.fullName || 'Unknown Worker'}`,
            supervisorId: supervisorId,
            relatedWorkerId: violation.employeeId,
            relatedProjectId: violation.projectId,
            timestamp: violation.checkIn || violation.checkOut || violation.createdAt,
            metadata: {
              attendanceId: violation._id,
              violationType: violation.insideGeofenceAtCheckin === false ? 'checkin' : 'checkout'
            }
          });
        }
      }

      // Check for worker absences (no check-in after 9 AM)
      const nineAM = new Date(todayStart);
      nineAM.setHours(9, 0, 0, 0);
      
      if (currentTime > nineAM) {
        const assignments = await WorkerTaskAssignment.find({
          projectId: { $in: projectIds },
          date: todayStart.toISOString().split('T')[0]
        }).distinct('employeeId');

        const checkedInEmployees = await Attendance.find({
          projectId: { $in: projectIds },
          employeeId: { $in: assignments },
          date: { $gte: todayStart },
          checkIn: { $ne: null }
        }).distinct('employeeId');

        const absentEmployees = assignments.filter(id => !checkedInEmployees.includes(id));

        for (const employeeId of absentEmployees) {
          const alertId = `absence_${employeeId}_${todayStart.toISOString().split('T')[0]}`;
          
          // Check if alert already exists
          const existingAlert = existingAlerts.find(a => a.alertId === alertId);
          if (!existingAlert) {
            const employee = await Employee.findOne({ id: employeeId });
            alertsToCreate.push({
              type: 'worker_absence',
              priority: 'warning',
              message: `${employee?.fullName || 'Unknown Worker'} has not checked in yet`,
              supervisorId: supervisorId,
              relatedWorkerId: employeeId,
              timestamp: nineAM,
              metadata: {
                expectedCheckInTime: '08:00',
                currentTime: currentTime.toISOString()
              }
            });
          }
        }
      }

      // Check for missing checkouts (after 7 PM)
      const sevenPM = new Date(todayStart);
      sevenPM.setHours(19, 0, 0, 0);
      
      if (currentTime > sevenPM) {
        const missingCheckouts = await Attendance.find({
          projectId: { $in: projectIds },
          date: { $gte: todayStart },
          checkIn: { $ne: null },
          checkOut: null
        });

        for (const attendance of missingCheckouts) {
          const alertId = `missing_checkout_${attendance._id}`;
          
          // Check if alert already exists
          const existingAlert = existingAlerts.find(a => a.alertId === alertId);
          if (!existingAlert) {
            const employee = await Employee.findOne({ id: attendance.employeeId });
            alertsToCreate.push({
              type: 'attendance_anomaly',
              priority: 'warning',
              message: `${employee?.fullName || 'Unknown Worker'} has not checked out yet`,
              supervisorId: supervisorId,
              relatedWorkerId: attendance.employeeId,
              relatedProjectId: attendance.projectId,
              timestamp: sevenPM,
              metadata: {
                attendanceId: attendance._id,
                checkInTime: attendance.checkIn.toISOString(),
                expectedCheckOutTime: '18:00'
              }
            });
          }
        }
      }

      // Create new alerts in database
      const createdAlerts = [];
      for (const alertData of alertsToCreate) {
        try {
          const createdAlert = await alertService.createAlert(alertData);
          createdAlerts.push(createdAlert);
        } catch (error) {
          console.error('Failed to create alert:', error);
        }
      }

      // Get all current alerts (existing + newly created)
      const allAlerts = await alertService.getAlertsForSupervisor(supervisorId, { isRead: false });

      // Transform to dashboard format
      const dashboardAlerts = allAlerts.map(alert => ({
        alertId: alert.id, // Use numeric ID directly, not prefixed
        type: alert.type,
        priority: alert.priority,
        message: alert.message,
        timestamp: alert.timestamp,
        isRead: alert.isRead,
        relatedWorkerId: alert.relatedWorkerId,
        relatedProjectId: alert.relatedProjectId,
        metadata: alert.metadata
      }));

      // Sort alerts by priority and timestamp
      dashboardAlerts.sort((a, b) => {
        const priorityOrder = { critical: 3, warning: 2, info: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      return dashboardAlerts;

    } catch (error) {
      console.error('SupervisorDashboardService.getAlerts error:', error);
      return [];
    }
  }

  /**
   * Validate supervisor exists and has proper role
   * @param {Number} supervisorId - Supervisor employee ID
   * @throws {Error} If supervisor is invalid
   */
  async validateSupervisor(supervisorId) {
    const supervisorEmployee = await Employee.findOne({ id: Number(supervisorId) });
    if (!supervisorEmployee) {
      throw new Error('Supervisor not found');
    }

    const companyUser = await CompanyUser.findOne({ 
      userId: supervisorEmployee.userId, 
      role: 'supervisor' 
    });
    if (!companyUser) {
      throw new Error('User does not have supervisor role');
    }

    return { supervisorEmployee, companyUser };
  }

  /**
   * Get date boundaries for today
   * @returns {Object} Today's start and end dates
   */
  getDateBoundaries() {
    const currentDate = new Date();
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);

    return { todayStart, todayEnd };
  }

  /**
   * Normalize project status to lowercase
   * @param {String} status - Project status
   * @returns {String} Normalized status
   */
  normalizeProjectStatus(status) {
    if (!status) return 'not started';
    return status.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Get priority level from leave type
   * @param {String} leaveType - Type of leave
   * @returns {String} Priority level
   */
  getPriorityFromLeaveType(leaveType) {
    switch (leaveType) {
      case 'EMERGENCY':
        return 'high';
      case 'MEDICAL':
        return 'medium';
      case 'ANNUAL':
      default:
        return 'low';
    }
  }

  /**
   * Get cached data if not expired
   * @param {String} key - Cache key
   * @returns {*} Cached data or null
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache with timestamp
   * @param {String} key - Cache key
   * @param {*} data - Data to cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for specific supervisor or all cache
   * @param {Number} supervisorId - Optional supervisor ID to clear specific cache
   */
  clearCache(supervisorId = null) {
    if (supervisorId) {
      // Clear specific supervisor cache
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(`_${supervisorId}`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
const supervisorDashboardService = new SupervisorDashboardService();
export default supervisorDashboardService;