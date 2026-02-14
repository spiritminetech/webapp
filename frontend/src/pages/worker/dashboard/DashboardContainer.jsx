import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext.js';
import { Navigate } from 'react-router-dom';
import { DashboardProvider, useDashboard } from './DashboardContext.jsx';
import DashboardErrorBoundary from './DashboardErrorBoundary.jsx';
import {
  LazyProjectSiteSection,
  LazySupervisorContactSection,
  LazyWorkingHoursSection,
  LazyAttendanceStatusSection,
  LazyNotificationsSection,
  useDashboardProgressiveLoading
} from './components/LazyDashboardSections.jsx';
import performanceService from '../../../services/PerformanceService.js';
import authService from '../../../services/AuthService.js';
import tokenService from '../../../services/TokenService.js';
import appConfig from '../../../config/app.config.js';
import './DashboardMobile.css';

/**
 * Authentication Guard Component
 * Handles authentication requirements and session management
 * Implements Requirements 9.1, 9.2, 9.3, 9.5
 */
const AuthenticationGuard = ({ children, workerId }) => {
  const { isAuthenticated, user, tokenInfo, logout, getToken, getUserFromToken } = useAuth();
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionTimeoutId, setSessionTimeoutId] = useState(null);
  const [warningTimeoutId, setWarningTimeoutId] = useState(null);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Session timeout configuration (8 hours = 28800000 ms) - Requirement 9.2
  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
  const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
  const ACTIVITY_CHECK_INTERVAL = 60000; // Check activity every minute

  /**
   * Handle session timeout warning
   */
  const handleSessionWarning = useCallback(() => {
    setSessionWarning(true);
    appConfig.log('Session timeout warning displayed - Requirement 9.2');
  }, []);

  /**
   * Handle automatic logout due to session timeout - Requirement 9.2
   */
  const handleSessionTimeout = useCallback(() => {
    appConfig.log('Session timeout - automatically logging out user (8 hours inactivity) - Requirement 9.2');
    logout();
  }, [logout]);

  /**
   * Update last activity time
   */
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  /**
   * Extend session - called when user interacts with the dashboard
   */
  const extendSession = useCallback(() => {
    if (sessionWarning) {
      setSessionWarning(false);
    }

    // Clear existing timeouts
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    if (warningTimeoutId) {
      clearTimeout(warningTimeoutId);
    }

    // Update activity time
    updateActivity();

    // Set new timeouts based on current time
    const newWarningTimeoutId = setTimeout(handleSessionWarning, SESSION_TIMEOUT - SESSION_WARNING_TIME);
    const newLogoutTimeoutId = setTimeout(handleSessionTimeout, SESSION_TIMEOUT);
    
    setWarningTimeoutId(newWarningTimeoutId);
    setSessionTimeoutId(newLogoutTimeoutId);

    appConfig.log('Session extended - new timeout in 8 hours - Requirement 9.2');
  }, [sessionWarning, sessionTimeoutId, warningTimeoutId, handleSessionWarning, handleSessionTimeout, updateActivity]);

  /**
   * Check authentication status and token validity - Requirement 9.1, 9.2
   */
  const checkAuthenticationStatus = useCallback(() => {
    // Requirement 9.1: Valid worker authentication required
    if (!isAuthenticated) {
      appConfig.log('User not authenticated - Requirement 9.1 failed');
      return false;
    }

    if (!user) {
      appConfig.log('User data not available - Requirement 9.1 failed');
      return false;
    }

    // Check if token is expired - Requirement 9.2
    if (tokenInfo.isExpired) {
      appConfig.log('Token is expired, logging out - Requirement 9.2');
      logout();
      return false;
    }

    // Check if token needs refresh
    if (tokenInfo.shouldRefresh) {
      appConfig.log('Token needs refresh, attempting refresh');
      authService.refreshToken().catch(error => {
        appConfig.error('Token refresh failed:', error);
        logout();
      });
    }

    // Validate token is still valid by checking with TokenService
    const currentToken = getToken();
    if (!currentToken) {
      appConfig.log('No valid token available - Requirement 9.1 failed');
      logout();
      return false;
    }

    return true;
  }, [isAuthenticated, user, tokenInfo, logout, getToken]);

  /**
   * Validate worker data isolation - Requirement 9.3
   */
  const validateWorkerDataIsolation = useCallback(() => {
    if (!user || !workerId) {
      appConfig.log('Missing user or workerId for data isolation check - Requirement 9.3');
      return false;
    }

    // Get user info from token to ensure data isolation - Requirement 9.3
    const tokenUser = getUserFromToken();
    if (!tokenUser) {
      appConfig.error('Unable to get user from token - Requirement 9.3 failed');
      return false;
    }

    // Ensure the worker ID matches the authenticated user - Requirement 9.3
    const userWorkerId = tokenUser.userId || user.id || user._id || user.workerId;
    if (userWorkerId !== workerId) {
      appConfig.error('Worker ID mismatch - data isolation violation - Requirement 9.3 failed', {
        userWorkerId,
        requestedWorkerId: workerId,
        tokenUserId: tokenUser.userId
      });
      return false;
    }

    // Ensure user has worker role or appropriate permissions
    const userRole = user.role || tokenUser.role;
    if (!userRole || !['WORKER', 'DRIVER', 'SUPERVISOR'].includes(userRole)) {
      appConfig.error('User does not have appropriate role for dashboard access - Requirement 9.3 failed:', userRole);
      return false;
    }

    // Additional validation: ensure company/project context matches if available
    if (tokenUser.companyId && user.companyId && tokenUser.companyId !== user.companyId) {
      appConfig.error('Company ID mismatch - data isolation violation - Requirement 9.3 failed', {
        tokenCompanyId: tokenUser.companyId,
        userCompanyId: user.companyId
      });
      return false;
    }

    appConfig.log('Data isolation validation passed - Requirement 9.3 satisfied', {
      workerId,
      userRole,
      companyId: tokenUser.companyId
    });

    return true;
  }, [user, workerId, getUserFromToken]);

  // Set up session monitoring - Requirement 9.2
  useEffect(() => {
    if (isAuthenticated && user) {
      // Start session timeout
      extendSession();

      // Set up activity listeners to extend session - Requirement 9.2
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      // Throttled activity handler - only track specific events, not clicks
      let lastActivity = 0;
      const throttledHandler = () => {
        const now = Date.now();
        if (now - lastActivity > 60000) { // Throttle to once per minute
          lastActivity = now;
          updateActivity();
          
          // Only extend session if user is still authenticated
          if (isAuthenticated) {
            extendSession();
          }
        }
      };

      // Only track non-interfering events for session management
      const sessionEvents = ['keypress', 'scroll', 'touchstart', 'mousemove'];
      sessionEvents.forEach(event => {
        document.addEventListener(event, throttledHandler, false);
      });

      // Track clicks only on the dashboard content itself, not globally
      const dashboardElement = document.querySelector('.dashboard-mobile-container');
      if (dashboardElement) {
        dashboardElement.addEventListener('click', throttledHandler, false);
      }

      // Set up periodic activity check
      const activityCheckInterval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        
        // If no activity for 8 hours, trigger timeout
        if (timeSinceLastActivity >= SESSION_TIMEOUT) {
          appConfig.log('No activity detected for 8 hours, triggering timeout - Requirement 9.2');
          handleSessionTimeout();
        }
        // If approaching timeout, show warning
        else if (timeSinceLastActivity >= (SESSION_TIMEOUT - SESSION_WARNING_TIME) && !sessionWarning) {
          appConfig.log('Approaching session timeout, showing warning - Requirement 9.2');
          handleSessionWarning();
        }
      }, ACTIVITY_CHECK_INTERVAL);

      // Cleanup function
      return () => {
        if (sessionTimeoutId) {
          clearTimeout(sessionTimeoutId);
        }
        if (warningTimeoutId) {
          clearTimeout(warningTimeoutId);
        }
        clearInterval(activityCheckInterval);
        
        sessionEvents.forEach(event => {
          document.removeEventListener(event, throttledHandler, false);
        });
        
        const dashboardElement = document.querySelector('.dashboard-mobile-container');
        if (dashboardElement) {
          dashboardElement.removeEventListener('click', throttledHandler, false);
        }
      };
    }
  }, [isAuthenticated, user, extendSession, sessionTimeoutId, warningTimeoutId, lastActivityTime, sessionWarning, handleSessionTimeout, handleSessionWarning, updateActivity]);

  // Periodic authentication check - Requirement 9.1, 9.2
  useEffect(() => {
    const authCheckInterval = setInterval(() => {
      if (!checkAuthenticationStatus()) {
        clearInterval(authCheckInterval);
      }
    }, 60000); // Check every minute

    return () => clearInterval(authCheckInterval);
  }, [checkAuthenticationStatus]);

  // Check authentication on mount and when dependencies change - Requirement 9.1, 9.3
  useEffect(() => {
    if (!checkAuthenticationStatus()) {
      return;
    }

    if (!validateWorkerDataIsolation()) {
      appConfig.error('Data isolation validation failed, logging out user - Requirement 9.3');
      logout();
      return;
    }
  }, [checkAuthenticationStatus, validateWorkerDataIsolation, logout]);

  // Render session warning modal - Requirement 9.2
  if (sessionWarning) {
    return (
      <div className="dashboard-mobile-container">
        <div className="dashboard-mobile-session-warning">
          <div className="dashboard-mobile-session-warning-content">
            <div className="dashboard-mobile-session-warning-icon">⏰</div>
            <h2 className="dashboard-mobile-session-warning-title">Session Expiring Soon</h2>
            <p className="dashboard-mobile-session-warning-message">
              Your session will expire in 5 minutes due to inactivity. 
              Click "Stay Logged In" to continue working.
            </p>
            <div className="dashboard-mobile-session-warning-actions">
              <button 
                className="dashboard-mobile-button dashboard-mobile-button--primary dashboard-mobile-button--large"
                onClick={() => {
                  setSessionWarning(false);
                  extendSession();
                  appConfig.log('User chose to stay logged in - session extended - Requirement 9.2');
                }}
                type="button"
              >
                Stay Logged In
              </button>
              <button 
                className="dashboard-mobile-button dashboard-mobile-button--secondary dashboard-mobile-button--large"
                onClick={() => {
                  appConfig.log('User chose to log out from session warning - Requirement 9.2');
                  logout();
                }}
                type="button"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated - Requirement 9.1
  if (!isAuthenticated || !user) {
    appConfig.log('Redirecting to login - authentication required - Requirement 9.1');
    return <Navigate to="/login" replace />;
  }

  // Validate data isolation - Requirement 9.3
  if (!validateWorkerDataIsolation()) {
    return (
      <DashboardError 
        error={{
          type: 'DATA_ISOLATION_ERROR',
          message: 'Access denied. Please log in with the correct account.',
          canRetry: false
        }}
        onRetry={() => {
          appConfig.log('Data isolation error - logging out user - Requirement 9.3');
          logout();
        }}
        workerId={workerId}
      />
    );
  }

  return children;
};
const DashboardLoading = () => (
  <div className="dashboard-mobile-container">
    <div className="dashboard-mobile-loading">
      <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--title"></div>
      <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--subtitle"></div>
      
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
      ))}
    </div>
  </div>
);

