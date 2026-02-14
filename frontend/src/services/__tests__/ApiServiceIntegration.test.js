import { 
  workerTaskService, 
  photoService, 
  offlineService, 
  geofenceService,
  workerMobileApiService 
} from '../index.js';

describe('API Service Integration', () => {
  describe('Service Exports', () => {
    it('should export all worker mobile services', () => {
      expect(workerTaskService).toBeDefined();
      expect(photoService).toBeDefined();
      expect(offlineService).toBeDefined();
      expect(geofenceService).toBeDefined();
      expect(workerMobileApiService).toBeDefined();
    });

    it('should have correct service methods', () => {
      // WorkerTaskService methods
      expect(typeof workerTaskService.getTodaysTasks).toBe('function');
      expect(typeof workerTaskService.startTask).toBe('function');
      expect(typeof workerTaskService.submitProgress).toBe('function');
      expect(typeof workerTaskService.uploadPhotos).toBe('function');
      expect(typeof workerTaskService.validateGeofence).toBe('function');
      expect(typeof workerTaskService.reportIssue).toBe('function');

      // PhotoService methods
      expect(typeof photoService.compressPhoto).toBe('function');
      expect(typeof photoService.validatePhotos).toBe('function');
      expect(typeof photoService.uploadTaskPhotos).toBe('function');

      // OfflineService methods
      expect(typeof offlineService.isOffline).toBe('function');
      expect(typeof offlineService.cacheTaskData).toBe('function');
      expect(typeof offlineService.getCachedTaskData).toBe('function');
      expect(typeof offlineService.queueOperation).toBe('function');
      expect(typeof offlineService.syncQueuedOperations).toBe('function');

      // GeofenceService methods
      expect(typeof geofenceService.getCurrentLocation).toBe('function');
      expect(typeof geofenceService.validateCurrentLocation).toBe('function');
      expect(typeof geofenceService.calculateDistance).toBe('function');

      // WorkerMobileApiService methods
      expect(typeof workerMobileApiService.getTodaysTasks).toBe('function');
      expect(typeof workerMobileApiService.startTask).toBe('function');
      expect(typeof workerMobileApiService.submitProgress).toBe('function');
      expect(typeof workerMobileApiService.uploadTaskPhotos).toBe('function');
      expect(typeof workerMobileApiService.getOfflineStatus).toBe('function');
    });
  });

  describe('Service Configuration', () => {
    it('should have correct service configurations', () => {
      // Check PhotoService configuration
      expect(photoService.maxFileSize).toBe(5 * 1024 * 1024); // 5MB
      expect(photoService.maxPhotosPerTask).toBe(5);
      expect(photoService.compressionQuality).toBe(0.8);

      // Check GeofenceService configuration
      expect(geofenceService.minAccuracy).toBe(50);
      expect(geofenceService.updateInterval).toBe(30000);

      // Check WorkerMobileApiService configuration
      expect(workerMobileApiService.retryAttempts).toBe(3);
      expect(workerMobileApiService.retryDelay).toBe(1000);
      expect(workerMobileApiService.requestTimeout).toBe(30000);
    });
  });

  describe('Photo Validation', () => {
    it('should validate photo files correctly', () => {
      // Test with no files
      const noFilesResult = photoService.validatePhotos([]);
      expect(noFilesResult.valid).toBe(false);
      expect(noFilesResult.errors).toContain('No photos selected');

      // Test with too many files
      const tooManyFiles = new Array(6).fill(null).map(() => ({
        type: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      }));
      const tooManyResult = photoService.validatePhotos(tooManyFiles);
      expect(tooManyResult.valid).toBe(false);
      expect(tooManyResult.errors.some(error => error.includes('Maximum 5 photos'))).toBe(true);

      // Test with invalid file type
      const invalidTypeFiles = [{
        type: 'text/plain',
        size: 1024 * 1024
      }];
      const invalidTypeResult = photoService.validatePhotos(invalidTypeFiles);
      expect(invalidTypeResult.valid).toBe(false);
      expect(invalidTypeResult.errors.some(error => error.includes('Must be an image file'))).toBe(true);

      // Test with file too large
      const largeSizeFiles = [{
        type: 'image/jpeg',
        size: 10 * 1024 * 1024 // 10MB
      }];
      const largeSizeResult = photoService.validatePhotos(largeSizeFiles);
      expect(largeSizeResult.valid).toBe(false);
      expect(largeSizeResult.errors.some(error => error.includes('exceeds maximum'))).toBe(true);

      // Test with valid files
      const validFiles = [{
        type: 'image/jpeg',
        size: 2 * 1024 * 1024 // 2MB
      }];
      const validResult = photoService.validatePhotos(validFiles);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate distance correctly using Haversine formula', () => {
      // Test with known coordinates (New York to Los Angeles approximately 3944 km)
      const nyLat = 40.7128;
      const nyLng = -74.0060;
      const laLat = 34.0522;
      const laLng = -118.2437;

      const distance = geofenceService.calculateDistance(nyLat, nyLng, laLat, laLng);
      
      // Should be approximately 3944 km (3,944,000 meters)
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = geofenceService.calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });
  });

  describe('Geofence Validation', () => {
    it('should validate location within geofence correctly', () => {
      const userLocation = { latitude: 40.7128, longitude: -74.0060 };
      const geofence = {
        center: { latitude: 40.7130, longitude: -74.0058 },
        radius: 100 // 100 meters
      };

      const result = geofenceService.isLocationInGeofence(userLocation, geofence);
      
      expect(result.inside).toBe(true);
      expect(result.distance).toBeLessThan(100);
    });

    it('should validate location outside geofence correctly', () => {
      const userLocation = { latitude: 40.7128, longitude: -74.0060 };
      const geofence = {
        center: { latitude: 40.7200, longitude: -74.0100 },
        radius: 50 // 50 meters
      };

      const result = geofenceService.isLocationInGeofence(userLocation, geofence);
      
      expect(result.inside).toBe(false);
      expect(result.distance).toBeGreaterThan(50);
    });
  });

  describe('Offline Service', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should cache and retrieve task data', () => {
      const mockTaskData = {
        project: { id: 1, name: 'Test Project' },
        tasks: [{ id: 1, name: 'Test Task' }]
      };

      // Cache data
      offlineService.cacheTaskData(mockTaskData);

      // Retrieve data
      const cachedData = offlineService.getCachedTaskData();
      expect(cachedData).toEqual(mockTaskData);
    });

    it('should return null for expired cache', () => {
      const mockTaskData = {
        project: { id: 1, name: 'Test Project' },
        tasks: [{ id: 1, name: 'Test Task' }]
      };

      // Manually set expired cache
      const expiredCacheData = {
        data: mockTaskData,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        version: '1.0'
      };
      localStorage.setItem('cached_tasks', JSON.stringify(expiredCacheData));

      const cachedData = offlineService.getCachedTaskData();
      expect(cachedData).toBeNull();
    });

    it('should queue operations correctly', () => {
      const operation = {
        type: 'startTask',
        data: { assignmentId: 1, location: { latitude: 40.7128, longitude: -74.0060 } }
      };

      offlineService.queueOperation(operation);
      
      const queueCount = offlineService.getQueuedOperationsCount();
      expect(queueCount).toBe(1);

      const queuedOps = offlineService.getQueuedOperationsByType('startTask');
      expect(queuedOps).toHaveLength(1);
      expect(queuedOps[0].type).toBe('startTask');
    });
  });
});