import alertService from './alertService.js';
import Alert from './models/Alert.js';
import AlertEscalation from './models/AlertEscalation.js';
import Attendance from '../attendance/Attendance.js';
import Employee from '../employee/Employee.js';
import Project from '../project/models/Project.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';

/**
 * Escalation Manager
 * Handles background processes for alert generation and escalation
 */
class EscalationManager {
  constructor() {
    this.isRunning = false;
    this.intervals = {
      alertGeneration: null,
      escalationCheck: null,
      cleanup: null
    };
    
    // Configuration
    this.config = {
      alertGenerationInterval: 5 * 60 * 1000, // 5 minutes
      escalationCheckInterval: 2 * 60 * 1000, // 2 minutes
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      criticalEscalationTimeout: 15 * 60 * 1000, // 15 minutes
      geofenceViolationThreshold: 1, // Immediate alert
      absenceAlertTime: 9, // 9 AM
      missingCheckoutTime: 19 // 7 PM
    };
  }

  /**
   * Start the escalation manager
   */
  start() {
    if (this.isRunning) {
      console.log('EscalationManager is already running');
      return;
    }

    console.log('Starting EscalationManager...');
    this.isRunning = true;

    // Start periodic alert generation
    this.intervals.alertGeneration = setInterval(() => {
      this.generateSystemAlerts().catch(error => {
        console.error('Alert generation error:', error);
      });
    }, this.config.alertGenerationInterval);

    // Start escalation checking
    this.intervals.escalationCheck = setInterval(() => {
      this.checkPendingEscalations().catch(error => {
        console.error('Escalation check error:', error);
      });
    }, this.config.escalationCheckInterval);

    // Start cleanup process
    this.intervals.cleanup = setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('Cleanup error:', error);
      });
    }, this.config.cleanupInterval);

    console.log('EscalationManager started successfully');
  }

  /**
   * Stop the escalation manager
   */
  stop() {
    if (!this.isRunning) {
      console.log('EscalationManager is not running');
      return;
    }

    console.log('Stopping EscalationManager...');
    this.isRunning = false;

    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });

    // Reset intervals
    this.intervals = {
      alertGeneration: null,
      escalationCheck: null,
      cleanup: null
    };

    console.log('EscalationManager stopped');
  }

  /**
   * Generate system alerts based on current conditions
   */
  async generateSystemAlerts() {
    try {
      const currentTime = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all active projects with supervisors
      const projects = await Project.find({ 
        supervisorId: { $exists: true, $ne: null } 
      });

      for (const project of projects) {
        await this.generateProjectAlerts(project, currentTime, today);
      }

    } catch (error) {
      console.error('EscalationManager.generateSystemAlerts error:', error);
    }
  }

  /**
   * Generate alerts for a specific project
   * @param {Object} project - Project object
   * @param {Date} currentTime - Current timestamp
   * @param {Date} today - Today's date (start of day)
   */
  async generateProjectAlerts(project, currentTime, today) {
    try {
      const supervisorId = project.supervisorId;
      const projectId = project.id;

      // 1. Check for geofence violations
      await this.checkGeofenceViolations(supervisorId, projectId, today);

      // 2. Check for worker absences (after 9 AM)
      if (currentTime.getHours() >= this.config.absenceAlertTime) {
        await this.checkWorkerAbsences(supervisorId, projectId, today);
      }

      // 3. Check for missing checkouts (after 7 PM)
      if (currentTime.getHours() >= this.config.missingCheckoutTime) {
        await this.checkMissingCheckouts(supervisorId, projectId, today);
      }

      // 4. Check for overtime alerts
      await this.checkOvertimeAlerts(supervisorId, projectId, today, currentTime);

    } catch (error) {
      console.error(`Error generating alerts for project ${project.id}:`, error);
    }
  }

  /**
   * Check for geofence violations
   */
  async checkGeofenceViolations(supervisorId, projectId, today) {
    try {
      // Find recent geofence violations that haven't been alerted
      const violations = await Attendance.find({
        projectId: projectId,
        date: { $gte: today },
        $or: [
          { insideGeofenceAtCheckin: false },
          { insideGeofenceAtCheckout: false }
        ],
        createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
      });

      for (const violation of violations) {
        // Check if alert already exists for this violation
        // Create unique identifier for this geofence violation
        const alertIdentifier = `geofence_${violation.employeeId}_${projectId}_${new Date().toISOString().split('T')[0]}`;
        
        const existingAlert = await Alert.findOne({
          type: 'geofence_violation',
          supervisorId: supervisorId,
          relatedWorkerId: violation.employeeId,
          relatedProjectId: projectId,
          timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
          'metadata.alertIdentifier': alertIdentifier
        });

        if (!existingAlert) {
          const employee = await Employee.findOne({ id: violation.employeeId });
          const violationType = violation.insideGeofenceAtCheckin === false ? 'check-in' : 'check-out';
          
          await alertService.createAlert({
            type: 'geofence_violation',
            priority: 'critical',
            message: `Geofence violation: ${employee?.fullName || 'Unknown Worker'} ${violationType} outside project boundary`,
            supervisorId: supervisorId,
            relatedWorkerId: violation.employeeId,
            relatedProjectId: projectId,
            metadata: {
              violationType: violationType,
              attendanceId: violation._id,
              location: {
                latitude: violation.latitude,
                longitude: violation.longitude
              },
              alertIdentifier: alertIdentifier // Add unique identifier
            }
          });
        }
      }

    } catch (error) {
      console.error('Error checking geofence violations:', error);
    }
  }

  /**
   * Check for worker absences
   */
  async checkWorkerAbsences(supervisorId, projectId, today) {
    try {
      // Get workers assigned for today
      const assignments = await WorkerTaskAssignment.find({
        projectId: projectId,
        date: today.toISOString().split('T')[0]
      }).distinct('employeeId');

      if (assignments.length === 0) return;

      // Get workers who have checked in
      const checkedInWorkers = await Attendance.find({
        projectId: projectId,
        employeeId: { $in: assignments },
        date: { $gte: today },
        checkIn: { $ne: null }
      }).distinct('employeeId');

      // Find absent workers
      const absentWorkers = assignments.filter(id => !checkedInWorkers.includes(id));

      for (const workerId of absentWorkers) {
        // Create unique identifier for this absence alert
        const alertIdentifier = `absence_${workerId}_${projectId}_${today.toISOString().split('T')[0]}`;
        
        // Check if alert already exists for today (more specific check)
        const existingAlert = await Alert.findOne({
          type: 'worker_absence',
          supervisorId: supervisorId,
          relatedWorkerId: workerId,
          relatedProjectId: projectId,
          timestamp: { $gte: today },
          'metadata.alertIdentifier': alertIdentifier
        });

        if (!existingAlert) {
          const employee = await Employee.findOne({ id: workerId });
          
          await alertService.createAlert({
            type: 'worker_absence',
            priority: 'warning',
            message: `${employee?.fullName || 'Unknown Worker'} has not checked in for scheduled work`,
            supervisorId: supervisorId,
            relatedWorkerId: workerId,
            relatedProjectId: projectId,
            metadata: {
              expectedCheckInTime: `${this.config.absenceAlertTime}:00 AM`,
              assignmentDate: today.toISOString().split('T')[0],
              alertIdentifier: alertIdentifier // Add unique identifier
            }
          });
        }
      }

    } catch (error) {
      console.error('Error checking worker absences:', error);
    }
  }

  /**
   * Check for missing checkouts
   */
  async checkMissingCheckouts(supervisorId, projectId, today) {
    try {
      // Find workers who checked in but haven't checked out
      const missingCheckouts = await Attendance.find({
        projectId: projectId,
        date: { $gte: today },
        checkIn: { $ne: null },
        checkOut: null
      });

      for (const attendance of missingCheckouts) {
        // Create unique identifier for this missing checkout alert
        const alertIdentifier = `missing_checkout_${attendance.employeeId}_${projectId}_${today.toISOString().split('T')[0]}`;
        
        // Check if alert already exists (more specific check)
        const existingAlert = await Alert.findOne({
          type: 'attendance_anomaly',
          supervisorId: supervisorId,
          relatedWorkerId: attendance.employeeId,
          relatedProjectId: projectId,
          timestamp: { $gte: today },
          'metadata.type': 'missing_checkout',
          'metadata.alertIdentifier': alertIdentifier
        });

        if (!existingAlert) {
          const employee = await Employee.findOne({ id: attendance.employeeId });
          
          await alertService.createAlert({
            type: 'attendance_anomaly',
            priority: 'warning',
            message: `${employee?.fullName || 'Unknown Worker'} has not checked out after work hours`,
            supervisorId: supervisorId,
            relatedWorkerId: attendance.employeeId,
            relatedProjectId: projectId,
            metadata: {
              type: 'missing_checkout',
              checkInTime: attendance.checkIn,
              expectedCheckOutTime: `${this.config.missingCheckoutTime}:00`,
              attendanceId: attendance._id,
              alertIdentifier: alertIdentifier // Add unique identifier
            }
          });
        }
      }

    } catch (error) {
      console.error('Error checking missing checkouts:', error);
    }
  }

  /**
   * Check for overtime alerts
   */
  async checkOvertimeAlerts(supervisorId, projectId, today, currentTime) {
    try {
      // Standard work hours (8 AM to 6 PM = 10 hours)
      const standardWorkHours = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
      
      // Find workers currently working overtime
      const attendances = await Attendance.find({
        projectId: projectId,
        date: { $gte: today },
        checkIn: { $ne: null },
        checkOut: null // Still working
      });

      for (const attendance of attendances) {
        const workDuration = currentTime - new Date(attendance.checkIn);
        
        if (workDuration > standardWorkHours) {
          // Create unique identifier for this overtime alert
          const alertIdentifier = `overtime_${attendance.employeeId}_${projectId}_${today.toISOString().split('T')[0]}`;
          
          // Check if overtime alert already exists for today (more specific check)
          const existingAlert = await Alert.findOne({
            type: 'attendance_anomaly',
            supervisorId: supervisorId,
            relatedWorkerId: attendance.employeeId,
            relatedProjectId: projectId,
            timestamp: { $gte: today },
            'metadata.type': 'overtime',
            'metadata.alertIdentifier': alertIdentifier
          });

          if (!existingAlert) {
            const employee = await Employee.findOne({ id: attendance.employeeId });
            const overtimeHours = Math.round((workDuration - standardWorkHours) / (60 * 60 * 1000) * 10) / 10;
            
            await alertService.createAlert({
              type: 'attendance_anomaly',
              priority: 'info',
              message: `${employee?.fullName || 'Unknown Worker'} is working overtime (${overtimeHours} hours over standard)`,
              supervisorId: supervisorId,
              relatedWorkerId: attendance.employeeId,
              relatedProjectId: projectId,
              metadata: {
                type: 'overtime',
                overtimeHours: overtimeHours,
                checkInTime: attendance.checkIn,
                standardWorkHours: 10,
                attendanceId: attendance._id,
                alertIdentifier: alertIdentifier // Add unique identifier
              }
            });
          }
        }
      }

    } catch (error) {
      console.error('Error checking overtime alerts:', error);
    }
  }

  /**
   * Check for pending escalations that need to be processed
   */
  async checkPendingEscalations() {
    try {
      // Find critical alerts that are unacknowledged and past escalation timeout
      const escalationThreshold = new Date(Date.now() - this.config.criticalEscalationTimeout);
      
      const alertsToEscalate = await Alert.find({
        priority: 'critical',
        isRead: false,
        timestamp: { $lte: escalationThreshold },
        escalationLevel: 0 // Not yet escalated
      });

      for (const alert of alertsToEscalate) {
        await alertService.escalateAlert(alert.id, 'timeout');
      }

      // Check for second-level escalations (if first level wasn't acknowledged)
      const secondLevelThreshold = new Date(Date.now() - (this.config.criticalEscalationTimeout * 2));
      
      const secondLevelAlerts = await Alert.find({
        priority: 'critical',
        isRead: false,
        timestamp: { $lte: secondLevelThreshold },
        escalationLevel: 1,
        lastEscalatedAt: { $lte: new Date(Date.now() - this.config.criticalEscalationTimeout) }
      });

      for (const alert of secondLevelAlerts) {
        await alertService.escalateAlert(alert.id, 'second_level_timeout');
      }

    } catch (error) {
      console.error('EscalationManager.checkPendingEscalations error:', error);
    }
  }

  /**
   * Perform cleanup operations
   */
  async performCleanup() {
    try {
      console.log('🧹 Performing alert cleanup...');

      // Clean up alert service
      await alertService.cleanup();

      // Remove old escalation records (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await AlertEscalation.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        resolution: { $in: ['resolved', 'dismissed'] }
      });

      // Remove old acknowledged alerts (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oldAlertsResult = await Alert.deleteMany({
        isRead: true,
        acknowledgedAt: { $lt: sevenDaysAgo }
      });

      // Remove duplicate unread alerts (keep the latest one for each unique combination)
      const duplicateGroups = await Alert.aggregate([
        {
          $match: { isRead: false }
        },
        {
          $group: {
            _id: {
              type: '$type',
              supervisorId: '$supervisorId',
              relatedWorkerId: '$relatedWorkerId',
              relatedProjectId: '$relatedProjectId',
              alertIdentifier: '$metadata.alertIdentifier'
            },
            count: { $sum: 1 },
            alerts: { $push: { id: '$id', timestamp: '$timestamp' } }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      let duplicatesRemoved = 0;
      for (const group of duplicateGroups) {
        const { alerts } = group;
        // Sort by timestamp and keep the latest one
        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const alertsToRemove = alerts.slice(1); // Remove all except the latest

        for (const alert of alertsToRemove) {
          await Alert.deleteOne({ id: alert.id });
          duplicatesRemoved++;
        }
      }

      if (oldAlertsResult.deletedCount > 0 || duplicatesRemoved > 0) {
        console.log(`🧹 Cleanup completed: ${oldAlertsResult.deletedCount} old alerts, ${duplicatesRemoved} duplicates removed`);
      }

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get manager status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      intervals: {
        alertGeneration: !!this.intervals.alertGeneration,
        escalationCheck: !!this.intervals.escalationCheck,
        cleanup: !!this.intervals.cleanup
      },
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart if running to apply new intervals
    if (this.isRunning) {
      this.stop();
      setTimeout(() => this.start(), 1000);
    }
  }
}

// Export singleton instance
const escalationManager = new EscalationManager();
export default escalationManager;