/**
 * LocationContext - React context for global location tracking state
 * Provides location tracking functionality across the entire application
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import locationService from '../services/LocationService';
import locationLogger from '../utils/locationLogger';

// Action types
const LOCATION_ACTIONS = {
  SET_LOCATION: 'SET_LOCATION',
  SET_ERROR: 'SET_ERROR',
  SET_TRACKING: 'SET_TRACKING',
  SET_LOADING: 'SET_LOADING',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  SET_GEOFENCE_STATUS: 'SET_GEOFENCE_STATUS',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  location: null,
  error: null,
  isTracking: false,
  isLoading: false,
  permissions: null,
  geofenceStatus: null,
  lastUpdate: null
};

// Reducer
const locationReducer = (state, action) => {
  switch (action.type) {
    case LOCATION_ACTIONS.SET_LOCATION:
      return {
        ...state,
        location: action.payload,
        lastUpdate: new Date().toISOString(),
        error: null,
        isLoading: false
      };
    
    case LOCATION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case LOCATION_ACTIONS.SET_TRACKING:
      return {
        ...state,
        isTracking: action.payload
      };
    
    case LOCATION_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case LOCATION_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload
      };
    
    case LOCATION_ACTIONS.SET_GEOFENCE_STATUS:
      return {
        ...state,
        geofenceStatus: action.payload
      };
    
    case LOCATION_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const LocationContext = createContext();

// Context provider component
export const LocationProvider = ({ children, config = {} }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  
  // Default configuration
  const defaultConfig = {
    autoStart: false,
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
    trackingInterval: 30000,
    logLocation: true,
    logInterval: 60000
  };
  
  const mergedConfig = { ...defaultConfig, ...config };

  /**
   * Location update callback
   */
  const handleLocationUpdate = useCallback((locationData, errorData) => {
    if (errorData) {
      dispatch({ type: LOCATION_ACTIONS.SET_ERROR, payload: errorData });
    } else {
      dispatch({ type: LOCATION_ACTIONS.SET_LOCATION, payload: locationData });
      
      // Log location if enabled
      if (mergedConfig.logLocation && locationData) {
        // This would typically be called with actual employee/project IDs
        // For now, we'll just log the location data
        console.log('Location updated:', locationData);
      }
    }
  }, [mergedConfig.logLocation]);

  /**
   * Start location tracking
   */
  const startTracking = useCallback(async () => {
    try {
      dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: LOCATION_ACTIONS.CLEAR_ERROR });

      // Check permissions
      const permissionStatus = await locationService.requestPermissions();
      dispatch({ type: LOCATION_ACTIONS.SET_PERMISSIONS, payload: permissionStatus });

      if (permissionStatus.state === 'denied') {
        throw new Error('Location permission denied');
      }

      // Start tracking
      locationService.startTracking(handleLocationUpdate, mergedConfig);
      dispatch({ type: LOCATION_ACTIONS.SET_TRACKING, payload: true });
      
    } catch (error) {
      dispatch({ 
        type: LOCATION_ACTIONS.SET_ERROR, 
        payload: {
          code: 'START_TRACKING_ERROR',
          message: error.message,
          originalMessage: error.message
        }
      });
    } finally {
      dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: false });
    }
  }, [handleLocationUpdate, mergedConfig]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    dispatch({ type: LOCATION_ACTIONS.SET_TRACKING, payload: false });
    dispatch({ type: LOCATION_ACTIONS.SET_LOCATION, payload: null });
    dispatch({ type: LOCATION_ACTIONS.CLEAR_ERROR });
  }, []);

  /**
   * Get current location once
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: LOCATION_ACTIONS.CLEAR_ERROR });
      
      const locationData = await locationService.getCurrentLocation();
      dispatch({ type: LOCATION_ACTIONS.SET_LOCATION, payload: locationData });
      
      return locationData;
    } catch (error) {
      dispatch({ type: LOCATION_ACTIONS.SET_ERROR, payload: error });
      throw error;
    } finally {
      dispatch({ type: LOCATION_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  /**
   * Validate geofence
   */
  const validateGeofence = useCallback((geofence) => {
    const result = locationService.validateGeofence(geofence);
    dispatch({ type: LOCATION_ACTIONS.SET_GEOFENCE_STATUS, payload: result });
    return result;
  }, []);

  /**
   * Calculate distance between two points
   */
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    return locationService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  /**
   * Log location for task
   */
  const logTaskLocation = useCallback(async (assignmentId, action = 'location_update') => {
    if (!state.location) {
      throw new Error('No location data available');
    }
    
    return await locationLogger.logTaskLocation(state.location, assignmentId, action);
  }, [state.location]);

  /**
   * Log general location
   */
  const logGeneralLocation = useCallback(async (employeeId, projectId) => {
    if (!state.location) {
      throw new Error('No location data available');
    }
    
    return await locationLogger.logGeneralLocation(state.location, employeeId, projectId);
  }, [state.location]);

  /**
   * Check permissions
   */
  const checkPermissions = useCallback(async () => {
    try {
      const permissionStatus = await locationService.requestPermissions();
      dispatch({ type: LOCATION_ACTIONS.SET_PERMISSIONS, payload: permissionStatus });
      return permissionStatus;
    } catch (error) {
      dispatch({ 
        type: LOCATION_ACTIONS.SET_ERROR, 
        payload: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Failed to check location permissions',
          originalMessage: error.message
        }
      });
      return { state: 'unknown', error };
    }
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (mergedConfig.autoStart) {
      startTracking();
    }

    return () => {
      if (state.isTracking) {
        stopTracking();
      }
    };
  }, [mergedConfig.autoStart, startTracking, stopTracking, state.isTracking]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Sync tracking state with service
  useEffect(() => {
    const interval = setInterval(() => {
      const status = locationService.getTrackingStatus();
      if (status.isTracking !== state.isTracking) {
        dispatch({ type: LOCATION_ACTIONS.SET_TRACKING, payload: status.isTracking });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isTracking]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Computed values
    hasLocation: !!state.location,
    isLocationAccurate: state.location && state.location.accuracy < 20,
    
    // Actions
    startTracking,
    stopTracking,
    getCurrentLocation,
    validateGeofence,
    calculateDistance,
    logTaskLocation,
    logGeneralLocation,
    checkPermissions,
    
    // Utilities
    clearError: () => dispatch({ type: LOCATION_ACTIONS.CLEAR_ERROR }),
    
    // Service status
    trackingStatus: locationService.getTrackingStatus(),
    loggerStatus: locationLogger.getQueueStatus()
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

// Custom hook to use location context
export const useLocation = () => {
  const context = useContext(LocationContext);
  
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  
  return context;
};

export default LocationContext;