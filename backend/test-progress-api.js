import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

const testProgressAPI = async () => {
  try {
    console.log('🔍 Testing Progress API with authentication...\n');

    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testworker@company.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }

    console.log('✅ Login successful');
    const token = loginData.token;

    // Step 2: Test the progress API
    console.log('\n2️⃣ Submitting task progress...');
    const progressResponse = await fetch(`${BASE_URL}/worker/task-progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: 11, // First task assignment ID
        progressPercent: 80,
        description: 'Completed 5 more panels in the northeast corner. All panels properly aligned and secured.',
        notes: 'Need more screws for tomorrow',
        location: {
          latitude: 40.7130,
          longitude: -74.0058,
          timestamp: new Date().toISOString()
        }
      })
    });

    const progressData = await progressResponse.json();

    console.log('✅ Progress API Response:');
    console.log('   Status:', progressResponse.status);
    console.log('   Success:', progressData.success);
    
    if (progressData.success) {
      console.log('   Progress ID:', progressData.data?.progressId);
      console.log('   Message:', progressData.message);
    } else {
      console.log('   Error:', progressData.message);
      console.log('   Error Code:', progressData.error);
    }

  } catch (error) {
    console.error('❌ Error testing progress API:', error.message);
  }
};

// Run the test
testProgressAPI();