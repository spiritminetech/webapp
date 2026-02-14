import mongoose from 'mongoose';
import dotenv from 'dotenv';
import supervisorDashboardService from './src/modules/supervisor/supervisorDashboardService.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://smterp:smterp123@cluster0.fvfmm.mongodb.net/smt_erp?retryWrites=true&w=majority';

async function testProjectsAPI() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const supervisorId = 4;
    const todayDateString = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Testing projects API for supervisor ${supervisorId} on ${todayDateString}`);

    // Test the exact logic from the API endpoint
    console.log('\n🔍 Step 1: Getting projects from supervisorDashboardService...');
    const projects = await supervisorDashboardService.getAssignedProjects(Number(supervisorId));
    console.log(`Found ${projects.length} projects:`);
    projects.forEach(p => console.log(`   - ${p.projectName} (ID: ${p.id})`));

    console.log('\n🔍 Step 2: Getting project IDs...');
    const projectIds = projects.map(p => p.id);
    console.log('Project IDs:', projectIds);

    console.log('\n🔍 Step 3: Counting worker assignments for each project...');
    const projectsWithWorkerCounts = await Promise.all(
      projects.map(async (project) => {
        console.log(`\n   Checking project ${project.id} (${project.projectName}):`);
        
        const workerCount = await WorkerTaskAssignment.countDocuments({
          projectId: project.id,
          date: todayDateString
        });
        
        console.log(`   Query: { projectId: ${project.id}, date: "${todayDateString}" }`);
        console.log(`   Worker count: ${workerCount}`);
        
        // Also show the actual assignments
        const assignments = await WorkerTaskAssignment.find({
          projectId: project.id,
          date: todayDateString
        });
        
        console.log(`   Assignments found: ${assignments.length}`);
        assignments.forEach(a => console.log(`     - Employee ${a.employeeId} assigned to task ${a.taskId}`));
        
        return {
          ...project.toObject(),
          workerCount
        };
      })
    );

    console.log('\n📊 Final result:');
    console.log(JSON.stringify(projectsWithWorkerCounts, null, 2));

    // Test the API response format
    const apiResponse = {
      success: true,
      data: projectsWithWorkerCounts
    };

    console.log('\n🌐 API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log('\n🎉 Projects API test completed!');

  } catch (error) {
    console.error('❌ Error testing projects API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
testProjectsAPI();