import appConfig from '../config/app.config.js';
import errorLoggingService from './ErrorLoggingService.js';
import retryService from './RetryService.js';

/**
 * Error Recovery Service for Worker Mobile Dashboard
 * Provides recovery strategies and troubleshooting guidance
 * Requirements: 10.1, 10.2, 10.3 - Error handling with recovery options and troubleshooting guidance
 */
class ErrorRecoveryService {
  constructor() {
    this.recoveryStrategies = new Map();
    this.troubleshootingGuides = new Map();
    this.recoveryHistory = [];
    this.maxHistorySize = 50;
    this._authService = null; // Lazy loaded to avoid circular dependency
    
    this.initializeRecoveryStrategies();
    this.initializeTroubleshootingGuides();
  }

  /**
   * Lazy load AuthService to avoid circular dependency
   * @returns {Promise<Object>} AuthService instance
   */
  async getAuthService() {
    if (!this._authService) {
      try {
        const authServiceModule = await import('./AuthService.js');
        this._authService = authServiceModule.default;
      } catch (error) {
        console.warn('Could not load AuthService:', error);
        // Return a mock service to prevent errors
        this._authService = {
          refreshToken: () => Promise.reject(new Error('AuthService not available')),
          logout: () => console.warn('AuthService logout not available')
        };
      }
    }
    return this._authService;
  }

  /**
   * Attempt to recover from an error
   * @param {Error} error - Error to recover from
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async attemptRecovery(error, context = {}) {
    const errorType = this.classifyError(error, context);
    const recoveryId = this.generateRecoveryId();
    
    appConfig.log(`Attempting recovery for ${errorType} error:`, recoveryId);
    
    const recoveryRecord = {
      id: recoveryId,
      timestamp: new Date().toISOString(),
      errorType,
      error: {
        message: error.message,
        stack: error.stack
      },
      context,
      strategies: [],
      result: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      const strategies = this.getRecoveryStrategies(errorType);
      
      for (const strategy of strategies) {
        appConfig.log(`Trying recovery strategy: ${strategy.name}`);
        
        const strategyRecord = {
          name: strategy.name,
          attempted: true,
          startTime: Date.now(),
          success: false,
          error: null,
          result: null
        };

        try {
          const result = await strategy.execute(error, context);
          
          strategyRecord.success = true;
          strategyRecord.result = result;
          strategyRecord.duration = Date.now() - strategyRecord.startTime;
          
          recoveryRecord.strategies.push(strategyRecord);
          
          if (result.recovered) {
            recoveryRecord.result = {
              recovered: true,
              strategy: strategy.name,
              message: result.message || 'Recovery successful',
              data: result.data
            };
            
            appConfig.log(`Recovery successful using strategy: ${strategy.name}`);
            break;
          }
          
        } catch (strategyError) {
          strategyRecord.error = strategyError.message;
          strategyRecord.duration = Date.now() - strategyRecord.startTime;
          recoveryRecord.strategies.push(strategyRecord);
          
          appConfig.error(`Recovery strategy failed: ${strategy.name}`, strategyError);
        }
      }

      // If no strategy succeeded
      if (!recoveryRecord.result) {
        recoveryRecord.result = {
          recovered: false,
          message: 'All recovery strategies failed',
          troubleshooting: this.getTroubleshootingGuide(errorType),
          supportInfo: this.getSupportInfo(errorType, context)
        };
      }

    } catch (recoveryError) {
      recoveryRecord.result = {
        recovered: false,
        message: `Recovery process failed: ${recoveryError.message}`,
        error: recoveryError.message
      };
      
      errorLoggingService.logError(recoveryError, {
        type: 'recovery',
        originalError: error.message,
        recoveryId
      }, 'high');
    }

    recoveryRecord.duration = Date.now() - startTime;
    this.addToHistory(recoveryRecord);

    return recoveryRecord.result;
  }

  /**
   * Get troubleshooting guidance for an error
   * @param {Error} error - Error to get guidance for
   * @param {Object} context - Error context
   * @returns {Object} Troubleshooting guidance
   */
  getTroubleshootingGuidance(error, context = {}) {
    const errorType = this.classifyError(error, context);
    const guide = this.troubleshootingGuides.get(errorType);
    
    if (!guide) {
      return {
        type: errorType,
        title: 'General Error',
        description: 'An unexpected error occurred.',
        steps: [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact your supervisor if the problem persists'
        ],
        supportInfo: this.getSupportInfo(errorType, context)
      };
    }

    return {
      ...guide,
      supportInfo: this.getSupportInfo(errorType, context)
    };
  }

