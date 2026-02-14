import geofenceIntegrationService from '../GeofenceIntegrationService.js';
import geofenceService from '../GeofenceService.js';

// Mock the geofenceService
jest.mock('../GeofenceService.js', () => ({
  requestLocationPermission: jest.fn(),
  getCurrentLocation: jest.fn(),
  isLocationInGeofence: jest.fn(),
  startLocationWatch: jest.fn(),
  stopLocationWatch: jest.fn(),
  getLocationStatus: jest.fn()
}));

// Mock appConfig
jest.mock('../../config/app.config.js', () => ({
  log: jest.fn(),
  error: jest.fn()
}));

describe('GeofenceIntegrationService', () => {
  const mockProjectGeofence = {
    center: {
      latitude: 1.3521,
      longitude: 103.8198
    },
    radius: 100
  };

  const mockLocation = {
    latitude: 1.3521,
    longitude: 103.8198,
    accuracy: 10,
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    geofenceIntegrationService.cleanup();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid geofence', async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);

      await geofenceIntegrationService.initialize(mockProjectGeofence);

      expect(geofenceService.requestLocationPermission).toHaveBeenCalled();
      expect(geofenceIntegrationService.isGeofenceDataAvailable()).toBe(true);
    });

    it('should handle initialization without geofence data', async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);

      await geofenceIntegrationService.initialize();

      expect(geofenceService.requestLocationPermission).toHaveBeenCalled();
      expect(geofenceIntegrationService.isGeofenceDataAvailable()).toBe(false);
    });

    it('should handle permission request failure', async () => {
      const error = new Error('Permission denied');
      geofenceService.requestLocationPermission.mockRejectedValue(error);

      await expect(geofenceIntegrationService.initialize(mockProjectGeofence))
        .rejects.toThrow('Geofence integration initialization failed: Permission denied');
    });
  });

  describe('validateCurrentLocation', () => {
    beforeEach(async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);
      await geofenceIntegrationService.initialize(mockProjectGeofence);
    });

    it('should validate location successfully when inside geofence', async () => {
      geofenceService.getCurrentLocation.mockResolvedValue(mockLocation);
      geofenceService.isLocationInGeofence.mockReturnValue({
        inside: true,
        distance: 50
      });

      const result = await geofenceIntegrationService.validateCurrentLocation();

      expect(result.isWithinGeofence).toBe(true);
      expect(result.distanceFromSite).toBe(50);
      expect(result.canStartTasks).toBe(true);
      expect(result.message).toBe('You are within the project site');
    });

    it('should validate location successfully when outside geofence', async () => {
      geofenceService.getCurrentLocation.mockResolvedValue(mockLocation);
      geofenceService.isLocationInGeofence.mockReturnValue({
        inside: false,
        distance: 150
      });

      const result = await geofenceIntegrationService.validateCurrentLocation();

      expect(result.isWithinGeofence).toBe(false);
      expect(result.distanceFromSite).toBe(150);
      expect(result.canStartTasks).toBe(false);
      expect(result.message).toBe('You are 150m from the project site');
    });

    it('should handle geofence data unavailable scenario', async () => {
      // Initialize without geofence data
      geofenceIntegrationService.cleanup();
      await geofenceIntegrationService.initialize();

      const result = await geofenceIntegrationService.validateCurrentLocation();

      expect(result.isWithinGeofence).toBe(false);
      expect(result.validationError).toBe('Geofence data unavailable');
      expect(result.isGeofenceUnavailable).toBe(true);
      expect(result.message).toContain('Warning: Geofence data is not available');
    });

    it('should handle location service errors', async () => {
      const error = new Error('GPS unavailable');
      geofenceService.getCurrentLocation.mockRejectedValue(error);

      const result = await geofenceIntegrationService.validateCurrentLocation();

      expect(result.isWithinGeofence).toBe(false);
      expect(result.validationError).toBe('GPS unavailable');
      expect(result.canStartTasks).toBe(false);
    });
  });

  describe('startRealTimeValidation', () => {
    beforeEach(async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);
      await geofenceIntegrationService.initialize();
    });

    it('should start real-time validation successfully', () => {
      const callback = jest.fn();
      geofenceService.startLocationWatch.mockReturnValue('watch-id');

      const subscription = geofenceIntegrationService.startRealTimeValidation(
        mockProjectGeofence,
        callback
      );

      expect(geofenceService.startLocationWatch).toHaveBeenCalled();
      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should require geofence configuration', () => {
      const callback = jest.fn();

      expect(() => {
        geofenceIntegrationService.startRealTimeValidation(null, callback);
      }).toThrow('Project geofence configuration is required');
    });

    it('should require callback function', () => {
      expect(() => {
        geofenceIntegrationService.startRealTimeValidation(mockProjectGeofence, null);
      }).toThrow('Callback function is required');
    });

    it('should handle unsubscribe correctly', () => {
      const callback = jest.fn();
      geofenceService.startLocationWatch.mockReturnValue('watch-id');

      const subscription = geofenceIntegrationService.startRealTimeValidation(
        mockProjectGeofence,
        callback
      );

      subscription.unsubscribe();

      expect(geofenceService.stopLocationWatch).toHaveBeenCalled();
    });
  });

  describe('updateProjectGeofence', () => {
    beforeEach(async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);
      await geofenceIntegrationService.initialize(mockProjectGeofence);
    });

    it('should update project geofence configuration', () => {
      const newGeofence = {
        center: { latitude: 1.3000, longitude: 103.8000 },
        radius: 200
      };

      geofenceIntegrationService.updateProjectGeofence(newGeofence);

      expect(geofenceIntegrationService.isGeofenceDataAvailable()).toBe(true);
    });
  });

  describe('getServiceStatus', () => {
    it('should return correct service status', async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);
      geofenceService.getLocationStatus.mockReturnValue({
        hasCurrentLocation: true,
        isWatching: false
      });

      await geofenceIntegrationService.initialize(mockProjectGeofence);

      const status = geofenceIntegrationService.getServiceStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.hasProjectGeofence).toBe(true);
      expect(status.isRealTimeValidationActive).toBe(false);
      expect(status.callbackCount).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources properly', async () => {
      geofenceService.requestLocationPermission.mockResolvedValue(true);
      await geofenceIntegrationService.initialize(mockProjectGeofence);

      geofenceIntegrationService.cleanup();

      const status = geofenceIntegrationService.getServiceStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.hasProjectGeofence).toBe(false);
    });
  });
});