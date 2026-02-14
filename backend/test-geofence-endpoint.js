/**
 * Test the geofence validation endpoint
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// Test data
const testData = {
  // Mock JWT token (you'll need a real one for actual testing)
  token: 'your-jwt-token-here',
  
  // Test coordinates
  coordinates: {
    // Inside geofence (close to project center)
    inside: {
      latitude: 40.7130,
      longitude: -74.0058
    },
    // Outside geofence (far from project center)
    outside: {
      latitude: 40.7200,
      longitude: -74.0060
    }
  },
  
  projectId: 1
};

async function testGeofenceValidation() {
  console.log('🧪 Testing Geofence Validation Endpoint');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Inside geofence
    console.log('\n📍 Test 1: Location Inside Geofence');
    const insideResponse = await axios.get(`${API_BASE}/worker/geofence/validate`, {
      params: {
        latitude: testData.coordinates.inside.latitude,
        longitude: testData.coordinates.inside.longitude,
        projectId: testData.projectId
      },
      headers: {
        'Authorization': `Bearer ${testData.token}`
      }
    });
    
    console.log('Response:', insideResponse.data);
    console.log(`Distance: ${insideResponse.data.data.distance}m`);
    console.log(`Can start tasks: ${insideResponse.data.data.canStartTasks}`);
    
  } catch (error) {
    console.log('❌ Test 1 Error:', error.response?.data || error.message);
  }
  
  try {
    // Test 2: Outside geofence
    console.log('\n📍 Test 2: Location Outside Geofence');
    const outsideResponse = await axios.get(`${API_BASE}/worker/geofence/validate`, {
      params: {
        latitude: testData.coordinates.outside.latitude,
        longitude: testData.coordinates.outside.longitude,
        projectId: testData.projectId
      },
      headers: {
        'Authorization': `Bearer ${testData.token}`
      }
    });
    
    console.log('Response:', outsideResponse.data);
    console.log(`Distance: ${outsideResponse.data.data.distance}m`);
    console.log(`Can start tasks: ${outsideResponse.data.data.canStartTasks}`);
    
  } catch (error) {
    console.log('❌ Test 2 Error:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Geofence Endpoint Tests Complete!');
}

// Note: This test requires:
// 1. Server to be running on localhost:3001
// 2. Valid JWT token
// 3. Valid project with geofence data in database
console.log('📝 Note: To run this test, you need:');
console.log('1. Server running on localhost:3001');
console.log('2. Valid JWT token');
console.log('3. Valid project with geofence data in database');
console.log('\nUncomment the line below to run the test:');
// testGeofenceValidation();