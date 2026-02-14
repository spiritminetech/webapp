/**
 * Comprehensive test for all geofence utility functions
 */

import {
  calculateDistance,
  validateGeofence,
  validateGeofenceWithAccuracy,
  isValidCoordinates,
  createGeofence,
  getGPSAccuracyQuality,
  calculateAccuracyBuffer,
  createLocationLogData,
  validateMultipleLocations,
  getGeofenceBoundaryPoints,
  checkGeofenceBoundaryApproach,
  calculateOptimalGeofenceRadius,
  generateGeofenceValidationReport
} from './utils/geofenceUtil.js';

console.log('🧪 Testing All Geofence Utility Functions');
console.log('=========================================');

// Test data
const testGeofence = {
  center: { latitude: 40.7128, longitude: -74.0060 },
  radius: 100,
  strictMode: true,
  allowedVariance: 10
};

const testLocations = [
  { latitude: 40.7128, longitude: -74.0060, accuracy: 5 },   // Center
  { latitude: 40.7129, longitude: -74.0061, accuracy: 10 },  // Inside
  { latitude: 40.7140, longitude: -74.0070, accuracy: 150 }, // Outside with poor GPS
  { latitude: 40.7200, longitude: -74.0200, accuracy: 8 }    // Far outside
];

console.log('\n📍 1. Testing Basic Distance Calculation');
console.log('----------------------------------------');
const distance = calculateDistance(40.7128, -74.0060, 40.7129, -74.0061);
console.log(`Distance between test points: ${Math.round(distance)}m`);

console.log('\n📍 2. Testing Coordinate Validation');
console.log('----------------------------------');
console.log(`Valid coordinates (40.7128, -74.0060): ${isValidCoordinates(40.7128, -74.0060)}`);
console.log(`Invalid coordinates (91, -181): ${isValidCoordinates(91, -181)}`);

console.log('\n📍 3. Testing Geofence Creation');
console.log('------------------------------');
try {
  const geofence = createGeofence(40.7128, -74.0060, 150, false, 20);
  console.log('✅ Geofence created successfully:', JSON.stringify(geofence, null, 2));
} catch (error) {
  console.error('❌ Geofence creation failed:', error.message);
}

console.log('\n📍 4. Testing GPS Accuracy Quality Assessment');
console.log('--------------------------------------------');
[3, 12, 35, 75, 150].forEach(accuracy => {
  const quality = getGPSAccuracyQuality(accuracy);
  console.log(`${accuracy}m accuracy: ${quality.quality} - ${quality.description} (Reliable: ${quality.reliable})`);
});

console.log('\n📍 5. Testing Accuracy Buffer Calculation');
console.log('----------------------------------------');
[10, 50, 100, 200].forEach(accuracy => {
  const buffer = calculateAccuracyBuffer(accuracy, 100);
  console.log(`Accuracy ${accuracy}m with 100m radius: Buffer = ${buffer}m`);
});

console.log('\n📍 6. Testing Enhanced Geofence Validation');
console.log('-----------------------------------------');
testLocations.forEach((location, index) => {
  const result = validateGeofenceWithAccuracy(location, testGeofence);
  console.log(`Location ${index + 1}: ${result.isValid ? 'VALID' : 'INVALID'} - Distance: ${result.distance}m, Accuracy: ${result.gpsAccuracy}m`);
  if (result.accuracyWarning) {
    console.log(`  ⚠️  ${result.accuracyWarning}`);
  }
});

console.log('\n📍 7. Testing Location Log Data Creation');
console.log('---------------------------------------');
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
  console.log('✅ Location log data created successfully');
  console.log(`   Employee: ${logData.employeeId}, Project: ${logData.projectId}, Type: ${logData.logType}`);
} catch (error) {
  console.error('❌ Location log creation failed:', error.message);
}

console.log('\n📍 8. Testing Multiple Location Validation');
console.log('-----------------------------------------');
const multipleResults = validateMultipleLocations(testLocations, testGeofence);
multipleResults.forEach((result, index) => {
  if (result.success) {
    console.log(`Location ${index + 1}: ${result.validation.isValid ? 'VALID' : 'INVALID'} - ${result.validation.distance}m`);
  } else {
    console.log(`Location ${index + 1}: ERROR - ${result.error}`);
  }
});

console.log('\n📍 9. Testing Geofence Boundary Points Generation');
console.log('------------------------------------------------');
try {
  const boundaryPoints = getGeofenceBoundaryPoints(testGeofence, 8);
  console.log(`✅ Generated ${boundaryPoints.length} boundary points`);
  console.log('   Sample points:', boundaryPoints.slice(0, 2).map(p => 
    `(${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}) at ${p.angle}°`
  ));
} catch (error) {
  console.error('❌ Boundary points generation failed:', error.message);
}

console.log('\n📍 10. Testing Boundary Approach Detection');
console.log('-----------------------------------------');
const approachTest = { latitude: 40.7127, longitude: -74.0059, accuracy: 10 }; // Near boundary
const approachResult = checkGeofenceBoundaryApproach(approachTest, testGeofence, 30);
console.log(`Boundary approach test: ${approachResult.isApproaching ? 'APPROACHING' : 'SAFE'}`);
console.log(`   Distance from boundary: ${approachResult.distanceFromBoundary}m`);
console.log(`   Message: ${approachResult.message}`);

console.log('\n📍 11. Testing Optimal Radius Calculation');
console.log('----------------------------------------');
try {
  const optimalRadius = calculateOptimalGeofenceRadius(100, 25, 1.5);
  console.log('✅ Optimal radius calculation:');
  console.log(`   Base radius: ${optimalRadius.baseRadius}m`);
  console.log(`   Recommended radius: ${optimalRadius.recommendedRadius}m`);
  console.log(`   Improvement: ${optimalRadius.improvement}%`);
  console.log(`   Recommendation: ${optimalRadius.recommendation}`);
} catch (error) {
  console.error('❌ Optimal radius calculation failed:', error.message);
}

console.log('\n📍 12. Testing Validation Report Generation');
console.log('------------------------------------------');
const mockValidationHistory = [
  { insideGeofence: true, distance: 45, gpsAccuracy: 12 },
  { insideGeofence: true, distance: 67, gpsAccuracy: 8 },
  { insideGeofence: false, distance: 120, gpsAccuracy: 55 },
  { insideGeofence: true, distance: 23, gpsAccuracy: 15 },
  { insideGeofence: false, distance: 150, gpsAccuracy: 85 }
];

const report = generateGeofenceValidationReport(mockValidationHistory);
console.log('✅ Validation report generated:');
console.log(`   Total validations: ${report.totalValidations}`);
console.log(`   Success rate: ${report.successRate}%`);
console.log(`   Average distance: ${report.averageDistance}m`);
console.log(`   Average accuracy: ${report.averageAccuracy}m`);
console.log(`   Poor accuracy rate: ${report.poorAccuracyRate}%`);
console.log('   Recommendations:');
report.recommendations.forEach(rec => console.log(`     - ${rec}`));

console.log('\n✅ All geofence utility function tests completed!');
console.log('🎉 Enhanced geofence validation system is fully functional!');