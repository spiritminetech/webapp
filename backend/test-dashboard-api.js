import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://smterp:smterp123@cluster0.fvfmm.mongodb.net/smt_erp?retryWrites=true&w=majority';

async function testDashboardAPI() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const supervisorId = 4;
    
    console.log(`📅 Testing dashboard API for supervisor ${supervisorId}`);

    // Import the controller function
    const { getSupervisorDashboard } = await import('./src/modules/supervisor/supervisorDashboardController.js');
    
    // Mock request and response objects
    const req = {
      params: { id: supervisorId.toString() },
      query: {}
    };
    
    let responseData = null;
    let statusCode = 200;
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: (code) => {
        statusCode = code;
        return res;
      }
    };
    
    // Call the API function
    await getSupervisorDashboard(req, res);
    
    console.log(`📊 Dashboard API Response (Status: ${statusCode}):`);
    console.log(JSON.stringify(responseData, null, 2));

    // Check projects specifically
    if (responseData && responseData.success && responseData.data) {
      const projects = responseData.data.projects || [];
      console.log(`\n📋 Projects Analysis:`);
      console.log(`Total projects: ${projects.length}`);
      
      projects.forEach((project, index) => {
        console.log(`\nProject ${index + 1}:`);
        console.log(`  - ID: ${project.id || project.projectId}`);
        console.log(`  - Name: ${project.projectName || project.name}`);
        console.log(`  - Worker Count: ${project.workerCount}`);
        console.log(`  - Status: ${project.status}`);
        console.log(`  - Address: ${project.address || project.location}`);
      });
    }

    console.log('\n🎉 Dashboard API test completed!');

  } catch (error) {
    console.error('❌ Error testing dashboard API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
testDashboardAPI();