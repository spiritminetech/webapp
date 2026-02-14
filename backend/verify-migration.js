import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema
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

async function verifyMigration() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('🔍 Checking migration status...');

    // Check total records
    const totalRecords = await WorkerTaskAssignment.countDocuments();
    console.log(`📊 Total WorkerTaskAssignment records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('ℹ️  No records found in the database.');
      console.log('✅ Migration task is complete - no existing records need updating.');
      await mongoose.connection.close();
      return { success: true, message: 'No records to migrate' };
    }

    // Check records with all mobile fields
    const recordsWithAllFields = await WorkerTaskAssignment.countDocuments({
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

    console.log(`📊 Records with all mobile fields: ${recordsWithAllFields}`);

    // Check records missing any mobile fields
    const recordsMissingFields = await WorkerTaskAssignment.countDocuments({
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
    });

    console.log(`📊 Records missing mobile fields: ${recordsMissingFields}`);

    // Calculate migration progress
    const migrationProgress = totalRecords > 0 ? (recordsWithAllFields / totalRecords * 100).toFixed(2) : 0;
    console.log(`📈 Migration progress: ${migrationProgress}%`);

    // Show sample records
    if (recordsWithAllFields > 0) {
      console.log('\n📋 Sample record with mobile fields:');
      const sampleWithFields = await WorkerTaskAssignment.findOne({
        dailyTarget: { $exists: true },
        workArea: { $exists: true }
      }).lean();
      
      if (sampleWithFields) {
        console.log(`   ID: ${sampleWithFields.id}`);
        console.log(`   Daily Target: ${sampleWithFields.dailyTarget?.description}`);
        console.log(`   Work Area: ${sampleWithFields.workArea}`);
        console.log(`   Floor: ${sampleWithFields.floor}`);
        console.log(`   Zone: ${sampleWithFields.zone}`);
        console.log(`   Priority: ${sampleWithFields.priority}`);
      }
    }

    if (recordsMissingFields > 0) {
      console.log('\n📋 Sample record missing mobile fields:');
      const sampleMissingFields = await WorkerTaskAssignment.findOne({
        $or: [
          { dailyTarget: { $exists: false } },
          { workArea: { $exists: false } }
        ]
      }).lean();
      
      if (sampleMissingFields) {
        console.log(`   ID: ${sampleMissingFields.id}`);
        console.log(`   Has Daily Target: ${sampleMissingFields.dailyTarget ? 'Yes' : 'No'}`);
        console.log(`   Has Work Area: ${sampleMissingFields.workArea ? 'Yes' : 'No'}`);
        console.log(`   Has Priority: ${sampleMissingFields.priority ? 'Yes' : 'No'}`);
      }
    }

    // Migration status
    const migrationComplete = totalRecords === recordsWithAllFields;
    console.log(`\n🎯 Migration Status: ${migrationComplete ? '✅ COMPLETE' : '⚠️  INCOMPLETE'}`);

    if (!migrationComplete) {
      console.log('\n🔧 To complete the migration, run the following update query:');
      console.log('   Use the migration script or API endpoint to update remaining records.');
    }

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
    return {
      success: true,
      totalRecords,
      recordsWithAllFields,
      recordsMissingFields,
      migrationProgress: parseFloat(migrationProgress),
      migrationComplete
    };

  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    throw error;
  }
}

// Export for use in other scripts
export default verifyMigration;

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMigration()
    .then((result) => {
      console.log('\n🎉 Verification completed!');
      console.log('📊 Results:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}