/**
 * Dashboard Loading Component
 * Shows loading state with skeleton screens
 */
/**
 * Dashboard Error Component
 * Shows error states with retry options
 */
const DashboardError = ({ error, onRetry, workerId }) => {
  const { logout } = useAuth();

  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'NETWORK_ERROR':
        return '📡';
      case 'UNAUTHORIZED':
      case 'DATA_ISOLATION_ERROR':
        return '🔒';
      case 'DATA_LOAD_FAILED':
        return '⚠️';
      case 'SESSION_EXPIRED':
        return '⏰';
      default:
        return '❌';
    }
  };

  const getErrorTitle = (errorType) => {
    switch (errorType) {
      case 'NETWORK_ERROR':
        return 'Connection Problem';
      case 'UNAUTHORIZED':
        return 'Access Denied';
      case 'DATA_ISOLATION_ERROR':
        return 'Access Denied';
      case 'SESSION_EXPIRED':
        return 'Session Expired';
      case 'DATA_LOAD_FAILED':
        return 'Loading Failed';
      default:
        return 'Something Went Wrong';
    }
  };

  const handleContactSupervisor = () => {
    // In a real app, this would open supervisor contact
    appConfig.log('Contact supervisor requested for error:', error);
    alert('Please contact your supervisor for assistance.\n\nError: ' + error.message);
  };

  const handleAuthError = () => {
    if (error.type === 'UNAUTHORIZED' || error.type === 'SESSION_EXPIRED' || error.type === 'DATA_ISOLATION_ERROR') {
      logout();
    }
  };

  return (
    <div className="dashboard-mobile-container">
      <div className="dashboard-mobile-error">
        <div className="dashboard-mobile-error-icon">
          {getErrorIcon(error.type)}
        </div>
        <h2 className="dashboard-mobile-error-title">
          {getErrorTitle(error.type)}
        </h2>
        <p className="dashboard-mobile-error-message">
          {error.message}
        </p>
        
        <div className="dashboard-mobile-error-actions">
          {error.canRetry && (
            <button 
              className="dashboard-mobile-button dashboard-mobile-button--primary dashboard-mobile-button--large"
              onClick={onRetry}
              type="button"
            >
              <span>🔄</span>
              Try Again
            </button>
          )}
          
          {(error.type === 'UNAUTHORIZED' || error.type === 'SESSION_EXPIRED' || error.type === 'DATA_ISOLATION_ERROR') && (
            <button 
              className="dashboard-mobile-button dashboard-mobile-button--primary dashboard-mobile-button--large"
              onClick={handleAuthError}
              type="button"
            >
              <span>🔑</span>
              Log In Again
            </button>
          )}
          
          <button 
            className="dashboard-mobile-button dashboard-mobile-button--secondary dashboard-mobile-button--large"
            onClick={handleContactSupervisor}
            type="button"
          >
            <span>📞</span>
            Contact Supervisor
          </button>
        </div>

        {appConfig.app.isDevelopment && error.details && (
          <details className="dashboard-mobile-error-details">
            <summary>Technical Details</summary>
            <pre>{error.details}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

/**
 * Dashboard Content Component
 * Main dashboard content when data is loaded with progressive loading
 */
const DashboardContent = ({ data }) => {
  const { shouldLoadSection, loadingProgress } = useDashboardProgressiveLoading(data);

  return (
    <div className="dashboard-mobile-container">
      <div className="dashboard-mobile-header">
        <h1 className="dashboard-mobile-title">Worker Dashboard</h1>
        <p className="dashboard-mobile-subtitle">
          Welcome back! Here's your daily overview.
        </p>
        
        {/* Show loading progress if not all sections are loaded */}
        {loadingProgress < 100 && (
          <div className="dashboard-mobile-progress">
            <div className="dashboard-mobile-progress-bar">
              <div 
                className="dashboard-mobile-progress-fill"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="dashboard-mobile-progress-text">
              Loading sections... {Math.round(loadingProgress)}%
            </p>
          </div>
        )}
      </div>

      <div className="dashboard-mobile-sections">
        {/* Project Site Section - Priority 1 */}
        {shouldLoadSection('project') ? (
          <LazyProjectSiteSection 
            projectInfo={data.projectInfo}
            className="dashboard-mobile-section"
          />
        ) : (
          <div className="dashboard-mobile-section">
            <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
          </div>
        )}

        {/* Working Hours Section - Priority 3 */}
        {shouldLoadSection('hours') ? (
          <LazyWorkingHoursSection 
            shiftInfo={data.shiftInfo}
            className="dashboard-mobile-section"
          />
        ) : (
          <div className="dashboard-mobile-section">
            <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
          </div>
        )}

        {/* Supervisor Section - Priority 4 */}
        {shouldLoadSection('supervisor') ? (
          <LazySupervisorContactSection 
            supervisorInfo={data.supervisorInfo}
            className="dashboard-mobile-section"
          />
        ) : (
          <div className="dashboard-mobile-section">
            <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
          </div>
        )}

        {/* Attendance Section - Priority 2 */}
        {shouldLoadSection('attendance') ? (
          <LazyAttendanceStatusSection 
            attendanceStatus={data.attendanceStatus}
            enableRealTimeUpdates={true}
            className="dashboard-mobile-section"
          />
        ) : (
          <div className="dashboard-mobile-section">
            <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
          </div>
        )}

        {/* Notifications Section - Priority 5 */}
        {shouldLoadSection('notifications') ? (
          <LazyNotificationsSection 
            notifications={data.notifications}
            onMarkAsRead={(notificationId) => {
              // Handle marking notification as read
              appConfig.log('Marking notification as read:', notificationId);
              // This would typically call a service method to update the notification status
            }}
            enableRealTimeUpdates={true}
            className="dashboard-mobile-section dashboard-mobile-section--full-width"
          />
        ) : (
          <div className="dashboard-mobile-section dashboard-mobile-section--full-width">
            <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
          </div>
        )}
      </div>

      <div className="dashboard-mobile-footer">
        <p className="dashboard-mobile-last-updated">
          Last updated: {data.lastUpdated?.toLocaleTimeString() || 'Never'}
        </p>
        
        {/* Performance info in development mode */}
        {appConfig.app.isDevelopment && (
          <div className="dashboard-mobile-performance-info">
            <details>
              <summary>Performance Info</summary>
              <PerformanceInfo />
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Performance Info Component (Development Only)
 * Shows performance metrics for debugging
 */
const PerformanceInfo = () => {
  const [perfSummary, setPerfSummary] = React.useState(null);

  React.useEffect(() => {
    const summary = performanceService.getDashboardPerformanceSummary();
    setPerfSummary(summary);
  }, []);

  if (!perfSummary) return <p>Loading performance data...</p>;

  return (
    <div className="dashboard-mobile-performance-summary">
      <h4>Dashboard Performance</h4>
      <div className="perf-metric">
        <strong>Load Time:</strong> {perfSummary.loadTime.average}ms 
        {perfSummary.meetsRequirement ? ' ✅' : ' ❌'}
      </div>
      <div className="perf-metric">
        <strong>API Calls:</strong> {perfSummary.apiCalls.average}ms avg
      </div>
      <div className="perf-metric">
        <strong>Component Renders:</strong> {perfSummary.componentRender.average}ms avg
      </div>
      <div className="perf-metric">
        <strong>Threshold:</strong> {perfSummary.threshold}ms
      </div>
    </div>
  );
};

/**
 * Dashboard Inner Component
 * Handles dashboard state and renders appropriate content with performance monitoring
 */
const DashboardInner = () => {
  const { 
    data, 
    isLoading, 
    error, 
    workerId, 
    refreshData, 
    isInitialLoad 
  } = useDashboard();

  const [dashboardLoadId, setDashboardLoadId] = React.useState(null);

  // Start performance measurement on initial load
  React.useEffect(() => {
    if (isInitialLoad && !dashboardLoadId) {
      const measurementId = performanceService.startDashboardLoad();
      setDashboardLoadId(measurementId);
    }
  }, [isInitialLoad, dashboardLoadId]);

  // End performance measurement when data is loaded
  React.useEffect(() => {
    if (data && dashboardLoadId) {
      performanceService.endDashboardLoad(dashboardLoadId, {
        workerId,
        sectionsCount: 5,
        hasProject: !!data.projectInfo?.projectName,
        hasGeofence: !!data.geofenceStatus,
        notificationsCount: data.notifications?.length || 0
      });
      setDashboardLoadId(null);
    }
  }, [data, dashboardLoadId, workerId]);

  // Handle initial load or loading state
  if (isLoading || isInitialLoad) {
    return <DashboardLoading />;
  }

  // Handle error state
  if (error) {
    // End performance measurement on error
    if (dashboardLoadId) {
      performanceService.endDashboardLoad(dashboardLoadId, {
        error: error.message,
        errorType: error.type
      });
      setDashboardLoadId(null);
    }

    return (
      <DashboardError 
        error={error} 
        onRetry={refreshData}
        workerId={workerId}
      />
    );
  }

  // Handle success state
  if (data) {
    return <DashboardContent data={data} />;
  }

  // Fallback state
  return (
    <DashboardError 
      error={{
        type: 'UNKNOWN_STATE',
        message: 'Dashboard is in an unknown state. Please try refreshing.',
        canRetry: true
      }}
      onRetry={refreshData}
      workerId={workerId}
    />
  );
};

/**
 * Main Dashboard Container Component
 * Entry point for the worker mobile dashboard with authentication and session management
 * Implements Requirements 9.1, 9.2, 9.3, 9.5
 */
const DashboardContainer = ({ refreshInterval = 30000 }) => {
  const { user, isAuthenticated, tokenInfo, getUserFromToken } = useAuth();

  // Set up performance monitoring
  React.useEffect(() => {
    performanceService.setupPerformanceObservers();
    
    return () => {
      performanceService.cleanup();
    };
  }, []);

  // Early return if not authenticated - let AuthenticationGuard handle redirect - Requirement 9.1
  if (!isAuthenticated || !user) {
    return null;
  }

  // Extract worker ID with data isolation validation - Requirement 9.3
  const tokenUser = getUserFromToken();
  const workerId = tokenUser?.userId || user.id || user._id || user.workerId;

  if (!workerId) {
    return (
      <DashboardError 
        error={{
          type: 'INVALID_USER',
          message: 'Unable to identify worker. Please log in again.',
          canRetry: false
        }}
        onRetry={() => {
          appConfig.log('Invalid user error - reloading page - Requirement 9.1');
          window.location.reload();
        }}
        workerId={null}
      />
    );
  }

  // Check token expiry status - Requirement 9.2
  if (tokenInfo.isExpired) {
    return (
      <DashboardError 
        error={{
          type: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
          canRetry: false
        }}
        onRetry={() => {
          appConfig.log('Session expired error - Requirement 9.2');
        }}
        workerId={workerId}
      />
    );
  }

  // Additional security check: ensure HTTPS connection - Requirement 9.5
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    appConfig.error('Insecure connection detected - HTTPS required - Requirement 9.5');
    return (
      <DashboardError 
        error={{
          type: 'INSECURE_CONNECTION',
          message: 'Secure connection required. Please use HTTPS.',
          canRetry: false
        }}
        onRetry={() => {
          window.location.href = window.location.href.replace('http:', 'https:');
        }}
        workerId={workerId}
      />
    );
  }

  return (
    <AuthenticationGuard workerId={workerId}>
      <DashboardErrorBoundary workerId={workerId}>
        <DashboardProvider workerId={workerId} refreshInterval={refreshInterval}>
          <DashboardInner />
        </DashboardProvider>
      </DashboardErrorBoundary>
    </AuthenticationGuard>
  );
};

export default DashboardContainer;