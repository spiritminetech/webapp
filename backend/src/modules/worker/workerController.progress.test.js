import { jest } from '@jest/globals';
import { submitWorkerTaskProgress } from './workerController.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import WorkerTaskProgress from './models/WorkerTaskProgress.js';
import LocationLog from '../attendance/LocationLog.js';

// Mock the models
jest.mock('../employee/Employee.js');
jest.mock('./models/WorkerTaskAssignment.js');
jest.mock('./models/WorkerTaskProgress.js');
jest.mock('../attendance/LocationLog.js');

describe('submitWorkerTaskProgress', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      user: { userId: 1, companyId: 1 },
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Basic Progress Submission', () => {
    test('should accept progress percentage and description successfully', async () => {
      // Mock employee resolution
      Employee.findOne.mockResolvedValue({
        id: 1,
        fullName: 'John Worker',
        status: 'ACTIVE'
      });

      // Mock assignment lookup
      const mockAssignment = {
        id: 101,
        employeeId: 1,
        status: 'in_progress',
        progressPercent: 50,
        save: jest.fn().mockResolvedValue()
      };
      WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);

      // Mock progress record creation
      WorkerTaskProgress.findOne.mockResolvedValue({ id: 1 });
      WorkerTaskProgress.create.mockResolvedValue({
        id: 2,
        workerTaskAssignmentId: 101,
        employeeId: 1,
        progressPercent: 75,
        description: 'Completed additional work',
        submittedAt: new Date()
      });

      // Set up request body
      mockReq.body = {
        assignmentId: 101,
        progressPercent: 75,
        description: 'Completed additional work',
        notes: 'Everything going well'
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Progress updated successfully',
        data: expect.objectContaining({
          progressId: 2,
          assignmentId: 101,
          progressPercent: 75,
          status: 'SUBMITTED',
          nextAction: 'continue_work',
          taskStatus: 'in_progress',
          previousProgress: 50,
          progressDelta: 25
        })
      });

      // Verify assignment was updated
      expect(mockAssignment.save).toHaveBeenCalled();
      expect(mockAssignment.progressPercent).toBe(75);
    });

    test('should require description field', async () => {
      // Mock employee resolution
      Employee.findOne.mockResolvedValue({
        id: 1,
        fullName: 'John Worker',
        status: 'ACTIVE'
      });

      // Set up request body without description
      mockReq.body = {
        assignmentId: 101,
        progressPercent: 75
        // Missing description
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'description is required',
        error: 'MISSING_DESCRIPTION'
      });
    });

    test('should prevent progress decrease', async () => {
      // Mock employee resolution
      Employee.findOne.mockResolvedValue({
        id: 1,
        fullName: 'John Worker',
        status: 'ACTIVE'
      });

      // Mock assignment with higher current progress
      const mockAssignment = {
        id: 101,
        employeeId: 1,
        status: 'in_progress',
        progressPercent: 80 // Current progress is 80%
      };
      WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);

      // Set up request body with lower progress
      mockReq.body = {
        assignmentId: 101,
        progressPercent: 60, // Trying to decrease to 60%
        description: 'Some work done'
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Progress percentage cannot be decreased from 80% to 60%',
        error: 'INVALID_PROGRESS_DECREASE',
        data: {
          currentProgress: 80,
          attemptedProgress: 60
        }
      });
    });

    test('should complete task when progress reaches 100%', async () => {
      // Mock employee resolution
      Employee.findOne.mockResolvedValue({
        id: 1,
        fullName: 'John Worker',
        status: 'ACTIVE'
      });

      // Mock assignment
      const mockAssignment = {
        id: 101,
        employeeId: 1,
        status: 'in_progress',
        progressPercent: 90,
        save: jest.fn().mockResolvedValue()
      };
      WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);

      // Mock progress record creation
      WorkerTaskProgress.findOne.mockResolvedValue({ id: 1 });
      WorkerTaskProgress.create.mockResolvedValue({
        id: 2,
        workerTaskAssignmentId: 101,
        employeeId: 1,
        progressPercent: 100,
        description: 'Task completed',
        submittedAt: new Date()
      });

      // Set up request body
      mockReq.body = {
        assignmentId: 101,
        progressPercent: 100,
        description: 'Task completed'
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Progress updated successfully',
        data: expect.objectContaining({
          progressPercent: 100,
          taskStatus: 'completed',
          nextAction: 'task_completed'
        })
      });

      // Verify assignment status was updated to completed
      expect(mockAssignment.status).toBe('completed');
      expect(mockAssignment.completedAt).toBeDefined();
    });

    test('should handle location data when provided', async () => {
      // Mock employee resolution
      Employee.findOne.mockResolvedValue({
        id: 1,
        fullName: 'John Worker',
        status: 'ACTIVE'
      });

      // Mock assignment
      const mockAssignment = {
        id: 101,
        employeeId: 1,
        projectId: 1,
        status: 'in_progress',
        progressPercent: 50,
        save: jest.fn().mockResolvedValue()
      };
      WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);

      // Mock progress record creation
      WorkerTaskProgress.findOne.mockResolvedValue({ id: 1 });
      WorkerTaskProgress.create.mockResolvedValue({
        id: 2,
        workerTaskAssignmentId: 101,
        employeeId: 1,
        progressPercent: 75,
        description: 'Work completed',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date()
        },
        submittedAt: new Date()
      });

      // Mock location log creation
      LocationLog.findOne.mockResolvedValue({ id: 1 });
      LocationLog.create.mockResolvedValue({});

      // Set up request body with location
      mockReq.body = {
        assignmentId: 101,
        progressPercent: 75,
        description: 'Work completed',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: '2024-01-27T11:30:00Z'
        }
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      // Verify location was logged
      expect(LocationLog.create).toHaveBeenCalledWith({
        id: 2,
        employeeId: 1,
        projectId: 1,
        latitude: 40.7128,
        longitude: -74.0060,
        logType: 'PROGRESS_UPDATE',
        taskAssignmentId: 101,
        progressPercent: 75
      });

      // Verify successful response
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Progress updated successfully',
        data: expect.objectContaining({
          progressPercent: 75,
          taskStatus: 'in_progress'
        })
      });
    });
  });

  describe('Validation Tests', () => {
    test('should reject invalid assignment ID', async () => {
      mockReq.body = {
        assignmentId: 'invalid',
        progressPercent: 75,
        description: 'Work done'
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid assignment format',
        error: 'INVALID_ASSIGNMENT_FORMAT'
      });
    });

    test('should reject invalid progress percentage', async () => {
      mockReq.body = {
        assignmentId: 101,
        progressPercent: 'invalid',
        description: 'Work done'
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Progress percentage must be a number',
        error: 'INVALID_PROGRESS_FORMAT'
      });
    });

    test('should reject progress update for completed task', async () => {
      // Mock employee resolution
      Employee.findOne.mockResolvedValue({
        id: 1,
        fullName: 'John Worker',
        status: 'ACTIVE'
      });

      // Mock completed assignment
      const mockAssignment = {
        id: 101,
        employeeId: 1,
        status: 'completed',
        progressPercent: 100
      };
      WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);

      mockReq.body = {
        assignmentId: 101,
        progressPercent: 100,
        description: 'Already completed'
      };

      await submitWorkerTaskProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot update progress for completed task',
        error: 'TASK_ALREADY_COMPLETED'
      });
    });
  });
});