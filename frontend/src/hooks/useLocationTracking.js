/**
 * useLocationTracking - React hook for real-time GPS location tracking
 * Provides easy integration with React components for location tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../services/LocationService';

const useLocationTracking = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState(null);
  
  // Use ref to maintain callback reference
  const callbackRef = useRef(null);

  // Default options
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
    autoStart: false,
    trackingInterval: 30000
  };

  const mergedOptions = { ...defaultOptions, ...options };

  /**
   * Location update callback
   */
  const handleLocationUpdate = useCallback((locationData, errorData) => {
    if (errorData) {
      setError(errorData);
      setLocation(null);
    } else {
      setLocation(locationData);
      setError(null);
    }
    setIsLoading(false);
  }, []);

  // Update callback ref when handler changes
  useEffect(() => {
    callbackRef.current = handleLocationUpdate;
  }, [handleLocationUpdate]);

  /**
   * Start location tracking
   */
  const startTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check permissions first
      const permissionStatus = await locationService.requestPermissions();
      setPermissions(permissionStatus);

      if (permissionStatus.state === 'denied') {
        throw new Error('Location permission denied');
      }

      // Start tracking with callback
      locationService.startTracking(callbackRef.current, mergedOptions);
      setIsTracking(true);
      
    } catch (err) {
      setError({
        code: 'PERMISSION_ERROR',
        message: err.message,
        originalMessage: err.message
      });
      setIsLoading(false);
    }
  }, [mergedOptions]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
    setLocation(null);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Get current location once
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const locationData = await locationService.getCurrentLocation();
      setLocation(locationData);
      return locationData;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Validate current location against geofence
   */
  const validateGeofence = useCallback((geofence) => {
    return locationService.validateGeofence(geofence);
  }, []);

  /**
   * Calculate distance between two points
   */
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    return locationService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  /**
   * Check location permissions
   */
  const checkPermissions = useCallback(async () => {
    try {
      const permissionStatus = await locationService.requestPermissions();
      setPermissions(permissionStatus);
      return permissionStatus;
    } catch (err) {
      setError({
        code: 'PERMISSION_CHECK_ERROR',
        message: 'Failed to check location permissions',
        originalMessage: err.message
      });
      return { state: 'unknown', error: err };
    }
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (mergedOptions.autoStart) {
      startTracking();
    }

    // Cleanup on unmount
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [mergedOptions.autoStart, startTracking, stopTracking, isTracking]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Sync tracking state with service
  useEffect(() => {
    const interval = setInterval(() => {
      const status = locationService.getTrackingStatus();
      if (status.isTracking !== isTracking) {
        setIsTracking(status.isTracking);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking]);

  return {
    // State
    location,
    error,
    isTracking,
    isLoading,
    permissions,
    
    // Actions
    startTracking,
    stopTracking,
    getCurrentLocation,
    validateGeofence,
    calculateDistance,
    checkPermissions,
    
    // Computed values
    hasLocation: !!location,
    isLocationAccurate: location && location.accuracy < 20,
    lastUpdate: location?.timestamp,
    
    // Service status
    trackingStatus: locationService.getTrackingStatus()
  };
};

export default useLocationTracking;