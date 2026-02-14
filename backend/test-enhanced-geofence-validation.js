/**
 * Test script for enhanced geofence validation functionality
 */

import { 
  validateGeofence, 
  validateGeofenceWithAccuracy,
  getGPSAccuracyQuality,
  calculateAccuracyBuffer,
  createLocationLogData
} from './utils/geofenceUtil.js';

console.log('🧪 Testing Enhanced Geofence Validation');
console.log('=====================================');

// Test data
const projectGeofence = {
  center: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  radius: 100,
  strictMode: true,
  allowedVariance: 10
};

const testLocations = [
  {
    name: 'Inside geofence with good GPS',
    location: { latitude: 40.7129, longitude: -74.0061, accuracy: 5 },
    expected: 'valid'
  },
  {
    name: 'Outside geofence with poor GPS',
    location: { latitude: 40.7140, longitude: -74.0070, accuracy: 150 },
    expected: 'might be valid with accuracy consideration'
  },
  {
    name: 'Far outside geofence',
    location: { latitude: 40.7200, longitude: -74.0200, accuracy: 10 },
    expected: 'invalid'
  }
];

console.log('\n📍 Testing GPS Accuracy Quality Assessment');
console.log('------------------------------------------');

const accuracyTests = [5, 15, 50, 100, 200];
accuracyTests.forEach(accuracy => {
  const quality = getGPSAccuracyQuality(accuracy);
  console.log(`Accuracy ${accuracy}m: ${quality.quality} - ${quality.description} (Reliable: ${quality.reliable})`);
});

console.log('\n📍 Testing Accuracy Buffer Calculation');
console.log('-------------------------------------');

accuracyTests.forEach(accuracy => {
  const buffer = calculateAccuracyBuffer(accuracy, 100);
  console.log(`Accuracy ${accuracy}m with 100m radius: Buffer = ${buffer}m`);
});

console.log('\n📍 Testing Enhanced Geofence Validation');
console.log('--------------------------------------');

testLocations.forEach(test => {
  console.log(`\nTest: ${test.name}`);
  
  // Test original validation
  const originalResult = validateGeofence(test.location, projectGeofence);
  console.log(`Original validation: ${originalResult.isValid ? 'VALID' : 'INVALID'} (Distance: ${originalResult.distance}m)`);
  
  // Test enhanced validation with accuracy
  const enhancedResult = validateGeofenceWithAccuracy(test.location, projectGeofence);
  console.log(`Enhanced validation: ${enhancedResult.isValid ? 'VALID' : 'INVALID'} (Distance: ${enhancedResult.distance}m)`);
  
  if (enhancedResult.accuracyWarning) {
    console.log(`⚠️  ${enhancedResult.accuracyWarning}`);
  }
  
  console.log(`Message: ${enhancedResult.message}`);
});

console.log('\n📍 Testing Location Log Data Creation');
console.log('------------------------------------');

try {
  const logData = createLocationLogData({
    employeeId: 123,
    projectId: 456,
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 15,
    insideGeofence: true,
    logType: 'GEOFENCE_VALIDATION',
    taskAssignmentId: 789
  });
  
  console.log('✅ Location log data created successfully:');
  console.log(JSON.stringify(logData, null, 2));
} catch (error) {
  console.error('❌ Failed to create location log data:', error.message);
}

console.log('\n✅ Enhanced geofence validation tests completed!');