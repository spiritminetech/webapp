// Test script to verify all API integrations are working
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// Test credentials
const testCredentials = {
  email: 'testworker@company.com',
  password: 'password123'
};

let authToken = null;

async function login() {
  try {
    console.log('🔐 Testing login...');
    const response = await axios.post(`${API_BASE}/auth/login`, testCredentials);
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTodaysTasks() {
  try {
    console.log('\n📋 Testing today\'s tasks endpoint...');
    const response = await axios.get(`${API_BASE}/worker/tasks/today`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Today\'s tasks endpoint working');
      console.log(`   - Found ${response.data.data.tasks?.length || 0} tasks`);
      console.log(`   - Project: ${response.data.data.project?.name || 'N/A'}`);
      return response.data.data.tasks?.[0]; // Return first task for further testing
    } else {
      console.log('❌ Today\'s tasks failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Today\'s tasks error:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGeofenceValidation() {
  try {
    console.log('\n📍 Testing geofence validation...');
    const response = await axios.get(`${API_BASE}/worker/geofence/validate`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        latitude: 40.7130,
        longitude: -74.0058,
        accuracy: 5
      }
    });
    
    if (response.data.success) {
      console.log('✅ Geofence validation working');
      console.log(`   - Inside geofence: ${response.data.data.insideGeofence}`);
      console.log(`   - Distance: ${Math.round(response.data.data.distance || 0)}m`);
      return true;
    } else {
      console.log('❌ Geofence validation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Geofence validation error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTaskStart(task) {
  if (!task) {
    console.log('\n⏭️ Skipping task start test - no task available');
    return false;
  }

  try {
    console.log('\n🚀 Testing task start...');
    const response = await axios.post(`${API_BASE}/worker/task/start`, {
      assignmentId: task.assignmentId,
      location: {
        latitude: 40.7130,
        longitude: -74.0058,
        accuracy: 5,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Task start working');
      console.log(`   - Task ${task.assignmentId} started successfully`);
      return true;
    } else {
      console.log('❌ Task start failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Task start error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testProgressUpdate(task) {
  if (!task) {
    console.log('\n⏭️ Skipping progress update test - no task available');
    return false;
  }

  try {
    console.log('\n📈 Testing progress update...');
    const response = await axios.post(`${API_BASE}/worker/task-progress`, {
      assignmentId: task.assignmentId,
      progressPercent: 25,
      description: 'Test progress update from API integration test',
      notes: 'This is a test note',
      location: {
        latitude: 40.7130,
        longitude: -74.0058,
        accuracy: 5,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Progress update working');
      console.log(`   - Progress updated to 25%`);
      return true;
    } else {
      console.log('❌ Progress update failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Progress update error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testIssueReporting(task) {
  if (!task) {
    console.log('\n⏭️ Skipping issue reporting test - no task available');
    return false;
  }

  try {
    console.log('\n⚠️ Testing issue reporting...');
    const response = await axios.post(`${API_BASE}/worker/task/issue`, {
      assignmentId: task.assignmentId,
      issueType: 'technical_problem',
      priority: 'medium',
      description: 'Test issue report from API integration test - this is a test issue to verify the endpoint is working correctly.',
      location: {
        latitude: 40.7130,
        longitude: -74.0058,
        workArea: task.workArea || 'Test Area'
      }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Issue reporting working');
      console.log(`   - Issue ticket: ${response.data.data.ticketNumber}`);
      console.log(`   - Issue ID: ${response.data.data.issueId}`);
      return true;
    } else {
      console.log('❌ Issue reporting failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Issue reporting error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting API Integration Tests');
  console.log('=====================================\n');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Get today's tasks
  const firstTask = await testTodaysTasks();

  // Step 3: Test geofence validation
  await testGeofenceValidation();

  // Step 4: Test task start (if task available)
  await testTaskStart(firstTask);

  // Step 5: Test progress update (if task available)
  await testProgressUpdate(firstTask);

  // Step 6: Test issue reporting (if task available)
  await testIssueReporting(firstTask);

  console.log('\n🏁 API Integration Tests Complete');
  console.log('=====================================');
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
});