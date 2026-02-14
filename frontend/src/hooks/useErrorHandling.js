import { useState, useCallback, useEffect } from 'react';
import errorLoggingService from '../services/ErrorLoggingService.js';
import errorRecoveryService from '../services/ErrorRecoveryService.js';
import retryService from '../services/RetryService.js';
import appConfig from '../config/app.config.js';

/**
 * Error Handling Hook for Worker Mobile Dashboard Components
 * Provides comprehensive error handling, recovery, and user feedback
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export const useErrorHandling = (options = {}) => {
  const {
    componentName = 'Unknown',
    enableAutoRecovery = true,
    enableRetry = true,
    logErrors = true,
    showUserFeedback = true
  } = options;

  const [error, setError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryOptions, setRecoveryOptions] = useState([]);
  const [troubleshootingGuide, setTroubleshootingGuide] = useState(null);
  const [supportInfo, setSupportInfo] = useState(null);
  const [errorHistory, setErrorHistory] = useState([]);

  /**
   * Handle an error with comprehensive logging and recovery options
   * @param {Error|string} error - Error to handle
   * @param {Object} context - Additional context information
   * @returns {string} Error ID for tracking
   */
  const handleError = useCallback(async (error, context = {}) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    const errorContext = {
      component: componentName,
      ...context
    };

    let errorId = null;

    // Log error if enabled
    if (logErrors) {
      errorId = errorLoggingService.logError(errorObj, errorContext, 'medium');
    }

    // Get recovery options and troubleshooting guidance
    const recoveryOpts = errorRecoveryService.getRecoveryOptions(errorObj, errorContext);
    const troubleshooting = errorRecoveryService.getTroubleshootingGuidance(errorObj, errorContext);
    const support = errorRecoveryService.getSupportInfo('component', errorContext);

    // Update state
    setError({
      id: errorId,
      error: errorObj,
      context: errorContext,
      timestamp: new Date(),
      recovered: false
    });
    setRecoveryOptions(recoveryOpts);
    setTroubleshootingGuide(troubleshooting);
    setSupportInfo(support);

    // Add to error history
    setErrorHistory(prev => [...prev.slice(-9), {
      id: errorId,
      message: errorObj.message,
      timestamp: new Date(),
      component: componentName
    }]);

    // Attempt auto-recovery if enabled
    if (enableAutoRecovery) {
      setTimeout(() => {
        attemptAutoRecovery(errorObj, errorContext);
      }, 1000);
    }

    return errorId;
  }, [componentName, logErrors, enableAutoRecovery]);

  /**
   * Attempt automatic recovery from error
   * @param {Error} error - Error to recover from
   * @param {Object} context - Error context
   */
  const attemptAutoRecovery = useCallback(async (error, context) => {
    if (isRecovering) return;

    setIsRecovering(true);

    try {
      const recoveryResult = await errorRecoveryService.attemptRecovery(error, context);
      
      if (recoveryResult.recovered) {
        appConfig.log(`Auto-recovery successful for ${componentName}`);
        clearError();
      } else {
        appConfig.log(`Auto-recovery failed for ${componentName}:`, recoveryResult.message);
      }
    } catch (recoveryError) {
      appConfig.error(`Auto-recovery error for ${componentName}:`, recoveryError);
    } finally {
      setIsRecovering(false);
    }
  }, [componentName, isRecovering]);

  /**
   * Execute a recovery option
   * @param {Object} option - Recovery option to execute
   */
  const executeRecoveryOption = useCallback(async (option) => {
    if (isRecovering) return;

    setIsRecovering(true);

    try {
      const result = await option.execute();
      
      if (result.recovered) {
        appConfig.log(`Recovery option succeeded: ${option.name}`);
        clearError();
      } else {
        appConfig.error(`Recovery option failed: ${option.name}`, result.message);
      }
    } catch (error) {
      appConfig.error(`Recovery option error: ${option.name}`, error);
      handleError(error, { type: 'recovery', originalOption: option.name });
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, handleError]);

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRecoveryOptions([]);
    setTroubleshootingGuide(null);
    setSupportInfo(null);
    setIsRecovering(false);
  }, []);

  /**
   * Retry a failed operation with error handling
   * @param {Function} operation - Operation to retry
   * @param {Object} retryOptions - Retry configuration
   * @returns {Promise} Operation result
   */
  const retryOperation = useCallback(async (operation, retryOptions = {}) => {
    if (!enableRetry) {
      throw new Error('Retry is disabled for this component');
    }

    try {
      clearError();
      return await retryService.executeWithRetry(operation, {
        type: 'component',
        component: componentName,
        ...retryOptions
      });
    } catch (error) {
      await handleError(error, { type: 'retry', operation: operation.name });
      throw error;
    }
  }, [enableRetry, componentName, handleError, clearError]);

  /**
   * Execute an operation with comprehensive error handling
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Promise} Operation result
   */
  const executeWithErrorHandling = useCallback(async (operation, options = {}) => {
    const { 
      retryOnFailure = enableRetry,
      logContext = {},
      onError = null,
      onSuccess = null
    } = options;

    try {
      clearError();
      
      let result;
      if (retryOnFailure) {
        result = await retryOperation(operation, { context: logContext });
      } else {
        result = await operation();
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorId = await handleError(error, {
        type: 'operation',
        operation: operation.name,
        ...logContext
      });

      if (onError) {
        onError(error, errorId);
      }

      throw error;
    }
  }, [enableRetry, handleError, clearError, retryOperation]);

  /**
   * Create an error-wrapped version of an async function
   * @param {Function} fn - Function to wrap
   * @param {Object} wrapOptions - Wrapping options
   * @returns {Function} Error-wrapped function
   */
  const wrapWithErrorHandling = useCallback((fn, wrapOptions = {}) => {
    return async (...args) => {
      return executeWithErrorHandling(() => fn(...args), wrapOptions);
    };
  }, [executeWithErrorHandling]);

  /**
   * Handle network errors specifically
   * @param {Error} error - Network error
   * @param {Object} context - Request context
   */
  const handleNetworkError = useCallback(async (error, context = {}) => {
    return handleError(error, {
      type: 'network',
      ...context
    });
  }, [handleError]);

  /**
   * Handle authentication errors specifically
   * @param {Error} error - Authentication error
   * @param {Object} context - Auth context
   */
  const handleAuthError = useCallback(async (error, context = {}) => {
    return handleError(error, {
      type: 'authentication',
      ...context
    });
  }, [handleError]);

  /**
   * Handle geofence errors specifically
   * @param {Error} error - Geofence error
   * @param {Object} locationContext - Location context
   */
  const handleGeofenceError = useCallback(async (error, locationContext = {}) => {
    return handleError(error, {
      type: 'geofence',
      location: locationContext
    });
  }, [handleError]);

  /**
   * Get error statistics for this component
   * @returns {Object} Error statistics
   */
  const getErrorStats = useCallback(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const recentErrors = errorHistory.filter(err => 
      now - err.timestamp.getTime() < oneHour
    );

    return {
      total: errorHistory.length,
      recent: recentErrors.length,
      hasCurrentError: !!error,
      isRecovering,
      component: componentName
    };
  }, [errorHistory, error, isRecovering, componentName]);

  /**
   * Clear error history
   */
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending recovery operations
      setIsRecovering(false);
    };
  }, []);

  return {
    // Error state
    error,
    isRecovering,
    recoveryOptions,
    troubleshootingGuide,
    supportInfo,
    errorHistory,

    // Error handling functions
    handleError,
    handleNetworkError,
    handleAuthError,
    handleGeofenceError,
    clearError,

    // Recovery functions
    executeRecoveryOption,
    attemptAutoRecovery,

    // Operation wrappers
    retryOperation,
    executeWithErrorHandling,
    wrapWithErrorHandling,

    // Utility functions
    getErrorStats,
    clearErrorHistory,

    // State helpers
    hasError: !!error,
    canRetry: enableRetry && !isRecovering,
    canRecover: recoveryOptions.length > 0 && !isRecovering
  };
};

export default useErrorHandling;