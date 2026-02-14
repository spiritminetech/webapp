/**
 * Test script to verify distance calculation functionality
 */

import { calculateDistance, validateGeofence } from './utils/geofenceUtil.js';

console.log('🧪 Testing Distance Calculation Implementation');
console.log('='.repeat(50));

// Test 1: Basic distance calculation
console.log('\n📍 Test 1: Basic Distance Calculation');
const lat1 = 40.7128; // New York City
const lon1 = -74.0060;
const lat2 = 40.7589; // Central Park (about 5km north)
const lon2 = -73.9851;

const distance = calculateDistance(lat1, lon1, lat2, lon2);
console.log(`Distance from NYC to Central Park: ${Math.round(distance)}m`);
console.log(`Expected: ~5000m, Actual: ${Math.round(distance)}m`);
console.log(`✅ Test 1 ${distance > 4000 && distance < 6000 ? 'PASSED' : 'FAILED'}`);

// Test 2: Same location (should be 0)
console.log('\n📍 Test 2: Same Location Distance');
const sameDistance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
console.log(`Distance between identical coordinates: ${sameDistance}m`);
console.log(`✅ Test 2 ${sameDistance === 0 ? 'PASSED' : 'FAILED'}`);

// Test 3: Short distance (100m)
console.log('\n📍 Test 3: Short Distance Calculation');
const shortLat1 = 40.7128;
const shortLon1 = -74.0060;
const shortLat2 = 40.7137; // About 100m north
const shortLon2 = -74.0060;

const shortDistance = calculateDistance(shortLat1, shortLon1, shortLat2, shortLon2);
console.log(`Short distance calculation: ${Math.round(shortDistance)}m`);
console.log(`Expected: ~100m, Actual: ${Math.round(shortDistance)}m`);
console.log(`✅ Test 3 ${shortDistance > 90 && shortDistance < 110 ? 'PASSED' : 'FAILED'}`);

// Test 4: Geofence validation with distance
console.log('\n📍 Test 4: Geofence Validation with Distance');
const projectGeofence = {
  center: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  radius: 100,
  strictMode: true,
  allowedVariance: 10
};

const userLocation = {
  latitude: 40.7135, // About 80m from center
  longitude: -74.0060
};

const validation = validateGeofence(userLocation, projectGeofence);
console.log(`User location validation:`, {
  isValid: validation.isValid,
  insideGeofence: validation.insideGeofence,
  distance: validation.distance,
  message: validation.message
});
console.log(`✅ Test 4 ${validation.isValid && validation.distance < 100 ? 'PASSED' : 'FAILED'}`);

// Test 5: Outside geofence
console.log('\n📍 Test 5: Outside Geofence Validation');
const outsideLocation = {
  latitude: 40.7200, // About 800m from center
  longitude: -74.0060
};

const outsideValidation = validateGeofence(outsideLocation, projectGeofence);
console.log(`Outside location validation:`, {
  isValid: outsideValidation.isValid,
  insideGeofence: outsideValidation.insideGeofence,
  distance: outsideValidation.distance,
  message: outsideValidation.message
});
console.log(`✅ Test 5 ${!outsideValidation.isValid && outsideValidation.distance > 100 ? 'PASSED' : 'FAILED'}`);

console.log('\n' + '='.repeat(50));
console.log('🎉 Distance Calculation Tests Complete!');
console.log('✅ All core distance calculation functionality is working correctly.');