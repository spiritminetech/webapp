import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const addThirdTaskAssignment = async () => {
  try {
    console.log('📝 Adding third task assignment...\n');

    const today = new Date().toISOString().split('T')[0];

    // Check if third assignment already exists
    const existingAssignments = await WorkerTaskAssignment.find({
      employeeId: 1,
      date: today
    });

    console.log(`Found ${existingAssignments.length} existing assignments for today`);

    if (existingAssignments.length >= 3) {
      console.log('✅ All 3 task assignments already exist');
      return;
    }

    // Create the third assignment
    const assignment = new WorkerTaskAssignment({
      id: 13,
      employeeId: 1,
      taskId: 84367, // Quality Inspection task
      projectId: 1001,
      supervisorId: 2,
      companyId: 1,
      date: today,
      status: 'queued',
      
      workArea: 'Zone A',
      floor: 'All Floors',
      zone: 'A',
      priority: 'medium',
      sequence: 3,
      
      dailyTarget: {
        description: 'Complete full inspection',
        quantity: 1,
        unit: 'inspection',
        targetCompletion: 100
      },
      
      timeEstimate: {
        estimated: 120, // 2 hours
        elapsed: 0,
        remaining: 120
      },
      
      dependencies: [11, 12], // Depends on first two tasks
      
      geofenceValidation: {
        required: true,
        lastValidated: null
      },
      
      assignedAt: new Date()
    });

    await assignment.save();
    console.log('✅ Created third task assignment (Quality Inspection)');

  } catch (error) {
    console.error('❌ Error adding third task assignment:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await addThirdTaskAssignment();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});