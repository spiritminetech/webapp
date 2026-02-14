/**
 * Tests for worker task start functionality with geofence validation
 */

import mongoose from 'mongoose';
import { startWorkerTask, validateWorkerGeofence } from './workerController.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import Project from '../project/models/Project.js';
import Task from '../task/Task.js';
import LocationLog from '../attendance/LocationLog.js';

describe('Worker Controller - Task Start with Geofence Validation', () => {
  let testEmployee, testProject, testTask, testAssignment;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_worker_task_start';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await Employee.deleteMany({});
    await WorkerTaskAssignment.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await LocationLog.deleteMany({});

    // Create test data
    testEmployee = await Employee.create({
      id: 1,
      userId: 100,
      companyId: 1,
      fullName: 'Test Worker',
      status: 'ACTIVE',
      jobTitle: 'Construction Worker'
    });

    testProject = await Project.create({
      id: 1,
      projectName: 'Test Construction Project',
      projectCode: 'TCP-001',
      address: 'Test Site Location',
      latitude: 40.7128,
      longitude: -74.0060,
      geofence: {
        center: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        radius: 100,
        strictMode: true,
        allowedVariance: 10
      }
    });

    testTask = await Task.create({
      id: 1,
      taskName: 'Test Task',
      taskType: 'WORK',
      description: 'Test task description'
    });

    testAssignment = await WorkerTaskAssignment.create({
      id: 1,
      employeeId: testEmployee.id,
      projectId: testProject.id,
      taskId: testTask.id,
      supervisorId: 2,
      date: new Date().toISOString().split('T')[0],
      status: 'queued',
      progressPercent: 0,
      workArea: 'Zone A',
      floor: 'Floor 1',
      zone: 'A',
      priority: 'medium',
      sequence: 1,
      dependencies: [],
      timeEstimate: {
        estimated: 240,
        elapsed: 0,
        remaining: 240
      }
    });
  });

  describe('startWorkerTask', () => {
    test('should start task successfully with valid geofence location', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7130, // Inside geofence
            longitude: -74.0058,
            accuracy: 5,
            timestamp: new Date().toISOString()
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task started successfully',
        data: expect.objectContaining({
          assignmentId: testAssignment.id,
          status: 'in_progress',
          startTime: expect.any(Date),
          geofenceValidation: expect.objectContaining({
            insideGeofence: true,
            validated: true
          })
        })
      });

      // Verify assignment was updated
      const updatedAssignment = await WorkerTaskAssignment.findOne({ id: testAssignment.id });
      expect(updatedAssignment.status).toBe('in_progress');
      expect(updatedAssignment.startTime).toBeDefined();
    });

    test('should reject task start with location outside geofence', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7200, // Outside geofence
            longitude: -74.0060,
            accuracy: 5,
            timestamp: new Date().toISOString()
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('from the project site'),
        error: 'GEOFENCE_VALIDATION_FAILED',
        data: expect.objectContaining({
          distance: expect.any(Number),
          insideGeofence: false
        })
      });

      // Verify assignment was not updated
      const unchangedAssignment = await WorkerTaskAssignment.findOne({ id: testAssignment.id });
      expect(unchangedAssignment.status).toBe('queued');
      expect(unchangedAssignment.startTime).toBeUndefined();
    });

    test('should return 400 for missing location data', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id
          // Missing location
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Location data is required to start task',
        error: 'MISSING_LOCATION'
      });
    });

    test('should return 400 for invalid coordinates', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 91, // Invalid latitude
            longitude: -74.0060
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Latitude must be between -90 and 90'),
        error: 'INVALID_LATITUDE'
      });
    });

    test('should return 400 for already started task', async () => {
      // Update assignment to in_progress
      await WorkerTaskAssignment.updateOne(
        { id: testAssignment.id },
        { status: 'in_progress' }
      );

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7130,
            longitude: -74.0058
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task is already in progress',
        error: 'TASK_ALREADY_STARTED'
      });
    });

    test('should return 403 for unauthorized assignment', async () => {
      const mockReq = {
        user: { userId: 999, companyId: 1 }, // Different user
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7130,
            longitude: -74.0058
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found or unauthorized',
        error: 'EMPLOYEE_UNAUTHORIZED'
      });
    });

    test('should create location log entry on successful start', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7130,
            longitude: -74.0058,
            accuracy: 5
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      // Verify location log was created
      const locationLog = await LocationLog.findOne({
        employeeId: testEmployee.id,
        logType: 'TASK_START'
      });

      expect(locationLog).toBeDefined();
      expect(locationLog.latitude).toBe(40.7130);
      expect(locationLog.longitude).toBe(-74.0058);
      expect(locationLog.taskAssignmentId).toBe(testAssignment.id);
    });
  });

  describe('validateWorkerGeofence', () => {
    test('should validate location inside geofence', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        query: {
          latitude: '40.7130',
          longitude: '-74.0058',
          projectId: testProject.id.toString()
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await validateWorkerGeofence(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          insideGeofence: true,
          canStartTasks: true,
          distance: expect.any(Number),
          geofence: expect.objectContaining({
            center: {
              latitude: 40.7128,
              longitude: -74.0060
            },
            radius: 100
          })
        })
      });
    });

    test('should validate location outside geofence', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        query: {
          latitude: '40.7200',
          longitude: '-74.0060',
          projectId: testProject.id.toString()
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await validateWorkerGeofence(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          insideGeofence: false,
          canStartTasks: false,
          distance: expect.any(Number),
          message: expect.stringContaining('from the project site')
        })
      });
    });

    test('should use current assignment project when projectId not provided', async () => {
      const mockReq = {
        user: { userId: 100, companyId: 1 },
        query: {
          latitude: '40.7130',
          longitude: '-74.0058'
          // No projectId provided
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await validateWorkerGeofence(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          insideGeofence: true,
          canStartTasks: true
        })
      });
    });

    test('should return 404 when no active assignment found', async () => {
      // Remove the assignment
      await WorkerTaskAssignment.deleteMany({});

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        query: {
          latitude: '40.7130',
          longitude: '-74.0058'
          // No projectId provided
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await validateWorkerGeofence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No active project assignment found for today',
        error: 'NO_ACTIVE_ASSIGNMENT'
      });
    });
  });

  describe('Task Dependencies', () => {
    test('should prevent starting task with incomplete dependencies', async () => {
      // Create a dependency assignment
      const dependencyAssignment = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        supervisorId: 2,
        date: new Date().toISOString().split('T')[0],
        status: 'queued', // Not completed
        progressPercent: 0
      });

      // Update main assignment to have dependency
      await WorkerTaskAssignment.updateOne(
        { id: testAssignment.id },
        { dependencies: [dependencyAssignment.id] }
      );

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7130,
            longitude: -74.0058
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Dependent tasks must be completed first'),
        error: 'DEPENDENCIES_NOT_MET',
        data: expect.objectContaining({
          incompleteDependencies: expect.any(Array)
        })
      });
    });

    test('should allow starting task with completed dependencies', async () => {
      // Create a completed dependency assignment
      const dependencyAssignment = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        supervisorId: 2,
        date: new Date().toISOString().split('T')[0],
        status: 'completed', // Completed
        progressPercent: 100
      });

      // Update main assignment to have dependency
      await WorkerTaskAssignment.updateOne(
        { id: testAssignment.id },
        { dependencies: [dependencyAssignment.id] }
      );

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: testAssignment.id,
          location: {
            latitude: 40.7130,
            longitude: -74.0058
          }
        }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await startWorkerTask(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task started successfully',
        data: expect.objectContaining({
          assignmentId: testAssignment.id,
          status: 'in_progress'
        })
      });
    });
  });
});