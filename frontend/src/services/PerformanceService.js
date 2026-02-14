import appConfig from '../config/app.config.js';

/**
 * Performance Monitoring Service
 * Tracks dashboard load times and performance metrics
 */
class PerformanceService {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.loadTimeThreshold = 3000; // 3 seconds requirement
    this.isSupported = typeof window !== 'undefined' && 'performance' in window;
  }

  /**
   * Start measuring performance for a specific operation
   * @param {string} operationName - Name of the operation to measure
   * @returns {string} Measurement ID
   */
  startMeasurement(operationName) {
    if (!this.isSupported) {
      return null;
    }

    const measurementId = `${operationName}_${Date.now()}_${Math.random()}`;
    const startTime = performance.now();
    
    this.metrics.set(measurementId, {
      operationName,
      startTime,
      endTime: null,
      duration: null,
      timestamp: new Date(),
      metadata: {}
    });

    appConfig.log(`Performance: Started measuring ${operationName}`, measurementId);
    return measurementId;
  }

  /**
   * End measurement and calculate duration
   * @param {string} measurementId - ID returned from startMeasurement
   * @param {Object} metadata - Additional metadata to store
   * @returns {number|null} Duration in milliseconds
   */
  endMeasurement(measurementId, metadata = {}) {
    if (!this.isSupported || !measurementId || !this.metrics.has(measurementId)) {
      return null;
    }

    const measurement = this.metrics.get(measurementId);
    const endTime = performance.now();
    const duration = endTime - measurement.startTime;

    measurement.endTime = endTime;
    measurement.duration = duration;
    measurement.metadata = { ...measurement.metadata, ...metadata };

    const { operationName } = measurement;
    
    // Log performance metrics
    appConfig.log(`Performance: ${operationName} completed in ${duration.toFixed(2)}ms`, {
      measurementId,
      duration,
      metadata,
      exceedsThreshold: duration > this.loadTimeThreshold
    });

    // Check if operation exceeds threshold
    if (duration > this.loadTimeThreshold) {
      appConfig.warn(`Performance: ${operationName} exceeded ${this.loadTimeThreshold}ms threshold`, {
        duration,
        threshold: this.loadTimeThreshold,
        operationName
      });
    }

    return duration;
  }

  /**
   * Measure dashboard load time specifically
   * @returns {string} Measurement ID
   */
  startDashboardLoad() {
    return this.startMeasurement('dashboard_load');
  }

  /**
   * End dashboard load measurement
   * @param {string} measurementId - Dashboard load measurement ID
   * @param {Object} metadata - Additional metadata (component count, data size, etc.)
   * @returns {number|null} Load time in milliseconds
   */
  endDashboardLoad(measurementId, metadata = {}) {
    const duration = this.endMeasurement(measurementId, {
      ...metadata,
      type: 'dashboard_load'
    });

    if (duration !== null) {
      // Report load time performance
      this.reportLoadTimeMetric(duration, metadata);
    }

    return duration;
  }

  /**
   * Measure component render time
   * @param {string} componentName - Name of the component
   * @returns {string} Measurement ID
   */
  startComponentRender(componentName) {
    return this.startMeasurement(`component_render_${componentName}`);
  }

  /**
   * End component render measurement
   * @param {string} measurementId - Component render measurement ID
   * @param {Object} metadata - Additional metadata
   * @returns {number|null} Render time in milliseconds
   */
  endComponentRender(measurementId, metadata = {}) {
    return this.endMeasurement(measurementId, {
      ...metadata,
      type: 'component_render'
    });
  }

  /**
   * Measure API call performance
   * @param {string} endpoint - API endpoint being called
   * @returns {string} Measurement ID
   */
  startApiCall(endpoint) {
    return this.startMeasurement(`api_call_${endpoint}`);
  }

  /**
   * End API call measurement
   * @param {string} measurementId - API call measurement ID
   * @param {Object} metadata - Additional metadata (response size, status, etc.)
   * @returns {number|null} API call time in milliseconds
   */
  endApiCall(measurementId, metadata = {}) {
    return this.endMeasurement(measurementId, {
      ...metadata,
      type: 'api_call'
    });
  }

  /**
   * Report load time metric and check against requirement
   * @param {number} duration - Load time in milliseconds
   * @param {Object} metadata - Additional context
   */
  reportLoadTimeMetric(duration, metadata = {}) {
    const meetsRequirement = duration <= this.loadTimeThreshold;
    
    const report = {
      duration,
      threshold: this.loadTimeThreshold,
      meetsRequirement,
      timestamp: new Date(),
      metadata
    };

    if (meetsRequirement) {
      appConfig.log(`Performance: Dashboard load time ${duration.toFixed(2)}ms meets 3s requirement`, report);
    } else {
      appConfig.error(`Performance: Dashboard load time ${duration.toFixed(2)}ms exceeds 3s requirement`, report);
    }

    // Store for analytics
    this.storeMetric('dashboard_load_time', report);
  }

  /**
   * Get performance metrics for a specific operation type
   * @param {string} operationType - Type of operation to filter by
   * @returns {Array} Array of metrics
   */
  getMetrics(operationType = null) {
    const allMetrics = Array.from(this.metrics.values());
    
    if (!operationType) {
      return allMetrics;
    }

    return allMetrics.filter(metric => 
      metric.operationName.includes(operationType) || 
      metric.metadata.type === operationType
    );
  }

  /**
   * Get average performance for an operation type
   * @param {string} operationType - Type of operation
   * @returns {Object} Performance statistics
   */
  getPerformanceStats(operationType) {
    const metrics = this.getMetrics(operationType);
    
    if (metrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        exceedsThreshold: 0
      };
    }

    const durations = metrics.map(m => m.duration).filter(d => d !== null);
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const exceedsThreshold = durations.filter(d => d > this.loadTimeThreshold).length;

    return {
      count: durations.length,
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
      exceedsThreshold,
      exceedsThresholdPercentage: Math.round((exceedsThreshold / durations.length) * 100)
    };
  }

  /**
   * Store metric for analytics (could be sent to monitoring service)
   * @param {string} metricName - Name of the metric
   * @param {Object} data - Metric data
   */
  storeMetric(metricName, data) {
    // In a real application, this would send to analytics service
    // For now, just store locally for debugging
    const storedMetrics = this.getStoredMetrics();
    storedMetrics.push({
      metricName,
      data,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 metrics to avoid memory issues
    if (storedMetrics.length > 100) {
      storedMetrics.splice(0, storedMetrics.length - 100);
    }

    try {
      localStorage.setItem('dashboard_performance_metrics', JSON.stringify(storedMetrics));
    } catch (error) {
      appConfig.warn('Failed to store performance metrics:', error);
    }
  }

  /**
   * Get stored metrics from localStorage
   * @returns {Array} Stored metrics
   */
  getStoredMetrics() {
    try {
      const stored = localStorage.getItem('dashboard_performance_metrics');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      appConfig.warn('Failed to retrieve stored performance metrics:', error);
      return [];
    }
  }

  /**
   * Clear all performance metrics
   */
  clearMetrics() {
    this.metrics.clear();
    try {
      localStorage.removeItem('dashboard_performance_metrics');
    } catch (error) {
      appConfig.warn('Failed to clear stored performance metrics:', error);
    }
    appConfig.log('Performance metrics cleared');
  }

  /**
   * Set up performance observers for automatic monitoring
   */
  setupPerformanceObservers() {
    if (!this.isSupported || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.storeMetric('navigation_timing', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              totalTime: entry.loadEventEnd - entry.fetchStart
            });
          }
        });
      });

      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'resource' && entry.name.includes('api')) {
            this.storeMetric('resource_timing', {
              name: entry.name,
              duration: entry.duration,
              size: entry.transferSize || 0
            });
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);

      appConfig.log('Performance observers set up successfully');
    } catch (error) {
      appConfig.warn('Failed to set up performance observers:', error);
    }
  }

  /**
   * Clean up performance observers
   */
  cleanup() {
    this.observers.forEach((observer, name) => {
      try {
        observer.disconnect();
        appConfig.log(`Performance observer ${name} disconnected`);
      } catch (error) {
        appConfig.warn(`Failed to disconnect performance observer ${name}:`, error);
      }
    });
    this.observers.clear();
  }

  /**
   * Get performance summary for dashboard
   * @returns {Object} Performance summary
   */
  getDashboardPerformanceSummary() {
    const loadTimeStats = this.getPerformanceStats('dashboard_load');
    const componentStats = this.getPerformanceStats('component_render');
    const apiStats = this.getPerformanceStats('api_call');

    return {
      loadTime: loadTimeStats,
      componentRender: componentStats,
      apiCalls: apiStats,
      meetsRequirement: loadTimeStats.average <= this.loadTimeThreshold,
      threshold: this.loadTimeThreshold
    };
  }
}

// Export singleton instance
const performanceService = new PerformanceService();
export default performanceService;