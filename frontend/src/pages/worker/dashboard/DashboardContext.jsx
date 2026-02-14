import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext.js';
import performanceService from '../../../services/PerformanceService.js';
import appConfig from '../../../config/app.config.js';

/**
 * Dashboard Context for Worker Mobile Dashboard
 * Manages global dashboard state and provides data to all dashboard components
 */

const DashboardContext = createContext();

/**
 * Dashboard state interface
 * @typedef {Object} DashboardState
 * @property {Object|null} data - Dashboard data
 * @property {boolean} isLoading - Loading state
 * @property {Object|null} error - Error state
 * @property {Date|null} lastUpdated - Last update timestamp
 * @property {boolean} isOffline - Offline status
 * @property {boolean} hasCache - Cache availability
 */

/**
 * Dashboard data interface
 * @typedef {Object} DashboardData
 * @property {string} workerId - Worker ID
 * @property {Object|null} projectInfo - Project information
 * @property {Object|null} supervisorInfo - Supervisor information
 * @property {Object|null} shiftInfo - Shift information
 * @property {Object|null} attendanceStatus - Attendance status
 * @property {Array} notifications - Notifications array
 * @property {Object|null} geofenceStatus - Geofence status
 * @property {Date} lastUpdated - Last update timestamp
 */

/**
 * Dashboard Provider Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.workerId - ID of the worker
 * @param {number} [props.refreshInterval=30000] - Auto-refresh interval in milliseconds
 */
