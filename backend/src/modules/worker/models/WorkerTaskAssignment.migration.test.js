import mongoose from 'mongoose';
import WorkerTaskAssignment from './WorkerTaskAssignment.js';

describe('WorkerTaskAssignment Migration', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test_worker_tasks_migration';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    if (process.env.NODE_ENV === 'test') {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await WorkerTaskAssignment.deleteMany({});
  });

  describe('Migration Logic', () => {
    test('should add default values to existing records without mobile fields', async () => {
      // Create records without mobile fields (simulating old records)
      const oldRecords = [
        {
          id: 1,
          projectId: 100,
          employeeId: 200,
          supervisorId: 300,
          date: '2024-01-27',
          status: 'queued',
          companyId: 1
        },
        {
          id: 2,
          projectId: 101,
          employeeId: 201,
          supervisorId: 301,
          date: '2024-01-27',
          status: 'in_progress',
          companyId: 1
        }
      ];

      // Insert records directly to bypass schema defaults
      await mongoose.connection.collection('workerTaskAssignment').insertMany(oldRecords);

      // Verify records don't have mobile fields
      const recordsBeforeMigration = await WorkerTaskAssignment.find({});
      expect(recordsBeforeMigration).toHaveLength(2);
      
      // Check that mobile fields don't exist
      recordsBeforeMigration.forEach(record => {
        expect(record.dailyTarget).toBeUndefined();
        expect(record.workArea).toBeUndefined();
        expect(record.floor).toBeUndefined();
        expect(record.zone).toBeUndefined();
        expect(record.timeEstimate).toBeUndefined();
        expect(record.sequence).toBeUndefined();
        expect(record.dependencies).toBeUndefined();
        expect(record.geofenceValidation).toBeUndefined();
      });

      // Run migration logic
      const migrationResult = await WorkerTaskAssignment.updateMany(
        {
          $or: [
            { dailyTarget: { $exists: false } },
            { workArea: { $exists: false } },
            { floor: { $exists: false } },
            { zone: { $exists: false } },
            { timeEstimate: { $exists: false } },
            { priority: { $exists: false } },
            { sequence: { $exists: false } },
            { dependencies: { $exists: false } },
            { geofenceValidation: { $exists: false } }
          ]
        },
        {
          $set: {
            dailyTarget: {
              description: 'Task completion',
              quantity: 1,
              unit: 'task',
              targetCompletion: 100
            },
            workArea: 'General Area',
            floor: 'Ground Floor',
            zone: 'A',
            timeEstimate: {
              estimated: 480, // 8 hours in minutes
              elapsed: 0,
              remaining: 480
            },
            priority: 'medium',
            sequence: 1,
            dependencies: [],
            geofenceValidation: {
              required: true,
              lastValidated: null,
              validationLocation: {
                latitude: null,
                longitude: null
              }
            }
          }
        }
      );

      // Verify migration results
      expect(migrationResult.modifiedCount).toBe(2);

      // Verify records now have mobile fields with default values
      const recordsAfterMigration = await WorkerTaskAssignment.find({});
      expect(recordsAfterMigration).toHaveLength(2);

      recordsAfterMigration.forEach(record => {
        // Check dailyTarget
        expect(record.dailyTarget).toBeDefined();
        expect(record.dailyTarget.description).toBe('Task completion');
        expect(record.dailyTarget.quantity).toBe(1);
        expect(record.dailyTarget.unit).toBe('task');
        expect(record.dailyTarget.targetCompletion).toBe(100);

        // Check location fields
        expect(record.workArea).toBe('General Area');
        expect(record.floor).toBe('Ground Floor');
        expect(record.zone).toBe('A');

        // Check timeEstimate
        expect(record.timeEstimate).toBeDefined();
        expect(record.timeEstimate.estimated).toBe(480);
        expect(record.timeEstimate.elapsed).toBe(0);
        expect(record.timeEstimate.remaining).toBe(480);

        // Check other fields
        expect(record.priority).toBe('medium');
        expect(record.sequence).toBe(1);
        expect(record.dependencies).toEqual([]);

        // Check geofenceValidation
        expect(record.geofenceValidation).toBeDefined();
        expect(record.geofenceValidation.required).toBe(true);
        expect(record.geofenceValidation.lastValidated).toBeNull();
        expect(record.geofenceValidation.validationLocation.latitude).toBeNull();
        expect(record.geofenceValidation.validationLocation.longitude).toBeNull();
      });
    });

    test('should not modify records that already have mobile fields', async () => {
      // Create a record with mobile fields already set
      const recordWithMobileFields = {
        id: 3,
        projectId: 102,
        employeeId: 202,
        supervisorId: 302,
        date: '2024-01-27',
        status: 'completed',
        companyId: 1,
        dailyTarget: {
          description: 'Custom task',
          quantity: 5,
          unit: 'items',
          targetCompletion: 100
        },
        workArea: 'Zone B',
        floor: 'Floor 2',
        zone: 'B',
        timeEstimate: {
          estimated: 240,
          elapsed: 240,
          remaining: 0
        },
        priority: 'high',
        sequence: 2,
        dependencies: [1, 2],
        geofenceValidation: {
          required: false,
          lastValidated: new Date('2024-01-27T10:30:00Z'),
          validationLocation: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const assignment = new WorkerTaskAssignment(recordWithMobileFields);
      await assignment.save();

      // Run migration logic
      const migrationResult = await WorkerTaskAssignment.updateMany(
        {
          $or: [
            { dailyTarget: { $exists: false } },
            { workArea: { $exists: false } },
            { floor: { $exists: false } },
            { zone: { $exists: false } },
            { timeEstimate: { $exists: false } },
            { priority: { $exists: false } },
            { sequence: { $exists: false } },
            { dependencies: { $exists: false } },
            { geofenceValidation: { $exists: false } }
          ]
        },
        {
          $set: {
            dailyTarget: {
              description: 'Task completion',
              quantity: 1,
              unit: 'task',
              targetCompletion: 100
            },
            workArea: 'General Area',
            floor: 'Ground Floor',
            zone: 'A',
            timeEstimate: {
              estimated: 480,
              elapsed: 0,
              remaining: 480
            },
            priority: 'medium',
            sequence: 1,
            dependencies: [],
            geofenceValidation: {
              required: true,
              lastValidated: null,
              validationLocation: {
                latitude: null,
                longitude: null
              }
            }
          }
        }
      );

      // Should not modify any records since they already have mobile fields
      expect(migrationResult.modifiedCount).toBe(0);

      // Verify the record still has its original values
      const recordAfterMigration = await WorkerTaskAssignment.findOne({ id: 3 });
      expect(recordAfterMigration.dailyTarget.description).toBe('Custom task');
      expect(recordAfterMigration.dailyTarget.quantity).toBe(5);
      expect(recordAfterMigration.workArea).toBe('Zone B');
      expect(recordAfterMigration.floor).toBe('Floor 2');
      expect(recordAfterMigration.zone).toBe('B');
      expect(recordAfterMigration.priority).toBe('high');
      expect(recordAfterMigration.sequence).toBe(2);
      expect(recordAfterMigration.dependencies).toEqual([1, 2]);
      expect(recordAfterMigration.geofenceValidation.required).toBe(false);
    });

    test('should handle mixed scenarios - some records with and without mobile fields', async () => {
      // Create one record without mobile fields
      await mongoose.connection.collection('workerTaskAssignment').insertOne({
        id: 4,
        projectId: 103,
        employeeId: 203,
        date: '2024-01-27',
        status: 'queued'
      });

      // Create one record with mobile fields
      const recordWithFields = new WorkerTaskAssignment({
        id: 5,
        projectId: 104,
        employeeId: 204,
        date: '2024-01-27',
        status: 'in_progress',
        dailyTarget: {
          description: 'Existing task',
          quantity: 3,
          unit: 'units',
          targetCompletion: 100
        },
        workArea: 'Zone C',
        floor: 'Floor 1',
        zone: 'C',
        priority: 'low'
      });
      await recordWithFields.save();

      // Run migration
      const migrationResult = await WorkerTaskAssignment.updateMany(
        {
          $or: [
            { dailyTarget: { $exists: false } },
            { workArea: { $exists: false } },
            { floor: { $exists: false } },
            { zone: { $exists: false } },
            { timeEstimate: { $exists: false } },
            { priority: { $exists: false } },
            { sequence: { $exists: false } },
            { dependencies: { $exists: false } },
            { geofenceValidation: { $exists: false } }
          ]
        },
        {
          $set: {
            dailyTarget: {
              description: 'Task completion',
              quantity: 1,
              unit: 'task',
              targetCompletion: 100
            },
            workArea: 'General Area',
            floor: 'Ground Floor',
            zone: 'A',
            timeEstimate: {
              estimated: 480,
              elapsed: 0,
              remaining: 480
            },
            priority: 'medium',
            sequence: 1,
            dependencies: [],
            geofenceValidation: {
              required: true,
              lastValidated: null,
              validationLocation: {
                latitude: null,
                longitude: null
              }
            }
          }
        }
      );

      // Should modify only the record without mobile fields
      expect(migrationResult.modifiedCount).toBe(1);

      // Verify both records
      const allRecords = await WorkerTaskAssignment.find({}).sort({ id: 1 });
      expect(allRecords).toHaveLength(2);

      // First record (id: 4) should have default values
      const firstRecord = allRecords[0];
      expect(firstRecord.id).toBe(4);
      expect(firstRecord.dailyTarget.description).toBe('Task completion');
      expect(firstRecord.workArea).toBe('General Area');

      // Second record (id: 5) should keep original values
      const secondRecord = allRecords[1];
      expect(secondRecord.id).toBe(5);
      expect(secondRecord.dailyTarget.description).toBe('Existing task');
      expect(secondRecord.workArea).toBe('Zone C');
    });

    test('should provide accurate migration statistics', async () => {
      // Create 3 records without mobile fields
      const oldRecords = [
        { id: 6, projectId: 105, employeeId: 205, date: '2024-01-27' },
        { id: 7, projectId: 106, employeeId: 206, date: '2024-01-27' },
        { id: 8, projectId: 107, employeeId: 207, date: '2024-01-27' }
      ];
      await mongoose.connection.collection('workerTaskAssignment').insertMany(oldRecords);

      // Create 1 record with mobile fields
      const newRecord = new WorkerTaskAssignment({
        id: 9,
        projectId: 108,
        employeeId: 208,
        date: '2024-01-27',
        dailyTarget: { description: 'Test', quantity: 1, unit: 'task' },
        workArea: 'Test Area',
        floor: 'Test Floor',
        zone: 'T',
        priority: 'medium'
      });
      await newRecord.save();

      // Check counts before migration
      const totalRecordsBefore = await WorkerTaskAssignment.countDocuments();
      const recordsWithFieldsBefore = await WorkerTaskAssignment.countDocuments({
        dailyTarget: { $exists: true },
        workArea: { $exists: true },
        floor: { $exists: true },
        zone: { $exists: true },
        timeEstimate: { $exists: true },
        priority: { $exists: true },
        sequence: { $exists: true },
        dependencies: { $exists: true },
        geofenceValidation: { $exists: true }
      });

      expect(totalRecordsBefore).toBe(4);
      expect(recordsWithFieldsBefore).toBe(1);

      // Run migration
      const migrationResult = await WorkerTaskAssignment.updateMany(
        {
          $or: [
            { dailyTarget: { $exists: false } },
            { workArea: { $exists: false } },
            { floor: { $exists: false } },
            { zone: { $exists: false } },
            { timeEstimate: { $exists: false } },
            { priority: { $exists: false } },
            { sequence: { $exists: false } },
            { dependencies: { $exists: false } },
            { geofenceValidation: { $exists: false } }
          ]
        },
        {
          $set: {
            dailyTarget: {
              description: 'Task completion',
              quantity: 1,
              unit: 'task',
              targetCompletion: 100
            },
            workArea: 'General Area',
            floor: 'Ground Floor',
            zone: 'A',
            timeEstimate: {
              estimated: 480,
              elapsed: 0,
              remaining: 480
            },
            priority: 'medium',
            sequence: 1,
            dependencies: [],
            geofenceValidation: {
              required: true,
              lastValidated: null,
              validationLocation: {
                latitude: null,
                longitude: null
              }
            }
          }
        }
      );

      // Check counts after migration
      const totalRecordsAfter = await WorkerTaskAssignment.countDocuments();
      const recordsWithFieldsAfter = await WorkerTaskAssignment.countDocuments({
        dailyTarget: { $exists: true },
        workArea: { $exists: true },
        floor: { $exists: true },
        zone: { $exists: true },
        timeEstimate: { $exists: true },
        priority: { $exists: true },
        sequence: { $exists: true },
        dependencies: { $exists: true },
        geofenceValidation: { $exists: true }
      });

      expect(migrationResult.modifiedCount).toBe(3);
      expect(totalRecordsAfter).toBe(4);
      expect(recordsWithFieldsAfter).toBe(4); // All records should now have the fields
      expect(totalRecordsAfter).toBe(recordsWithFieldsAfter); // Migration complete
    });
  });
});