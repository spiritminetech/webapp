/**
 * useLocationTracking.test.js - Unit tests for useLocationTracking hook
 * Tests React hook functionality for GPS location tracking
 */

import { renderHook, act } from '@testing-library/react';
import useLocationTracking from '../useLocationTracking';
import locationService from '../../services/LocationService';

// Mock the LocationService
jest.mock('../../services/LocationService', () => ({
  startTracking: jest.fn(),
  stopTracking: jest.fn(),
  getCurrentLocation: jest.fn(),
  validateGeofence: jest.fn(),
  calculateDistance: jest.fn(),
  requestPermissions: jest.fn(),
  getTrackingStatus: jest.fn()
}));

describe('useLocationTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    locationService.getTrackingStatus.mockReturnValue({
      isTracking: false,
      hasLocation: false,
      lastUpdate: null,
      callbackCount: 0,
      currentLocation: null
    });
    
    locationService.requestPermissions.mockResolvedValue({ state: 'granted' });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLocationTracking());

    expect(result.current.location).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isTracking).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasLocation).toBe(false);
  });

  it('should start tracking when startTracking is called', async () => {
    const { result } = renderHook(() => useLocationTracking());

    await act(async () => {
      await result.current.startTracking();
    });

    expect(locationService.requestPermissions).toHaveBeenCalled();
    expect(locationService.startTracking).toHaveBeenCalled();
    expect(result.current.isTracking).toBe(true);
  });

  it('should handle permission denied error', async () => {
    locationService.requestPermissions.mockResolvedValue({ state: 'denied' });

    const { result } = renderHook(() => useLocationTracking());

    await act(async () => {
      await result.current.startTracking();
    });

    expect(result.current.error).toEqual({
      code: 'PERMISSION_ERROR',
      message: 'Location permission denied',
      originalMessage: 'Location permission denied'
    });
    expect(result.current.isTracking).toBe(false);
  });

  it('should stop tracking when stopTracking is called', () => {
    const { result } = renderHook(() => useLocationTracking());

    act(() => {
      result.current.stopTracking();
    });

    expect(locationService.stopTracking).toHaveBeenCalled();
    expect(result.current.isTracking).toBe(false);
    expect(result.current.location).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should get current location when getCurrentLocation is called', async () => {
    const mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: new Date().toISOString()
    };

    locationService.getCurrentLocation.mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useLocationTracking());

    let returnedLocation;
    await act(async () => {
      returnedLocation = await result.current.getCurrentLocation();
    });

    expect(locationService.getCurrentLocation).toHaveBeenCalled();
    expect(result.current.location).toEqual(mockLocation);
    expect(returnedLocation).toEqual(mockLocation);
    expect(result.current.hasLocation).toBe(true);
  });

  it('should handle getCurrentLocation error', async () => {
    const mockError = {
      code: 'TIMEOUT',
      message: 'Location request timed out'
    };

    locationService.getCurrentLocation.mockRejectedValue(mockError);

    const { result } = renderHook(() => useLocationTracking());

    await act(async () => {
      try {
        await result.current.getCurrentLocation();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should validate geofence when validateGeofence is called', () => {
    const mockGeofence = {
      center: { latitude: 40.7128, longitude: -74.0060 },
      radius: 100
    };

    const mockResult = {
      isValid: true,
      insideGeofence: true,
      distance: 25
    };

    locationService.validateGeofence.mockReturnValue(mockResult);

    const { result } = renderHook(() => useLocationTracking());

    let validationResult;
    act(() => {
      validationResult = result.current.validateGeofence(mockGeofence);
    });

    expect(locationService.validateGeofence).toHaveBeenCalledWith(mockGeofence);
    expect(validationResult).toEqual(mockResult);
  });

  it('should calculate distance when calculateDistance is called', () => {
    const mockDistance = 1000;
    locationService.calculateDistance.mockReturnValue(mockDistance);

    const { result } = renderHook(() => useLocationTracking());

    let distance;
    act(() => {
      distance = result.current.calculateDistance(40.7128, -74.0060, 40.7200, -74.0060);
    });

    expect(locationService.calculateDistance).toHaveBeenCalledWith(40.7128, -74.0060, 40.7200, -74.0060);
    expect(distance).toBe(mockDistance);
  });

  it('should check permissions when checkPermissions is called', async () => {
    const mockPermissions = { state: 'granted' };
    locationService.requestPermissions.mockResolvedValue(mockPermissions);

    const { result } = renderHook(() => useLocationTracking());

    let permissions;
    await act(async () => {
      permissions = await result.current.checkPermissions();
    });

    expect(locationService.requestPermissions).toHaveBeenCalled();
    expect(result.current.permissions).toEqual(mockPermissions);
    expect(permissions).toEqual(mockPermissions);
  });

  it('should handle permission check error', async () => {
    const mockError = new Error('Permission check failed');
    locationService.requestPermissions.mockRejectedValue(mockError);

    const { result } = renderHook(() => useLocationTracking());

    await act(async () => {
      await result.current.checkPermissions();
    });

    expect(result.current.error).toEqual({
      code: 'PERMISSION_CHECK_ERROR',
      message: 'Failed to check location permissions',
      originalMessage: 'Permission check failed'
    });
  });

  it('should auto-start tracking when autoStart is true', async () => {
    const { result } = renderHook(() => useLocationTracking({ autoStart: true }));

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(locationService.requestPermissions).toHaveBeenCalled();
    expect(locationService.startTracking).toHaveBeenCalled();
  });

  it('should compute isLocationAccurate correctly', () => {
    const { result, rerender } = renderHook(() => useLocationTracking());

    // No location - should be false
    expect(result.current.isLocationAccurate).toBe(false);

    // Mock location update with high accuracy
    act(() => {
      result.current.location = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 15, // Less than 20m - high accuracy
        timestamp: new Date().toISOString()
      };
    });

    rerender();
    expect(result.current.isLocationAccurate).toBe(true);

    // Mock location update with low accuracy
    act(() => {
      result.current.location = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 25, // More than 20m - low accuracy
        timestamp: new Date().toISOString()
      };
    });

    rerender();
    expect(result.current.isLocationAccurate).toBe(false);
  });

  it('should sync tracking state with service', async () => {
    locationService.getTrackingStatus.mockReturnValue({
      isTracking: true,
      hasLocation: true,
      lastUpdate: Date.now(),
      callbackCount: 1,
      currentLocation: { latitude: 40.7128, longitude: -74.0060 }
    });

    const { result } = renderHook(() => useLocationTracking());

    // Wait for the sync interval to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    expect(result.current.isTracking).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useLocationTracking());

    // Start tracking first
    act(() => {
      result.current.startTracking();
    });

    // Unmount the hook
    unmount();

    expect(locationService.stopTracking).toHaveBeenCalled();
  });

  it('should handle location update callback', () => {
    const { result } = renderHook(() => useLocationTracking());

    const mockLocationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: new Date().toISOString()
    };

    // Simulate location update callback
    act(() => {
      // This would normally be called by the LocationService
      result.current.handleLocationUpdate?.(mockLocationData, null);
    });

    expect(result.current.location).toEqual(mockLocationData);
    expect(result.current.error).toBe(null);
  });

  it('should handle location error callback', () => {
    const { result } = renderHook(() => useLocationTracking());

    const mockError = {
      code: 'TIMEOUT',
      message: 'Location request timed out'
    };

    // Simulate error callback
    act(() => {
      // This would normally be called by the LocationService
      result.current.handleLocationUpdate?.(null, mockError);
    });

    expect(result.current.location).toBe(null);
    expect(result.current.error).toEqual(mockError);
  });
});