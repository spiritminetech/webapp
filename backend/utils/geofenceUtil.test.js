import { 
  calculateDistance, 
  validateGeofence, 
  isValidCoordinates, 
  createGeofence 
} from './geofenceUtil.js';

describe('Geofence Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance between New York City and Los Angeles (approximately 3944 km)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(3944000, -3); // Within 1000m accuracy
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Distance between two points ~100m apart
      const distance = calculateDistance(40.7128, -74.0060, 40.7137, -74.0060);
      expect(distance).toBeCloseTo(100, 0); // Within 1m accuracy
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

    it('should validate location inside geofence', () => {
      const userLocation = {
        latitude: 40.7130, // Very close to center
        longitude: -74.0058
      };

      const result = validateGeofence(userLocation, projectGeofence);
      
      expect(result.isValid).toBe(true);
      expect(result.insideGeofence).toBe(true);
      expect(result.distance).toBeLessThan(100);
    });

    it('should reject location outside geofence in strict mode', () => {
      const userLocation = {
        latitude: 40.7200, // Far from center
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, projectGeofence);
      
      expect(result.isValid).toBe(false);
      expect(result.insideGeofence).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should allow location within variance in non-strict mode', () => {
      const nonStrictGeofence = {
        ...projectGeofence,
        strictMode: false
      };

      const userLocation = {
        latitude: 40.7138, // ~105m from center (outside radius but within variance)
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, nonStrictGeofence);
      
      expect(result.isValid).toBe(true);
      expect(result.insideGeofence).toBe(false);
      expect(result.strictValidation).toBe(false);
    });

    it('should handle invalid input gracefully', () => {
      const result = validateGeofence(null, projectGeofence);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing geofence center', () => {
      const invalidGeofence = {
        radius: 100,
        strictMode: true
      };

      const userLocation = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      const result = validateGeofence(userLocation, invalidGeofence);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(40.7128, -74.0060)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates(91, 0)).toBe(false); // Latitude > 90
      expect(isValidCoordinates(-91, 0)).toBe(false); // Latitude < -90
      expect(isValidCoordinates(0, 181)).toBe(false); // Longitude > 180
      expect(isValidCoordinates(0, -181)).toBe(false); // Longitude < -180
      expect(isValidCoordinates(NaN, 0)).toBe(false); // NaN latitude
      expect(isValidCoordinates(0, NaN)).toBe(false); // NaN longitude
      expect(isValidCoordinates('40.7128', -74.0060)).toBe(false); // String latitude
      expect(isValidCoordinates(40.7128, '-74.0060')).toBe(false); // String longitude
    });
  });

  describe('createGeofence', () => {
    it('should create geofence with valid coordinates', () => {
      const geofence = createGeofence(40.7128, -74.0060);
      
      expect(geofence.center.latitude).toBe(40.7128);
      expect(geofence.center.longitude).toBe(-74.0060);
      expect(geofence.radius).toBe(100); // Default
      expect(geofence.strictMode).toBe(true); // Default
      expect(geofence.allowedVariance).toBe(10); // Default
    });

    it('should create geofence with custom parameters', () => {
      const geofence = createGeofence(40.7128, -74.0060, 200, false, 20);
      
      expect(geofence.center.latitude).toBe(40.7128);
      expect(geofence.center.longitude).toBe(-74.0060);
      expect(geofence.radius).toBe(200);
      expect(geofence.strictMode).toBe(false);
      expect(geofence.allowedVariance).toBe(20);
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => createGeofence(91, 0)).toThrow('Invalid coordinates provided');
      expect(() => createGeofence(0, 181)).toThrow('Invalid coordinates provided');
      expect(() => createGeofence(NaN, 0)).toThrow('Invalid coordinates provided');
    });
  });
});