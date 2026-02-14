/**
 * Simple integration test for workforce count endpoint
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';
const TEST_SUPERVISOR_ID = 1;

async function testWorkforceEndpoint() {
  try {
    console.log('Testing workforce count endpoint...');
    
    // Test the endpoint
    const response = await axios.get(`${BASE_URL}/api/supervisor/${TEST_SUPERVISOR_ID}/workforce-count`, {
      headers: {
        'Authorization': 'Bearer test-token' // This would need a real token in production
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    // Validate response structure
    const data = response.data;
    const requiredFields = ['total', 'present', 'absent', 'late', 'onLeave', 'overtime', 'lastUpdated'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate data types
    if (typeof data.total !== 'number' || 
        typeof data.present !== 'number' ||
        typeof data.absent !== 'number' ||
        typeof data.late !== 'number' ||
        typeof data.onLeave !== 'number' ||
        typeof data.overtime !== 'number') {
      throw new Error('Invalid data types in response');
    }

    console.log('✅ Workforce count endpoint test passed!');
    console.log(`Total workers: ${data.total}`);
    console.log(`Present: ${data.present}, Absent: ${data.absent}, Late: ${data.late}`);
    console.log(`On Leave: ${data.onLeave}, Overtime: ${data.overtime}`);

  } catch (error) {
    if (error.response) {
      console.error('❌ HTTP Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error: Server not responding');
      console.log('Make sure the backend server is running on port 5001');
    } else {
      console.error('❌ Test Error:', error.message);
    }
  }
}

// Test with date parameter
async function testWorkforceEndpointWithDate() {
  try {
    console.log('\nTesting workforce count endpoint with date parameter...');
    
    const testDate = '2024-01-15';
    const response = await axios.get(`${BASE_URL}/api/supervisor/${TEST_SUPERVISOR_ID}/workforce-count?date=${testDate}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('Response with date parameter:', JSON.stringify(response.data, null, 2));
    console.log('✅ Date parameter test passed!');

  } catch (error) {
    if (error.response) {
      console.error('❌ HTTP Error with date:', error.response.status, error.response.data);
    } else {
      console.error('❌ Date test error:', error.message);
    }
  }
}

// Run tests
console.log('Starting workforce count endpoint tests...');
console.log('Note: These tests require the backend server to be running');

await testWorkforceEndpoint();
await testWorkforceEndpointWithDate();

console.log('\nTests completed!');