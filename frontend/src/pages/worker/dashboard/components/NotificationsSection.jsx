import React, { useState, useEffect } from 'react';
import appConfig from '../../../../config/app.config.js';

/**
 * NotificationsSection Component
 * Displays notifications with sender identification, priority highlighting, and read status management
 * 
 * @param {Object} props
 * @param {import('../types.js').Notification[]} [props.notifications=[]] - Array of notifications
 * @param {Function} [props.onMarkAsRead] - Callback when notification is marked as read
 * @param {boolean} [props.enableRealTimeUpdates=true] - Whether to enable real-time updates
 * @param {string} [props.className] - Additional CSS classes
 */
const NotificationsSection = ({ 
  notifications = [], 
  onMarkAsRead,
  enableRealTimeUpdates = true,
  className = ''
}) => {
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  /**
   * Formats timestamp for display
   * @param {Date|string} timestamp - Timestamp to format
   * @returns {string} Formatted timestamp
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Show relative time for recent notifications
      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        // Show actual date for older notifications
        return date.toLocaleDateString('en-SG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      appConfig.log('Error formatting timestamp:', error);
      return '';
    }
  };

  /**
   * Gets notification type display information
   * @param {string} type - Notification type
   * @returns {Object} Type display information
   */
  const getTypeInfo = (type) => {
    switch (type) {
      case 'system':
        return {
          icon: '⚙️',
          label: 'System',
          color: '#2196f3',
          bgColor: '#e3f2fd'
        };
      case 'supervisor':
        return {
          icon: '👷‍♂️',
          label: 'Supervisor',
          color: '#4caf50',
          bgColor: '#e8f5e8'
        };
      case 'management':
        return {
          icon: '🏢',
          label: 'Management',
          color: '#9c27b0',
          bgColor: '#f3e5f5'
        };
      default:
        return {
          icon: '📢',
          label: 'General',
          color: '#757575',
          bgColor: '#f5f5f5'
        };
    }
  };

  /**
   * Gets notification priority display information
   * @param {string} priority - Notification priority
   * @returns {Object} Priority display information
   */
  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: '🚨',
          label: 'Urgent',
          color: '#f44336',
          bgColor: '#ffebee',
          borderColor: '#f44336',
          className: 'priority-urgent'
        };
      case 'safety_alert':
        return {
          icon: '⚠️',
          label: 'Safety Alert',
          color: '#ff5722',
          bgColor: '#fff3e0',
          borderColor: '#ff5722',
          className: 'priority-safety'
        };
      case 'normal':
      default:
        return {
          icon: '',
          label: 'Normal',
          color: '#666',
          bgColor: 'transparent',
          borderColor: '#e0e0e0',
          className: 'priority-normal'
        };
    }
  };

  /**
   * Handles marking a notification as read
   * @param {string} notificationId - ID of notification to mark as read
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      // Update local state immediately for better UX
      setLocalNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Call parent callback if provided
      if (onMarkAsRead) {
        await onMarkAsRead(notificationId);
      }

      appConfig.log('Notification marked as read:', notificationId);
    } catch (error) {
      appConfig.error('Failed to mark notification as read:', error);
      
      // Revert local state on error
      setLocalNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: false }
            : notification
        )
      );
      
      setError('Failed to update notification status');
    }
  };

  /**
   * Sorts notifications by timestamp (most recent first) and priority
   * @param {Array} notifications - Array of notifications
   * @returns {Array} Sorted notifications
   */
  const sortNotifications = (notifications) => {
    return [...notifications].sort((a, b) => {
      // First sort by priority (safety_alert > urgent > normal)
      const priorityOrder = { safety_alert: 3, urgent: 2, normal: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by timestamp (most recent first)
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });
  };

  // Update local state when props change
  useEffect(() => {
    setLocalNotifications(notifications);
    setLastUpdateTime(new Date());
  }, [notifications]);

  // Sort notifications for display
  const sortedNotifications = sortNotifications(localNotifications);
  const unreadCount = sortedNotifications.filter(n => !n.isRead).length;

  // Handle empty state
  if (sortedNotifications.length === 0) {
    return (
      <div className={`notifications-section empty-state ${className}`}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">📢</span>
            Notifications
          </h2>
        </div>

        <div className="section-content">
          <div className="empty-message">
            <div className="empty-icon">📭</div>
            <p className="empty-text">No notifications</p>
            <p className="empty-subtext">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        </div>

        <style jsx>{`
          .notifications-section {
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

          .empty-message {
            text-align: center;
            padding: 40px 16px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }

          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .empty-text {
            color: #666;
            font-size: 16px;
            font-weight: 500;
            margin: 0 0 8px 0;
          }

          .empty-subtext {
            color: #999;
            font-size: 14px;
            margin: 0;
          }

          @media (max-width: 480px) {
            .notifications-section {
              padding: 16px;
            }

            .section-title {
              font-size: 16px;
            }

            .empty-message {
              padding: 32px 12px;
            }

            .empty-icon {
              font-size: 40px;
            }

            .empty-text {
              font-size: 14px;
            }

            .empty-subtext {
              font-size: 13px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`notifications-section ${className}`}>
      <div className="section-header">
        <h2 className="section-title">
          <span className="title-icon">📢</span>
          Notifications
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </h2>
        <div className="last-updated">
          Last updated: {formatTimestamp(lastUpdateTime)}
        </div>
      </div>
      
      <div className="section-content">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button 
              className="error-dismiss"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <div className="notifications-list">
          {sortedNotifications.map((notification) => {
            const typeInfo = getTypeInfo(notification.type);
            const priorityInfo = getPriorityInfo(notification.priority);
            
            return (
              <div 
                key={notification.id}
                className={`notification-item ${priorityInfo.className} ${notification.isRead ? 'read' : 'unread'}`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                role={notification.isRead ? 'article' : 'button'}
                tabIndex={notification.isRead ? -1 : 0}
                onKeyDown={(e) => {
                  if (!notification.isRead && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleMarkAsRead(notification.id);
                  }
                }}
              >
                {/* Priority indicator for urgent/safety notifications */}
                {(notification.priority === 'urgent' || notification.priority === 'safety_alert') && (
                  <div className="priority-indicator">
                    <span className="priority-icon">{priorityInfo.icon}</span>
                    <span className="priority-label">{priorityInfo.label}</span>
                  </div>
                )}

                <div className="notification-header">
                  <div className="notification-meta">
                    <div className="notification-type">
                      <span className="type-icon">{typeInfo.icon}</span>
                      <span className="type-label">{typeInfo.label}</span>
                    </div>
                    
                    {notification.sender && (
                      <div className="notification-sender">
                        <span className="sender-name">{notification.sender.name}</span>
                        {notification.sender.role && (
                          <span className="sender-role">({notification.sender.role})</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="notification-timestamp">
                    {formatTimestamp(notification.timestamp)}
                  </div>
                </div>

                <div className="notification-content">
                  <h3 className="notification-title">{notification.title}</h3>
                  <p className="notification-message">{notification.message}</p>
                </div>

                <div className="notification-footer">
                  <div className="read-status">
                    {notification.isRead ? (
                      <span className="read-indicator">
                        <span className="read-icon">✓</span>
                        Read
                      </span>
                    ) : (
                      <span className="unread-indicator">
                        <span className="unread-dot"></span>
                        Tap to mark as read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .notifications-section {
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

        .unread-badge {
          background-color: #f44336;
          color: white;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          min-width: 20px;
          text-align: center;
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

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background-color: #ffebee;
          border: 1px solid #f44336;
          border-radius: 8px;
          margin-bottom: 16px;
          color: #d32f2f;
          font-size: 14px;
        }

        .error-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .error-text {
          flex: 1;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #d32f2f;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .error-dismiss:hover {
          background-color: rgba(244, 67, 54, 0.1);
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-item {
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 16px;
          background-color: #fff;
          transition: all 0.2s ease;
          position: relative;
        }

        .notification-item.unread {
          border-left: 4px solid #2196f3;
          background-color: #f8f9ff;
          cursor: pointer;
        }

        .notification-item.unread:hover {
          background-color: #f0f4ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .notification-item.unread:focus {
          outline: 2px solid #2196f3;
          outline-offset: 2px;
        }

        .notification-item.read {
          opacity: 0.8;
          background-color: #fafafa;
        }

        .notification-item.priority-urgent {
          border-color: #f44336;
          background-color: #ffebee;
        }

        .notification-item.priority-urgent.unread {
          border-left-color: #f44336;
          background-color: #ffebee;
        }

        .notification-item.priority-safety {
          border-color: #ff5722;
          background-color: #fff3e0;
        }

        .notification-item.priority-safety.unread {
          border-left-color: #ff5722;
          background-color: #fff3e0;
        }

        .priority-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          padding: 6px 12px;
          background-color: rgba(244, 67, 54, 0.1);
          border-radius: 20px;
          width: fit-content;
          font-size: 12px;
          font-weight: 600;
          color: #d32f2f;
        }

        .priority-safety .priority-indicator {
          background-color: rgba(255, 87, 34, 0.1);
          color: #e64a19;
        }

        .priority-icon {
          font-size: 14px;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 12px;
        }

        .notification-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .notification-type {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #666;
        }

        .type-icon {
          font-size: 14px;
        }

        .notification-sender {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #333;
        }

        .sender-name {
          font-weight: 600;
        }

        .sender-role {
          color: #666;
          font-weight: 400;
        }

        .notification-timestamp {
          color: #999;
          font-size: 12px;
          font-weight: 400;
          white-space: nowrap;
        }

        .notification-content {
          margin-bottom: 12px;
        }

        .notification-title {
          color: #333;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .notification-message {
          color: #666;
          font-size: 14px;
          line-height: 1.4;
          margin: 0;
        }

        .notification-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .read-status {
          font-size: 12px;
        }

        .read-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #4caf50;
          font-weight: 500;
        }

        .read-icon {
          font-size: 12px;
        }

        .unread-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #2196f3;
          font-weight: 500;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background-color: #2196f3;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .notifications-section {
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

          .notification-item {
            padding: 12px;
          }

          .notification-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .notification-meta {
            width: 100%;
          }

          .notification-timestamp {
            align-self: flex-end;
          }

          .notification-title {
            font-size: 14px;
          }

          .notification-message {
            font-size: 13px;
          }

          .priority-indicator {
            font-size: 11px;
            padding: 4px 10px;
          }

          .notification-type {
            font-size: 11px;
          }

          .notification-sender {
            font-size: 12px;
          }

          .read-status,
          .unread-indicator {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationsSection;