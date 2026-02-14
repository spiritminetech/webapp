import mongoose from 'mongoose';
import { getWorkerTasksToday } from './workerController.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import Project from '../project/models/Project.js';
import Task from '../task/Task.js';

describe('Worker Controller - Error Handling and Validation', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_worker_error_handling';
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
  });

  describe('Input Validation', () => {
    test('should return 400 for missing user data', async () => {
      const mockReq = {}; // Missing user data
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid authentication data",
        error: "INVALID_AUTH_DATA"
      });
    });

    test('should return 400 for invalid user ID', async () => {
      const mockReq = {
        user: {
          userId: "invalid",
          companyId: 1
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid user ID format",
        error: "INVALID_USER_ID"
      });
    });

    test('should return 400 for invalid company ID', async () => {
      const mockReq = {
        user: {
          userId: 1,
          companyId: "invalid"
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid company ID format",
        error: "INVALID_COMPANY_ID"
      });
    });

    test('should return 400 for invalid date format', async () => {
      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        },
        query: {
          date: "invalid-date"
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
        error: "INVALID_DATE_FORMAT"
      });
    });

    test('should return 400 for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        },
        query: {
          date: futureDateString
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Cannot fetch tasks for future dates beyond tomorrow",
        error: "FUTURE_DATE_NOT_ALLOWED"
      });
    });
  });

  describe('Employee Validation', () => {
    test('should return 404 for non-existent employee', async () => {
      const mockReq = {
        user: {
          userId: 999,
          companyId: 1
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Employee not found or inactive",
        error: "EMPLOYEE_NOT_FOUND"
      });
    });

    test('should return 403 for inactive employee', async () => {
      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Inactive Employee',
        status: 'INACTIVE'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Employee account is not active",
        error: "EMPLOYEE_INACTIVE"
      });
    });
  });

  describe('Task Assignment Validation', () => {
    test('should return 404 for no tasks assigned', async () => {
      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "No tasks assigned for today",
        error: "NO_TASKS_ASSIGNED"
      });
    });

    test('should return 404 for missing project', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 999, // Non-existent project
        employeeId: 1,
        taskId: 15,
        date: today,
        status: 'queued'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
      };
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getWorkerTasksToday(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Project not found for assigned tasks",
        error: "PROJECT_NOT_FOUND"
      });
    });
  });

  describe('Data Integrity Validation', () => {
    test('should handle missing task gracefully', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Test Project'
      });

      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        taskId: 999, // Non-existent task
        date: today,
        status: 'queued'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
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
                taskName: "Task Not Found",
                description: "Task details unavailable"
              })
            ])
          })
        })
      );
    });

    test('should sanitize invalid geofence coordinates', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Test Project',
        geofence: {
          center: {
            latitude: 999, // Invalid latitude
            longitude: -999 // Invalid longitude
          },
          radius: -50 // Invalid radius
        }
      });

      await Task.create({
        id: 15,
        companyId: 1,
        projectId: 1,
        taskName: 'Test Task'
      });

      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        taskId: 15,
        date: today,
        status: 'queued'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
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
            project: expect.objectContaining({
              geofence: expect.objectContaining({
                latitude: 0, // Should be sanitized
                longitude: 0, // Should be sanitized
                radius: 100 // Should be sanitized to default
              })
            })
          })
        })
      );
    });

    test('should clamp invalid progress percentages', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Test Project'
      });

      await Task.create({
        id: 15,
        companyId: 1,
        projectId: 1,
        taskName: 'Test Task'
      });

      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        taskId: 15,
        date: today,
        status: 'in_progress',
        progressPercent: 150 // Invalid - over 100%
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
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
                progress: expect.objectContaining({
                  percentage: 100 // Should be clamped to 100
                })
              })
            ])
          })
        })
      );
    });

    test('should include error tasks in daily summary', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Test Project'
      });

      // Create assignment with invalid data that will cause error
      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        taskId: null, // This will cause an error
        date: today,
        status: 'queued'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
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
            dailySummary: expect.objectContaining({
              errorTasks: expect.any(Number)
            })
          })
        })
      );
    });
  });

  describe('Response Structure Validation', () => {
    test('should validate response structure before sending', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Test Project'
      });

      await Task.create({
        id: 15,
        companyId: 1,
        projectId: 1,
        taskName: 'Test Task'
      });

      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        taskId: 15,
        date: today,
        status: 'queued'
      });

      const mockReq = {
        user: {
          userId: 1,
          companyId: 1
        }
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
            project: expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              code: expect.any(String),
              location: expect.any(String),
              geofence: expect.objectContaining({
                latitude: expect.any(Number),
                longitude: expect.any(Number),
                radius: expect.any(Number)
              })
            }),
            supervisor: expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              phone: expect.any(String),
              email: expect.any(String)
            }),
            worker: expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              role: expect.any(String),
              checkInStatus: expect.any(String),
              currentLocation: expect.objectContaining({
                latitude: expect.any(Number),
                longitude: expect.any(Number),
                insideGeofence: expect.any(Boolean),
                lastUpdated: expect.anything()
              })
            }),
            tasks: expect.any(Array),
            toolsAndMaterials: expect.objectContaining({
              tools: expect.any(Array),
              materials: expect.any(Array)
            }),
            dailySummary: expect.objectContaining({
              totalTasks: expect.any(Number),
              completedTasks: expect.any(Number),
              inProgressTasks: expect.any(Number),
              queuedTasks: expect.any(Number),
              errorTasks: expect.any(Number),
              totalHoursWorked: expect.any(Number),
              remainingHours: expect.any(Number),
              overallProgress: expect.any(Number)
            })
          })
        })
      );
    });
  });
});