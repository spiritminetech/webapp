import Alert from './models/Alert.js';
import AlertEscalation from './models/AlertEscalation.js';
import Employee from '../employee/Employee.js';
import CompanyUser from '../companyUser/CompanyUser.js';
import Project from '../project/models/Project.js';

/**
 * Alert Service
 * Handles alert creation, management, and escalation logic
 */
class AlertService {
  constructor() {
    this.ESCALATION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
    this.escalationTimers = new Map(); // Track active escalation timers
  }

  /**
   * Get alerts for supervisor with filtering options
   * @param {Number} supervisorId - Supervisor ID
   * @param {Object} filters - Filter options (type, priority, isRead)
   * @returns {Array} Array of alerts
   */
  async getAlertsForSupervisor(supervisorId, filters = {}) {
    try {
      const query = { supervisorId: Number(supervisorId) };

      // Apply filters
      if (filters.type) {
        query.type = filters.type;
      }
      if (filters.priority) {
        query.priority = filters.priority;
      }
      if (filters.isRead !== undefined) {
        query.isRead = filters.isRead;
      }

      // Get alerts sorted by priority and timestamp
      const alerts = await Alert.find(query)
        .sort({ 
          timestamp: -1 // Sort by timestamp descending (newest first)
        })
        .limit(100) // Limit to prevent performance issues
        .lean();

      // Sort by priority first, then timestamp
      alerts.sort((a, b) => {
        const priorityOrder = { critical: 3, warning: 2, info: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      // Enrich alerts with related data
      const enrichedAlerts = await Promise.all(
        alerts.map(alert => this.enrichAlertData(alert))
      );

      return enrichedAlerts;

    } catch (error) {
      console.error('AlertService.getAlertsForSupervisor error:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   * @param {Number} alertId - Alert ID
   * @param {Number} supervisorId - Supervisor ID acknowledging the alert
   * @returns {Object} Updated alert
   */
  async acknowledgeAlert(alertId, supervisorId) {
    try {
      const alert = await Alert.findOne({ id: Number(alertId) });

      if (!alert) {
        throw new Error('Alert not found');
      }

      // Verify supervisor has access to this alert
      if (alert.supervisorId !== Number(supervisorId)) {
        throw new Error('Access denied: Alert belongs to different supervisor');
      }

      if (alert.isRead) {
        throw new Error('Alert already acknowledged');
      }

      // Update alert
      const updatedAlert = await Alert.findOneAndUpdate(
        { id: Number(alertId) },
        {
          isRead: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: Number(supervisorId)
        },
        { new: true }
      );

      // Cancel any pending escalations for this alert
      await this.cancelEscalation(alertId);

      // Log acknowledgment for audit
      await this.logAlertAction(alertId, supervisorId, 'acknowledged');

      return await this.enrichAlertData(updatedAlert.toObject());

    } catch (error) {
      console.error('AlertService.acknowledgeAlert error:', error);
      throw error;
    }
  }

  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   * @returns {Object} Created alert
   */
  async createAlert(alertData) {
    try {
      // Generate ID if not provided
      let alertId = alertData.id;
      if (!alertId) {
        try {
          const lastAlert = await Alert.findOne({}, {}, { sort: { id: -1 } });
          alertId = lastAlert ? lastAlert.id + 1 : 1;
        } catch (error) {
          console.warn('Error getting last alert ID, using timestamp fallback:', error);
          alertId = Date.now() % 1000000; // Use last 6 digits of timestamp
        }
      }

      const alert = new Alert({
        id: alertId,
        type: alertData.type,
        priority: alertData.priority,
        message: alertData.message,
        supervisorId: alertData.supervisorId,
        relatedWorkerId: alertData.relatedWorkerId,
        relatedProjectId: alertData.relatedProjectId,
        metadata: alertData.metadata || {},
        timestamp: alertData.timestamp || new Date(),
        expiresAt: alertData.expiresAt
      });

      const savedAlert = await alert.save();

      // Start escalation timer for critical alerts
      if (savedAlert.priority === 'critical') {
        this.startEscalationTimer(savedAlert);
      }

      // Send immediate notifications if required
      await this.sendAlertNotifications(savedAlert);

      return await this.enrichAlertData(savedAlert.toObject());

    } catch (error) {
      console.error('AlertService.createAlert error:', error);
      throw error;
    }
  }

  /**
   * Start escalation timer for critical alerts
   * @param {Object} alert - Alert object
   */
  startEscalationTimer(alert) {
    const timerId = setTimeout(async () => {
      try {
        await this.escalateAlert(alert.id, 'timeout');
      } catch (error) {
        console.error('Escalation timer error:', error);
      }
    }, this.ESCALATION_TIMEOUT);

    this.escalationTimers.set(alert.id, timerId);
  }

  /**
   * Cancel escalation timer
   * @param {Number} alertId - Alert ID
   */
  cancelEscalation(alertId) {
    const timerId = this.escalationTimers.get(alertId);
    if (timerId) {
      clearTimeout(timerId);
      this.escalationTimers.delete(alertId);
    }
  }

  /**
   * Escalate alert to higher management
   * @param {Number} alertId - Alert ID
   * @param {String} reason - Escalation reason
   * @returns {Object} Escalation record
   */
  async escalateAlert(alertId, reason = 'timeout') {
    try {
      const alert = await Alert.findOne({ id: Number(alertId) });
      if (!alert || alert.isRead) {
        return null; // Alert not found or already acknowledged
      }

      // Find escalation target (manager/admin)
      const escalationTarget = await this.findEscalationTarget(alert.supervisorId);
      if (!escalationTarget) {
        console.warn(`No escalation target found for supervisor ${alert.supervisorId}`);
        return null;
      }

      // Create escalation record
      const escalation = new AlertEscalation({
        alertId: alert.id,
        originalSupervisorId: alert.supervisorId,
        escalationLevel: alert.escalationLevel + 1,
        escalatedTo: escalationTarget.id,
        escalationReason: reason,
        timeoutDuration: this.ESCALATION_TIMEOUT / (60 * 1000) // Convert to minutes
      });

      const savedEscalation = await escalation.save();

      // Update alert escalation level
      await Alert.findOneAndUpdate(
        { id: alert.id },
        {
          escalationLevel: escalation.escalationLevel,
          lastEscalatedAt: new Date()
        }
      );

      // Send escalation notifications
      await this.sendEscalationNotifications(savedEscalation, alert, escalationTarget);

      // Log escalation for audit
      await this.logAlertAction(alertId, alert.supervisorId, 'escalated', {
        escalatedTo: escalationTarget.id,
        reason: reason,
        level: escalation.escalationLevel
      });

      return savedEscalation;

    } catch (error) {
      console.error('AlertService.escalateAlert error:', error);
      throw error;
    }
  }

  /**
   * Find escalation target for supervisor
   * @param {Number} supervisorId - Supervisor ID
   * @returns {Object} Escalation target employee
   */
  async findEscalationTarget(supervisorId) {
    try {
      // Get supervisor's employee record
      const supervisor = await Employee.findOne({ id: Number(supervisorId) });
      if (!supervisor) return null;

      // Get supervisor's company user record
      const supervisorCompanyUser = await CompanyUser.findOne({ 
        userId: supervisor.userId 
      });
      if (!supervisorCompanyUser) return null;

      // Find managers or admins in the same company
      const escalationTargets = await CompanyUser.find({
        companyId: supervisorCompanyUser.companyId,
        role: { $in: ['manager', 'admin'] },
        userId: { $ne: supervisor.userId } // Exclude the supervisor themselves
      }).populate('userId');

      if (escalationTargets.length === 0) {
        // If no managers/admins, escalate to any admin in the system
        const systemAdmins = await CompanyUser.find({
          role: 'admin'
        }).populate('userId');

        if (systemAdmins.length > 0) {
          const adminEmployee = await Employee.findOne({ 
            userId: systemAdmins[0].userId 
          });
          return adminEmployee;
        }
        return null;
      }

      // Return first available manager/admin
      const targetEmployee = await Employee.findOne({ 
        userId: escalationTargets[0].userId 
      });
      return targetEmployee;

    } catch (error) {
      console.error('AlertService.findEscalationTarget error:', error);
      return null;
    }
  }

  /**
   * Send alert notifications
   * @param {Object} alert - Alert object
   */
  async sendAlertNotifications(alert) {
    try {
      // Get supervisor details
      const supervisor = await Employee.findOne({ id: alert.supervisorId });
      if (!supervisor) return;

      // For critical alerts, send immediate notifications
      if (alert.priority === 'critical') {
        // In a real implementation, this would integrate with email/SMS services
        console.log(`CRITICAL ALERT NOTIFICATION: ${alert.message} for supervisor ${supervisor.fullName}`);
        
        // Mock notification sending
        // await emailService.sendCriticalAlert(supervisor.email, alert);
        // await smsService.sendCriticalAlert(supervisor.phone, alert);
      }

    } catch (error) {
      console.error('AlertService.sendAlertNotifications error:', error);
    }
  }

  /**
   * Send escalation notifications
   * @param {Object} escalation - Escalation record
   * @param {Object} alert - Original alert
   * @param {Object} escalationTarget - Target employee
   */
  async sendEscalationNotifications(escalation, alert, escalationTarget) {
    try {
      // Send notification to escalation target
      console.log(`ESCALATION NOTIFICATION: Alert ${alert.id} escalated to ${escalationTarget.fullName}`);
      
      // Update escalation with notification tracking
      await AlertEscalation.findOneAndUpdate(
        { id: escalation.id },
        {
          $push: {
            notificationsSent: {
              recipient: escalationTarget.id,
              method: 'system',
              sentAt: new Date(),
              status: 'sent'
            }
          }
        }
      );

      // In a real implementation, send actual notifications
      // await emailService.sendEscalationAlert(escalationTarget.email, alert, escalation);

    } catch (error) {
      console.error('AlertService.sendEscalationNotifications error:', error);
    }
  }

  /**
   * Enrich alert data with related information
   * @param {Object} alert - Alert object
   * @returns {Object} Enriched alert
   */
  async enrichAlertData(alert) {
    try {
      const enriched = { ...alert };

      // Add worker name if relatedWorkerId exists
      if (alert.relatedWorkerId) {
        const worker = await Employee.findOne({ id: alert.relatedWorkerId });
        enriched.relatedWorkerName = worker?.fullName || 'Unknown Worker';
      }

      // Add project name if relatedProjectId exists
      if (alert.relatedProjectId) {
        const project = await Project.findOne({ id: alert.relatedProjectId });
        enriched.relatedProjectName = project?.projectName || 'Unknown Project';
      }

      // Add escalation information
      if (alert.escalationLevel > 0) {
        const escalations = await AlertEscalation.find({ 
          alertId: alert.id 
        }).sort({ escalationLevel: -1 }).limit(1);
        
        if (escalations.length > 0) {
          enriched.latestEscalation = escalations[0];
        }
      }

      return enriched;

    } catch (error) {
      console.error('AlertService.enrichAlertData error:', error);
      return alert;
    }
  }

  /**
   * Log alert actions for audit
   * @param {Number} alertId - Alert ID
   * @param {Number} userId - User performing action
   * @param {String} action - Action performed
   * @param {Object} metadata - Additional metadata
   */
  async logAlertAction(alertId, userId, action, metadata = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: `ALERT_${action.toUpperCase()}`,
        alertId,
        userId,
        metadata
      };

      // Log to console (in production, this would go to audit system)
      console.log('ALERT AUDIT LOG:', JSON.stringify(logEntry, null, 2));

      // TODO: Save to audit collection
      // await AuditLog.create(logEntry);

    } catch (error) {
      console.error('Failed to log alert action:', error);
    }
  }

  /**
   * Get priority sort order for MongoDB
   * @returns {Object} Sort order object
   */
  getPrioritySortOrder() {
    return { 
      critical: 3, 
      warning: 2, 
      info: 1 
    };
  }

  /**
   * Clean up expired alerts and escalation timers
   */
  async cleanup() {
    try {
      // Remove expired alerts (handled by MongoDB TTL index)
      // Clear any orphaned escalation timers
      const activeAlerts = await Alert.find({ 
        isRead: false, 
        priority: 'critical' 
      }).select('id');
      
      const activeAlertIds = new Set(activeAlerts.map(a => a.id));
      
      // Remove timers for alerts that no longer exist or are acknowledged
      for (const [alertId, timerId] of this.escalationTimers.entries()) {
        if (!activeAlertIds.has(alertId)) {
          clearTimeout(timerId);
          this.escalationTimers.delete(alertId);
        }
      }

    } catch (error) {
      console.error('AlertService.cleanup error:', error);
    }
  }

  /**
   * Get escalation statistics
   * @param {Number} supervisorId - Supervisor ID (optional)
   * @returns {Object} Escalation statistics
   */
  async getEscalationStats(supervisorId = null) {
    try {
      const query = supervisorId ? { originalSupervisorId: supervisorId } : {};
      
      const stats = await AlertEscalation.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$escalationReason',
            count: { $sum: 1 },
            avgResolutionTime: { 
              $avg: { 
                $subtract: ['$resolvedAt', '$escalatedAt'] 
              } 
            }
          }
        }
      ]);

      return {
        totalEscalations: stats.reduce((sum, stat) => sum + stat.count, 0),
        byReason: stats,
        activeTimers: this.escalationTimers.size
      };

    } catch (error) {
      console.error('AlertService.getEscalationStats error:', error);
      return { totalEscalations: 0, byReason: [], activeTimers: 0 };
    }
  }
}

// Export singleton instance
const alertService = new AlertService();
export default alertService;