import mongoose from 'mongoose';
import appConfig from './src/config/app.config.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import supervisorDashboardService from './src/modules/supervisor/supervisorDashboardService.js';

/**
 * Debug script to test the exact query used in the route
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  debugRouteQuery();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function debugRouteQuery() {
  try {
    console.log('🔍 Testing exact route query logic...\n');

    const supervisorId = 4;
    
    // Get projects (same as route)
    const projects = await supervisorDashboardService.getAssignedProjects(Number(supervisorId));
    console.log(`📋 Found ${projects.length} projects for supervisor ${supervisorId}`);
    
    // Get current date (same as route)
    const todayDateString = new Date().toISOString().split('T')[0];
    console.log(`📅 Today date string: ${todayDateString}`);
    
    // Test the exact query for each project
    console.log('\n🔍 Testing worker count queries:');
    
    for (const project of projects) {
      console.log(`\n📋 Project: ${project.projectName} (ID: ${project.id})`);
      
      // This is the exact query from the route
      const workerCount = await WorkerTaskAssignment.countDocuments({
        projectId: project.id,
        date: todayDateString
      });
      
      console.log(`   👥 Worker count: ${workerCount}`);
      
      // Let's also see the actual assignments
      const assignments = await WorkerTaskAssignment.find({
        projectId: project.id,
        date: todayDateString
      });
      
      console.log(`   📝 Assignments found: ${assignments.length}`);
      
      if (assignments.length > 0) {
        for (const assignment of assignments) {
          console.log(`      - Assignment ID: ${assignment.id}, Employee: ${assignment.employeeId}, Date: ${assignment.date}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging route query:', error);
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