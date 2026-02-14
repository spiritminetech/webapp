/**
 * Unit tests for SupervisorDashboardService
 */

import supervisorDashboardService from './supervisorDashboardService.js';

// Mock the database models
jest.mock('../attendance/Attendance.js', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../project/models/Project.js', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../employee/Employee.js', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../worker/models/WorkerTaskAssignment.js', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../leaveRequest/models/LeaveRequest.js', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../companyUser/CompanyUser.js', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

describe('SupervisorDashboardService', () => {
  beforeEach(() => {
    // Clear cache before each test
    supervisorDashboardService.clearCache();
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Cache Management', () => {
    test('should set and get cached data correctly', () => {
      const testData = { test: 'data', timestamp: new Date() };
      const cacheKey = 'test_key';

      supervisorDashboardService.setCachedData(cacheKey, testData);
      const retrieved = supervisorDashboardService.getCachedData(cacheKey);

      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent cache key', () => {
      const retrieved = supervisorDashboardService.getCachedData('non_existent_key');
      expect(retrieved).toBeNull();
    });

    test('should clear cache correctly', () => {
      supervisorDashboardService.setCachedData('key1', { data: 1 });
      supervisorDashboardService.setCachedData('key2', { data: 2 });

      expect(supervisorDashboardService.getCacheStats().size).toBe(2);

      supervisorDashboardService.clearCache();

      expect(supervisorDashboardService.getCacheStats().size).toBe(0);
    });

    test('should clear specific supervisor cache', () => {
      supervisorDashboardService.setCachedData('dashboard_123', { data: 1 });
      supervisorDashboardService.setCachedData('projects_123', { data: 2 });
      supervisorDashboardService.setCachedData('dashboard_456', { data: 3 });

      supervisorDashboardService.clearCache(123);

      expect(supervisorDashboardService.getCachedData('dashboard_123')).toBeNull();
      expect(supervisorDashboardService.getCachedData('projects_123')).toBeNull();
      expect(supervisorDashboardService.getCachedData('dashboard_456')).not.toBeNull();
    });

    test('should provide cache statistics', () => {
      supervisorDashboardService.setCachedData('key1', { data: 1 });
      supervisorDashboardService.setCachedData('key2', { data: 2 });

      const stats = supervisorDashboardService.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.ttl).toBe(30000); // 30 seconds
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });

  describe('Utility Methods', () => {
    test('should get correct date boundaries', () => {
      const { todayStart, todayEnd } = supervisorDashboardService.getDateBoundaries();

      expect(todayStart).toBeInstanceOf(Date);
      expect(todayEnd).toBeInstanceOf(Date);
      expect(todayStart.getHours()).toBe(0);
      expect(todayStart.getMinutes()).toBe(0);
      expect(todayStart.getSeconds()).toBe(0);
      expect(todayStart.getMilliseconds()).toBe(0);
      expect(todayEnd.getHours()).toBe(23);
      expect(todayEnd.getMinutes()).toBe(59);
      expect(todayEnd.getSeconds()).toBe(59);
      expect(todayEnd.getMilliseconds()).toBe(999);
    });

    test('should normalize project status correctly', () => {
      const testCases = [
        { input: 'Not Started', expected: 'not_started' },
        { input: 'Ongoing', expected: 'ongoing' },
        { input: 'On Hold', expected: 'on_hold' },
        { input: 'COMPLETED', expected: 'completed' },
        { input: 'In Progress', expected: 'in_progress' },
        { input: null, expected: 'not started' },
        { input: undefined, expected: 'not started' },
        { input: '', expected: 'not started' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = supervisorDashboardService.normalizeProjectStatus(input);
        expect(result).toBe(expected);
      });
    });

    test('should map leave types to priorities correctly', () => {
      const testCases = [
        { input: 'EMERGENCY', expected: 'high' },
        { input: 'MEDICAL', expected: 'medium' },
        { input: 'ANNUAL', expected: 'low' },
        { input: 'CASUAL', expected: 'low' },
        { input: 'OTHER', expected: 'low' },
        { input: null, expected: 'low' },
        { input: undefined, expected: 'low' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = supervisorDashboardService.getPriorityFromLeaveType(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Cache TTL Behavior', () => {
    test('should respect cache TTL', (done) => {
      // Set a very short TTL for testing
      const originalTTL = supervisorDashboardService.CACHE_TTL;
      supervisorDashboardService.CACHE_TTL = 50; // 50ms

      const testData = { test: 'data' };
      supervisorDashboardService.setCachedData('ttl_test', testData);

      // Should be available immediately
      expect(supervisorDashboardService.getCachedData('ttl_test')).toEqual(testData);

      // Should expire after TTL
      setTimeout(() => {
        expect(supervisorDashboardService.getCachedData('ttl_test')).toBeNull();
        
        // Restore original TTL
        supervisorDashboardService.CACHE_TTL = originalTTL;
        done();
      }, 60);
    });
  });
});