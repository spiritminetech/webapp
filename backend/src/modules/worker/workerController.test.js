import mongoose from 'mongoose';
import { getWorkerTasksToday } from './workerController.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import Project from '../project/models/Project.js';
import Task from '../task/Task.js';
import Attendance from '../attendance/Attendance.js';
import LocationLog from '../attendance/LocationLog.js';
import WorkerTaskProgress from './models/WorkerTaskProgress.js';
import Tool from '../project/models/Tool.js';
import Material from '../project/models/Material.js';

describe('Worker Controller - getWorkerTasksToday', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_worker_controller';
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
    await Attendance.deleteMany({});
    await LocationLog.deleteMany({});
    await WorkerTaskProgress.deleteMany({});
    await Tool.deleteMany({});
    await Material.deleteMany({});
  });

  describe('Input Validation and Error Handling', () => {
    test('should return 400 for missing authentication data', async () => {
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

    test('should return 400 for invalid user ID format', async () => {
      const mockReq = {
        user: {
          userId: "invalid", // Should be integer
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

    test('should return 400 for negative user ID', async () => {
      const mockReq = {
        user: {
          userId: -1,
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

    test('should return 400 for invalid company ID format', async () => {
      const mockReq = {
        user: {
          userId: 1,
          companyId: "invalid" // Should be integer
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

    test('should return 400 for future date beyond tomorrow', async () => {
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

    test('should return 403 for inactive employee', async () => {
      // Create inactive employee
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

    test('should return 404 when project not found', async () => {
      const today = new Date().toISOString().split("T")[0];

      // Create employee
      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      // Create assignment but no project
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

    test('should handle missing task gracefully', async () => {
      const today = new Date().toISOString().split("T")[0];

      // Create test data without task
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

    test('should validate and sanitize geofence coordinates', async () => {
      const today = new Date().toISOString().split("T")[0];

      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Test Employee',
        status: 'ACTIVE'
      });

      // Create project with invalid coordinates
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
                latitude: 0, // Should be sanitized to 0
                longitude: 0, // Should be sanitized to 0
                radius: 100 // Should be sanitized to default 100
              })
            })
          })
        })
      );
    });

    test('should handle invalid progress percentages', async () => {
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

      // Create assignment with invalid progress
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

  describe('getWorkerTasksToday function', () => {
    test('should fetch worker assigned tasks for current date successfully', async () => {
      const today = new Date().toISOString().split("T")[0];

      // Create test employee
      const employee = await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Mike Johnson',
        phone: '+1-555-0123',
        jobTitle: 'Construction Worker',
        status: 'ACTIVE'
      });

      // Create test project with geofence
      const project = await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Metro Construction Project',
        projectCode: 'MCP-2024-001',
        address: 'Downtown Site A',
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadius: 100,
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

      // Create test supervisor
      const supervisor = await Employee.create({
        id: 2,
        companyId: 1,
        fullName: 'John Smith',
        phone: '+1-555-0456',
        jobTitle: 'Supervisor',
        status: 'ACTIVE'
      });

      // Create test tasks
      const task1 = await Task.create({
        id: 15,
        companyId: 1,
        projectId: 1,
        taskType: 'WORK',
        taskName: 'Install Ceiling Panels - Zone A',
        description: 'Install acoustic ceiling panels in Zone A, Floor 3',
        status: 'PLANNED'
      });

      // Create test task assignments
      const assignment1 = await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        supervisorId: 2,
        taskId: 15,
        date: today,
        status: 'in_progress',
        progressPercent: 75,
        dailyTarget: {
          description: 'Install 50 ceiling panels',
          quantity: 50,
          unit: 'panels',
          targetCompletion: 100
        },
        workArea: 'Zone A',
        floor: 'Floor 3',
        zone: 'A',
        timeEstimate: {
          estimated: 240,
          elapsed: 180,
          remaining: 60
        },
        priority: 'high',
        sequence: 1,
        dependencies: [],
        startTime: new Date('2024-01-27T08:00:00Z')
      });

      // Create attendance record
      await Attendance.create({
        id: 1,
        employeeId: 1,
        projectId: 1,
        date: new Date(),
        checkIn: new Date('2024-01-27T07:30:00Z'),
        insideGeofenceAtCheckin: true
      });

      // Create location log
      await LocationLog.create({
        id: 1,
        employeeId: 1,
        projectId: 1,
        latitude: 40.7130,
        longitude: -74.0058,
        insideGeofence: true
      });

      // Create progress record
      await WorkerTaskProgress.create({
        id: 1,
        workerTaskAssignmentId: 101,
        employeeId: 1,
        progressPercent: 75,
        description: 'Completed 37 panels',
        submittedAt: new Date('2024-01-27T09:45:00Z'),
        status: 'SUBMITTED'
      });

      // Mock request and response objects
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
              id: 1,
              name: 'Metro Construction Project',
              code: 'MCP-2024-001',
              location: 'Downtown Site A',
              geofence: expect.objectContaining({
                latitude: 40.7128,
                longitude: -74.0060,
                radius: 100
              })
            }),
            supervisor: expect.objectContaining({
              id: 2,
              name: 'John Smith',
              phone: '+1-555-0456'
            }),
            worker: expect.objectContaining({
              id: 1,
              name: 'Mike Johnson',
              role: 'Construction Worker',
              checkInStatus: 'checked_in'
            }),
            tasks: expect.arrayContaining([
              expect.objectContaining({
                assignmentId: 101,
                taskId: 15,
                taskName: 'Install Ceiling Panels - Zone A',
                taskType: 'WORK',
                workArea: 'Zone A',
                floor: 'Floor 3',
                zone: 'A',
                status: 'in_progress',
                priority: 'high',
                sequence: 1,
                dailyTarget: expect.objectContaining({
                  description: 'Install 50 ceiling panels',
                  quantity: 50,
                  unit: 'panels',
                  targetCompletion: 100
                }),
                progress: expect.objectContaining({
                  percentage: 75,
                  completed: 37,
                  remaining: 13
                }),
                timeEstimate: expect.objectContaining({
                  estimated: 240,
                  elapsed: 180,
                  remaining: 60
                }),
                canStart: true,
                dependencies: []
              })
            ]),
            dailySummary: expect.objectContaining({
              totalTasks: 1,
              inProgressTasks: 1,
              totalHoursWorked: 3.0,
              remainingHours: 1.0,
              errorTasks: 0
            })
          })
        })
      );
    });

    test('should include tools and materials data in response', async () => {
      const today = new Date().toISOString().split("T")[0];

      // Create test employee
      const employee = await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Mike Johnson',
        phone: '+1-555-0123',
        jobTitle: 'Construction Worker',
        status: 'ACTIVE'
      });

      // Create test project
      const project = await Project.create({
        id: 1,
        companyId: 1,
        projectName: 'Metro Construction Project',
        projectCode: 'MCP-2024-001',
        address: 'Downtown Site A',
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadius: 100
      });

      // Create test supervisor
      const supervisor = await Employee.create({
        id: 2,
        companyId: 1,
        fullName: 'John Smith',
        phone: '+1-555-0456',
        jobTitle: 'Supervisor',
        status: 'ACTIVE'
      });

      // Create test task
      const task1 = await Task.create({
        id: 15,
        companyId: 1,
        projectId: 1,
        taskType: 'WORK',
        taskName: 'Install Ceiling Panels - Zone A',
        description: 'Install acoustic ceiling panels in Zone A, Floor 3',
        status: 'PLANNED'
      });

      // Create test task assignment
      const assignment1 = await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        supervisorId: 2,
        taskId: 15,
        date: today,
        status: 'in_progress',
        progressPercent: 75
      });

      // Create test tools
      const tool1 = await Tool.create({
        id: 1,
        companyId: 1,
        projectId: 1,
        name: 'Drill',
        category: 'power_tools',
        quantity: 2,
        unit: 'pieces',
        allocated: true,
        location: 'Tool Storage A',
        condition: 'good',
        status: 'available'
      });

      const tool2 = await Tool.create({
        id: 2,
        companyId: 1,
        projectId: 1,
        name: 'Safety Harness',
        category: 'safety_equipment',
        quantity: 1,
        unit: 'pieces',
        allocated: true,
        location: 'Safety Equipment Room',
        condition: 'excellent',
        status: 'available'
      });

      // Create test materials
      const material1 = await Material.create({
        id: 10,
        companyId: 1,
        projectId: 1,
        name: 'Ceiling Panels',
        category: 'finishing',
        quantity: 50,
        unit: 'pieces',
        allocated: 50,
        used: 37,
        location: 'Material Storage B',
        status: 'allocated'
      });

      const material2 = await Material.create({
        id: 11,
        companyId: 1,
        projectId: 1,
        name: 'Screws',
        category: 'hardware',
        quantity: 200,
        unit: 'pieces',
        allocated: 200,
        used: 150,
        location: 'Hardware Storage',
        status: 'allocated'
      });

      // Mock request and response objects
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
            toolsAndMaterials: expect.objectContaining({
              tools: expect.arrayContaining([
                expect.objectContaining({
                  id: 1,
                  name: 'Drill',
                  quantity: 2,
                  unit: 'pieces',
                  allocated: true,
                  location: 'Tool Storage A'
                }),
                expect.objectContaining({
                  id: 2,
                  name: 'Safety Harness',
                  quantity: 1,
                  unit: 'pieces',
                  allocated: true,
                  location: 'Safety Equipment Room'
                })
              ]),
              materials: expect.arrayContaining([
                expect.objectContaining({
                  id: 10,
                  name: 'Ceiling Panels',
                  quantity: 50,
                  unit: 'pieces',
                  allocated: 50,
                  used: 37,
                  remaining: 13,
                  location: 'Material Storage B'
                }),
                expect.objectContaining({
                  id: 11,
                  name: 'Screws',
                  quantity: 200,
                  unit: 'pieces',
                  allocated: 200,
                  used: 150,
                  remaining: 50,
                  location: 'Hardware Storage'
                })
              ])
            })
          })
        })
      );
    });

    test('should handle empty tools and materials gracefully', async () => {
      const today = new Date().toISOString().split("T")[0];

      // Create minimal test data without tools and materials
      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Mike Johnson',
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
        taskType: 'WORK',
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
            toolsAndMaterials: expect.objectContaining({
              tools: [],
              materials: []
            })
          })
        })
      );
    });

    test('should return 404 when employee not found', async () => {
      const mockReq = {
        user: {
          userId: 999, // Non-existent user
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
        message: 'Employee not found or inactive',
        error: 'EMPLOYEE_NOT_FOUND'
      });
    });

    test('should return 404 when no tasks assigned for today', async () => {
      // Create test employee
      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Mike Johnson',
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
        message: 'No tasks assigned for today',
        error: 'NO_TASKS_ASSIGNED'
      });
    });

    test('should calculate progress metrics correctly', async () => {
      const today = new Date().toISOString().split("T")[0];

      // Create test data
      await Employee.create({
        id: 1,
        companyId: 1,
        userId: 1,
        fullName: 'Mike Johnson',
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
        taskType: 'WORK',
        taskName: 'Test Task'
      });

      await WorkerTaskAssignment.create({
        id: 101,
        projectId: 1,
        employeeId: 1,
        taskId: 15,
        date: today,
        status: 'in_progress',
        progressPercent: 60,
        dailyTarget: {
          quantity: 100,
          unit: 'items'
        }
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
                  percentage: 60,
                  completed: 60, // 60% of 100 items
                  remaining: 40  // 100 - 60
                })
              })
            ])
          })
        })
      );
    });
  });
});