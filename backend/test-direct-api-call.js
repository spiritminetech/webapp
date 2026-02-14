import appConfig from './src/config/app.config.js';

/**
 * Test script to directly call the API endpoint without authentication
 * This will help us verify if the API is working correctly
 */

const API_BASE = `http://localhost:${appConfig.server.port}/api`;

async function testDirectApiCall() {
  try {
    console.log('🔍 Testing Direct API Call (bypassing auth)...\n');

    // Test the pending approvals endpoint directly
    console.log('1️⃣ Testing pending approvals endpoint...');
    const response = await fetch(`${API_BASE}/supervisor/4/approvals`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful');
      console.log(`Total approvals: ${data.summary.total}`);
      console.log(`Leave requests: ${data.summary.leave}`);
      console.log('Response structure:', Object.keys(data));
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed');
      console.log('Error response:', errorText);
    }

    // Also test if the endpoint exists
    console.log('\n2️⃣ Testing if endpoint exists...');
    const optionsResponse = await fetch(`${API_BASE}/supervisor/4/approvals`, {
      method: 'OPTIONS'
    });
    console.log(`OPTIONS response: ${optionsResponse.status}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDirectApiCall();