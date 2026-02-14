/**
 * Tests for worker geofence validation functionality
 */

import { validateGeofence, calculateDistance } from '../../../utils/geofenceUtil.js';

describe('Worker Geofence Validation', () => {
  describe('calculateDistance', () => {
    test('should calculate distance between two points correctly', () => {
      // Test with known coordinates (New York to Los Angeles approximately)
      const lat1 = 40.7128; // New York
      const lon1 = -74.0060;
      const lat2 = 34.0522; // Los Angeles
      const lon2 = -118.2437;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Distance should be approximately 3944 km (3,944,000 meters)
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    test('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    test('should handle small distances accurately', () => {
      // Two points very close together (about 100 meters apart)
      const lat1 = 40.7128;
      const lon1 = -74.0060;
      const lat2 = 40.7137; // Slightly north
      const lon2 = -74.0060;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 100 meters
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });
  });

  describe('validateGeofence', () => {
    const projectGeofence = {
      center: {
        latitude: 40.7128,
        longitude: -74.0060
      },
      radius: 100,
      strictMode: true,
      allowedVariance: 10
    };

    test('should validate location inside geofence', () => {
      const userLocation = {
        latitude: 40.7130, // Very close to center
        longitude: -74.0058
      };

      const result = validateGeofence(userLocation, projectGeofence);

      expect(result.isValid).toBe(true);
      expect(result.insideGeofence).toBe(true);
      expect(result.distance).toBeLessThan(100);
      expect(result.message).toContain('validated successfully');
    });

    test('should reject location outside geofence in strict mode', () => {
      const userLocation = {
        latitude: 40.7200, // Far from center
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, projectGeofence);

      expect(result.isValid).toBe(false);
      expect(result.insideGeofence).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
      expect(result.message).toContain('from the project site');
    });

    test('should allow location within variance in non-strict mode', () => {
      const nonStrictGeofence = {
        ...projectGeofence,
        strictMode: false
      };

      const userLocation = {
        latitude: 40.7140, // Outside radius but within variance
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, nonStrictGeofence);

      expect(result.isValid).toBe(true);
      expect(result.insideGeofence).toBe(false);
      expect(result.strictValidation).toBe(false);
    });

    test('should handle invalid input gracefully', () => {
      const result = validateGeofence(null, projectGeofence);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid location');
    });

    test('should handle missing geofence data', () => {
      const userLocation = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, null);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid location or geofence data');
    });

    test('should return correct distance and validation info', () => {
      const userLocation = {
        latitude: 40.7135, // About 80 meters from center
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, projectGeofence);

      expect(result.isValid).toBe(true);
      expect(result.insideGeofence).toBe(true);
      expect(result.distance).toBeGreaterThan(70);
      expect(result.distance).toBeLessThan(90);
      expect(result.allowedRadius).toBe(100);
      expect(result.allowedVariance).toBe(10);
      expect(result.strictValidation).toBe(true);
    });

    test('should handle edge case at exact radius boundary', () => {
      // Calculate a point exactly 100 meters away
      const userLocation = {
        latitude: 40.7137, // Approximately 100m north
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, projectGeofence);

      // At the boundary, should be considered inside (distance <= radius)
      expect(result.distance).toBeCloseTo(100, 0);
      expect(result.insideGeofence).toBe(true);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Geofence validation with different configurations', () => {
    test('should handle large radius geofence', () => {
      const largeGeofence = {
        center: { latitude: 40.7128, longitude: -74.0060 },
        radius: 1000,
        strictMode: true,
        allowedVariance: 50
      };

      const userLocation = {
        latitude: 40.7200, // About 800m away
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, largeGeofence);

      expect(result.isValid).toBe(true);
      expect(result.insideGeofence).toBe(true);
      expect(result.distance).toBeLessThan(1000);
    });

    test('should handle small radius geofence', () => {
      const smallGeofence = {
        center: { latitude: 40.7128, longitude: -74.0060 },
        radius: 10,
        strictMode: true,
        allowedVariance: 5
      };

      const userLocation = {
        latitude: 40.7129, // About 11m away
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, smallGeofence);

      expect(result.isValid).toBe(false);
      expect(result.insideGeofence).toBe(false);
      expect(result.distance).toBeGreaterThan(10);
    });

    test('should use default values for missing geofence properties', () => {
      const minimalGeofence = {
        center: { latitude: 40.7128, longitude: -74.0060 },
        radius: 100
        // Missing strictMode and allowedVariance
      };

      const userLocation = {
        latitude: 40.7140, // Outside radius
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, minimalGeofence);

      // Should default to strict mode
      expect(result.strictValidation).toBe(true);
      expect(result.allowedVariance).toBe(10);
      expect(result.isValid).toBe(false);
    });
  });
});