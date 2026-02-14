#!/usr/bin/env node

/**
 * Test script to verify enhanced error handling and validation
 * in the worker controller
 */

import { 
  validateAuthData, 
  validateDateString, 
  validateProgressPercentage,
  validateNumericValue,
  validateStringField,
  validateCoordinates
} from './utils/validationUtil.js';

console.log('🧪 Testing Enhanced Validation Functions...\n');

// Test 1: Auth Data Validation
console.log('1. Testing Auth Data Validation:');
const validAuth = { user: { userId: 1, companyId: 1 } };
const invalidAuth = { user: { userId: "invalid", companyId: 1 } };

console.log('  ✅ Valid auth:', validateAuthData(validAuth).isValid);
console.log('  ❌ Invalid auth:', validateAuthData(invalidAuth).isValid);
console.log('  Error:', validateAuthData(invalidAuth).error);

// Test 2: Date String Validation
console.log('\n2. Testing Date String Validation:');
const validDate = '2024-01-27';
const invalidDate = 'invalid-date';
const futureDate = '2025-12-31';

console.log('  ✅ Valid date:', validateDateString(validDate).isValid);
console.log('  ❌ Invalid format:', validateDateString(invalidDate).isValid);
console.log('  ❌ Future date:', validateDateString(futureDate, false).isValid);

// Test 3: Progress Percentage Validation
console.log('\n3. Testing Progress Percentage Validation:');
const validProgress = 75;
const invalidProgress = 150;
const negativeProgress = -10;

console.log('  ✅ Valid progress (75%):', validateProgressPercentage(validProgress).percentage);
console.log('  🔧 Clamped progress (150% -> 100%):', validateProgressPercentage(invalidProgress).percentage);
console.log('  🔧 Clamped progress (-10% -> 0%):', validateProgressPercentage(negativeProgress).percentage);

// Test 4: Numeric Value Validation
console.log('\n4. Testing Numeric Value Validation:');
const validRadius = 100;
const invalidRadius = -50;
const largeRadius = 50000;

console.log('  ✅ Valid radius:', validateNumericValue(validRadius, { min: 1, max: 10000 }).value);
console.log('  🔧 Clamped radius (negative):', validateNumericValue(invalidRadius, { min: 1, max: 10000, default: 100 }).value);
console.log('  🔧 Clamped radius (too large):', validateNumericValue(largeRadius, { min: 1, max: 10000 }).value);

// Test 5: String Field Validation
console.log('\n5. Testing String Field Validation:');
const validString = 'Test Project';
const longString = 'A'.repeat(1500);
const nullString = null;

console.log('  ✅ Valid string:', validateStringField(validString).value);
console.log('  🔧 Truncated string length:', validateStringField(longString, { maxLength: 100 }).value.length);
console.log('  🔧 Default for null:', validateStringField(nullString, { default: 'N/A' }).value);

// Test 6: Coordinates Validation
console.log('\n6. Testing Coordinates Validation:');
const validCoords = validateCoordinates(40.7128, -74.0060);
const invalidLat = validateCoordinates(91, -74.0060);
const invalidLng = validateCoordinates(40.7128, 181);

console.log('  ✅ Valid coordinates:', validCoords.isValid);
console.log('  ❌ Invalid latitude:', invalidLat.isValid, '- Error:', invalidLat.error);
console.log('  ❌ Invalid longitude:', invalidLng.isValid, '- Error:', invalidLng.error);

console.log('\n🎉 All validation tests completed!');
console.log('\n📋 Summary of Enhanced Error Handling Features:');
console.log('  • Comprehensive input validation using utility functions');
console.log('  • Consistent error response format with error codes');
console.log('  • Data sanitization and clamping for invalid values');
console.log('  • Graceful handling of missing or corrupted data');
console.log('  • Detailed logging for debugging and monitoring');
console.log('  • File upload validation (type, size, count limits)');
console.log('  • Progress validation (no decrease allowed)');
console.log('  • Geofence coordinate validation and sanitization');
console.log('  • Response structure validation before sending');