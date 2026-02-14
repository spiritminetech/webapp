/**
 * Tests for enhanced task dependencies and sequence validation
 */

import mongoose from 'mongoose';
import { startWorkerTask, getWorkerTasksToday } from './workerController.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import Project from '../project/models/Project.js';
import Task from '../task/Task.js';

describe('Worker Controller - Enhanced Dependencies and Sequence Validation', () => {
  let testEmployee, testProject, testTask1, testTask2, testTask3;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_worker_dependencies';
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

    testTask1 = await Task.create({
      id: 1,
      taskName: 'Foundation Work',
      taskType: 'WORK',
      description: 'Foundation preparation task'
    });

    testTask2 = await Task.create({
      id: 2,
      taskName: 'Wall Construction',
      taskType: 'WORK',
      description: 'Wall construction task'
    });

    testTask3 = await Task.create({
      id: 3,
      taskName: 'Roof Installation',
      taskType: 'WORK',
      description: 'Roof installation task'
    });
  });

  describe('Task Dependencies Validation', () => {
    test('should prevent starting task with incomplete dependencies', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create dependency assignment (not completed)
      const dependencyAssignment = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'in_progress', // Not completed
        progressPercent: 50,
        sequence: 1
      });

      // Create main assignment with dependency
      const mainAssignment = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: [dependencyAssignment.id]
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: mainAssignment.id,
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
          incompleteDependencies: expect.arrayContaining([
            expect.objectContaining({
              id: dependencyAssignment.id,
              status: 'in_progress',
              progressPercent: 50
            })
          ])
        })
      });
    });

    test('should allow starting task with completed dependencies', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create completed dependency assignment
      const dependencyAssignment = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'completed', // Completed
        progressPercent: 100,
        sequence: 1
      });

      // Create main assignment with dependency
      const mainAssignment = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: [dependencyAssignment.id]
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: mainAssignment.id,
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
          assignmentId: mainAssignment.id,
          status: 'in_progress'
        })
      });
    });

    test('should handle missing dependency assignments', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create main assignment with non-existent dependency
      const mainAssignment = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: [999] // Non-existent dependency
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: mainAssignment.id,
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
        message: expect.stringContaining('Missing dependency assignments: 999'),
        error: 'DEPENDENCIES_NOT_MET',
        data: expect.objectContaining({
          missingDependencies: [999]
        })
      });
    });

    test('should handle multiple dependencies correctly', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create first dependency (completed)
      const dep1 = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'completed',
        progressPercent: 100,
        sequence: 1
      });

      // Create second dependency (incomplete)
      const dep2 = await WorkerTaskAssignment.create({
        id: 3,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask3.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 1
      });

      // Create main assignment with multiple dependencies
      const mainAssignment = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: [dep1.id, dep2.id]
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: mainAssignment.id,
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
          incompleteDependencies: expect.arrayContaining([
            expect.objectContaining({
              id: dep2.id,
              status: 'queued'
            })
          ])
        })
      });
    });
  });

  describe('Task Sequence Validation', () => {
    test('should prevent starting task out of sequence', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create first task in sequence (not completed)
      const firstTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'queued', // Not completed
        progressPercent: 0,
        sequence: 1
      });

      // Create second task in sequence (trying to start out of order)
      const secondTask = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: secondTask.id,
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
        message: expect.stringContaining('Tasks must be completed in sequence'),
        error: 'SEQUENCE_VALIDATION_FAILED',
        data: expect.objectContaining({
          incompleteEarlierTasks: expect.arrayContaining([
            expect.objectContaining({
              id: firstTask.id,
              sequence: 1,
              status: 'queued'
            })
          ])
        })
      });
    });

    test('should allow starting task when earlier sequence tasks are completed', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create first task in sequence (completed)
      const firstTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'completed', // Completed
        progressPercent: 100,
        sequence: 1
      });

      // Create second task in sequence
      const secondTask = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: secondTask.id,
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
          assignmentId: secondTask.id,
          status: 'in_progress'
        })
      });
    });

    test('should allow starting first task in sequence', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create first task in sequence
      const firstTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 1,
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: firstTask.id,
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
          assignmentId: firstTask.id,
          status: 'in_progress'
        })
      });
    });

    test('should allow starting task with no sequence defined', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create task without sequence
      const task = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        // No sequence defined
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: task.id,
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
          assignmentId: task.id,
          status: 'in_progress'
        })
      });
    });

    test('should handle complex sequence with multiple incomplete earlier tasks', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create multiple earlier tasks (some completed, some not)
      const task1 = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'completed',
        progressPercent: 100,
        sequence: 1
      });

      const task2 = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'in_progress', // Not completed
        progressPercent: 60,
        sequence: 2
      });

      const task3 = await WorkerTaskAssignment.create({
        id: 3,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask3.id,
        supervisorId: 2,
        date: today,
        status: 'queued', // Not completed
        progressPercent: 0,
        sequence: 3
      });

      // Try to start task with sequence 4
      const task4 = await WorkerTaskAssignment.create({
        id: 4,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id, // Reusing task for simplicity
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 4,
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: task4.id,
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
        message: expect.stringContaining('Tasks must be completed in sequence'),
        error: 'SEQUENCE_VALIDATION_FAILED',
        data: expect.objectContaining({
          incompleteEarlierTasks: expect.arrayContaining([
            expect.objectContaining({
              id: task2.id,
              sequence: 2,
              status: 'in_progress'
            }),
            expect.objectContaining({
              id: task3.id,
              sequence: 3,
              status: 'queued'
            })
          ])
        })
      });
    });
  });

  describe('Combined Dependencies and Sequence Validation', () => {
    test('should validate both dependencies and sequence', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create dependency task (completed)
      const depTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'completed',
        progressPercent: 100,
        sequence: 1
      });

      // Create earlier sequence task (not completed)
      const earlierTask = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued', // Not completed
        progressPercent: 0,
        sequence: 2
      });

      // Create main task with both dependency and sequence requirements
      const mainTask = await WorkerTaskAssignment.create({
        id: 3,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask3.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 3,
        dependencies: [depTask.id] // Has dependency (satisfied) but sequence not satisfied
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 },
        body: {
          assignmentId: mainTask.id,
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

      // Should fail on sequence validation (dependencies are satisfied)
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Tasks must be completed in sequence'),
        error: 'SEQUENCE_VALIDATION_FAILED',
        data: expect.objectContaining({
          incompleteEarlierTasks: expect.arrayContaining([
            expect.objectContaining({
              id: earlierTask.id,
              sequence: 2,
              status: 'queued'
            })
          ])
        })
      });
    });
  });

  describe('getWorkerTasksToday - canStart validation', () => {
    test('should set canStart to false for tasks with incomplete dependencies', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create dependency task (not completed)
      const depTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'in_progress',
        progressPercent: 50,
        sequence: 1
      });

      // Create main task with dependency
      const mainTask = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: [depTask.id]
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                assignmentId: mainTask.id,
                canStart: false,
                canStartMessage: expect.stringContaining('Dependent tasks must be completed first')
              })
            ])
          })
        })
      );
    });

    test('should set canStart to false for tasks out of sequence', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create earlier task (not completed)
      const earlierTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 1
      });

      // Create later task
      const laterTask = await WorkerTaskAssignment.create({
        id: 2,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 2,
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                assignmentId: laterTask.id,
                canStart: false,
                canStartMessage: expect.stringContaining('Tasks must be completed in sequence')
              })
            ])
          })
        })
      );
    });

    test('should set canStart to true for valid tasks', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create task that can be started
      const validTask = await WorkerTaskAssignment.create({
        id: 1,
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask1.id,
        supervisorId: 2,
        date: today,
        status: 'queued',
        progressPercent: 0,
        sequence: 1,
        dependencies: []
      });

      const mockReq = {
        user: { userId: 100, companyId: 1 }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                assignmentId: validTask.id,
                canStart: true,
                canStartMessage: null
              })
            ])
          })
        })
      );
    });
  });
});