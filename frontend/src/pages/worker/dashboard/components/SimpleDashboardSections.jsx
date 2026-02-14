import React from 'react';

/**
 * Simple dashboard sections without lazy loading to fix the Promise rendering issue
 * This is a temporary fix while we debug the lazy loading components
 */

// Simple Project Site Section
export const SimpleProjectSiteSection = ({ projectInfo, className = '' }) => (
  <div className={`dashboard-mobile-section ${className}`}>
    <div className="dashboard-mobile-section-header">
      <h2 className="dashboard-mobile-section-title">📍 Project Site</h2>
    </div>
    <div className="dashboard-mobile-section-content">
      {projectInfo ? (
        <>
          <div className="project-info">
            <h3 className="project-name">{projectInfo.projectName || 'Unknown Project'}</h3>
            <p className="project-location">
              📍 {projectInfo.siteLocation?.address || 'Location not available'}
            </p>
            <div className="project-status">
              <span className={`status-badge status-${projectInfo.status || 'active'}`}>
                {projectInfo.status || 'Active'}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="no-project">
          <p>No project assigned</p>
        </div>
      )}
    </div>
  </div>
);

// Simple Supervisor Contact Section
export const SimpleSupervisorContactSection = ({ supervisorInfo, className = '' }) => (
  <div className={`dashboard-mobile-section ${className}`}>
    <div className="dashboard-mobile-section-header">
      <h2 className="dashboard-mobile-section-title">👤 Supervn
};    ))}
          {notifications.length > 3 && (
            <div className="notifications-more">
              <p>+{notifications.length - 3} more notifications</p>
            </div>
          )}
        </div>
      ) : (
        <div className="no-notifications">
          <p>No notifications</p>
        </div>
      )}
    </div>
  </div>
);

export default {
  SimpleProjectSiteSection,
  SimpleSupervisorContactSection,
  SimpleWorkingHoursSection,
  SimpleAttendanceStatusSection,
  SimpleNotificationsSectioclassName="notification-time">
                  {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Unknown time'}
                </span>
              </div>
              {onMarkAsRead && (
                <button 
                  className="notification-mark-read"
                  onClick={() => onMarkAsRead(notification.id)}
                  type="button"
                >
                  Mark as Read
                </button>
              )}
            </div>
      le-section-content">
      {notifications && notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.slice(0, 3).map((notification, index) => (
            <div key={index} className="notification-item">
              <div className="notification-content">
                <h4 className="notification-title">{notification.title || 'Notification'}</h4>
                <p className="notification-message">{notification.message || 'No message'}</p>
                <span div>
      ) : (
        <div className="no-attendance">
          <p>Attendance status not available</p>
        </div>
      )}
    </div>
  </div>
);

// Simple Notifications Section
export const SimpleNotificationsSection = ({ notifications, onMarkAsRead, className = '' }) => (
  <div className={`dashboard-mobile-section ${className}`}>
    <div className="dashboard-mobile-section-header">
      <h2 className="dashboard-mobile-section-title">🔔 Notifications</h2>
    </div>
    <div className="dashboard-mobitus status-${attendanceStatus.status || 'unknown'}`}>
            Status: {attendanceStatus.status || 'Unknown'}
          </div>
          <div className="attendance-time">
            {attendanceStatus.checkInTime && (
              <p>Check-in: {new Date(attendanceStatus.checkInTime).toLocaleTimeString()}</p>
            )}
            {attendanceStatus.checkOutTime && (
              <p>Check-out: {new Date(attendanceStatus.checkOutTime).toLocaleTimeString()}</p>
            )}
          </div>
        </)}
    </div>
  </div>
);

// Simple Attendance Status Section
export const SimpleAttendanceStatusSection = ({ attendanceStatus, className = '' }) => (
  <div className={`dashboard-mobile-section ${className}`}>
    <div className="dashboard-mobile-section-header">
      <h2 className="dashboard-mobile-section-title">✅ Attendance</h2>
    </div>
    <div className="dashboard-mobile-section-content">
      {attendanceStatus ? (
        <div className="attendance-info">
          <div className={`attendance-sta   <div className="shift-info">
          <div className="shift-time">
            <span className="shift-start">Start: {shiftInfo.startTime || '8:00 AM'}</span>
            <span className="shift-end">End: {shiftInfo.endTime || '5:00 PM'}</span>
          </div>
          <div className="shift-duration">
            Duration: {shiftInfo.duration || '8 hours'}
          </div>
        </div>
      ) : (
        <div className="no-shift">
          <p>Shift information not available</p>
        </div>
        <div className="no-supervisor">
          <p>No supervisor assigned</p>
        </div>
      )}
    </div>
  </div>
);

// Simple Working Hours Section
export const SimpleWorkingHoursSection = ({ shiftInfo, className = '' }) => (
  <div className={`dashboard-mobile-section ${className}`}>
    <div className="dashboard-mobile-section-header">
      <h2 className="dashboard-mobile-section-title">⏰ Working Hours</h2>
    </div>
    <div className="dashboard-mobile-section-content">
      {shiftInfo ? (
     isor</h2>
    </div>
    <div className="dashboard-mobile-section-content">
      {supervisorInfo ? (
        <div className="supervisor-info">
          <h3 className="supervisor-name">{supervisorInfo.name || 'Unknown Supervisor'}</h3>
          <p className="supervisor-contact">
            📞 {supervisorInfo.phone || 'No phone available'}
          </p>
          <p className="supervisor-email">
            ✉️ {supervisorInfo.email || 'No email available'}
          </p>
        </div>
      ) : (
      