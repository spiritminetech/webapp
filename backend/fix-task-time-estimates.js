// Fix task time estimates that are showing as 0h
import mongoose from 'mongoose';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

async function fixTaskTimeEstimates() {
  try {
    await connectDB();

    console.log('🔍 Finding task assignments with missing time estimates...');
    
    // Find all task assignments
    const assignments = await WorkerTaskAssignment.find({});
    console.log(`📋 Found ${assignments.length} task assignments`);

    let updatedCount = 0;

    for (const assignment of assignments) {
      const currentEstimated = assignment.timeEstimate?.estimated || 0;
      
      if (currentEstimated === 0) {
        // Set realistic time estimates based on task type
        let estimatedMinutes = 480; // Default 8 hours
        
        // Customize based on task name or type
        const taskName = assignment.taskName || '';
        if (taskName.toLowerCase().includes('electrical')) {
          estimatedMinutes = 360; // 6 hours for electrical work
        } else if (taskName.toLowerCase().includes('install')) {
          estimatedMinutes = 240; // 4 hours for installation
        } else if (taskName.toLowerCase().includes('inspection')) {
          estimatedMinutes = 120; // 2 hours for inspection
        } else if (taskName.toLowerCase().includes('wiring')) {
          estimatedMinutes = 300; // 5 hours for wiring
        }

        // Update the assignment
        await WorkerTaskAssignment.updateOne(
          { _id: assignment._id },
          {
            $set: {
              'timeEstimate.estimated': estimatedMinutes,
              'timeEstimate.elapsed': assignment.timeEstimate?.elapsed || 0,
              'timeEstimate.remaining': estimatedMinutes - (assignment.timeEstimate?.elapsed || 0)
            }
          }
        );

        console.log(`✅ Updated task: ${taskName || 'Unknown'} - ${Math.round(estimatedMinutes / 60)}h estimated`);
        updatedCount++;
      }
    }

    console.log(`\n🎯 Updated ${updatedCount} task assignments with proper time estimates`);
    
    if (updatedCount > 0) {
      console.log('\n📱 Changes applied:');
      console.log('- Electrical tasks: 6 hours');
      console.log('- Installation tasks: 4 hours');
      console.log('- Inspection tasks: 2 hours');
      console.log('- Wiring tasks: 5 hours');
      console.log('- Other tasks: 8 hours');
      console.log('\n🔄 Refresh your app to see the updated time estimates');
    } else {
      console.log('\n✅ All tasks already have proper time estimates');
    }

  } catch (error) {
    console.error('❌ Error fixing task time estimates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixTaskTimeEstimates();