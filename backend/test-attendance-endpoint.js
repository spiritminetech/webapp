/**
 * Simple integration test for the attendance summary endpoint
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';
const SUPERVISOR_ID = 1; // Replace with actual supervisor ID

async function testAttendanceEndpoint() {
  try {
    console.log('Testing attendance summary endpoint...');
    
    // Test the endpoint
    const response = await axios.get(`${BASE_URL}/api/supervisor/${SUPERVISOR_ID}/attendance`, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here' // Replace with actual token
      }
    });

    console.log('✅ Endpoint responded successfully');
    console.log('Status:', response.status);
    console.log('Response structure:');
    console.log('- workers:', Array.isArray(response.data.workers) ? `Array(${response.data.workers.length})` : 'Not an array');
    console.log('- summary:', response.data.summary ? 'Object' : 'Missing');
    console.log('- lastUpdated:', response.data.lastUpdated ? 'Present' : 'Missing');
    
    if (response.data.summary) {
      console.log('Summary fields:');
      Object.keys(response.data.summary).forEach(key => {
        console.log(`  - ${key}: ${response.data.summary[key]}`);
      });
    }

    if (response.data.workers.length > 0) {
      console.log('Sample worker data:');
      const worker = response.data.workers[0];
      Object.keys(worker).forEach(key => {
        console.log(`  - ${key}: ${worker[key]}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testAttendanceEndpoint();