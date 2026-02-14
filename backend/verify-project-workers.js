import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Project from './src/modules/project/models/Project.js';
import appConfig from './src/config/app.config.js';

/**
 * Script to verify the worker assignments for projects
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  verifyProjectWorkers();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function verifyProjectWorkers() {
  try {
    console.log('🔍 Verifying project worker assignments...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Checking assignments for date: ${today}\n`);

    // Get all projects
    const projects = await Project.find().sort({ id: 1 });
    
    for (const project of projects) {
      console.log(`📋 Project: ${project.projectName} (ID: ${project.id})`);
      console.log(`   Location: ${project.address}`);
      console.log(`   Status: ${project.status}`);
      
      // Get worker assignments for this project
      const assignments = await WorkerTaskAssignment.find({
        projectId: project.id,
        date: today
      }).populate('employeeId');

      console.log(`   👥 Workers assigned: ${assignments.length}`);
      
      if (assignments.length > 0) {
        console.log('   📝 Worker details:');
        for (const assignment of assignments) {
          // Get employee details
          const employee = await Employee.findOne({ id: assignment.employeeId });
          if (employee) {
            console.log(`     - ${employee.fullName} (ID: ${employee.id}) - ${employee.jobTitle || 'Worker'}`);
            console.log(`       Status: ${assignment.status}, Priority: ${assignment.priority}`);
            console.log(`       Work Area: ${assignment.workArea || 'Not specified'}`);
          } else {
            console.log(`     - Employee ID ${assignment.employeeId} (Employee not found)`);
          }
        }
      } else {
        console.log('   ⚠️ No workers assigned to this project');
      }
      console.log(''); // Empty line for readability
    }

    // Summary statistics
    const totalAssignments = await WorkerTaskAssignment.countDocuments({ date: today });
    const totalEmployees = await Employee.countDocuments({ status: 'ACTIVE' });
    const totalProjects = await Project.countDocuments();

    console.log('📊 Summary Statistics:');
    console.log(`   Total Projects: ${totalProjects}`);
    console.log(`   Total Active Employees: ${totalEmployees}`);
    console.log(`   Total Assignments Today: ${totalAssignments}`);
    console.log(`   Assignment Rate: ${((totalAssignments / totalEmployees) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error verifying project workers:', error);
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