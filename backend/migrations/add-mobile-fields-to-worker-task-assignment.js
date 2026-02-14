import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema inline to avoid import issues
const WorkerTaskAssignmentSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  projectId: {
    type: Number,
    required: true
  },
  employeeId: {
    type: Number,
    required: true
  },
  supervisorId: {
    type: Number,
  },
  vehicleId: {
    type: Number,
    default: null
  },
  taskId: {
    type: Number,
    default: null
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    default: 'queued',
    enum: ['queued', 'in_progress', 'completed']
  },
  companyId: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }, 
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // New fields for mobile app
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
    estimated: Number, // minutes
    elapsed: Number,
    remaining: Number
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  sequence: Number,
  
  dependencies: [Number], // Array of assignment IDs
  
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

/**
 * Migration script to add default values for new mobile-specific fields
 * to existing WorkerTaskAssignment records
 */
async function migrateMobileFields() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('🔄 Starting migration: Add mobile fields to WorkerTaskAssignment');

    // Update all existing records that don't have the new fields
    const result = await WorkerTaskAssignment.updateMany(
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

    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Updated ${result.modifiedCount} records`);
    
    // Verify the migration
    const totalRecords = await WorkerTaskAssignment.countDocuments();
    const recordsWithNewFields = await WorkerTaskAssignment.countDocuments({
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

    console.log(`📈 Total records: ${totalRecords}`);
    console.log(`📈 Records with new fields: ${recordsWithNewFields}`);

    if (totalRecords === recordsWithNewFields) {
      console.log('✅ All records successfully updated with new fields');
    } else {
      console.log('⚠️  Some records may not have been updated');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateMobileFields()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateMobileFields;