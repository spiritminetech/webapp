import { apiClient } from '../api/axios.js';
import appConfig from '../config/app.config.js';
import retryService from './RetryService.js';
import errorRecoveryService from './ErrorRecoveryService.js';

/**
 * Enhanced Base API Service Class
 * Professional ERP System API Service Layer with comprehensive error handling
 * Requirements: 10.1, 10.2, 10.3, 10.5 - Enhanced error handling with retry and recovery
 */
class ApiService {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.client = apiClient;
    this._errorLoggingService = null; // Lazy loaded to avoid circular dependency
  }

  /**
   * Lazy load ErrorLoggingService to avoid circular dependency
   * @returns {Promise<Object>} ErrorLoggingService instance
   */
  async getErrorLoggingService() {
    if (!this._errorLoggingService) {
      try {
        const errorLoggingServiceModule = await import('./ErrorLoggingService.js');
        this._errorLoggingService = errorLoggingServiceModule.default;
      } catch (error) {
        console.warn('Could not load ErrorLoggingService:', error);
        // Return a mock service to prevent errors
        this._errorLoggingService = {
          logError: () => Promise.resolve('mock-error-id'),
          logNetworkError: () => Promise.resolve('mock-error-id'),
          logAuthError: () => Promise.resolve('mock-error-id')
        };
      }
    }
    return this._errorLoggingService;
  }

  // Enhanced CRUD operations with error handling and retry logic

  async getAll(params = {}) {
    return this.executeWithErrorHandling(
      'getAll',
      () => this.client.get(this.endpoint, { params }),
      { params }
    );
  }

  async getById(id) {
    return this.executeWithErrorHandling(
      'getById',
      () => this.client.get(`${this.endpoint}/${id}`),
      { id }
    );
  }

  async create(data) {
    return this.executeWithErrorHandling(
      'create',
      () => this.client.post(this.endpoint, data),
      { data: this.sanitizeDataForLogging(data) }
    );
  }

  async update(id, data) {
    return this.executeWithErrorHandling(
      'update',
      () => this.client.put(`${this.endpoint}/${id}`, data),
      { id, data: this.sanitizeDataForLogging(data) }
    );
  }

  async delete(id) {
    return this.executeWithErrorHandling(
      'delete',
      () => this.client.delete(`${this.endpoint}/${id}`),
      { id }
    );
  }

  // Enhanced file upload with error handling and progress tracking
  async uploadFile(url, formData, onProgress = null) {
    return this.executeWithErrorHandling(
      'uploadFile',
      () => this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: onProgress,
        timeout: 60000 // 60 seconds for file uploads
      }),
      { 
        url, 
        fileSize: this.getFormDataSize(formData),
        hasProgressCallback: !!onProgress
      }
    );
  }

  /**
   * Execute API operation with comprehensive error handling
   * @param {string} operation - Operation name
   * @param {Function} apiCall - API call function
   * @param {Object} context - Operation context for logging
   * @returns {Promise} API response data
   */
  async executeWithErrorHandling(operation, apiCall, context = {}) {
    const operationContext = {
      service: this.constructor.name,
      endpoint: this.endpoint,
      operation,
      ...context
    };

    try {
      // Execute with retry logic
      const response = await retryService.retryApiCall(apiCall, {
        type: 'api',
        context: operationContext
      });

      // Return response data
      return response.data;

    } catch (error) {
      // Enhanced error handling
      return this.handleApiError(operation, error, operationContext);
    }
  }

  /**
   * Handle API errors with comprehensive logging and recovery options
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error that occurred
   * @param {Object} context - Operation context
   * @throws {Error} Enhanced error with recovery information
   */
  async handleApiError(operation, error, context = {}) {
    // Get error logging service instance
    const errorLoggingService = await this.getErrorLoggingService();
    
    // Log the error with comprehensive context
    const errorId = await errorLoggingService.logError(error, {
      type: 'api',
      service: this.constructor.name,
      endpoint: this.endpoint,
      operation,
      ...context,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      request: error.config ? {
        method: error.config.method,
        url: error.config.url,
        timeout: error.config.timeout
      } : null
    }, this.getErrorSeverity(error));

    // Get recovery options
    const recoveryOptions = errorRecoveryService.getRecoveryOptions(error, {
      type: 'api',
      service: this.constructor.name,
      endpoint: this.endpoint,
      operation,
      retryFunction: () => this.executeWithErrorHandling(operation, () => {
        throw new Error('Retry function not available in this context');
      }, context),
      ...context
    });

    // Create enhanced error with recovery information
    const enhancedError = new Error(this.getErrorMessage(error, operation));
    enhancedError.originalError = error;
    enhancedError.errorId = errorId;
    enhancedError.recoveryOptions = recoveryOptions;
    enhancedError.troubleshooting = errorRecoveryService.getTroubleshootingGuidance(error, {
      type: 'api',
      ...context
    });
    enhancedError.isApiError = true;
    enhancedError.status = error.response?.status;
    enhancedError.statusText = error.response?.statusText;

    // Log error message for debugging
    appConfig.error(`${this.endpoint} ${operation} failed:`, enhancedError.message);

    throw enhancedError;
  }

  /**
   * Determine error severity based on error type and status
   * @param {Error} error - Error to classify
   * @returns {string} Error severity
   */
  getErrorSeverity(error) {
    if (error.response) {
      const status = error.response.status;
      
      // Client errors (4xx) - medium severity
      if (status >= 400 && status < 500) {
        // Authentication/authorization errors are high severity
        if (status === 401 || status === 403) {
          return 'high';
        }
        return 'medium';
      }
      
      // Server errors (5xx) - high severity
      if (status >= 500) {
        return 'high';
      }
    }
    
    // Network errors - high severity
    if (!error.response) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @param {string} operation - Operation that failed
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error, operation) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Use server-provided message if available
      if (data && data.message) {
        return data.message;
      }
      
      // Status-specific messages
      switch (status) {
        case 400:
          return `Invalid request for ${operation}. Please check your input.`;
        case 401:
          return 'Your session has expired. Please log in again.';
        case 403:
          return `You don't have permission to perform this ${operation}.`;
        case 404:
          return `The requested resource was not found.`;
        case 409:
          return `Conflict occurred during ${operation}. The resource may have been modified.`;
        case 422:
          return `Validation failed for ${operation}. Please check your input.`;
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error occurred. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return `${operation} failed with status ${status}. Please try again.`;
      }
    }
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    // Generic error
    return error.message || `${operation} failed. Please try again.`;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeDataForLogging(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get approximate size of FormData for logging
   * @param {FormData} formData - FormData to measure
   * @returns {string} Size description
   */
  getFormDataSize(formData) {
    try {
      let totalSize = 0;
      let fileCount = 0;

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          totalSize += value.size;
          fileCount++;
        } else {
          totalSize += new Blob([value]).size;
        }
      }

      return `${fileCount} files, ~${Math.round(totalSize / 1024)}KB`;
    } catch (error) {
      return 'unknown size';
    }
  }

  // Get full URL for external use
  getFullUrl(path = '') {
    return appConfig.getFullApiUrl(`${this.endpoint}${path}`);
  }

  /**
   * Create a retryable version of an API method
   * @param {Function} method - API method to make retryable
   * @param {Object} retryOptions - Retry configuration
   * @returns {Function} Retryable method
   */
  createRetryableMethod(method, retryOptions = {}) {
    return retryService.createRetryableFunction(method.bind(this), {
      type: 'api',
      ...retryOptions
    });
  }

  /**
   * Execute operation with custom error recovery
   * @param {Function} operation - Operation to execute
   * @param {Object} recoveryOptions - Recovery options
   * @returns {Promise} Operation result
   */
  async executeWithRecovery(operation, recoveryOptions = {}) {
    try {
      return await operation();
    } catch (error) {
      // Attempt recovery
      const recoveryResult = await errorRecoveryService.attemptRecovery(error, {
        type: 'api',
        service: this.constructor.name,
        endpoint: this.endpoint,
        ...recoveryOptions
      });

      if (recoveryResult.recovered && recoveryResult.data) {
        return recoveryResult.data;
      }

      // Recovery failed, throw original error with recovery info
      error.recoveryAttempted = true;
      error.recoveryResult = recoveryResult;
      throw error;
    }
  }
}

export default ApiService;