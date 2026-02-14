import mongoose from 'mongoose';
import TaskIssue from './TaskIssue.js';

describe('TaskIssue Model', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_task_issues';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await TaskIssue.deleteMany({});
  });

  describe('Schema Validation', () => {
    test('should create TaskIssue with all required fields', async () => {
      const issueData = {
        id: 1,
        assignmentId: 101,
        employeeId: 200,
        projectId: 100,
        ticketNumber: 'ISS-2024-001',
        issueType: 'material_shortage',
        priority: 'high',
        description: 'Running low on ceiling panels, need 15 more to complete task',
        location: {
          latitude: 40.7130,
          longitude: -74.0058,
          workArea: 'Zone A, Floor 3'
        },
        photos: ['/uploads/issues/issue_101_1706356200000.jpg'],
        requestedAction: 'material_delivery',
        estimatedImpact: '2 hours delay if not resolved',
        status: 'reported',
        assignedTo: 5
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();

      expect(savedIssue.id).toBe(1);
      expect(savedIssue.assignmentId).toBe(101);
      expect(savedIssue.employeeId).toBe(200);
      expect(savedIssue.projectId).toBe(100);
      expect(savedIssue.ticketNumber).toBe('ISS-2024-001');
      expect(savedIssue.issueType).toBe('material_shortage');
      expect(savedIssue.priority).toBe('high');
      expect(savedIssue.description).toBe('Running low on ceiling panels, need 15 more to complete task');
      expect(savedIssue.location.latitude).toBe(40.7130);
      expect(savedIssue.location.longitude).toBe(-74.0058);
      expect(savedIssue.location.workArea).toBe('Zone A, Floor 3');
      expect(savedIssue.photos).toEqual(['/uploads/issues/issue_101_1706356200000.jpg']);
      expect(savedIssue.requestedAction).toBe('material_delivery');
      expect(savedIssue.estimatedImpact).toBe('2 hours delay if not resolved');
      expect(savedIssue.status).toBe('reported');
      expect(savedIssue.assignedTo).toBe(5);
      expect(savedIssue.reportedAt).toBeInstanceOf(Date);
    });

    test('should fail validation when required fields are missing', async () => {
      const issueData = {
        // Missing required fields: id, assignmentId, employeeId, projectId, issueType, description
        priority: 'medium'
      };

      const issue = new TaskIssue(issueData);
      
      await expect(issue.save()).rejects.toThrow();
    });

    test('should use default values for optional fields', async () => {
      const issueData = {
        id: 2,
        assignmentId: 102,
        employeeId: 201,
        projectId: 101,
        issueType: 'safety_concern',
        description: 'Unsafe working conditions detected'
        // priority and status not provided - should use defaults
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();

      expect(savedIssue.priority).toBe('medium');
      expect(savedIssue.status).toBe('reported');
      expect(savedIssue.reportedAt).toBeInstanceOf(Date);
    });
  });

  describe('Issue Type Validation', () => {
    test('should accept all valid issue types', async () => {
      const validIssueTypes = [
        'material_shortage',
        'tool_malfunction',
        'safety_concern',
        'quality_issue',
        'weather_delay',
        'technical_problem',
        'other'
      ];

      for (let i = 0; i < validIssueTypes.length; i++) {
        const issueData = {
          id: 10 + i,
          assignmentId: 110 + i,
          employeeId: 210 + i,
          projectId: 110 + i,
          issueType: validIssueTypes[i],
          description: `Test issue for ${validIssueTypes[i]}`
        };

        const issue = new TaskIssue(issueData);
        const savedIssue = await issue.save();
        
        expect(savedIssue.issueType).toBe(validIssueTypes[i]);
      }
    });

    test('should reject invalid issue types', async () => {
      const issueData = {
        id: 20,
        assignmentId: 120,
        employeeId: 220,
        projectId: 120,
        issueType: 'invalid_issue_type',
        description: 'Test issue with invalid type'
      };

      const issue = new TaskIssue(issueData);
      
      await expect(issue.save()).rejects.toThrow();
    });
  });

  describe('Priority Validation', () => {
    test('should accept all valid priority levels', async () => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];

      for (let i = 0; i < validPriorities.length; i++) {
        const issueData = {
          id: 30 + i,
          assignmentId: 130 + i,
          employeeId: 230 + i,
          projectId: 130 + i,
          issueType: 'other',
          description: `Test issue with ${validPriorities[i]} priority`,
          priority: validPriorities[i]
        };

        const issue = new TaskIssue(issueData);
        const savedIssue = await issue.save();
        
        expect(savedIssue.priority).toBe(validPriorities[i]);
      }
    });

    test('should reject invalid priority levels', async () => {
      const issueData = {
        id: 40,
        assignmentId: 140,
        employeeId: 240,
        projectId: 140,
        issueType: 'other',
        description: 'Test issue with invalid priority',
        priority: 'invalid_priority'
      };

      const issue = new TaskIssue(issueData);
      
      await expect(issue.save()).rejects.toThrow();
    });
  });

  describe('Status Validation', () => {
    test('should accept all valid status values', async () => {
      const validStatuses = ['reported', 'acknowledged', 'in_progress', 'resolved', 'closed'];

      for (let i = 0; i < validStatuses.length; i++) {
        const issueData = {
          id: 50 + i,
          assignmentId: 150 + i,
          employeeId: 250 + i,
          projectId: 150 + i,
          issueType: 'other',
          description: `Test issue with ${validStatuses[i]} status`,
          status: validStatuses[i]
        };

        const issue = new TaskIssue(issueData);
        const savedIssue = await issue.save();
        
        expect(savedIssue.status).toBe(validStatuses[i]);
      }
    });

    test('should reject invalid status values', async () => {
      const issueData = {
        id: 60,
        assignmentId: 160,
        employeeId: 260,
        projectId: 160,
        issueType: 'other',
        description: 'Test issue with invalid status',
        status: 'invalid_status'
      };

      const issue = new TaskIssue(issueData);
      
      await expect(issue.save()).rejects.toThrow();
    });
  });

  describe('Location and Photos', () => {
    test('should store location data correctly', async () => {
      const issueData = {
        id: 70,
        assignmentId: 170,
        employeeId: 270,
        projectId: 170,
        issueType: 'quality_issue',
        description: 'Quality issue with location data',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          workArea: 'Zone B, Floor 2'
        }
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();

      expect(savedIssue.location.latitude).toBe(40.7128);
      expect(savedIssue.location.longitude).toBe(-74.0060);
      expect(savedIssue.location.workArea).toBe('Zone B, Floor 2');
    });

    test('should store photos array correctly', async () => {
      const issueData = {
        id: 71,
        assignmentId: 171,
        employeeId: 271,
        projectId: 171,
        issueType: 'tool_malfunction',
        description: 'Tool malfunction with photos',
        photos: [
          '/uploads/issues/photo1.jpg',
          '/uploads/issues/photo2.jpg',
          '/uploads/issues/photo3.jpg'
        ]
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();

      expect(savedIssue.photos).toEqual([
        '/uploads/issues/photo1.jpg',
        '/uploads/issues/photo2.jpg',
        '/uploads/issues/photo3.jpg'
      ]);
    });

    test('should allow empty photos array', async () => {
      const issueData = {
        id: 72,
        assignmentId: 172,
        employeeId: 272,
        projectId: 172,
        issueType: 'weather_delay',
        description: 'Weather delay without photos',
        photos: []
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();

      expect(savedIssue.photos).toEqual([]);
    });
  });

  describe('Timestamps and Resolution', () => {
    test('should store resolution data correctly', async () => {
      const acknowledgedDate = new Date('2024-01-27T11:00:00Z');
      const resolvedDate = new Date('2024-01-27T14:00:00Z');
      
      const issueData = {
        id: 80,
        assignmentId: 180,
        employeeId: 280,
        projectId: 180,
        issueType: 'technical_problem',
        description: 'Technical problem resolved',
        status: 'resolved',
        assignedTo: 5,
        resolvedBy: 5,
        resolution: 'Issue resolved by replacing faulty equipment',
        acknowledgedAt: acknowledgedDate,
        resolvedAt: resolvedDate
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();

      expect(savedIssue.assignedTo).toBe(5);
      expect(savedIssue.resolvedBy).toBe(5);
      expect(savedIssue.resolution).toBe('Issue resolved by replacing faulty equipment');
      expect(savedIssue.acknowledgedAt).toEqual(acknowledgedDate);
      expect(savedIssue.resolvedAt).toEqual(resolvedDate);
    });

    test('should auto-generate reportedAt timestamp', async () => {
      const beforeSave = new Date();
      
      const issueData = {
        id: 81,
        assignmentId: 181,
        employeeId: 281,
        projectId: 181,
        issueType: 'other',
        description: 'Test auto-generated timestamp'
      };

      const issue = new TaskIssue(issueData);
      const savedIssue = await issue.save();
      
      const afterSave = new Date();

      expect(savedIssue.reportedAt).toBeInstanceOf(Date);
      expect(savedIssue.reportedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedIssue.reportedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });
  });

  describe('Unique Constraints', () => {
    test('should enforce unique id constraint', async () => {
      const issueData1 = {
        id: 90,
        assignmentId: 190,
        employeeId: 290,
        projectId: 190,
        issueType: 'other',
        description: 'First issue'
      };

      const issueData2 = {
        id: 90, // Same ID
        assignmentId: 191,
        employeeId: 291,
        projectId: 191,
        issueType: 'other',
        description: 'Second issue'
      };

      const issue1 = new TaskIssue(issueData1);
      await issue1.save();

      const issue2 = new TaskIssue(issueData2);
      await expect(issue2.save()).rejects.toThrow();
    });

    test('should enforce unique ticketNumber constraint', async () => {
      const issueData1 = {
        id: 91,
        assignmentId: 191,
        employeeId: 291,
        projectId: 191,
        ticketNumber: 'ISS-2024-DUPLICATE',
        issueType: 'other',
        description: 'First issue'
      };

      const issueData2 = {
        id: 92,
        assignmentId: 192,
        employeeId: 292,
        projectId: 192,
        ticketNumber: 'ISS-2024-DUPLICATE', // Same ticket number
        issueType: 'other',
        description: 'Second issue'
      };

      const issue1 = new TaskIssue(issueData1);
      await issue1.save();

      const issue2 = new TaskIssue(issueData2);
      await expect(issue2.save()).rejects.toThrow();
    });
  });
});