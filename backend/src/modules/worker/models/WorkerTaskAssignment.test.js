import mongoose from 'mongoose';
import WorkerTaskAssignment from './WorkerTaskAssignment.js';

describe('WorkerTaskAssignment Model', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_worker_tasks';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await WorkerTaskAssignment.deleteMany({});
  });

  describe('New Mobile Fields', () => {
    test('should create WorkerTaskAssignment with new mobile fields', async () => {
      const assignmentData = {
        id: 1,
        projectId: 100,
        employeeId: 200,
        supervisorId: 300,
        date: '2024-01-27',
        status: 'queued',
        companyId: 1,
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
          elapsed: 60,
          remaining: 180
        },
        priority: 'high',
        sequence: 1,
        dependencies: [101, 102],
        geofenceValidation: {
          required: true,
          lastValidated: new Date('2024-01-27T10:30:00Z'),
          validationLocation: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.dailyTarget.description).toBe('Install 50 ceiling panels');
      expect(savedAssignment.dailyTarget.quantity).toBe(50);
      expect(savedAssignment.dailyTarget.unit).toBe('panels');
      expect(savedAssignment.dailyTarget.targetCompletion).toBe(100);
      expect(savedAssignment.workArea).toBe('Zone A');
      expect(savedAssignment.floor).toBe('Floor 3');
      expect(savedAssignment.zone).toBe('A');
      expect(savedAssignment.timeEstimate.estimated).toBe(240);
      expect(savedAssignment.timeEstimate.elapsed).toBe(60);
      expect(savedAssignment.timeEstimate.remaining).toBe(180);
      expect(savedAssignment.priority).toBe('high');
      expect(savedAssignment.sequence).toBe(1);
      expect(savedAssignment.dependencies).toEqual([101, 102]);
      expect(savedAssignment.geofenceValidation.required).toBe(true);
      expect(savedAssignment.geofenceValidation.lastValidated).toEqual(new Date('2024-01-27T10:30:00Z'));
      expect(savedAssignment.geofenceValidation.validationLocation.latitude).toBe(40.7128);
      expect(savedAssignment.geofenceValidation.validationLocation.longitude).toBe(-74.0060);
    });

    test('should use default targetCompletion value when not provided', async () => {
      const assignmentData = {
        id: 2,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        dailyTarget: {
          description: 'Complete electrical work',
          quantity: 20,
          unit: 'outlets'
          // targetCompletion not provided
        },
        workArea: 'Zone B',
        floor: 'Floor 2',
        zone: 'B'
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.dailyTarget.targetCompletion).toBe(100);
    });

    test('should allow optional mobile fields to be undefined', async () => {
      const assignmentData = {
        id: 3,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27'
        // Mobile fields not provided
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.dailyTarget).toBeUndefined();
      expect(savedAssignment.workArea).toBeUndefined();
      expect(savedAssignment.floor).toBeUndefined();
      expect(savedAssignment.zone).toBeUndefined();
      expect(savedAssignment.timeEstimate).toBeUndefined();
      expect(savedAssignment.priority).toBe('medium'); // Should use default
      expect(savedAssignment.sequence).toBeUndefined();
      expect(savedAssignment.dependencies).toBeUndefined();
      expect(savedAssignment.geofenceValidation).toBeUndefined();
    });

    test('should use default priority value when not provided', async () => {
      const assignmentData = {
        id: 4,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27'
        // priority not provided
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.priority).toBe('medium');
    });

    test('should validate priority enum values', async () => {
      const assignmentData = {
        id: 5,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        priority: 'invalid_priority'
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      
      await expect(assignment.save()).rejects.toThrow();
    });

    test('should accept valid priority values', async () => {
      const priorities = ['low', 'medium', 'high', 'critical'];
      
      for (let i = 0; i < priorities.length; i++) {
        const assignmentData = {
          id: 6 + i,
          projectId: 100,
          employeeId: 200,
          date: '2024-01-27',
          priority: priorities[i]
        };

        const assignment = new WorkerTaskAssignment(assignmentData);
        const savedAssignment = await assignment.save();
        
        expect(savedAssignment.priority).toBe(priorities[i]);
      }
    });

    test('should store timeEstimate structure correctly', async () => {
      const assignmentData = {
        id: 10,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        timeEstimate: {
          estimated: 480,
          elapsed: 120,
          remaining: 360
        }
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.timeEstimate).toMatchObject({
        estimated: 480,
        elapsed: 120,
        remaining: 360
      });
    });

    test('should store sequence number correctly', async () => {
      const assignmentData = {
        id: 11,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        sequence: 5
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.sequence).toBe(5);
    });

    test('should validate dailyTarget structure when provided', async () => {
      const assignmentData = {
        id: 12,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        dailyTarget: {
          description: 'Quality inspection',
          quantity: 1,
          unit: 'inspection',
          targetCompletion: 100
        },
        workArea: 'All Areas',
        floor: 'All Floors',
        zone: 'All'
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.dailyTarget).toMatchObject({
        description: 'Quality inspection',
        quantity: 1,
        unit: 'inspection',
        targetCompletion: 100
      });
    });

    test('should store dependencies array correctly', async () => {
      const assignmentData = {
        id: 13,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        dependencies: [101, 102, 103]
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.dependencies).toEqual([101, 102, 103]);
    });

    test('should allow empty dependencies array', async () => {
      const assignmentData = {
        id: 14,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        dependencies: []
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.dependencies).toEqual([]);
    });

    test('should store geofenceValidation structure correctly', async () => {
      const validationDate = new Date('2024-01-27T10:30:00Z');
      const assignmentData = {
        id: 15,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        geofenceValidation: {
          required: true,
          lastValidated: validationDate,
          validationLocation: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.geofenceValidation.required).toBe(true);
      expect(savedAssignment.geofenceValidation.lastValidated).toEqual(validationDate);
      expect(savedAssignment.geofenceValidation.validationLocation.latitude).toBe(40.7128);
      expect(savedAssignment.geofenceValidation.validationLocation.longitude).toBe(-74.0060);
    });

    test('should use default geofenceValidation.required value when not provided', async () => {
      const assignmentData = {
        id: 16,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        geofenceValidation: {
          validationLocation: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.geofenceValidation.required).toBe(true);
    });

    test('should allow null values in geofenceValidation location', async () => {
      const assignmentData = {
        id: 17,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        geofenceValidation: {
          required: false,
          lastValidated: null,
          validationLocation: {
            latitude: null,
            longitude: null
          }
        }
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      const savedAssignment = await assignment.save();

      expect(savedAssignment.geofenceValidation.required).toBe(false);
      expect(savedAssignment.geofenceValidation.lastValidated).toBeNull();
      expect(savedAssignment.geofenceValidation.validationLocation.latitude).toBeNull();
      expect(savedAssignment.geofenceValidation.validationLocation.longitude).toBeNull();
    });
    });
  });

  describe('Existing Functionality', () => {
    test('should maintain existing required fields validation', async () => {
      const assignmentData = {
        // Missing required fields: id, projectId, employeeId, date
        status: 'queued'
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      
      await expect(assignment.save()).rejects.toThrow();
    });

    test('should maintain existing status enum validation', async () => {
      const assignmentData = {
        id: 18,
        projectId: 100,
        employeeId: 200,
        date: '2024-01-27',
        status: 'invalid_status' // Invalid status
      };

      const assignment = new WorkerTaskAssignment(assignmentData);
      
      await expect(assignment.save()).rejects.toThrow();
    });
  });
});