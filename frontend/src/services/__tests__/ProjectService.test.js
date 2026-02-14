import projectService from '../ProjectService.js';
import appConfig from '../../config/app.config.js';

// Mock dependencies
jest.mock('../../config/app.config.js', () => ({
  api: {
    baseURL: 'http://localhost:5001',
    endpoints: {
      projects: '/api/projects',
      supervisors: '/api/supervisor'
    }
  },
  log: jest.fn(),
  error: jest.fn()
}));

// Mock apiClient
jest.mock('../../api/axios.js', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
  close: jest.fn()
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('ProjectService', () => {
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset service state
    projectService.subscribers.clear();
    projectService.cache.clear();
    projectService.isOnline = true;
    projectService.websocket = null;
    projectService.pollingInterval = null;
    
    // Get the mocked client
    const { apiClient } = require('../../api/axios.js');
    mockClient = apiClient;
    mockClient.get.mockClear();
  });

  afterEach(() => {
    // Clean up service state
    projectService.subscribers.clear();
    projectService.cache.clear();
    if (projectService.pollingInterval) {
      clearInterval(projectService.pollingInterval);
      projectService.pollingInterval = null;
    }
    projectService.websocket = null;
  });

  describe('getAssignedProjects', () => {
    const supervisorId = 'supervisor-123';
    const mockProjectsResponse = {
      data: [
        {
          _id: 'project-1',
          name: 'Project Alpha',
          location: {
            address: '123 Main St',
            coordinates: [1.3521, 103.8198]
          },
          status: 'active',
          workerCount: 5,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        {
          _id: 'project-2',
          name: 'Project Beta',
          location: {
            address: '456 Oak Ave',
            coordinates: [1.3000, 103.8000]
          },
          status: 'paused',
          assignedWorkers: [1, 2, 3],
          updatedAt: '2024-01-14T15:30:00Z'
        }
      ]
    };

    test('should fetch and transform assigned projects successfully', async () => {
      mockClient.get.mockResolvedValue(mockProjectsResponse);

      const result = await projectService.getAssignedProjects(supervisorId);

      expect(mockClient.get).toHaveBeenCalledWith('/api/supervisor/supervisor-123/projects');
      expect(result).toHaveLength(2);
      
      // Verify transformation
      expect(result[0]).toEqual({
        projectId: 'project-1',
        projectName: 'Project Alpha',
        siteLocation: {
          address: '123 Main St',
          coordinates: [1.3521, 103.8198]
        },
        status: 'active',
        workerCount: 5,
        lastUpdated: new Date('2024-01-15T10:00:00Z')
      });

      expect(result[1]).toEqual({
        projectId: 'project-2',
        projectName: 'Project Beta',
        siteLocation: {
          address: '456 Oak Ave',
          coordinates: [1.3000, 103.8000]
        },
        status: 'paused',
        workerCount: 3,
        lastUpdated: new Date('2024-01-14T15:30:00Z')
      });
    });

    test('should return cached data when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      projectService.isOnline = false;
      
      // Set cached data
      const cachedData = [{ projectId: 'cached-project', projectName: 'Cached Project' }];
      projectService.cache.set(`assigned_projects_${supervisorId}`, cachedData);

      const result = await projectService.getAssignedProjects(supervisorId);

      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
      expect(appConfig.log).toHaveBeenCalledWith('Returning cached assigned projects (offline mode)');
    });

    test('should return cached data on API error', async () => {
      const cachedData = [{ projectId: 'cached-project', projectName: 'Cached Project' }];
      projectService.cache.set(`assigned_projects_${supervisorId}`, cachedData);
      
      mockClient.get.mockRejectedValue(new Error('Network error'));

      const result = await projectService.getAssignedProjects(supervisorId);

      expect(result).toEqual(cachedData);
      expect(appConfig.log).toHaveBeenCalledWith('Returning cached assigned projects due to error');
    });

    test('should throw error when no cached data available', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      await expect(projectService.getAssignedProjects(supervisorId))
        .rejects.toThrow('Network error');
    });
  });

  describe('subscribeToProjectUpdates', () => {
    const supervisorId = 'supervisor-123';
    const mockCallback = jest.fn();

    test('should subscribe to project updates successfully', () => {
      const unsubscribe = projectService.subscribeToProjectUpdates(supervisorId, mockCallback);

      expect(typeof unsubscribe).toBe('function');
      expect(projectService.subscribers.size).toBe(1);
      expect(appConfig.log).toHaveBeenCalledWith(`Subscribed to project updates for supervisor: ${supervisorId}`);
    });

    test('should throw error for invalid parameters', () => {
      expect(() => {
        projectService.subscribeToProjectUpdates(null, mockCallback);
      }).toThrow('supervisorId and callback are required for project updates subscription');

      expect(() => {
        projectService.subscribeToProjectUpdates(supervisorId, null);
      }).toThrow('supervisorId and callback are required for project updates subscription');
    });

    test('should unsubscribe successfully', () => {
      const unsubscribe = projectService.subscribeToProjectUpdates(supervisorId, mockCallback);
      
      expect(projectService.subscribers.size).toBe(1);
      
      unsubscribe();
      
      expect(projectService.subscribers.size).toBe(0);
    });

    test('should start polling when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      projectService.isOnline = false;
      
      jest.spyOn(projectService, 'startPolling');
      
      projectService.subscribeToProjectUpdates(supervisorId, mockCallback);
      
      expect(projectService.startPolling).toHaveBeenCalledWith(supervisorId);
    });
  });

  describe('WebSocket handling', () => {
    test('should handle WebSocket messages correctly', () => {
      const mockData = {
        type: 'PROJECT_STATUS_CHANGED',
        payload: { supervisorId: 'supervisor-123', projectId: 'project-1' }
      };

      jest.spyOn(projectService, 'notifySubscribers');
      jest.spyOn(projectService, 'invalidateCache');

      projectService.handleWebSocketMessage(mockData);

      expect(projectService.notifySubscribers).toHaveBeenCalledWith(mockData);
      expect(projectService.invalidateCache).toHaveBeenCalledWith('supervisor-123');
    });

    test('should handle unknown WebSocket message types', () => {
      const mockData = {
        type: 'UNKNOWN_TYPE',
        payload: {}
      };

      projectService.handleWebSocketMessage(mockData);

      expect(appConfig.log).toHaveBeenCalledWith('Unknown WebSocket message type:', 'UNKNOWN_TYPE');
    });
  });

  describe('polling mechanism', () => {
    const supervisorId = 'supervisor-123';

    test('should start polling correctly', () => {
      jest.useFakeTimers();
      jest.spyOn(projectService, 'getAssignedProjects').mockResolvedValue([]);
      jest.spyOn(projectService, 'notifySubscribers');

      projectService.startPolling(supervisorId);

      expect(projectService.pollingInterval).toBeDefined();
      expect(appConfig.log).toHaveBeenCalledWith('Starting polling for project updates');

      jest.advanceTimersByTime(30000);

      expect(projectService.getAssignedProjects).toHaveBeenCalledWith(supervisorId);

      jest.useRealTimers();
    });

    test('should stop polling correctly', () => {
      jest.useFakeTimers();
      
      projectService.startPolling(supervisorId);
      expect(projectService.pollingInterval).toBeDefined();

      projectService.stopPolling();
      expect(projectService.pollingInterval).toBeNull();
      expect(appConfig.log).toHaveBeenCalledWith('Stopped polling for project updates');

      jest.useRealTimers();
    });
  });
});