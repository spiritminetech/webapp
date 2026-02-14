import appConfig from '../config/app.config.js';
import errorLoggingService from './ErrorLoggingService.js';

/**
 * Retry Service for Worker Mobile Dashboard
 * Provides retry mechanisms and recovery options for failed operations
 * Requirements: 10.1, 10.2 - Error handling with retry mechanisms and recovery options
 */
class RetryService {
  constructor() {
    this.activeRetries = new Map();
    this.retryConfigs = {
      // Network operations
      network: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true
      },
      // API calls
      api: {
        maxRetries: 3,
        baseDelay: 2000,
        maxDelay: 15000,
        backoffMultiplier: 2,
        jitter: true
      },
      // Authentication operations
      auth: {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: false
      },
      // Geofence validation
      geofence: {
        maxRetries: 3,
        baseDelay: 3000,
        maxDelay: 12000,
        backoffMultiplier: 2,
        jitter: true
      },
      // Data loading
      dataLoad: {
        maxRetries: 2,
        baseDelay: 1500,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true
      }
    };
  }

  /**
   * Execute an operation with retry logic
   * @param {Function} operation - Async operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  async executeWithRetry(operation, options = {}) {
    const config = this.getRetryConfig(options);
    const operationId = this.generateOperationId();
    
    let lastError = null;
    let attempt = 0;

    // Track active retry
    this.activeRetries.set(operationId, {
      startTime: Date.now(),
      attempts: 0,
      maxRetries: config.maxRetries,
      type: options.type || 'general'
    });

    try {
      while (attempt <= config.maxRetries) {
        try {
          // Update attempt count
          attempt++;
          this.activeRetries.get(operationId).attempts = attempt;

          appConfig.log(`Executing operation (attempt ${attempt}/${config.maxRetries + 1}):`, operationId);

          // Execute the operation
          const result = await operation();
          
          // Success - clean up and return
          this.activeRetries.delete(operationId);
          
          if (attempt > 1) {
            appConfig.log(`Operation succeeded after ${attempt} attempts:`, operationId);
          }
          
          return result;

        } catch (error) {
          lastError = error;
          
          // Log the error
          errorLoggingService.logError(error, {
            operationId,
            attempt,
            maxRetries: config.maxRetries,
            retryType: options.type || 'general',
            willRetry: attempt <= config.maxRetries
          }, 'medium');

          // Check if we should retry
          if (attempt <= config.maxRetries && this.shouldRetry(error, options)) {
            const delay = this.calculateDelay(attempt, config);
            
            appConfig.log(`Operation failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
            
            // Wait before retry
            await this.delay(delay);
            
            // Continue to next attempt
            continue;
          } else {
            // No more retries or shouldn't retry
            break;
          }
        }
      }

      // All retries exhausted
      this.activeRetries.delete(operationId);
      
      const finalError = new Error(`Operation failed after ${attempt} attempts: ${lastError?.message || 'Unknown error'}`);
      finalError.originalError = lastError;
      finalError.attempts = attempt;
      finalError.operationId = operationId;

      // Log final failure
      errorLoggingService.logError(finalError, {
        operationId,
        totalAttempts: attempt,
        maxRetries: config.maxRetries,
        retryType: options.type || 'general',
        finalFailure: true
      }, 'high');

      throw finalError;

    } catch (error) {
      // Clean up on unexpected error
      this.activeRetries.delete(operationId);
      throw error;
    }
  }

  /**
   * Create a retryable version of an async function
   * @param {Function} fn - Async function to make retryable
   * @param {Object} options - Retry options
   * @returns {Function} Retryable function
   */
  createRetryableFunction(fn, options = {}) {
    return async (...args) => {
      return this.executeWithRetry(() => fn(...args), options);
    };
  }

  /**
   * Retry a network request with exponential backoff
   * @param {Function} requestFn - Function that makes the network request
   * @param {Object} options - Retry options
   * @returns {Promise} Request result
   */
  async retryNetworkRequest(requestFn, options = {}) {
    return this.executeWithRetry(requestFn, {
      type: 'network',
      ...options
    });
  }

  /**
   * Retry an API call with appropriate error handling
   * @param {Function} apiCall - Function that makes the API call
   * @param {Object} options - Retry options
   * @returns {Promise} API result
   */
  async retryApiCall(apiCall, options = {}) {
    return this.executeWithRetry(apiCall, {
      type: 'api',
      shouldRetry: (error) => {
        // Don't retry on authentication errors or client errors (4xx except 429)
        if (error.response) {
          const status = error.response.status;
          return status >= 500 || status === 429 || status === 408;
        }
        // Retry on network errors
        return !error.response;
      },
      ...options
    });
  }

  /**
   * Retry authentication operations
   * @param {Function} authOperation - Authentication operation
   * @param {Object} options - Retry options
   * @returns {Promise} Auth result
   */
  async retryAuthOperation(authOperation, options = {}) {
    return this.executeWithRetry(authOperation, {
      type: 'auth',
      shouldRetry: (error) => {
        // Only retry on network errors, not auth failures
        return !error.response || error.response.status >= 500;
      },
      ...options
    });
  }

  /**
   * Retry geofence validation with location-specific handling
   * @param {Function} geofenceOperation - Geofence operation
   * @param {Object} options - Retry options
   * @returns {Promise} Geofence result
   */
  async retryGeofenceOperation(geofenceOperation, options = {}) {
    return this.executeWithRetry(geofenceOperation, {
      type: 'geofence',
      shouldRetry: (error) => {
        // Retry on location errors but not permission errors
        return !error.message.includes('permission') && 
               !error.message.includes('denied');
      },
      ...options
    });
  }

  /**
   * Retry data loading operations
   * @param {Function} dataLoader - Data loading function
   * @param {Object} options - Retry options
   * @returns {Promise} Data result
   */
  async retryDataLoad(dataLoader, options = {}) {
    return this.executeWithRetry(dataLoader, {
      type: 'dataLoad',
      ...options
    });
  }

  /**
   * Get active retry operations
   * @returns {Array} Active retry operations
   */
  getActiveRetries() {
    const now = Date.now();
    const activeRetries = [];

    this.activeRetries.forEach((retry, operationId) => {
      activeRetries.push({
        operationId,
        type: retry.type,
        attempts: retry.attempts,
        maxRetries: retry.maxRetries,
        duration: now - retry.startTime,
        startTime: retry.startTime
      });
    });

    return activeRetries;
  }

  /**
   * Cancel all active retries
   */
  cancelAllRetries() {
    const cancelledCount = this.activeRetries.size;
    this.activeRetries.clear();
    
    appConfig.log(`Cancelled ${cancelledCount} active retry operations`);
    return cancelledCount;
  }

  /**
   * Get retry statistics
   * @returns {Object} Retry statistics
   */
  getRetryStats() {
    return {
      activeRetries: this.activeRetries.size,
      retryConfigs: Object.keys(this.retryConfigs),
      activeOperations: this.getActiveRetries()
    };
  }

  /**
   * Get retry configuration for operation
   * @param {Object} options - Retry options
   * @returns {Object} Retry configuration
   * @private
   */
  getRetryConfig(options) {
    const type = options.type || 'network';
    const baseConfig = this.retryConfigs[type] || this.retryConfigs.network;
    
    return {
      ...baseConfig,
      ...options
    };
  }

  /**
   * Determine if operation should be retried
   * @param {Error} error - Error that occurred
   * @param {Object} options - Retry options
   * @returns {boolean} Whether to retry
   * @private
   */
  shouldRetry(error, options) {
    // Check custom shouldRetry function
    if (typeof options.shouldRetry === 'function') {
      return options.shouldRetry(error);
    }

    // Default retry logic
    if (error.response) {
      const status = error.response.status;
      // Retry on server errors and rate limiting
      return status >= 500 || status === 429 || status === 408;
    }

    // Retry on network errors (no response)
    return !error.response;
  }

  /**
   * Calculate delay for retry attempt
   * @param {number} attempt - Current attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   * @private
   */
  calculateDelay(attempt, config) {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter if enabled
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, 0);
  }

  /**
   * Create delay promise
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique operation ID
   * @returns {string} Operation ID
   * @private
   */
  generateOperationId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.cancelAllRetries();
    appConfig.log('RetryService cleaned up');
  }
}

// Export singleton instance
const retryService = new RetryService();
export default retryService;