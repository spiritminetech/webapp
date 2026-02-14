import mongoose from 'mongoose';
import { getWorkerTasksToday } from './src/modules/worker/workerController.js';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Project from './src/modules/project/models/Project.js';
import Task from './src/modules/task/Task.js';
import appConfig from './src/config/app.config.js';

// Simple test to verify the endpoint works
async function testEndpoint() {
  try {
    console.log('🧪 Testing getWorkerTasksToday endpoint...');
    
    // Connect to database
    await mongoose.connect(appConfig.database.uri, { 
      dbName: appConfig.database.name,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database');

    const today = new Date().toISOString().split("T")[0];

    // Clean up existing test data
    await Employee.deleteMany({ fullName: 'Test Worker' });
    await Project.deleteMany({ projectName: 'Test Project' });
    await Task.deleteMany({ taskName: 'Test Task' });
    await WorkerTaskAssignment.deleteMany({ employeeId: 9999 });

    // Create test employee
    const employee = await Employee.create({
      id: 9999,
      companyId: 1,
      userId: 9999,
      fullName: 'Test Worker',
      phone: '+1-555-TEST',
      jobTitle: 'Construction Worker',
      status: 'ACTIVE'
    });
    console.log('✅ Created test employee');

    // Create test project
    const project = await Project.create({
      id: 9999,
      companyId: 1,
      projectName: 'Test Project',
      projectCode: 'TEST-001',
      address: 'Test Site',
      latitude: 40.7128,
      longitude: -74.0060,
      geofenceRadius: 100,
      geofence: {
        center: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        radius: 100,
        strictMode: true,
        allowedVariance: 10
      }
    });
    console.log('✅ Created test project');

    // Create test task
    const task = await Task.create({
      id: 9999,
      companyId: 1,
      projectId: 9999,
      taskType: 'WORK',
      taskName: 'Test Task',
      description: 'Test task description',
      status: 'PLANNED'
    });
    console.log('✅ Created test task');

    // Create test assignment
    const assignment = await WorkerTaskAssignment.create({
      id: 9999,
      projectId: 9999,
      employeeId: 9999,
      supervisorId: 2,
      taskId: 9999,
      date: today,
      status: 'queued',
      progressPercent: 0,
      dailyTarget: {
        description: 'Complete test task',
        quantity: 10,
        unit: 'items',
        targetCompletion: 100
      },
      workArea: 'Test Area',
      floor: 'Floor 1',
      zone: 'A',
      timeEstimate: {
        estimated: 120,
        elapsed: 0,
        remaining: 120
      },
      priority: 'medium',
      sequence: 1,
      dependencies: []
    });
    console.log('✅ Created test assignment');

    // Mock request and response
    const mockReq = {
      user: {
        userId: 9999,
        companyId: 1
      }
    };

    let responseData = null;
    let statusCode = 200;

    const mockRes = {
      json: (data) => {
        responseData = data;
        console.log('📤 Response:', JSON.stringify(data, null, 2));
      },
      status: (code) => {
        statusCode = code;
        return mockRes;
      }
    };

    // Call the endpoint
    await getWorkerTasksToday(mockReq, mockRes);

    // Verify response
    if (responseData && responseData.success) {
      console.log('✅ Endpoint test PASSED');
      console.log(`📊 Found ${responseData.data.tasks.length} tasks`);
      console.log(`🏗️ Project: ${responseData.data.project.name}`);
      console.log(`👷 Worker: ${responseData.data.worker.name}`);
    } else {
      console.log('❌ Endpoint test FAILED');
      console.log('Status:', statusCode);
      console.log('Response:', responseData);
    }

    // Clean up test data
    await Employee.deleteMany({ fullName: 'Test Worker' });
    await Project.deleteMany({ projectName: 'Test Project' });
    await Task.deleteMany({ taskName: 'Test Task' });
    await WorkerTaskAssignment.deleteMany({ employeeId: 9999 });
    console.log('🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testEndpoint();