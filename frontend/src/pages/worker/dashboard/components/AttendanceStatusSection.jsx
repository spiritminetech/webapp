import React, { useState, useEffect } from 'react';
import attendanceService from '../../../../services/AttendanceService.js';
import appConfig from '../../../../config/app.config.js';

/**
 * AttendanceStatusSection Component
 * Displays current attendance status with timestamps and real-time updates
 * 
 * @param {Object} props
 * @param {import('../types.js').AttendanceStatus} [props.attendanceStatus] - Attendance status data
 * @param {boolean} [props.enableRealTimeUpdates=true] - Whether to enable real-time updates
 * @param {string} [props.className] - Additional CSS classes
 */
const AttendanceStatusSection = ({ 
  attendanceStatus, 
  enableRealTimeUpdates = true,
  className = ''
}) => {
  const [currentStatus, setCurrentStatus] = useState(attendanceStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  /**
   * Formats timestamp for display
   * @param {Date|string} timestamp - Timestamp to format
   * @returns {string} Formatted timestamp
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '--:--';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '--:--';
      }
      
      return date.toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      appConfig.log('Error formatting timestamp:', error);
      return '--:--';
    }
  };

  /**
   * Formats date for display
   * @param {Date|string} timestamp - Timestamp to format
   * @returns {string} Formatted date
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      if (isToday) {
        return 'Today';
      }
      
      return date.toLocaleDateString('en-SG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      appConfig.log('Error formatting date:', error);
      return '';
    }
  };

  /**
   * Gets attendance status display information
   * @param {string} status - Attendance status
   * @returns {Object} Status display information
   */
  const getStatusInfo = (status) => {
    switch (status) {
      case 'not_logged_in':
        return {
          text: 'Not Logged In',
          className: 'status-not-logged-in',
          icon: '⭕',
          color: '#9e9e9e',
          description: 'Ready to start work'
        };
      case 'logged_in':
        return {
          text: 'Logged In',
          className: 'status-logged-in',
          icon: '✅',
          color: '#4caf50',
          description: 'Currently working'
        };
      case 'lunch':
        return {
          text: 'On Lunch Break',
          className: 'status-lunch',
          icon: '🍽️',
          color: '#ff9800',
          description: 'Taking lunch break'
        };
      case 'logged_out':
        return {
          text: 'Logged Out',
          className: 'status-logged-out',
          icon: '🏁',
          color: '#f44336',
          description: 'Work day completed'
        };
      case 'overtime':
        return {
          text: 'Overtime',
          className: 'status-overtime',
          icon: '⏰',
          color: '#9c27b0',
          description: 'Working overtime'
        };
      default:
        return {
          text: 'Status Unknown',
          className: 'status-unknown',
          icon: '❓',
          color: '#757575',
          description: 'Unable to determine status'
        };
    }
  };

  /**
   * Retry fetching attendance data
   */
  const retryFetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const attendanceData = await attendanceService.getTodayAttendance();
      
      if (attendanceData) {
        // Map the data to match our expected format
        const mappedStatus = mapAttendanceData(attendanceData);
        setCurrentStatus(mappedStatus);
      } else {
        setCurrentStatus({
          currentStatus: 'not_logged_in',
          lastAction: {
            action: 'No activity today',
            timestamp: new Date()
          },
          todaysSummary: {}
        });
      }
      
      setLastUpdateTime(new Date());
    } catch (error) {
      appConfig.error('Failed to fetch attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Maps raw attendance data to component format
   * @param {Object} attendanceData - Raw attendance data
   * @returns {Object} Mapped attendance status
   */
  const mapAttendanceData = (attendanceData) => {
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
  };

  // Set up real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const updateInterval = setInterval(async () => {
      try {
        const attendanceData = await attendanceService.getTodayAttendance();
        if (attendanceData) {
          const mappedStatus = mapAttendanceData(attendanceData);
          setCurrentStatus(mappedStatus);
          setLastUpdateTime(new Date());
        }
      } catch (error) {
        appConfig.log('Real-time attendance update failed:', error);
        // Don't set error state for background updates to avoid disrupting UI
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [enableRealTimeUpdates]);

  // Update local state when prop changes
  useEffect(() => {
    if (attendanceStatus) {
      setCurrentStatus(attendanceStatus);
      setLastUpdateTime(new Date());
    }
  }, [attendanceStatus]);

  // Handle attendance data unavailable scenario
  if (error && !currentStatus) {
    return (
      <div className={`attendance-status-section error-state ${className}`}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">📊</span>
            Attendance Status
          </h2>
        </div>

        <div className="section-content">
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <p className="error-text">Status Unknown</p>
            <p className="error-subtext">
              Unable to load attendance data
            </p>
            <button 
              className="retry-button"
              onClick={retryFetchData}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Retrying...' : '🔄 Retry'}
            </button>
          </div>
        </div>

        <style jsx>{`
          .attendance-status-section {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 16px;
          }

          .section-header {
            margin-bottom: 20px;
          }

          .section-title {
            color: #333;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .title-icon {
            font-size: 20px;
          }

          .section-content {
            color: #666;
            line-height: 1.5;
          }

          .error-message {
            text-align: center;
            padding: 32px 16px;
            background-color: #fff3e0;
            border-radius: 8px;
            border: 2px solid #ffb74d;
          }

          .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .error-text {
            color: #ef6c00;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .error-subtext {
            color: #f57c00;
            font-size: 14px;
            margin: 0 0 20px 0;
          }

          .retry-button {
            background-color: #ff9800;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            min-width: 120px;
          }

          .retry-button:hover:not(:disabled) {
            background-color: #f57c00;
          }

          .retry-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 480px) {
            .attendance-status-section {
              padding: 16px;
            }

            .section-title {
              font-size: 16px;
            }

            .error-message {
              padding: 24px 12px;
            }

            .error-icon {
              font-size: 40px;
            }

            .error-text {
              font-size: 14px;
            }

            .error-subtext {
              font-size: 13px;
            }

            .retry-button {
              padding: 10px 20px;
              font-size: 13px;
            }
          }
        `}</style>
      </div>
    );
  }

  const status = currentStatus || {
    currentStatus: 'not_logged_in',
    lastAction: { action: 'No activity today', timestamp: new Date() },
    todaysSummary: {}
  };

  const statusInfo = getStatusInfo(status.currentStatus);
  const { todaysSummary } = status;

  return (
    <div className={`attendance-status-section ${className}`}>
      <div className="section-header">
        <h2 className="section-title">
          <span className="title-icon">📊</span>
          Attendance Status
        </h2>
        <div className="last-updated">
          Last updated: {formatTimestamp(lastUpdateTime)}
        </div>
      </div>
      
      <div className="section-content">
        {/* Current Status */}
        <div className="current-status">
          <div className={`status-indicator ${statusInfo.className}`}>
            <div className="status-main">
              <span className="status-icon">{statusInfo.icon}</span>
              <div className="status-details">
                <span className="status-text">{statusInfo.text}</span>
                <span className="status-description">{statusInfo.description}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Action */}
        <div className="last-action-section">
          <div className="section-divider">
            <span className="divider-text">Last Action</span>
          </div>
          
          <div className="last-action">
            <div className="action-info">
              <span className="action-text">{status.lastAction.action}</span>
              <div className="action-timestamp">
                <span className="timestamp-date">
                  {formatDate(status.lastAction.timestamp)}
                </span>
                <span className="timestamp-time">
                  {formatTimestamp(status.lastAction.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        {(todaysSummary.checkInTime || todaysSummary.checkOutTime || 
          todaysSummary.lunchStartTime || todaysSummary.overtimeStartTime) && (
          <div className="todays-summary-section">
            <div className="section-divider">
              <span className="divider-text">Today's Activity</span>
            </div>
            
            <div className="summary-grid">
              {todaysSummary.checkInTime && (
                <div className="summary-item check-in">
                  <span className="summary-label">
                    <span className="summary-icon">🌅</span>
                    Check In
                  </span>
                  <span className="summary-time">
                    {formatTimestamp(todaysSummary.checkInTime)}
                  </span>
                </div>
              )}

              {todaysSummary.lunchStartTime && (
                <div className="summary-item lunch-start">
                  <span className="summary-label">
                    <span className="summary-icon">🍽️</span>
                    Lunch Start
                  </span>
                  <span className="summary-time">
                    {formatTimestamp(todaysSummary.lunchStartTime)}
                  </span>
                </div>
              )}

              {todaysSummary.lunchEndTime && (
                <div className="summary-item lunch-end">
                  <span className="summary-label">
                    <span className="summary-icon">⏰</span>
                    Lunch End
                  </span>
                  <span className="summary-time">
                    {formatTimestamp(todaysSummary.lunchEndTime)}
                  </span>
                </div>
              )}

              {todaysSummary.overtimeStartTime && (
                <div className="summary-item overtime-start">
                  <span className="summary-label">
                    <span className="summary-icon">⏰</span>
                    Overtime Start
                  </span>
                  <span className="summary-time">
                    {formatTimestamp(todaysSummary.overtimeStartTime)}
                  </span>
                </div>
              )}

              {todaysSummary.checkOutTime && (
                <div className="summary-item check-out">
                  <span className="summary-label">
                    <span className="summary-icon">🌇</span>
                    Check Out
                  </span>
                  <span className="summary-time">
                    {formatTimestamp(todaysSummary.checkOutTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .attendance-status-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 16px;
        }

        .section-header {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 8px;
        }

        .section-title {
          color: #333;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .title-icon {
          font-size: 20px;
        }

        .last-updated {
          color: #999;
          font-size: 12px;
          font-weight: 400;
        }

        .section-content {
          color: #666;
          line-height: 1.5;
        }

        .current-status {
          margin-bottom: 24px;
        }

        .status-indicator {
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
          background-color: #f8f9fa;
        }

        .status-not-logged-in {
          border-color: #9e9e9e;
          background-color: #fafafa;
        }

        .status-logged-in {
          border-color: #4caf50;
          background-color: #e8f5e8;
        }

        .status-lunch {
          border-color: #ff9800;
          background-color: #fff3e0;
        }

        .status-logged-out {
          border-color: #f44336;
          background-color: #ffebee;
        }

        .status-overtime {
          border-color: #9c27b0;
          background-color: #f3e5f5;
        }

        .status-unknown {
          border-color: #757575;
          background-color: #f5f5f5;
        }

        .status-main {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .status-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .status-text {
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .status-description {
          color: #666;
          font-size: 14px;
          font-weight: 400;
        }

        .last-action-section,
        .todays-summary-section {
          margin-top: 24px;
        }

        .section-divider {
          margin-bottom: 16px;
          text-align: center;
          position: relative;
        }

        .section-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background-color: #e0e0e0;
          z-index: 1;
        }

        .divider-text {
          background: white;
          color: #666;
          font-size: 14px;
          font-weight: 500;
          padding: 0 16px;
          position: relative;
          z-index: 2;
        }

        .last-action {
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        }

        .action-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-text {
          color: #333;
          font-size: 16px;
          font-weight: 500;
        }

        .action-timestamp {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #666;
          font-size: 14px;
        }

        .timestamp-date {
          font-weight: 500;
        }

        .timestamp-time {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #2196f3;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .summary-item.check-in {
          border-left-color: #4caf50;
        }

        .summary-item.lunch-start,
        .summary-item.lunch-end {
          border-left-color: #ff9800;
        }

        .summary-item.overtime-start {
          border-left-color: #9c27b0;
        }

        .summary-item.check-out {
          border-left-color: #f44336;
        }

        .summary-label {
          color: #495057;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .summary-icon {
          font-size: 14px;
        }

        .summary-time {
          color: #333;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.5px;
        }

        @media (max-width: 480px) {
          .attendance-status-section {
            padding: 16px;
          }

          .section-title {
            font-size: 16px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .status-indicator {
            padding: 16px;
          }

          .status-main {
            gap: 12px;
          }

          .status-icon {
            font-size: 28px;
          }

          .status-text {
            font-size: 16px;
          }

          .status-description {
            font-size: 13px;
          }

          .last-action {
            padding: 12px;
          }

          .action-text {
            font-size: 14px;
          }

          .action-timestamp {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
            font-size: 13px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .summary-item {
            padding: 10px;
          }

          .summary-label {
            font-size: 11px;
          }

          .summary-time {
            font-size: 14px;
          }

          .divider-text {
            font-size: 13px;
            padding: 0 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceStatusSection;