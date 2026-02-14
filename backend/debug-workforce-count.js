import mongoose from 'mongoose';
import appConfig from './src/config/app.config.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Project from './src/modules/project/models/Project.js';

/**
 * Debug script to understand why workforce count is returning 0
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  debugWorkforceCount();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function debugWorkforceCount() {
  try {
    console.log('🔍 Debugging workforce count calculation...\n');

    const supervisorId = 4;
    
    // Get projects for supervisor
    const projects = await Project.find({ supervisorId: Number(supervisorId) });
    const projectIds = projects.map(p => p.id);
    
    console.log(`👨‍💼 Supervisor ID: ${supervisorId}`);
    console.log(`📋 Project IDs: ${projectIds.join(', ')}`);
    
    // Get current date boundaries
    const currentDate = new Date();
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayDateString = todayStart.toISOString().split('T')[0];
    
    console.log(`📅 Today: ${todayDateString}`);
    console.log(`⏰ Time range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}\n`);

    // Debug the exact query used in getWorkforceCount
    console.log('🔍 Debugging WorkerTaskAssignment query...');
    
    // First, let's see all assignments for today
    const allAssignmentsToday = await WorkerTaskAssignment.find({
      date: todayDateString
    });
    
    console.log(`📊 Total assignments for ${todayDateString}: ${allAssignmentsToday.length}`);
    
    if (allAssignmentsToday.length > 0) {
      console.log('📝 All assignments:');
      for (const assignment of allAssignmentsToday) {
        console.log(`   - Assignment ID: ${assignment.id}, Project ID: ${assignment.projectId}, Employee ID: ${assignment.employeeId}, Date: ${assignment.date}`);
      }
    }
    
    // Now let's try the exact query from getWorkforceCount
    console.log('\n🔍 Testing the exact getWorkforceCount query...');
    
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds },
      date: {
        $gte: todayDateString,
        $lte: todayDateString
      }
    }).distinct('employeeId');
    
    console.log(`📊 Assignments matching supervisor's projects: ${assignments.length}`);
    console.log(`👥 Employee IDs: ${assignments.join(', ')}`);
    
    // Let's also try a simpler query
    console.log('\n🔍 Testing simpler query...');
    
    const simpleAssignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds },
      date: todayDateString
    });
    
    console.log(`📊 Simple query results: ${simpleAssignments.length}`);
    
    if (simpleAssignments.length > 0) {
      console.log('📝 Simple query assignments:');
      for (const assignment of simpleAssignments) {
        console.log(`   - Assignment ID: ${assignment.id}, Project ID: ${assignment.projectId}, Employee ID: ${assignment.employeeId}`);
      }
    }
    
    // Let's check each project individually
    console.log('\n🔍 Checking each project individually...');
    
    for (const projectId of projectIds) {
      const projectAssignments = await WorkerTaskAssignment.find({
        projectId: projectId,
        date: todayDateString
      });
      
      console.log(`📋 Project ${projectId}: ${projectAssignments.length} assignments`);
      
      if (projectAssignments.length > 0) {
        for (const assignment of projectAssignments) {
          console.log(`   - Employee ${assignment.employeeId}, Status: ${assignment.status}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging workforce count:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});