import appConfig from '../config/app.config.js';

/**
 * Error Logging Service for Worker Mobile Dashboard
 * Handles error logging, monitoring, and support integration
 * Requirements: 10.5 - Error logging for monitoring and support purposes
 */
class ErrorLoggingService {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.retryInterval = null;
    this.retryDelay = 5000; // 5 seconds
    this.maxRetries = 3;
    this._authService = null; // Lazy loaded to avoid circular dependency
    
    // Listen for online/offline events only in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processErrorQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Lazy load authService to avoid circular dependency
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
          getToken: () => null,
          isAuthenticated: () => false,
          getUserFromToken: () => null
        };
      }
    }
    return this._authService;
  }

  /**
   * Log an error with context information
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context information
   * @param {string} severity - Error severity: 'low', 'medium', 'high', 'critical'
   * @returns {string} Error ID for tracking
   */
  async logError(error, context = {}, severity = 'medium') {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // Get user context if available
    const userContext = await this.getUserContext();
    
    // Create comprehensive error record
    const errorRecord = {
      id: errorId,
      timestamp,
      severity,
      error: {
        message: error?.message || error?.toString() || 'Unknown error',
        stack: error?.stack || null,
        name: error?.name || 'Error'
      },
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : null,
        connection: this.getConnectionInfo(),
        timestamp: timestamp
      },
      user: userContext,
      environment: {
        appName: appConfig.app.name,
        appVersion: appConfig.app.version,
        environment: appConfig.app.environment,
        isDevelopment: appConfig.app.isDevelopment
      },
      retryCount: 0,
      status: 'pending'
    };

    // Log to console in development
    if (appConfig.app.isDevelopment) {
      console.group(`🚨 Error Logged [${severity.toUpperCase()}] - ID: ${errorId}`);
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Full Record:', errorRecord);
      console.groupEnd();
    }

    // Add to queue for processing
    this.addToQueue(errorRecord);
    
    // Process immediately if online
    if (this.isOnline) {
      this.processErrorQueue();
    }

    return errorId;
  }

  /**
   * Log a critical error that requires immediate attention
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context information
   * @returns {string} Error ID for tracking
   */
  logCriticalError(error, context = {}) {
    const errorId = this.logError(error, {
      ...context,
      requiresImmediateAttention: true,
      notificationSent: false
    }, 'critical');

    // In a real implementation, this would trigger immediate notifications
    // For now, we'll just log it with high priority
    appConfig.error('CRITICAL ERROR LOGGED:', errorId, error);

    return errorId;
  }

  /**
   * Log a network error with retry information
   * @param {Error} error - Network error
   * @param {Object} requestContext - Request context (URL, method, etc.)
   * @returns {string} Error ID for tracking
   */
  logNetworkError(error, requestContext = {}) {
    return this.logError(error, {
      type: 'network',
      request: requestContext,
      isOnline: this.isOnline,
      connectionType: this.getConnectionInfo().effectiveType
    }, 'medium');
  }

  /**
   * Log an authentication error
   * @param {Error} error - Authentication error
   * @param {Object} context - Additional context
   * @returns {Promise<string>} Error ID for tracking
   */
  async logAuthError(error, context = {}) {
    const authService = await this.getAuthService();
    return this.logError(error, {
      type: 'authentication',
      ...context,
      tokenExists: !!authService.getToken(),
      isAuthenticated: authService.isAuthenticated()
    }, 'high');
  }

  /**
   * Log a geofence validation error
   * @param {Error} error - Geofence error
   * @param {Object} locationContext - Location context
   * @returns {string} Error ID for tracking
   */
  logGeofenceError(error, locationContext = {}) {
    return this.logError(error, {
      type: 'geofence',
      location: locationContext,
      hasLocationPermission: 'geolocation' in navigator
    }, 'medium');
  }

  /**
   * Log a component error (from error boundaries)
   * @param {Error} error - Component error
   * @param {Object} errorInfo - React error info
   * @param {string} componentName - Component name
   * @returns {string} Error ID for tracking
   */
  logComponentError(error, errorInfo = {}, componentName = 'Unknown') {
    return this.logError(error, {
      type: 'component',
      component: componentName,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }, 'high');
  }

  /**
   * Get error statistics for monitoring
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const recentErrors = this.errorQueue.filter(error => 
      now - new Date(error.timestamp).getTime() < oneHour
    );

    const todayErrors = this.errorQueue.filter(error => 
      now - new Date(error.timestamp).getTime() < oneDay
    );

    const errorsBySeverity = this.errorQueue.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {});

    const errorsByType = this.errorQueue.reduce((acc, error) => {
      const type = error.context.type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      total: this.errorQueue.length,
      lastHour: recentErrors.length,
      today: todayErrors.length,
      bySeverity: errorsBySeverity,
      byType: errorsByType,
      queueSize: this.errorQueue.length,
      isOnline: this.isOnline,
      lastProcessed: this.lastProcessedTime || null
    };
  }

  /**
   * Clear error queue (for testing or maintenance)
   */
  clearErrorQueue() {
    this.errorQueue = [];
    appConfig.log('Error queue cleared');
  }

  /**
   * Get recent errors for debugging
   * @param {number} limit - Number of recent errors to return
   * @returns {Array} Recent error records
   */
  getRecentErrors(limit = 10) {
    return this.errorQueue
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Add error to processing queue
   * @param {Object} errorRecord - Error record to add
   * @private
   */
  addToQueue(errorRecord) {
    // Add to queue
    this.errorQueue.push(errorRecord);
    
    // Maintain queue size limit
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }
  }

  /**
   * Process error queue - send errors to logging service
   * @private
   */
  async processErrorQueue() {
    if (!this.isOnline || this.errorQueue.length === 0) {
      return;
    }

    const pendingErrors = this.errorQueue.filter(error => 
      error.status === 'pending' && error.retryCount < this.maxRetries
    );

    if (pendingErrors.length === 0) {
      return;
    }

    appConfig.log(`Processing ${pendingErrors.length} pending errors`);

    for (const errorRecord of pendingErrors) {
      try {
        await this.sendErrorToService(errorRecord);
        errorRecord.status = 'sent';
        errorRecord.sentAt = new Date().toISOString();
      } catch (error) {
        errorRecord.retryCount++;
        errorRecord.lastRetryAt = new Date().toISOString();
        errorRecord.lastRetryError = error.message;
        
        if (errorRecord.retryCount >= this.maxRetries) {
          errorRecord.status = 'failed';
          appConfig.error('Failed to send error after max retries:', errorRecord.id);
        }
      }
    }

    this.lastProcessedTime = new Date().toISOString();
  }

  /**
   * Send error to logging service
   * @param {Object} errorRecord - Error record to send
   * @private
   */
  async sendErrorToService(errorRecord) {
    // In a real implementation, this would send to an error tracking service
    // like Sentry, LogRocket, or a custom logging endpoint
    
    if (appConfig.app.isProduction) {
      // Production: Send to actual logging service
      // This is a placeholder for the actual implementation
      const authService = await this.getAuthService();
      const response = await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(errorRecord)
      });

      if (!response.ok) {
        throw new Error(`Failed to log error: ${response.status}`);
      }
    } else {
      // Development: Just log to console
      console.log('📤 Error would be sent to logging service:', errorRecord);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   * @private
   */
  generateErrorId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Get user context for error logging
   * @returns {Promise<Object>} User context
   * @private
   */
  async getUserContext() {
    try {
      const authService = await this.getAuthService();
      const user = authService.getUserFromToken();
      return {
        userId: user?.userId || null,
        role: user?.role || null,
        isAuthenticated: authService.isAuthenticated(),
        tokenExpiry: user?.exp ? new Date(user.exp * 1000).toISOString() : null
      };
    } catch (error) {
      return {
        userId: null,
        role: null,
        isAuthenticated: false,
        tokenExpiry: null,
        contextError: error.message
      };
    }
  }

  /**
   * Get connection information
   * @returns {Object} Connection info
   * @private
   */
  getConnectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false
    };
  }

  /**
   * Start retry processing interval
   */
  startRetryProcessing() {
    if (this.retryInterval) {
      return; // Already started
    }

    this.retryInterval = setInterval(() => {
      if (this.isOnline) {
        this.processErrorQueue();
      }
    }, this.retryDelay);

    appConfig.log('Error retry processing started');
  }

  /**
   * Stop retry processing interval
   */
  stopRetryProcessing() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
      appConfig.log('Error retry processing stopped');
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopRetryProcessing();
    
    // Process any remaining errors before cleanup
    if (this.isOnline && this.errorQueue.length > 0) {
      this.processErrorQueue().catch(error => {
        appConfig.error('Error during final queue processing:', error);
      });
    }
    
    appConfig.log('ErrorLoggingService cleaned up');
  }
}

// Export singleton instance
const errorLoggingService = new ErrorLoggingService();

// Start retry processing
errorLoggingService.startRetryProcessing();

export default errorLoggingService;