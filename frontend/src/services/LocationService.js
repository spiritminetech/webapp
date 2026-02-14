/**
 * LocationService - Real-time GPS location tracking service
 * Handles continuous location monitoring, geofence validation, and location logging
 */

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.isTracking = false;
    this.callbacks = [];
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // Cache location for 30 seconds
    };
    this.trackingInterval = null;
    this.lastLocationUpdate = null;
    this.minUpdateInterval = 30000; // Minimum 30 seconds between updates for battery optimization
  }

  /**
   * Start real-time GPS tracking
   * @param {Function} callback - Callback function to handle location updates
   * @param {Object} options - GPS tracking options
   */
  startTracking(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Merge custom options with defaults
    this.options = { ...this.options, ...options };
    
    // Add callback to the list
    if (callback && typeof callback === 'function') {
      this.callbacks.push(callback);
    }

    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    this.isTracking = true;
    console.log('Starting real-time GPS tracking...');

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      this.options
    );

    // Set up periodic location logging for battery optimization
    this.trackingInterval = setInterval(() => {
      if (this.currentLocation && this.shouldUpdateLocation()) {
        this.notifyCallbacks(this.currentLocation);
      }
    }, this.minUpdateInterval);
  }

  /**
   * Stop GPS tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      return;
    }

    console.log('Stopping GPS tracking...');
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isTracking = false;
    this.callbacks = [];
    this.currentLocation = null;
    this.lastLocationUpdate = null;
  }

  /**
   * Get current location once
   * @returns {Promise} Promise that resolves with location data
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.formatLocationData(position);
          resolve(locationData);
        },
        (error) => {
          reject(this.formatLocationError(error));
        },
        this.options
      );
    });
  }

  /**
   * Handle location updates from GPS
   * @param {Position} position - GPS position object
   */
  handleLocationUpdate(position) {
    const locationData = this.formatLocationData(position);
    this.currentLocation = locationData;
    this.lastLocationUpdate = Date.now();

    console.log('Location updated:', locationData);

    // Notify all callbacks immediately for high-accuracy updates
    if (this.shouldNotifyImmediately(position)) {
      this.notifyCallbacks(locationData);
    }
  }

  /**
   * Handle GPS errors
   * @param {PositionError} error - GPS error object
   */
  handleLocationError(error) {
    const errorData = this.formatLocationError(error);
    console.error('GPS Error:', errorData);

    // Notify callbacks about the error
    this.callbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback(null, errorData);
      }
    });
  }

  /**
   * Format location data for consistent structure
   * @param {Position} position - GPS position object
   * @returns {Object} Formatted location data
   */
  formatLocationData(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp).toISOString()
    };
  }

  /**
   * Format location error for consistent structure
   * @param {PositionError} error - GPS error object
   * @returns {Object} Formatted error data
   */
  formatLocationError(error) {
    const errorMessages = {
      1: 'Permission denied - User denied the request for Geolocation',
      2: 'Position unavailable - Location information is unavailable',
      3: 'Timeout - The request to get user location timed out'
    };

    return {
      code: error.code,
      message: errorMessages[error.code] || 'Unknown location error',
      originalMessage: error.message
    };
  }

  /**
   * Check if location should be updated based on time interval
   * @returns {boolean} Whether location should be updated
   */
  shouldUpdateLocation() {
    if (!this.lastLocationUpdate) {
      return true;
    }
    
    const timeSinceLastUpdate = Date.now() - this.lastLocationUpdate;
    return timeSinceLastUpdate >= this.minUpdateInterval;
  }

  /**
   * Check if callbacks should be notified immediately (for high accuracy updates)
   * @param {Position} position - GPS position object
   * @returns {boolean} Whether to notify immediately
   */
  shouldNotifyImmediately(position) {
    // Notify immediately if accuracy is very high (< 10 meters)
    return position.coords.accuracy < 10;
  }

  /**
   * Notify all registered callbacks with location data
   * @param {Object} locationData - Formatted location data
   */
  notifyCallbacks(locationData) {
    this.callbacks.forEach(callback => {
      if (typeof callback === 'function') {
        try {
          callback(locationData, null);
        } catch (error) {
          console.error('Error in location callback:', error);
        }
      }
    });
  }

  /**
   * Add a callback for location updates
   * @param {Function} callback - Callback function
   */
  addCallback(callback) {
    if (typeof callback === 'function' && !this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
  }

  /**
   * Remove a callback
   * @param {Function} callback - Callback function to remove
   */
  removeCallback(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Get current tracking status
   * @returns {Object} Tracking status information
   */
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      hasLocation: !!this.currentLocation,
      lastUpdate: this.lastLocationUpdate,
      callbackCount: this.callbacks.length,
      currentLocation: this.currentLocation
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
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
   * Validate if current location is within geofence
   * @param {Object} geofence - Geofence configuration
   * @returns {Object} Validation result
   */
  validateGeofence(geofence) {
    if (!this.currentLocation || !geofence) {
      return {
        isValid: false,
        error: 'Missing location or geofence data',
        distance: null
      };
    }

    const distance = this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );

    const isInside = distance <= geofence.radius;

    return {
      isValid: true,
      insideGeofence: isInside,
      distance: Math.round(distance),
      accuracy: this.currentLocation.accuracy,
      timestamp: this.currentLocation.timestamp
    };
  }

  /**
   * Request location permissions
   * @returns {Promise} Promise that resolves with permission status
   */
  async requestPermissions() {
    if (!navigator.permissions) {
      // Fallback: try to get location to trigger permission request
      try {
        await this.getCurrentLocation();
        return { state: 'granted' };
      } catch (error) {
        return { state: 'denied', error };
      }
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return { state: 'unknown', error };
    }
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;