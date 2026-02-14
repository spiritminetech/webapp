import {
  validateAuthData,
  validateDateString,
  validateId,
  validateProgressPercentage,
  validateCoordinates,
  validateNumericValue,
  validateStringField,
  validateArrayField
} from './validationUtil.js';

describe('Validation Utilities', () => {
  describe('validateAuthData', () => {
    test('should validate correct auth data', () => {
      const req = {
        user: {
          userId: 1,
          companyId: 1
        }
      };

      const result = validateAuthData(req);
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.companyId).toBe(1);
    });

    test('should reject missing user object', () => {
      const req = {};
      const result = validateAuthData(req);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_AUTH_DATA');
    });

    test('should reject missing userId', () => {
      const req = {
        user: {
          companyId: 1
        }
      };
      
      const result = validateAuthData(req);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('MISSING_AUTH_FIELDS');
    });

    test('should reject invalid userId type', () => {
      const req = {
        user: {
          userId: "invalid",
          companyId: 1
        }
      };
      
      const result = validateAuthData(req);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_AUTH_TYPES');
    });

    test('should reject negative userId', () => {
      const req = {
        user: {
          userId: -1,
          companyId: 1
        }
      };
      
      const result = validateAuthData(req);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_AUTH_VALUES');
    });
  });

  describe('validateDateString', () => {
    test('should validate correct date format', () => {
      const result = validateDateString('2024-01-27');
      expect(result.isValid).toBe(true);
      expect(result.date).toBe('2024-01-27');
    });

    test('should return today for empty date', () => {
      const result = validateDateString('');
      const today = new Date().toISOString().split("T")[0];
      
      expect(result.isValid).toBe(true);
      expect(result.date).toBe(today);
    });

    test('should reject invalid date format', () => {
      const result = validateDateString('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_DATE_FORMAT');
    });

    test('should reject invalid date value', () => {
      const result = validateDateString('2024-13-45');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_DATE_VALUE');
    });

    test('should reject future dates when not allowed', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      const result = validateDateString(futureDateString, false);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('FUTURE_DATE_NOT_ALLOWED');
    });

    test('should allow future dates when explicitly allowed', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      const result = validateDateString(futureDateString, true);
      expect(result.isValid).toBe(true);
      expect(result.date).toBe(futureDateString);
    });
  });

  describe('validateId', () => {
    test('should validate correct ID', () => {
      const result = validateId(123, 'user');
      expect(result.isValid).toBe(true);
      expect(result.id).toBe(123);
    });

    test('should reject null ID', () => {
      const result = validateId(null, 'user');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('MISSING_USER');
    });

    test('should reject string ID', () => {
      const result = validateId('123', 'user');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_USER_FORMAT');
    });

    test('should reject negative ID', () => {
      const result = validateId(-1, 'user');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_USER_VALUE');
    });
  });

  describe('validateProgressPercentage', () => {
    test('should validate correct percentage', () => {
      const result = validateProgressPercentage(75);
      expect(result.isValid).toBe(true);
      expect(result.percentage).toBe(75);
      expect(result.wasModified).toBeFalsy();
    });

    test('should default to 0 for null', () => {
      const result = validateProgressPercentage(null);
      expect(result.isValid).toBe(true);
      expect(result.percentage).toBe(0);
    });

    test('should clamp percentage above 100', () => {
      const result = validateProgressPercentage(150);
      expect(result.isValid).toBe(true);
      expect(result.percentage).toBe(100);
      expect(result.wasModified).toBe(true);
    });

    test('should clamp negative percentage', () => {
      const result = validateProgressPercentage(-10);
      expect(result.isValid).toBe(true);
      expect(result.percentage).toBe(0);
      expect(result.wasModified).toBe(true);
    });

    test('should reject non-numeric percentage', () => {
      const result = validateProgressPercentage('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_PROGRESS_FORMAT');
    });
  });

  describe('validateCoordinates', () => {
    test('should validate correct coordinates', () => {
      const result = validateCoordinates(40.7128, -74.0060);
      expect(result.isValid).toBe(true);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    test('should reject missing coordinates', () => {
      const result = validateCoordinates(null, -74.0060);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('MISSING_COORDINATES');
    });

    test('should reject invalid latitude', () => {
      const result = validateCoordinates(91, -74.0060);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_LATITUDE');
    });

    test('should reject invalid longitude', () => {
      const result = validateCoordinates(40.7128, 181);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_LONGITUDE');
    });

    test('should reject non-numeric coordinates', () => {
      const result = validateCoordinates('invalid', -74.0060);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_COORDINATE_FORMAT');
    });
  });

  describe('validateNumericValue', () => {
    test('should validate correct numeric value', () => {
      const result = validateNumericValue(50, { min: 0, max: 100 });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(50);
      expect(result.wasModified).toBeFalsy();
    });

    test('should use default for null value', () => {
      const result = validateNumericValue(null, { default: 10 });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(10);
      expect(result.wasModified).toBe(true);
    });

    test('should clamp value to minimum', () => {
      const result = validateNumericValue(-5, { min: 0, max: 100 });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(0);
      expect(result.wasModified).toBe(true);
    });

    test('should clamp value to maximum', () => {
      const result = validateNumericValue(150, { min: 0, max: 100 });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(100);
      expect(result.wasModified).toBe(true);
    });

    test('should use default for invalid type', () => {
      const result = validateNumericValue('invalid', { default: 5 });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(5);
      expect(result.wasModified).toBe(true);
      expect(result.warning).toContain('using default value');
    });
  });

  describe('validateStringField', () => {
    test('should validate correct string', () => {
      const result = validateStringField('test string');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('test string');
    });

    test('should use default for empty required field', () => {
      const result = validateStringField('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('MISSING_');
    });

    test('should use default for null value', () => {
      const result = validateStringField(null, { default: 'default' });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('default');
    });

    test('should truncate long strings', () => {
      const longString = 'a'.repeat(1500);
      const result = validateStringField(longString, { maxLength: 100 });
      expect(result.isValid).toBe(true);
      expect(result.value).toHaveLength(100);
      expect(result.wasModified).toBe(true);
      expect(result.warning).toContain('truncated');
    });

    test('should convert non-string to string', () => {
      const result = validateStringField(123);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('123');
      expect(result.wasModified).toBe(true);
      expect(result.warning).toContain('converted to string');
    });
  });

  describe('validateArrayField', () => {
    test('should validate correct array', () => {
      const result = validateArrayField([1, 2, 3]);
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual([1, 2, 3]);
    });

    test('should use default for null value', () => {
      const result = validateArrayField(null, { default: [1, 2] });
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual([1, 2]);
    });

    test('should reject missing required array', () => {
      const result = validateArrayField(null, { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('MISSING_');
    });

    test('should use default for non-array value', () => {
      const result = validateArrayField('not an array', { default: [] });
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual([]);
      expect(result.wasModified).toBe(true);
      expect(result.warning).toContain('not an array');
    });

    test('should truncate long arrays', () => {
      const longArray = Array.from({ length: 150 }, (_, i) => i);
      const result = validateArrayField(longArray, { maxLength: 10 });
      expect(result.isValid).toBe(true);
      expect(result.value).toHaveLength(10);
      expect(result.wasModified).toBe(true);
      expect(result.warning).toContain('truncated');
    });
  });
});