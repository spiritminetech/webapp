/**
 * Geofence validation utilities for project location checking
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Validate if user location is within project geofence
 * @param {Object} userLocation - User's current location
 * @param {number} userLocation.latitude - User's latitude
 * @param {number} userLocation.longitude - User's longitude
 * @param {Object} projectGeofence - Project's geofence configuration
 * @param {Object} projectGeofence.center - Geofence center coordinates
 * @param {number} projectGeofence.center.latitude - Center latitude
 * @param {number} projectGeofence.center.longitude - Center longitude
 * @param {number} projectGeofence.radius - Geofence radius in meters
 * @param {boolean} projectGeofence.strictMode - Whether to enforce strict validation
 * @param {number} projectGeofence.allowedVariance - Additional allowed distance in meters
 * @returns {Object} Validation result
 */
export const validateGeofence = (userLocation, projectGeofence) => {
  if (!userLocation || !projectGeofence || !projectGeofence.center) {
    return {
      isValid: false,
      distance: null,
      error: 'Invalid location or geofence data'
    };
  }

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    projectGeofence.center.latitude,
    projectGeofence.center.longitude
  );
  
  const isInside = distance <= projectGeofence.radius;
  const allowedVariance = projectGeofence.allowedVariance || 10;
  const strictMode = projectGeofence.strictMode !== false; // Default to true
  
  // In strict mode, user must be within the exact radius
  // In non-strict mode, allow additional variance
  const canProceed = strictMode 
    ? isInside 
    : distance <= (projectGeofence.radius + allowedVariance);

  return {
    isValid: canProceed,
    insideGeofence: isInside,
    distance: Math.round(distance),
    strictValidation: strictMode,
    allowedRadius: projectGeofence.radius,
    allowedVariance: allowedVariance,
    message: canProceed 
      ? 'Location validated successfully'
      : `You are ${Math.round(distance)}m from the project site. Maximum allowed distance is ${projectGeofence.radius}m${!strictMode ? ` (with ${allowedVariance}m variance)` : ''}.`
  };
};

/**
 * Check if coordinates are valid
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} True if coordinates are valid
 */
export const isValidCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Create a location log entry for audit trail
 * @param {Object} locationData - Location data to log
 * @param {number} locationData.employeeId - Employee ID
 * @param {number} locationData.projectId - Project ID
 * @param {number} locationData.latitude - Latitude
 * @param {number} locationData.longitude - Longitude
 * @param {number} locationData.accuracy - GPS accuracy in meters
 * @param {boolean} locationData.insideGeofence - Whether location is inside geofence
 * @param {string} locationData.logType - Type of location log
 * @param {number} locationData.taskAssignmentId - Task assignment ID (optional)
 * @returns {Object} Location log data structure
 */
export const createLocationLogData = (locationData) => {
  const {
    employeeId,
    projectId,
    latitude,
    longitude,
    accuracy = null,
    insideGeofence = false,
    logType = 'PERIODIC',
    taskAssignmentId = null
  } = locationData;

  // Validate required fields
  if (!employeeId || !projectId || !isValidCoordinates(latitude, longitude)) {
    throw new Error('Invalid location data for logging');
  }

  return {
    employeeId,
    projectId,
    latitude,
    longitude,
    accuracy,
    insideGeofence,
    logType,
    taskAssignmentId,
    timestamp: new Date()
  };
};

/**
 * Enhanced geofence validation with GPS accuracy consideration
 * @param {Object} userLocation - User's current location
 * @param {number} userLocation.latitude - User's latitude
 * @param {number} userLocation.longitude - User's longitude
 * @param {number} userLocation.accuracy - GPS accuracy in meters (optional)
 * @param {Object} projectGeofence - Project's geofence configuration
 * @param {Object} projectGeofence.center - Geofence center coordinates
 * @param {number} projectGeofence.center.latitude - Center latitude
 * @param {number} projectGeofence.center.longitude - Center longitude
 * @param {number} projectGeofence.radius - Geofence radius in meters
 * @param {boolean} projectGeofence.strictMode - Whether to enforce strict validation
 * @param {number} projectGeofence.allowedVariance - Additional allowed distance in meters
 * @returns {Object} Enhanced validation result
 */
