import RealTimeManager, { UPDATE_EVENTS } from '../RealTimeManager.js';

// Mock dependencies
jest.mock('../../services/AuthService.js', () => ({
  isAuthenticated: jest.fn(),
  getToken: jest.fn(),
  refreshToken: jest.fn()
}));

jest.mock('../../config/app.config.js', () => ({
  api: {
    baseURL: 'http://localhost:5001'
  },
  getFullApiUrl: jest.fn((path) => `http://localhost:5001${path}`),
  log: jest.fn(),
  error: jest.fn()
}));

// Import mocked services after mocking
import authService from '../../services/AuthService.js';
import appConfig from '../../config/app.config.js';

// Mock WebSocket
const mockWebSocket = {
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null
};

global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSED = 3;

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock document and window events
const documentMock = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  hidden: false
};
global.document = documentMock;

const windowMock = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    protocol: 'http:'
  }
};
global.window = windowMock;

describe('RealTimeManager', () => {
  let realTimeManager;
  const supervisorId = 'test-supervisor-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockWebSocket.close.mockClear();
    mockWebSocket.send.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    documentMock.addEventListener.mockClear();
    documentMock.removeEventListener.mockClear();
    windowMock.addEventListener.mockClear();
    windowMock.removeEventListener.mockClear();
    
    // Setup auth service mocks
    authService.isAuthenticated.mockReturnValue(true);
    authService.getToken.mockReturnValue('mock-jwt-token');
    authService.refreshToken.mockResolvedValue('new-token');
    
    // Setup app config mocks
    appConfig.api = {
      baseURL: 'http://localhost:5001'
    };
    appConfig.getFullApiUrl.mockImplementation((path) => `http://localhost:5001${path}`);
  });

  afterEach(() => {
    if (realTimeManager) {
      // Manually cleanup without calling destroy to avoid test issues
      if (realTimeManager.stopWebSocket) {
        realTimeManager.stopWebSocket = jest.fn(); // Mock it to avoid the close error
      }
      if (realTimeManager.stopPolling) {
        realTimeManager.stopPolling();
      }
      if (realTimeManager.eventHandlers) {
        realTimeManager.eventHandlers.clear();
      }
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct supervisor ID', () => {
      realTimeManager = new RealTimeManager(supervisorId);
      expect(realTimeManager.supervisorId).toBe(supervisorId);
      expect(realTimeManager.connectionState).toBe('disconnected');
      expect(realTimeManager.syncQueue).toEqual([]);
    });
  });

  describe('Event Handler Registration', () => {
    beforeEach(() => {
      realTimeManager = new RealTimeManager(supervisorId);
    });

    test('should register event handlers', () => {
      const handler = jest.fn();
      realTimeManager.on(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler);
      
      expect(realTimeManager.eventHandlers.has(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED)).toBe(true);
      expect(realTimeManager.eventHandlers.get(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED)).toContain(handler);
    });

    test('should unregister event handlers', () => {
      const handler = jest.fn();
      realTimeManager.on(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler);
      realTimeManager.off(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler);
      
      const handlers = realTimeManager.eventHandlers.get(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED);
      expect(handlers).not.toContain(handler);
    });

    test('should dispatch events to registered handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const payload = { count: 10 };
      
      realTimeManager.on(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler1);
      realTimeManager.on(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler2);
      
      realTimeManager.dispatchEvent(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, payload);
      
      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });
  });

  describe('WebSocket Connection', () => {
    beforeEach(() => {
      realTimeManager = new RealTimeManager(supervisorId);
    });

    test('should create WebSocket with correct URL and token', async () => {
      await realTimeManager.initializeWebSocket();
      
      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining(`ws://localhost:5001/supervisor/${supervisorId}/updates?token=`)
      );
    });

    test('should handle WebSocket message', () => {
      const handler = jest.fn();
      realTimeManager.on(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler);
      
      const mockMessage = {
        data: JSON.stringify({
          type: UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED,
          payload: { count: 15 }
        })
      };
      
      realTimeManager.handleWebSocketMessage(mockMessage);
      
      expect(handler).toHaveBeenCalledWith({ count: 15 });
    });

    test('should ignore heartbeat pong messages', () => {
      const mockMessage = {
        data: JSON.stringify({ type: 'pong' })
      };
      
      const dispatchSpy = jest.spyOn(realTimeManager, 'dispatchEvent');
      realTimeManager.handleWebSocketMessage(mockMessage);
      
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Polling Fallback', () => {
    beforeEach(() => {
      realTimeManager = new RealTimeManager(supervisorId);
    });

    test('should start polling when WebSocket fails', () => {
      jest.useFakeTimers();
      
      realTimeManager.fallbackToPolling();
      
      expect(realTimeManager.connectionState).toBe('polling');
      expect(realTimeManager.pollingInterval).toBeDefined();
      
      jest.useRealTimers();
    });

    test('should fetch updates via HTTP polling', async () => {
      const mockUpdates = [
        {
          type: UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED,
          payload: { count: 20 }
        }
      ];
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUpdates)
      });
      
      const handler = jest.fn();
      realTimeManager.on(UPDATE_EVENTS.WORKFORCE_COUNT_CHANGED, handler);
      
      await realTimeManager.fetchUpdates();
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5001/supervisor/test-supervisor-123/updates',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );
      
      expect(handler).toHaveBeenCalledWith({ count: 20 });
    });
  });

  describe('Sync Queue Management', () => {
    beforeEach(() => {
      realTimeManager = new RealTimeManager(supervisorId);
    });

    test('should queue actions for offline sync', () => {
      const action = {
        type: 'APPROVAL_DECISION',
        payload: { approvalId: '123', decision: 'approve', remarks: 'Approved' }
      };
      
      realTimeManager.queueAction(action);
      
      expect(realTimeManager.syncQueue).toHaveLength(1);
      expect(realTimeManager.syncQueue[0]).toMatchObject(action);
      expect(realTimeManager.syncQueue[0]).toHaveProperty('id');
      expect(realTimeManager.syncQueue[0]).toHaveProperty('timestamp');
    });
  });

  describe('Connection State Management', () => {
    beforeEach(() => {
      realTimeManager = new RealTimeManager(supervisorId);
    });

    test('should return correct connection state', () => {
      realTimeManager.connectionState = 'connected';
      realTimeManager.syncQueue = [{ id: '1' }, { id: '2' }];
      
      const state = realTimeManager.getConnectionState();
      
      expect(state).toEqual({
        state: 'connected',
        isConnected: true,
        isPolling: false,
        isOffline: false,
        queuedActions: 2
      });
    });
  });

  describe('Authentication Handling', () => {
    beforeEach(() => {
      realTimeManager = new RealTimeManager(supervisorId);
    });

    test('should handle token refresh on 401 response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      
      await realTimeManager.fetchUpdates();
      
      expect(authService.refreshToken).toHaveBeenCalled();
    });
  });
});

describe('UPDATE_EVENTS Constants', () => {
  test('should export all required event types', () => {
    expect(UPDATE_EVENTS).toHaveProperty('WORKFORCE_COUNT_CHANGED');
    expect(UPDATE_EVENTS).toHaveProperty('ATTENDANCE_UPDATED');
    expect(UPDATE_EVENTS).toHaveProperty('NEW_APPROVAL_REQUEST');
    expect(UPDATE_EVENTS).toHaveProperty('CRITICAL_ALERT');
    expect(UPDATE_EVENTS).toHaveProperty('GEOFENCE_VIOLATION');
    expect(UPDATE_EVENTS).toHaveProperty('CONNECTION_STATE_CHANGED');
  });

  test('should have consistent naming convention', () => {
    Object.values(UPDATE_EVENTS).forEach(eventType => {
      expect(eventType).toMatch(/^[a-z_]+$/);
      expect(eventType).not.toContain(' ');
    });
  });
});