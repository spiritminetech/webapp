import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';
const API_PREFIX = '/api';

// Test endpoints without authentication first
async function testEndpoints() {
  console.log('🧪 Testing Supervisor API Endpoints');
  console.log('=====================================');

  // Test health endpoint first
  try {
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}${API_PREFIX}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.message);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    console.log('🚨 Backend server might not be running on port 5001');
    return;
  }

  // Test supervisor endpoints (should return 401 without auth)
  const endpoints = [
    '/supervisor/4/approvals',
    '/supervisor/4/alerts',
    '/supervisor/4/workforce-count',
    '/supervisor/4/dashboard'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n2. Testing ${endpoint}...`);
      const response = await fetch(`${BASE_URL}${API_PREFIX}${endpoint}`);
      const text = await response.text();
      
      if (response.status === 401) {
        console.log('✅ Endpoint exists (401 - Authentication required)');
      } else if (response.status === 404) {
        console.log('❌ Endpoint not found (404)');
      } else {
        console.log(`📝 Response (${response.status}):`, text.substring(0, 100));
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
  }

  // Test with mock authentication
  console.log('\n3. Testing with mock token...');
  try {
    const mockToken = 'Bearer mock-token-for-testing';
    const response = await fetch(`${BASE_URL}${API_PREFIX}/supervisor/4/approvals`, {
      headers: {
        'Authorization': mockToken,
        'Content-Type': 'application/json'
      }
    });
    const text = await response.text();
    console.log(`📝 Mock auth response (${response.status}):`, text.substring(0, 200));
  } catch (error) {
    console.log('❌ Mock auth test failed:', error.message);
  }
}

testEndpoints().catch(console.error);