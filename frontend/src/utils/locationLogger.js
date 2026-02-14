/**
 * LocationLogger - Utility for logging location data to backend
 * Handles location data persistence, offline queuing, and sync
 */

import api from '../services/api';

class LocationLogger {
  constructor() {
    this.logQueue = [];
    this.isOnline = navigator.onLine;
    this.syncInterval = null;
    this.maxQueueSize = 100;
    this.syncIntervalMs = 60000; // Sync every minute
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueuedLogs();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Load queued logs from localStorage
    this.loadQueueFromStorage();
    
    // Start periodic sync
    this.startPeriodicSync();
  }

  /**
   * Log location data for a task
   * @param {Object} locationData - Location information
   * @param {number} assignmentId - Task assignment ID
   * @param {string} action - Action type (start, progress, complete, etc.)
   */
  async logTaskLocation(locationData, assignmentId, action = 'location_update') {
    const logEntry = {
      id: this.generateLogId(),
      assignmentId,
      action,
      location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp || new Date().toISOString()
      },
      metadata: {
        altitude: locationData.altitude,
        altitudeAccuracy: locationData.altitudeAccuracy,
        heading: locationData.heading,
        speed: locationData.speed
      },
      createdAt: new Date().toISOString(),
      synced: false
    };

    if (this.isOnline) {
      try {
        await this.sendLocationLog(logEntry);
        logEntry.synced = true;
        console.log('Location logged successfully:', logEntry);
      } catch (error) {
        console.error('Failed to log location, queuing for later:', error);
        this.queueLog(logEntry);
      }
    } else {
      this.queueLog(logEntry);
    }

    return logEntry;
  }

  /**
   * Log general location data (not task-specific)
   * @param {Object} locationData - Location information
   * @param {number} employeeId - Employee ID
   * @param {number} projectId - Project ID
   */
  async logGeneralLocation(locationData, employeeId, projectId) {
    const logEntry = {
      id: this.generateLogId(),
      employeeId,
      projectId,
      action: 'general_location',
      location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp || new Date().toISOString()
      },
      metadata: {
        altitude: locationData.altitude,
        altitudeAccuracy: locationData.altitudeAccuracy,
        heading: locationData.heading,
        speed: locationData.speed
      },
      createdAt: new Date().toISOString(),
      synced: false
    };

    if (this.isOnline) {
      try {
        await this.sendGeneralLocationLog(logEntry);
        logEntry.synced = true;
        console.log('General location logged successfully:', logEntry);
      } catch (error) {
        console.error('Failed to log general location, queuing for later:', error);
        this.queueLog(logEntry);
      }
    } else {
      this.queueLog(logEntry);
    }

    return logEntry;
  }

  /**
   * Send location log to backend API
   * @param {Object} logEntry - Log entry to send
   */
  async sendLocationLog(logEntry) {
    const response = await api.post('/worker/location/log', {
      assignmentId: logEntry.assignmentId,
      action: logEntry.action,
      location: logEntry.location,
      metadata: logEntry.metadata
    });
    
    return response.data;
  }

  /**
   * Send general location log to backend API
   * @param {Object} logEntry - Log entry to send
   */
  async sendGeneralLocationLog(logEntry) {
    const response = await api.post('/attendance/log-location', {
      employeeId: logEntry.employeeId,
      projectId: logEntry.projectId,
      latitude: logEntry.location.latitude,
      longitude: logEntry.location.longitude,
      accuracy: logEntry.location.accuracy,
      timestamp: logEntry.location.timestamp
    });
    
    return response.data;
  }

  /**
   * Queue log entry for later sync
   * @param {Object} logEntry - Log entry to queue
   */
  queueLog(logEntry) {
    // Remove oldest entries if queue is full
    if (this.logQueue.length >= this.maxQueueSize) {
      this.logQueue.shift();
    }
    
    this.logQueue.push(logEntry);
    this.saveQueueToStorage();
    
    console.log(`Location log queued (${this.logQueue.length} pending):`, logEntry);
  }

  /**
   * Sync all queued logs to backend
   */
  async syncQueuedLogs() {
    if (!this.isOnline || this.logQueue.length === 0) {
      return;
    }

    console.log(`Syncing ${this.logQueue.length} queued location logs...`);
    
    const logsToSync = [...this.logQueue];
    const syncedLogs = [];
    
    for (const logEntry of logsToSync) {
      try {
        if (logEntry.assignmentId) {
          await this.sendLocationLog(logEntry);
        } else {
          await this.sendGeneralLocationLog(logEntry);
        }
        
        logEntry.synced = true;
        syncedLogs.push(logEntry);
        
      } catch (error) {
        console.error('Failed to sync log entry:', logEntry, error);
        // Keep failed entries in queue for retry
        break;
      }
    }

    // Remove successfully synced logs from queue
    this.logQueue = this.logQueue.filter(log => !syncedLogs.includes(log));
    this.saveQueueToStorage();
    
    console.log(`Successfully synced ${syncedLogs.length} location logs`);
  }

  /**
   * Start periodic sync of queued logs
   */
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncQueuedLogs();
    }, this.syncIntervalMs);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Save queue to localStorage
   */
  saveQueueToStorage() {
    try {
      localStorage.setItem('location_log_queue', JSON.stringify(this.logQueue));
    } catch (error) {
      console.error('Failed to save location log queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem('location_log_queue');
      if (stored) {
        this.logQueue = JSON.parse(stored);
        console.log(`Loaded ${this.logQueue.length} queued location logs from storage`);
      }
    } catch (error) {
      console.error('Failed to load location log queue from storage:', error);
      this.logQueue = [];
    }
  }

  /**
   * Generate unique log ID
   * @returns {string} Unique log ID
   */
  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue status
   * @returns {Object} Queue status information
   */
  getQueueStatus() {
    return {
      queueLength: this.logQueue.length,
      isOnline: this.isOnline,
      isSyncing: !!this.syncInterval,
      oldestEntry: this.logQueue.length > 0 ? this.logQueue[0].createdAt : null,
      newestEntry: this.logQueue.length > 0 ? this.logQueue[this.logQueue.length - 1].createdAt : null
    };
  }

  /**
   * Clear all queued logs
   */
  clearQueue() {
    this.logQueue = [];
    this.saveQueueToStorage();
    console.log('Location log queue cleared');
  }

  /**
   * Get all queued logs
   * @returns {Array} Array of queued log entries
   */
  getQueuedLogs() {
    return [...this.logQueue];
  }

  /**
   * Manually trigger sync
   * @returns {Promise} Promise that resolves when sync is complete
   */
  async forcSync() {
    await this.syncQueuedLogs();
  }
}

// Create singleton instance
const locationLogger = new LocationLogger();

export default locationLogger;