export const validateGeofenceWithAccuracy = (userLocation, projectGeofence) => {
  if (!userLocation || !projectGeofence || !projectGeofence.center) {
    return {
      isValid: false,
      distance: null,
      error: 'Invalid location or geofence data'
    };
  }

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    projectGeofence.center.latitude,
    projectGeofence.center.longitude
  );
  
  const isInside = distance <= projectGeofence.radius;
  const allowedVariance = projectGeofence.allowedVariance || 10;
  const strictMode = projectGeofence.strictMode !== false; // Default to true
  const gpsAccuracy = userLocation.accuracy || null;
  
  // Base validation
  const canProceed = strictMode 
    ? isInside 
    : distance <= (projectGeofence.radius + allowedVariance);

  // GPS accuracy considerations
  let accuracyAdjustedValidation = canProceed;
  let accuracyWarning = null;
  
  if (gpsAccuracy !== null && gpsAccuracy > 0) {
    if (gpsAccuracy > 50) {
      accuracyWarning = `GPS accuracy is poor (${Math.round(gpsAccuracy)}m). Location validation may be unreliable.`;
      
      // If accuracy is very poor and user is close to boundary, be more lenient
      if (gpsAccuracy > 100 && !canProceed) {
        const accuracyBuffer = Math.min(gpsAccuracy, 200); // Cap at 200m buffer
        const lenientDistance = distance - accuracyBuffer;
        
        if (lenientDistance <= projectGeofence.radius) {
          accuracyAdjustedValidation = true;
        }
      }
    }
  }

  return {
    isValid: accuracyAdjustedValidation,
    insideGeofence: isInside,
    distance: Math.round(distance),
    strictValidation: strictMode,
    allowedRadius: projectGeofence.radius,
    allowedVariance: allowedVariance,
    gpsAccuracy: gpsAccuracy,
    accuracyWarning: accuracyWarning,
    message: accuracyAdjustedValidation 
      ? 'Location validated successfully'
      : `You are ${Math.round(distance)}m from the project site. Maximum allowed distance is ${projectGeofence.radius}m${!strictMode ? ` (with ${allowedVariance}m variance)` : ''}.`
  };
};

/**
 * Create a default geofence structure
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radius - Radius in meters (default: 100)
 * @param {boolean} strictMode - Strict mode (default: true)
 * @param {number} allowedVariance - Allowed variance in meters (default: 10)
 * @returns {Object} Geofence structure
 */
export const createGeofence = (
  latitude, 
  longitude, 
  radius = 100, 
  strictMode = true, 
  allowedVariance = 10
) => {
  if (!isValidCoordinates(latitude, longitude)) {
    throw new Error('Invalid coordinates provided');
  }

  return {
    center: {
      latitude,
      longitude
    },
    radius,
    strictMode,
    allowedVariance
  };
};

/**
 * Get GPS accuracy quality assessment
 * @param {number} accuracy - GPS accuracy in meters
 * @returns {Object} Accuracy assessment
 */
export const getGPSAccuracyQuality = (accuracy) => {
  if (!accuracy || accuracy <= 0) {
    return {
      quality: 'unknown',
      description: 'GPS accuracy not available',
      reliable: false
    };
  }

  if (accuracy <= 5) {
    return {
      quality: 'excellent',
      description: 'Very high accuracy GPS signal',
      reliable: true
    };
  } else if (accuracy <= 15) {
    return {
      quality: 'good',
      description: 'Good accuracy GPS signal',
      reliable: true
    };
  } else if (accuracy <= 50) {
    return {
      quality: 'fair',
      description: 'Fair accuracy GPS signal',
      reliable: true
    };
  } else if (accuracy <= 100) {
    return {
      quality: 'poor',
      description: 'Poor accuracy GPS signal - validation may be unreliable',
      reliable: false
    };
  } else {
    return {
      quality: 'very_poor',
      description: 'Very poor accuracy GPS signal - validation unreliable',
      reliable: false
    };
  }
};

