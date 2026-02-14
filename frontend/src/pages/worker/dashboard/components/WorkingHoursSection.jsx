import React from 'react';
import appConfig from '../../../../config/app.config.js';

/**
 * WorkingHoursSection Component
 * Displays shift schedule, lunch break timing, and overtime status
 * 
 * @param {Object} props
 * @param {import('../types.js').ShiftInfo} [props.shiftInfo] - Shift information
 * @param {string} [props.className] - Additional CSS classes
 */
const WorkingHoursSection = ({ 
  shiftInfo, 
  className = ''
}) => {
  /**
   * Formats time string to ensure 24-hour format (HH:MM)
   * @param {string} timeString - Time string to format
   * @returns {string} Formatted time in HH:MM format
   */
  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    
    // If already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Try to parse and format the time
    try {
      const date = new Date(`1970-01-01T${timeString}`);
      if (isNaN(date.getTime())) {
        return timeString; // Return original if can't parse
      }
      
      return date.toTimeString().slice(0, 5); // Extract HH:MM
    } catch (error) {
      appConfig.log('Error formatting time:', error);
      return timeString; // Return original on error
    }
  };

  /**
   * Gets overtime status display text and styling
   * @param {'active'|'inactive'} status - Overtime status
   * @returns {Object} Status display information
   */
  const getOvertimeStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return {
          text: 'Overtime: Active',
          className: 'overtime-active',
          icon: '✅'
        };
      case 'inactive':
        return {
          text: 'Overtime: Inactive',
          className: 'overtime-inactive',
          icon: '❌'
        };
      default:
        return {
          text: 'Overtime: Unknown',
          className: 'overtime-unknown',
          icon: '❓'
        };
    }
  };

  // Handle no shift information case
  if (!shiftInfo) {
    return (
      <div className={`working-hours-section no-shift ${className}`}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">🕐</span>
            Working Hours
          </h2>
        </div>

        <div className="section-content">
          <div className="no-shift-message">
            <div className="no-shift-icon">📅</div>
            <p className="no-shift-text">
              No shift information available for today
            </p>
            <p className="no-shift-subtext">
              Please contact your supervisor for shift details
            </p>
          </div>
        </div>

        <style jsx>{`
          .working-hours-section {
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

          .no-shift-message {
            text-align: center;
            padding: 32px 16px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 2px dashed #dee2e6;
          }

          .no-shift-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .no-shift-text {
            color: #495057;
            font-size: 16px;
            font-weight: 500;
            margin: 0 0 8px 0;
          }

          .no-shift-subtext {
            color: #6c757d;
            font-size: 14px;
            margin: 0;
          }

          @media (max-width: 480px) {
            .working-hours-section {
              padding: 16px;
            }

            .section-title {
              font-size: 16px;
            }

            .no-shift-message {
              padding: 24px 12px;
            }

            .no-shift-icon {
              font-size: 40px;
            }

            .no-shift-text {
              font-size: 14px;
            }

            .no-shift-subtext {
              font-size: 13px;
            }
          }
        `}</style>
      </div>
    );
  }

  const {
    startTime,
    endTime,
    lunchBreak,
    overtimeStatus,
    overtimeAuthorized
  } = shiftInfo;

  const overtimeInfo = getOvertimeStatusInfo(overtimeStatus);

  return (
    <div className={`working-hours-section ${className}`}>
      <div className="section-header">
        <h2 className="section-title">
          <span className="title-icon">🕐</span>
          Working Hours
        </h2>
      </div>
      
      <div className="section-content">
        {/* Shift Times */}
        <div className="shift-times">
          <div className="time-row">
            <div className="time-item">
              <span className="time-label">
                <span className="time-icon">🌅</span>
                Start Time
              </span>
              <span className="time-value start-time">
                {formatTime(startTime)}
              </span>
            </div>
            
            <div className="time-item">
              <span className="time-label">
                <span className="time-icon">🌇</span>
                End Time
              </span>
              <span className="time-value end-time">
                {formatTime(endTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Lunch Break */}
        {lunchBreak && (lunchBreak.startTime || lunchBreak.endTime) && (
          <div className="lunch-break-section">
            <div className="section-divider">
              <span className="divider-text">Lunch Break</span>
            </div>
            
            <div className="lunch-break-times">
              <div className="time-row">
                <div className="time-item">
                  <span className="time-label">
                    <span className="time-icon">🍽️</span>
                    Lunch Start
                  </span>
                  <span className="time-value lunch-start">
                    {formatTime(lunchBreak.startTime)}
                  </span>
                </div>
                
                <div className="time-item">
                  <span className="time-label">
                    <span className="time-icon">⏰</span>
                    Lunch End
                  </span>
                  <span className="time-value lunch-end">
                    {formatTime(lunchBreak.endTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overtime Status */}
        <div className="overtime-section">
          <div className="section-divider">
            <span className="divider-text">Overtime Status</span>
          </div>
          
          <div className="overtime-status">
            <div className={`overtime-indicator ${overtimeInfo.className}`}>
              <span className="overtime-icon">{overtimeInfo.icon}</span>
              <span className="overtime-text">{overtimeInfo.text}</span>
            </div>
            
            {overtimeStatus === 'active' && !overtimeAuthorized && (
              <div className="overtime-warning">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">
                  Overtime active but not pre-authorized
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .working-hours-section {
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

        .shift-times {
          margin-bottom: 20px;
        }

        .time-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .time-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #1976d2;
        }

        .time-label {
          color: #495057;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .time-icon {
          font-size: 16px;
        }

        .time-value {
          color: #333;
          font-size: 20px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }

        .start-time {
          color: #4caf50;
        }

        .end-time {
          color: #f44336;
        }

        .lunch-start,
        .lunch-end {
          color: #ff9800;
        }

        .lunch-break-section,
        .overtime-section {
          margin-top: 20px;
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

        .lunch-break-times {
          margin-bottom: 0;
        }

        .overtime-status {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .overtime-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          font-weight: 500;
        }

        .overtime-active {
          background-color: #e8f5e8;
          border: 2px solid #4caf50;
          color: #2e7d32;
        }

        .overtime-inactive {
          background-color: #ffebee;
          border: 2px solid #f44336;
          color: #c62828;
        }

        .overtime-unknown {
          background-color: #f5f5f5;
          border: 2px solid #9e9e9e;
          color: #616161;
        }

        .overtime-icon {
          font-size: 20px;
        }

        .overtime-text {
          font-size: 16px;
        }

        .overtime-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background-color: #fff3e0;
          border: 1px solid #ffb74d;
          border-radius: 6px;
          color: #ef6c00;
          font-size: 14px;
        }

        .warning-icon {
          font-size: 16px;
        }

        .warning-text {
          font-weight: 500;
        }

        @media (max-width: 480px) {
          .working-hours-section {
            padding: 16px;
          }

          .section-title {
            font-size: 16px;
          }

          .time-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .time-item {
            padding: 12px;
          }

          .time-label {
            font-size: 13px;
          }

          .time-value {
            font-size: 18px;
          }

          .overtime-indicator {
            padding: 12px;
          }

          .overtime-text {
            font-size: 14px;
          }

          .overtime-warning {
            padding: 10px;
            font-size: 13px;
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

export default WorkingHoursSection;