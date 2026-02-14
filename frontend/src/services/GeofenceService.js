import workerTaskService from './WorkerTaskService.js';
import appConfig from '../config/app.config.js';

/**
 * Geofence Validation Service
 * Handles location tracking, geofence validation, and GPS management
 */
class GeofenceService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.locationCallbacks = new Set();
    this.geofenceCache = new Map();
    this.locationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 30 seconds
    };
    this.minAccuracy = 50; // meters
    this.updateInterval = 30000; // 30 seconds
  }

  /**
   * Request location permissions
   * @returns {Promise<boolean>} True if permission granted
   */
  async requestLocationPermission() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Check current permission state
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'denied') {
          throw new Error('Location permission denied. Please enable location access in browser settings.');
        }
      }

      // Test location access
      await this.getCurrentLocation();
      
      appConfig.log('Location permission granted');
      return true;
    } catch (error) {
      appConfig.error('Location permission request failed:', error);
      throw error;
    }
  }

  /**
   * Get current location
   * @returns {Promise<Object>} Current location {latitude, longitude, accuracy, timestamp}
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          };
          
          this.currentLocation = location;
          this.notifyLocationCallbacks(location);
          
          appConfig.log('Current location obtained:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: `${location.accuracy}m`
          });
          
          resolve(location);
        },
        (error) => {
          const errorMessage = this.getLocationErrorMessage(error);
          appConfig.error('Failed to get current location:', errorMessage);
          reject(new Error(errorMessage));
        },
        this.locationOptions
      );
    });
  }

  /**
   * Start watching location changes
   * @param {Function} callback - Callback for location updates
   * @returns {string} Watch ID for stopping
   */
  startLocationWatch(callback) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    // Add callback to set
    if (callback) {
      this.locationCallbacks.add(callback);
    }

    // Start watching if not already started
    if (!this.watchId) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          };
          
          // Only update if accuracy is acceptable
          if (location.accuracy <= this.minAccuracy * 2) { // Allow 2x min accuracy
            this.currentLocation = location;
            this.notifyLocationCallbacks(location);
          }
        },
        (error) => {
          const errorMessage = this.getLocationErrorMessage(error);
          appConfig.error('Location watch error:', errorMessage);
          this.notifyLocationCallbacks(null, new Error(errorMessage));
        },
        this.locationOptions
      );
      
      appConfig.log('Location watching started');
    }

    return this.watchId;
  }

  /**
   * Stop watching location changes
   * @param {Function} callback - Callback to remove (optional)
   */
  stopLocationWatch(callback) {
    if (callback) {
      this.locationCallbacks.delete(callback);
    }

    // Stop watching if no more callbacks
    if (this.locationCallbacks.size === 0 && this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      appConfig.log('Location watching stopped');
    }
  }

  /**
   * Validate current location against project geofence
   * @param {number} projectId - Project ID (optional)
   * @returns {Promise<Object>} Validation result
   */
  async validateCurrentLocation(projectId = null) {
    try {
      const location = await this.getCurrentLocation();
      return await this.validateLocation(location.latitude, location.longitude, projectId);
    } catch (error) {
      appConfig.error('Current location validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate specific coordinates against project geofence
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} projectId - Project ID (optional)
   * @returns {Promise<Object>} Validation result
   */
  async validateLocation(latitude, longitude, projectId = null) {
    try {
      // Check cache first
      const cacheKey = `${latitude.toFixed(6)}_${longitude.toFixed(6)}_${projectId || 'default'}`;
      const cached = this.geofenceCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        appConfig.log('Using cached geofence validation');
        return cached.result;
      }

      // Validate with server
      const result = await workerTaskService.validateGeofence(latitude, longitude, projectId);
      
      // Cache result
      this.geofenceCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      this.cleanGeofenceCache();
      
      appConfig.log('Geofence validation result:', {
        inside: result.data.insideGeofence,
        distance: `${result.data.distance}m`,
        canStart: result.data.canStartTasks
      });
      
      return result;
    } catch (error) {
      appConfig.error('Geofence validation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if location is within geofence
   * @param {Object} userLocation - User location {latitude, longitude}
   * @param {Object} geofence - Geofence {center: {latitude, longitude}, radius}
   * @returns {Object} Validation result {inside, distance}
   */
  isLocationInGeofence(userLocation, geofence) {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );
    
    return {
      inside: distance <= geofence.radius,
      distance: Math.round(distance)
    };
  }

  /**
   * Get location error message
   * @param {GeolocationPositionError} error - Geolocation error
   * @returns {string} User-friendly error message
   */
  getLocationErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions in your browser settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please check your GPS settings.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return `Location error: ${error.message}`;
    }
  }

  /**
   * Notify all location callbacks
   * @param {Object} location - Location data
   * @param {Error} error - Error if any
   */
  notifyLocationCallbacks(location, error = null) {
    this.locationCallbacks.forEach(callback => {
      try {
        callback(location, error);
      } catch (callbackError) {
        appConfig.error('Location callback error:', callbackError);
      }
    });
  }

  /**
   * Clean old geofence cache entries
   */
  cleanGeofenceCache() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, value] of this.geofenceCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.geofenceCache.delete(key);
      }
    }
  }

  /**
   * Get current location status
   * @returns {Object} Location status
   */
  getLocationStatus() {
    return {
      hasCurrentLocation: !!this.currentLocation,
      isWatching: !!this.watchId,
      callbackCount: this.locationCallbacks.size,
      cacheSize: this.geofenceCache.size,
      lastLocation: this.currentLocation
    };
  }

  /**
   * Clear all location data and stop watching
   */
  cleanup() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.locationCallbacks.clear();
    this.geofenceCache.clear();
    this.currentLocation = null;
    
    appConfig.log('GeofenceService cleaned up');
  }
}

// Export singleton instance
const geofenceService = new GeofenceService();
export default geofenceService;