/**
 * Calculate recommended buffer distance based on GPS accuracy
 * @param {number} accuracy - GPS accuracy in meters
 * @param {number} baseRadius - Base geofence radius
 * @returns {number} Recommended buffer distance
 */
export const calculateAccuracyBuffer = (accuracy, baseRadius) => {
  if (!accuracy || accuracy <= 0) {
    return 0;
  }

  // For poor accuracy, add a buffer but cap it at 50% of base radius
  const maxBuffer = Math.max(50, baseRadius * 0.5);
  const calculatedBuffer = Math.min(accuracy * 0.5, maxBuffer);
  
  return Math.round(calculatedBuffer);
};

/**
 * Validate multiple locations against a geofence (batch validation)
 * @param {Array} locations - Array of location objects with latitude, longitude, accuracy
 * @param {Object} projectGeofence - Project's geofence configuration
 * @returns {Array} Array of validation results
 */
export const validateMultipleLocations = (locations, projectGeofence) => {
  if (!Array.isArray(locations) || !projectGeofence) {
    throw new Error('Invalid locations array or geofence data');
  }

  return locations.map((location, index) => {
    try {
      const result = validateGeofenceWithAccuracy(location, projectGeofence);
      return {
        index,
        location,
        validation: result,
        success: true
      };
    } catch (error) {
      return {
        index,
        location,
        validation: null,
        success: false,
        error: error.message
      };
    }
  });
};

/**
 * Get geofence boundary points (for visualization)
 * @param {Object} geofence - Geofence configuration
 * @param {number} points - Number of points to generate (default: 32)
 * @returns {Array} Array of boundary coordinate points
 */
export const getGeofenceBoundaryPoints = (geofence, points = 32) => {
  if (!geofence || !geofence.center || !geofence.radius) {
    throw new Error('Invalid geofence configuration');
  }

  const { center, radius } = geofence;
  const boundaryPoints = [];
  const earthRadius = 6371000; // Earth's radius in meters

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const angleRad = (angle * Math.PI) / 180;

    // Calculate offset in degrees
    const latOffset = (radius / earthRadius) * (180 / Math.PI);
    const lonOffset = (radius / earthRadius) * (180 / Math.PI) / Math.cos(center.latitude * Math.PI / 180);

    const lat = center.latitude + latOffset * Math.cos(angleRad);
    const lon = center.longitude + lonOffset * Math.sin(angleRad);

    boundaryPoints.push({
      latitude: lat,
      longitude: lon,
      angle: angle
    });
  }

  return boundaryPoints;
};

/**
 * Check if a location is approaching the geofence boundary
 * @param {Object} userLocation - User's current location
 * @param {Object} projectGeofence - Project's geofence configuration
 * @param {number} warningDistance - Distance in meters to trigger warning (default: 20m)
 * @returns {Object} Boundary approach information
 */
export const checkGeofenceBoundaryApproach = (userLocation, projectGeofence, warningDistance = 20) => {
  const validation = validateGeofence(userLocation, projectGeofence);
  
  if (!validation.isValid) {
    return {
      isApproaching: false,
      isInside: false,
      distance: validation.distance,
      message: 'Outside geofence'
    };
  }

  const distanceFromBoundary = projectGeofence.radius - validation.distance;
  const isApproaching = distanceFromBoundary <= warningDistance;

  return {
    isApproaching,
    isInside: true,
    distance: validation.distance,
    distanceFromBoundary,
    warningDistance,
    message: isApproaching 
      ? `Approaching geofence boundary (${Math.round(distanceFromBoundary)}m remaining)`
      : 'Within safe distance from boundary'
  };
};

/**
 * Calculate optimal geofence radius based on location accuracy
 * @param {number} baseRadius - Base radius requirement
 * @param {number} averageAccuracy - Average GPS accuracy in the area
 * @param {number} safetyMargin - Additional safety margin (default: 1.5x)
 * @returns {Object} Recommended geofence configuration
 */
