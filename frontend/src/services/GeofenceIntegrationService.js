import geofenceService from './GeofenceService.js';
import locationService from './LocationService.js';
import appConfig from '../config/app.config.js';

/**
 * GeofenceIntegrationService - Integration layer for dashboard geofence functionality
 * Provides real-time location validation and geofence status for the worker dashboard
 */
class GeofenceIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.validationCallbacks = new Set();
    this.currentValidationStatus = null;
    this.lastValidationTime = null;
    this.validationInterval = null;
    this.defaultValidationRate = 30000; // 30 seconds
    this.locationWatchId = null;
    this.projectGeofence = null;
    this.isRealTimeValidationActive = false;
  }

  /**
   * Initialize the geofence integration service
   * @param {Object} projectGeofence - Project geofence configuration
   * @returns {Promise<void>}
   */
  async initialize(projectGeofence = null) {
    try {
      if (this.isInitialized) {
        appConfig.log('GeofenceIntegrationService already initialized');
        return;
      }

      // Store project geofence configuration
      this.projectGeofence = projectGeofence;

      // Request location permissions
      await geofenceService.requestLocationPermission();

      this.isInitialized = true;
      appConfig.log('GeofenceIntegrationService initialized successfully');

    } catch (error) {
      appConfig.error('Failed to initialize GeofenceIntegrationService:', error);
      throw new Error(`Geofence integration initialization failed: ${error.message}`);
    }
  }

  /**
   * Start real-time location validation
   * @param {Object} projectGeofence - Project geofence configuration
   * @param {Function} callback - Callback for validation updates
   * @returns {Object} Subscription object with unsubscribe method
   */
  startRealTimeValidation(projectGeofence, callback) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized. Call initialize() first.');
      }

      if (!projectGeofence) {
        throw new Error('Project geofence configuration is required');
      }

      if (typeof callback !== 'function') {
        throw new Error('Callback function is required');
      }

      // Store project geofence and callback
      this.projectGeofence = projectGeofence;
      this.validationCallbacks.add(callback);

      // Start location watching if not already active
      if (!this.isRealTimeValidationActive) {
        this.startLocationWatching();
        this.isRealTimeValidationActive = true;
      }

      appConfig.log('Started real-time geofence validation');

      // Return subscription object
      return {
        unsubscribe: () => {
          this.validationCallbacks.delete(callback);
          
          // Stop validation if no more callbacks
          if (this.validationCallbacks.size === 0) {
            this.stopRealTimeValidation();
          }
        }
      };

    } catch (error) {
      appConfig.error('Failed to start real-time validation:', error);
      throw error;
    }
  }

  /**
   * Stop real-time location validation
   */
  stopRealTimeValidation() {
    try {
      if (this.locationWatchId) {
        geofenceService.stopLocationWatch();
        this.locationWatchId = null;
      }

      if (this.validationInterval) {
        clearInterval(this.validationInterval);
        this.validationInterval = null;
      }

      this.validationCallbacks.clear();
      this.isRealTimeValidationActive = false;
      this.currentValidationStatus = null;

      appConfig.log('Stopped real-time geofence validation');

    } catch (error) {
      appConfig.error('Error stopping real-time validation:', error);
    }
  }

  /**
   * Validate current location against project geofence
   * @param {string} projectId - Project ID (optional)
   * @returns {Promise<Object>} Validation result
   */
  async validateCurrentLocation(projectId = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      // Handle geofence data unavailable scenario
      if (!this.projectGeofence) {
        return this.createUnavailableGeofenceStatus();
      }

      // Get current location
      const location = await geofenceService.getCurrentLocation();
      
      // Validate location against geofence
      const validation = geofenceService.isLocationInGeofence(location, this.projectGeofence);
      
      // Create comprehensive validation status
      const validationStatus = {
        isWithinGeofence: validation.inside,
        distanceFromSite: validation.distance,
        lastValidationTime: new Date(),
        validationError: null,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        geofence: {
          center: this.projectGeofence.center,
          radius: this.projectGeofence.radius
        },
        canStartTasks: validation.inside,
        message: validation.inside 
          ? 'You are within the project site'
          : `You are ${validation.distance}m from the project site`
      };

      // Update current status and notify callbacks
      this.currentValidationStatus = validationStatus;
      this.lastValidationTime = new Date();
      this.notifyValidationCallbacks(validationStatus);

      appConfig.log('Location validation completed:', {
        inside: validation.inside,
        distance: validation.distance
      });

      return validationStatus;

    } catch (error) {
      appConfig.error('Location validation failed:', error);
      
      // Create error status
      const errorStatus = {
        isWithinGeofence: false,
        distanceFromSite: null,
        lastValidationTime: new Date(),
        validationError: error.message,
        location: null,
        geofence: this.projectGeofence,
        canStartTasks: false,
        message: `Location validation failed: ${error.message}`
      };

      this.currentValidationStatus = errorStatus;
      this.notifyValidationCallbacks(errorStatus);

      return errorStatus;
    }
  }

  /**
   * Get current geofence validation status
   * @returns {Object|null} Current validation status
   */
  getCurrentValidationStatus() {
    return this.currentValidationStatus;
  }

  /**
   * Check if geofence data is available
   * @returns {boolean} True if geofence data is available
   */
  isGeofenceDataAvailable() {
    return !!(this.projectGeofence && this.projectGeofence.center && this.projectGeofence.radius);
  }

  /**
   * Update project geofence configuration
   * @param {Object} projectGeofence - New geofence configuration
   */
  updateProjectGeofence(projectGeofence) {
    this.projectGeofence = projectGeofence;
    
    if (this.isRealTimeValidationActive) {
      // Trigger immediate validation with new geofence
      this.validateCurrentLocation().catch(error => {
        appConfig.error('Error validating with updated geofence:', error);
      });
    }

    appConfig.log('Project geofence updated');
  }

  /**
   * Start location watching for real-time updates
   * @private
   */
  startLocationWatching() {
    // Start location watching with geofence service
    this.locationWatchId = geofenceService.startLocationWatch((location, error) => {
      if (error) {
        appConfig.error('Location watch error:', error);
        this.handleLocationError(error);
        return;
      }

      if (location && this.projectGeofence) {
        // Validate location immediately when it updates
        this.performLocationValidation(location);
      }
    });

    // Also set up periodic validation as backup
    this.validationInterval = setInterval(() => {
      if (this.projectGeofence) {
        this.validateCurrentLocation().catch(error => {
          appConfig.error('Periodic validation error:', error);
        });
      }
    }, this.defaultValidationRate);
  }

  /**
   * Perform location validation with given location
   * @param {Object} location - Location data
   * @private
   */
  performLocationValidation(location) {
    try {
      if (!this.projectGeofence) {
        return;
      }

      const validation = geofenceService.isLocationInGeofence(location, this.projectGeofence);
      
      const validationStatus = {
        isWithinGeofence: validation.inside,
        distanceFromSite: validation.distance,
        lastValidationTime: new Date(),
        validationError: null,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        geofence: {
          center: this.projectGeofence.center,
          radius: this.projectGeofence.radius
        },
        canStartTasks: validation.inside,
        message: validation.inside 
          ? 'You are within the project site'
          : `You are ${validation.distance}m from the project site`
      };

      this.currentValidationStatus = validationStatus;
      this.lastValidationTime = new Date();
      this.notifyValidationCallbacks(validationStatus);

    } catch (error) {
      appConfig.error('Error in location validation:', error);
      this.handleLocationError(error);
    }
  }

  /**
   * Handle location errors
   * @param {Error} error - Location error
   * @private
   */
  handleLocationError(error) {
    const errorStatus = {
      isWithinGeofence: false,
      distanceFromSite: null,
      lastValidationTime: new Date(),
      validationError: error.message,
      location: null,
      geofence: this.projectGeofence,
      canStartTasks: false,
      message: `Location error: ${error.message}`
    };

    this.currentValidationStatus = errorStatus;
    this.notifyValidationCallbacks(errorStatus);
  }

  /**
   * Create status for unavailable geofence data
   * @returns {Object} Unavailable geofence status
   * @private
   */
  createUnavailableGeofenceStatus() {
    const unavailableStatus = {
      isWithinGeofence: false,
      distanceFromSite: null,
      lastValidationTime: new Date(),
      validationError: 'Geofence data unavailable',
      location: null,
      geofence: null,
      canStartTasks: false,
      message: 'Warning: Geofence data is not available for this project. Location validation cannot be performed.',
      isGeofenceUnavailable: true
    };

    this.currentValidationStatus = unavailableStatus;
    return unavailableStatus;
  }

  /**
   * Notify all validation callbacks
   * @param {Object} validationStatus - Validation status to send
   * @private
   */
  notifyValidationCallbacks(validationStatus) {
    this.validationCallbacks.forEach(callback => {
      try {
        callback(validationStatus);
      } catch (error) {
        appConfig.error('Error in validation callback:', error);
      }
    });
  }

  /**
   * Get service status information
   * @returns {Object} Service status
   */
  getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      isRealTimeValidationActive: this.isRealTimeValidationActive,
      hasProjectGeofence: !!this.projectGeofence,
      callbackCount: this.validationCallbacks.size,
      lastValidationTime: this.lastValidationTime,
      currentStatus: this.currentValidationStatus,
      geofenceServiceStatus: geofenceService.getLocationStatus()
    };
  }

  /**
   * Clean up resources and stop all operations
   */
  cleanup() {
    try {
      this.stopRealTimeValidation();
      this.projectGeofence = null;
      this.currentValidationStatus = null;
      this.lastValidationTime = null;
      this.isInitialized = false;

      appConfig.log('GeofenceIntegrationService cleaned up');

    } catch (error) {
      appConfig.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
const geofenceIntegrationService = new GeofenceIntegrationService();
export default geofenceIntegrationService;