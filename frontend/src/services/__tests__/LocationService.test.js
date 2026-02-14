/**
 * LocationService.test.js - Unit tests for LocationService
 * Tests GPS tracking functionality, geofence validation, and error handling
 */

import LocationService from '../LocationService';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

// Mock navigator.permissions
const mockPermissions = {
  query: jest.fn()
};

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true
});

describe('LocationService', () => {
  let locationService;

  beforeEach(() => {
    // Create a new instance for each test
    locationService = new LocationService();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockGeolocation.getCurrentPosition.mockClear();
    mockGeolocation.watchPosition.mockClear();
    mockGeolocation.clearWatch.mockClear();
    mockPermissions.query.mockClear();
  });

  afterEach(() => {
    // Stop tracking after each test
    if (locationService.isTracking) {
      locationService.stopTracking();
    }
  });

  describe('getCurrentLocation', () => {
    it('should resolve with location data on success', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await locationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: expect.any(String)
      });
    });

    it('should reject with error on failure', async () => {
      const mockError = {
        code: 1,
        message: 'Permission denied'
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(locationService.getCurrentLocation()).rejects.toEqual({
        code: 1,
        message: 'Permission denied - User denied the request for Geolocation',
        originalMessage: 'Permission denied'
      });
    });
  });

  describe('startTracking', () => {
    it('should start tracking and call watchPosition', () => {
      const mockCallback = jest.fn();
      const mockWatchId = 123;

      mockGeolocation.watchPosition.mockReturnValue(mockWatchId);

      locationService.startTracking(mockCallback);

      expect(locationService.isTracking).toBe(true);
      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        })
      );
      expect(locationService.watchId).toBe(mockWatchId);
    });

    it('should add callback to callbacks array', () => {
      const mockCallback = jest.fn();

      locationService.startTracking(mockCallback);

      expect(locationService.callbacks).toContain(mockCallback);
    });

    it('should not start tracking if already tracking', () => {
      const mockCallback = jest.fn();
      
      // Start tracking first time
      locationService.startTracking(mockCallback);
      const firstWatchId = locationService.watchId;
      
      // Try to start again
      locationService.startTracking(mockCallback);
      
      expect(locationService.watchId).toBe(firstWatchId);
      expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1);
    });

    it('should throw error if geolocation is not supported', () => {
      // Temporarily remove geolocation
      const originalGeolocation = global.navigator.geolocation;
      delete global.navigator.geolocation;

      expect(() => {
        locationService.startTracking();
      }).toThrow('Geolocation is not supported by this browser');

      // Restore geolocation
      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking and clear watch', () => {
      const mockCallback = jest.fn();
      const mockWatchId = 123;

      mockGeolocation.watchPosition.mockReturnValue(mockWatchId);
      
      locationService.startTracking(mockCallback);
      locationService.stopTracking();

      expect(locationService.isTracking).toBe(false);
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(mockWatchId);
      expect(locationService.watchId).toBe(null);
      expect(locationService.callbacks).toEqual([]);
      expect(locationService.currentLocation).toBe(null);
    });

    it('should not call clearWatch if not tracking', () => {
      locationService.stopTracking();

      expect(mockGeolocation.clearWatch).not.toHaveBeenCalled();
    });
  });

  describe('handleLocationUpdate', () => {
    it('should format and store location data', () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: 100,
          altitudeAccuracy: 5,
          heading: 90,
          speed: 5
        },
        timestamp: Date.now()
      };

      locationService.handleLocationUpdate(mockPosition);

      expect(locationService.currentLocation).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: 100,
        altitudeAccuracy: 5,
        heading: 90,
        speed: 5,
        timestamp: expect.any(String)
      });
    });

    it('should notify callbacks with location data', () => {
      const mockCallback = jest.fn();
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5 // High accuracy for immediate notification
        },
        timestamp: Date.now()
      };

      locationService.addCallback(mockCallback);
      locationService.handleLocationUpdate(mockPosition);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5
        }),
        null
      );
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // Distance between New York and Los Angeles (approximately 3944 km)
      const distance = locationService.calculateDistance(
        40.7128, -74.0060, // New York
        34.0522, -118.2437  // Los Angeles
      );

      // Allow for some variance in calculation
      expect(distance).toBeGreaterThan(3900000); // 3900 km
      expect(distance).toBeLessThan(4000000);    // 4000 km
    });

    it('should return 0 for same coordinates', () => {
      const distance = locationService.calculateDistance(
        40.7128, -74.0060,
        40.7128, -74.0060
      );

      expect(distance).toBe(0);
    });
  });

  describe('validateGeofence', () => {
    beforeEach(() => {
      // Set up current location
      locationService.currentLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: new Date().toISOString()
      };
    });

    it('should validate location inside geofence', () => {
      const geofence = {
        center: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        radius: 100
      };

      const result = locationService.validateGeofence(geofence);

      expect(result).toEqual({
        isValid: true,
        insideGeofence: true,
        distance: 0,
        accuracy: 10,
        timestamp: expect.any(String)
      });
    });

    it('should validate location outside geofence', () => {
      const geofence = {
        center: {
          latitude: 40.7200, // Different location
          longitude: -74.0060
        },
        radius: 100
      };

      const result = locationService.validateGeofence(geofence);

      expect(result).toEqual({
        isValid: true,
        insideGeofence: false,
        distance: expect.any(Number),
        accuracy: 10,
        timestamp: expect.any(String)
      });
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should return error for missing location', () => {
      locationService.currentLocation = null;
      
      const geofence = {
        center: { latitude: 40.7128, longitude: -74.0060 },
        radius: 100
      };

      const result = locationService.validateGeofence(geofence);

      expect(result).toEqual({
        isValid: false,
        error: 'Missing location or geofence data',
        distance: null
      });
    });

    it('should return error for missing geofence', () => {
      const result = locationService.validateGeofence(null);

      expect(result).toEqual({
        isValid: false,
        error: 'Missing location or geofence data',
        distance: null
      });
    });
  });

  describe('requestPermissions', () => {
    it('should return permission status when permissions API is available', async () => {
      const mockPermission = { state: 'granted' };
      mockPermissions.query.mockResolvedValue(mockPermission);

      const result = await locationService.requestPermissions();

      expect(result).toEqual(mockPermission);
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should fallback to getCurrentLocation when permissions API is not available', async () => {
      // Remove permissions API
      delete global.navigator.permissions;

      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await locationService.requestPermissions();

      expect(result).toEqual({ state: 'granted' });

      // Restore permissions API
      global.navigator.permissions = mockPermissions;
    });

    it('should return denied status on location error', async () => {
      // Remove permissions API
      delete global.navigator.permissions;

      const mockError = {
        code: 1,
        message: 'Permission denied'
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await locationService.requestPermissions();

      expect(result.state).toBe('denied');
      expect(result.error).toBeDefined();

      // Restore permissions API
      global.navigator.permissions = mockPermissions;
    });
  });

  describe('callback management', () => {
    it('should add callback', () => {
      const mockCallback = jest.fn();

      locationService.addCallback(mockCallback);

      expect(locationService.callbacks).toContain(mockCallback);
    });

    it('should not add duplicate callback', () => {
      const mockCallback = jest.fn();

      locationService.addCallback(mockCallback);
      locationService.addCallback(mockCallback);

      expect(locationService.callbacks.filter(cb => cb === mockCallback)).toHaveLength(1);
    });

    it('should remove callback', () => {
      const mockCallback = jest.fn();

      locationService.addCallback(mockCallback);
      locationService.removeCallback(mockCallback);

      expect(locationService.callbacks).not.toContain(mockCallback);
    });
  });

  describe('getTrackingStatus', () => {
    it('should return current tracking status', () => {
      const status = locationService.getTrackingStatus();

      expect(status).toEqual({
        isTracking: false,
        hasLocation: false,
        lastUpdate: null,
        callbackCount: 0,
        currentLocation: null
      });
    });

    it('should return updated status when tracking', () => {
      const mockCallback = jest.fn();
      locationService.startTracking(mockCallback);
      
      const status = locationService.getTrackingStatus();

      expect(status.isTracking).toBe(true);
      expect(status.callbackCount).toBe(1);
    });
  });
});