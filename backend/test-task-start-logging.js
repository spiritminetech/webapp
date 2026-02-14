/**
 * Test script to verify task start logging functionality
 */

import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Project from './src/modules/project/models/Project.js';
import Task from './src/modules/task/Task.js';
import LocationLog from './src/modules/attendance/LocationLog.js';
import { startWorkerTask } from './src/modules/worker/workerController.js';

async function testTaskStartLogging() {
  try {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_task_start_logging';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to test database');

    // Clear existing test data
    await Employee.deleteMany({});
    await WorkerTaskAssignment.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await LocationLog.deleteMany({});
    console.log('✅ Cleared existing test data');

    // Create test data
    const testEmployee = await Employee.create({
      id: 1,
      userId: 100,
      companyId: 1,
      fullName: 'Test Worker',
      status: 'ACTIVE',
      jobTitle: 'Construction Worker'
    });

    const testProject = await Project.create({
      id: 1,
      projectName: 'Test Construction Project',
      projectCode: 'TCP-001',
      address: 'Test Site Location',
      latitude: 40.7128,
      longitude: -74.0060,
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

    const testTask = await Task.create({
      id: 1,
      taskName: 'Test Task',
      taskType: 'WORK',
      description: 'Test task description'
    });

    const testAssignment = await WorkerTaskAssignment.create({
      id: 1,
      employeeId: testEmployee.id,
      projectId: testProject.id,
      taskId: testTask.id,
      supervisorId: 2,
      date: new Date().toISOString().split('T')[0],
      status: 'queued',
      progressPercent: 0,
      workArea: 'Zone A',
      floor: 'Floor 1',
      zone: 'A',
      priority: 'medium',
      sequence: 1,
      dependencies: [],
      timeEstimate: {
        estimated: 240,
        elapsed: 0,
        remaining: 240
      }
    });

    console.log('✅ Created test data');

    // Test task start with location logging
    const mockReq = {
      user: { userId: 100, companyId: 1 },
      body: {
        assignmentId: testAssignment.id,
        location: {
          latitude: 40.7130, // Inside geofence
          longitude: -74.0058,
          accuracy: 5,
          timestamp: new Date().toISOString()
        }
      }
    };

    const mockRes = {
      json: jest.fn ? jest.fn() : (data) => {
        console.log('✅ Response:', JSON.stringify(data, null, 2));
        return mockRes;
      },
      status: jest.fn ? jest.fn().mockReturnThis() : (code) => {
        console.log('Status:', code);
        return mockRes;
      }
    };

    console.log('🚀 Starting task...');
    await startWorkerTask(mockReq, mockRes);

    // Verify location log was created
    const locationLog = await LocationLog.findOne({
      employeeId: testEmployee.id,
      logType: 'TASK_START'
    });

    if (locationLog) {
      console.log('✅ Location log created successfully:');
      console.log('  - ID:', locationLog.id);
      console.log('  - Employee ID:', locationLog.employeeId);
      console.log('  - Project ID:', locationLog.projectId);
      console.log('  - Latitude:', locationLog.latitude);
      console.log('  - Longitude:', locationLog.longitude);
      console.log('  - Accuracy:', locationLog.accuracy);
      console.log('  - Inside Geofence:', locationLog.insideGeofence);
      console.log('  - Log Type:', locationLog.logType);
      console.log('  - Task Assignment ID:', locationLog.taskAssignmentId);
      console.log('  - Created At:', locationLog.createdAt);
    } else {
      console.log('❌ Location log was not created');
    }

    // Verify assignment was updated
    const updatedAssignment = await WorkerTaskAssignment.findOne({ id: testAssignment.id });
    if (updatedAssignment) {
      console.log('✅ Assignment updated successfully:');
      console.log('  - Status:', updatedAssignment.status);
      console.log('  - Start Time:', updatedAssignment.startTime);
      console.log('  - Geofence Validation:', updatedAssignment.geofenceValidation);
    } else {
      console.log('❌ Assignment was not updated');
    }

    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run the test
testTaskStartLogging();