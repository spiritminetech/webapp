import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema inline
const WorkerTaskAssignmentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  projectId: { type: Number, required: true },
  employeeId: { type: Number, required: true },
  supervisorId: { type: Number },
  vehicleId: { type: Number, default: null },
  taskId: { type: Number, default: null },
  date: { type: String, required: true },
  status: { type: String, default: 'queued', enum: ['queued', 'in_progress', 'completed'] },
  companyId: { type: Number },
  createdAt: { type: Date, default: Date.now },
  startTime: { type: Date },
  endTime: { type: Date },
  assignedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },
  
  // New mobile fields
  dailyTarget: {
    description: String,
    quantity: Number,
    unit: String,
    targetCompletion: { type: Number, default: 100 }
  },
  workArea: String,
  floor: String,
  zone: String,
  timeEstimate: {
    estimated: Number,
    elapsed: Number,
    remaining: Number
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  sequence: Number,
  dependencies: [Number],
  geofenceValidation: {
    required: { type: Boolean, default: true },
    lastValidated: Date,
    validationLocation: {
      latitude: Number,
      longitude: Number
    }
  }
}, {
  collection: 'workerTaskAssignment',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const WorkerTaskAssignment = mongoose.model('WorkerTaskAssignment', WorkerTaskAssignmentSchema);

async function testMigration() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('🔄 Testing migration logic...');

    // Step 1: Check current state
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

    console.log(`📊 Current state:`);
    console.log(`   Total records: ${totalRecordsBefore}`);
    console.log(`   Records with mobile fields: ${recordsWithFieldsBefore}`);
    console.log(`   Records needing migration: ${totalRecordsBefore - recordsWithFieldsBefore}`);

    if (totalRecordsBefore === 0) {
      console.log('ℹ️  No records found. Creating test records to demonstrate migration...');
      
      // Create test records without mobile fields (simulating old records)
      await mongoose.connection.collection('workerTaskAssignment').insertMany([
        {
          id: 9001,
          projectId: 100,
          employeeId: 200,
          supervisorId: 300,
          date: '2024-01-27',
          status: 'queued',
          companyId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 9002,
          projectId: 101,
          employeeId: 201,
          supervisorId: 301,
          date: '2024-01-27',
          status: 'in_progress',
          companyId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      console.log('✅ Created 2 test records without mobile fields');
    }

    // Step 2: Run migration
    console.log('🔄 Running migration...');
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

    console.log(`✅ Migration completed!`);
    console.log(`📊 Migration results:`);
    console.log(`   Records modified: ${migrationResult.modifiedCount}`);
    console.log(`   Matched count: ${migrationResult.matchedCount}`);

    // Step 3: Verify migration
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

    console.log(`📊 Final state:`);
    console.log(`   Total records: ${totalRecordsAfter}`);
    console.log(`   Records with mobile fields: ${recordsWithFieldsAfter}`);
    console.log(`   Migration complete: ${totalRecordsAfter === recordsWithFieldsAfter ? '✅ Yes' : '❌ No'}`);

    // Step 4: Show sample migrated record
    const sampleRecord = await WorkerTaskAssignment.findOne({}).lean();
    if (sampleRecord) {
      console.log(`📋 Sample migrated record:`);
      console.log(`   ID: ${sampleRecord.id}`);
      console.log(`   Daily Target: ${sampleRecord.dailyTarget?.description}`);
      console.log(`   Work Area: ${sampleRecord.workArea}`);
      console.log(`   Floor: ${sampleRecord.floor}`);
      console.log(`   Zone: ${sampleRecord.zone}`);
      console.log(`   Priority: ${sampleRecord.priority}`);
      console.log(`   Time Estimate: ${sampleRecord.timeEstimate?.estimated} minutes`);
      console.log(`   Geofence Required: ${sampleRecord.geofenceValidation?.required}`);
    }

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
    return {
      success: true,
      totalRecords: totalRecordsAfter,
      recordsWithFields: recordsWithFieldsAfter,
      modifiedCount: migrationResult.modifiedCount,
      migrationComplete: totalRecordsAfter === recordsWithFieldsAfter
    };

  } catch (error) {
    console.error('❌ Migration test failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    throw error;
  }
}

// Run the migration test
testMigration()
  .then((result) => {
    console.log('🎉 Migration test completed successfully!');
    console.log('📊 Final Results:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration test failed:', error);
    process.exit(1);
  });