export const calculateOptimalGeofenceRadius = (baseRadius, averageAccuracy, safetyMargin = 1.5) => {
  if (baseRadius <= 0 || averageAccuracy <= 0) {
    throw new Error('Base radius and accuracy must be positive numbers');
  }

  const accuracyBuffer = averageAccuracy * safetyMargin;
  const recommendedRadius = Math.max(baseRadius, baseRadius + accuracyBuffer);
  const minRadius = Math.max(50, baseRadius); // Minimum 50m radius
  const finalRadius = Math.max(recommendedRadius, minRadius);

  return {
    baseRadius,
    averageAccuracy,
    safetyMargin,
    accuracyBuffer: Math.round(accuracyBuffer),
    recommendedRadius: Math.round(finalRadius),
    improvement: Math.round(((finalRadius - baseRadius) / baseRadius) * 100),
    recommendation: finalRadius > baseRadius 
      ? `Increase radius by ${Math.round(finalRadius - baseRadius)}m to account for GPS accuracy`
      : 'Current radius is sufficient for GPS accuracy'
  };
};

/**
 * Generate geofence validation report
 * @param {Array} validationHistory - Array of historical validation results
 * @returns {Object} Comprehensive validation report
 */
export const generateGeofenceValidationReport = (validationHistory) => {
  if (!Array.isArray(validationHistory) || validationHistory.length === 0) {
    return {
      totalValidations: 0,
      successRate: 0,
      averageDistance: 0,
      averageAccuracy: 0,
      report: 'No validation data available'
    };
  }

  const total = validationHistory.length;
  const successful = validationHistory.filter(v => v.insideGeofence).length;
  const successRate = (successful / total) * 100;

  const distances = validationHistory.map(v => v.distance).filter(d => d !== null);
  const accuracies = validationHistory.map(v => v.gpsAccuracy).filter(a => a !== null);

  const averageDistance = distances.length > 0 
    ? distances.reduce((sum, d) => sum + d, 0) / distances.length 
    : 0;

  const averageAccuracy = accuracies.length > 0
    ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
    : 0;

  const poorAccuracyCount = accuracies.filter(a => a > 50).length;
  const poorAccuracyRate = accuracies.length > 0 ? (poorAccuracyCount / accuracies.length) * 100 : 0;

  return {
    totalValidations: total,
    successfulValidations: successful,
    failedValidations: total - successful,
    successRate: Math.round(successRate * 100) / 100,
    averageDistance: Math.round(averageDistance * 100) / 100,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100,
    poorAccuracyRate: Math.round(poorAccuracyRate * 100) / 100,
    recommendations: generateRecommendations(successRate, averageAccuracy, poorAccuracyRate),
    summary: `${total} validations with ${successRate.toFixed(1)}% success rate`
  };
};

/**
 * Generate recommendations based on validation statistics
 * @param {number} successRate - Success rate percentage
 * @param {number} averageAccuracy - Average GPS accuracy
 * @param {number} poorAccuracyRate - Rate of poor accuracy readings
 * @returns {Array} Array of recommendation strings
 */
const generateRecommendations = (successRate, averageAccuracy, poorAccuracyRate) => {
  const recommendations = [];

  if (successRate < 80) {
    recommendations.push('Consider increasing geofence radius - success rate is below 80%');
  }

  if (averageAccuracy > 30) {
    recommendations.push('GPS accuracy is poor - consider using WiFi/Bluetooth beacons for better precision');
  }

  if (poorAccuracyRate > 30) {
    recommendations.push('High rate of poor GPS readings - implement accuracy-based validation adjustments');
  }

  if (successRate > 95 && averageAccuracy < 15) {
    recommendations.push('Excellent validation performance - current configuration is optimal');
  }

  if (recommendations.length === 0) {
    recommendations.push('Validation performance is within acceptable ranges');
  }

  return recommendations;
};