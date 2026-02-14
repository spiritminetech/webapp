import workerMobileApiService from '../WorkerMobileApiService.js';
import workerTaskService from '../WorkerTaskService.js';
import offlineService from '../OfflineService.js';
import geofenceService from '../GeofenceService.js';

// Mock the dependencies
jest.mock('../WorkerTaskService.js');
jest.mock('../OfflineService.js');
jest.mock('../GeofenceService.js');

describe('WorkerMobileApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodaysTasks', () => {
    it('should fetch tasks from server when online', async () => {
      const mockTaskData = {
        success: true,
        data: {
          project: { id: 1, name: 'Test Project' },
          tasks: [{ id: 1, name: 'Test Task' }]
        }
      };

      offlineService.isOffline.mockReturnValue(false);
      workerTaskService.getTodaysTasks.mockResolvedValue(mockTaskData);
      offlineService.cacheTaskData.mockImplementation(() => {});

      const result = await workerMobileApiService.getTodaysTasks();

      expect(workerTaskService.getTodaysTasks).toHaveBeenCalled();
      expect(offlineService.cacheTaskData).toHaveBeenCalledWith(mockTaskData);
      expect(result).toEqual(mockTaskData);
    });

    it('should return cached data when offline', async () => {
      const mockCachedData = {
        success: true,
        data: {
          project: { id: 1, name: 'Cached Project' },
          tasks: [{ id: 1, name: 'Cached Task' }]
        }
      };

      offlineService.isOffline.mockReturnValue(true);
      offlineService.getCachedTaskData.mockReturnValue(mockCachedData);

      const result = await workerMobileApiService.getTodaysTasks();

      expect(workerTaskService.getTodaysTasks).not.toHaveBeenCalled();
      expect(result._cached).toBe(true);
      expect(result.data).toEqual(mockCachedData.data);
    });

    it('should throw error when no cached data available offline', async () => {
      offlineService.isOffline.mockReturnValue(true);
      offlineService.getCachedTaskData.mockReturnValue(null);

      await expect(workerMobileApiService.getTodaysTasks()).rejects.toThrow('No task data available offline');
    });
  });

  describe('startTask', () => {
    const mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: '2024-01-27T10:00:00Z'
    };

    const mockGeofenceResult = {
      data: {
        insideGeofence: true,
        canStartTasks: true,
        message: 'Within geofence'
      }
    };

    it('should start task when online and within geofence', async () => {
      const mockStartResult = {
        success: true,
        data: { assignmentId: 1, status: 'in_progress' }
      };

      geofenceService.getCurrentLocation.mockResolvedValue(mockLocation);
      geofenceService.validateLocation.mockResolvedValue(mockGeofenceResult);
      offlineService.isOffline.mockReturnValue(false);
      workerTaskService.startTask.mockResolvedValue(mockStartResult);

      const result = await workerMobileApiService.startTask(1);

      expect(geofenceService.validateLocation).toHaveBeenCalledWith(
        mockLocation.latitude,
        mockLocation.longitude
      );
      expect(workerTaskService.startTask).toHaveBeenCalledWith(1, mockLocation);
      expect(result).toEqual(mockStartResult);
    });

    it('should queue task start when offline', async () => {
      geofenceService.getCurrentLocation.mockResolvedValue(mockLocation);
      geofenceService.validateLocation.mockResolvedValue(mockGeofenceResult);
      offlineService.isOffline.mockReturnValue(true);
      offlineService.queueOperation.mockImplementation(() => {});

      const result = await workerMobileApiService.startTask(1);

      expect(offlineService.queueOperation).toHaveBeenCalledWith({
        type: 'startTask',
        data: { assignmentId: 1, location: mockLocation }
      });
      expect(result.data.status).toBe('queued_for_sync');
    });

    it('should throw error when outside geofence', async () => {
      const mockGeofenceResultOutside = {
        data: {
          insideGeofence: false,
          canStartTasks: false,
          message: 'Outside geofence area'
        }
      };

      geofenceService.getCurrentLocation.mockResolvedValue(mockLocation);
      geofenceService.validateLocation.mockResolvedValue(mockGeofenceResultOutside);

      await expect(workerMobileApiService.startTask(1)).rejects.toThrow('Cannot start task: Outside geofence area');
    });
  });

  describe('submitProgress', () => {
    const mockProgressData = {
      assignmentId: 1,
      progressPercent: 75,
      description: 'Progress update'
    };

    it('should submit progress when online', async () => {
      const mockResult = {
        success: true,
        data: { progressId: 1, status: 'SUBMITTED' }
      };

      offlineService.isOffline.mockReturnValue(false);
      workerTaskService.submitProgress.mockResolvedValue(mockResult);

      const result = await workerMobileApiService.submitProgress(mockProgressData);

      expect(workerTaskService.submitProgress).toHaveBeenCalledWith(mockProgressData);
      expect(result).toEqual(mockResult);
    });

    it('should queue progress when offline', async () => {
      offlineService.isOffline.mockReturnValue(true);
      offlineService.queueOperation.mockImplementation(() => {});

      const result = await workerMobileApiService.submitProgress(mockProgressData);

      expect(offlineService.queueOperation).toHaveBeenCalledWith({
        type: 'submitProgress',
        data: mockProgressData
      });
      expect(result.data.status).toBe('queued_for_sync');
    });
  });

  describe('getOfflineStatus', () => {
    it('should return comprehensive offline status', () => {
      const mockCacheStatus = { hasCachedData: true, queuedOperations: 2 };
      const mockLocationStatus = { hasCurrentLocation: true, isWatching: false };

      offlineService.isOffline.mockReturnValue(false);
      offlineService.getQueuedOperationsCount.mockReturnValue(2);
      offlineService.getCacheStatus.mockReturnValue(mockCacheStatus);
      geofenceService.getLocationStatus.mockReturnValue(mockLocationStatus);

      const status = workerMobileApiService.getOfflineStatus();

      expect(status).toEqual({
        isOffline: false,
        queuedOperations: 2,
        cacheStatus: mockCacheStatus,
        locationStatus: mockLocationStatus
      });
    });
  });
});