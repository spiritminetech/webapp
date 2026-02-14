import dashboardService from '../DashboardService.js';
import authService from '../AuthService.js';

// Mock the auth service
jest.mock('../AuthService.js');
jest.mock('../WorkerTaskService.js');
jest.mock('../AttendanceService.js');
jest.mock('../GeofenceIntegrationService.js');
jest.mock('../PerformanceService.js');

describe('Dashboard Service Authentication Integration - Task 14.1', () => {
  const mockWorkerId = 'worker123';
  const mockTokenUser = {
    userId: 'worker123',
    email: 'worker@test.com',
    role: 'WORKER',
    companyId: 'company123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful authentication
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserFromToken.mockReturnValue(mockTokenUser);
    authService.shouldRefreshToken.mockReturnValue(false);
  });

  describe('Requirement 9.1: Authentication Requirements', () => {
    test('should require authentication for dashboard data access', async () => {
      // Mock unauthenticated state
      authService.isAuthenticated.mockReturnValue(false);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow('Authentication required - Requirement 9.1');
    });

    test('should require valid user token for data access', async () => {
      // Mock missing token user
      authService.getUserFromToken.mockReturnValue(null);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow('Unable to verify user identity - Requirement 9.3');
    });

    test('should validate user role for dashboard access', async () => {
      // Mock invalid role
      const invalidRoleUser = { ...mockTokenUser, role: 'INVALID_ROLE' };
      authService.getUserFromToken.mockReturnValue(invalidRoleUser);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow('Access denied: Invalid user role - Requirement 9.3');
    });
  });

  describe('Requirement 9.2: Session Management', () => {
    test('should refresh token when needed', async () => {
      // Mock token refresh needed
      authService.shouldRefreshToken.mockReturnValue(true);
      authService.refreshToken.mockResolvedValue({ token: 'new-token' });

      // Mock successful data fetch after refresh
      const mockWorkerTaskService = require('../WorkerTaskService.js');
      mockWorkerTaskService.getTodaysTasks.mockResolvedValue({
        project: { id: 'proj1', name: 'Test Project' },
        shift: { id: 'shift1', startTime: '08:00' }
      });

      const mockAttendanceService = require('../AttendanceService.js');
      mockAttendanceService.getTodayAttendance.mockResolvedValue({
        session: 'CHECKED_IN',
        checkInTime: new Date()
      });

      await dashboardService.getDashboardData(mockWorkerId);

      expect(authService.refreshToken).toHaveBeenCalled();
    });

    test('should handle token refresh failure', async () => {
      // Mock token refresh needed but fails
      authService.shouldRefreshToken.mockReturnValue(true);
      authService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow('Session expired. Please log in again. - Requirement 9.2');
    });
  });

  describe('Requirement 9.3: Data Isolation', () => {
    test('should prevent access to other worker data', async () => {
      // Mock token user with different ID
      const differentTokenUser = { ...mockTokenUser, userId: 'different-worker' };
      authService.getUserFromToken.mockReturnValue(differentTokenUser);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow('Access denied: Worker ID mismatch - Requirement 9.3');
    });

    test('should enforce data isolation in subscriptions', async () => {
      // Mock different user trying to subscribe
      const differentTokenUser = { ...mockTokenUser, userId: 'different-worker' };
      authService.getUserFromToken.mockReturnValue(differentTokenUser);

      expect(() => {
        dashboardService.subscribeToUpdates(mockWorkerId, () => {});
      }).toThrow('Access denied: Worker ID mismatch for subscription - Requirement 9.3');
    });

    test('should allow access for matching worker ID', async () => {
      // Mock successful data fetch
      const mockWorkerTaskService = require('../WorkerTaskService.js');
      mockWorkerTaskService.getTodaysTasks.mockResolvedValue({
        project: { id: 'proj1', name: 'Test Project' },
        shift: { id: 'shift1', startTime: '08:00' }
      });

      const mockAttendanceService = require('../AttendanceService.js');
      mockAttendanceService.getTodayAttendance.mockResolvedValue({
        session: 'CHECKED_IN',
        checkInTime: new Date()
      });

      const result = await dashboardService.getDashboardData(mockWorkerId);

      expect(result).toBeDefined();
      expect(result.workerId).toBe(mockWorkerId);
    });
  });

  describe('Real-time Updates Authentication', () => {
    test('should require authentication for subscriptions', async () => {
      // Mock unauthenticated state
      authService.isAuthenticated.mockReturnValue(false);

      expect(() => {
        dashboardService.subscribeToUpdates(mockWorkerId, () => {});
      }).toThrow('Authentication required for real-time updates - Requirement 9.1');
    });

    test('should validate subscription user identity', async () => {
      // Mock missing token user
      authService.getUserFromToken.mockReturnValue(null);

      expect(() => {
        dashboardService.subscribeToUpdates(mockWorkerId, () => {});
      }).toThrow('Unable to verify user identity for subscription - Requirement 9.3');
    });

    test('should create valid subscription for authenticated user', async () => {
      const mockCallback = jest.fn();
      
      const subscription = dashboardService.subscribeToUpdates(mockWorkerId, mockCallback);

      expect(subscription).toBeDefined();
      expect(subscription.id).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      authService.isAuthenticated.mockReturnValue(false);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow(/Authentication error:/);
    });

    test('should handle token validation errors', async () => {
      // Mock token user retrieval failure
      authService.getUserFromToken.mockReturnValue(null);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow(/Authentication error:/);
    });

    test('should handle data isolation violations', async () => {
      // Mock worker ID mismatch
      const differentTokenUser = { ...mockTokenUser, userId: 'different-worker' };
      authService.getUserFromToken.mockReturnValue(differentTokenUser);

      await expect(dashboardService.getDashboardData(mockWorkerId))
        .rejects
        .toThrow(/Authentication error:/);
    });
  });
});