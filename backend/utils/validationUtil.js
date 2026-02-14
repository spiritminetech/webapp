/**
 * Input validation utilities for API endpoints
 */

/**
 * Validate authentication data from request
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
export const validateAuthData = (req) => {
  if (!req || !req.user) {
    return {
      isValid: false,
      error: "INVALID_AUTH_DATA",
      message: "Invalid authentication data"
    };
  }

  const { userId, companyId } = req.user;

  if (!userId || !companyId) {
    return {
      isValid: false,
      error: "MISSING_AUTH_FIELDS",
      message: "Missing required authentication fields"
    };
  }

  if (!Number.isInteger(userId) || !Number.isInteger(companyId)) {
    return {
      isValid: false,
      error: "INVALID_AUTH_TYPES",
      message: "Invalid authentication field types"
    };
  }

  if (userId <= 0 || companyId <= 0) {
    return {
      isValid: false,
      error: "INVALID_AUTH_VALUES",
      message: "Invalid authentication field values"
    };
  }

  return {
    isValid: true,
    userId,
    companyId
  };
};

/**
 * Validate date string format and value
 * @param {string} dateString - Date string to validate
 * @param {boolean} allowFuture - Whether to allow future dates
 * @returns {Object} Validation result
 */
export const validateDateString = (dateString, allowFuture = false) => {
  if (!dateString) {
    return {
      isValid: true,
      date: new Date().toISOString().split("T")[0] // Default to today
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return {
      isValid: false,
      error: "INVALID_DATE_FORMAT",
      message: "Invalid date format. Use YYYY-MM-DD"
    };
  }

  // Validate date is a valid date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: "INVALID_DATE_VALUE",
      message: "Invalid date value"
    };
  }

  // Check if date is in the future (if not allowed)
  if (!allowFuture) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date > tomorrow) {
      return {
        isValid: false,
        error: "FUTURE_DATE_NOT_ALLOWED",
        message: "Cannot fetch tasks for future dates beyond tomorrow"
      };
    }
  }

  return {
    isValid: true,
    date: dateString
  };
};

/**
 * Validate numeric ID
 * @param {any} id - ID to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} Validation result
 */
export const validateId = (id, fieldName = "ID") => {
  if (id === null || id === undefined) {
    return {
      isValid: false,
      error: `MISSING_${fieldName.toUpperCase()}`,
      message: `Missing ${fieldName}`
    };
  }

  if (!Number.isInteger(id)) {
    return {
      isValid: false,
      error: `INVALID_${fieldName.toUpperCase()}_FORMAT`,
      message: `Invalid ${fieldName} format`
    };
  }

  if (id <= 0) {
    return {
      isValid: false,
      error: `INVALID_${fieldName.toUpperCase()}_VALUE`,
      message: `Invalid ${fieldName} value`
    };
  }

  return {
    isValid: true,
    id
  };
};

/**
 * Validate progress percentage
 * @param {any} percentage - Percentage to validate
 * @returns {Object} Validation result
 */
export const validateProgressPercentage = (percentage) => {
  if (percentage === null || percentage === undefined) {
    return {
      isValid: true,
      percentage: 0 // Default to 0
    };
  }

  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return {
      isValid: false,
      error: "INVALID_PROGRESS_FORMAT",
      message: "Progress percentage must be a number"
    };
  }

  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return {
    isValid: true,
    percentage: clampedPercentage,
    wasModified: clampedPercentage !== percentage
  };
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {Object} Validation result
 */
export const validateCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || 
      longitude === null || longitude === undefined) {
    return {
      isValid: false,
      error: "MISSING_COORDINATES",
      message: "Missing latitude or longitude"
    };
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
      isNaN(latitude) || isNaN(longitude)) {
    return {
      isValid: false,
      error: "INVALID_COORDINATE_FORMAT",
      message: "Coordinates must be numbers"
    };
  }

  if (latitude < -90 || latitude > 90) {
    return {
      isValid: false,
      error: "INVALID_LATITUDE",
      message: "Latitude must be between -90 and 90"
    };
  }

  if (longitude < -180 || longitude > 180) {
    return {
      isValid: false,
      error: "INVALID_LONGITUDE",
      message: "Longitude must be between -180 and 180"
    };
  }

  return {
    isValid: true,
    latitude,
    longitude
  };
};

/**
 * Validate and sanitize numeric value
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {number} options.default - Default value if invalid
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Object} Validation result
 */
export const validateNumericValue = (value, options = {}) => {
  const {
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    default: defaultValue = 0,
    fieldName = "value"
  } = options;

  if (value === null || value === undefined) {
    return {
      isValid: true,
      value: defaultValue,
      wasModified: true
    };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return {
      isValid: true,
      value: defaultValue,
      wasModified: true,
      warning: `Invalid ${fieldName} format, using default value`
    };
  }

  // Clamp value within bounds
  const clampedValue = Math.max(min, Math.min(max, value));

  return {
    isValid: true,
    value: clampedValue,
    wasModified: clampedValue !== value,
    warning: clampedValue !== value ? `${fieldName} was clamped to valid range` : undefined
  };
};

/**
 * Validate string field
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxLength - Maximum allowed length
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.default - Default value if invalid
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Object} Validation result
 */
export const validateStringField = (value, options = {}) => {
  const {
    maxLength = 1000,
    required = false,
    default: defaultValue = "",
    fieldName = "field"
  } = options;

  if (value === null || value === undefined || value === "") {
    if (required) {
      return {
        isValid: false,
        error: `MISSING_${fieldName.toUpperCase()}`,
        message: `${fieldName} is required`
      };
    }
    return {
      isValid: true,
      value: defaultValue
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: true,
      value: String(value).substring(0, maxLength),
      wasModified: true,
      warning: `${fieldName} was converted to string`
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: true,
      value: value.substring(0, maxLength),
      wasModified: true,
      warning: `${fieldName} was truncated to ${maxLength} characters`
    };
  }

  return {
    isValid: true,
    value: value
  };
};

/**
 * Validate array field
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxLength - Maximum allowed array length
 * @param {boolean} options.required - Whether field is required
 * @param {Array} options.default - Default value if invalid
 * @param {string} options.fieldName - Field name for error messages
 * @returns {Object} Validation result
 */
export const validateArrayField = (value, options = {}) => {
  const {
    maxLength = 100,
    required = false,
    default: defaultValue = [],
    fieldName = "array"
  } = options;

  if (value === null || value === undefined) {
    if (required) {
      return {
        isValid: false,
        error: `MISSING_${fieldName.toUpperCase()}`,
        message: `${fieldName} is required`
      };
    }
    return {
      isValid: true,
      value: defaultValue
    };
  }

  if (!Array.isArray(value)) {
    return {
      isValid: true,
      value: defaultValue,
      wasModified: true,
      warning: `${fieldName} was not an array, using default`
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: true,
      value: value.slice(0, maxLength),
      wasModified: true,
      warning: `${fieldName} was truncated to ${maxLength} items`
    };
  }

  return {
    isValid: true,
    value: value
  };
};