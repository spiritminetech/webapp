import mongoose from 'mongoose';
import appConfig from './src/config/app.config.js';
import supervisorDashboardService from './src/modules/supervisor/supervisorDashboardService.js';

/**
 * Test script to verify the assigned projects API is working correctly
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  testAssignedProjectsAPI();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function testAssignedProjectsAPI() {
  try {
    console.log('🧪 Testing Assigned Projects API...\n');

    const supervisorId = 4;
    console.log(`👨‍💼 Testing for Supervisor ID: ${supervisorId}`);

    // Call the service method directly (same as the API endpoint)
    const projects = await supervisorDashboardService.getAssignedProjects(supervisorId);
    
    console.log(`\n📊 API Response:`);
    console.log(`   Total projects found: ${projects.length}`);
    
    if (projects.length > 0) {
      console.log('\n📋 Project Details:');
      
      for (const project of projects) {
        console.log(`\n   🏗️ ${project.projectName || 'Unnamed Project'}`);
        console.log(`      ID: ${project.id}`);
        console.log(`      Status: ${project.status}`);
        console.log(`      Location: ${project.address || 'No address'}`);
        console.log(`      👥 Workers Assigned: ${project.workerCount || 0}`);
        
        if (project.workers && project.workers.length > 0) {
          console.log(`      📝 Worker List:`);
          for (const worker of project.workers) {
            console.log(`         - ${worker.fullName} (${worker.jobTitle || 'Worker'})`);
          }
        }
      }
    } else {
      console.log('   ⚠️ No projects found for this supervisor');
    }

    // Test the specific projects we populated
    const expectedProjects = [
      { name: 'Orchard Road Office Tower Maintenance', expectedWorkers: 3 },
      { name: 'Marina Bay Construction Phase 1', expectedWorkers: 2 },
      { name: 'Jurong Industrial Complex Renovation', expectedWorkers: 1 }
    ];

    console.log('\n🎯 Verification against expected data:');
    
    for (const expected of expectedProjects) {
      const found = projects.find(p => 
        p.projectName && p.projectName.includes(expected.name.split(' ')[0])
      );
      
      if (found) {
        const actualWorkers = found.workerCount || 0;
        const status = actualWorkers === expected.expectedWorkers ? '✅' : '❌';
        console.log(`   ${status} ${expected.name}: Expected ${expected.expectedWorkers}, Got ${actualWorkers}`);
      } else {
        console.log(`   ❌ ${expected.name}: Not found in results`);
      }
    }

    console.log('\n🎉 API test completed!');
    
  } catch (error) {
    console.error('❌ Error testing assigned projects API:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});