  /**
   * Get recovery options for display to user
   * @param {Error} error - Error to get options for
   * @param {Object} context - Error context
   * @returns {Array} Recovery options
   */
  getRecoveryOptions(error, context = {}) {
    const errorType = this.classifyError(error, context);
    const strategies = this.getRecoveryStrategies(errorType);
    
    return strategies.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      userFriendly: strategy.userFriendly || strategy.name,
      icon: strategy.icon || '🔄',
      execute: () => this.executeRecoveryStrategy(strategy, error, context)
    }));
  }

  /**
   * Execute a specific recovery strategy
   * @param {Object} strategy - Recovery strategy
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async executeRecoveryStrategy(strategy, error, context) {
    try {
      appConfig.log(`Executing recovery strategy: ${strategy.name}`);
      const result = await strategy.execute(error, context);
      
      if (result.recovered) {
        appConfig.log(`Recovery strategy succeeded: ${strategy.name}`);
      }
      
      return result;
    } catch (strategyError) {
      appConfig.error(`Recovery strategy failed: ${strategy.name}`, strategyError);
      return {
        recovered: false,
        message: `Recovery failed: ${strategyError.message}`,
        error: strategyError
      };
    }
  }

  /**
   * Get support information for critical errors
   * @param {string} errorType - Type of error
   * @param {Object} context - Error context
   * @returns {Object} Support information
   */
  getSupportInfo(errorType, context = {}) {
    // Get supervisor info from context if available
    const supervisorInfo = context.supervisorInfo || context.projectInfo?.supervisorInfo;
    
    const supportInfo = {
      errorType,
      timestamp: new Date().toISOString(),
      errorId: context.errorId || 'unknown',
      contactOptions: []
    };

    // Add supervisor contact if available
    if (supervisorInfo && supervisorInfo.name) {
      supportInfo.contactOptions.push({
        type: 'supervisor',
        name: supervisorInfo.name,
        phone: supervisorInfo.phoneNumber,
        available: supervisorInfo.isAvailableForCall,
        primary: true
      });
    }

    // Add site manager as fallback
    supportInfo.contactOptions.push({
      type: 'site_manager',
      name: 'Site Manager',
      phone: 'Contact through supervisor',
      available: true,
      primary: !supervisorInfo
    });

    // Add technical support for critical errors
    if (errorType === 'critical' || errorType === 'authentication' || errorType === 'system') {
      supportInfo.contactOptions.push({
        type: 'technical',
        name: 'Technical Support',
        phone: 'Available through supervisor',
        available: true,
        primary: false
      });
    }

    return supportInfo;
  }

  /**
   * Get recovery history
   * @param {number} limit - Number of records to return
   * @returns {Array} Recovery history
   */
  getRecoveryHistory(limit = 10) {
    return this.recoveryHistory
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Clear recovery history
   */
  clearRecoveryHistory() {
    this.recoveryHistory = [];
    appConfig.log('Recovery history cleared');
  }

  /**
   * Initialize recovery strategies
   * @private
   */
  initializeRecoveryStrategies() {
    // Network error recovery
    this.recoveryStrategies.set('network', [
      {
        id: 'retry_request',
        name: 'Retry Request',
        description: 'Retry the failed network request',
        userFriendly: 'Try Again',
        icon: '🔄',
        execute: async (error, context) => {
          if (context.retryFunction) {
            const result = await retryService.retryNetworkRequest(context.retryFunction);
            return { recovered: true, message: 'Request succeeded on retry', data: result };
          }
          return { recovered: false, message: 'No retry function available' };
        }
      },
      {
        id: 'check_connection',
        name: 'Check Connection',
        description: 'Verify internet connectivity',
        userFriendly: 'Check Connection',
        icon: '📶',
        execute: async () => {
          const isOnline = navigator.onLine;
          if (isOnline) {
            // Try a simple network test
            try {
              await fetch('/api/health', { method: 'HEAD', timeout: 5000 });
              return { recovered: true, message: 'Connection is working' };
            } catch {
              return { recovered: false, message: 'Connection test failed' };
            }
          }
          return { recovered: false, message: 'No internet connection detected' };
        }
      }
    ]);

    // Authentication error recovery
    this.recoveryStrategies.set('authentication', [
      {
        id: 'refresh_token',
        name: 'Refresh Token',
        description: 'Attempt to refresh authentication token',
        userFriendly: 'Refresh Session',
        icon: '🔑',
        execute: async () => {
          try {
            const authService = await this.getAuthService();
            await authService.refreshToken();
            return { recovered: true, message: 'Authentication refreshed successfully' };
          } catch (error) {
            return { recovered: false, message: 'Token refresh failed', error };
          }
        }
      },
      {
        id: 'redirect_login',
        name: 'Redirect to Login',
        description: 'Redirect user to login page',
        userFriendly: 'Log In Again',
        icon: '🚪',
        execute: async () => {
          const authService = await this.getAuthService();
          authService.logout();
          window.location.href = '/login';
          return { recovered: true, message: 'Redirecting to login' };
        }
      }
    ]);

    // Data loading error recovery
    this.recoveryStrategies.set('data_loading', [
      {
        id: 'reload_data',
        name: 'Reload Data',
        description: 'Attempt to reload the data',
        userFriendly: 'Reload Data',
        icon: '📊',
        execute: async (error, context) => {
          if (context.reloadFunction) {
            const result = await retryService.retryDataLoad(context.reloadFunction);
            return { recovered: true, message: 'Data reloaded successfully', data: result };
          }
          return { recovered: false, message: 'No reload function available' };
        }
      },
      {
        id: 'use_cached_data',
        name: 'Use Cached Data',
        description: 'Fall back to cached data if available',
        userFriendly: 'Use Offline Data',
        icon: '💾',
        execute: async (error, context) => {
          if (context.cachedData) {
            return { 
              recovered: true, 
              message: 'Using cached data (may be outdated)', 
              data: context.cachedData 
            };
          }
          return { recovered: false, message: 'No cached data available' };
        }
      }
    ]);

    // Geofence error recovery
    this.recoveryStrategies.set('geofence', [
      {
        id: 'retry_location',
        name: 'Retry Location',
        description: 'Attempt to get location again',
        userFriendly: 'Try Location Again',
        icon: '📍',
        execute: async () => {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              });
            });
            return { 
              recovered: true, 
              message: 'Location obtained successfully',
              data: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
            };
          } catch (error) {
            return { recovered: false, message: `Location failed: ${error.message}` };
          }
        }
      },
      {
        id: 'manual_confirmation',
        name: 'Manual Confirmation',
        description: 'Allow manual location confirmation',
        userFriendly: 'Confirm Location Manually',
        icon: '✋',
        execute: async () => {
          return { 
            recovered: true, 
            message: 'Manual confirmation enabled',
            data: { manualConfirmation: true }
          };
        }
      }
    ]);

    // Component error recovery
    this.recoveryStrategies.set('component', [
      {
        id: 'reload_component',
        name: 'Reload Component',
        description: 'Attempt to reload the component',
        userFriendly: 'Reload Section',
        icon: '🔄',
        execute: async (error, context) => {
          if (context.reloadComponent) {
            context.reloadComponent();
            return { recovered: true, message: 'Component reloaded' };
          }
          return { recovered: false, message: 'Component reload not available' };
        }
      },
      {
        id: 'refresh_page',
        name: 'Refresh Page',
        description: 'Refresh the entire page',
        userFriendly: 'Refresh Page',
        icon: '🔄',
        execute: async () => {
          window.location.reload();
          return { recovered: true, message: 'Page refreshing' };
        }
      }
    ]);
  }

  /**
   * Initialize troubleshooting guides
   * @private
   */
  initializeTroubleshootingGuides() {
    this.troubleshootingGuides.set('network', {
      type: 'network',
      title: 'Network Connection Problem',
      description: 'There seems to be an issue with your internet connection.',
      steps: [
        'Check if you have internet connectivity',
        'Try switching between WiFi and mobile data',
        'Move to an area with better signal strength',
        'Wait a moment and try again',
        'Contact your supervisor if the problem continues'
      ],
      icon: '📶'
    });

    this.troubleshootingGuides.set('authentication', {
      type: 'authentication',
      title: 'Login Session Problem',
      description: 'Your login session has expired or there\'s an authentication issue.',
      steps: [
        'Try logging in again',
        'Check your username and password',
        'Clear your browser cache and cookies',
        'Contact your supervisor if you can\'t log in',
        'Make sure you\'re using the correct login credentials'
      ],
      icon: '🔑'
    });

    this.troubleshootingGuides.set('geofence', {
      type: 'geofence',
      title: 'Location Services Problem',
      description: 'There\'s an issue with location detection or geofence validation.',
      steps: [
        'Make sure location services are enabled in your browser',
        'Allow location access when prompted',
        'Try moving to an open area for better GPS signal',
        'Check if you\'re at the correct project site',
        'Contact your supervisor if location issues persist'
      ],
      icon: '📍'
    });

    this.troubleshootingGuides.set('data_loading', {
      type: 'data_loading',
      title: 'Data Loading Problem',
      description: 'Unable to load your work information.',
      steps: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again',
        'Check if you\'re logged in properly',
        'Contact your supervisor if data doesn\'t load'
      ],
      icon: '📊'
    });

    this.troubleshootingGuides.set('component', {
      type: 'component',
      title: 'Display Problem',
      description: 'A part of the dashboard isn\'t working properly.',
      steps: [
        'Try refreshing the page',
        'Clear your browser cache',
        'Try using a different browser',
        'Check if other parts of the app work',
        'Contact technical support through your supervisor'
      ],
      icon: '🖥️'
    });

    this.troubleshootingGuides.set('critical', {
      type: 'critical',
      title: 'Critical System Error',
      description: 'A serious error has occurred that requires immediate attention.',
      steps: [
        'Note the time when the error occurred',
        'Try refreshing the page once',
        'If the error persists, stop using the app',
        'Contact your supervisor immediately',
        'Provide the error ID and description to support'
      ],
      icon: '🚨'
    });
  }

  /**
   * Classify error type for recovery strategy selection
   * @param {Error} error - Error to classify
   * @param {Object} context - Error context
   * @returns {string} Error type
   * @private
   */
  classifyError(error, context) {
    const message = error.message?.toLowerCase() || '';
    const type = context.type?.toLowerCase() || '';

    // Check context type first
    if (type && this.recoveryStrategies.has(type)) {
      return type;
    }

    // Classify based on error message
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    
    if (message.includes('auth') || message.includes('token') || message.includes('login') || message.includes('unauthorized')) {
      return 'authentication';
    }
    
    if (message.includes('location') || message.includes('geofence') || message.includes('gps')) {
      return 'geofence';
    }
    
    if (message.includes('data') || message.includes('load') || message.includes('fetch')) {
      return 'data_loading';
    }
    
    if (context.componentStack || context.errorBoundary) {
      return 'component';
    }

    // Check error response status
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return 'authentication';
      }
      if (status >= 500) {
        return 'network';
      }
    }

    // Default to network for unknown errors
    return 'network';
  }

  /**
   * Get recovery strategies for error type
   * @param {string} errorType - Type of error
   * @returns {Array} Recovery strategies
   * @private
   */
  getRecoveryStrategies(errorType) {
    return this.recoveryStrategies.get(errorType) || this.recoveryStrategies.get('network');
  }

  /**
   * Add recovery record to history
   * @param {Object} record - Recovery record
   * @private
   */
  addToHistory(record) {
    this.recoveryHistory.push(record);
    
    // Maintain history size limit
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory.shift();
    }
  }

  /**
   * Generate unique recovery ID
   * @returns {string} Recovery ID
   * @private
   */
  generateRecoveryId() {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.recoveryHistory = [];
    appConfig.log('ErrorRecoveryService cleaned up');
  }
}

// Export singleton instance
const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;