export const DashboardProvider = ({ children, workerId, refreshInterval = 30000 }) => {
  const { isAuthenticated, logout } = useAuth();
  
  // Lazy loaded dashboard service to avoid circular dependency
  const [dashboardService, setDashboardService] = useState(null);
  
  // Core dashboard state
  const [dashboardState, setDashboardState] = useState({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    isOffline: false,
    hasCache: false
  });

  // Real-time update subscriptions
  const [subscriptions, setSubscriptions] = useState(new Map());

  // Network status monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /**
   * Lazy load DashboardService to avoid circular dependency
   */
  const getDashboardService = useCallback(async () => {
    if (!dashboardService) {
      try {
        const dashboardServiceModule = await import('../../../services/DashboardServiceNew.js');
        const service = dashboardServiceModule.default;
        setDashboardService(service);
        return service;
      } catch (error) {
        appConfig.error('Failed to load DashboardService:', error);
        throw new Error('Dashboard service unavailable');
      }
    }
    return dashboardService;
  }, [dashboardService]);

  /**
   * Update dashboard state
   * @param {Partial<DashboardState>} updates - State updates to apply
   */
  const updateState = useCallback((updates) => {
    setDashboardState(prevState => ({
      ...prevState,
      ...updates,
      lastUpdated: updates.data ? new Date() : prevState.lastUpdated
    }));
  }, []);

  /**
   * Set loading state
   * @param {boolean} loading - Loading status
   */
  const setLoading = useCallback((loading) => {
    updateState({ isLoading: loading });
  }, [updateState]);

  /**
   * Set error state
   * @param {DashboardError|null} error - Error object or null to clear
   */
  const setError = useCallback((error) => {
    updateState({ error, isLoading: false });
  }, [updateState]);

  /**
   * Set dashboard data
   * @param {DashboardData} data - Dashboard data
   */
  const setData = useCallback((data) => {
    updateState({ 
      data, 
      error: null, 
      isLoading: false,
      hasCache: true 
    });
  }, [updateState]);

  /**
   * Clear dashboard data
   */
  const clearData = useCallback(() => {
    updateState({ 
      data: null, 
      error: null, 
      isLoading: false,
      hasCache: false 
    });
  }, [updateState]);

  /**
   * Refresh dashboard data with authentication checks
   * @returns {Promise<void>}
   */
  const refreshData = useCallback(async () => {
    if (!workerId) {
      setError({
        type: 'INVALID_WORKER_ID',
        message: 'Worker ID is required to load dashboard data',
        canRetry: false
      });
      return;
    }

    // Check authentication before making API calls
    if (!isAuthenticated) {
      setError({
        type: 'UNAUTHORIZED',
        message: 'Authentication required to access dashboard data',
        canRetry: false
      });
      return;
    }

    const measurementId = performanceService.startMeasurement('dashboard_refresh');
    setLoading(true);
    
    try {
      // Get dashboard service instance
      const service = await getDashboardService();
      
      // Use the dashboard service to get data with authentication
      const dashboardData = await service.getDashboardData(workerId);
      
      setData(dashboardData);
      
      performanceService.endMeasurement(measurementId, {
        workerId,
        dataSize: JSON.stringify(dashboardData).length,
        sectionsLoaded: Object.keys(dashboardData).length
      });
      
      appConfig.log('Dashboard data refreshed for authenticated worker:', workerId);
    } catch (error) {
      performanceService.endMeasurement(measurementId, {
        error: error.message,
        workerId
      });
      
      appConfig.error('Failed to refresh dashboard data:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication') || 
          error.message.includes('Access denied') ||
          error.message.includes('Session expired')) {
        setError({
          type: 'UNAUTHORIZED',
          message: error.message,
          canRetry: false
        });
        // Logout user if authentication failed
        logout();
        return;
      }
      
      // Handle other errors
      setError({
        type: 'DATA_LOAD_FAILED',
        message: 'Failed to load dashboard data. Please try again.',
        canRetry: true,
        details: error.message
      });
    }
  }, [workerId, isAuthenticated, logout, setLoading, setData, setError, getDashboardService]);

  /**
   * Subscribe to real-time updates
   * @param {string} type - Update type (attendance, notifications, etc.)
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  const subscribe = useCallback((type, callback) => {
    const subscriptionId = `${type}_${Date.now()}_${Math.random()}`;
    
    setSubscriptions(prev => {
      const newSubscriptions = new Map(prev);
      newSubscriptions.set(subscriptionId, { type, callback });
      return newSubscriptions;
    });

    appConfig.log(`Subscribed to ${type} updates:`, subscriptionId);

    // Return unsubscribe function
    return () => {
      setSubscriptions(prev => {
        const newSubscriptions = new Map(prev);
        newSubscriptions.delete(subscriptionId);
        return newSubscriptions;
      });
      appConfig.log(`Unsubscribed from ${type} updates:`, subscriptionId);
    };
  }, []);

  /**
   * Handle real-time update
   * @param {string} type - Update type
   * @param {any} data - Update data
   */
  const handleRealtimeUpdate = useCallback((type, data) => {
    // Notify all subscribers of this type
    subscriptions.forEach((subscriptionData, id) => {
      if (subscriptionData.type === type) {
        try {
          subscriptionData.callback(data);
        } catch (error) {
          appConfig.error(`Error in subscription callback ${id}:`, error);
        }
      }
    });

    // Update dashboard state based on update type
    setDashboardState(prevState => {
      if (!prevState.data) return prevState;

      const updatedData = { ...prevState.data };
      
      switch (type) {
        case 'attendance':
          updatedData.attendanceStatus = data;
          break;
        case 'notifications':
          if (Array.isArray(data)) {
            updatedData.notifications = data;
          } else {
            updatedData.notifications = [...prevState.data.notifications, data];
          }
          break;
        case 'geofence':
          updatedData.geofenceStatus = data;
          break;
        default:
          appConfig.log('Unknown update type:', type);
          return prevState;
      }

      return {
        ...prevState,
        data: updatedData,
        lastUpdated: new Date()
      };
    });
  }, [subscriptions]);

  /**
   * Handle network status changes
   */
  const handleOnlineStatusChange = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    updateState({ isOffline: !online });

    if (online && dashboardState.error?.type === 'NETWORK_ERROR') {
      // Clear network errors when back online
      setError(null);
      // Optionally refresh data
      refreshData();
    }

    appConfig.log('Network status changed:', online ? 'online' : 'offline');
  }, [dashboardState.error, updateState, setError, refreshData]);

  // Set up network status monitoring
  useEffect(() => {
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [handleOnlineStatusChange]);

  // Set up auto-refresh interval with authentication checks
  useEffect(() => {
    if (!workerId || !refreshInterval || !isAuthenticated) return;

    const interval = setInterval(() => {
      if (isOnline && !dashboardState.isLoading && isAuthenticated) {
        refreshData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [workerId, refreshInterval, isOnline, dashboardState.isLoading, isAuthenticated, refreshData]);

  // Initial data load with authentication check
  useEffect(() => {
    if (workerId && isOnline && isAuthenticated) {
      refreshData();
    }
  }, [workerId, isOnline, isAuthenticated, refreshData]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach((subscriptionData, id) => {
        appConfig.log('Cleaning up subscription:', id);
      });
      setSubscriptions(new Map());
    };
  }, [subscriptions]);

  const contextValue = {
    // State
    ...dashboardState,
    isOnline,
    workerId,

    // Actions
    refreshData,
    setLoading,
    setError,
    setData,
    clearData,
    updateState,

    // Real-time updates
    subscribe,
    handleRealtimeUpdate,

    // Utility methods
    hasData: !!dashboardState.data,
    canRetry: dashboardState.error?.canRetry || false,
    isInitialLoad: !dashboardState.data && !dashboardState.error,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

/**
 * Hook to use dashboard context
 * @returns {Object} Dashboard context value
 */
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  
  return context;
};

export default DashboardContext;